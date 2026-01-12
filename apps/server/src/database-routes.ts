/**
 * Database API Routes
 * RESTful endpoints for entity CRUD operations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from './utils/logger.js';

// Import types - actual database service will be lazily loaded
let DatabaseService: typeof import('@neo/database').DatabaseService | null = null;
let dbService: InstanceType<typeof import('@neo/database').DatabaseService> | null = null;

/**
 * Initialize database service
 */
async function getDbService(): Promise<InstanceType<typeof import('@neo/database').DatabaseService>> {
  if (dbService) return dbService;
  
  try {
    const dbModule = await import('@neo/database');
    DatabaseService = dbModule.DatabaseService;
    dbService = new DatabaseService();
    
    // Check if database connection is configured
    const hasDbConfig = process.env.DATABASE_URL || process.env.NEO_DB_URL || process.env.NEO_DB_HOST;
    if (hasDbConfig) {
      await dbService.initialize();
      logger.info('Database service initialized');
    } else {
      logger.warn('No database configuration found. Database routes will return errors.');
    }
    
    return dbService;
  } catch (error: any) {
    logger.error('Failed to load database module', error);
    throw new Error('Database module not available. Run: npm run build');
  }
}

/**
 * Check if database is available
 */
async function checkDbAvailable(reply: FastifyReply): Promise<boolean> {
  const hasDbConfig = process.env.DATABASE_URL || process.env.NEO_DB_URL || process.env.NEO_DB_HOST;
  if (!hasDbConfig) {
    reply.code(503).send({
      success: false,
      error: 'Database not configured',
      message: 'Set DATABASE_URL or NEO_DB_* environment variables to enable database features',
    });
    return false;
  }
  return true;
}

/**
 * Register database routes
 */
export async function registerDatabaseRoutes(server: FastifyInstance): Promise<void> {
  // ============================================================
  // SCHEMA MANAGEMENT
  // ============================================================

  /**
   * Sync schema for an app
   * POST /db/apps/:appId/sync
   */
  server.post<{ Params: { appId: string }; Body: { entities: unknown[] } }>(
    '/db/apps/:appId/sync',
    async (request, reply) => {
      if (!(await checkDbAvailable(reply))) return;

      try {
        const { appId } = request.params;
        const { entities } = request.body;

        const db = await getDbService();
        db.registerEntities(entities as any);
        const result = await db.syncSchema(entities as any);

        logger.info('Schema synced', { appId, ...result });

        return reply.send({
          success: true,
          ...result,
        });
      } catch (error: any) {
        logger.error('Schema sync failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Schema sync failed',
          message: error.message,
        });
      }
    }
  );

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================

  /**
   * Create a record
   * POST /db/apps/:appId/entities/:entityId/records
   */
  server.post<{
    Params: { appId: string; entityId: string };
    Body: Record<string, unknown>;
  }>(
    '/db/apps/:appId/entities/:entityId/records',
    async (request, reply) => {
      if (!(await checkDbAvailable(reply))) return;

      try {
        const { appId, entityId } = request.params;
        const data = request.body;

        const db = await getDbService();
        const result = await db.create(entityId, data);

        logger.info('Record created', { appId, entityId, recordId: (result.data as any)?.id });

        return reply.code(201).send({
          success: true,
          record: result.data,
        });
      } catch (error: any) {
        logger.error('Create record failed', error);
        
        // Handle validation errors specially
        if (error.name === 'ValidationError') {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            validation: error.validation,
          });
        }

        return reply.code(500).send({
          success: false,
          error: 'Create failed',
          message: error.message,
        });
      }
    }
  );

  /**
   * Create multiple records
   * POST /db/apps/:appId/entities/:entityId/records/bulk
   */
  server.post<{
    Params: { appId: string; entityId: string };
    Body: { records: Record<string, unknown>[] };
  }>(
    '/db/apps/:appId/entities/:entityId/records/bulk',
    async (request, reply) => {
      if (!(await checkDbAvailable(reply))) return;

      try {
        const { appId, entityId } = request.params;
        const { records } = request.body;

        const db = await getDbService();
        const result = await db.createMany(entityId, records);

        logger.info('Bulk create completed', { appId, entityId, inserted: result.inserted });

        return reply.code(201).send({
          success: result.success,
          records: result.data,
          inserted: result.inserted,
          errors: result.errors,
        });
      } catch (error: any) {
        logger.error('Bulk create failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Bulk create failed',
          message: error.message,
        });
      }
    }
  );

  /**
   * Get records (list with filters, sorting, pagination)
   * GET /db/apps/:appId/entities/:entityId/records
   */
  server.get<{
    Params: { appId: string; entityId: string };
    Querystring: {
      page?: string;
      limit?: string;
      sort?: string;
      sortDir?: string;
      filter?: string;
      include?: string;
      select?: string;
    };
  }>(
    '/db/apps/:appId/entities/:entityId/records',
    async (request, reply) => {
      if (!(await checkDbAvailable(reply))) return;

      try {
        const { appId, entityId } = request.params;
        const { page, limit, sort, sortDir, filter, include, select } = request.query;

        // Parse query options
        const pageNum = parseInt(page || '1', 10);
        const limitNum = Math.min(parseInt(limit || '50', 10), 100);
        const offset = (pageNum - 1) * limitNum;

        // Parse filters (JSON string or key=value pairs)
        let filters: any[] | undefined;
        if (filter) {
          try {
            const parsed = JSON.parse(filter);
            filters = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            // Try parsing as key=value
            const parts = filter.split(',');
            filters = parts.map(part => {
              const [field, value] = part.split('=');
              return { field, operator: 'eq', value };
            });
          }
        }

        // Parse includes
        const includes = include ? include.split(',').map(r => ({ relation: r.trim() })) : undefined;

        // Parse select
        const selectFields = select ? select.split(',').map(s => s.trim()) : undefined;

        const db = await getDbService();
        const result = await db.findMany(entityId, {
          filters,
          sorts: sort ? [{ field: sort, direction: (sortDir as 'asc' | 'desc') || 'asc' }] : undefined,
          pagination: { offset, limit: limitNum },
          include: includes,
          select: selectFields,
        });

        return reply.send({
          success: true,
          records: result.data,
          pagination: {
            page: pageNum,
            limit: limitNum,
            count: result.count,
            totalCount: result.totalCount,
            hasMore: result.hasMore,
          },
        });
      } catch (error: any) {
        logger.error('List records failed', error);
        return reply.code(500).send({
          success: false,
          error: 'List failed',
          message: error.message,
        });
      }
    }
  );

  /**
   * Get a single record by ID
   * GET /db/apps/:appId/entities/:entityId/records/:recordId
   */
  server.get<{
    Params: { appId: string; entityId: string; recordId: string };
    Querystring: { include?: string };
  }>(
    '/db/apps/:appId/entities/:entityId/records/:recordId',
    async (request, reply) => {
      if (!(await checkDbAvailable(reply))) return;

      try {
        const { appId, entityId, recordId } = request.params;
        const { include } = request.query;

        const includes = include ? include.split(',').map(r => ({ relation: r.trim() })) : undefined;

        const db = await getDbService();
        const result = await db.findById(entityId, recordId, { include: includes });

        if (!result.found) {
          return reply.code(404).send({
            success: false,
            error: 'Not found',
            message: `Record ${recordId} not found`,
          });
        }

        return reply.send({
          success: true,
          record: result.data,
        });
      } catch (error: any) {
        logger.error('Get record failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Get failed',
          message: error.message,
        });
      }
    }
  );

  /**
   * Update a record
   * PUT /db/apps/:appId/entities/:entityId/records/:recordId
   */
  server.put<{
    Params: { appId: string; entityId: string; recordId: string };
    Body: Record<string, unknown>;
  }>(
    '/db/apps/:appId/entities/:entityId/records/:recordId',
    async (request, reply) => {
      if (!(await checkDbAvailable(reply))) return;

      try {
        const { appId, entityId, recordId } = request.params;
        const data = request.body;

        const db = await getDbService();
        const result = await db.update(entityId, recordId, data);

        logger.info('Record updated', { appId, entityId, recordId });

        return reply.send({
          success: true,
          record: result.data,
        });
      } catch (error: any) {
        logger.error('Update record failed', error);
        
        if (error.name === 'ValidationError') {
          return reply.code(400).send({
            success: false,
            error: 'Validation failed',
            validation: error.validation,
          });
        }

        if (error.message.includes('not found')) {
          return reply.code(404).send({
            success: false,
            error: 'Not found',
            message: error.message,
          });
        }

        return reply.code(500).send({
          success: false,
          error: 'Update failed',
          message: error.message,
        });
      }
    }
  );

  /**
   * Patch (partial update) a record
   * PATCH /db/apps/:appId/entities/:entityId/records/:recordId
   */
  server.patch<{
    Params: { appId: string; entityId: string; recordId: string };
    Body: Record<string, unknown>;
  }>(
    '/db/apps/:appId/entities/:entityId/records/:recordId',
    async (request, reply) => {
      // Same as PUT for now
      return server.inject({
        method: 'PUT',
        url: request.url,
        payload: request.body,
      });
    }
  );

  /**
   * Delete a record
   * DELETE /db/apps/:appId/entities/:entityId/records/:recordId
   */
  server.delete<{
    Params: { appId: string; entityId: string; recordId: string };
  }>(
    '/db/apps/:appId/entities/:entityId/records/:recordId',
    async (request, reply) => {
      if (!(await checkDbAvailable(reply))) return;

      try {
        const { appId, entityId, recordId } = request.params;

        const db = await getDbService();
        const result = await db.delete(entityId, recordId);

        logger.info('Record deleted', { appId, entityId, recordId });

        return reply.send({
          success: true,
          deletedId: result.deletedId,
        });
      } catch (error: any) {
        logger.error('Delete record failed', error);
        
        if (error.message.includes('not found')) {
          return reply.code(404).send({
            success: false,
            error: 'Not found',
            message: error.message,
          });
        }

        return reply.code(500).send({
          success: false,
          error: 'Delete failed',
          message: error.message,
        });
      }
    }
  );

  /**
   * Bulk delete records
   * POST /db/apps/:appId/entities/:entityId/records/delete
   */
  server.post<{
    Params: { appId: string; entityId: string };
    Body: { filters: unknown[] };
  }>(
    '/db/apps/:appId/entities/:entityId/records/delete',
    async (request, reply) => {
      if (!(await checkDbAvailable(reply))) return;

      try {
        const { appId, entityId } = request.params;
        const { filters } = request.body;

        if (!filters || filters.length === 0) {
          return reply.code(400).send({
            success: false,
            error: 'Bad request',
            message: 'Filters are required for bulk delete',
          });
        }

        const db = await getDbService();
        const result = await db.deleteMany(entityId, filters as any);

        logger.info('Bulk delete completed', { appId, entityId, deletedCount: result.deletedCount });

        return reply.send({
          success: true,
          deletedCount: result.deletedCount,
        });
      } catch (error: any) {
        logger.error('Bulk delete failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Bulk delete failed',
          message: error.message,
        });
      }
    }
  );

  // ============================================================
  // RELATION OPERATIONS
  // ============================================================

  /**
   * Get related records
   * GET /db/apps/:appId/entities/:entityId/records/:recordId/relations/:relationName
   */
  server.get<{
    Params: { appId: string; entityId: string; recordId: string; relationName: string };
  }>(
    '/db/apps/:appId/entities/:entityId/records/:recordId/relations/:relationName',
    async (request, reply) => {
      if (!(await checkDbAvailable(reply))) return;

      try {
        const { appId, entityId, recordId, relationName } = request.params;

        const db = await getDbService();
        const records = await db.getRelated(entityId, recordId, relationName);

        return reply.send({
          success: true,
          records,
        });
      } catch (error: any) {
        logger.error('Get relations failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Get relations failed',
          message: error.message,
        });
      }
    }
  );

  /**
   * Create a relation
   * POST /db/apps/:appId/entities/:entityId/records/:recordId/relations/:relationName
   */
  server.post<{
    Params: { appId: string; entityId: string; recordId: string; relationName: string };
    Body: { targetId: string };
  }>(
    '/db/apps/:appId/entities/:entityId/records/:recordId/relations/:relationName',
    async (request, reply) => {
      if (!(await checkDbAvailable(reply))) return;

      try {
        const { appId, entityId, recordId, relationName } = request.params;
        const { targetId } = request.body;

        const db = await getDbService();
        await db.createRelation(entityId, recordId, relationName, targetId);

        logger.info('Relation created', { appId, entityId, recordId, relationName, targetId });

        return reply.code(201).send({
          success: true,
        });
      } catch (error: any) {
        logger.error('Create relation failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Create relation failed',
          message: error.message,
        });
      }
    }
  );

  /**
   * Remove a relation
   * DELETE /db/apps/:appId/entities/:entityId/records/:recordId/relations/:relationName/:targetId
   */
  server.delete<{
    Params: { appId: string; entityId: string; recordId: string; relationName: string; targetId: string };
  }>(
    '/db/apps/:appId/entities/:entityId/records/:recordId/relations/:relationName/:targetId',
    async (request, reply) => {
      if (!(await checkDbAvailable(reply))) return;

      try {
        const { appId, entityId, recordId, relationName, targetId } = request.params;

        const db = await getDbService();
        await db.removeRelation(entityId, recordId, relationName, targetId);

        logger.info('Relation removed', { appId, entityId, recordId, relationName, targetId });

        return reply.send({
          success: true,
        });
      } catch (error: any) {
        logger.error('Remove relation failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Remove relation failed',
          message: error.message,
        });
      }
    }
  );

  // ============================================================
  // AGGREGATE OPERATIONS
  // ============================================================

  /**
   * Count records
   * GET /db/apps/:appId/entities/:entityId/count
   */
  server.get<{
    Params: { appId: string; entityId: string };
    Querystring: { filter?: string };
  }>(
    '/db/apps/:appId/entities/:entityId/count',
    async (request, reply) => {
      if (!(await checkDbAvailable(reply))) return;

      try {
        const { appId, entityId } = request.params;
        const { filter } = request.query;

        let filters: any[] | undefined;
        if (filter) {
          try {
            const parsed = JSON.parse(filter);
            filters = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            // Ignore parse errors
          }
        }

        const db = await getDbService();
        const count = await db.count(entityId, { filters });

        return reply.send({
          success: true,
          count,
        });
      } catch (error: any) {
        logger.error('Count failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Count failed',
          message: error.message,
        });
      }
    }
  );

  /**
   * Check if record exists
   * HEAD /db/apps/:appId/entities/:entityId/records/:recordId
   */
  server.head<{
    Params: { appId: string; entityId: string; recordId: string };
  }>(
    '/db/apps/:appId/entities/:entityId/records/:recordId',
    async (request, reply) => {
      if (!(await checkDbAvailable(reply))) return;

      try {
        const { entityId, recordId } = request.params;

        const db = await getDbService();
        const exists = await db.exists(entityId, recordId);

        return reply.code(exists ? 200 : 404).send();
      } catch (error: any) {
        return reply.code(500).send();
      }
    }
  );

  // ============================================================
  // DATABASE STATUS
  // ============================================================

  /**
   * Get database status
   * GET /db/status
   */
  server.get('/db/status', async (request, reply) => {
    const hasDbConfig = process.env.DATABASE_URL || process.env.NEO_DB_URL || process.env.NEO_DB_HOST;
    
    if (!hasDbConfig) {
      return reply.send({
        success: true,
        configured: false,
        message: 'Database not configured',
      });
    }

    try {
      const db = await getDbService();
      const status = db.getStatus();

      return reply.send({
        success: true,
        configured: true,
        ...status,
      });
    } catch (error: any) {
      return reply.send({
        success: true,
        configured: true,
        connected: false,
        error: error.message,
      });
    }
  });

  logger.info('Database routes registered');
}
