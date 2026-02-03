/**
 * User Repository
 * Handles user and session persistence to database
 */
import { query, queryOne, execute, isDatabaseEnabled } from '../services/database.js';
import type { DbUser, DbSession, DbSubscription, DbPlan, User, UserWithSubscription, dbUserToUser } from '../types/database.js';
import crypto from 'crypto';

export interface CreateUserData {
  email: string;
  name?: string;
  passwordHash?: string;
  avatarUrl?: string;
  authProvider: 'local' | 'google' | 'github';
  authProviderId?: string;
  emailVerified?: boolean;
}

export interface UpdateUserData {
  name?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  stripeCustomerId?: string;
}

/**
 * In-memory stores (fallback when database is not available)
 */
const memoryUsers = new Map<string, DbUser>();
const memorySessions = new Map<string, DbSession>();

/**
 * Convert DB user to API user
 */
function toApiUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    avatarUrl: dbUser.avatar_url,
    authProvider: dbUser.auth_provider,
    emailVerified: dbUser.email_verified,
    createdAt: dbUser.created_at.toISOString(),
  };
}

/**
 * User Repository class
 */
export class UserRepository {
  /**
   * Create a new user
   */
  async create(data: CreateUserData): Promise<User> {
    if (!isDatabaseEnabled()) {
      const id = crypto.randomUUID();
      const now = new Date();
      const dbUser: DbUser = {
        id,
        email: data.email,
        password_hash: data.passwordHash || null,
        name: data.name || null,
        avatar_url: data.avatarUrl || null,
        auth_provider: data.authProvider,
        auth_provider_id: data.authProviderId || null,
        email_verified: data.emailVerified || false,
        stripe_customer_id: null,
        created_at: now,
        updated_at: now,
      };
      memoryUsers.set(id, dbUser);
      return toApiUser(dbUser);
    }
    
    const result = await queryOne<DbUser>(`
      INSERT INTO users (email, password_hash, name, avatar_url, auth_provider, auth_provider_id, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      data.email,
      data.passwordHash || null,
      data.name || null,
      data.avatarUrl || null,
      data.authProvider,
      data.authProviderId || null,
      data.emailVerified || false,
    ]);
    
    if (!result) {
      throw new Error('Failed to create user');
    }
    
    // Create default free subscription
    await this.createDefaultSubscription(result.id);
    
    return toApiUser(result);
  }
  
  /**
   * Create default free subscription for new user
   */
  private async createDefaultSubscription(userId: string): Promise<void> {
    if (!isDatabaseEnabled()) return;
    
    await execute(`
      INSERT INTO subscriptions (user_id, plan_id, status)
      VALUES ($1, 'free', 'active')
      ON CONFLICT DO NOTHING
    `, [userId]);
  }
  
  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    if (!isDatabaseEnabled()) {
      const user = memoryUsers.get(id);
      return user ? toApiUser(user) : null;
    }
    
    const result = await queryOne<DbUser>(`
      SELECT * FROM users WHERE id = $1
    `, [id]);
    
    return result ? toApiUser(result) : null;
  }
  
  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    if (!isDatabaseEnabled()) {
      const user = Array.from(memoryUsers.values()).find(u => u.email === email);
      return user ? toApiUser(user) : null;
    }
    
    const result = await queryOne<DbUser>(`
      SELECT * FROM users WHERE email = $1
    `, [email]);
    
    return result ? toApiUser(result) : null;
  }
  
  /**
   * Find user by OAuth provider
   */
  async findByOAuthProvider(provider: string, providerId: string): Promise<User | null> {
    if (!isDatabaseEnabled()) {
      const user = Array.from(memoryUsers.values()).find(
        u => u.auth_provider === provider && u.auth_provider_id === providerId
      );
      return user ? toApiUser(user) : null;
    }
    
    const result = await queryOne<DbUser>(`
      SELECT * FROM users WHERE auth_provider = $1 AND auth_provider_id = $2
    `, [provider, providerId]);
    
    return result ? toApiUser(result) : null;
  }
  
  /**
   * Find user with subscription info
   */
  async findByIdWithSubscription(id: string): Promise<UserWithSubscription | null> {
    if (!isDatabaseEnabled()) {
      const user = memoryUsers.get(id);
      if (!user) return null;
      
      return {
        ...toApiUser(user),
        subscription: {
          planId: 'free',
          planName: 'Free',
          status: 'active',
          appLimit: 3,
          appsUsed: 0,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
      };
    }
    
    const result = await queryOne<DbUser & {
      plan_id: string;
      plan_name: string;
      sub_status: string;
      app_limit: number | null;
      current_period_end: Date | null;
      cancel_at_period_end: boolean;
    }>(`
      SELECT u.*, 
             COALESCE(s.plan_id, 'free') as plan_id,
             COALESCE(p.name, 'Free') as plan_name,
             COALESCE(s.status, 'active') as sub_status,
             p.app_limit,
             s.current_period_end,
             COALESCE(s.cancel_at_period_end, false) as cancel_at_period_end
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE u.id = $1
    `, [id]);
    
    if (!result) return null;
    
    // Count user's apps
    const countResult = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM apps WHERE user_id = $1
    `, [id]);
    
    const appsUsed = parseInt(countResult?.count || '0', 10);
    
    return {
      ...toApiUser(result),
      subscription: {
        planId: result.plan_id,
        planName: result.plan_name,
        status: result.sub_status,
        appLimit: result.app_limit,
        appsUsed,
        currentPeriodEnd: result.current_period_end?.toISOString() || null,
        cancelAtPeriodEnd: result.cancel_at_period_end,
      },
    };
  }
  
  /**
   * Update user
   */
  async update(id: string, data: UpdateUserData): Promise<User | null> {
    if (!isDatabaseEnabled()) {
      const user = memoryUsers.get(id);
      if (!user) return null;
      
      if (data.name !== undefined) user.name = data.name;
      if (data.avatarUrl !== undefined) user.avatar_url = data.avatarUrl;
      if (data.emailVerified !== undefined) user.email_verified = data.emailVerified;
      if (data.stripeCustomerId !== undefined) user.stripe_customer_id = data.stripeCustomerId;
      user.updated_at = new Date();
      
      memoryUsers.set(id, user);
      return toApiUser(user);
    }
    
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    
    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(data.avatarUrl);
    }
    if (data.emailVerified !== undefined) {
      updates.push(`email_verified = $${paramIndex++}`);
      values.push(data.emailVerified);
    }
    if (data.stripeCustomerId !== undefined) {
      updates.push(`stripe_customer_id = $${paramIndex++}`);
      values.push(data.stripeCustomerId);
    }
    
    if (updates.length === 0) {
      return this.findById(id);
    }
    
    values.push(id);
    
    const result = await queryOne<DbUser>(`
      UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    
    return result ? toApiUser(result) : null;
  }
  
  /**
   * Get password hash for login verification
   */
  async getPasswordHash(email: string): Promise<string | null> {
    if (!isDatabaseEnabled()) {
      const user = Array.from(memoryUsers.values()).find(u => u.email === email);
      return user?.password_hash || null;
    }
    
    const result = await queryOne<{ password_hash: string | null }>(`
      SELECT password_hash FROM users WHERE email = $1
    `, [email]);
    
    return result?.password_hash || null;
  }
  
  /**
   * Update Stripe customer ID
   */
  async updateStripeCustomerId(id: string, stripeCustomerId: string): Promise<void> {
    if (!isDatabaseEnabled()) {
      const user = memoryUsers.get(id);
      if (user) {
        user.stripe_customer_id = stripeCustomerId;
        memoryUsers.set(id, user);
      }
      return;
    }
    
    await execute(`
      UPDATE users SET stripe_customer_id = $2 WHERE id = $1
    `, [id, stripeCustomerId]);
  }
  
  /**
   * Get Stripe customer ID
   */
  async getStripeCustomerId(id: string): Promise<string | null> {
    if (!isDatabaseEnabled()) {
      const user = memoryUsers.get(id);
      return user?.stripe_customer_id || null;
    }
    
    const result = await queryOne<{ stripe_customer_id: string | null }>(`
      SELECT stripe_customer_id FROM users WHERE id = $1
    `, [id]);
    
    return result?.stripe_customer_id || null;
  }
  
  // ============================================
  // Session Management
  // ============================================
  
  /**
   * Create a session
   */
  async createSession(userId: string, token: string, expiresAt: Date): Promise<void> {
    if (!isDatabaseEnabled()) {
      const id = crypto.randomUUID();
      memorySessions.set(token, {
        id,
        user_id: userId,
        token,
        expires_at: expiresAt,
        created_at: new Date(),
      });
      return;
    }
    
    await execute(`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `, [userId, token, expiresAt]);
  }
  
  /**
   * Find session by token
   */
  async findSession(token: string): Promise<{ userId: string; expiresAt: Date } | null> {
    if (!isDatabaseEnabled()) {
      const session = memorySessions.get(token);
      if (!session) return null;
      return { userId: session.user_id, expiresAt: session.expires_at };
    }
    
    const result = await queryOne<DbSession>(`
      SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()
    `, [token]);
    
    if (!result) return null;
    return { userId: result.user_id, expiresAt: result.expires_at };
  }
  
  /**
   * Delete session
   */
  async deleteSession(token: string): Promise<void> {
    if (!isDatabaseEnabled()) {
      memorySessions.delete(token);
      return;
    }
    
    await execute(`
      DELETE FROM sessions WHERE token = $1
    `, [token]);
  }
  
  /**
   * Delete all sessions for a user
   */
  async deleteAllSessions(userId: string): Promise<void> {
    if (!isDatabaseEnabled()) {
      for (const [token, session] of memorySessions.entries()) {
        if (session.user_id === userId) {
          memorySessions.delete(token);
        }
      }
      return;
    }
    
    await execute(`
      DELETE FROM sessions WHERE user_id = $1
    `, [userId]);
  }
  
  /**
   * Clean expired sessions
   */
  async cleanExpiredSessions(): Promise<number> {
    if (!isDatabaseEnabled()) {
      const now = new Date();
      let count = 0;
      for (const [token, session] of memorySessions.entries()) {
        if (session.expires_at < now) {
          memorySessions.delete(token);
          count++;
        }
      }
      return count;
    }
    
    const result = await execute(`
      DELETE FROM sessions WHERE expires_at < NOW()
    `);
    
    return result.rowCount;
  }
}

// Singleton instance
export const userRepository = new UserRepository();
