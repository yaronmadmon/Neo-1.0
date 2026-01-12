/**
 * Event System - Pub/Sub event bus for runtime communication
 * Enables decoupled component-to-component and system communication
 */

export type EventCallback<T = unknown> = (data: T) => void | Promise<void>;

export interface EventSubscription {
  id: string;
  unsubscribe: () => void;
}

export interface EventPayload {
  type: string;
  source?: string;
  timestamp: number;
  data: unknown;
}

// Built-in event types
export enum RuntimeEventType {
  // Data events
  DATA_CREATED = 'data:created',
  DATA_UPDATED = 'data:updated',
  DATA_DELETED = 'data:deleted',
  DATA_REFRESHED = 'data:refreshed',
  
  // State events
  STATE_CHANGED = 'state:changed',
  STATE_INITIALIZED = 'state:initialized',
  
  // Navigation events
  PAGE_NAVIGATED = 'page:navigated',
  PAGE_LOADED = 'page:loaded',
  
  // Component events
  COMPONENT_MOUNTED = 'component:mounted',
  COMPONENT_UNMOUNTED = 'component:unmounted',
  COMPONENT_ACTION = 'component:action',
  
  // Form events
  FORM_SUBMITTED = 'form:submitted',
  FORM_VALIDATED = 'form:validated',
  FORM_RESET = 'form:reset',
  
  // UI events
  NOTIFICATION_SHOW = 'notification:show',
  MODAL_OPEN = 'modal:open',
  MODAL_CLOSE = 'modal:close',
  
  // Flow events
  FLOW_STARTED = 'flow:started',
  FLOW_COMPLETED = 'flow:completed',
  FLOW_ERROR = 'flow:error',
  
  // Error events
  ERROR_OCCURRED = 'error:occurred',
}

/**
 * EventBus - Centralized pub/sub event system
 */
export class EventBus {
  private listeners: Map<string, Map<string, EventCallback<any>>>;
  private history: EventPayload[];
  private maxHistorySize: number;
  private subscriptionIdCounter: number;
  private wildcardListeners: Map<string, EventCallback<any>>;

  constructor(options?: { maxHistorySize?: number }) {
    this.listeners = new Map();
    this.wildcardListeners = new Map();
    this.history = [];
    this.maxHistorySize = options?.maxHistorySize ?? 100;
    this.subscriptionIdCounter = 0;
  }

  /**
   * Subscribe to an event type
   */
  on<T = unknown>(eventType: string, callback: EventCallback<T>): EventSubscription {
    const subscriptionId = `sub_${++this.subscriptionIdCounter}_${Date.now()}`;
    
    // Handle wildcard subscriptions
    if (eventType === '*' || eventType.endsWith(':*')) {
      this.wildcardListeners.set(subscriptionId, callback);
    } else {
      if (!this.listeners.has(eventType)) {
        this.listeners.set(eventType, new Map());
      }
      this.listeners.get(eventType)!.set(subscriptionId, callback);
    }

    return {
      id: subscriptionId,
      unsubscribe: () => this.off(eventType, subscriptionId),
    };
  }

  /**
   * Subscribe to an event type (one-time)
   */
  once<T = unknown>(eventType: string, callback: EventCallback<T>): EventSubscription {
    const subscription = this.on<T>(eventType, async (data) => {
      subscription.unsubscribe();
      await callback(data);
    });
    return subscription;
  }

  /**
   * Unsubscribe from an event
   */
  off(eventType: string, subscriptionId: string): void {
    if (eventType === '*' || eventType.endsWith(':*')) {
      this.wildcardListeners.delete(subscriptionId);
    } else {
      const eventListeners = this.listeners.get(eventType);
      if (eventListeners) {
        eventListeners.delete(subscriptionId);
        if (eventListeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    }
  }

  /**
   * Emit an event
   */
  async emit<T = unknown>(eventType: string, data: T, source?: string): Promise<void> {
    const payload: EventPayload = {
      type: eventType,
      source,
      timestamp: Date.now(),
      data,
    };

    // Store in history
    this.history.push(payload);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Notify specific listeners
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      const promises = Array.from(eventListeners.values()).map(callback =>
        Promise.resolve(callback(data))
      );
      await Promise.all(promises);
    }

    // Notify wildcard listeners
    const wildcardPromises = Array.from(this.wildcardListeners.entries()).map(([id, callback]) => {
      // Check if wildcard matches (e.g., "data:*" matches "data:created")
      const wildcardPattern = id.replace(':*', ':');
      if (id === '*' || eventType.startsWith(wildcardPattern)) {
        return Promise.resolve(callback(payload));
      }
      return Promise.resolve();
    });
    await Promise.all(wildcardPromises);
  }

  /**
   * Emit an event synchronously (fire and forget)
   */
  emitSync<T = unknown>(eventType: string, data: T, source?: string): void {
    this.emit(eventType, data, source).catch(err => {
      console.error(`[EventBus] Error in async handler for ${eventType}:`, err);
    });
  }

  /**
   * Get event history
   */
  getHistory(filter?: { type?: string; since?: number; limit?: number }): EventPayload[] {
    let filtered = [...this.history];
    
    if (filter?.type) {
      filtered = filtered.filter(e => e.type === filter.type || e.type.startsWith(filter.type + ':'));
    }
    
    if (filter?.since !== undefined) {
      const sinceTime = filter.since;
      filtered = filtered.filter(e => e.timestamp >= sinceTime);
    }
    
    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }
    
    return filtered;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Remove all listeners
   */
  clear(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
  }

  /**
   * Get the number of listeners for an event type
   */
  listenerCount(eventType?: string): number {
    if (eventType) {
      return (this.listeners.get(eventType)?.size ?? 0) + this.wildcardListeners.size;
    }
    
    let count = this.wildcardListeners.size;
    for (const listeners of this.listeners.values()) {
      count += listeners.size;
    }
    return count;
  }
}

// Singleton instance for global event bus
let globalEventBus: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}

export function resetEventBus(): void {
  if (globalEventBus) {
    globalEventBus.clear();
    globalEventBus.clearHistory();
  }
  globalEventBus = null;
}
