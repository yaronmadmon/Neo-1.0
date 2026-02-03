/**
 * Telemetry Logger
 * Logs AI pipeline events for analysis and iteration
 */

/**
 * Generation event types
 */
export type TelemetryEventType =
  | 'generation_started'
  | 'understanding_completed'
  | 'clarification_asked'
  | 'customization_completed'
  | 'generation_completed'
  | 'generation_failed'
  | 'user_modification'
  | 'unmet_request';

/**
 * Unmet request types for product feedback
 */
export type UnmetRequestType =
  | 'industry_no_kit'
  | 'feature_unavailable'
  | 'integration_unavailable';

/**
 * Unmet request record for product intelligence
 */
export interface UnmetRequest {
  id: string;
  timestamp: Date;
  type: UnmetRequestType;
  originalInput: string;
  requestedItem: string;
  fallbackOffered?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Base telemetry event
 */
export interface TelemetryEvent {
  id: string;
  type: TelemetryEventType;
  timestamp: Date;
  sessionId: string;
  data: Record<string, unknown>;
}

/**
 * Generation session data
 */
export interface GenerationSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  
  // Input
  inputText: string;
  inputLength: number;
  
  // Understanding (Call 1)
  detectedIndustry?: string;
  detectedIntent?: string;
  confidenceScore?: number;
  
  // Clarification
  questionsAsked: number;
  questionIds: string[];
  
  // Customization (Call 2)
  finalKitUsed?: string;
  customizationsApplied: string[];
  customizationsDropped: string[];
  
  // Timing
  call1DurationMs?: number;
  call2DurationMs?: number;
  totalDurationMs?: number;
  
  // Outcome
  success: boolean;
  errorMessage?: string;
  
  // Post-generation
  userModifiedWithin5Min?: boolean;
  modificationTimestamp?: Date;
}

/**
 * Telemetry store interface
 */
export interface TelemetryStore {
  logEvent(event: TelemetryEvent): Promise<void>;
  logSession(session: GenerationSession): Promise<void>;
  getSessions(filter?: TelemetryFilter): Promise<GenerationSession[]>;
  getEvents(sessionId: string): Promise<TelemetryEvent[]>;
  logUnmetRequest?(request: UnmetRequest): Promise<void>;
  getUnmetRequests?(filter?: UnmetRequestFilter): Promise<UnmetRequest[]>;
}

/**
 * Unmet request filter
 */
export interface UnmetRequestFilter {
  startDate?: Date;
  endDate?: Date;
  type?: UnmetRequestType;
  limit?: number;
}

/**
 * Telemetry filter
 */
export interface TelemetryFilter {
  startDate?: Date;
  endDate?: Date;
  industry?: string;
  minConfidence?: number;
  maxConfidence?: number;
  success?: boolean;
}

/**
 * In-memory telemetry store (for development)
 */
class InMemoryTelemetryStore implements TelemetryStore {
  private events: TelemetryEvent[] = [];
  private sessions: GenerationSession[] = [];
  private unmetRequests: UnmetRequest[] = [];
  private maxEvents = 10000;
  private maxSessions = 1000;
  private maxUnmetRequests = 5000;

  async logEvent(event: TelemetryEvent): Promise<void> {
    this.events.push(event);
    
    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  async logSession(session: GenerationSession): Promise<void> {
    // Update existing session or add new
    const existingIndex = this.sessions.findIndex(s => s.sessionId === session.sessionId);
    if (existingIndex >= 0) {
      this.sessions[existingIndex] = session;
    } else {
      this.sessions.push(session);
    }

    // Trim old sessions
    if (this.sessions.length > this.maxSessions) {
      this.sessions = this.sessions.slice(-this.maxSessions);
    }
  }

  async getSessions(filter?: TelemetryFilter): Promise<GenerationSession[]> {
    let results = [...this.sessions];

    if (filter) {
      if (filter.startDate) {
        results = results.filter(s => s.startTime >= filter.startDate!);
      }
      if (filter.endDate) {
        results = results.filter(s => s.startTime <= filter.endDate!);
      }
      if (filter.industry) {
        results = results.filter(s => s.detectedIndustry === filter.industry);
      }
      if (filter.minConfidence !== undefined) {
        results = results.filter(s => (s.confidenceScore || 0) >= filter.minConfidence!);
      }
      if (filter.maxConfidence !== undefined) {
        results = results.filter(s => (s.confidenceScore || 1) <= filter.maxConfidence!);
      }
      if (filter.success !== undefined) {
        results = results.filter(s => s.success === filter.success);
      }
    }

    return results;
  }

  async getEvents(sessionId: string): Promise<TelemetryEvent[]> {
    return this.events.filter(e => e.sessionId === sessionId);
  }

  async logUnmetRequest(request: UnmetRequest): Promise<void> {
    this.unmetRequests.push(request);
    
    // Trim old requests
    if (this.unmetRequests.length > this.maxUnmetRequests) {
      this.unmetRequests = this.unmetRequests.slice(-this.maxUnmetRequests);
    }
  }

  async getUnmetRequests(filter?: UnmetRequestFilter): Promise<UnmetRequest[]> {
    let results = [...this.unmetRequests];

    if (filter) {
      if (filter.startDate) {
        results = results.filter(r => r.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        results = results.filter(r => r.timestamp <= filter.endDate!);
      }
      if (filter.type) {
        results = results.filter(r => r.type === filter.type);
      }
      if (filter.limit) {
        results = results.slice(0, filter.limit);
      }
    }

    return results;
  }
}

/**
 * Telemetry Logger
 */
export class TelemetryLogger {
  private store: TelemetryStore;
  private currentSession: GenerationSession | null = null;
  private call1Start: number = 0;
  private call2Start: number = 0;

  constructor(store?: TelemetryStore) {
    this.store = store || new InMemoryTelemetryStore();
  }

  /**
   * Start a new generation session
   */
  startSession(inputText: string): string {
    const sessionId = this.generateSessionId();
    
    this.currentSession = {
      sessionId,
      startTime: new Date(),
      inputText,
      inputLength: inputText.length,
      questionsAsked: 0,
      questionIds: [],
      customizationsApplied: [],
      customizationsDropped: [],
      success: false,
    };

    this.logEvent('generation_started', {
      inputLength: inputText.length,
    });

    return sessionId;
  }

  /**
   * Log understanding phase completion (Call 1)
   */
  logUnderstanding(
    industry: string,
    intent: string,
    confidence: number,
    durationMs: number
  ): void {
    if (!this.currentSession) return;

    this.currentSession.detectedIndustry = industry;
    this.currentSession.detectedIntent = intent;
    this.currentSession.confidenceScore = confidence;
    this.currentSession.call1DurationMs = durationMs;

    this.logEvent('understanding_completed', {
      industry,
      intent,
      confidence,
      durationMs,
    });
  }

  /**
   * Log when clarification question is asked
   */
  logClarificationAsked(questionIds: string[]): void {
    if (!this.currentSession) return;

    this.currentSession.questionsAsked += questionIds.length;
    this.currentSession.questionIds.push(...questionIds);

    this.logEvent('clarification_asked', {
      questionIds,
      totalQuestionsAsked: this.currentSession.questionsAsked,
    });
  }

  /**
   * Log customization phase completion (Call 2)
   */
  logCustomization(
    kitUsed: string,
    customizationsApplied: string[],
    customizationsDropped: string[],
    durationMs: number
  ): void {
    if (!this.currentSession) return;

    this.currentSession.finalKitUsed = kitUsed;
    this.currentSession.customizationsApplied = customizationsApplied;
    this.currentSession.customizationsDropped = customizationsDropped;
    this.currentSession.call2DurationMs = durationMs;

    this.logEvent('customization_completed', {
      kitUsed,
      customizationsApplied: customizationsApplied.length,
      customizationsDropped: customizationsDropped.length,
      durationMs,
    });
  }

  /**
   * Mark generation as complete
   */
  completeSession(success: boolean, errorMessage?: string): void {
    if (!this.currentSession) return;

    this.currentSession.success = success;
    this.currentSession.errorMessage = errorMessage;
    this.currentSession.endTime = new Date();
    this.currentSession.totalDurationMs = 
      this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();

    this.logEvent(success ? 'generation_completed' : 'generation_failed', {
      success,
      errorMessage,
      totalDurationMs: this.currentSession.totalDurationMs,
    });

    // Persist session
    this.store.logSession({ ...this.currentSession });
  }

  /**
   * Log user modification within 5 minutes
   */
  logUserModification(sessionId: string): void {
    // This would typically be called from the frontend when user modifies the app
    const now = new Date();
    
    this.store.getSessions({ startDate: new Date(now.getTime() - 5 * 60 * 1000) })
      .then(sessions => {
        const session = sessions.find(s => s.sessionId === sessionId);
        if (session) {
          session.userModifiedWithin5Min = true;
          session.modificationTimestamp = now;
          this.store.logSession(session);
        }
      });

    this.logEventWithSession('user_modification', sessionId, {
      modificationTime: now.toISOString(),
    });
  }

  /**
   * Log an unmet request for product feedback
   * Called when AI can't match a request to available kits/integrations
   */
  logUnmetRequest(
    type: UnmetRequestType,
    originalInput: string,
    requestedItem: string,
    fallbackOffered?: string,
    metadata?: Record<string, unknown>
  ): void {
    const request: UnmetRequest = {
      id: this.generateUnmetRequestId(),
      timestamp: new Date(),
      type,
      originalInput,
      requestedItem,
      fallbackOffered,
      sessionId: this.currentSession?.sessionId,
      metadata,
    };

    // Log the event
    this.logEvent('unmet_request', {
      type,
      requestedItem,
      fallbackOffered,
      ...metadata,
    });

    // Store the unmet request for product analysis
    if (this.store.logUnmetRequest) {
      this.store.logUnmetRequest(request);
    }
  }

  /**
   * Get unmet requests for product analysis
   */
  async getUnmetRequests(filter?: UnmetRequestFilter): Promise<UnmetRequest[]> {
    if (this.store.getUnmetRequests) {
      return this.store.getUnmetRequests(filter);
    }
    return [];
  }

  /**
   * Get unmet requests analytics summary
   */
  async getUnmetRequestsAnalytics(filter?: UnmetRequestFilter): Promise<UnmetRequestsAnalytics> {
    const requests = await this.getUnmetRequests(filter);

    if (requests.length === 0) {
      return {
        total: 0,
        byType: {},
        topRequestedItems: [],
        topFallbacks: [],
      };
    }

    // Count by type
    const byType: Record<string, number> = {};
    for (const req of requests) {
      byType[req.type] = (byType[req.type] || 0) + 1;
    }

    // Count requested items
    const itemCounts: Record<string, number> = {};
    for (const req of requests) {
      itemCounts[req.requestedItem] = (itemCounts[req.requestedItem] || 0) + 1;
    }

    // Count fallbacks offered
    const fallbackCounts: Record<string, number> = {};
    for (const req of requests) {
      if (req.fallbackOffered) {
        fallbackCounts[req.fallbackOffered] = (fallbackCounts[req.fallbackOffered] || 0) + 1;
      }
    }

    // Sort and get top items
    const topRequestedItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([item, count]) => ({ item, count }));

    const topFallbacks = Object.entries(fallbackCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([fallback, count]) => ({ fallback, count }));

    return {
      total: requests.length,
      byType,
      topRequestedItems,
      topFallbacks,
    };
  }

  /**
   * Start timing for Call 1
   */
  startCall1Timer(): void {
    this.call1Start = Date.now();
  }

  /**
   * Get Call 1 duration
   */
  getCall1Duration(): number {
    return Date.now() - this.call1Start;
  }

  /**
   * Start timing for Call 2
   */
  startCall2Timer(): void {
    this.call2Start = Date.now();
  }

  /**
   * Get Call 2 duration
   */
  getCall2Duration(): number {
    return Date.now() - this.call2Start;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSession?.sessionId || null;
  }

  /**
   * Get analytics summary
   */
  async getAnalytics(filter?: TelemetryFilter): Promise<TelemetryAnalytics> {
    const sessions = await this.store.getSessions(filter);

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        successRate: 0,
        averageConfidence: 0,
        averageQuestionsAsked: 0,
        averageDurationMs: 0,
        industryBreakdown: {},
        intentBreakdown: {},
        modificationRate: 0,
      };
    }

    const successful = sessions.filter(s => s.success);
    const withConfidence = sessions.filter(s => s.confidenceScore !== undefined);
    const withModification = sessions.filter(s => s.userModifiedWithin5Min);

    // Industry breakdown
    const industryBreakdown: Record<string, number> = {};
    for (const session of sessions) {
      if (session.detectedIndustry) {
        industryBreakdown[session.detectedIndustry] = 
          (industryBreakdown[session.detectedIndustry] || 0) + 1;
      }
    }

    // Intent breakdown
    const intentBreakdown: Record<string, number> = {};
    for (const session of sessions) {
      if (session.detectedIntent) {
        intentBreakdown[session.detectedIntent] = 
          (intentBreakdown[session.detectedIntent] || 0) + 1;
      }
    }

    return {
      totalSessions: sessions.length,
      successRate: successful.length / sessions.length,
      averageConfidence: withConfidence.length > 0
        ? withConfidence.reduce((sum, s) => sum + (s.confidenceScore || 0), 0) / withConfidence.length
        : 0,
      averageQuestionsAsked: sessions.reduce((sum, s) => sum + s.questionsAsked, 0) / sessions.length,
      averageDurationMs: sessions
        .filter(s => s.totalDurationMs)
        .reduce((sum, s) => sum + (s.totalDurationMs || 0), 0) / sessions.length,
      industryBreakdown,
      intentBreakdown,
      modificationRate: withModification.length / sessions.length,
    };
  }

  private logEvent(type: TelemetryEventType, data: Record<string, unknown>): void {
    if (!this.currentSession) return;
    this.logEventWithSession(type, this.currentSession.sessionId, data);
  }

  private logEventWithSession(
    type: TelemetryEventType,
    sessionId: string,
    data: Record<string, unknown>
  ): void {
    const event: TelemetryEvent = {
      id: this.generateEventId(),
      type,
      timestamp: new Date(),
      sessionId,
      data,
    };

    this.store.logEvent(event);
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateUnmetRequestId(): string {
    return `unmet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Analytics summary
 */
export interface TelemetryAnalytics {
  totalSessions: number;
  successRate: number;
  averageConfidence: number;
  averageQuestionsAsked: number;
  averageDurationMs: number;
  industryBreakdown: Record<string, number>;
  intentBreakdown: Record<string, number>;
  modificationRate: number;
}

/**
 * Unmet requests analytics summary
 */
export interface UnmetRequestsAnalytics {
  total: number;
  byType: Record<string, number>;
  topRequestedItems: Array<{ item: string; count: number }>;
  topFallbacks: Array<{ fallback: string; count: number }>;
}

/**
 * Create a new telemetry logger
 */
export function createTelemetryLogger(store?: TelemetryStore): TelemetryLogger {
  return new TelemetryLogger(store);
}

/**
 * Global singleton instance for convenience
 */
let globalLogger: TelemetryLogger | null = null;

export function getGlobalTelemetryLogger(): TelemetryLogger {
  if (!globalLogger) {
    globalLogger = new TelemetryLogger();
  }
  return globalLogger;
}
