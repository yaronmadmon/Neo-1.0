/**
 * Request Logging Middleware
 * Logs all HTTP requests with timing and request IDs
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { log, getRequestId } from './logger.js';

const ingestUrl = 'http://127.0.0.1:7242/ingest/68f493d6-bcff-4e1c-be37-1bcd9b225526';
const safeIngest = (payload: Record<string, unknown>) => {
  const fetchFn = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null;
  if (!fetchFn) {
    return;
  }
  fetchFn(ingestUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
};

/**
 * Request logging middleware for Fastify
 */
export async function requestLogger(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // #region agent log
  safeIngest({location:'request-logger.ts:onRequest',message:'Request logger ENTRY',data:{method:request.method,url:request.url,replySent:reply.sent},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'J'});
  // #endregion
  try {
    const requestId = getRequestId(request);
    const startTime = Date.now();
    
    // Attach request ID to request object
    (request as any).id = requestId;
    (request as any).startTime = startTime;
    
    // Log request start
    log.request(`→ ${request.method} ${request.url}`, {
      requestId,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  } catch (error: any) {
    // #region agent log
    safeIngest({location:'request-logger.ts:catch',message:'Request logger ERROR',data:{errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'J'});
    // #endregion
    throw error;
  }
}
