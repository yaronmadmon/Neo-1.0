import type { AppBlueprint, EntityDef, FieldDef, FieldType } from '../../types.js';
import type { GeneratedData as BaseGeneratedData, GeneratedRecord } from '../../data-generator.js';

export type GeneratedData = BaseGeneratedData;

const SAMPLE_NAMES = ['Alex Carter', 'Jordan Lee', 'Taylor Morgan', 'Riley Quinn', 'Casey Blake'];
const SAMPLE_COMPANIES = ['Bluewave Plumbing', 'Summit Electrical', 'Prime Build', 'CleanPro'];
const SAMPLE_STREETS = ['Oak St', 'Maple Ave', 'Pine Rd', 'Cedar Blvd', 'Elm St'];

export class DataModelGenerator {
  generate(blueprint: AppBlueprint): GeneratedData {
    const data: GeneratedData = {};

    for (const entity of blueprint.entities) {
      data[entity.id] = this.generateEntity(entity);
    }

    return data;
  }

  private generateEntity(entity: EntityDef): GeneratedRecord[] {
    const records: GeneratedRecord[] = [];
    for (let i = 0; i < 6; i += 1) {
      const record: GeneratedRecord = { id: `${entity.id}-${i + 1}` };
      for (const field of entity.fields) {
        if (field.id === 'id') continue;
        record[field.id] = this.generateFieldValue(entity, field, i);
      }
      records.push(record);
    }
    return records;
  }

  private generateFieldValue(entity: EntityDef, field: FieldDef, index: number): unknown {
    const key = field.id.toLowerCase();
    const type = field.type as FieldType;

    if (key.includes('name') && type === 'string') {
      if (key.includes('company') || entity.id === 'client') {
        return SAMPLE_COMPANIES[index % SAMPLE_COMPANIES.length];
      }
      return SAMPLE_NAMES[index % SAMPLE_NAMES.length];
    }
    if (key.includes('address')) {
      return `${100 + index} ${SAMPLE_STREETS[index % SAMPLE_STREETS.length]}`;
    }
    if (key.includes('phone')) {
      return `555-01${index}0${index}`;
    }
    if (key.includes('email')) {
      return `contact${index + 1}@example.com`;
    }
    if (key.includes('status') && field.enumOptions?.length) {
      return field.enumOptions[index % field.enumOptions.length].value;
    }
    if (key.includes('date') || type === 'date') {
      return this.futureDate(index, false);
    }
    if (type === 'datetime') {
      return this.futureDate(index, true);
    }
    if (type === 'currency' || key.includes('total') || key.includes('amount')) {
      return Number((120 + index * 45).toFixed(2));
    }
    if (type === 'number') {
      return 1 + index;
    }
    if (type === 'boolean') {
      return index % 2 === 0;
    }
    if (type === 'richtext') {
      return `Notes for ${entity.name} ${index + 1}`;
    }
    if (field.reference?.targetEntity) {
      return `${field.reference.targetEntity}-${(index % 3) + 1}`;
    }
    return `${field.name} ${index + 1}`;
  }

  private futureDate(index: number, withTime: boolean): string {
    const base = new Date();
    base.setDate(base.getDate() + index + 1);
    if (!withTime) {
      return base.toISOString().split('T')[0];
    }
    return base.toISOString();
  }
}
