/**
 * Permissions Schema
 * 
 * Defines the permission and access control system for Neo apps.
 * Supports role-based access control (RBAC) with fine-grained rules.
 */

import { z } from 'zod';

// ============================================================
// ROLES
// ============================================================

export const NeoRoleSchema = z.enum(['owner', 'admin', 'editor', 'viewer', 'public']);

export type NeoRole = z.infer<typeof NeoRoleSchema>;

/**
 * Role hierarchy (higher role has all permissions of lower roles)
 */
export const ROLE_HIERARCHY: Record<NeoRole, number> = {
  owner: 100,
  admin: 80,
  editor: 60,
  viewer: 40,
  public: 20,
};

/**
 * Check if role A has at least the permissions of role B
 */
export function hasRolePermission(roleA: NeoRole, roleB: NeoRole): boolean {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB];
}

// ============================================================
// ACCESS RULES
// ============================================================

export const NeoAccessRuleSchema = z.object({
  id: z.string(),
  type: z.enum(['page_access', 'field_access', 'row_access', 'action_access']),
  
  // Target identifiers
  pageId: z.string().optional(),
  entityId: z.string().optional(),
  fieldId: z.string().optional(),
  actionId: z.string().optional(),
  
  // Rule configuration
  roles: z.array(NeoRoleSchema), // Roles this rule applies to
  condition: z.string().optional(), // Expression string for dynamic conditions
  
  // Access permissions
  allow: z.object({
    read: z.boolean().optional().default(true),
    write: z.boolean().optional().default(false),
    delete: z.boolean().optional().default(false),
  }).optional().default({ read: true, write: false, delete: false }),
  
  // Metadata
  description: z.string().optional(),
  enabled: z.boolean().optional().default(true),
});

export type NeoAccessRule = z.infer<typeof NeoAccessRuleSchema>;

// ============================================================
// PERMISSIONS CONFIGURATION
// ============================================================

export const NeoPermissionsSchema = z.object({
  // Available roles for this app
  roles: z.array(NeoRoleSchema).default(['owner', 'admin', 'editor', 'viewer', 'public']),
  
  // Default role for unauthenticated users
  defaultRole: NeoRoleSchema.default('public'),
  
  // Access rules
  rules: z.array(NeoAccessRuleSchema).default([]),
  
  // Role assignments (user ID -> role mapping)
  // This is stored separately but referenced here
  // In practice, this would be in a database table
  roleAssignments: z.record(z.string(), z.object({
    userId: z.string(),
    role: NeoRoleSchema,
    appId: z.string(),
  })).optional(),
});

export type NeoPermissions = z.infer<typeof NeoPermissionsSchema>;

// ============================================================
// DEFAULT PERMISSIONS
// ============================================================

/**
 * Create default permissions configuration
 */
export function createDefaultPermissions(): NeoPermissions {
  return {
    roles: ['owner', 'admin', 'editor', 'viewer', 'public'],
    defaultRole: 'public',
    rules: [],
  };
}

/**
 * Create a page access rule
 */
export function createPageAccessRule(
  pageId: string,
  roles: NeoRole[],
  allow: { read?: boolean; write?: boolean; delete?: boolean } = { read: true }
): NeoAccessRule {
  return {
    id: `page-${pageId}-${Date.now()}`,
    type: 'page_access',
    pageId,
    roles,
    allow: {
      read: allow.read ?? true,
      write: allow.write ?? false,
      delete: allow.delete ?? false,
    },
    enabled: true,
  };
}

/**
 * Create a field access rule
 */
export function createFieldAccessRule(
  entityId: string,
  fieldId: string,
  roles: NeoRole[],
  allow: { read?: boolean; write?: boolean; delete?: boolean } = { read: true, write: false }
): NeoAccessRule {
  return {
    id: `field-${entityId}-${fieldId}-${Date.now()}`,
    type: 'field_access',
    entityId,
    fieldId,
    roles,
    allow: {
      read: allow.read ?? true,
      write: allow.write ?? false,
      delete: allow.delete ?? false,
    },
    enabled: true,
  };
}

/**
 * Create a row access rule
 */
export function createRowAccessRule(
  entityId: string,
  roles: NeoRole[],
  condition: string,
  allow: { read?: boolean; write?: boolean; delete?: boolean } = { read: true }
): NeoAccessRule {
  return {
    id: `row-${entityId}-${Date.now()}`,
    type: 'row_access',
    entityId,
    roles,
    condition,
    allow: {
      read: allow.read ?? true,
      write: allow.write ?? false,
      delete: allow.delete ?? false,
    },
    enabled: true,
  };
}

/**
 * Create an action access rule
 */
export function createActionAccessRule(
  actionId: string,
  roles: NeoRole[],
  allow: { execute?: boolean } = { execute: true }
): NeoAccessRule {
  return {
    id: `action-${actionId}-${Date.now()}`,
    type: 'action_access',
    actionId,
    roles,
    allow: {
      read: allow.execute ?? true,
      write: allow.execute ?? true,
      delete: false,
    },
    enabled: true,
  };
}
