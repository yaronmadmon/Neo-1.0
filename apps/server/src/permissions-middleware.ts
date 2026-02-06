/**
 * Permissions Middleware
 * 
 * Provides user context and permission enforcement for database routes.
 * This enables tenant data isolation and role-based access control.
 * 
 * GENERIC SOLUTION - Works for:
 * - Tenant portals (property management, gyms, HOAs)
 * - Customer portals (e-commerce, restaurants)
 * - Member portals (fitness, clubs)
 * - Any multi-user app with data isolation needs
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from './utils/logger.js';

// ============================================================
// USER CONTEXT TYPES
// ============================================================

export type UserRole = 
  | 'owner' | 'admin' | 'editor' | 'viewer' 
  | 'customer' | 'tenant' | 'member' | 'guest'
  // Medical/healthcare roles
  | 'provider' | 'doctor' | 'therapist' | 'nurse' | 'staff'
  | 'patient';

export interface UserContext {
  userId: string;
  role: UserRole;
  appId: string;
  // Entity ownership - which entity is the user associated with
  // E.g., for a tenant, this would be { entityId: 'tenant', recordId: 'tenant-123' }
  // For a provider, this would be { entityId: 'provider', recordId: 'provider-123' }
  // For a patient, this would be { entityId: 'patient', recordId: 'patient-123' }
  ownershipEntity?: {
    entityId: string;
    recordId: string;
  };
  // For providers: list of assigned patient IDs
  assignedPatients?: string[];
  // For providers: provider ID
  providerId?: string;
  // For patients: patient ID  
  patientId?: string;
  // Custom claims from auth token
  claims?: Record<string, unknown>;
}

export interface PermissionRule {
  entity: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'list' | '*';
  // Allowed roles
  roles?: UserRole[];
  // Field-level restrictions
  allowedFields?: string[];
  deniedFields?: string[];
  // Row-level filter - automatically applied to queries
  // Uses the user's ownershipEntity to filter data
  ownershipFilter?: {
    field: string;           // Field to check (e.g., 'tenantId', 'customerId')
    useOwnershipEntity: boolean; // If true, filter by user's ownershipEntity.recordId
  };
  // Custom condition expression
  condition?: string;
}

// ============================================================
// IN-MEMORY PERMISSION STORE (per app)
// In production, this would be persisted in a database
// ============================================================

const appPermissions = new Map<string, PermissionRule[]>();
const appUserContexts = new Map<string, UserContext>(); // Active user sessions

// ============================================================
// PERMISSION MANAGEMENT
// ============================================================

/**
 * Register permission rules for an app
 */
export function registerAppPermissions(appId: string, rules: PermissionRule[]): void {
  appPermissions.set(appId, rules);
  logger.info('Permissions registered', { appId, ruleCount: rules.length });
}

/**
 * Get permission rules for an app
 */
export function getAppPermissions(appId: string): PermissionRule[] {
  return appPermissions.get(appId) || [];
}

/**
 * Generate default permission rules for tenant/member portal apps
 * This creates rules that scope data to the logged-in user
 */
export function generateTenantPortalPermissions(ownershipEntityId: string): PermissionRule[] {
  return [
    // Tenants can read their own record
    {
      entity: ownershipEntityId,
      action: 'read',
      roles: ['tenant', 'member', 'customer'],
      ownershipFilter: {
        field: 'id',
        useOwnershipEntity: true,
      },
    },
    // Tenants can update their own profile (limited fields)
    {
      entity: ownershipEntityId,
      action: 'update',
      roles: ['tenant', 'member', 'customer'],
      allowedFields: ['name', 'email', 'phone', 'emergencyContact', 'emergencyPhone'],
      ownershipFilter: {
        field: 'id',
        useOwnershipEntity: true,
      },
    },
    // Tenants can read their own leases
    {
      entity: 'lease',
      action: 'read',
      roles: ['tenant'],
      ownershipFilter: {
        field: 'tenantId',
        useOwnershipEntity: true,
      },
    },
    // Tenants can read their own payments
    {
      entity: 'rentPayment',
      action: 'read',
      roles: ['tenant'],
      ownershipFilter: {
        field: 'tenantId',
        useOwnershipEntity: true,
      },
    },
    // Tenants can read their own maintenance requests
    {
      entity: 'maintenanceRequest',
      action: 'read',
      roles: ['tenant'],
      ownershipFilter: {
        field: 'reportedBy',
        useOwnershipEntity: true,
      },
    },
    // Tenants can create maintenance requests (auto-assign to themselves)
    {
      entity: 'maintenanceRequest',
      action: 'create',
      roles: ['tenant'],
    },
    // Tenants can read documents related to their unit
    {
      entity: 'document',
      action: 'read',
      roles: ['tenant'],
      // Documents are filtered by association with tenant's unit/lease
    },
    // Admins/owners have full access
    {
      entity: '*',
      action: '*',
      roles: ['owner', 'admin'],
    },
    // Editors can create, read, update
    {
      entity: '*',
      action: 'create',
      roles: ['editor'],
    },
    {
      entity: '*',
      action: 'read',
      roles: ['editor'],
    },
    {
      entity: '*',
      action: 'update',
      roles: ['editor'],
    },
    // Viewers can only read
    {
      entity: '*',
      action: 'read',
      roles: ['viewer'],
    },
  ];
}

/**
 * Generate permission rules for medical/healthcare apps
 * Supports: Admin, Provider, Patient surfaces with proper data isolation
 */
export function generateMedicalPortalPermissions(): PermissionRule[] {
  return [
    // ============================================================
    // ADMIN PERMISSIONS (full access)
    // ============================================================
    {
      entity: '*',
      action: '*',
      roles: ['owner', 'admin'],
    },
    
    // ============================================================
    // PROVIDER PERMISSIONS
    // ============================================================
    
    // Providers can read their own profile
    {
      entity: 'provider',
      action: 'read',
      roles: ['provider', 'doctor', 'therapist', 'nurse'],
      ownershipFilter: {
        field: 'id',
        useOwnershipEntity: true,
      },
    },
    
    // Providers can update their own profile (limited fields)
    {
      entity: 'provider',
      action: 'update',
      roles: ['provider', 'doctor', 'therapist', 'nurse'],
      allowedFields: ['name', 'email', 'phone', 'bio', 'photo'],
      ownershipFilter: {
        field: 'id',
        useOwnershipEntity: true,
      },
    },
    
    // Providers can read patients (filtered by assignment in code)
    {
      entity: 'patient',
      action: 'read',
      roles: ['provider', 'doctor', 'therapist', 'nurse'],
      // Note: Additional filtering by assigned patients done in code
    },
    
    // Providers can read patient assignments
    {
      entity: 'patientAssignment',
      action: 'read',
      roles: ['provider', 'doctor', 'therapist', 'nurse'],
      ownershipFilter: {
        field: 'providerId',
        useOwnershipEntity: true,
      },
    },
    
    // Providers can read appointments (their own)
    {
      entity: 'appointment',
      action: 'read',
      roles: ['provider', 'doctor', 'therapist', 'nurse'],
      ownershipFilter: {
        field: 'providerId',
        useOwnershipEntity: true,
      },
    },
    
    // Providers can update appointments (their own)
    {
      entity: 'appointment',
      action: 'update',
      roles: ['provider', 'doctor', 'therapist', 'nurse'],
      ownershipFilter: {
        field: 'providerId',
        useOwnershipEntity: true,
      },
    },
    
    // Providers can create treatment notes
    {
      entity: 'treatmentNote',
      action: 'create',
      roles: ['provider', 'doctor', 'therapist', 'nurse'],
    },
    
    // Providers can read treatment notes (their own)
    {
      entity: 'treatmentNote',
      action: 'read',
      roles: ['provider', 'doctor', 'therapist', 'nurse'],
      ownershipFilter: {
        field: 'providerId',
        useOwnershipEntity: true,
      },
    },
    
    // Providers can update treatment notes (their own, DRAFT ONLY - enforced in code)
    {
      entity: 'treatmentNote',
      action: 'update',
      roles: ['provider', 'doctor', 'therapist', 'nurse'],
      ownershipFilter: {
        field: 'providerId',
        useOwnershipEntity: true,
      },
      // Write-once enforcement for signed notes is done in code
    },
    
    // Providers can manage their availability
    {
      entity: 'availability',
      action: '*',
      roles: ['provider', 'doctor', 'therapist', 'nurse'],
      ownershipFilter: {
        field: 'providerId',
        useOwnershipEntity: true,
      },
    },
    
    // Providers can read documents (for their patients)
    {
      entity: 'document',
      action: 'read',
      roles: ['provider', 'doctor', 'therapist', 'nurse'],
      // Patient filtering done in code based on assignment
    },
    
    // Providers can read/send messages
    {
      entity: 'message',
      action: 'read',
      roles: ['provider', 'doctor', 'therapist', 'nurse'],
    },
    {
      entity: 'message',
      action: 'create',
      roles: ['provider', 'doctor', 'therapist', 'nurse'],
    },
    
    // Providers can read follow-ups
    {
      entity: 'followUp',
      action: 'read',
      roles: ['provider', 'doctor', 'therapist', 'nurse'],
      ownershipFilter: {
        field: 'providerId',
        useOwnershipEntity: true,
      },
    },
    
    // Providers can create/update follow-ups
    {
      entity: 'followUp',
      action: 'create',
      roles: ['provider', 'doctor', 'therapist', 'nurse'],
    },
    {
      entity: 'followUp',
      action: 'update',
      roles: ['provider', 'doctor', 'therapist', 'nurse'],
      ownershipFilter: {
        field: 'providerId',
        useOwnershipEntity: true,
      },
    },
    
    // ============================================================
    // PATIENT PERMISSIONS
    // ============================================================
    
    // Patients can read their own profile
    {
      entity: 'patient',
      action: 'read',
      roles: ['patient'],
      ownershipFilter: {
        field: 'id',
        useOwnershipEntity: true,
      },
    },
    
    // Patients can update their own profile (limited fields)
    {
      entity: 'patient',
      action: 'update',
      roles: ['patient'],
      allowedFields: ['name', 'email', 'phone', 'address', 'city', 'state', 'postalCode', 
                      'emergencyContactName', 'emergencyContactPhone', 'insuranceProvider', 
                      'insurancePolicyNumber', 'insuranceGroupNumber'],
      ownershipFilter: {
        field: 'id',
        useOwnershipEntity: true,
      },
    },
    
    // Patients can read their appointments
    {
      entity: 'appointment',
      action: 'read',
      roles: ['patient'],
      ownershipFilter: {
        field: 'patientId',
        useOwnershipEntity: true,
      },
    },
    
    // Patients can create appointments (book)
    {
      entity: 'appointment',
      action: 'create',
      roles: ['patient'],
    },
    
    // Patients can update appointments (limited - e.g., cancel)
    {
      entity: 'appointment',
      action: 'update',
      roles: ['patient'],
      allowedFields: ['status'], // Can only change status (to cancelled)
      ownershipFilter: {
        field: 'patientId',
        useOwnershipEntity: true,
      },
    },
    
    // Patients can read treatment notes (APPROVED ONLY - enforced in code)
    {
      entity: 'treatmentNote',
      action: 'read',
      roles: ['patient'],
      ownershipFilter: {
        field: 'patientId',
        useOwnershipEntity: true,
      },
      // Additional filter: approvedForPatient = true (done in code)
    },
    
    // Patients can read their billing
    {
      entity: 'billing',
      action: 'read',
      roles: ['patient'],
      ownershipFilter: {
        field: 'patientId',
        useOwnershipEntity: true,
      },
    },
    
    // Patients can read their payments
    {
      entity: 'payment',
      action: 'read',
      roles: ['patient'],
      ownershipFilter: {
        field: 'patientId',
        useOwnershipEntity: true,
      },
    },
    
    // Patients can create payments
    {
      entity: 'payment',
      action: 'create',
      roles: ['patient'],
    },
    
    // Patients can read their documents (visible ones only)
    {
      entity: 'document',
      action: 'read',
      roles: ['patient'],
      ownershipFilter: {
        field: 'patientId',
        useOwnershipEntity: true,
      },
      // Additional filter: visibleToPatient = true (done in code)
    },
    
    // Patients can upload documents
    {
      entity: 'document',
      action: 'create',
      roles: ['patient'],
    },
    
    // Patients can read/send messages
    {
      entity: 'message',
      action: 'read',
      roles: ['patient'],
      ownershipFilter: {
        field: 'patientId',
        useOwnershipEntity: true,
      },
    },
    {
      entity: 'message',
      action: 'create',
      roles: ['patient'],
    },
    
    // Patients can read intake forms
    {
      entity: 'intakeForm',
      action: 'read',
      roles: ['patient'],
      ownershipFilter: {
        field: 'patientId',
        useOwnershipEntity: true,
      },
    },
    
    // Patients can submit intake forms
    {
      entity: 'intakeForm',
      action: 'create',
      roles: ['patient'],
    },
    {
      entity: 'intakeForm',
      action: 'update',
      roles: ['patient'],
      ownershipFilter: {
        field: 'patientId',
        useOwnershipEntity: true,
      },
    },
    
    // Patients can read provider availability (for booking)
    {
      entity: 'availability',
      action: 'read',
      roles: ['patient'],
    },
    
    // Patients can read provider info (limited)
    {
      entity: 'provider',
      action: 'read',
      roles: ['patient'],
      deniedFields: ['licenseNumber', 'npiNumber'], // Hide sensitive provider info
    },
    
    // ============================================================
    // STAFF PERMISSIONS (limited admin)
    // ============================================================
    {
      entity: '*',
      action: 'read',
      roles: ['staff'],
    },
    {
      entity: 'appointment',
      action: '*',
      roles: ['staff'],
    },
    {
      entity: 'patient',
      action: 'create',
      roles: ['staff'],
    },
    {
      entity: 'patient',
      action: 'update',
      roles: ['staff'],
    },
  ];
}

/**
 * Check if provider has access to a specific patient
 */
export function canProviderAccessPatient(
  userContext: UserContext | undefined,
  patientId: string
): boolean {
  if (!userContext) return false;
  
  // Admins can access all patients
  if (userContext.role === 'owner' || userContext.role === 'admin') {
    return true;
  }
  
  // Providers can only access assigned patients
  if (['provider', 'doctor', 'therapist', 'nurse'].includes(userContext.role)) {
    return userContext.assignedPatients?.includes(patientId) ?? false;
  }
  
  // Patients can only access their own data
  if (userContext.role === 'patient') {
    return userContext.patientId === patientId;
  }
  
  return false;
}

/**
 * Check if a treatment note can be updated (write-once enforcement)
 * Signed notes cannot be modified - only amendments can be created
 */
export function canUpdateTreatmentNote(
  note: { status?: string; providerId?: string },
  userContext: UserContext | undefined
): { allowed: boolean; reason?: string } {
  if (!userContext) return { allowed: false, reason: 'Not authenticated' };
  
  // Admins cannot override write-once (compliance requirement)
  if (note.status === 'signed') {
    return { 
      allowed: false, 
      reason: 'Signed treatment notes cannot be modified. Create an amendment instead.' 
    };
  }
  
  // Only the creating provider can update draft notes
  if (note.providerId && note.providerId !== userContext.ownershipEntity?.recordId) {
    if (!['owner', 'admin'].includes(userContext.role)) {
      return { 
        allowed: false, 
        reason: 'You can only update your own treatment notes.' 
      };
    }
  }
  
  return { allowed: true };
}

/**
 * Filter patient records based on approval status
 * Patients can only see records where approvedForPatient = true
 */
export function filterPatientRecords<T extends { approvedForPatient?: boolean }>(
  records: T[],
  userContext: UserContext | undefined
): T[] {
  if (!userContext) return records;
  
  // Non-patients see everything
  if (userContext.role !== 'patient') {
    return records;
  }
  
  // Patients only see approved records
  return records.filter(r => r.approvedForPatient === true);
}

// ============================================================
// USER CONTEXT MANAGEMENT
// ============================================================

/**
 * Set user context for a session
 */
export function setUserContext(sessionId: string, context: UserContext): void {
  appUserContexts.set(sessionId, context);
}

/**
 * Get user context from session
 */
export function getUserContext(sessionId: string): UserContext | undefined {
  return appUserContexts.get(sessionId);
}

/**
 * Clear user context (logout)
 */
export function clearUserContext(sessionId: string): void {
  appUserContexts.delete(sessionId);
}

// ============================================================
// PERMISSION CHECKING
// ============================================================

/**
 * Check if a user has permission for an action
 */
export function checkPermission(
  userContext: UserContext | undefined,
  entityId: string,
  action: PermissionRule['action']
): { allowed: boolean; filter?: Record<string, unknown>; rule?: PermissionRule } {
  // No user context = no restrictions (legacy mode)
  // In a real app, you'd deny by default
  if (!userContext) {
    return { allowed: true };
  }

  const rules = getAppPermissions(userContext.appId);
  if (rules.length === 0) {
    // No rules defined = allow all (legacy mode)
    return { allowed: true };
  }

  // Find matching rule
  for (const rule of rules) {
    // Check entity match
    if (rule.entity !== '*' && rule.entity !== entityId) continue;

    // Check action match
    if (rule.action !== '*' && rule.action !== action) continue;

    // Check role match
    if (rule.roles && !rule.roles.includes(userContext.role)) continue;

    // Found a matching rule
    let filter: Record<string, unknown> | undefined;

    // Apply ownership filter if defined
    if (rule.ownershipFilter?.useOwnershipEntity && userContext.ownershipEntity) {
      filter = {
        [rule.ownershipFilter.field]: userContext.ownershipEntity.recordId,
      };
    }

    return { allowed: true, filter, rule };
  }

  // No matching rule found = denied
  return { allowed: false };
}

/**
 * Filter fields based on permission rule
 */
export function filterFields(
  data: Record<string, unknown>,
  rule: PermissionRule | undefined
): Record<string, unknown> {
  if (!rule) return data;

  const result = { ...data };

  // Remove denied fields
  if (rule.deniedFields) {
    for (const field of rule.deniedFields) {
      delete result[field];
    }
  }

  // Keep only allowed fields (if specified)
  if (rule.allowedFields) {
    const allowed = new Set(['id', ...rule.allowedFields]); // Always include id
    for (const key of Object.keys(result)) {
      if (!allowed.has(key)) {
        delete result[key];
      }
    }
  }

  return result;
}

// ============================================================
// REQUEST MIDDLEWARE
// ============================================================

/**
 * Extract user context from request
 * In production, this would parse JWT tokens, session cookies, etc.
 */
export function extractUserContext(request: FastifyRequest): UserContext | undefined {
  // Check for user context in various places
  
  // 1. Custom header (for API access)
  const userContextHeader = request.headers['x-user-context'];
  if (userContextHeader) {
    try {
      return JSON.parse(Array.isArray(userContextHeader) ? userContextHeader[0] : userContextHeader);
    } catch {
      // Invalid JSON
    }
  }

  // 2. Session cookie (for browser access)
  // Use type assertion with 'any' to handle cookies that may be added by @fastify/cookie plugin
  const cookies = (request as any).cookies as Record<string, string> | undefined;
  const sessionId = cookies?.['neo-session'];
  if (sessionId) {
    return getUserContext(sessionId);
  }

  // 3. Bearer token (for authenticated API access)
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // In production, decode JWT and extract claims
    // For now, check if it's a session ID
    return getUserContext(token);
  }

  // No user context found
  return undefined;
}

/**
 * Middleware to enforce permissions on database routes
 */
export async function permissionMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userContext = extractUserContext(request);
  
  // Attach user context to request for downstream use
  (request as any).userContext = userContext;

  // Extract entity and action from request
  const { entityId } = request.params as { entityId?: string };
  if (!entityId) return; // Not an entity route

  const method = request.method.toUpperCase();
  const action = methodToAction(method);

  // Check permission
  const { allowed, filter, rule } = checkPermission(userContext, entityId, action);

  if (!allowed) {
    logger.warn('Permission denied', { 
      userId: userContext?.userId, 
      role: userContext?.role, 
      entityId, 
      action 
    });
    reply.code(403).send({
      success: false,
      error: 'Forbidden',
      message: 'You do not have permission to perform this action',
    });
    return reply;
  }

  // Attach filter and rule to request for use in route handlers
  (request as any).permissionFilter = filter;
  (request as any).permissionRule = rule;
}

function methodToAction(method: string): PermissionRule['action'] {
  switch (method) {
    case 'GET':
    case 'HEAD':
      return 'read';
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'read';
  }
}

// ============================================================
// QUERY FILTER BUILDER
// ============================================================

/**
 * Merge permission filter with user-provided filters
 */
export function mergeFilters(
  userFilters: unknown[] | undefined,
  permissionFilter: Record<string, unknown> | undefined
): unknown[] | undefined {
  if (!permissionFilter) return userFilters;

  const permissionFilterArray = Object.entries(permissionFilter).map(([field, value]) => ({
    field,
    operator: 'eq',
    value,
  }));

  if (!userFilters || userFilters.length === 0) {
    return permissionFilterArray;
  }

  return [...userFilters, ...permissionFilterArray];
}

// ============================================================
// AUTO-POPULATE OWNERSHIP
// ============================================================

/**
 * Auto-populate ownership fields when creating records
 * E.g., auto-set reportedBy to current tenant when creating maintenance request
 * For medical apps: auto-set providerId/patientId based on user role
 */
export function autoPopulateOwnership(
  entityId: string,
  data: Record<string, unknown>,
  userContext: UserContext | undefined
): Record<string, unknown> {
  if (!userContext?.ownershipEntity) return data;

  const result = { ...data };
  
  // General ownership mappings
  const ownershipMappings: Record<string, string[]> = {
    maintenanceRequest: ['reportedBy'],
    rentPayment: ['tenantId'],
    message: ['senderId'],
    document: ['uploadedBy'],
  };

  // Medical-specific ownership mappings
  const medicalProviderMappings: Record<string, string[]> = {
    treatmentNote: ['providerId'],
    appointment: ['providerId'],
    availability: ['providerId'],
    followUp: ['providerId'],
  };
  
  const medicalPatientMappings: Record<string, string[]> = {
    appointment: ['patientId'],
    message: ['patientId', 'senderId'],
    document: ['patientId'],
    intakeForm: ['patientId'],
    payment: ['patientId'],
  };

  // Apply general mappings
  const fieldsToPopulate = ownershipMappings[entityId] || [];
  for (const field of fieldsToPopulate) {
    if (result[field] === undefined) {
      result[field] = userContext.ownershipEntity.recordId;
    }
  }
  
  // Apply medical provider mappings
  if (['provider', 'doctor', 'therapist', 'nurse'].includes(userContext.role)) {
    const providerFields = medicalProviderMappings[entityId] || [];
    for (const field of providerFields) {
      if (result[field] === undefined) {
        result[field] = userContext.providerId || userContext.ownershipEntity.recordId;
      }
    }
  }
  
  // Apply medical patient mappings
  if (userContext.role === 'patient') {
    const patientFields = medicalPatientMappings[entityId] || [];
    for (const field of patientFields) {
      if (result[field] === undefined) {
        result[field] = userContext.patientId || userContext.ownershipEntity.recordId;
      }
    }
    
    // For messages from patients, mark as from patient
    if (entityId === 'message' && result['isFromPatient'] === undefined) {
      result['isFromPatient'] = true;
    }
  }

  return result;
}

logger.info('Permissions middleware loaded');
