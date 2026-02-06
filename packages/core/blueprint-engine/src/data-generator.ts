/**
 * Entity & Data Generator
 * Generates tables, fields, relations, and sample data from blueprint
 * 
 * ENHANCED: Now integrates with data-generator-templates for rich,
 * industry-specific sample data with real names, avatars, and contact info.
 */

import { randomUUID } from 'node:crypto';
import type { AppBlueprint, EntityDef, FieldDef } from './types.js';
import { getSampleDataForEntity } from './data-generator-templates.js';

// ============================================================
// DATA TYPES
// ============================================================

export interface GeneratedRecord {
  id: string;
  [key: string]: unknown;
}

export interface GeneratedData {
  [entityId: string]: GeneratedRecord[];
}

export interface TableSchema {
  id: string;
  name: string;
  fields: Array<{
    id: string;
    name: string;
    type: string;
    required: boolean;
    unique: boolean;
    reference?: {
      targetTable: string;
      displayField: string;
    };
    enumOptions?: Array<{ value: string; label: string }>;
    defaultValue?: unknown;
  }>;
  primaryKey: string;
  timestamps: boolean;
}

export interface DatabaseSchema {
  tables: TableSchema[];
  relations: Array<{
    from: { table: string; field: string };
    to: { table: string; field: string };
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  }>;
}

// ============================================================
// SAMPLE DATA TEMPLATES
// ============================================================

const SAMPLE_DATA = {
  names: {
    first: ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Chris', 'Amanda', 'James', 'Lisa'],
    last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Moore'],
    company: ['Acme Corp', 'Tech Solutions', 'Global Industries', 'Prime Services', 'Innovation Labs', 'Digital First', 'Cloud Nine', 'Blue Sky Inc', 'Green Valley', 'Sunrise Ventures'],
  },
  titles: ['Manager', 'Director', 'Engineer', 'Designer', 'Analyst', 'Consultant', 'Developer', 'Specialist', 'Coordinator', 'Lead'],
  products: ['Widget Pro', 'Super Gadget', 'Ultra Tool', 'Mega Device', 'Power Unit', 'Smart Module', 'Quick Fix', 'Easy Solution', 'Premium Kit', 'Basic Pack'],
  categories: ['Electronics', 'Home & Garden', 'Office Supplies', 'Tools', 'Sports', 'Fashion', 'Food', 'Health', 'Books', 'Toys'],
  descriptions: [
    'High-quality product for everyday use.',
    'Professional grade equipment.',
    'Perfect for home or office.',
    'Innovative design for modern needs.',
    'Reliable and durable construction.',
    'Easy to use and maintain.',
    'Compact and portable.',
    'Energy efficient solution.',
    'Premium materials and craftsmanship.',
    'Best value in its category.',
  ],
  tasks: [
    'Complete project documentation',
    'Review and approve design',
    'Schedule team meeting',
    'Update client on progress',
    'Fix reported bugs',
    'Prepare presentation',
    'Research new technologies',
    'Optimize performance',
    'Write test cases',
    'Deploy to production',
  ],
  notes: [
    'Follow up next week.',
    'High priority item.',
    'Needs manager approval.',
    'Client requested changes.',
    'In progress.',
    'Waiting for feedback.',
    'Ready for review.',
    'Completed successfully.',
    'Requires additional resources.',
    'On track for deadline.',
  ],
};

// ============================================================
// DATA GENERATOR
// ============================================================

export class DataGenerator {
  private referenceCache: Map<string, GeneratedRecord[]> = new Map();

  /**
   * Generate a complete database schema from blueprint
   */
  generateDatabaseSchema(blueprint: AppBlueprint): DatabaseSchema {
    const tables: TableSchema[] = [];
    const relations: DatabaseSchema['relations'] = [];

    for (const entity of blueprint.entities) {
      const table = this.generateTableSchema(entity);
      tables.push(table);

      // Extract relations
      for (const field of entity.fields) {
        if (field.type === 'reference' && field.reference) {
          relations.push({
            from: { table: entity.id, field: field.id },
            to: { table: field.reference.targetEntity, field: 'id' },
            type: field.reference.relationship || 'many-to-many',
          });
        }
      }
    }

    return { tables, relations };
  }

  /**
   * Generate table schema for an entity
   */
  private generateTableSchema(entity: EntityDef): TableSchema {
    return {
      id: entity.id,
      name: entity.name,
      fields: entity.fields.map(field => ({
        id: field.id,
        name: field.name,
        type: this.mapFieldTypeToDbType(field.type),
        required: field.required || false,
        unique: field.unique || false,
        reference: field.reference ? {
          targetTable: field.reference.targetEntity,
          displayField: field.reference.displayField,
        } : undefined,
        enumOptions: field.enumOptions?.map(o => ({ value: o.value, label: o.label })),
        defaultValue: field.defaultValue,
      })),
      primaryKey: 'id',
      timestamps: entity.timestamps?.createdAt || entity.timestamps?.updatedAt || true,
    };
  }

  /**
   * Map field type to database type
   */
  private mapFieldTypeToDbType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'VARCHAR(255)',
      'number': 'INTEGER',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'datetime': 'TIMESTAMP',
      'email': 'VARCHAR(255)',
      'url': 'VARCHAR(500)',
      'phone': 'VARCHAR(50)',
      'image': 'VARCHAR(500)',
      'file': 'VARCHAR(500)',
      'reference': 'UUID',
      'enum': 'VARCHAR(100)',
      'currency': 'DECIMAL(10,2)',
      'percentage': 'DECIMAL(5,2)',
      'richtext': 'TEXT',
      'json': 'JSON',
    };
    return typeMap[type] || 'VARCHAR(255)';
  }

  /**
   * Generate sample data for all entities
   * ENHANCED: Now uses industry-specific templates when available for rich, realistic data
   */
  generateSampleData(blueprint: AppBlueprint, recordsPerEntity: number = 5): GeneratedData {
    this.referenceCache.clear();
    const data: GeneratedData = {};

    // First pass: Generate all records (needed for references)
    // Try to use template data first for rich, industry-specific content
    // Extract industry from blueprint behavior or name for contextual templates
    const industry = blueprint.behavior || blueprint.name || '';
    
    for (const entity of blueprint.entities) {
      const templateData = getSampleDataForEntity(entity.id, industry);
      
      if (templateData.length > 0) {
        // Use template data - it has rich, realistic content
        const records = this.enrichTemplateData(entity, templateData, recordsPerEntity);
        data[entity.id] = records;
      } else {
        // Fall back to generic generation
        const records = this.generateEntityRecords(entity, recordsPerEntity);
        data[entity.id] = records;
      }
      
      this.referenceCache.set(entity.id, data[entity.id]);
    }

    // Second pass: Resolve references
    for (const entity of blueprint.entities) {
      for (const record of data[entity.id]) {
        for (const field of entity.fields) {
          if (field.type === 'reference' && field.reference) {
            const targetRecords = this.referenceCache.get(field.reference.targetEntity);
            if (targetRecords && targetRecords.length > 0) {
              // Randomly assign a reference
              const randomIndex = Math.floor(Math.random() * targetRecords.length);
              record[field.id] = targetRecords[randomIndex].id;
            }
          }
        }
      }
    }

    return data;
  }
  
  /**
   * Enrich template data with IDs, timestamps, and any missing fields
   * Also adds avatars for person entities and images for item entities
   */
  private enrichTemplateData(
    entity: EntityDef,
    templateData: Array<Record<string, unknown>>,
    maxRecords: number
  ): GeneratedRecord[] {
    const records: GeneratedRecord[] = [];
    const isPerson = this.isPersonEntity(entity);
    const isItem = this.isItemEntity(entity);
    
    // Use template data up to maxRecords, cycling if needed
    for (let i = 0; i < maxRecords; i++) {
      const templateRecord = templateData[i % templateData.length];
      const record: GeneratedRecord = {
        id: randomUUID(),
        ...templateRecord,
      };
      
      // Add avatar for person entities if not present
      if (isPerson && !record.avatar && !record.image && !record.photo) {
        const name = (record.name as string) || 'User';
        record.avatar = this.generateAvatarUrl(name, i);
      }
      
      // Add image for item entities if not present
      if (isItem && !record.image && !record.photo) {
        const itemName = (record.name as string) || entity.id;
        record.image = this.generateItemImageUrl(itemName, entity.id, i);
      }
      
      // Add timestamps if not present
      if (!record.createdAt) {
        const now = new Date();
        const createdAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        record.createdAt = createdAt.toISOString();
      }
      if (!record.updatedAt) {
        const createdAt = new Date(record.createdAt as string);
        record.updatedAt = new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
      }
      
      records.push(record);
    }
    
    return records;
  }
  
  /**
   * Check if entity represents a person type
   */
  private isPersonEntity(entity: EntityDef): boolean {
    const nameLower = entity.name.toLowerCase();
    const personKeywords = [
      'member', 'client', 'customer', 'patient', 'contact',
      'user', 'employee', 'staff', 'student', 'tenant', 'guest',
      'visitor', 'lead', 'prospect', 'homeowner', 'caregiver',
      'recipient', 'owner', 'instructor', 'trainer', 'technician',
      'provider', 'attendee', 'participant', 'person', 'people'
    ];
    return personKeywords.some(k => nameLower.includes(k));
  }
  
  /**
   * Check if entity represents an item/product type
   */
  private isItemEntity(entity: EntityDef): boolean {
    const nameLower = entity.name.toLowerCase();
    const itemKeywords = [
      'product', 'item', 'material', 'equipment', 'inventory',
      'menu', 'dish', 'food', 'service', 'package', 'plan',
      'class', 'course', 'property', 'vehicle', 'part'
    ];
    return itemKeywords.some(k => nameLower.includes(k));
  }
  
  /**
   * Generate avatar URL for person entities
   * Uses initials-based avatars with consistent colors per person
   */
  private generateAvatarUrl(name: string, index: number): string {
    // Use UI Avatars for nice, consistent avatars based on name
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
    const colors = ['6366f1', '8b5cf6', 'ec4899', '14b8a6', 'f59e0b', '10b981', '3b82f6', 'ef4444'];
    const bgColor = colors[index % colors.length];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bgColor}&color=fff&size=128`;
  }
  
  /**
   * Generate image URL for item entities
   * Uses placeholder images with consistent seeds
   */
  private generateItemImageUrl(itemName: string, entityId: string, index: number): string {
    // Use Lorem Picsum with seed for consistent images
    const seed = `${entityId}-${itemName.replace(/\s+/g, '-')}-${index}`;
    return `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/300`;
  }

  /**
   * Generate records for a single entity
   */
  private generateEntityRecords(entity: EntityDef, count: number): GeneratedRecord[] {
    const records: GeneratedRecord[] = [];

    for (let i = 0; i < count; i++) {
      const record: GeneratedRecord = { id: randomUUID() };

      for (const field of entity.fields) {
        if (field.id === 'id') continue;
        if (field.type === 'reference') {
          // Will be resolved in second pass
          record[field.id] = null;
          continue;
        }

        record[field.id] = this.generateFieldValue(field, entity, i);
      }

      // Add timestamps
      const now = new Date();
      const createdAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      record.createdAt = createdAt.toISOString();
      record.updatedAt = new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();

      records.push(record);
    }

    return records;
  }

  /**
   * Generate a value for a specific field
   */
  private generateFieldValue(field: FieldDef, entity: EntityDef, index: number): unknown {
    // Handle enums
    if (field.type === 'enum' && field.enumOptions) {
      const randomIndex = Math.floor(Math.random() * field.enumOptions.length);
      return field.enumOptions[randomIndex].value;
    }

    // Use default value if available
    if (field.defaultValue !== undefined) {
      return field.defaultValue;
    }

    // Generate based on field name and type
    const fieldName = field.id.toLowerCase();
    const fieldLabel = field.name.toLowerCase();

    // Name-based generation
    if (fieldName === 'name' || fieldName === 'title') {
      return this.generateContextualName(entity, index);
    }
    if (fieldName === 'email') {
      return this.generateEmail(index);
    }
    if (fieldName === 'phone' || fieldName === 'mobile' || fieldName === 'tel') {
      return this.generatePhone();
    }
    if (fieldName === 'company' || fieldName === 'organization') {
      return this.pickRandom(SAMPLE_DATA.names.company);
    }
    if (fieldLabel.includes('description') || fieldLabel.includes('notes')) {
      return this.pickRandom(SAMPLE_DATA.descriptions);
    }
    if (fieldName === 'address') {
      return this.generateAddress();
    }
    if (fieldName === 'city') {
      return this.pickRandom(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Francisco', 'Seattle', 'Boston', 'Denver', 'Austin']);
    }
    if (fieldName === 'state') {
      return this.pickRandom(['NY', 'CA', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'WA']);
    }
    if (fieldName === 'zipcode' || fieldName === 'zip') {
      return this.generateZipCode();
    }
    if (fieldName === 'price' || fieldName === 'amount' || fieldName === 'cost' || fieldName === 'value') {
      return Math.round(Math.random() * 10000 + 100) / 100;
    }
    if (fieldName === 'quantity' || fieldName === 'count') {
      return Math.floor(Math.random() * 100) + 1;
    }
    if (fieldName === 'sku') {
      return `SKU-${String(1000 + index).padStart(5, '0')}`;
    }

    // Type-based generation
    switch (field.type) {
      case 'string':
        return `Sample ${field.name} ${index + 1}`;
      case 'number':
        return Math.floor(Math.random() * 100);
      case 'boolean':
        return Math.random() > 0.5;
      case 'date':
        return this.generateDate();
      case 'datetime':
        return this.generateDateTime();
      case 'email':
        return this.generateEmail(index);
      case 'phone':
        return this.generatePhone();
      case 'url':
        return `https://example.com/${entity.id}/${index + 1}`;
      case 'image':
        // Generate avatar for person entities, product image for items
        if (this.isPersonEntity(entity) || fieldName === 'avatar' || fieldName === 'photo') {
          const name = `${this.pickRandom(SAMPLE_DATA.names.first)} ${this.pickRandom(SAMPLE_DATA.names.last)}`;
          return this.generateAvatarUrl(name, index);
        }
        return this.generateItemImageUrl(entity.name, entity.id, index);
      case 'currency':
        return Math.round(Math.random() * 10000 + 100) / 100;
      case 'percentage':
        return Math.round(Math.random() * 100);
      case 'richtext':
        return `<p>${this.pickRandom(SAMPLE_DATA.descriptions)}</p>`;
      default:
        return null;
    }
  }

  /**
   * Generate a contextual name based on entity type
   * ENHANCED: Now handles many more person-type entities (member, guest, tenant, etc.)
   */
  private generateContextualName(entity: EntityDef, index: number): string {
    const entityName = entity.name.toLowerCase();

    // Person types - generate realistic person names
    const personKeywords = [
      'contact', 'client', 'customer', 'person', 'member', 'tenant',
      'guest', 'visitor', 'patient', 'student', 'employee', 'staff',
      'user', 'lead', 'prospect', 'homeowner', 'caregiver', 'recipient',
      'owner', 'instructor', 'trainer', 'technician', 'provider',
      'attendee', 'participant'
    ];
    
    if (personKeywords.some(k => entityName.includes(k))) {
      return `${this.pickRandom(SAMPLE_DATA.names.first)} ${this.pickRandom(SAMPLE_DATA.names.last)}`;
    }
    
    if (entityName.includes('company') || entityName.includes('organization')) {
      return this.pickRandom(SAMPLE_DATA.names.company);
    }
    if (entityName.includes('product') || entityName.includes('item')) {
      return this.pickRandom(SAMPLE_DATA.products);
    }
    if (entityName.includes('task') || entityName.includes('todo')) {
      return this.pickRandom(SAMPLE_DATA.tasks);
    }
    if (entityName.includes('category')) {
      return this.pickRandom(SAMPLE_DATA.categories);
    }
    if (entityName.includes('workout') || entityName.includes('exercise')) {
      return this.pickRandom(['Morning Run', 'Strength Training', 'Yoga Session', 'HIIT Workout', 'Swimming', 'Cycling', 'CrossFit', 'Pilates']);
    }
    if (entityName.includes('habit')) {
      return this.pickRandom(['Drink Water', 'Exercise', 'Read 30 min', 'Meditate', 'Journal', 'Sleep 8 hours', 'Eat Healthy', 'Study']);
    }
    if (entityName.includes('recipe')) {
      return this.pickRandom(['Pasta Carbonara', 'Chicken Stir Fry', 'Greek Salad', 'Chocolate Cake', 'Veggie Soup', 'Grilled Salmon', 'Tacos', 'Pizza']);
    }
    if (entityName.includes('property')) {
      return this.pickRandom(['Modern Downtown Apartment', 'Suburban Family Home', 'Beachfront Condo', 'Mountain Retreat', 'City Loft', 'Country Estate']);
    }
    if (entityName.includes('deal') || entityName.includes('opportunity')) {
      return `${this.pickRandom(SAMPLE_DATA.names.company)} - ${this.pickRandom(['Enterprise Deal', 'Starter Package', 'Premium Plan', 'Custom Solution'])}`;
    }
    if (entityName.includes('event') || entityName.includes('appointment')) {
      return this.pickRandom(['Team Meeting', 'Client Call', 'Project Review', 'Training Session', 'Strategy Discussion', 'Demo Presentation']);
    }
    if (entityName.includes('service')) {
      return this.pickRandom(['Consultation', 'Installation', 'Maintenance', 'Training', 'Support Package', 'Premium Service']);
    }
    // Menu items / food
    if (entityName.includes('menu') || entityName.includes('dish') || entityName.includes('food')) {
      return this.pickRandom([
        'Grilled Salmon', 'Caesar Salad', 'Ribeye Steak', 'Pasta Carbonara',
        'Chicken Parmesan', 'Margherita Pizza', 'Thai Curry', 'Fish Tacos'
      ]);
    }
    // Materials / inventory
    if (entityName.includes('material') || entityName.includes('inventory')) {
      return this.pickRandom([
        'Copper Pipe 1/2"', 'PVC Elbow 90°', 'Wire 12 AWG', 'Circuit Breaker 20A',
        'Drywall Sheet 4x8', 'Joint Compound 5gal', 'Paint - Interior White'
      ]);
    }
    // Reservations
    if (entityName.includes('reservation') || entityName.includes('booking')) {
      const names = [`${this.pickRandom(SAMPLE_DATA.names.first)} ${this.pickRandom(SAMPLE_DATA.names.last)}`];
      return `${names[0]} - Table ${Math.floor(Math.random() * 20) + 1}`;
    }

    // Default
    return `${entity.name} ${index + 1}`;
  }

  /**
   * Generate email address
   */
  private generateEmail(index: number): string {
    const firstName = this.pickRandom(SAMPLE_DATA.names.first).toLowerCase();
    const lastName = this.pickRandom(SAMPLE_DATA.names.last).toLowerCase();
    const domain = this.pickRandom(['email.com', 'mail.com', 'example.com', 'test.com']);
    return `${firstName}.${lastName}${index}@${domain}`;
  }

  /**
   * Generate phone number
   */
  private generatePhone(): string {
    const areaCode = Math.floor(Math.random() * 900) + 100;
    const prefix = Math.floor(Math.random() * 900) + 100;
    const line = Math.floor(Math.random() * 9000) + 1000;
    return `(${areaCode}) ${prefix}-${line}`;
  }

  /**
   * Generate address
   */
  private generateAddress(): string {
    const number = Math.floor(Math.random() * 9999) + 1;
    const streets = ['Main St', 'Oak Ave', 'Maple Dr', 'Park Blvd', 'First St', 'Second Ave', 'Third St', 'Washington Ave'];
    return `${number} ${this.pickRandom(streets)}`;
  }

  /**
   * Generate zip code
   */
  private generateZipCode(): string {
    return String(Math.floor(Math.random() * 90000) + 10000);
  }

  /**
   * Generate date (recent past)
   */
  private generateDate(): string {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 60);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  }

  /**
   * Generate datetime (recent past)
   */
  private generateDateTime(): string {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const date = new Date(now.getTime() - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000);
    return date.toISOString();
  }

  /**
   * Pick random item from array
   */
  private pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Generate empty data structure (for new apps)
   */
  generateEmptyData(blueprint: AppBlueprint): GeneratedData {
    const data: GeneratedData = {};
    for (const entity of blueprint.entities) {
      data[entity.id] = [];
    }
    return data;
  }

  /**
   * Create a new record with default values
   */
  createDefaultRecord(entity: EntityDef): GeneratedRecord {
    const record: GeneratedRecord = { id: randomUUID() };

    for (const field of entity.fields) {
      if (field.id === 'id') continue;
      
      if (field.defaultValue !== undefined) {
        record[field.id] = field.defaultValue;
      } else if (field.type === 'boolean') {
        record[field.id] = false;
      } else if (field.type === 'number' || field.type === 'currency' || field.type === 'percentage') {
        record[field.id] = 0;
      } else {
        record[field.id] = null;
      }
    }

    record.createdAt = new Date().toISOString();
    record.updatedAt = new Date().toISOString();

    return record;
  }
}

// Export singleton
export const dataGenerator = new DataGenerator();
