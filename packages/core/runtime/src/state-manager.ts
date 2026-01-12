/**
 * State Manager - Component and application state management
 * Manages UI state, component state, and application-level state
 */

import { EventBus, RuntimeEventType, getEventBus } from './event-system.js';

export type StateSubscriber<T = unknown> = (state: T, previousState: T | undefined) => void;

export interface ComponentState {
  visible: boolean;
  disabled: boolean;
  loading: boolean;
  error?: string;
  value?: unknown;
  selected?: unknown;
  expanded?: boolean;
  focused?: boolean;
  [key: string]: unknown;
}

export interface PageState {
  currentPage: string;
  previousPage?: string;
  params?: Record<string, string>;
  scrollPosition?: number;
}

export interface UIState {
  modals: Map<string, boolean>;
  notifications: NotificationState[];
  globalLoading: boolean;
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
  timestamp: number;
}

export interface AppState {
  page: PageState;
  ui: UIState;
  components: Map<string, ComponentState>;
  custom: Record<string, unknown>;
}

/**
 * StateManager - Centralized state management
 */
export class StateManager {
  private state: AppState;
  private subscribers: Map<string, Set<StateSubscriber<any>>>;
  private globalSubscribers: Set<StateSubscriber<AppState>>;
  private eventBus: EventBus;
  private notificationIdCounter: number;
  private stateHistory: AppState[];
  private maxHistorySize: number;

  constructor(initialPage?: string, eventBus?: EventBus) {
    this.eventBus = eventBus ?? getEventBus();
    this.subscribers = new Map();
    this.globalSubscribers = new Set();
    this.notificationIdCounter = 0;
    this.stateHistory = [];
    this.maxHistorySize = 50;

    this.state = {
      page: {
        currentPage: initialPage ?? 'main',
        previousPage: undefined,
        params: {},
      },
      ui: {
        modals: new Map(),
        notifications: [],
        globalLoading: false,
        sidebarOpen: true,
        theme: 'light',
      },
      components: new Map(),
      custom: {},
    };

    this.eventBus.emitSync(RuntimeEventType.STATE_INITIALIZED, this.state);
  }

  // ==================== Component State ====================

  /**
   * Get component state
   */
  getComponentState(componentId: string): ComponentState {
    return this.state.components.get(componentId) ?? this.getDefaultComponentState();
  }

  /**
   * Set component state
   */
  setComponentState(componentId: string, updates: Partial<ComponentState>): void {
    const current = this.getComponentState(componentId);
    const newState = { ...current, ...updates };
    this.state.components.set(componentId, newState);
    
    this.notifySubscribers(`component:${componentId}`, newState, current);
    this.eventBus.emitSync(RuntimeEventType.STATE_CHANGED, {
      type: 'component',
      componentId,
      state: newState,
      previousState: current,
    });
  }

  /**
   * Get default component state
   */
  private getDefaultComponentState(): ComponentState {
    return {
      visible: true,
      disabled: false,
      loading: false,
    };
  }

  /**
   * Update component value
   */
  setComponentValue(componentId: string, value: unknown): void {
    this.setComponentState(componentId, { value });
  }

  /**
   * Set component visibility
   */
  setComponentVisible(componentId: string, visible: boolean): void {
    this.setComponentState(componentId, { visible });
  }

  /**
   * Set component disabled state
   */
  setComponentDisabled(componentId: string, disabled: boolean): void {
    this.setComponentState(componentId, { disabled });
  }

  /**
   * Set component loading state
   */
  setComponentLoading(componentId: string, loading: boolean): void {
    this.setComponentState(componentId, { loading });
  }

  /**
   * Set component error
   */
  setComponentError(componentId: string, error?: string): void {
    this.setComponentState(componentId, { error });
  }

  // ==================== Page State ====================

  /**
   * Get current page
   */
  getCurrentPage(): string {
    return this.state.page.currentPage;
  }

  /**
   * Navigate to a page
   */
  navigateTo(pageId: string, params?: Record<string, string>): void {
    const previousPage = this.state.page.currentPage;
    this.state.page = {
      currentPage: pageId,
      previousPage,
      params,
    };

    this.notifySubscribers('page', this.state.page, { currentPage: previousPage });
    this.eventBus.emitSync(RuntimeEventType.PAGE_NAVIGATED, {
      from: previousPage,
      to: pageId,
      params,
    });
  }

  /**
   * Go back to previous page
   */
  goBack(): void {
    if (this.state.page.previousPage) {
      this.navigateTo(this.state.page.previousPage);
    }
  }

  /**
   * Get page params
   */
  getPageParams(): Record<string, string> {
    return this.state.page.params ?? {};
  }

  // ==================== UI State ====================

  /**
   * Show a notification
   */
  showNotification(options: Omit<NotificationState, 'id' | 'timestamp'>): string {
    const notification: NotificationState = {
      ...options,
      id: `notif_${++this.notificationIdCounter}`,
      timestamp: Date.now(),
    };

    this.state.ui.notifications.push(notification);
    this.notifySubscribers('ui:notifications', this.state.ui.notifications);
    this.eventBus.emitSync(RuntimeEventType.NOTIFICATION_SHOW, notification);

    // Auto-dismiss after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        this.dismissNotification(notification.id);
      }, notification.duration ?? 3000);
    }

    return notification.id;
  }

  /**
   * Dismiss a notification
   */
  dismissNotification(notificationId: string): void {
    const index = this.state.ui.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      this.state.ui.notifications.splice(index, 1);
      this.notifySubscribers('ui:notifications', this.state.ui.notifications);
    }
  }

  /**
   * Get all notifications
   */
  getNotifications(): NotificationState[] {
    return [...this.state.ui.notifications];
  }

  /**
   * Open a modal
   */
  openModal(modalId: string): void {
    this.state.ui.modals.set(modalId, true);
    this.notifySubscribers(`modal:${modalId}`, true);
    this.eventBus.emitSync(RuntimeEventType.MODAL_OPEN, { modalId });
  }

  /**
   * Close a modal
   */
  closeModal(modalId: string): void {
    this.state.ui.modals.set(modalId, false);
    this.notifySubscribers(`modal:${modalId}`, false);
    this.eventBus.emitSync(RuntimeEventType.MODAL_CLOSE, { modalId });
  }

  /**
   * Check if modal is open
   */
  isModalOpen(modalId: string): boolean {
    return this.state.ui.modals.get(modalId) ?? false;
  }

  /**
   * Set global loading state
   */
  setGlobalLoading(loading: boolean): void {
    this.state.ui.globalLoading = loading;
    this.notifySubscribers('ui:loading', loading);
  }

  /**
   * Get global loading state
   */
  isGlobalLoading(): boolean {
    return this.state.ui.globalLoading;
  }

  /**
   * Toggle sidebar
   */
  toggleSidebar(): void {
    this.state.ui.sidebarOpen = !this.state.ui.sidebarOpen;
    this.notifySubscribers('ui:sidebar', this.state.ui.sidebarOpen);
  }

  /**
   * Set sidebar open state
   */
  setSidebarOpen(open: boolean): void {
    this.state.ui.sidebarOpen = open;
    this.notifySubscribers('ui:sidebar', open);
  }

  /**
   * Set theme
   */
  setTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.state.ui.theme = theme;
    this.notifySubscribers('ui:theme', theme);
  }

  /**
   * Get current theme
   */
  getTheme(): 'light' | 'dark' | 'auto' {
    return this.state.ui.theme;
  }

  // ==================== Custom State ====================

  /**
   * Set custom state value
   */
  setCustomState(key: string, value: unknown): void {
    const previousValue = this.state.custom[key];
    this.state.custom[key] = value;
    this.notifySubscribers(`custom:${key}`, value, previousValue);
  }

  /**
   * Get custom state value
   */
  getCustomState<T = unknown>(key: string): T | undefined {
    return this.state.custom[key] as T | undefined;
  }

  /**
   * Delete custom state value
   */
  deleteCustomState(key: string): void {
    delete this.state.custom[key];
    this.notifySubscribers(`custom:${key}`, undefined);
  }

  // ==================== Subscriptions ====================

  /**
   * Subscribe to state changes
   */
  subscribe<T = unknown>(key: string, subscriber: StateSubscriber<T>): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(subscriber);

    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(subscriber);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  /**
   * Subscribe to all state changes
   */
  subscribeAll(subscriber: StateSubscriber<AppState>): () => void {
    this.globalSubscribers.add(subscriber);
    return () => {
      this.globalSubscribers.delete(subscriber);
    };
  }

  /**
   * Notify subscribers of state change
   */
  private notifySubscribers<T>(key: string, newState: T, previousState?: T): void {
    // Notify specific subscribers
    const subs = this.subscribers.get(key);
    if (subs) {
      for (const subscriber of subs) {
        try {
          subscriber(newState, previousState);
        } catch (err) {
          console.error(`[StateManager] Error in subscriber for ${key}:`, err);
        }
      }
    }

    // Notify global subscribers
    for (const subscriber of this.globalSubscribers) {
      try {
        subscriber(this.state, undefined);
      } catch (err) {
        console.error('[StateManager] Error in global subscriber:', err);
      }
    }
  }

  // ==================== Full State ====================

  /**
   * Get full application state
   */
  getState(): AppState {
    return {
      page: { ...this.state.page },
      ui: {
        ...this.state.ui,
        modals: new Map(this.state.ui.modals),
        notifications: [...this.state.ui.notifications],
      },
      components: new Map(this.state.components),
      custom: { ...this.state.custom },
    };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.state = {
      page: {
        currentPage: 'main',
      },
      ui: {
        modals: new Map(),
        notifications: [],
        globalLoading: false,
        sidebarOpen: true,
        theme: 'light',
      },
      components: new Map(),
      custom: {},
    };
    
    // Clear subscribers
    this.subscribers.clear();
    this.globalSubscribers.clear();
  }
}

// Singleton instance
let globalStateManager: StateManager | null = null;

export function getStateManager(initialPage?: string): StateManager {
  if (!globalStateManager) {
    globalStateManager = new StateManager(initialPage);
  }
  return globalStateManager;
}

export function resetStateManager(): void {
  if (globalStateManager) {
    globalStateManager.reset();
  }
  globalStateManager = null;
}
