# Phase 3: Complete Runtime Engine - COMPLETE ✅

## Overview

The Runtime Engine is the core system that powers app execution, both in preview mode and for future production apps. It provides a complete, reactive system for rendering components, managing data, handling user interactions, and executing application logic.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RuntimeEngine                                │
│  (Main orchestrator that coordinates all subsystems)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  EventBus   │  │  DataStore  │  │StateManager │                 │
│  │  (pub/sub)  │  │  (reactive) │  │  (UI state) │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│         │                │                │                          │
│         └────────────────┼────────────────┘                          │
│                          │                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  Binding    │  │   Action    │  │ Conditional │                 │
│  │   Engine    │  │  Executor   │  │  Renderer   │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐                                   │
│  │  Dynamic    │  │   Layout    │                                   │
│  │   Styler    │  │   Manager   │                                   │
│  └─────────────┘  └─────────────┘                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Components Implemented

### 1. Event System (`event-system.ts`) ✅

A pub/sub event bus for runtime communication:

- **EventBus**: Central event dispatcher
- **Event Types**: DATA_CREATED, DATA_UPDATED, PAGE_NAVIGATED, FLOW_COMPLETED, etc.
- **Features**:
  - Subscription management with unsubscribe
  - Wildcard event listeners (e.g., `data:*`)
  - One-time listeners (`once()`)
  - Event history with filtering
  - Async event handling

```typescript
// Usage
const eventBus = getEventBus();
eventBus.on(RuntimeEventType.DATA_CREATED, (data) => {
  console.log('Record created:', data);
});
eventBus.emit(RuntimeEventType.DATA_CREATED, { modelId: 'tasks', record });
```

### 2. Data Store (`data-store.ts`) ✅

Centralized reactive data management:

- **RuntimeDataStore**: Manages all app data
- **Features**:
  - CRUD operations (create, update, delete)
  - Reactive subscriptions (per-model and global)
  - Query with filters, sorting, pagination
  - Transaction support (begin, commit, rollback)
  - Automatic ID generation

```typescript
// Usage
const store = getDataStore({ tasks: [] });
store.createRecord('tasks', { title: 'New task' });
store.subscribe('tasks', (modelId, records, change) => {
  // React to changes
});
```

### 3. State Manager (`state-manager.ts`) ✅

Component and application state management:

- **StateManager**: Manages UI state
- **Features**:
  - Component state (visible, disabled, loading, error)
  - Page state and navigation
  - Modal management (open/close)
  - Notification system
  - Theme management
  - Custom state storage

```typescript
// Usage
const state = getStateManager('main');
state.setComponentState('button-1', { disabled: true });
state.showNotification({ type: 'success', message: 'Saved!' });
state.openModal('confirm-dialog');
```

### 4. Binding Engine (`binding-engine.ts`) ✅

Two-way data binding between components and data:

- **BindingEngine**: Connects data to UI
- **Binding Types**:
  - Data bindings (from DataStore)
  - State bindings (from StateManager)
  - Computed bindings (derived values)
  - Expression bindings (JavaScript expressions)
- **Features**:
  - Automatic updates on data change
  - Value transformations (format, parse)
  - Debouncing support
  - Two-way binding support

```typescript
// Usage
const engine = new BindingEngine(dataStore, stateManager);
engine.bind({
  componentId: 'task-list',
  type: 'data',
  source: { modelId: 'tasks' },
  target: { prop: 'items' },
});
```

### 5. Action Executor (`action-executor.ts`) ✅

Centralized action handling:

- **ActionExecutor**: Executes all app actions
- **Built-in Actions**:
  - `create_record`, `update_record`, `delete_record`
  - `navigate`, `go_back`
  - `show_notification`, `open_modal`, `close_modal`
  - `set_state`, `set_component_state`
  - `api_call`, `delay`, `conditional`
- **Features**:
  - Custom action handlers
  - Middleware support
  - Sequential and parallel execution
  - Condition evaluation
  - Error handling

```typescript
// Usage
const executor = new ActionExecutor(appId, dataStore, stateManager);
await executor.execute({
  type: 'create_record',
  modelId: 'tasks',
  data: { title: 'New task' },
});
```

### 6. Conditional Renderer (`conditional-renderer.ts`) ✅

Show/hide components based on conditions:

- **ConditionalRenderer**: Evaluates visibility
- **Condition Types**:
  - Simple: field comparisons
  - Expression: JavaScript expressions
  - Composite: AND/OR logic
- **Operators**:
  - equals, notEquals, contains
  - greaterThan, lessThan
  - isEmpty, isNotEmpty
  - in, notIn, matches

```typescript
// Usage
const renderer = new ConditionalRenderer(dataStore, stateManager);
const visible = renderer.shouldShow({
  show: { type: 'simple', field: 'status', operator: 'equals', value: 'active' }
});
```

### 7. Dynamic Styler (`dynamic-styling.ts`) ✅

Apply styles based on data and state:

- **DynamicStyler**: Computes styles dynamically
- **Features**:
  - Theme management with CSS variables
  - Conditional style rules
  - Data-driven styles
  - Expression-based values
  - Style caching
  - Responsive helpers

```typescript
// Usage
const styler = new DynamicStyler(dataStore, stateManager, theme);
const styles = styler.computeStyles('card-1', {
  backgroundColor: '${theme.colors.primary}',
});
```

### 8. Layout Manager (`layout-manager.ts`) ✅

Handles page layouts and component positioning:

- **LayoutManager**: Manages layouts
- **Layout Types**:
  - stack (vertical flex)
  - row (horizontal flex)
  - grid (CSS Grid)
  - split, sidebar, dashboard
- **Features**:
  - Responsive breakpoints
  - Section management
  - Component slots
  - Layout presets

```typescript
// Usage
const layout = new LayoutManager(stateManager);
const styles = layout.getLayoutStyles({
  type: 'grid',
  columns: 3,
  gap: '1rem',
});
```

### 9. Runtime Engine (`runtime-engine.ts`) ✅

Main orchestrator that ties everything together:

- **RuntimeEngine**: Central controller
- **Features**:
  - Initializes all subsystems
  - Page navigation
  - Action handling
  - Component visibility
  - Style computation
  - Data CRUD operations
  - Event subscriptions

```typescript
// Usage
const runtime = new RuntimeEngine({ app, apiBaseUrl: '/api' });
await runtime.initialize();
await runtime.handleAction('form-1', 'form_submit', formData);
```

### 10. Enhanced Component Registry ✅

New components added:

- **Gallery**: Image grid with lightbox
- **Chat**: Message list with input
- **Map**: Location display with markers
- **Section**: Layout container with optional title
- **Row**: Horizontal flex container
- **Grid**: CSS Grid container
- **Divider**: Visual separator
- **Badge**: Status/tag indicator

## File Structure

```
packages/core/runtime/src/
├── index.ts                 # Public exports
├── runtime.ts               # Legacy runtime (preserved)
├── flow-engine.ts           # Legacy flow engine (preserved)
├── runtime-engine.ts        # NEW: Main orchestrator
├── event-system.ts          # NEW: Pub/sub events
├── data-store.ts            # NEW: Reactive data
├── state-manager.ts         # NEW: UI state
├── binding-engine.ts        # NEW: Data bindings
├── action-executor.ts       # NEW: Action handling
├── conditional-renderer.ts  # NEW: Show/hide logic
├── dynamic-styling.ts       # NEW: Dynamic styles
└── layout-manager.ts        # NEW: Layout system

apps/web/src/components/
└── ComponentRegistry.tsx    # ENHANCED: +8 new components
```

## Integration with Preview

The RuntimeEngine integrates seamlessly with the existing Preview component:

```typescript
// In Preview.tsx or similar
import { RuntimeEngine, createRuntimeEngine } from '@neo/runtime';

const runtime = createRuntimeEngine({
  app: appData,
  apiBaseUrl: '/api',
  onNavigate: (pageId) => setCurrentPage(pageId),
  onNotification: (notif) => showToast(notif),
});

// Handle actions
await runtime.handleAction(componentId, 'form_submit', formData);

// Get component visibility
const visible = runtime.shouldShowComponent('my-button', conditions);

// Get computed styles
const styles = runtime.getComponentStyles('my-card', baseStyles, record);
```

## Testing

The Runtime Engine is designed for testability:

```typescript
import { RuntimeEngine, resetDataStore, resetStateManager, resetEventBus } from '@neo/runtime';

// Reset singletons between tests
beforeEach(() => {
  RuntimeEngine.resetAll();
});

test('should create record', async () => {
  const runtime = createRuntimeEngine({ app: mockApp });
  const record = await runtime.createRecord('tasks', { title: 'Test' });
  expect(record.title).toBe('Test');
});
```

## Performance Considerations

1. **Style Caching**: DynamicStyler caches computed styles
2. **Event Batching**: Events can be batched for efficiency
3. **Subscription Cleanup**: All subscriptions return unsubscribe functions
4. **Lazy Initialization**: Systems initialize on first use
5. **Condition Caching**: ConditionalRenderer caches expression results

## Future Enhancements

1. **Offline Support**: Add IndexedDB persistence to DataStore
2. **Undo/Redo**: Leverage history for undo/redo
3. **Real-time Sync**: WebSocket integration for live updates
4. **Plugin System**: Allow custom action handlers and components
5. **Analytics**: Built-in event tracking
6. **A/B Testing**: Conditional feature flags

## Summary

Phase 3 delivers a complete, production-ready Runtime Engine with:

- ✅ 8 core subsystems (Event, Data, State, Binding, Action, Conditional, Styling, Layout)
- ✅ 8 new UI components (Gallery, Chat, Map, Section, Row, Grid, Divider, Badge)
- ✅ Unified RuntimeEngine orchestrator
- ✅ Full TypeScript support
- ✅ Reactive data management
- ✅ Declarative conditional rendering
- ✅ Dynamic styling system
- ✅ Flexible layout management
- ✅ Comprehensive action handling
- ✅ Event-driven architecture

The Runtime Engine is now ready to power both the preview system and future production apps! 🎉
