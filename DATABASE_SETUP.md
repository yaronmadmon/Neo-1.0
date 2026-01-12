# Phase 5: Database System Setup

This guide explains how to configure Neo's real database backend.

## Overview

Neo now supports real PostgreSQL-compatible databases:
- **PostgreSQL** (local or hosted)
- **Supabase** (managed Postgres)
- **Neon** (serverless Postgres)

## Quick Setup

### 1. Set Environment Variables

Add to your `apps/server/.env` file:

```bash
# Option 1: Connection String (recommended)
DATABASE_URL=postgresql://user:password@localhost:5432/neo

# Option 2: Separate params
NEO_DB_HOST=localhost
NEO_DB_PORT=5432
NEO_DB_NAME=neo
NEO_DB_USER=postgres
NEO_DB_PASSWORD=your_password

# Provider type (postgres, supabase, neon)
NEO_DB_PROVIDER=postgres
```

### 2. Build the Database Package

```bash
npm run build
```

### 3. Start the Server

```bash
npm run dev
```

## Provider Setup

### PostgreSQL (Local)

1. Install PostgreSQL:
   - Windows: [Download](https://www.postgresql.org/download/windows/)
   - Mac: `brew install postgresql`
   - Linux: `sudo apt install postgresql`

2. Create database:
   ```bash
   createdb neo
   ```

3. Set connection string:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/neo
   ```

### Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings > Database**
3. Copy the connection string (use "Transaction" mode for best performance)
4. Set:
   ```
   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-region.pooler.supabase.com:6543/postgres
   NEO_DB_PROVIDER=supabase
   ```

### Neon

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string from dashboard
3. Set:
   ```
   DATABASE_URL=postgres://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   NEO_DB_PROVIDER=neon
   ```

## API Endpoints

### Schema Management

```
POST /db/apps/:appId/sync
```
Synchronize entity definitions with database tables.

### CRUD Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/db/apps/:appId/entities/:entityId/records` | Create record |
| `POST` | `/db/apps/:appId/entities/:entityId/records/bulk` | Create multiple |
| `GET` | `/db/apps/:appId/entities/:entityId/records` | List records |
| `GET` | `/db/apps/:appId/entities/:entityId/records/:id` | Get by ID |
| `PUT` | `/db/apps/:appId/entities/:entityId/records/:id` | Update record |
| `DELETE` | `/db/apps/:appId/entities/:entityId/records/:id` | Delete record |

### Query Parameters

```
GET /db/apps/:appId/entities/:entityId/records?
    page=1&
    limit=50&
    sort=createdAt&
    sortDir=desc&
    filter=[{"field":"status","operator":"eq","value":"active"}]&
    include=project,assignee&
    select=id,name,status
```

### Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `{"field":"status","operator":"eq","value":"active"}` |
| `neq` | Not equals | `{"field":"status","operator":"neq","value":"deleted"}` |
| `gt` | Greater than | `{"field":"amount","operator":"gt","value":100}` |
| `gte` | Greater or equal | `{"field":"age","operator":"gte","value":18}` |
| `lt` | Less than | `{"field":"priority","operator":"lt","value":5}` |
| `lte` | Less or equal | `{"field":"stock","operator":"lte","value":10}` |
| `in` | In array | `{"field":"status","operator":"in","value":["active","pending"]}` |
| `contains` | Contains text | `{"field":"name","operator":"contains","value":"john"}` |
| `startsWith` | Starts with | `{"field":"email","operator":"startsWith","value":"admin"}` |
| `isNull` | Is null | `{"field":"deletedAt","operator":"isNull"}` |
| `between` | Between range | `{"field":"date","operator":"between","value":["2024-01-01","2024-12-31"]}` |

### Relations

```
# Get related records
GET /db/apps/:appId/entities/:entityId/records/:id/relations/:relationName

# Create relation (many-to-many)
POST /db/apps/:appId/entities/:entityId/records/:id/relations/:relationName
Body: { "targetId": "..." }

# Remove relation
DELETE /db/apps/:appId/entities/:entityId/records/:id/relations/:relationName/:targetId
```

### Status

```
GET /db/status
```
Returns database connection status.

## Features

### ✅ Implemented

- **Connection Pooling** - Efficient connection management
- **Entity → SQL Compiler** - Auto-generates tables from entity definitions
- **CRUD Operations** - Create, Read, Update, Delete
- **Server-side Validation** - Validates data against entity schemas
- **Relation Resolver** - Handles references and relationships
- **Query Builder** - Filters, sorting, pagination
- **Computed Fields** - Runtime calculated fields
- **Soft Delete** - Optional `deletedAt` timestamp
- **Transactions** - Atomic operations
- **Schema Migrations** - Track and apply schema changes

### Field Type Mappings

| Neo Type | SQL Type |
|----------|----------|
| `string`, `text` | `TEXT` |
| `number` | `INTEGER` |
| `currency`, `decimal` | `DECIMAL` |
| `boolean` | `BOOLEAN` |
| `date` | `DATE` |
| `datetime` | `TIMESTAMPTZ` |
| `email`, `phone`, `url` | `VARCHAR` |
| `reference` | `UUID` (FK) |
| `enum` | `VARCHAR` + CHECK |
| `json`, `address` | `JSONB` |

### Computed Fields

Define computed fields in entity schema:

```json
{
  "name": "fullName",
  "type": "string",
  "computed": {
    "expression": "CONCAT(firstName, ' ', lastName)",
    "dependencies": ["firstName", "lastName"]
  }
}
```

Supported functions:
- **String**: `CONCAT`, `UPPER`, `LOWER`, `TRIM`, `LENGTH`, `SUBSTRING`
- **Math**: `ABS`, `ROUND`, `FLOOR`, `CEIL`, `MIN`, `MAX`, `SUM`, `AVG`
- **Date**: `NOW`, `TODAY`, `YEAR`, `MONTH`, `DAY`, `DAYS_BETWEEN`, `DATE_ADD`
- **Logic**: `IF`, `COALESCE`, `ISNULL`, `ISEMPTY`
- **Array**: `COUNT`, `FIRST`, `LAST`, `CONTAINS`, `JOIN`, `FILTER`, `MAP`

## Architecture

```
packages/core/database/
├── src/
│   ├── index.ts           # Main exports & DatabaseService
│   ├── types.ts           # TypeScript types
│   ├── connection.ts      # Connection pooling
│   ├── sql-compiler.ts    # Entity → SQL compiler
│   ├── query-builder.ts   # Query construction
│   ├── validation.ts      # Server-side validation
│   ├── crud-service.ts    # CRUD operations
│   ├── relation-resolver.ts # Relationship handling
│   ├── computed-fields.ts # Expression evaluation
│   └── schema-manager.ts  # Migration management
```

## Usage Example

```typescript
import { DatabaseService, createDatabaseService } from '@neo/database';

// Initialize
const db = createDatabaseService({
  provider: 'postgres',
  connectionString: process.env.DATABASE_URL,
});

await db.initialize();

// Register entities
db.registerEntities(appBlueprint.entities);

// Sync schema (creates tables)
await db.syncSchema(appBlueprint.entities);

// CRUD operations
const task = await db.create('tasks', {
  title: 'My Task',
  status: 'pending',
});

const tasks = await db.findMany('tasks', {
  filters: [{ field: 'status', operator: 'eq', value: 'pending' }],
  sorts: [{ field: 'createdAt', direction: 'desc' }],
  pagination: { offset: 0, limit: 10 },
  include: [{ relation: 'assignee' }],
});

await db.update('tasks', task.data.id, { status: 'completed' });

await db.delete('tasks', task.data.id);
```

## Fallback Mode

If no database is configured, the server falls back to in-memory storage (existing behavior). This allows Neo apps to work without a database for development and demos.
