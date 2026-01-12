/**
 * Data Model Inference
 * 
 * Infers complete data models from intelligence layer output:
 * - Entities from natural language descriptions
 * - Field types from context
 * - Relationships between entities
 * - Default values and constraints
 */

import type { UnifiedEntity, UnifiedField } from './schema.js';
import type { 
  IntelligenceResult, 
  InferredEntity, 
  InferredField,
  DetectedFeature,
  IndustryMapping,
} from '../intelligence/types.js';
import { EntityBuilder } from './entity-builder.js';

// Helper for creating fields with required defaulting to false
function toField(partial: Omit<UnifiedField, 'required'> & { required?: boolean }): UnifiedField {
  return { ...partial, required: partial.required ?? false } as UnifiedField;
}

// ============================================================
// TYPES
// ============================================================

export interface DataModelContext {
  intelligence?: IntelligenceResult;
  existingEntities?: UnifiedEntity[];
  industry?: string;
  features?: DetectedFeature[];
}

interface EntitySuggestion {
  name: string;
  confidence: number;
  reason: string;
  suggestedFields: string[];
}

// ============================================================
// DATA MODEL INFERENCE
// ============================================================

export class DataModelInference {
  private entityBuilder: EntityBuilder;

  constructor() {
    this.entityBuilder = new EntityBuilder();
  }

  /**
   * Infer complete data model from intelligence result
   */
  inferFromIntelligence(ctx: DataModelContext): UnifiedEntity[] {
    const entities: UnifiedEntity[] = [];
    const intel = ctx.intelligence;

    if (!intel) {
      return this.inferFromFeatures(ctx.features || [], ctx.industry);
    }

    // Build entities from inferred entities
    for (const inferred of intel.entities) {
      const entity = this.entityBuilder.buildFromInference(inferred, {
        industry: intel.industry.id,
        features: intel.features.map(f => f.id),
        existingEntities: entities,
      });
      entities.push(entity);
    }

    // Add entities implied by features but not explicitly mentioned
    const impliedEntities = this.inferImpliedEntities(intel);
    for (const implied of impliedEntities) {
      if (!entities.find(e => e.id === implied.id)) {
        entities.push(implied);
      }
    }

    // Resolve relationships between entities
    this.resolveRelationships(entities);

    // Add computed fields where appropriate
    this.addComputedFields(entities, intel.features);

    return entities;
  }

  /**
   * Infer entities from just features (when no explicit entities mentioned)
   */
  inferFromFeatures(features: DetectedFeature[], industry?: string): UnifiedEntity[] {
    const entities: UnifiedEntity[] = [];
    const featureIds = features.map(f => f.id);

    // Core entity suggestions based on features
    const suggestions = this.suggestEntitiesFromFeatures(featureIds, industry);

    for (const suggestion of suggestions) {
      const entity = this.entityBuilder.buildFromName(suggestion.name, { industry });
      entities.push(entity);
    }

    return entities;
  }

  /**
   * Infer field type from name and context
   */
  inferFieldType(fieldName: string, entityName: string, context?: string): UnifiedField['type'] {
    const lower = fieldName.toLowerCase();
    const entityLower = entityName.toLowerCase();

    // Email patterns
    if (lower.includes('email') || lower === 'e-mail') return 'email';

    // Phone patterns
    if (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel') || lower === 'cell') return 'phone';

    // URL patterns
    if (lower.includes('url') || lower.includes('website') || lower.includes('link') || lower.includes('href')) return 'url';

    // Date/time patterns
    if (lower.includes('datetime') || lower.includes('timestamp')) return 'datetime';
    if (lower.includes('date') || lower.includes('birthday') || lower.includes('due') || lower.includes('deadline') || lower.includes('born')) return 'date';
    if (lower.includes('time') && !lower.includes('datetime')) return 'time';

    // Money patterns
    if (lower.includes('price') || lower.includes('cost') || lower.includes('amount') || lower.includes('total') || 
        lower.includes('fee') || lower.includes('rate') || lower.includes('salary') || lower.includes('budget')) return 'currency';

    // Percentage patterns
    if (lower.includes('percent') || lower.includes('rate') || lower.includes('ratio')) return 'percentage';

    // Number patterns
    if (lower.includes('count') || lower.includes('quantity') || lower.includes('number') || lower.includes('age') || 
        lower.includes('size') || lower.includes('width') || lower.includes('height') || lower.includes('weight') ||
        lower.includes('score') || lower.includes('rating') || lower.includes('level')) return 'number';

    // Boolean patterns
    if (lower.includes('is') || lower.includes('has') || lower.includes('can') || lower.includes('should') ||
        lower.includes('active') || lower.includes('enabled') || lower.includes('completed') || lower.includes('done') ||
        lower.includes('paid') || lower.includes('verified') || lower.includes('approved')) return 'boolean';

    // Image patterns
    if (lower.includes('image') || lower.includes('photo') || lower.includes('picture') || lower.includes('avatar') ||
        lower.includes('logo') || lower.includes('thumbnail') || lower.includes('icon')) return 'image';

    // File patterns
    if (lower.includes('file') || lower.includes('attachment') || lower.includes('document') || lower.includes('resume') ||
        lower.includes('pdf') || lower.includes('upload')) return 'file';

    // Address patterns
    if (lower === 'address' || lower.includes('location') || lower.includes('street')) return 'address';

    // Long text patterns
    if (lower.includes('description') || lower.includes('notes') || lower.includes('content') || lower.includes('body') ||
        lower.includes('bio') || lower.includes('summary') || lower.includes('details') || lower.includes('comment')) return 'richtext';

    // Reference patterns (based on common naming conventions)
    if (lower.endsWith('id') && lower !== 'id') return 'reference';
    if (lower.endsWith('_id')) return 'reference';

    // Default to string
    return 'string';
  }

  /**
   * Suggest required fields for an entity type
   */
  suggestFieldsForEntity(entityName: string, industry?: string): Array<Partial<UnifiedField>> {
    const lower = entityName.toLowerCase();
    const fields: Array<Partial<UnifiedField>> = [];

    // Always suggest a name/title field first
    fields.push({
      id: 'name',
      name: 'Name',
      type: 'string',
      required: true,
    });

    // Entity-specific suggestions
    if (lower.includes('client') || lower.includes('customer') || lower.includes('contact')) {
      fields.push(
        { id: 'email', name: 'Email', type: 'email', required: true },
        { id: 'phone', name: 'Phone', type: 'phone' },
        { id: 'company', name: 'Company', type: 'string' },
        { id: 'notes', name: 'Notes', type: 'richtext' },
      );
    }

    if (lower.includes('job') || lower.includes('project') || lower.includes('task')) {
      fields.push(
        { id: 'description', name: 'Description', type: 'richtext' },
        { id: 'status', name: 'Status', type: 'enum' },
        { id: 'priority', name: 'Priority', type: 'enum' },
        { id: 'dueDate', name: 'Due Date', type: 'date' },
      );
    }

    if (lower.includes('invoice') || lower.includes('payment') || lower.includes('order')) {
      fields.push(
        { id: 'amount', name: 'Amount', type: 'currency', required: true },
        { id: 'status', name: 'Status', type: 'enum' },
        { id: 'dueDate', name: 'Due Date', type: 'date' },
        { id: 'notes', name: 'Notes', type: 'text' },
      );
    }

    if (lower.includes('appointment') || lower.includes('booking') || lower.includes('event')) {
      fields.push(
        { id: 'date', name: 'Date & Time', type: 'datetime', required: true },
        { id: 'duration', name: 'Duration (min)', type: 'number' },
        { id: 'location', name: 'Location', type: 'string' },
        { id: 'status', name: 'Status', type: 'enum' },
      );
    }

    if (lower.includes('product') || lower.includes('item') || lower.includes('inventory')) {
      fields.push(
        { id: 'sku', name: 'SKU', type: 'string', unique: true },
        { id: 'price', name: 'Price', type: 'currency', required: true },
        { id: 'quantity', name: 'Quantity', type: 'number', defaultValue: 0 },
        { id: 'image', name: 'Image', type: 'image' },
      );
    }

    // Industry-specific additions
    if (industry) {
      fields.push(...this.getIndustrySpecificFields(entityName, industry));
    }

    return fields;
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private inferImpliedEntities(intel: IntelligenceResult): UnifiedEntity[] {
    const implied: UnifiedEntity[] = [];
    const existingIds = intel.entities.map(e => e.id);

    // Check for feature-implied entities
    for (const feature of intel.features) {
      switch (feature.id) {
        case 'invoicing':
          if (!existingIds.includes('invoice')) {
            implied.push(this.entityBuilder.buildFromName('Invoice', { 
              industry: intel.industry.id 
            }));
          }
          break;

        case 'scheduling':
        case 'appointments':
        case 'calendar':
          if (!existingIds.includes('appointment') && !existingIds.includes('booking') && !existingIds.includes('event')) {
            implied.push(this.entityBuilder.buildFromName('Appointment', { 
              industry: intel.industry.id 
            }));
          }
          break;

        case 'messaging':
        case 'notifications':
          if (!existingIds.includes('message') && !existingIds.includes('notification')) {
            implied.push(this.entityBuilder.buildFromName('Message', { 
              industry: intel.industry.id 
            }));
          }
          break;

        case 'documents':
          if (!existingIds.includes('document')) {
            implied.push(this.entityBuilder.buildFromName('Document', { 
              industry: intel.industry.id 
            }));
          }
          break;

        case 'user_management':
        case 'roles':
          if (!existingIds.includes('user')) {
            implied.push(this.entityBuilder.buildFromName('User', { 
              industry: intel.industry.id 
            }));
          }
          break;
      }
    }

    return implied;
  }

  private suggestEntitiesFromFeatures(featureIds: string[], industry?: string): EntitySuggestion[] {
    const suggestions: EntitySuggestion[] = [];

    // CRM features
    if (featureIds.some(f => ['crud', 'search', 'filtering'].includes(f))) {
      suggestions.push({
        name: 'Item',
        confidence: 0.5,
        reason: 'Basic CRUD features detected',
        suggestedFields: ['name', 'description', 'status'],
      });
    }

    // Client management
    if (featureIds.some(f => ['client_portal', 'messaging', 'notifications'].includes(f))) {
      suggestions.push({
        name: 'Client',
        confidence: 0.8,
        reason: 'Client-related features detected',
        suggestedFields: ['name', 'email', 'phone', 'notes'],
      });
    }

    // Scheduling
    if (featureIds.some(f => ['calendar', 'scheduling', 'appointments', 'reminders'].includes(f))) {
      suggestions.push({
        name: 'Appointment',
        confidence: 0.9,
        reason: 'Scheduling features detected',
        suggestedFields: ['title', 'date', 'duration', 'status'],
      });
    }

    // Billing
    if (featureIds.some(f => ['invoicing', 'payments', 'billing'].includes(f))) {
      suggestions.push({
        name: 'Invoice',
        confidence: 0.9,
        reason: 'Billing features detected',
        suggestedFields: ['number', 'amount', 'dueDate', 'status'],
      });
    }

    // Inventory
    if (featureIds.includes('inventory')) {
      suggestions.push({
        name: 'Product',
        confidence: 0.9,
        reason: 'Inventory feature detected',
        suggestedFields: ['name', 'sku', 'price', 'quantity'],
      });
    }

    // Job tracking
    if (featureIds.some(f => ['job_tracking', 'pipelines', 'status_tracking'].includes(f))) {
      suggestions.push({
        name: 'Job',
        confidence: 0.8,
        reason: 'Job tracking features detected',
        suggestedFields: ['title', 'description', 'status', 'dueDate'],
      });
    }

    // Industry-specific defaults
    if (industry && suggestions.length === 0) {
      suggestions.push(...this.getIndustrySuggestions(industry));
    }

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private getIndustrySuggestions(industry: string): EntitySuggestion[] {
    const suggestions: Record<string, EntitySuggestion[]> = {
      trades: [
        { name: 'Job', confidence: 0.9, reason: 'Trades industry', suggestedFields: ['title', 'address', 'status'] },
        { name: 'Client', confidence: 0.9, reason: 'Trades industry', suggestedFields: ['name', 'phone', 'address'] },
      ],
      healthcare: [
        { name: 'Patient', confidence: 0.9, reason: 'Healthcare industry', suggestedFields: ['name', 'dob', 'phone'] },
        { name: 'Appointment', confidence: 0.9, reason: 'Healthcare industry', suggestedFields: ['date', 'patient', 'type'] },
      ],
      real_estate: [
        { name: 'Property', confidence: 0.9, reason: 'Real estate industry', suggestedFields: ['address', 'price', 'status'] },
        { name: 'Client', confidence: 0.8, reason: 'Real estate industry', suggestedFields: ['name', 'email', 'type'] },
      ],
      fitness: [
        { name: 'Workout', confidence: 0.9, reason: 'Fitness industry', suggestedFields: ['name', 'date', 'duration'] },
        { name: 'Exercise', confidence: 0.8, reason: 'Fitness industry', suggestedFields: ['name', 'sets', 'reps'] },
      ],
      services: [
        { name: 'Service', confidence: 0.9, reason: 'Services industry', suggestedFields: ['name', 'price', 'duration'] },
        { name: 'Client', confidence: 0.9, reason: 'Services industry', suggestedFields: ['name', 'email', 'phone'] },
        { name: 'Appointment', confidence: 0.8, reason: 'Services industry', suggestedFields: ['date', 'service', 'client'] },
      ],
    };

    return suggestions[industry] || [
      { name: 'Item', confidence: 0.5, reason: 'Default', suggestedFields: ['name', 'description', 'status'] },
    ];
  }

  private getIndustrySpecificFields(entityName: string, industry: string): Array<Partial<UnifiedField>> {
    const fields: Array<Partial<UnifiedField>> = [];
    const lower = entityName.toLowerCase();

    switch (industry) {
      case 'trades':
        if (lower.includes('job')) {
          fields.push(
            { id: 'serviceAddress', name: 'Service Address', type: 'address' },
            { id: 'photos', name: 'Photos', type: 'image' },
          );
        }
        break;

      case 'healthcare':
        if (lower.includes('patient')) {
          fields.push(
            { id: 'dateOfBirth', name: 'Date of Birth', type: 'date' },
            { id: 'insuranceId', name: 'Insurance ID', type: 'string' },
          );
        }
        break;

      case 'real_estate':
        if (lower.includes('property')) {
          fields.push(
            { id: 'bedrooms', name: 'Bedrooms', type: 'number' },
            { id: 'bathrooms', name: 'Bathrooms', type: 'number' },
            { id: 'sqft', name: 'Square Feet', type: 'number' },
          );
        }
        break;
    }

    return fields;
  }

  private resolveRelationships(entities: UnifiedEntity[]): void {
    const entityIds = new Set(entities.map(e => e.id));

    for (const entity of entities) {
      // Look for reference fields
      for (const field of entity.fields) {
        if (field.type === 'reference') {
          // Try to find the target entity
          let targetId = field.id.replace(/Id$/, '').replace(/_id$/, '');
          
          if (entityIds.has(targetId)) {
            field.reference = {
              entity: targetId,
              displayField: 'name',
              relationship: 'many_to_one',
            };

            // Add back-reference to target entity
            const targetEntity = entities.find(e => e.id === targetId);
            if (targetEntity) {
              targetEntity.relationships = targetEntity.relationships || [];
              targetEntity.relationships.push({
                id: `${entity.id}-${targetId}`,
                type: 'one_to_many',
                targetEntity: entity.id,
                foreignKey: field.id,
                backReference: entity.pluralName.toLowerCase(),
              });
            }
          }
        }
      }
    }
  }

  private addComputedFields(entities: UnifiedEntity[], features: DetectedFeature[]): void {
    const featureIds = features.map(f => f.id);

    for (const entity of entities) {
      // Add total computed field for billable entities
      if (entity.behaviors?.includes('billable')) {
        const hasLineItems = entity.fields.some(f => f.id.includes('item') || f.id.includes('line'));
        if (hasLineItems && !entity.fields.find(f => f.id === 'total')) {
          entity.fields.push(toField({
            id: 'total',
            name: 'Total',
            type: 'currency',
            computed: {
              expression: 'SUM(items.amount)',
              dependencies: ['items'],
            },
            display: { readonly: true },
          }));
        }
      }

      // Add progress computed field for trackable entities
      if (entity.behaviors?.includes('trackable') && featureIds.includes('progress_tracking')) {
        if (!entity.fields.find(f => f.id === 'progress')) {
          entity.fields.push(toField({
            id: 'progress',
            name: 'Progress',
            type: 'percentage',
            computed: {
              expression: 'COUNT(tasks.completed) / COUNT(tasks) * 100',
              dependencies: ['tasks'],
            },
            display: { readonly: true },
          }));
        }
      }
    }
  }
}
