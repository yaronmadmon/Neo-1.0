/**
 * Auth Service
 * Handles OAuth authentication and JWT session management
 */
import { config } from '../config.js';
import { userRepository, CreateUserData } from '../repositories/user-repository.js';
import type { User, UserWithSubscription } from '../types/database.js';
import crypto from 'crypto';

// Simple JWT implementation (production should use jsonwebtoken package)
interface JWTPayload {
  sub: string;  // user ID
  email: string;
  iat: number;  // issued at
  exp: number;  // expires at
}

/**
 * Base64URL encode
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64URL decode
 */
function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString();
}

/**
 * Create HMAC signature
 */
function createSignature(data: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Create JWT token
 */
function createJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresInMs: number): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + Math.floor(expiresInMs / 1000),
  };
  
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = createSignature(`${headerEncoded}.${payloadEncoded}`, config.jwtSecret);
  
  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * Verify and decode JWT token
 */
function verifyJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [headerEncoded, payloadEncoded, signature] = parts;
    const expectedSignature = createSignature(`${headerEncoded}.${payloadEncoded}`, config.jwtSecret);
    
    if (signature !== expectedSignature) return null;
    
    const payload: JWTPayload = JSON.parse(base64UrlDecode(payloadEncoded));
    
    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Parse expiry string (e.g., "7d", "24h", "30m")
 */
function parseExpiryString(expiry: string): number {
  const match = expiry.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'm': return value * 60 * 1000;
    case 's': return value * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

/**
 * OAuth provider response types
 */
interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

interface GitHubUserInfo {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

/**
 * Auth Service class
 */
export class AuthService {
  private tokenExpiryMs: number;
  
  constructor() {
    this.tokenExpiryMs = parseExpiryString(config.jwtExpiresIn);
  }
  
  // ============================================
  // OAuth - Google
  // ============================================
  
  /**
   * Get Google OAuth URL
   */
  getGoogleAuthUrl(): string {
    if (!config.googleClientId) {
      throw new Error('Google OAuth not configured');
    }
    
    const params = new URLSearchParams({
      client_id: config.googleClientId,
      redirect_uri: `${config.appUrl}/auth/google/callback`,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'consent',
    });
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
  
  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(code: string): Promise<{ user: User; token: string }> {
    if (!config.googleClientId || !config.googleClientSecret) {
      throw new Error('Google OAuth not configured');
    }
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${config.appUrl}/auth/google/callback`,
      }),
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Google token exchange failed: ${error}`);
    }
    
    const tokens = await tokenResponse.json() as { access_token: string };
    
    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to get Google user info');
    }
    
    const googleUser = await userResponse.json() as GoogleUserInfo;
    
    // Find or create user
    let user = await userRepository.findByOAuthProvider('google', googleUser.id);
    
    if (!user) {
      // Check if user with this email exists
      user = await userRepository.findByEmail(googleUser.email);
      
      if (user) {
        // Link existing account to Google (would need additional logic for security)
        throw new Error('Email already registered. Please sign in with your original method.');
      }
      
      // Create new user
      user = await userRepository.create({
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
        authProvider: 'google',
        authProviderId: googleUser.id,
        emailVerified: googleUser.verified_email,
      });
    }
    
    // Create session token
    const token = await this.createSession(user.id, user.email);
    
    return { user, token };
  }
  
  // ============================================
  // OAuth - GitHub
  // ============================================
  
  /**
   * Get GitHub OAuth URL
   */
  getGitHubAuthUrl(): string {
    if (!config.githubClientId) {
      throw new Error('GitHub OAuth not configured');
    }
    
    const params = new URLSearchParams({
      client_id: config.githubClientId,
      redirect_uri: `${config.appUrl}/auth/github/callback`,
      scope: 'user:email',
    });
    
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }
  
  /**
   * Handle GitHub OAuth callback
   */
  async handleGitHubCallback(code: string): Promise<{ user: User; token: string }> {
    if (!config.githubClientId || !config.githubClientSecret) {
      throw new Error('GitHub OAuth not configured');
    }
    
    // Exchange code for token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
      }),
    });
    
    if (!tokenResponse.ok) {
      throw new Error('GitHub token exchange failed');
    }
    
    const tokens = await tokenResponse.json() as { access_token?: string; error?: string; error_description?: string };
    
    if (tokens.error) {
      throw new Error(`GitHub OAuth error: ${tokens.error_description || tokens.error}`);
    }
    
    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'User-Agent': 'Neo-App',
      },
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to get GitHub user info');
    }
    
    const githubUser = await userResponse.json() as GitHubUserInfo;
    
    // Get user's primary email if not public
    let email = githubUser.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'User-Agent': 'Neo-App',
        },
      });
      
      if (emailsResponse.ok) {
        const emails = await emailsResponse.json() as GitHubEmail[];
        const primaryEmail = emails.find(e => e.primary && e.verified);
        email = primaryEmail?.email || emails[0]?.email;
      }
    }
    
    if (!email) {
      throw new Error('Could not get email from GitHub account');
    }
    
    // Find or create user
    let user = await userRepository.findByOAuthProvider('github', String(githubUser.id));
    
    if (!user) {
      // Check if user with this email exists
      user = await userRepository.findByEmail(email);
      
      if (user) {
        throw new Error('Email already registered. Please sign in with your original method.');
      }
      
      // Create new user
      user = await userRepository.create({
        email,
        name: githubUser.name || githubUser.login,
        avatarUrl: githubUser.avatar_url,
        authProvider: 'github',
        authProviderId: String(githubUser.id),
        emailVerified: true, // GitHub emails are verified
      });
    }
    
    // Create session token
    const token = await this.createSession(user.id, user.email);
    
    return { user, token };
  }
  
  // ============================================
  // Session Management
  // ============================================
  
  /**
   * Create a session and return JWT token
   */
  async createSession(userId: string, email: string): Promise<string> {
    const token = createJWT({ sub: userId, email }, this.tokenExpiryMs);
    const expiresAt = new Date(Date.now() + this.tokenExpiryMs);
    
    // Store session in database
    await userRepository.createSession(userId, token, expiresAt);
    
    return token;
  }
  
  /**
   * Validate session token and return user
   */
  async validateSession(token: string): Promise<User | null> {
    // Verify JWT
    const payload = verifyJWT(token);
    if (!payload) return null;
    
    // Check session exists in database
    const session = await userRepository.findSession(token);
    if (!session) return null;
    
    // Get user
    return userRepository.findById(payload.sub);
  }
  
  /**
   * Validate session and return user with subscription
   */
  async validateSessionWithSubscription(token: string): Promise<UserWithSubscription | null> {
    const payload = verifyJWT(token);
    if (!payload) return null;
    
    const session = await userRepository.findSession(token);
    if (!session) return null;
    
    return userRepository.findByIdWithSubscription(payload.sub);
  }
  
  /**
   * Revoke session
   */
  async revokeSession(token: string): Promise<void> {
    await userRepository.deleteSession(token);
  }
  
  /**
   * Revoke all sessions for a user
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await userRepository.deleteAllSessions(userId);
  }
  
  // ============================================
  // User Management
  // ============================================
  
  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    return userRepository.findById(id);
  }
  
  /**
   * Get user with subscription
   */
  async getUserWithSubscription(id: string): Promise<UserWithSubscription | null> {
    return userRepository.findByIdWithSubscription(id);
  }
  
  /**
   * Update user profile
   */
  async updateUser(id: string, data: { name?: string; avatarUrl?: string }): Promise<User | null> {
    return userRepository.update(id, data);
  }
  
  // ============================================
  // Helpers
  // ============================================
  
  /**
   * Check if OAuth provider is configured
   */
  isOAuthConfigured(provider: 'google' | 'github'): boolean {
    if (provider === 'google') {
      return !!config.googleClientId && !!config.googleClientSecret;
    }
    if (provider === 'github') {
      return !!config.githubClientId && !!config.githubClientSecret;
    }
    return false;
  }
  
  /**
   * Get configured OAuth providers
   */
  getConfiguredProviders(): string[] {
    const providers: string[] = [];
    if (this.isOAuthConfigured('google')) providers.push('google');
    if (this.isOAuthConfigured('github')) providers.push('github');
    return providers;
  }
}

// Singleton instance
export const authService = new AuthService();
