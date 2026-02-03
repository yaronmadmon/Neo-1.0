/**
 * Billing Routes
 * 
 * Stripe billing and subscription management API
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from './utils/logger.js';
import { billingService } from './services/billing-service.js';
import { getUserWithSubscriptionFromRequest } from './auth-routes.js';

// ============================================================
// TYPES
// ============================================================

interface CheckoutRequest {
  planId: string;
  interval: 'monthly' | 'yearly';
}

// ============================================================
// BILLING ROUTES
// ============================================================

/**
 * Register billing routes
 */
export async function registerBillingRoutes(server: FastifyInstance): Promise<void> {
  /**
   * Get available plans
   * GET /billing/plans
   */
  server.get('/billing/plans', async (_request, reply) => {
    try {
      const plans = await billingService.getPlans();
      return reply.send({
        success: true,
        plans,
      });
    } catch (error: any) {
      logger.error('Failed to get plans', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get plans',
        message: error.message,
      });
    }
  });

  /**
   * Get current subscription
   * GET /billing/subscription
   */
  server.get('/billing/subscription', async (request, reply) => {
    try {
      const user = await getUserWithSubscriptionFromRequest(request);
      
      if (!user) {
        return reply.code(401).send({
          success: false,
          error: 'Not authenticated',
        });
      }
      
      const subscription = await billingService.getSubscription(user.id);
      const canCreate = await billingService.canCreateApp(user.id);
      
      return reply.send({
        success: true,
        subscription,
        usage: {
          appsUsed: canCreate.used || 0,
          appLimit: canCreate.limit || null,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get subscription', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get subscription',
        message: error.message,
      });
    }
  });

  /**
   * Check if user can create app
   * GET /billing/can-create-app
   */
  server.get('/billing/can-create-app', async (request, reply) => {
    try {
      const user = await getUserWithSubscriptionFromRequest(request);
      
      if (!user) {
        // Guests can always create apps (stored in localStorage)
        return reply.send({
          success: true,
          allowed: true,
          isGuest: true,
        });
      }
      
      const result = await billingService.canCreateApp(user.id);
      
      return reply.send({
        success: true,
        ...result,
        isGuest: false,
      });
    } catch (error: any) {
      logger.error('Failed to check app creation', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to check',
        message: error.message,
      });
    }
  });

  /**
   * Create checkout session
   * POST /billing/checkout
   */
  server.post<{ Body: CheckoutRequest }>(
    '/billing/checkout',
    async (request, reply) => {
      try {
        const user = await getUserWithSubscriptionFromRequest(request);
        
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Not authenticated',
          });
        }
        
        if (!billingService.isConfigured()) {
          return reply.code(503).send({
            success: false,
            error: 'Billing not configured',
          });
        }
        
        const { planId, interval } = request.body;
        
        if (!planId || !interval) {
          return reply.code(400).send({
            success: false,
            error: 'Missing planId or interval',
          });
        }
        
        if (!['pro', 'enterprise'].includes(planId)) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid plan',
          });
        }
        
        if (!['monthly', 'yearly'].includes(interval)) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid interval',
          });
        }
        
        const checkoutUrl = await billingService.createCheckoutSession(
          user.id,
          user.email,
          planId,
          interval
        );
        
        logger.info('Checkout session created', { userId: user.id, planId, interval });
        
        return reply.send({
          success: true,
          url: checkoutUrl,
        });
      } catch (error: any) {
        logger.error('Failed to create checkout session', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to create checkout session',
          message: error.message,
        });
      }
    }
  );

  /**
   * Create customer portal session
   * POST /billing/portal
   */
  server.post('/billing/portal', async (request, reply) => {
    try {
      const user = await getUserWithSubscriptionFromRequest(request);
      
      if (!user) {
        return reply.code(401).send({
          success: false,
          error: 'Not authenticated',
        });
      }
      
      if (!billingService.isConfigured()) {
        return reply.code(503).send({
          success: false,
          error: 'Billing not configured',
        });
      }
      
      const portalUrl = await billingService.createPortalSession(user.id, user.email);
      
      logger.info('Portal session created', { userId: user.id });
      
      return reply.send({
        success: true,
        url: portalUrl,
      });
    } catch (error: any) {
      logger.error('Failed to create portal session', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to create portal session',
        message: error.message,
      });
    }
  });

  /**
   * Stripe webhook handler
   * POST /billing/webhook
   */
  server.post(
    '/billing/webhook',
    {
      config: {
        rawBody: true,
      },
    },
    async (request, reply) => {
      try {
        const signature = request.headers['stripe-signature'] as string;
        const rawBody = (request as any).rawBody || JSON.stringify(request.body);
        
        // Verify webhook signature
        if (!billingService.verifyWebhookSignature(rawBody, signature)) {
          logger.warn('Invalid webhook signature');
          return reply.code(400).send({ error: 'Invalid signature' });
        }
        
        const event = request.body as any;
        
        // Handle the event
        await billingService.handleWebhook(event);
        
        return reply.send({ received: true });
      } catch (error: any) {
        logger.error('Webhook handling failed', error);
        return reply.code(500).send({
          error: 'Webhook handling failed',
          message: error.message,
        });
      }
    }
  );
}
