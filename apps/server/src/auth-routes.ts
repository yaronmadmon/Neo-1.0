/**
 * Authentication Routes
 * 
 * OAuth and JWT-based authentication for Neo apps.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from './utils/logger.js';
import { authService } from './services/auth-service.js';
import { config } from './config.js';
import type { User, UserWithSubscription } from './types/database.js';

// ============================================================
// TYPES
// ============================================================

interface LoginRequest {
  email: string;
  password: string;
  appId?: string;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Get token from request
 */
function getTokenFromRequest(request: FastifyRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookie
  const cookies = request.headers.cookie;
  if (cookies) {
    const match = cookies.match(/neo_token=([^;]+)/);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Get user from request
 */
export async function getUserFromRequest(request: FastifyRequest): Promise<User | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  
  return authService.validateSession(token);
}

/**
 * Get user with subscription from request
 */
export async function getUserWithSubscriptionFromRequest(
  request: FastifyRequest
): Promise<UserWithSubscription | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  
  return authService.validateSessionWithSubscription(token);
}

/**
 * Set auth cookie
 */
function setAuthCookie(reply: FastifyReply, token: string): void {
  const isProduction = config.nodeEnv === 'production';
  reply.header(
    'Set-Cookie',
    `neo_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${isProduction ? '; Secure' : ''}`
  );
}

/**
 * Clear auth cookie
 */
function clearAuthCookie(reply: FastifyReply): void {
  reply.header('Set-Cookie', 'neo_token=; Path=/; HttpOnly; Max-Age=0');
}

// ============================================================
// AUTH ROUTES
// ============================================================

/**
 * Register authentication routes
 */
export async function registerAuthRoutes(server: FastifyInstance): Promise<void> {
  /**
   * Get available auth providers
   * GET /auth/providers
   */
  server.get('/auth/providers', async (_request, reply) => {
    const providers = authService.getConfiguredProviders();
    return reply.send({
      success: true,
      providers,
    });
  });

  // ============================================
  // OAuth - Google
  // ============================================
  
  /**
   * Initiate Google OAuth
   * GET /auth/google
   */
  server.get('/auth/google', async (_request, reply) => {
    try {
      const url = authService.getGoogleAuthUrl();
      return reply.redirect(url);
    } catch (error: any) {
      logger.error('Google OAuth init failed', error);
      return reply.redirect(`${config.frontendUrl}?error=oauth_not_configured`);
    }
  });
  
  /**
   * Google OAuth callback
   * GET /auth/google/callback
   */
  server.get<{ Querystring: { code?: string; error?: string } }>(
    '/auth/google/callback',
    async (request, reply) => {
      try {
        const { code, error } = request.query;
        
        if (error || !code) {
          logger.warn('Google OAuth callback error', { error });
          return reply.redirect(`${config.frontendUrl}?error=oauth_denied`);
        }
        
        const { user, token } = await authService.handleGoogleCallback(code);
        
        logger.info('Google OAuth successful', { userId: user.id, email: user.email });
        
        // Set cookie and redirect to frontend
        setAuthCookie(reply, token);
        return reply.redirect(`${config.frontendUrl}?auth=success`);
      } catch (error: any) {
        logger.error('Google OAuth callback failed', error);
        const errorMsg = encodeURIComponent(error.message || 'oauth_failed');
        return reply.redirect(`${config.frontendUrl}?error=${errorMsg}`);
      }
    }
  );
  
  // ============================================
  // OAuth - GitHub
  // ============================================
  
  /**
   * Initiate GitHub OAuth
   * GET /auth/github
   */
  server.get('/auth/github', async (_request, reply) => {
    try {
      const url = authService.getGitHubAuthUrl();
      return reply.redirect(url);
    } catch (error: any) {
      logger.error('GitHub OAuth init failed', error);
      return reply.redirect(`${config.frontendUrl}?error=oauth_not_configured`);
    }
  });
  
  /**
   * GitHub OAuth callback
   * GET /auth/github/callback
   */
  server.get<{ Querystring: { code?: string; error?: string } }>(
    '/auth/github/callback',
    async (request, reply) => {
      try {
        const { code, error } = request.query;
        
        if (error || !code) {
          logger.warn('GitHub OAuth callback error', { error });
          return reply.redirect(`${config.frontendUrl}?error=oauth_denied`);
        }
        
        const { user, token } = await authService.handleGitHubCallback(code);
        
        logger.info('GitHub OAuth successful', { userId: user.id, email: user.email });
        
        // Set cookie and redirect to frontend
        setAuthCookie(reply, token);
        return reply.redirect(`${config.frontendUrl}?auth=success`);
      } catch (error: any) {
        logger.error('GitHub OAuth callback failed', error);
        const errorMsg = encodeURIComponent(error.message || 'oauth_failed');
        return reply.redirect(`${config.frontendUrl}?error=${errorMsg}`);
      }
    }
  );
  
  // ============================================
  // Session Management
  // ============================================

  /**
   * Get current user
   * GET /auth/me
   */
  server.get('/auth/me', async (request, reply) => {
    try {
      const user = await getUserWithSubscriptionFromRequest(request);
      
      if (!user) {
        return reply.code(401).send({
          success: false,
          error: 'Not authenticated',
        });
      }
      
      return reply.send({
        success: true,
        user,
      });
    } catch (error: any) {
      logger.error('Get user failed', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get user',
        message: error.message,
      });
    }
  });

  /**
   * Logout
   * POST /auth/logout
   */
  server.post('/auth/logout', async (request, reply) => {
    try {
      const token = getTokenFromRequest(request);
      
      if (token) {
        await authService.revokeSession(token);
      }
      
      clearAuthCookie(reply);
      
      return reply.send({
        success: true,
        message: 'Logged out',
      });
    } catch (error: any) {
      logger.error('Logout failed', error);
      return reply.code(500).send({
        success: false,
        error: 'Logout failed',
        message: error.message,
      });
    }
  });
  
  /**
   * Update user profile
   * PUT /auth/profile
   */
  server.put<{ Body: { name?: string } }>(
    '/auth/profile',
    async (request, reply) => {
      try {
        const user = await getUserFromRequest(request);
        
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Not authenticated',
          });
        }
        
        const { name } = request.body;
        const updated = await authService.updateUser(user.id, { name });
        
        return reply.send({
          success: true,
          user: updated,
        });
      } catch (error: any) {
        logger.error('Update profile failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to update profile',
          message: error.message,
        });
      }
    }
  );

  // ============================================
  // Legacy Login (for backward compatibility)
  // ============================================
  
  /**
   * Login (legacy - email/password)
   * POST /auth/login
   * @deprecated Use OAuth instead
   */
  server.post<{ Body: LoginRequest }>(
    '/auth/login',
    async (request, reply) => {
      // Return error directing to OAuth
      return reply.code(400).send({
        success: false,
        error: 'Email/password login is disabled. Please use OAuth (Google or GitHub).',
        providers: authService.getConfiguredProviders(),
      });
    }
  );
}

// Re-export for backward compatibility
export { getUserFromRequest as getUserRoleForApp };
