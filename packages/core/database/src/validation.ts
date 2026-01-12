/**
 * Server-Side Validation Engine
 * Validates data against entity schemas before database operations
 */

import type { ValidationRule, ValidationError, ValidationResult } from './types.js';

// Entity field interface (simplified from blueprint engine)
interface EntityField {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    message?: string;
    custom?: string;
  };
  enumOptions?: { value: string; label: string }[];
  reference?: {
    entity: string;
    displayField: string;
  };
}

interface Entity {
  id: string;
  name: string;
  fields: EntityField[];
}

// ============================================================
// VALIDATION ENGINE
// ============================================================

export class ValidationEngine {
  private customValidators: Map<string, (value: unknown, params: unknown) => boolean>;

  constructor() {
    this.customValidators = new Map();
    this.registerBuiltinValidators();
  }

  /**
   * Validate data against an entity schema
   */
  async validate(
    entity: Entity,
    data: Record<string, unknown>,
    options: {
      isCreate?: boolean;
      isUpdate?: boolean;
      existingData?: Record<string, unknown>;
      checkUnique?: (field: string, value: unknown, excludeId?: string) => Promise<boolean>;
      checkExists?: (entity: string, id: string) => Promise<boolean>;
    } = {}
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    for (const field of entity.fields) {
      const value = data[field.name];
      const fieldErrors = await this.validateField(field, value, data, options);
      errors.push(...fieldErrors);
    }

    // Check for unknown fields in strict mode
    const knownFields = new Set(entity.fields.map(f => f.name));
    for (const key of Object.keys(data)) {
      if (!knownFields.has(key) && !['id', 'createdAt', 'updatedAt', 'deletedAt'].includes(key)) {
        errors.push({
          field: key,
          rule: 'unknown',
          message: `Unknown field: ${key}`,
          value: data[key],
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a single field
   */
  private async validateField(
    field: EntityField,
    value: unknown,
    allData: Record<string, unknown>,
    options: {
      isCreate?: boolean;
      isUpdate?: boolean;
      existingData?: Record<string, unknown>;
      checkUnique?: (field: string, value: unknown, excludeId?: string) => Promise<boolean>;
      checkExists?: (entity: string, id: string) => Promise<boolean>;
    }
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Required check
    if (field.required) {
      if (options.isCreate && (value === undefined || value === null || value === '')) {
        errors.push({
          field: field.name,
          rule: 'required',
          message: `${field.name} is required`,
          value,
        });
        return errors; // Don't continue validation if required field is missing
      }
      if (options.isUpdate && value === null) {
        errors.push({
          field: field.name,
          rule: 'required',
          message: `${field.name} cannot be null`,
          value,
        });
        return errors;
      }
    }

    // Skip other validations if value is empty
    if (value === undefined || value === null || value === '') {
      return errors;
    }

    // Type validation
    const typeError = this.validateType(field, value);
    if (typeError) {
      errors.push(typeError);
      return errors; // Don't continue if type is wrong
    }

    // Field-specific validation rules
    if (field.validation) {
      const validationErrors = this.applyValidationRules(field, value);
      errors.push(...validationErrors);
    }

    // Enum validation
    if (field.type === 'enum' && field.enumOptions) {
      const validValues = field.enumOptions.map(o => o.value);
      if (!validValues.includes(value as string)) {
        errors.push({
          field: field.name,
          rule: 'enum',
          message: `${field.name} must be one of: ${validValues.join(', ')}`,
          value,
        });
      }
    }

    // Unique validation
    if (field.unique && options.checkUnique) {
      const recordId = (options.existingData?.id as string) || (allData.id as string);
      const isUnique = await options.checkUnique(field.name, value, recordId);
      if (!isUnique) {
        errors.push({
          field: field.name,
          rule: 'unique',
          message: `${field.name} must be unique. "${value}" already exists.`,
          value,
        });
      }
    }

    // Reference validation
    if (field.reference && options.checkExists && value) {
      const exists = await options.checkExists(field.reference.entity, value as string);
      if (!exists) {
        errors.push({
          field: field.name,
          rule: 'exists',
          message: `Referenced ${field.reference.entity} does not exist`,
          value,
        });
      }
    }

    return errors;
  }

  /**
   * Validate value type matches field type
   */
  private validateType(field: EntityField, value: unknown): ValidationError | null {
    const actualType = typeof value;

    switch (field.type) {
      case 'string':
      case 'text':
      case 'richtext':
      case 'email':
      case 'phone':
      case 'url':
      case 'color':
      case 'barcode':
      case 'signature':
        if (actualType !== 'string') {
          return {
            field: field.name,
            rule: 'type',
            message: `${field.name} must be a string`,
            value,
          };
        }
        break;

      case 'number':
      case 'integer':
      case 'currency':
      case 'decimal':
      case 'percentage':
      case 'rating':
      case 'duration':
        if (actualType !== 'number' || isNaN(value as number)) {
          return {
            field: field.name,
            rule: 'type',
            message: `${field.name} must be a number`,
            value,
          };
        }
        if (field.type === 'integer' && !Number.isInteger(value)) {
          return {
            field: field.name,
            rule: 'type',
            message: `${field.name} must be an integer`,
            value,
          };
        }
        break;

      case 'boolean':
        if (actualType !== 'boolean') {
          return {
            field: field.name,
            rule: 'type',
            message: `${field.name} must be a boolean`,
            value,
          };
        }
        break;

      case 'date':
      case 'datetime':
      case 'time':
        if (!(value instanceof Date) && (actualType !== 'string' || isNaN(Date.parse(value as string)))) {
          return {
            field: field.name,
            rule: 'type',
            message: `${field.name} must be a valid date`,
            value,
          };
        }
        break;

      case 'json':
      case 'address':
      case 'geolocation':
        if (actualType !== 'object') {
          return {
            field: field.name,
            rule: 'type',
            message: `${field.name} must be an object`,
            value,
          };
        }
        break;

      case 'reference':
        if (actualType !== 'string') {
          return {
            field: field.name,
            rule: 'type',
            message: `${field.name} must be a valid ID (string)`,
            value,
          };
        }
        break;

      case 'enum':
        if (actualType !== 'string') {
          return {
            field: field.name,
            rule: 'type',
            message: `${field.name} must be a string`,
            value,
          };
        }
        break;
    }

    return null;
  }

  /**
   * Apply validation rules to a value
   */
  private applyValidationRules(field: EntityField, value: unknown): ValidationError[] {
    const errors: ValidationError[] = [];
    const validation = field.validation!;

    // Min/Max for numbers
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push({
          field: field.name,
          rule: 'min',
          message: validation.message || `${field.name} must be at least ${validation.min}`,
          value,
        });
      }
      if (validation.max !== undefined && value > validation.max) {
        errors.push({
          field: field.name,
          rule: 'max',
          message: validation.message || `${field.name} must be at most ${validation.max}`,
          value,
        });
      }
    }

    // MinLength/MaxLength for strings
    if (typeof value === 'string') {
      if (validation.minLength !== undefined && value.length < validation.minLength) {
        errors.push({
          field: field.name,
          rule: 'minLength',
          message: validation.message || `${field.name} must be at least ${validation.minLength} characters`,
          value,
        });
      }
      if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        errors.push({
          field: field.name,
          rule: 'maxLength',
          message: validation.message || `${field.name} must be at most ${validation.maxLength} characters`,
          value,
        });
      }
    }

    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        errors.push({
          field: field.name,
          rule: 'pattern',
          message: validation.message || `${field.name} has invalid format`,
          value,
        });
      }
    }

    // Email validation
    if (field.type === 'email' && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push({
          field: field.name,
          rule: 'email',
          message: `${field.name} must be a valid email address`,
          value,
        });
      }
    }

    // URL validation
    if (field.type === 'url' && typeof value === 'string') {
      try {
        new URL(value);
      } catch {
        errors.push({
          field: field.name,
          rule: 'url',
          message: `${field.name} must be a valid URL`,
          value,
        });
      }
    }

    // Phone validation (basic)
    if (field.type === 'phone' && typeof value === 'string') {
      const phoneRegex = /^[\d\s\-+()]+$/;
      if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 7) {
        errors.push({
          field: field.name,
          rule: 'phone',
          message: `${field.name} must be a valid phone number`,
          value,
        });
      }
    }

    // Custom validation
    if (validation.custom) {
      const validator = this.customValidators.get(validation.custom);
      if (validator && !validator(value, validation)) {
        errors.push({
          field: field.name,
          rule: 'custom',
          message: validation.message || `${field.name} failed custom validation`,
          value,
        });
      }
    }

    return errors;
  }

  /**
   * Register built-in custom validators
   */
  private registerBuiltinValidators(): void {
    // Credit card number (Luhn algorithm)
    this.customValidators.set('creditCard', (value: unknown) => {
      if (typeof value !== 'string') return false;
      const digits = value.replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19) return false;
      
      let sum = 0;
      let isEven = false;
      for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits[i], 10);
        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
      }
      return sum % 10 === 0;
    });

    // UUID
    this.customValidators.set('uuid', (value: unknown) => {
      if (typeof value !== 'string') return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    });

    // Slug
    this.customValidators.set('slug', (value: unknown) => {
      if (typeof value !== 'string') return false;
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      return slugRegex.test(value);
    });

    // Positive number
    this.customValidators.set('positive', (value: unknown) => {
      return typeof value === 'number' && value > 0;
    });

    // Non-negative number
    this.customValidators.set('nonNegative', (value: unknown) => {
      return typeof value === 'number' && value >= 0;
    });

    // Future date
    this.customValidators.set('futureDate', (value: unknown) => {
      const date = value instanceof Date ? value : new Date(value as string);
      return !isNaN(date.getTime()) && date > new Date();
    });

    // Past date
    this.customValidators.set('pastDate', (value: unknown) => {
      const date = value instanceof Date ? value : new Date(value as string);
      return !isNaN(date.getTime()) && date < new Date();
    });
  }

  /**
   * Register a custom validator
   */
  registerValidator(name: string, validator: (value: unknown, params: unknown) => boolean): void {
    this.customValidators.set(name, validator);
  }

  /**
   * Validate multiple records
   */
  async validateMany(
    entity: Entity,
    records: Record<string, unknown>[],
    options: {
      isCreate?: boolean;
      checkUnique?: (field: string, value: unknown, excludeId?: string) => Promise<boolean>;
      checkExists?: (entity: string, id: string) => Promise<boolean>;
    } = {}
  ): Promise<{ valid: boolean; errors: { index: number; errors: ValidationError[] }[] }> {
    const allErrors: { index: number; errors: ValidationError[] }[] = [];

    for (let i = 0; i < records.length; i++) {
      const result = await this.validate(entity, records[i], options);
      if (!result.valid) {
        allErrors.push({ index: i, errors: result.errors });
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
    };
  }

  /**
   * Sanitize data by removing unknown fields and coercing types
   */
  sanitize(entity: Entity, data: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const fieldMap = new Map(entity.fields.map(f => [f.name, f]));

    for (const [key, value] of Object.entries(data)) {
      const field = fieldMap.get(key);
      if (!field && !['id', 'createdAt', 'updatedAt'].includes(key)) {
        continue; // Skip unknown fields
      }

      if (field) {
        sanitized[key] = this.coerceType(field, value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Coerce value to expected type
   */
  private coerceType(field: EntityField, value: unknown): unknown {
    if (value === null || value === undefined) return value;

    switch (field.type) {
      case 'number':
      case 'currency':
      case 'decimal':
      case 'percentage':
      case 'rating':
      case 'duration':
        return typeof value === 'string' ? parseFloat(value) : value;

      case 'integer':
        return typeof value === 'string' ? parseInt(value, 10) : value;

      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);

      case 'date':
      case 'datetime':
        if (typeof value === 'string' || typeof value === 'number') {
          return new Date(value).toISOString();
        }
        return value;

      case 'json':
      case 'address':
      case 'geolocation':
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;

      default:
        return value;
    }
  }
}

// Export singleton
export const validationEngine = new ValidationEngine();
