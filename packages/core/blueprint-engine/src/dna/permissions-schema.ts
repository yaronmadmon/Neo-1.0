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

// Base roles for general apps
export const NeoRoleSchema = z.enum([
  'owner', 'admin', 'editor', 'viewer', 'public',
  // Medical/healthcare specific roles
  'provider', 'doctor', 'therapist', 'nurse',
  // Staff/Operator roles - internal users with location-based access
  'staff', 'operator', 'agent',
  // Customer/tenant/patient roles
  'customer', 'tenant', 'member', 'patient', 'guest'
]);

export type NeoRole = z.infer<typeof NeoRoleSchema>;

/**
 * Role hierarchy (higher role has all permissions of lower roles)
 * Note: Some roles are equal-level but have different access patterns
 * (e.g., provider vs admin - both high level, but different data access)
 */
export const ROLE_HIERARCHY: Record<NeoRole, number> = {
  owner: 100,
  admin: 90,
  // Medical staff - same tier as admin but different access patterns
  provider: 85,
  doctor: 85,
  therapist: 85,
  nurse: 75,
  // Staff/Operator - internal but location-restricted
  staff: 70,
  operator: 70,
  agent: 70,
  // Editor/viewer
  editor: 60,
  viewer: 40,
  // End-user roles
  customer: 30,
  tenant: 30,
  member: 30,
  patient: 30,
  guest: 25,
  public: 20,
};

/**
 * Check if role A has at least the permissions of role B
 * Note: This is a simplified hierarchy check. For complex permission
 * scenarios (like medical apps), use specific permission rules instead.
 */
export function hasRolePermission(roleA: NeoRole, roleB: NeoRole): boolean {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB];
}

/**
 * Medical/healthcare specific permission utilities
 */
export interface MedicalPermissionContext {
  userId: string;
  role: NeoRole;
  providerId?: string;      // If user is a provider
  patientId?: string;       // If user is a patient
  assignedPatients?: string[]; // For providers: list of assigned patient IDs
}

/**
 * Check if a provider can access a specific patient's data
 */
export function canProviderAccessPatient(
  context: MedicalPermissionContext,
  patientId: string
): boolean {
  // Admins/owners can access all patients
  if (context.role === 'owner' || context.role === 'admin') {
    return true;
  }
  
  // Providers can only access assigned patients
  if (['provider', 'doctor', 'therapist', 'nurse'].includes(context.role)) {
    return context.assignedPatients?.includes(patientId) ?? false;
  }
  
  // Patients can only access their own data
  if (context.role === 'patient') {
    return context.patientId === patientId;
  }
  
  return false;
}

/**
 * Check if data is approved for patient viewing
 */
export function isApprovedForPatient(
  record: { approvedForPatient?: boolean; status?: string },
  role: NeoRole
): boolean {
  // Admins and providers see everything
  if (['owner', 'admin', 'provider', 'doctor', 'therapist', 'nurse'].includes(role)) {
    return true;
  }
  
  // Patients only see approved records
  if (role === 'patient') {
    return record.approvedForPatient === true || record.status === 'approved';
  }
  
  return false;
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

// ============================================================
// STAFF/OPERATOR PORTAL PERMISSIONS
// ============================================================

/**
 * Staff/Operator permission context for location-based access
 */
export interface StaffPermissionContext {
  userId: string;
  role: NeoRole;
  locationId?: string;        // Assigned location ID
  assignedLocations?: string[]; // Multiple location assignments
}

/**
 * Check if staff can access a specific location's data
 */
export function canStaffAccessLocation(
  context: StaffPermissionContext,
  locationId: string
): boolean {
  // Admins/owners can access all locations
  if (context.role === 'owner' || context.role === 'admin') {
    return true;
  }
  
  // Staff/operators can only access assigned locations
  if (['staff', 'operator', 'agent'].includes(context.role)) {
    if (context.locationId === locationId) {
      return true;
    }
    return context.assignedLocations?.includes(locationId) ?? false;
  }
  
  return false;
}

/**
 * Generate default permissions for staff/operator portals
 * Used for multi-location businesses (franchises, mail centers, service centers, etc.)
 */
export function generateStaffPortalPermissions(config: {
  locationEntity: string;      // Entity that represents locations (e.g., 'location', 'branch', 'center')
  itemEntity: string;          // Entity for items staff process (e.g., 'mailItem', 'order', 'ticket')
  customerEntity: string;      // Entity for customers (e.g., 'customer', 'mailboxHolder', 'client')
  locationForeignKey?: string; // FK field linking items to locations (default: `${locationEntity}Id`)
}): NeoAccessRule[] {
  const {
    locationEntity,
    itemEntity,
    customerEntity,
    locationForeignKey = `${locationEntity}Id`
  } = config;
  
  const rules: NeoAccessRule[] = [];
  
  // Staff can only read their assigned location
  rules.push(createRowAccessRule(
    locationEntity,
    ['staff', 'operator', 'agent'],
    `record.id == user.locationId || user.assignedLocations.includes(record.id)`,
    { read: true, write: false, delete: false }
  ));
  
  // Staff can read/write items at their location
  rules.push(createRowAccessRule(
    itemEntity,
    ['staff', 'operator', 'agent'],
    `record.${locationForeignKey} == user.locationId || user.assignedLocations.includes(record.${locationForeignKey})`,
    { read: true, write: true, delete: false }
  ));
  
  // Staff can view basic customer info (for fulfillment) but not billing
  rules.push(createRowAccessRule(
    customerEntity,
    ['staff', 'operator', 'agent'],
    `record.${locationForeignKey} == user.locationId || user.assignedLocations.includes(record.${locationForeignKey})`,
    { read: true, write: false, delete: false }
  ));
  
  return rules;
}
