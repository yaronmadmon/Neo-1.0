# Migration System Architecture Design

## Overview

This document outlines the architecture for implementing atomic, data-preserving modifications to apps in Neo-1.0.

## Problem Statement

**Current State**: `/apps/:id/modify` only updates timestamps - doesn't actually modify the app.

**Risk**: If we regenerate the whole app, we wipe user data.

**Solution**: Generate and apply atomic migrations (diffs) that preserve data while modifying schema.

## Core Concepts

### 1. Migration Types

```typescript
enum MigrationType {
  // Data Model Migrations
  ADD_FIELD = 'ADD_FIELD',
  REMOVE_FIELD = 'REMOVE_FIELD',
  UPDATE_FIELD_TYPE = 'UPDATE_FIELD_TYPE',
  UPDATE_FIELD_PROPERTIES = 'UPDATE_FIELD_PROPERTIES',
  RENAME_FIELD = 'RENAME_FIELD',
  
  // Component Migrations
  ADD_COMPONENT = 'ADD_COMPONENT',
  REMOVE_COMPONENT = 'REMOVE_COMPONENT',
  UPDATE_COMPONENT_PROP = 'UPDATE_COMPONENT_PROP',
  UPDATE_COMPONENT_STYLE = 'UPDATE_COMPONENT_STYLE',
  MOVE_COMPONENT = 'MOVE_COMPONENT',
  
  // Page Migrations
  ADD_PAGE = 'ADD_PAGE',
  REMOVE_PAGE = 'REMOVE_PAGE',
  UPDATE_PAGE_ROUTE = 'UPDATE_PAGE_ROUTE',
  UPDATE_PAGE_LAYOUT = 'UPDATE_PAGE_LAYOUT',
  
  // Theme Migrations
  UPDATE_THEME_COLOR = 'UPDATE_THEME_COLOR',
  UPDATE_THEME_TYPOGRAPHY = 'UPDATE_THEME_TYPOGRAPHY',
  UPDATE_THEME_SPACING = 'UPDATE_THEME_SPACING',
  
  // Data Migrations
  TRANSFORM_DATA = 'TRANSFORM_DATA',
}
```

### 2. Migration Interface

```typescript
interface Migration {
  id: string;
  type: MigrationType;
  timestamp: Date;
  target: MigrationTarget;
  params: Record<string, unknown>;
  rollback?: RollbackParams;
}

interface MigrationTarget {
  modelId?: string;
  fieldId?: string;
  pageId?: string;
  componentId?: string;
  themeProperty?: string;
  dataModelId?: string;
  dataRecordIds?: string[];
}
```

### 3. Migration Plan

```typescript
interface MigrationPlan {
  id: string;
  description: string;
  migrations: Migration[];
  estimatedRisk: 'low' | 'medium' | 'high';
  dataPreservation: boolean;
  validationChecks: ValidationCheck[];
}
```

## Implementation Strategy

### Phase 1: Field-Level Migrations (CRITICAL)
- ADD_FIELD - Add new field to data model
- REMOVE_FIELD - Remove field (with data backup)
- UPDATE_FIELD_TYPE - Change field type (with data transformation)
- UPDATE_FIELD_PROPERTIES - Update required, unique, default, validation rules

### Phase 2: Component Migrations
- UPDATE_COMPONENT_PROP - Change component property
- UPDATE_COMPONENT_STYLE - Update styles ("Make header blue")
- ADD_COMPONENT - Add new component to page
- REMOVE_COMPONENT - Remove component from page

### Phase 3: Migration Planning
- AI-assisted migration generation
- Risk assessment
- Data preservation analysis
- Validation checks

## Key Architecture Components

1. **FieldMigrationEngine** - Handles field-level migrations
2. **ComponentMigrationEngine** - Handles component migrations
3. **DataTransformer** - Transforms data during type changes
4. **MigrationPlanner** - Generates migration plans from user intent
5. **MigrationApplier** - Applies migrations atomically

## Data Preservation Strategy

- Always backup data before destructive operations
- Transform data during type changes (string → number, etc.)
- Warn users about potential data loss
- Validate migrations before applying
- Rollback on failure

## Implementation Roadmap

### Week 1-2: Foundation
- Create migration type system
- Implement field migrations (ADD_FIELD, REMOVE_FIELD, UPDATE_FIELD_TYPE)
- Implement data transformer
- Update `/apps/:id/modify` endpoint

### Week 3: Component Migrations
- Implement component migrations
- Test UI modifications ("Make header blue")

### Week 4: Integration & Testing
- Integrate with intent processor
- Add validation and risk assessment
- End-to-end testing
