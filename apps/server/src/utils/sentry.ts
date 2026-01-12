/**
 * Sentry Error Tracking Integration
 * Initializes Sentry and provides helper functions for error tracking
 */

import * as Sentry from '@sentry/node';
import { config } from '../config.js';

/**
 * Initialize Sentry if DSN is provided
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.log('⚠️  Sentry DSN not provided - error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: config.nodeEnv || 'development',
      tracesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0, // 100% in dev, 10% in prod
      debug: config.nodeEnv === 'development',
      beforeSend(event, hint) {
        // Don't send errors in development if explicitly disabled
        if (config.nodeEnv === 'development' && process.env.SENTRY_DISABLE_DEV === 'true') {
          return null;
        }
        return event;
      },
      // HTTP integration is automatically included in @sentry/node
      // No need to explicitly add it
    });

    console.log('✅ Sentry initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error);
  }
}

/**
 * Capture an exception with context
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (!process.env.SENTRY_DSN) {
    return; // Sentry not configured
  }

  try {
    if (context) {
      Sentry.setContext('error_context', context);
    }
    Sentry.captureException(error);
  } catch (err) {
    // Don't let Sentry errors break the app
    console.error('Failed to capture exception in Sentry:', err);
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId?: string, email?: string, username?: string): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  try {
    Sentry.setUser({
      id: userId,
      email,
      username,
    });
  } catch (err) {
    console.error('Failed to set user context in Sentry:', err);
  }
}

/**
 * Add breadcrumb (for tracking what happened before an error)
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  try {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    });
  } catch (err) {
    console.error('Failed to add breadcrumb in Sentry:', err);
  }
}

/**
 * Set request context for error tracking
 */
export function setRequestContext(request: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
  query?: any;
  params?: any;
}): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  try {
    Sentry.setContext('request', {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
      query: request.query,
      params: request.params,
    });
  } catch (err) {
    console.error('Failed to set request context in Sentry:', err);
  }
}

/**
 * Capture a message (non-error events)
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  try {
    Sentry.captureMessage(message, level);
  } catch (err) {
    console.error('Failed to capture message in Sentry:', err);
  }
}
