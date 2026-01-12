/**
 * Debug Helper Utilities
 * Tools to help AI assistant debug issues by exporting state and information
 */

import type { FastifyInstance } from 'fastify';
import { logger } from './logger.js';
import fs from 'fs/promises';
import path from 'path';

export interface DebugState {
  timestamp: string;
  server: {
    port: number;
    host: string;
    nodeEnv: string;
  };
  memory: NodeJS.MemoryUsage;
  uptime: number;
  appStore?: {
    count: number;
    appIds: string[];
  };
  config?: Record<string, unknown>;
}

/**
 * Export current server state to a JSON file
 * Useful for AI assistant to analyze issues
 */
export async function exportDebugState(
  server: FastifyInstance,
  appStore?: Map<string, any>,
  config?: any
): Promise<string> {
  const state: DebugState = {
    timestamp: new Date().toISOString(),
    server: {
      port: (server.server.address() as any)?.port || 0,
      host: (server.server.address() as any)?.address || 'unknown',
      nodeEnv: process.env.NODE_ENV || 'development',
    },
    memory: process.memoryUsage(),
    uptime: process.uptime(),
  };

  if (appStore) {
    state.appStore = {
      count: appStore.size,
      appIds: Array.from(appStore.keys()),
    };
  }

  if (config) {
    state.config = {
      port: config.port,
      host: config.host,
      nodeEnv: config.nodeEnv,
      logLevel: config.logLevel,
      aiProvider: config.aiProvider,
      // Don't include sensitive data like API keys
    };
  }

  const debugDir = path.join(process.cwd(), 'debug');
  try {
    await fs.mkdir(debugDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  const filePath = path.join(debugDir, `debug-state-${Date.now()}.json`);
  await fs.writeFile(filePath, JSON.stringify(state, null, 2));

  logger.info('Debug state exported', { filePath });
  return filePath;
}

/**
 * Get recent error logs from memory (if stored)
 * This is a simple in-memory log buffer
 */
const errorLogBuffer: Array<{ timestamp: string; error: any; context?: any }> = [];
const MAX_LOG_BUFFER = 100;

export function addErrorToBuffer(error: any, context?: any): void {
  errorLogBuffer.push({
    timestamp: new Date().toISOString(),
    error: {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    },
    context,
  });

  // Keep only recent errors
  if (errorLogBuffer.length > MAX_LOG_BUFFER) {
    errorLogBuffer.shift();
  }
}

export function getRecentErrors(count: number = 10): typeof errorLogBuffer {
  return errorLogBuffer.slice(-count);
}

/**
 * Export recent errors to a file
 */
export async function exportRecentErrors(count: number = 50): Promise<string> {
  const errors = getRecentErrors(count);
  const debugDir = path.join(process.cwd(), 'debug');
  
  try {
    await fs.mkdir(debugDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  const filePath = path.join(debugDir, `recent-errors-${Date.now()}.json`);
  await fs.writeFile(filePath, JSON.stringify(errors, null, 2));

  logger.info('Recent errors exported', { filePath, count: errors.length });
  return filePath;
}

/**
 * Create a debug report with state and errors
 */
export async function createDebugReport(
  server: FastifyInstance,
  appStore?: Map<string, any>,
  config?: any
): Promise<string> {
  const report = {
    timestamp: new Date().toISOString(),
    state: await exportDebugState(server, appStore, config),
    recentErrors: getRecentErrors(20),
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
    },
  };

  const debugDir = path.join(process.cwd(), 'debug');
  try {
    await fs.mkdir(debugDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  const filePath = path.join(debugDir, `debug-report-${Date.now()}.json`);
  await fs.writeFile(filePath, JSON.stringify(report, null, 2));

  logger.info('Debug report created', { filePath });
  return filePath;
}
