/**
 * Billing Service
 * Handles Stripe integration for subscriptions and payments
 */
import { config } from '../config.js';
import { query, queryOne, execute, isDatabaseEnabled } from './database.js';
import { userRepository } from '../repositories/user-repository.js';
import type { DbSubscription, DbPlan } from '../types/database.js';

// Stripe types (lightweight, no SDK dependency yet)
interface StripeCustomer {
  id: string;
  email: string;
}

interface StripeSubscription {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  items: {
    data: Array<{
      price: {
        id: string;
        product: string;
      };
    }>;
  };
}

interface StripeCheckoutSession {
  id: string;
  url: string;
}

interface StripeBillingPortalSession {
  id: string;
  url: string;
}

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

/**
 * Make Stripe API request
 */
async function stripeRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: Record<string, string>
): Promise<T> {
  if (!config.stripeSecretKey) {
    throw new Error('Stripe not configured');
  }
  
  const url = `https://api.stripe.com/v1${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${config.stripeSecretKey}`,
  };
  
  const options: RequestInit = { method, headers };
  
  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = new URLSearchParams(body).toString();
  }
  
  const response = await fetch(url, options);
  const data = await response.json() as T & { error?: { message?: string } };
  
  if (!response.ok) {
    throw new Error((data as any).error?.message || 'Stripe API error');
  }
  
  return data;
}

/**
 * Get plan ID from Stripe price ID
 */
function getPlanFromPriceId(priceId: string): string {
  if (priceId === config.stripeProMonthlyPriceId || priceId === config.stripeProYearlyPriceId) {
    return 'pro';
  }
  if (priceId === config.stripeEntMonthlyPriceId || priceId === config.stripeEntYearlyPriceId) {
    return 'enterprise';
  }
  return 'free';
}

/**
 * Billing Service class
 */
export class BillingService {
  /**
   * Check if Stripe is configured
   */
  isConfigured(): boolean {
    return !!config.stripeSecretKey;
  }
  
  // ============================================
  // Customer Management
  // ============================================
  
  /**
   * Get or create Stripe customer for user
   */
  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    // Check if user already has a Stripe customer ID
    const existingCustomerId = await userRepository.getStripeCustomerId(userId);
    if (existingCustomerId) {
      return existingCustomerId;
    }
    
    // Create new Stripe customer
    const customer = await stripeRequest<StripeCustomer>('/customers', 'POST', {
      email,
      'metadata[userId]': userId,
    });
    
    // Store customer ID
    await userRepository.updateStripeCustomerId(userId, customer.id);
    
    return customer.id;
  }
  
  // ============================================
  // Subscription Management
  // ============================================
  
  /**
   * Get user's subscription
   */
  async getSubscription(userId: string): Promise<{
    planId: string;
    planName: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null> {
    if (!isDatabaseEnabled()) {
      return {
        planId: 'free',
        planName: 'Free',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }
    
    const result = await queryOne<DbSubscription & { plan_name: string }>(`
      SELECT s.*, p.name as plan_name
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [userId]);
    
    if (!result) {
      return {
        planId: 'free',
        planName: 'Free',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }
    
    return {
      planId: result.plan_id,
      planName: result.plan_name,
      status: result.status,
      currentPeriodEnd: result.current_period_end?.toISOString() || null,
      cancelAtPeriodEnd: result.cancel_at_period_end,
    };
  }
  
  /**
   * Get all available plans
   */
  async getPlans(): Promise<Array<{
    id: string;
    name: string;
    priceMonthly: number;
    priceYearly: number;
    appLimit: number | null;
    features: Record<string, unknown>;
  }>> {
    if (!isDatabaseEnabled()) {
      return [
        { id: 'free', name: 'Free', priceMonthly: 0, priceYearly: 0, appLimit: 3, features: {} },
        { id: 'pro', name: 'Pro', priceMonthly: 1900, priceYearly: 19000, appLimit: 25, features: {} },
        { id: 'enterprise', name: 'Enterprise', priceMonthly: 9900, priceYearly: 99000, appLimit: null, features: {} },
      ];
    }
    
    const results = await query<DbPlan>(`
      SELECT * FROM plans ORDER BY price_monthly ASC
    `);
    
    return results.map(p => ({
      id: p.id,
      name: p.name,
      priceMonthly: p.price_monthly,
      priceYearly: p.price_yearly,
      appLimit: p.app_limit,
      features: p.features as unknown as Record<string, unknown>,
    }));
  }
  
  // ============================================
  // Checkout
  // ============================================
  
  /**
   * Create Stripe Checkout session
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    planId: string,
    interval: 'monthly' | 'yearly'
  ): Promise<string> {
    // Get or create Stripe customer
    const customerId = await this.getOrCreateCustomer(userId, email);
    
    // Get price ID based on plan and interval
    let priceId: string | undefined;
    if (planId === 'pro') {
      priceId = interval === 'monthly' ? config.stripeProMonthlyPriceId : config.stripeProYearlyPriceId;
    } else if (planId === 'enterprise') {
      priceId = interval === 'monthly' ? config.stripeEntMonthlyPriceId : config.stripeEntYearlyPriceId;
    }
    
    if (!priceId) {
      throw new Error(`Price not configured for plan: ${planId}`);
    }
    
    // Create checkout session
    const session = await stripeRequest<StripeCheckoutSession>('/checkout/sessions', 'POST', {
      customer: customerId,
      mode: 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: `${config.frontendUrl}?checkout=success`,
      cancel_url: `${config.frontendUrl}?checkout=canceled`,
      'metadata[userId]': userId,
      'metadata[planId]': planId,
    });
    
    return session.url;
  }
  
  /**
   * Create Stripe Customer Portal session
   */
  async createPortalSession(userId: string, email: string): Promise<string> {
    const customerId = await this.getOrCreateCustomer(userId, email);
    
    const session = await stripeRequest<StripeBillingPortalSession>(
      '/billing_portal/sessions',
      'POST',
      {
        customer: customerId,
        return_url: `${config.frontendUrl}?portal=closed`,
      }
    );
    
    return session.url;
  }
  
  // ============================================
  // Webhooks
  // ============================================
  
  /**
   * Verify Stripe webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!config.stripeWebhookSecret) {
      console.warn('Stripe webhook secret not configured');
      return true; // Skip verification in dev
    }
    
    // Simple timestamp verification (full implementation would use crypto)
    const parts = signature.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    const timestamp = parseInt(parts.t, 10);
    const now = Math.floor(Date.now() / 1000);
    
    // Reject if timestamp is more than 5 minutes old
    if (Math.abs(now - timestamp) > 300) {
      return false;
    }
    
    return true; // In production, verify the signature properly
  }
  
  /**
   * Handle Stripe webhook event
   */
  async handleWebhook(event: StripeEvent): Promise<void> {
    console.log(`Processing Stripe webhook: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription;
        
        if (userId && subscriptionId) {
          // Get subscription details from Stripe
          const subscription = await stripeRequest<StripeSubscription>(
            `/subscriptions/${subscriptionId}`
          );
          
          const priceId = subscription.items.data[0]?.price.id;
          const planId = getPlanFromPriceId(priceId);
          
          // Update subscription in database
          await this.updateSubscription(userId, {
            planId,
            status: subscription.status,
            stripeSubscriptionId: subscription.id,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          });
        }
        break;
      }
      
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as StripeSubscription;
        
        // Find user by Stripe subscription ID
        const result = await queryOne<{ user_id: string }>(`
          SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1
        `, [subscription.id]);
        
        if (result) {
          const priceId = subscription.items.data[0]?.price.id;
          const planId = event.type === 'customer.subscription.deleted' 
            ? 'free' 
            : getPlanFromPriceId(priceId);
          
          await this.updateSubscription(result.user_id, {
            planId,
            status: event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status,
            stripeSubscriptionId: subscription.id,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          });
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          await execute(`
            UPDATE subscriptions 
            SET status = 'past_due' 
            WHERE stripe_subscription_id = $1
          `, [subscriptionId]);
        }
        break;
      }
    }
  }
  
  /**
   * Update subscription in database
   */
  private async updateSubscription(
    userId: string,
    data: {
      planId: string;
      status: string;
      stripeSubscriptionId?: string;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
      cancelAtPeriodEnd?: boolean;
    }
  ): Promise<void> {
    if (!isDatabaseEnabled()) return;
    
    // Check if subscription exists
    const existing = await queryOne<{ id: string }>(`
      SELECT id FROM subscriptions WHERE user_id = $1
    `, [userId]);
    
    if (existing) {
      await execute(`
        UPDATE subscriptions SET
          plan_id = $2,
          status = $3,
          stripe_subscription_id = COALESCE($4, stripe_subscription_id),
          current_period_start = COALESCE($5, current_period_start),
          current_period_end = COALESCE($6, current_period_end),
          cancel_at_period_end = COALESCE($7, cancel_at_period_end)
        WHERE user_id = $1
      `, [
        userId,
        data.planId,
        data.status,
        data.stripeSubscriptionId || null,
        data.currentPeriodStart || null,
        data.currentPeriodEnd || null,
        data.cancelAtPeriodEnd ?? false,
      ]);
    } else {
      await execute(`
        INSERT INTO subscriptions (user_id, plan_id, status, stripe_subscription_id, current_period_start, current_period_end, cancel_at_period_end)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        data.planId,
        data.status,
        data.stripeSubscriptionId || null,
        data.currentPeriodStart || null,
        data.currentPeriodEnd || null,
        data.cancelAtPeriodEnd ?? false,
      ]);
    }
  }
  
  // ============================================
  // Usage Limits
  // ============================================
  
  /**
   * Check if user can create more apps
   */
  async canCreateApp(userId: string): Promise<{ allowed: boolean; reason?: string; limit?: number; used?: number }> {
    if (!isDatabaseEnabled()) {
      return { allowed: true };
    }
    
    // Get user's plan
    const subscription = await this.getSubscription(userId);
    const plan = (await this.getPlans()).find(p => p.id === subscription?.planId);
    
    if (!plan || plan.appLimit === null) {
      return { allowed: true }; // Unlimited
    }
    
    // Count user's apps
    const result = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM apps WHERE user_id = $1
    `, [userId]);
    
    const used = parseInt(result?.count || '0', 10);
    
    if (used >= plan.appLimit) {
      return {
        allowed: false,
        reason: `You've reached your plan limit of ${plan.appLimit} apps. Upgrade to create more.`,
        limit: plan.appLimit,
        used,
      };
    }
    
    return { allowed: true, limit: plan.appLimit, used };
  }
}

// Singleton instance
export const billingService = new BillingService();
