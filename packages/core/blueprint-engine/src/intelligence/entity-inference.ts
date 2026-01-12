/**
 * Entity Inference Engine
 * 
 * Infers data entities and their structure from natural language.
 * Understands what "things" the user needs to track/manage.
 */

import type {
  ParsedInput,
  IndustryMapping,
  DetectedFeature,
  InferredEntity,
  InferredField,
  InferredRelationship,
  EntityBehavior,
  FieldType,
} from './types.js';

// ============================================================
// ENTITY TEMPLATES
// ============================================================

interface EntityTemplate {
  id: string;
  name: string;
  pluralName: string;
  triggers: string[];
  fields: Array<{
    id: string;
    name: string;
    type: FieldType;
    required: boolean;
    unique?: boolean;
  }>;
  behaviors: EntityBehavior[];
  relationships?: Array<{
    type: 'one_to_many' | 'many_to_many';
    target: string;
    fieldName: string;
  }>;
  icon?: string;
}

const ENTITY_TEMPLATES: EntityTemplate[] = [
  // PEOPLE
  {
    id: 'client',
    name: 'Client',
    pluralName: 'Clients',
    triggers: ['client', 'customer', 'account', 'lead', 'prospect', 'contact'],
    fields: [
      { id: 'name', name: 'Name', type: 'string', required: true },
      { id: 'email', name: 'Email', type: 'email', required: false },
      { id: 'phone', name: 'Phone', type: 'phone', required: false },
      { id: 'company', name: 'Company', type: 'string', required: false },
      { id: 'address', name: 'Address', type: 'address', required: false },
      { id: 'notes', name: 'Notes', type: 'text', required: false },
    ],
    behaviors: ['commentable', 'attachable'],
    icon: '👤',
  },
  {
    id: 'employee',
    name: 'Employee',
    pluralName: 'Employees',
    triggers: ['employee', 'staff', 'team member', 'worker', 'technician', 'crew'],
    fields: [
      { id: 'name', name: 'Name', type: 'string', required: true },
      { id: 'email', name: 'Email', type: 'email', required: true },
      { id: 'phone', name: 'Phone', type: 'phone', required: false },
      { id: 'role', name: 'Role', type: 'string', required: false },
      { id: 'hireDate', name: 'Hire Date', type: 'date', required: false },
      { id: 'status', name: 'Status', type: 'enum', required: true },
    ],
    behaviors: ['assignable'],
    icon: '👷',
  },
  {
    id: 'patient',
    name: 'Patient',
    pluralName: 'Patients',
    triggers: ['patient', 'member', 'participant'],
    fields: [
      { id: 'name', name: 'Name', type: 'string', required: true },
      { id: 'email', name: 'Email', type: 'email', required: false },
      { id: 'phone', name: 'Phone', type: 'phone', required: true },
      { id: 'dateOfBirth', name: 'Date of Birth', type: 'date', required: false },
      { id: 'address', name: 'Address', type: 'address', required: false },
      { id: 'emergencyContact', name: 'Emergency Contact', type: 'string', required: false },
    ],
    behaviors: ['commentable', 'attachable'],
    icon: '🏥',
  },

  // WORK ITEMS
  {
    id: 'job',
    name: 'Job',
    pluralName: 'Jobs',
    triggers: ['job', 'work order', 'service call', 'ticket', 'request'],
    fields: [
      { id: 'title', name: 'Title', type: 'string', required: true },
      { id: 'description', name: 'Description', type: 'text', required: false },
      { id: 'status', name: 'Status', type: 'enum', required: true },
      { id: 'priority', name: 'Priority', type: 'enum', required: false },
      { id: 'scheduledDate', name: 'Scheduled Date', type: 'datetime', required: false },
      { id: 'completedDate', name: 'Completed Date', type: 'datetime', required: false },
      { id: 'estimatedDuration', name: 'Est. Duration', type: 'number', required: false },
      { id: 'notes', name: 'Notes', type: 'text', required: false },
    ],
    behaviors: ['trackable', 'assignable', 'schedulable', 'commentable', 'attachable'],
    relationships: [
      { type: 'one_to_many', target: 'client', fieldName: 'clientId' },
      { type: 'one_to_many', target: 'employee', fieldName: 'assignedTo' },
    ],
    icon: '🔧',
  },
  {
    id: 'project',
    name: 'Project',
    pluralName: 'Projects',
    triggers: ['project', 'engagement', 'case', 'matter'],
    fields: [
      { id: 'name', name: 'Name', type: 'string', required: true },
      { id: 'description', name: 'Description', type: 'text', required: false },
      { id: 'status', name: 'Status', type: 'enum', required: true },
      { id: 'startDate', name: 'Start Date', type: 'date', required: false },
      { id: 'dueDate', name: 'Due Date', type: 'date', required: false },
      { id: 'budget', name: 'Budget', type: 'currency', required: false },
    ],
    behaviors: ['trackable', 'assignable', 'commentable', 'attachable'],
    relationships: [
      { type: 'one_to_many', target: 'client', fieldName: 'clientId' },
    ],
    icon: '📁',
  },
  {
    id: 'task',
    name: 'Task',
    pluralName: 'Tasks',
    triggers: ['task', 'todo', 'action item', 'to-do', 'checklist'],
    fields: [
      { id: 'title', name: 'Title', type: 'string', required: true },
      { id: 'description', name: 'Description', type: 'text', required: false },
      { id: 'completed', name: 'Completed', type: 'boolean', required: true },
      { id: 'dueDate', name: 'Due Date', type: 'date', required: false },
      { id: 'priority', name: 'Priority', type: 'enum', required: false },
    ],
    behaviors: ['trackable', 'assignable'],
    icon: '✅',
  },

  // SCHEDULING
  {
    id: 'appointment',
    name: 'Appointment',
    pluralName: 'Appointments',
    triggers: ['appointment', 'booking', 'reservation', 'session', 'meeting'],
    fields: [
      { id: 'title', name: 'Title', type: 'string', required: true },
      { id: 'startTime', name: 'Start Time', type: 'datetime', required: true },
      { id: 'endTime', name: 'End Time', type: 'datetime', required: true },
      { id: 'location', name: 'Location', type: 'string', required: false },
      { id: 'notes', name: 'Notes', type: 'text', required: false },
      { id: 'status', name: 'Status', type: 'enum', required: true },
    ],
    behaviors: ['schedulable', 'commentable'],
    relationships: [
      { type: 'one_to_many', target: 'client', fieldName: 'clientId' },
    ],
    icon: '📅',
  },
  {
    id: 'event',
    name: 'Event',
    pluralName: 'Events',
    triggers: ['event', 'activity', 'occurrence'],
    fields: [
      { id: 'name', name: 'Name', type: 'string', required: true },
      { id: 'description', name: 'Description', type: 'text', required: false },
      { id: 'startDate', name: 'Start Date', type: 'datetime', required: true },
      { id: 'endDate', name: 'End Date', type: 'datetime', required: false },
      { id: 'location', name: 'Location', type: 'string', required: false },
      { id: 'capacity', name: 'Capacity', type: 'number', required: false },
    ],
    behaviors: ['schedulable'],
    icon: '🎉',
  },

  // BILLING
  {
    id: 'invoice',
    name: 'Invoice',
    pluralName: 'Invoices',
    triggers: ['invoice', 'bill', 'statement'],
    fields: [
      { id: 'invoiceNumber', name: 'Invoice #', type: 'string', required: true, unique: true },
      { id: 'amount', name: 'Amount', type: 'currency', required: true },
      { id: 'dueDate', name: 'Due Date', type: 'date', required: true },
      { id: 'status', name: 'Status', type: 'enum', required: true },
      { id: 'paidDate', name: 'Paid Date', type: 'date', required: false },
      { id: 'notes', name: 'Notes', type: 'text', required: false },
    ],
    behaviors: ['trackable', 'billable', 'attachable'],
    relationships: [
      { type: 'one_to_many', target: 'client', fieldName: 'clientId' },
      { type: 'one_to_many', target: 'job', fieldName: 'jobId' },
    ],
    icon: '💰',
  },
  {
    id: 'quote',
    name: 'Quote',
    pluralName: 'Quotes',
    triggers: ['quote', 'estimate', 'proposal', 'bid'],
    fields: [
      { id: 'quoteNumber', name: 'Quote #', type: 'string', required: true, unique: true },
      { id: 'title', name: 'Title', type: 'string', required: true },
      { id: 'amount', name: 'Amount', type: 'currency', required: true },
      { id: 'validUntil', name: 'Valid Until', type: 'date', required: false },
      { id: 'status', name: 'Status', type: 'enum', required: true },
      { id: 'description', name: 'Description', type: 'text', required: false },
    ],
    behaviors: ['trackable', 'billable', 'attachable'],
    relationships: [
      { type: 'one_to_many', target: 'client', fieldName: 'clientId' },
    ],
    icon: '📋',
  },
  {
    id: 'payment',
    name: 'Payment',
    pluralName: 'Payments',
    triggers: ['payment', 'transaction', 'receipt'],
    fields: [
      { id: 'amount', name: 'Amount', type: 'currency', required: true },
      { id: 'paymentDate', name: 'Payment Date', type: 'date', required: true },
      { id: 'method', name: 'Method', type: 'enum', required: false },
      { id: 'reference', name: 'Reference', type: 'string', required: false },
      { id: 'notes', name: 'Notes', type: 'text', required: false },
    ],
    behaviors: ['billable'],
    relationships: [
      { type: 'one_to_many', target: 'invoice', fieldName: 'invoiceId' },
    ],
    icon: '💳',
  },

  // INVENTORY
  {
    id: 'product',
    name: 'Product',
    pluralName: 'Products',
    triggers: ['product', 'item', 'goods', 'merchandise'],
    fields: [
      { id: 'name', name: 'Name', type: 'string', required: true },
      { id: 'sku', name: 'SKU', type: 'string', required: false, unique: true },
      { id: 'description', name: 'Description', type: 'text', required: false },
      { id: 'price', name: 'Price', type: 'currency', required: true },
      { id: 'quantity', name: 'Quantity', type: 'number', required: true },
      { id: 'category', name: 'Category', type: 'string', required: false },
    ],
    behaviors: [],
    icon: '📦',
  },
  {
    id: 'material',
    name: 'Material',
    pluralName: 'Materials',
    triggers: ['material', 'supply', 'part', 'component', 'inventory'],
    fields: [
      { id: 'name', name: 'Name', type: 'string', required: true },
      { id: 'partNumber', name: 'Part #', type: 'string', required: false },
      { id: 'quantity', name: 'Quantity', type: 'number', required: true },
      { id: 'unit', name: 'Unit', type: 'string', required: false },
      { id: 'cost', name: 'Cost', type: 'currency', required: false },
      { id: 'reorderLevel', name: 'Reorder Level', type: 'number', required: false },
    ],
    behaviors: [],
    icon: '🔩',
  },

  // PROPERTIES
  {
    id: 'property',
    name: 'Property',
    pluralName: 'Properties',
    triggers: ['property', 'unit', 'building', 'listing', 'rental'],
    fields: [
      { id: 'address', name: 'Address', type: 'address', required: true },
      { id: 'type', name: 'Type', type: 'enum', required: true },
      { id: 'bedrooms', name: 'Bedrooms', type: 'number', required: false },
      { id: 'bathrooms', name: 'Bathrooms', type: 'number', required: false },
      { id: 'squareFeet', name: 'Square Feet', type: 'number', required: false },
      { id: 'rent', name: 'Rent', type: 'currency', required: false },
      { id: 'status', name: 'Status', type: 'enum', required: true },
    ],
    behaviors: ['trackable'],
    icon: '🏠',
  },

  // DOCUMENTS
  {
    id: 'document',
    name: 'Document',
    pluralName: 'Documents',
    triggers: ['document', 'file', 'contract', 'agreement'],
    fields: [
      { id: 'name', name: 'Name', type: 'string', required: true },
      { id: 'type', name: 'Type', type: 'enum', required: false },
      { id: 'file', name: 'File', type: 'file', required: true },
      { id: 'uploadDate', name: 'Upload Date', type: 'date', required: true },
      { id: 'notes', name: 'Notes', type: 'text', required: false },
    ],
    behaviors: ['attachable'],
    icon: '📄',
  },

  // NOTES & MESSAGES
  {
    id: 'note',
    name: 'Note',
    pluralName: 'Notes',
    triggers: ['note', 'memo', 'observation'],
    fields: [
      { id: 'title', name: 'Title', type: 'string', required: false },
      { id: 'content', name: 'Content', type: 'text', required: true },
    ],
    behaviors: ['commentable'],
    icon: '📝',
  },
  {
    id: 'message',
    name: 'Message',
    pluralName: 'Messages',
    triggers: ['message', 'notification', 'communication'],
    fields: [
      { id: 'subject', name: 'Subject', type: 'string', required: false },
      { id: 'body', name: 'Body', type: 'text', required: true },
      { id: 'sentAt', name: 'Sent At', type: 'datetime', required: true },
      { id: 'read', name: 'Read', type: 'boolean', required: true },
    ],
    behaviors: [],
    icon: '💬',
  },
];

// Field type inference patterns
const FIELD_TYPE_PATTERNS: Array<{ pattern: RegExp; type: FieldType }> = [
  { pattern: /email|e-mail/i, type: 'email' },
  { pattern: /phone|mobile|cell|tel/i, type: 'phone' },
  { pattern: /url|website|link|web/i, type: 'url' },
  { pattern: /price|cost|amount|total|fee|rate|salary|budget/i, type: 'currency' },
  { pattern: /percent|percentage|rate/i, type: 'percentage' },
  { pattern: /date|birthday|deadline|due|when|scheduled/i, type: 'date' },
  { pattern: /time|hour|start|end|at/i, type: 'time' },
  { pattern: /datetime|timestamp/i, type: 'datetime' },
  { pattern: /age|count|number|quantity|amount|size|years|days/i, type: 'number' },
  { pattern: /active|enabled|completed|done|checked|flag|is|has/i, type: 'boolean' },
  { pattern: /address|location|street|city/i, type: 'address' },
  { pattern: /image|photo|picture|avatar|logo/i, type: 'image' },
  { pattern: /file|document|attachment|upload/i, type: 'file' },
  { pattern: /description|notes|content|body|details|summary/i, type: 'text' },
];

// ============================================================
// ENTITY INFERENCE ENGINE
// ============================================================

export class EntityInferenceEngine {
  /**
   * Infer entities from parsed input
   */
  async infer(
    parsed: ParsedInput,
    industry: IndustryMapping,
    features: DetectedFeature[]
  ): Promise<InferredEntity[]> {
    const entities: InferredEntity[] = [];
    const inferredIds = new Set<string>();
    
    // Step 1: Match against templates
    const templateMatches = this.matchTemplates(parsed);
    for (const match of templateMatches) {
      if (!inferredIds.has(match.template.id)) {
        entities.push(this.templateToEntity(match.template, match.confidence));
        inferredIds.add(match.template.id);
      }
    }
    
    // Step 2: Infer from nouns
    for (const noun of parsed.nouns) {
      const entity = this.inferFromNoun(noun, parsed, inferredIds);
      if (entity && !inferredIds.has(entity.id)) {
        entities.push(entity);
        inferredIds.add(entity.id);
      }
    }
    
    // Step 3: Add industry-standard entities
    const industryEntities = this.getIndustryEntities(industry, features);
    for (const ie of industryEntities) {
      if (!inferredIds.has(ie.id)) {
        entities.push(ie);
        inferredIds.add(ie.id);
      }
    }
    
    // Step 4: Infer relationships between entities
    this.inferRelationships(entities);
    
    // Ensure at least one entity exists
    if (entities.length === 0) {
      entities.push(this.createGenericEntity(parsed));
    }
    
    return entities;
  }

  /**
   * Match input against entity templates
   */
  private matchTemplates(parsed: ParsedInput): Array<{ template: EntityTemplate; confidence: number }> {
    const matches: Array<{ template: EntityTemplate; confidence: number }> = [];
    const inputText = parsed.normalized;
    
    for (const template of ENTITY_TEMPLATES) {
      let score = 0;
      
      for (const trigger of template.triggers) {
        if (inputText.includes(trigger)) {
          score += 0.4;
        }
      }
      
      for (const noun of parsed.nouns) {
        if (template.triggers.some(t => t.includes(noun) || noun.includes(t))) {
          score += 0.3;
        }
      }
      
      if (score > 0.2) {
        matches.push({ template, confidence: Math.min(score, 1) });
      }
    }
    
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Convert template to inferred entity
   */
  private templateToEntity(template: EntityTemplate, confidence: number): InferredEntity {
    return {
      id: template.id,
      name: template.name,
      pluralName: template.pluralName,
      confidence,
      fields: template.fields.map(f => ({
        ...f,
        unique: f.unique || false,
        reasoning: 'Standard field for this entity type',
      })),
      relationships: template.relationships?.map(r => ({
        type: r.type === 'one_to_many' ? 'one_to_many' : 'many_to_many',
        targetEntity: r.target,
        fieldName: r.fieldName,
        required: false,
        cascadeDelete: false,
      })) || [],
      behaviors: template.behaviors,
      suggestedIcon: template.icon,
    };
  }

  /**
   * Infer entity from a noun
   */
  private inferFromNoun(
    noun: string,
    parsed: ParsedInput,
    existingIds: Set<string>
  ): InferredEntity | null {
    // Skip common non-entity words
    const skipWords = new Set([
      'app', 'application', 'system', 'tool', 'way', 'thing',
      'business', 'company', 'service', 'feature', 'page',
    ]);
    
    if (skipWords.has(noun.toLowerCase())) return null;
    
    // Check if matches any template trigger
    const template = ENTITY_TEMPLATES.find(t => 
      t.triggers.some(trigger => 
        trigger.includes(noun) || noun.includes(trigger)
      )
    );
    
    if (template) return null; // Already handled by template matching
    
    // Create custom entity from noun
    const entityId = this.toKebabCase(noun);
    if (existingIds.has(entityId)) return null;
    
    const fields = this.inferFieldsForNoun(noun, parsed);
    
    return {
      id: entityId,
      name: this.toTitleCase(noun),
      pluralName: this.pluralize(this.toTitleCase(noun)),
      confidence: 0.5,
      fields,
      relationships: [],
      behaviors: ['trackable'],
      suggestedIcon: '📊',
    };
  }

  /**
   * Infer fields for a custom entity
   */
  private inferFieldsForNoun(noun: string, parsed: ParsedInput): InferredField[] {
    const fields: InferredField[] = [
      {
        id: 'name',
        name: 'Name',
        type: 'string',
        required: true,
        unique: false,
        reasoning: 'Every entity needs a name',
      },
    ];
    
    // Infer from adjectives and modifiers
    for (const adj of parsed.adjectives) {
      const fieldType = this.inferFieldTypeFromWord(adj);
      if (fieldType) {
        fields.push({
          id: this.toCamelCase(adj),
          name: this.toTitleCase(adj),
          type: fieldType,
          required: false,
          unique: false,
          reasoning: `Inferred from adjective "${adj}"`,
        });
      }
    }
    
    // Add standard fields based on semantic intents
    if (parsed.intents.includes('scheduling')) {
      fields.push({
        id: 'date',
        name: 'Date',
        type: 'date',
        required: false,
        unique: false,
        reasoning: 'Entity is schedulable',
      });
    }
    
    if (parsed.intents.includes('tracking')) {
      fields.push({
        id: 'status',
        name: 'Status',
        type: 'enum',
        required: true,
        unique: false,
        reasoning: 'Entity has trackable status',
      });
    }
    
    // Add common fields
    fields.push(
      {
        id: 'description',
        name: 'Description',
        type: 'text',
        required: false,
        unique: false,
        reasoning: 'Standard description field',
      },
      {
        id: 'createdAt',
        name: 'Created At',
        type: 'datetime',
        required: false,
        unique: false,
        reasoning: 'Automatic timestamp',
      }
    );
    
    return fields;
  }

  /**
   * Infer field type from a word
   */
  private inferFieldTypeFromWord(word: string): FieldType | null {
    const lower = word.toLowerCase();
    
    for (const { pattern, type } of FIELD_TYPE_PATTERNS) {
      if (pattern.test(lower)) {
        return type;
      }
    }
    
    return null;
  }

  /**
   * Get standard entities for an industry
   */
  private getIndustryEntities(
    industry: IndustryMapping,
    features: DetectedFeature[]
  ): InferredEntity[] {
    const entities: InferredEntity[] = [];
    
    // Map industry to standard entities
    const industryEntityMap: Record<string, string[]> = {
      'trades': ['client', 'job', 'quote', 'invoice', 'material'],
      'healthcare': ['patient', 'appointment', 'invoice'],
      'hospitality': ['client', 'appointment', 'event'],
      'professional': ['client', 'project', 'invoice', 'document'],
      'creative': ['client', 'project', 'invoice'],
      'fitness': ['client', 'appointment', 'payment'],
      'retail': ['client', 'product', 'invoice'],
      'real_estate': ['client', 'property', 'appointment', 'document'],
      'education': ['client', 'appointment', 'event'],
      'personal': ['task', 'note', 'event'],
      'home': ['task', 'event', 'note'],
      'services': ['client', 'appointment', 'invoice'],
    };
    
    const standardEntityIds = industryEntityMap[industry.id] || ['client', 'task'];
    
    for (const entityId of standardEntityIds) {
      const template = ENTITY_TEMPLATES.find(t => t.id === entityId);
      if (template) {
        entities.push(this.templateToEntity(template, 0.6));
      }
    }
    
    // Add entities based on features
    const featureEntityMap: Record<string, string[]> = {
      'appointments': ['appointment'],
      'invoicing': ['invoice'],
      'quotes': ['quote'],
      'inventory': ['material', 'product'],
      'job_tracking': ['job'],
      'documents': ['document'],
      'messaging': ['message'],
    };
    
    for (const feature of features) {
      const featureEntities = featureEntityMap[feature.id];
      if (featureEntities) {
        for (const entityId of featureEntities) {
          if (!entities.find(e => e.id === entityId)) {
            const template = ENTITY_TEMPLATES.find(t => t.id === entityId);
            if (template) {
              entities.push(this.templateToEntity(template, 0.5));
            }
          }
        }
      }
    }
    
    return entities;
  }

  /**
   * Infer relationships between entities
   */
  private inferRelationships(entities: InferredEntity[]): void {
    const entityIds = new Set(entities.map(e => e.id));
    
    for (const entity of entities) {
      // Check if any template relationships target existing entities
      const template = ENTITY_TEMPLATES.find(t => t.id === entity.id);
      if (template?.relationships) {
        for (const rel of template.relationships) {
          if (entityIds.has(rel.target)) {
            const existing = entity.relationships.find(
              r => r.targetEntity === rel.target
            );
            if (!existing) {
              entity.relationships.push({
                type: rel.type === 'one_to_many' ? 'one_to_many' : 'many_to_many',
                targetEntity: rel.target,
                fieldName: rel.fieldName,
                required: false,
                cascadeDelete: false,
              });
            }
          }
        }
      }
    }
  }

  /**
   * Create a generic entity when nothing is detected
   */
  private createGenericEntity(parsed: ParsedInput): InferredEntity {
    const mainNoun = parsed.nouns[0] || 'Item';
    
    return {
      id: this.toKebabCase(mainNoun),
      name: this.toTitleCase(mainNoun),
      pluralName: this.pluralize(this.toTitleCase(mainNoun)),
      confidence: 0.4,
      fields: [
        { id: 'name', name: 'Name', type: 'string', required: true, unique: false, reasoning: 'Primary identifier' },
        { id: 'description', name: 'Description', type: 'text', required: false, unique: false, reasoning: 'Additional details' },
        { id: 'status', name: 'Status', type: 'enum', required: false, unique: false, reasoning: 'Track progress' },
        { id: 'createdAt', name: 'Created At', type: 'datetime', required: false, unique: false, reasoning: 'Timestamp' },
      ],
      relationships: [],
      behaviors: ['trackable'],
      suggestedIcon: '📋',
    };
  }

  // Helper methods
  private toKebabCase(str: string): string {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
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
    if (str.endsWith('y')) return str.slice(0, -1) + 'ies';
    if (str.endsWith('s') || str.endsWith('x') || str.endsWith('ch') || str.endsWith('sh')) return str + 'es';
    return str + 's';
  }

  /**
   * Get entity template by ID
   */
  getTemplate(id: string): EntityTemplate | undefined {
    return ENTITY_TEMPLATES.find(t => t.id === id);
  }
}
