/**
 * Entity & Data Generator
 * Generates tables, fields, relations, and sample data from blueprint
 */

import { randomUUID } from 'node:crypto';
import type { AppBlueprint, EntityDef, FieldDef } from './types.js';

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
   */
  generateSampleData(blueprint: AppBlueprint, recordsPerEntity: number = 5): GeneratedData {
    this.referenceCache.clear();
    const data: GeneratedData = {};

    // First pass: Generate all records (needed for references)
    for (const entity of blueprint.entities) {
      const records = this.generateEntityRecords(entity, recordsPerEntity);
      data[entity.id] = records;
      this.referenceCache.set(entity.id, records);
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
        return `https://picsum.photos/seed/${entity.id}${index}/400/300`;
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
   */
  private generateContextualName(entity: EntityDef, index: number): string {
    const entityName = entity.name.toLowerCase();

    if (entityName.includes('contact') || entityName.includes('client') || entityName.includes('customer') || entityName.includes('person')) {
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
