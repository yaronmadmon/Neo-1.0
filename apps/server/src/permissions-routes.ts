/**
 * Permissions Routes
 * 
 * API routes for managing permissions and roles.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from './utils/logger.js';
import { getUserFromRequest, getUserRoleForApp } from './auth-routes.js';
import type { NeoRole, NeoAccessRule, NeoPermissions } from '@neo/blueprint-engine';

// In-memory store (replace with database in production)
const appPermissions = new Map<string, NeoPermissions>();
const userAppRoles = new Map<string, Map<string, NeoRole>>(); // userId -> appId -> role

/**
 * Register permissions routes
 */
export async function registerPermissionsRoutes(server: FastifyInstance): Promise<void> {
  /**
   * Get permissions for an app
   * GET /apps/:appId/permissions
   */
  server.get<{ Params: { appId: string } }>(
    '/apps/:appId/permissions',
    async (request, reply) => {
      try {
        const { appId } = request.params;
        
        // Get permissions from store
        const permissions = appPermissions.get(appId);
        
        if (!permissions) {
          // Return default permissions
          return reply.send({
            success: true,
            permissions: {
              roles: ['owner', 'admin', 'editor', 'viewer', 'public'],
              defaultRole: 'public',
              rules: [],
            },
          });
        }
        
        return reply.send({
          success: true,
          permissions,
        });
      } catch (error: any) {
        logger.error('Get permissions failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to get permissions',
          message: error.message,
        });
      }
    }
  );

  /**
   * Update permissions for an app
   * POST /apps/:appId/permissions
   */
  server.post<{ Params: { appId: string }; Body: { permissions: Partial<NeoPermissions> } }>(
    '/apps/:appId/permissions',
    async (request, reply) => {
      try {
        const { appId } = request.params;
        const { permissions: update } = request.body;
        
        // Get current permissions
        const current = appPermissions.get(appId) || {
          roles: ['owner', 'admin', 'editor', 'viewer', 'public'],
          defaultRole: 'public',
          rules: [],
        };
        
        // Merge updates
        const updated: NeoPermissions = {
          ...current,
          ...update,
          rules: update.rules || current.rules,
        };
        
        // Save
        appPermissions.set(appId, updated);
        
        logger.info('Permissions updated', { appId });
        
        return reply.send({
          success: true,
          permissions: updated,
        });
      } catch (error: any) {
        logger.error('Update permissions failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to update permissions',
          message: error.message,
        });
      }
    }
  );

  /**
   * Assign role to user for an app
   * POST /apps/:appId/users/:userId/role
   */
  server.post<{ Params: { appId: string; userId: string }; Body: { role: NeoRole } }>(
    '/apps/:appId/users/:userId/role',
    async (request, reply) => {
      try {
        const { appId, userId } = request.params;
        const { role } = request.body;
        
        // Validate role
        const validRoles: NeoRole[] = ['owner', 'admin', 'editor', 'viewer', 'public'];
        if (!validRoles.includes(role)) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid role',
            message: `Role must be one of: ${validRoles.join(', ')}`,
          });
        }
        
        // Get or create user roles map
        let userRoles = userAppRoles.get(userId);
        if (!userRoles) {
          userRoles = new Map();
          userAppRoles.set(userId, userRoles);
        }
        
        // Assign role
        userRoles.set(appId, role);
        
        logger.info('Role assigned', { userId, appId, role });
        
        return reply.send({
          success: true,
          userId,
          appId,
          role,
        });
      } catch (error: any) {
        logger.error('Assign role failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to assign role',
          message: error.message,
        });
      }
    }
  );

  /**
   * Get user role for an app
   * GET /apps/:appId/users/:userId/role
   */
  server.get<{ Params: { appId: string; userId: string } }>(
    '/apps/:appId/users/:userId/role',
    async (request, reply) => {
      try {
        const { appId, userId } = request.params;
        
        // Get user role
        const userRoles = userAppRoles.get(userId);
        const role = userRoles?.get(appId) || 'public';
        
        return reply.send({
          success: true,
          userId,
          appId,
          role,
        });
      } catch (error: any) {
        logger.error('Get user role failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to get user role',
          message: error.message,
        });
      }
    }
  );

  /**
   * Add access rule to app
   * POST /apps/:appId/permissions/rules
   */
  server.post<{ Params: { appId: string }; Body: { rule: NeoAccessRule } }>(
    '/apps/:appId/permissions/rules',
    async (request, reply) => {
      try {
        const { appId } = request.params;
        const { rule } = request.body;
        
        // Get current permissions
        const permissions = appPermissions.get(appId) || {
          roles: ['owner', 'admin', 'editor', 'viewer', 'public'],
          defaultRole: 'public',
          rules: [],
        };
        
        // Add rule
        permissions.rules = [...permissions.rules, rule];
        
        // Save
        appPermissions.set(appId, permissions);
        
        logger.info('Access rule added', { appId, ruleId: rule.id });
        
        return reply.send({
          success: true,
          rule,
        });
      } catch (error: any) {
        logger.error('Add access rule failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to add access rule',
          message: error.message,
        });
      }
    }
  );

  /**
   * Remove access rule from app
   * DELETE /apps/:appId/permissions/rules/:ruleId
   */
  server.delete<{ Params: { appId: string; ruleId: string } }>(
    '/apps/:appId/permissions/rules/:ruleId',
    async (request, reply) => {
      try {
        const { appId, ruleId } = request.params;
        
        // Get current permissions
        const permissions = appPermissions.get(appId);
        if (!permissions) {
          return reply.code(404).send({
            success: false,
            error: 'Permissions not found',
          });
        }
        
        // Remove rule
        permissions.rules = permissions.rules.filter(r => r.id !== ruleId);
        
        // Save
        appPermissions.set(appId, permissions);
        
        logger.info('Access rule removed', { appId, ruleId });
        
        return reply.send({
          success: true,
          ruleId,
        });
      } catch (error: any) {
        logger.error('Remove access rule failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to remove access rule',
          message: error.message,
        });
      }
    }
  );
}
