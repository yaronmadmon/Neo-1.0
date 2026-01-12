import type { FieldType } from '../../types.js';

export type IndustryKitId =
  | 'plumber'
  | 'electrician'
  | 'contractor'
  | 'cleaning'
  | 'bakery'
  | 'restaurant'
  | 'salon'
  | 'real-estate'
  | 'home-organizer'
  | 'fitness-coach'
  | 'tutor'
  | 'photographer'
  | 'ecommerce'
  | 'mechanic'
  | 'handyman'
  | 'roofing'
  | 'hvac'
  | 'landscaping'
  | 'medical'
  | 'home-health'
  | 'services';

export interface IndustryFieldSpec {
  id: string;
  name: string;
  type: FieldType;
  required?: boolean;
  description?: string;
  enumOptions?: Array<{
    value: string;
    label: string;
    color?: string;
  }>;
  displayOptions?: {
    hidden?: boolean;
    readonly?: boolean;
    placeholder?: string;
    helpText?: string;
  };
  reference?: {
    targetEntity: string;
    displayField: string;
  };
}

export interface IndustryEntitySpec {
  id: string;
  name: string;
  pluralName: string;
  fields: IndustryFieldSpec[];
}

export interface IndustryKit {
  id: IndustryKitId;
  name: string;
  professions: string[];
  keywords: string[];
  dashboardType: 'operations' | 'sales' | 'service' | 'health';
  complexity: 'low' | 'medium' | 'high';
  uiStyle: 'light' | 'neutral' | 'bold';
  requiredModules: string[];
  optionalModules: string[];
  entities: IndustryEntitySpec[];
  pageTypes: string[];
  workflows: string[];
  automationRules: string[];
  metrics: string[];
}
