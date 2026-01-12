/**
 * Permissions Service
 * 
 * Handles runtime permission checks for pages, fields, rows, and actions.
 */

import type { UnifiedAppSchema } from '@neo/blueprint-engine';
import type {
  NeoRole,
  NeoAccessRule,
  NeoPermissions,
} from '@neo/blueprint-engine';
import { hasRolePermission, ROLE_HIERARCHY } from '@neo/blueprint-engine';

export interface PermissionContext {
  userId?: string;
  role: NeoRole;
  appId: string;
  schema: UnifiedAppSchema;
}

export interface RowContext {
  record: Record<string, unknown>;
  entityId: string;
}

/**
 * Simple expression evaluator for row-level conditions
 * Supports basic expressions like: assigned_to == current_user, status == 'active', etc.
 */
class SimpleExpressionEvaluator {
  private context: Record<string, unknown>;

  constructor(context: Record<string, unknown>) {
    this.context = context;
  }

  /**
   * Evaluate a simple expression
   */
  evaluate(expression: string): boolean {
    try {
      // Replace common variables
      let expr = expression.trim();
      
      // Replace current_user with userId
      if (this.context.userId) {
        expr = expr.replace(/\bcurrent_user\b/g, `'${this.context.userId}'`);
      }
      
      // Replace field references with values
      if (this.context.record) {
        for (const [key, value] of Object.entries(this.context.record)) {
          const regex = new RegExp(`\\b${key}\\b`, 'g');
          if (typeof value === 'string') {
            expr = expr.replace(regex, `'${value}'`);
          } else if (typeof value === 'number' || typeof value === 'boolean') {
            expr = expr.replace(regex, String(value));
          }
        }
      }

      // Simple evaluation using Function (in production, use a proper expression parser)
      // This is a simplified version - for production, use a library like expr-eval
      const result = new Function(`return ${expr}`)();
      return Boolean(result);
    } catch (error) {
      console.warn('[PermissionsService] Expression evaluation failed:', expression, error);
      return false;
    }
  }
}

/**
 * PermissionsService - Runtime permission checking
 */
export class PermissionsService {
  private context: PermissionContext;

  constructor(context: PermissionContext) {
    this.context = context;
  }

  /**
   * Get permissions from schema
   */
  private getPermissions(): NeoPermissions | undefined {
    return this.context.schema.permissions;
  }

  /**
   * Get user's role
   */
  getCurrentRole(): NeoRole {
    return this.context.role;
  }

  /**
   * Check if user can view a page
   */
  canViewPage(pageId: string): boolean {
    const permissions = this.getPermissions();
    if (!permissions) return true; // No permissions = public access

    const pageRules = this.getPageRules(pageId);
    if (pageRules.length === 0) {
      // No specific rules = check default role
      return hasRolePermission(this.context.role, permissions.defaultRole);
    }

    // Check if any rule allows read access
    for (const rule of pageRules) {
      if (rule.roles.includes(this.context.role) && rule.allow?.read) {
        return true;
      }
      // Check role hierarchy
      for (const ruleRole of rule.roles) {
        if (hasRolePermission(this.context.role, ruleRole) && rule.allow?.read) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if user can view a field
   */
  canViewField(entityId: string, fieldId: string): boolean {
    const permissions = this.getPermissions();
    if (!permissions) return true;

    const fieldRules = this.getFieldRules(entityId, fieldId);
    if (fieldRules.length === 0) {
      return true; // No rules = visible
    }

    // Check if any rule allows read access
    for (const rule of fieldRules) {
      if (rule.roles.includes(this.context.role) && rule.allow?.read) {
        return true;
      }
      for (const ruleRole of rule.roles) {
        if (hasRolePermission(this.context.role, ruleRole) && rule.allow?.read) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if user can edit a field
   */
  canEditField(entityId: string, fieldId: string): boolean {
    const permissions = this.getPermissions();
    if (!permissions) {
      // No permissions = allow edit for editor+ roles
      return ROLE_HIERARCHY[this.context.role] >= ROLE_HIERARCHY.editor;
    }

    const fieldRules = this.getFieldRules(entityId, fieldId);
    if (fieldRules.length === 0) {
      // No rules = allow edit for editor+ roles
      return ROLE_HIERARCHY[this.context.role] >= ROLE_HIERARCHY.editor;
    }

    // Check if any rule allows write access
    for (const rule of fieldRules) {
      if (rule.roles.includes(this.context.role) && rule.allow?.write) {
        return true;
      }
      for (const ruleRole of rule.roles) {
        if (hasRolePermission(this.context.role, ruleRole) && rule.allow?.write) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Filter rows based on row-level access rules
   */
  filterRows(entityId: string, records: Record<string, unknown>[]): Record<string, unknown>[] {
    const permissions = this.getPermissions();
    if (!permissions) return records;

    const rowRules = this.getRowRules(entityId);
    if (rowRules.length === 0) return records;

    // Filter records based on row rules
    return records.filter(record => {
      for (const rule of rowRules) {
        // Check if rule applies to user's role
        const roleMatches = rule.roles.includes(this.context.role) ||
          rule.roles.some(role => hasRolePermission(this.context.role, role));

        if (!roleMatches) continue;

        // Evaluate condition if present
        if (rule.condition) {
          const evaluator = new SimpleExpressionEvaluator({
            userId: this.context.userId,
            record,
            entityId,
          });
          
          if (!evaluator.evaluate(rule.condition)) {
            continue; // Condition not met
          }
        }

        // If rule allows read and condition matches, include record
        if (rule.allow?.read) {
          return true;
        }
      }

      // No matching rule allows read = filter out
      return false;
    });
  }

  /**
   * Check if user can perform an action
   */
  canPerformAction(actionId: string): boolean {
    const permissions = this.getPermissions();
    if (!permissions) {
      // No permissions = allow for editor+ roles
      return ROLE_HIERARCHY[this.context.role] >= ROLE_HIERARCHY.editor;
    }

    const actionRules = this.getActionRules(actionId);
    if (actionRules.length === 0) {
      return ROLE_HIERARCHY[this.context.role] >= ROLE_HIERARCHY.editor;
    }

    // Check if any rule allows execution
    for (const rule of actionRules) {
      if (rule.roles.includes(this.context.role) && rule.allow?.read) {
        return true;
      }
      for (const ruleRole of rule.roles) {
        if (hasRolePermission(this.context.role, ruleRole) && rule.allow?.read) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get page access rules
   */
  private getPageRules(pageId: string): NeoAccessRule[] {
    const permissions = this.getPermissions();
    if (!permissions) return [];

    return permissions.rules.filter(
      rule => rule.type === 'page_access' &&
        rule.pageId === pageId &&
        rule.enabled !== false
    );
  }

  /**
   * Get field access rules
   */
  private getFieldRules(entityId: string, fieldId: string): NeoAccessRule[] {
    const permissions = this.getPermissions();
    if (!permissions) return [];

    return permissions.rules.filter(
      rule => rule.type === 'field_access' &&
        rule.entityId === entityId &&
        rule.fieldId === fieldId &&
        rule.enabled !== false
    );
  }

  /**
   * Get row access rules
   */
  private getRowRules(entityId: string): NeoAccessRule[] {
    const permissions = this.getPermissions();
    if (!permissions) return [];

    return permissions.rules.filter(
      rule => rule.type === 'row_access' &&
        rule.entityId === entityId &&
        rule.enabled !== false
    );
  }

  /**
   * Get action access rules
   */
  private getActionRules(actionId: string): NeoAccessRule[] {
    const permissions = this.getPermissions();
    if (!permissions) return [];

    return permissions.rules.filter(
      rule => rule.type === 'action_access' &&
        rule.actionId === actionId &&
        rule.enabled !== false
    );
  }

  /**
   * Update context (e.g., when user logs in or role changes)
   */
  updateContext(context: Partial<PermissionContext>): void {
    this.context = { ...this.context, ...context };
  }
}
