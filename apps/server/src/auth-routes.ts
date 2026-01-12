/**
 * Authentication Routes
 * 
 * JWT-based authentication for Neo apps.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from './utils/logger.js';
import { randomUUID } from 'node:crypto';

// ============================================================
// TYPES
// ============================================================

interface LoginRequest {
  email: string;
  password: string;
  appId?: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  appRoles?: Record<string, string>; // appId -> role
}

interface AuthToken {
  userId: string;
  email: string;
  role?: string;
  appId?: string;
  appRole?: string;
  iat: number;
  exp: number;
}

// ============================================================
// IN-MEMORY USER STORE (Replace with database in production)
// ============================================================

const users = new Map<string, User>();
const sessions = new Map<string, { userId: string; token: string; expiresAt: number }>();

// Create default admin user for development
const defaultUser: User = {
  id: 'admin-1',
  email: 'admin@neo.app',
  name: 'Admin User',
  role: 'admin',
  appRoles: {},
};

users.set(defaultUser.id, defaultUser);
users.set(defaultUser.email, defaultUser);

// ============================================================
// JWT SIMULATION (Simple token-based auth)
// ============================================================

/**
 * Generate a simple token (in production, use proper JWT library)
 */
function generateToken(user: User, appId?: string): string {
  const payload: AuthToken = {
    userId: user.id,
    email: user.email,
    role: user.role,
    appId,
    appRole: appId ? user.appRoles?.[appId] : undefined,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
  };
  
  // In production, use jsonwebtoken library
  // For now, return a simple base64-encoded token
  const token = Buffer.from(JSON.stringify(payload)).toString('base64');
  
  // Store session
  sessions.set(token, {
    userId: user.id,
    token,
    expiresAt: payload.exp * 1000,
  });
  
  return token;
}

/**
 * Verify token
 */
function verifyToken(token: string): AuthToken | null {
  try {
    const session = sessions.get(token);
    if (!session || Date.now() > session.expiresAt) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(token, 'base64').toString()) as AuthToken;
    
    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      sessions.delete(token);
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Get user from request
 */
export async function getUserFromRequest(request: FastifyRequest): Promise<User | null> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }
  
  const user = users.get(payload.userId);
  return user || null;
}

/**
 * Get role for app
 */
export async function getUserRoleForApp(userId: string, appId: string): Promise<string | null> {
  const user = users.get(userId);
  if (!user) return null;
  
  return user.appRoles?.[appId] || user.role || 'viewer';
}

// ============================================================
// AUTH ROUTES
// ============================================================

/**
 * Register authentication routes
 */
export async function registerAuthRoutes(server: FastifyInstance): Promise<void> {
  /**
   * Login
   * POST /auth/login
   */
  server.post<{ Body: LoginRequest }>(
    '/auth/login',
    async (request, reply) => {
      try {
        const { email, password, appId } = request.body;
        
        // Simple authentication (in production, use proper password hashing)
        const user = users.get(email);
        if (!user || password !== 'password') { // Default password for dev
          return reply.code(401).send({
            success: false,
            error: 'Invalid credentials',
          });
        }
        
        // Generate token
        const token = generateToken(user, appId);
        
        // Get role for app if specified
        const role = appId ? (user.appRoles?.[appId] || user.role || 'viewer') : (user.role || 'viewer');
        
        logger.info('User logged in', { userId: user.id, email, appId });
        
        return reply.send({
          success: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role,
            appRole: appId ? role : undefined,
          },
        });
      } catch (error: any) {
        logger.error('Login failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Login failed',
          message: error.message,
        });
      }
    }
  );

  /**
   * Get current user
   * GET /auth/me
   */
  server.get(
    '/auth/me',
    async (request, reply) => {
      try {
        const user = await getUserFromRequest(request);
        
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Not authenticated',
          });
        }
        
        // Get appId from query if provided
        const appId = (request.query as any)?.appId as string | undefined;
        const role = appId ? (user.appRoles?.[appId] || user.role || 'viewer') : (user.role || 'viewer');
        
        return reply.send({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role,
            appRole: appId ? role : undefined,
          },
        });
      } catch (error: any) {
        logger.error('Get user failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to get user',
          message: error.message,
        });
      }
    }
  );

  /**
   * Logout
   * POST /auth/logout
   */
  server.post(
    '/auth/logout',
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          sessions.delete(token);
        }
        
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
    }
  );
}
