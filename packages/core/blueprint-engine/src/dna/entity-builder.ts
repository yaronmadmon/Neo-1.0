/**
 * Entity Builder
 * 
 * Generates complete entity definitions with:
 * - Fields with proper types and validation
 * - Relationships between entities
 * - Behaviors (trackable, schedulable, billable, etc.)
 * - Display configuration
 * - CRUD rules
 */

import type { UnifiedEntity, UnifiedField } from './schema.js';
import type { InferredEntity, InferredField } from '../intelligence/types.js';

// Helper type for partial field definition (required defaults to false)
type PartialField = Omit<UnifiedField, 'required'> & { required?: boolean };

// Convert partial field to full field with defaults
function toField(partial: PartialField): UnifiedField {
  return {
    ...partial,
    required: partial.required ?? false,
  } as UnifiedField;
}

// ============================================================
// TYPES
// ============================================================

export interface EntityBuildContext {
  industry?: string;
  features?: string[];
  existingEntities?: UnifiedEntity[];
  preferredFields?: string[];
}

interface FieldTemplate {
  id: string;
  name: string;
  type: UnifiedField['type'];
  required?: boolean;
  unique?: boolean;
  defaultValue?: unknown;
  enumOptions?: Array<{ value: string; label: string; color?: string }>;
  description?: string;
}

// ============================================================
// ENTITY BUILDER
// ============================================================

export class EntityBuilder {
  private fieldTemplates: Map<string, FieldTemplate[]> = new Map();

  constructor() {
    this.registerCommonFields();
  }

  /**
   * Build entity from inferred data
   */
  buildFromInference(inferred: InferredEntity, ctx: EntityBuildContext = {}): UnifiedEntity {
    const id = this.toKebabCase(inferred.name);
    
    // Start with inferred fields
    const fields: UnifiedField[] = [
      this.createIdField(),
      ...inferred.fields.map(f => this.convertInferredField(f)),
    ];

    // Add standard fields if missing
    this.ensureStandardFields(fields, inferred);

    // Infer behaviors from fields
    const behaviors = this.inferBehaviors(fields, inferred);

    // Build relationships
    const relationships = this.buildRelationships(inferred, ctx.existingEntities || []);

    // Build display config
    const display = this.buildDisplayConfig(fields, inferred);

    return {
      id,
      name: this.toTitleCase(inferred.name),
      pluralName: inferred.pluralName || this.pluralize(this.toTitleCase(inferred.name)),
      description: `Manage ${inferred.pluralName?.toLowerCase() || this.pluralize(inferred.name.toLowerCase())}`,
      icon: inferred.suggestedIcon || this.suggestIcon(inferred.name, behaviors),
      fields,
      behaviors,
      relationships,
      display,
      crud: this.buildCrudRules(behaviors),
      timestamps: { createdAt: true, updatedAt: true },
    };
  }

  /**
   * Build entity from scratch with just a name
   */
  buildFromName(name: string, ctx: EntityBuildContext = {}): UnifiedEntity {
    const id = this.toKebabCase(name);
    const displayName = this.toTitleCase(name);
    
    // Get template fields based on industry or common patterns
    const templateFields = this.getTemplateFields(name, ctx.industry);
    
    const fields: UnifiedField[] = [
      this.createIdField(),
      this.createNameField(displayName),
      ...templateFields,
      ...this.createTimestampFields(),
    ];

    const mockInferred: InferredEntity = {
      id,
      name,
      pluralName: this.pluralize(name),
      confidence: 1,
      fields: [],
      relationships: [],
      behaviors: [],
    };
    const behaviors = this.inferBehaviors(fields, mockInferred);
    
    return {
      id,
      name: displayName,
      pluralName: this.pluralize(displayName),
      fields,
      behaviors,
      relationships: [],
      display: {
        titleField: 'name',
        listFields: fields.filter(f => !f.display?.hidden).slice(1, 5).map(f => f.id),
        searchFields: fields.filter(f => f.type === 'string').slice(0, 3).map(f => f.id),
      },
      crud: this.buildCrudRules(behaviors),
      timestamps: { createdAt: true, updatedAt: true },
    };
  }

  /**
   * Enhance an existing entity with additional fields/behaviors
   */
  enhance(entity: UnifiedEntity, enhancements: {
    addFields?: Partial<UnifiedField>[];
    addBehaviors?: UnifiedEntity['behaviors'];
    addRelationship?: NonNullable<UnifiedEntity['relationships']>[number];
  }): UnifiedEntity {
    const enhanced = { ...entity };

    if (enhancements.addFields) {
      for (const field of enhancements.addFields) {
        if (!enhanced.fields.find(f => f.id === field.id)) {
          enhanced.fields.push(this.normalizeField(field));
        }
      }
    }

    if (enhancements.addBehaviors) {
      enhanced.behaviors = [...new Set([...(enhanced.behaviors || []), ...enhancements.addBehaviors])];
    }

    if (enhancements.addRelationship) {
      enhanced.relationships = [...(enhanced.relationships || []), enhancements.addRelationship];
    }

    return enhanced;
  }

  // ============================================================
  // FIELD BUILDERS
  // ============================================================

  private createIdField(): UnifiedField {
    return {
      id: 'id',
      name: 'ID',
      type: 'string',
      required: true,
      unique: true,
      display: { hidden: true },
    };
  }

  private createNameField(entityName: string): UnifiedField {
    return {
      id: 'name',
      name: 'Name',
      type: 'string',
      required: true,
      display: { placeholder: `Enter ${entityName.toLowerCase()} name` },
    };
  }

  private createTimestampFields(): UnifiedField[] {
    return [
      toField({
        id: 'createdAt',
        name: 'Created At',
        type: 'datetime',
        display: { hidden: true, readonly: true },
      }),
      toField({
        id: 'updatedAt',
        name: 'Updated At',
        type: 'datetime',
        display: { hidden: true, readonly: true },
      }),
    ];
  }

  private convertInferredField(field: InferredField): UnifiedField {
    return {
      id: this.toCamelCase(field.name),
      name: field.name,
      type: this.mapFieldType(field.type),
      required: field.required,
      unique: field.unique,
      defaultValue: field.defaultValue,
      validation: field.validation,
      description: field.reasoning,
    };
  }

  private normalizeField(partial: Partial<UnifiedField>): UnifiedField {
    return {
      id: partial.id || this.toCamelCase(partial.name || 'field'),
      name: partial.name || this.toTitleCase(partial.id || 'Field'),
      type: partial.type || 'string',
      required: partial.required ?? false,
      ...partial,
    };
  }

  private mapFieldType(type: string): UnifiedField['type'] {
    const typeMap: Record<string, UnifiedField['type']> = {
      'string': 'string',
      'text': 'text',
      'number': 'number',
      'boolean': 'boolean',
      'date': 'date',
      'datetime': 'datetime',
      'time': 'time',
      'email': 'email',
      'phone': 'phone',
      'url': 'url',
      'image': 'image',
      'file': 'file',
      'reference': 'reference',
      'enum': 'enum',
      'currency': 'currency',
      'percentage': 'percentage',
      'address': 'address',
      'geolocation': 'geolocation',
    };
    return typeMap[type] || 'string';
  }

  // ============================================================
  // TEMPLATE FIELDS
  // ============================================================

  private getTemplateFields(entityName: string, industry?: string): UnifiedField[] {
    const lowerName = entityName.toLowerCase();
    const fields: UnifiedField[] = [];

    // Common patterns based on entity name
    if (lowerName.includes('client') || lowerName.includes('customer') || lowerName.includes('contact')) {
      fields.push(
        toField({ id: 'email', name: 'Email', type: 'email', required: true }),
        toField({ id: 'phone', name: 'Phone', type: 'phone' }),
        toField({ id: 'company', name: 'Company', type: 'string' }),
        toField({ id: 'address', name: 'Address', type: 'address' }),
        toField({ id: 'notes', name: 'Notes', type: 'richtext' }),
      );
    }

    if (lowerName.includes('job') || lowerName.includes('project') || lowerName.includes('task')) {
      fields.push(
        toField({ id: 'description', name: 'Description', type: 'richtext' }),
        toField({ id: 'status', name: 'Status', type: 'enum', enumOptions: [
          { value: 'pending', label: 'Pending', color: '#9ca3af' },
          { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
          { value: 'completed', label: 'Completed', color: '#10b981' },
          { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
        ], defaultValue: 'pending' }),
        toField({ id: 'priority', name: 'Priority', type: 'enum', enumOptions: [
          { value: 'low', label: 'Low', color: '#10b981' },
          { value: 'medium', label: 'Medium', color: '#f59e0b' },
          { value: 'high', label: 'High', color: '#ef4444' },
        ], defaultValue: 'medium' }),
        toField({ id: 'dueDate', name: 'Due Date', type: 'date' }),
      );
    }

    if (lowerName.includes('invoice') || lowerName.includes('payment') || lowerName.includes('order')) {
      fields.push(
        toField({ id: 'amount', name: 'Amount', type: 'currency', required: true }),
        toField({ id: 'status', name: 'Status', type: 'enum', enumOptions: [
          { value: 'draft', label: 'Draft', color: '#9ca3af' },
          { value: 'pending', label: 'Pending', color: '#f59e0b' },
          { value: 'paid', label: 'Paid', color: '#10b981' },
          { value: 'overdue', label: 'Overdue', color: '#ef4444' },
        ], defaultValue: 'draft' }),
        toField({ id: 'dueDate', name: 'Due Date', type: 'date' }),
        toField({ id: 'paidDate', name: 'Paid Date', type: 'date' }),
      );
    }

    if (lowerName.includes('appointment') || lowerName.includes('event') || lowerName.includes('booking')) {
      fields.push(
        toField({ id: 'date', name: 'Date', type: 'datetime', required: true }),
        toField({ id: 'endDate', name: 'End Date', type: 'datetime' }),
        toField({ id: 'location', name: 'Location', type: 'string' }),
        toField({ id: 'status', name: 'Status', type: 'enum', enumOptions: [
          { value: 'scheduled', label: 'Scheduled', color: '#3b82f6' },
          { value: 'confirmed', label: 'Confirmed', color: '#10b981' },
          { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
          { value: 'completed', label: 'Completed', color: '#6b7280' },
        ], defaultValue: 'scheduled' }),
        toField({ id: 'notes', name: 'Notes', type: 'text' }),
      );
    }

    if (lowerName.includes('product') || lowerName.includes('item') || lowerName.includes('inventory')) {
      fields.push(
        toField({ id: 'sku', name: 'SKU', type: 'string', unique: true }),
        toField({ id: 'description', name: 'Description', type: 'richtext' }),
        toField({ id: 'price', name: 'Price', type: 'currency', required: true }),
        toField({ id: 'cost', name: 'Cost', type: 'currency' }),
        toField({ id: 'quantity', name: 'Quantity', type: 'number', defaultValue: 0 }),
        toField({ id: 'image', name: 'Image', type: 'image' }),
      );
    }

    // Industry-specific additions
    if (industry) {
      const industryFields = this.getIndustryFields(entityName, industry);
      fields.push(...industryFields);
    }

    return fields;
  }

  private getIndustryFields(entityName: string, industry: string): UnifiedField[] {
    const fields: UnifiedField[] = [];
    const lowerName = entityName.toLowerCase();

    switch (industry) {
      case 'trades':
      case 'services':
        if (lowerName.includes('job')) {
          fields.push(
            toField({ id: 'serviceAddress', name: 'Service Address', type: 'address' }),
            toField({ id: 'estimatedDuration', name: 'Estimated Duration', type: 'duration' }),
            toField({ id: 'photos', name: 'Photos', type: 'image' }),
          );
        }
        break;

      case 'healthcare':
        if (lowerName.includes('patient') || lowerName.includes('client')) {
          fields.push(
            toField({ id: 'dateOfBirth', name: 'Date of Birth', type: 'date' }),
            toField({ id: 'insuranceId', name: 'Insurance ID', type: 'string' }),
            toField({ id: 'emergencyContact', name: 'Emergency Contact', type: 'string' }),
          );
        }
        break;

      case 'real_estate':
        if (lowerName.includes('property') || lowerName.includes('listing')) {
          fields.push(
            toField({ id: 'bedrooms', name: 'Bedrooms', type: 'number' }),
            toField({ id: 'bathrooms', name: 'Bathrooms', type: 'number' }),
            toField({ id: 'sqft', name: 'Square Feet', type: 'number' }),
            toField({ id: 'yearBuilt', name: 'Year Built', type: 'number' }),
          );
        }
        break;

      case 'fitness':
        if (lowerName.includes('workout') || lowerName.includes('exercise')) {
          fields.push(
            toField({ id: 'sets', name: 'Sets', type: 'number' }),
            toField({ id: 'reps', name: 'Reps', type: 'number' }),
            toField({ id: 'weight', name: 'Weight', type: 'number' }),
            toField({ id: 'duration', name: 'Duration (min)', type: 'number' }),
          );
        }
        break;
    }

    return fields;
  }

  // ============================================================
  // BEHAVIOR INFERENCE
  // ============================================================

  private inferBehaviors(fields: UnifiedField[], inferred: InferredEntity): UnifiedEntity['behaviors'] {
    const behaviors: NonNullable<UnifiedEntity['behaviors']> = [];
    const fieldIds = fields.map(f => f.id.toLowerCase());
    const fieldTypes = fields.map(f => f.type);

    // Trackable: has status/stage field
    if (fieldIds.some(id => id === 'status' || id === 'stage' || id === 'state')) {
      behaviors.push('trackable');
    }

    // Assignable: has assignee/owner/user field
    if (fieldIds.some(id => 
      id.includes('assignee') || id.includes('owner') || 
      id.includes('assignedto') || id.includes('userid')
    )) {
      behaviors.push('assignable');
    }

    // Schedulable: has date/datetime fields
    if (fieldTypes.includes('date') || fieldTypes.includes('datetime')) {
      behaviors.push('schedulable');
    }

    // Billable: has price/amount/cost fields
    if (fieldTypes.includes('currency') || fieldIds.some(id => 
      id.includes('price') || id.includes('amount') || id.includes('cost') || id.includes('total')
    )) {
      behaviors.push('billable');
    }

    // Attachable: has file/image fields
    if (fieldTypes.includes('file') || fieldTypes.includes('image')) {
      behaviors.push('attachable');
    }

    // Add from inferred behaviors
    if (inferred.behaviors) {
      for (const behavior of inferred.behaviors) {
        if (!behaviors.includes(behavior as typeof behaviors[number])) {
          behaviors.push(behavior as typeof behaviors[number]);
        }
      }
    }

    return behaviors;
  }

  private suggestIcon(name: string, behaviors: UnifiedEntity['behaviors']): string {
    const lowerName = name.toLowerCase();
    
    // Name-based icons
    const iconMap: Record<string, string> = {
      'client': '👤', 'customer': '👤', 'contact': '👤', 'user': '👤', 'person': '👤',
      'job': '🔧', 'task': '✅', 'project': '📋', 'work': '💼',
      'invoice': '📄', 'payment': '💳', 'order': '🛒', 'bill': '📃',
      'appointment': '📅', 'event': '📆', 'booking': '🗓️', 'schedule': '📆',
      'product': '📦', 'item': '📦', 'inventory': '📦', 'stock': '📦',
      'property': '🏠', 'listing': '🏠', 'house': '🏡',
      'workout': '💪', 'exercise': '🏋️', 'fitness': '🏃',
      'recipe': '📖', 'meal': '🍽️', 'food': '🍳',
      'message': '💬', 'note': '📝', 'comment': '💭',
      'document': '📄', 'file': '📁', 'attachment': '📎',
    };

    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerName.includes(key)) return icon;
    }

    // Behavior-based fallback
    if (behaviors?.includes('schedulable')) return '📅';
    if (behaviors?.includes('billable')) return '💰';
    if (behaviors?.includes('trackable')) return '📊';

    return '📋';
  }

  // ============================================================
  // RELATIONSHIP BUILDING
  // ============================================================

  private buildRelationships(
    inferred: InferredEntity, 
    existingEntities: UnifiedEntity[]
  ): UnifiedEntity['relationships'] {
    const relationships: NonNullable<UnifiedEntity['relationships']> = [];

    if (inferred.relationships) {
      for (const rel of inferred.relationships) {
        // Check if target entity exists
        const targetExists = existingEntities.some(e => e.id === rel.targetEntity);
        
        relationships.push({
          id: `${inferred.id || this.toKebabCase(inferred.name)}-${rel.targetEntity}`,
          type: rel.type as 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many',
          targetEntity: rel.targetEntity,
          foreignKey: rel.fieldName,
          backReference: targetExists ? inferred.name.toLowerCase() + 's' : undefined,
        });
      }
    }

    return relationships;
  }

  // ============================================================
  // DISPLAY & CRUD CONFIG
  // ============================================================

  private buildDisplayConfig(fields: UnifiedField[], inferred: InferredEntity): UnifiedEntity['display'] {
    const visibleFields = fields.filter(f => !f.display?.hidden);
    
    // Find best title field
    const titleField = visibleFields.find(f => 
      f.id === 'name' || f.id === 'title' || f.id === 'subject'
    )?.id || visibleFields[0]?.id || 'id';

    // Find subtitle field (usually status or type)
    const subtitleField = visibleFields.find(f => 
      f.id === 'status' || f.id === 'type' || f.id === 'category'
    )?.id;

    // Find image field
    const imageField = fields.find(f => f.type === 'image')?.id;

    // List fields (first 4-5 visible fields)
    const listFields = visibleFields
      .filter(f => f.id !== 'id')
      .slice(0, 5)
      .map(f => f.id);

    // Search fields (string fields)
    const searchFields = visibleFields
      .filter(f => f.type === 'string' || f.type === 'text' || f.type === 'email')
      .slice(0, 3)
      .map(f => f.id);

    // Filter fields (enum fields)
    const filterFields = visibleFields
      .filter(f => f.type === 'enum')
      .map(f => f.id);

    return {
      titleField,
      subtitleField,
      imageField,
      listFields,
      searchFields,
      filterFields,
    };
  }

  private buildCrudRules(behaviors: UnifiedEntity['behaviors']): UnifiedEntity['crud'] {
    return {
      create: {
        enabled: true,
        confirmation: false,
        successMessage: 'Created successfully!',
      },
      read: {
        enabled: true,
        pageSize: 20,
      },
      update: {
        enabled: true,
        confirmation: false,
        successMessage: 'Updated successfully!',
      },
      delete: {
        enabled: true,
        confirmation: true,
        softDelete: behaviors?.includes('archivable') || false,
      },
    };
  }

  private ensureStandardFields(fields: UnifiedField[], inferred: InferredEntity): void {
    // Ensure name field exists
    if (!fields.find(f => f.id === 'name' || f.id === 'title')) {
      fields.splice(1, 0, {
        id: 'name',
        name: 'Name',
        type: 'string',
        required: true,
      });
    }

    // Ensure timestamps
    if (!fields.find(f => f.id === 'createdAt')) {
      fields.push(...this.createTimestampFields());
    }
  }

  private registerCommonFields(): void {
    // Register reusable field templates for common patterns
    this.fieldTemplates.set('contact', [
      { id: 'name', name: 'Name', type: 'string', required: true },
      { id: 'email', name: 'Email', type: 'email', required: true },
      { id: 'phone', name: 'Phone', type: 'phone' },
    ]);

    this.fieldTemplates.set('address', [
      { id: 'street', name: 'Street', type: 'string' },
      { id: 'city', name: 'City', type: 'string' },
      { id: 'state', name: 'State', type: 'string' },
      { id: 'zipCode', name: 'Zip Code', type: 'string' },
    ]);

    this.fieldTemplates.set('status', [
      { 
        id: 'status', 
        name: 'Status', 
        type: 'enum',
        enumOptions: [
          { value: 'active', label: 'Active', color: '#10b981' },
          { value: 'inactive', label: 'Inactive', color: '#9ca3af' },
        ],
      },
    ]);
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  private toKebabCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  private toCamelCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
      .replace(/^./, c => c.toLowerCase());
  }

  private toTitleCase(str: string): string {
    return str.replace(/\b\w/g, c => c.toUpperCase());
  }

  private pluralize(str: string): string {
    if (str.endsWith('y') && !/[aeiou]y$/i.test(str)) {
      return str.slice(0, -1) + 'ies';
    }
    if (str.endsWith('s') || str.endsWith('x') || str.endsWith('ch') || str.endsWith('sh')) {
      return str + 'es';
    }
    return str + 's';
  }
}
