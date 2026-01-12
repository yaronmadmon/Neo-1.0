# CRUD-Only Flow System Design

## Overview

This document outlines the strategy for keeping flows simple and CRUD-focused, avoiding complex JSON-based logic systems.

## Philosophy

**Core Principle**: Keep flows simple, extensible, and maintainable.

**Strategy**: 
1. Support only CRUD operations (for now)
2. Keep JSON schema simple and readable
3. Defer complex logic to future phases (code snippets, integrations, etc.)

## Current State

- `executeFlow` is a placeholder
- FlowSchema uses generic `z.record(z.unknown())`
- No actual flow logic implemented

## Simplified Flow Schema

```typescript
enum FlowTriggerType {
  BUTTON_CLICK = 'button_click',
  FORM_SUBMIT = 'form_submit',
  DATA_CREATE = 'data_create',
  DATA_UPDATE = 'data_update',
  DATA_DELETE = 'data_delete',
}

enum FlowActionType {
  CREATE_RECORD = 'create_record',
  UPDATE_RECORD = 'update_record',
  DELETE_RECORD = 'delete_record',
  NAVIGATE = 'navigate',
  SHOW_NOTIFICATION = 'show_notification',
  REFRESH_DATA = 'refresh_data',
}

export const FlowTriggerSchema = z.object({
  type: z.nativeEnum(FlowTriggerType),
  componentId: z.string().optional(),
  modelId: z.string().optional(),
  event: z.string().optional(),
});

export const FlowActionSchema = z.object({
  type: z.nativeEnum(FlowActionType),
  modelId: z.string().optional(),
  recordId: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  targetPageId: z.string().optional(),
  message: z.string().optional(),
});

export const FlowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  trigger: FlowTriggerSchema,
  actions: z.array(FlowActionSchema).min(1).max(10),
  enabled: z.boolean().default(true),
});
```

## CRUDFlowEngine Implementation

- Execute actions in sequence
- Support: CREATE_RECORD, UPDATE_RECORD, DELETE_RECORD, NAVIGATE
- Extract form data from triggers
- Handle errors gracefully
- Limit complexity (max 10 actions per flow)

## What We're NOT Doing (Yet)

**Complex Logic**: NOT encoding conditional logic, loops, or complex operations in JSON.

**Why Not?**
- JSON schema becomes unwieldy
- Hard to validate and debug
- Hard to migrate
- Users will ask for more complexity

**Better Approach (Future)**:
- Code snippets for custom logic
- External integrations (webhooks)
- Visual flow builder (much later)

## Example Flow

```json
{
  "id": "create-task-flow",
  "name": "Create Task",
  "trigger": {
    "type": "form_submit",
    "componentId": "task-form"
  },
  "actions": [
    {
      "type": "create_record",
      "modelId": "tasks",
      "data": {
        "status": "pending"
      }
    },
    {
      "type": "show_notification",
      "message": "Task created successfully"
    },
    {
      "type": "navigate",
      "targetPageId": "tasks-list"
    }
  ]
}
```

## Benefits

✅ **Simple**: Easy to understand and implement
✅ **Type-Safe**: Zod schemas provide validation
✅ **Extensible**: Can add new action types incrementally
✅ **Maintainable**: Clear structure, easy to debug
✅ **Migration-Friendly**: Simple schema = easy migrations
✅ **80/20 Rule**: Covers 80% of use cases with 20% complexity
