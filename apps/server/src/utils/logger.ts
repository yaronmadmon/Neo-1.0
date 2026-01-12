/**
 * Structured Logger Utility
 * Provides consistent logging interface with debug package integration
 */

import debug from 'debug';
import type { FastifyRequest } from 'fastify';
import { sanitizeObject } from './sanitize.js';

// Debug namespaces
export const debugNamespaces = {
  server: 'neo:server',
  api: 'neo:api',
  generator: 'neo:generator',
  ai: 'neo:ai',
  safety: 'neo:safety',
  discovery: 'neo:discovery',
  error: 'neo:error',
  request: 'neo:request',
} as const;

// Create debug loggers
export const log = {
  server: debug(debugNamespaces.server),
  api: debug(debugNamespaces.api),
  generator: debug(debugNamespaces.generator),
  ai: debug(debugNamespaces.ai),
  safety: debug(debugNamespaces.safety),
  discovery: debug(debugNamespaces.discovery),
  error: debug(debugNamespaces.error),
  request: debug(debugNamespaces.request),
};

// Log levels (for compatibility with Pino)
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Get current log level from environment
 */
export function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL || process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  return level.toLowerCase() as LogLevel;
}

/**
 * Check if a log level should be logged
 */
export function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  const levels = [LogLevel.TRACE, LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
  const currentIndex = levels.indexOf(currentLevel);
  const messageIndex = levels.indexOf(level);
  return messageIndex >= currentIndex;
}

/**
 * Format log message with context
 */
export function formatLogMessage(message: string, context?: Record<string, unknown>): string {
  if (!context || Object.keys(context).length === 0) {
    return message;
  }
  
  // Sanitize context to prevent logging sensitive data (API keys, passwords, etc.)
  const sanitized = sanitizeObject(context);
  
  const contextStr = Object.entries(sanitized)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(' ');
  return `${message} ${contextStr}`;
}

/**
 * Get request ID from request (for tracing)
 */
export function getRequestId(request?: FastifyRequest): string {
  return (request as any)?.id || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Logger utility functions with context support
 */
export const logger = {
  trace: (message: string, context?: Record<string, unknown>) => {
    if (shouldLog(LogLevel.TRACE)) {
      log.server(formatLogMessage(`[TRACE] ${message}`, context));
    }
  },
  
  debug: (message: string, context?: Record<string, unknown>) => {
    if (shouldLog(LogLevel.DEBUG)) {
      log.server(formatLogMessage(`[DEBUG] ${message}`, context));
    }
  },
  
  info: (message: string, context?: Record<string, unknown>) => {
    if (shouldLog(LogLevel.INFO)) {
      log.server(formatLogMessage(`[INFO] ${message}`, context));
    }
  },
  
  warn: (message: string, context?: Record<string, unknown>) => {
    if (shouldLog(LogLevel.WARN)) {
      log.error(formatLogMessage(`[WARN] ${message}`, context));
    }
  },
  
  error: (message: string, error?: Error | unknown, context?: Record<string, unknown>) => {
    if (shouldLog(LogLevel.ERROR)) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
      };
      log.error(formatLogMessage(`[ERROR] ${message}`, errorContext));
    }
  },
};
