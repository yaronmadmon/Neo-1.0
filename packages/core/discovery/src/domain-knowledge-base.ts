/**
 * Domain Knowledge Base
 * Contains domain-specific knowledge about what features, data models, and flows
 * should be included in apps for each domain
 */

export interface Feature {
  id: string;
  name: string;
  description: string;
  required: boolean;
  dependencies?: string[];
  dataModels?: string[]; // Which data models this feature uses
  components?: string[]; // Which component types this feature uses
  integrations?: string[]; // Which integrations this feature uses
}

export interface DataModel {
  id: string;
  name: string;
  fields: Array<{
    id: string;
    name: string;
    type: string;
    required?: boolean;
    defaultValue?: unknown;
  }>;
}

export interface Flow {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: string;
    componentId?: string;
  };
  actions: Array<{
    type: string;
    [key: string]: unknown;
  }>;
}

export interface DomainKnowledge {
  domain: string;
  displayName: string;
  keywords: string[];
  description: string;
  standardFeatures: Feature[];
  optionalFeatures: Feature[];
  dataModels: DataModel[];
  typicalFlows: Flow[];
  integrations?: string[];
  questions?: Array<{
    id: string;
    question: string;
    type: 'choice' | 'text' | 'number' | 'boolean';
    options?: string[];
    required: boolean;
    category: string;
  }>;
}

export class DomainKnowledgeBase {
  private domains: Map<string, DomainKnowledge> = new Map();

  constructor() {
    this.loadDomains();
  }

  private loadDomains() {
    // Real Estate Domain
    this.domains.set('real_estate', {
      domain: 'real_estate',
      displayName: 'Real Estate Management',
      keywords: ['real estate', 'property', 'rental', 'tenant', 'landlord', 'lease', 'property management'],
      description: 'Comprehensive property and tenant management',
      standardFeatures: [
        {
          id: 'tenant_management',
          name: 'Tenant Management',
          description: 'Manage tenant information, contact details, and history',
          required: true,
          dataModels: ['tenant', 'contact'],
        },
        {
          id: 'lease_management',
          name: 'Lease Management',
          description: 'Create, track, and manage lease agreements',
          required: true,
          dataModels: ['lease'],
          dependencies: ['tenant_management'],
        },
        {
          id: 'rent_collection',
          name: 'Rent Collection',
          description: 'Track rent payments and payment history',
          required: true,
          dataModels: ['payment', 'invoice'],
          dependencies: ['lease_management'],
        },
        {
          id: 'property_listings',
          name: 'Property Listings',
          description: 'Manage property inventory and availability',
          required: true,
          dataModels: ['property'],
        },
        {
          id: 'maintenance_requests',
          name: 'Maintenance Requests',
          description: 'Track and manage maintenance requests from tenants',
          required: true,
          dataModels: ['maintenance_request'],
        },
      ],
      optionalFeatures: [
        {
          id: 'e_signing',
          name: 'E-Signing',
          description: 'Digital signature for lease agreements',
          required: false,
          dependencies: ['lease_management'],
          integrations: ['docusign', 'hellosign'],
        },
        {
          id: 'payment_processing',
          name: 'Payment Processing',
          description: 'Online payment collection and processing',
          required: false,
          dependencies: ['rent_collection'],
          integrations: ['stripe', 'paypal'],
        },
        {
          id: 'tenant_applications',
          name: 'Tenant Applications',
          description: 'Application form and screening for new tenants',
          required: false,
          dataModels: ['application'],
        },
        {
          id: 'background_checks',
          name: 'Background Checks',
          description: 'Tenant screening and background verification',
          required: false,
          dependencies: ['tenant_applications'],
        },
        {
          id: 'financial_reporting',
          name: 'Financial Reporting',
          description: 'Revenue, expenses, and profit reports',
          required: false,
          dependencies: ['rent_collection'],
        },
        {
          id: 'document_storage',
          name: 'Document Storage',
          description: 'Store leases, contracts, and other documents',
          required: false,
        },
      ],
      dataModels: [
        {
          id: 'property',
          name: 'Property',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'address', name: 'Address', type: 'string', required: true },
            { id: 'type', name: 'Type', type: 'string', required: true },
            { id: 'bedrooms', name: 'Bedrooms', type: 'number' },
            { id: 'bathrooms', name: 'Bathrooms', type: 'number' },
            { id: 'squareFeet', name: 'Square Feet', type: 'number' },
            { id: 'rentAmount', name: 'Monthly Rent', type: 'number' },
            { id: 'status', name: 'Status', type: 'string', defaultValue: 'available' },
          ],
        },
        {
          id: 'tenant',
          name: 'Tenant',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'name', name: 'Full Name', type: 'string', required: true },
            { id: 'email', name: 'Email', type: 'string', required: true },
            { id: 'phone', name: 'Phone', type: 'string' },
            { id: 'propertyId', name: 'Property ID', type: 'string' },
            { id: 'moveInDate', name: 'Move-In Date', type: 'date' },
            { id: 'moveOutDate', name: 'Move-Out Date', type: 'date' },
          ],
        },
        {
          id: 'lease',
          name: 'Lease',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'tenantId', name: 'Tenant ID', type: 'string', required: true },
            { id: 'propertyId', name: 'Property ID', type: 'string', required: true },
            { id: 'startDate', name: 'Start Date', type: 'date', required: true },
            { id: 'endDate', name: 'End Date', type: 'date', required: true },
            { id: 'monthlyRent', name: 'Monthly Rent', type: 'number', required: true },
            { id: 'securityDeposit', name: 'Security Deposit', type: 'number' },
            { id: 'status', name: 'Status', type: 'string', defaultValue: 'active' },
          ],
        },
        {
          id: 'payment',
          name: 'Payment',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'leaseId', name: 'Lease ID', type: 'string', required: true },
            { id: 'amount', name: 'Amount', type: 'number', required: true },
            { id: 'dueDate', name: 'Due Date', type: 'date', required: true },
            { id: 'paidDate', name: 'Paid Date', type: 'date' },
            { id: 'status', name: 'Status', type: 'string', defaultValue: 'pending' },
            { id: 'method', name: 'Payment Method', type: 'string' },
          ],
        },
        {
          id: 'maintenance_request',
          name: 'Maintenance Request',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'propertyId', name: 'Property ID', type: 'string', required: true },
            { id: 'tenantId', name: 'Tenant ID', type: 'string', required: true },
            { id: 'title', name: 'Title', type: 'string', required: true },
            { id: 'description', name: 'Description', type: 'string', required: true },
            { id: 'priority', name: 'Priority', type: 'string', defaultValue: 'medium' },
            { id: 'status', name: 'Status', type: 'string', defaultValue: 'open' },
            { id: 'createdDate', name: 'Created Date', type: 'date' },
            { id: 'resolvedDate', name: 'Resolved Date', type: 'date' },
          ],
        },
      ],
      typicalFlows: [
        {
          id: 'create_lease',
          name: 'Create Lease',
          description: 'Create a new lease agreement for a tenant',
          trigger: { type: 'form_submit', componentId: 'new-lease-form' },
          actions: [
            { type: 'create_record', model: 'lease' },
            { type: 'update_record', model: 'property', field: 'status', value: 'rented' },
          ],
        },
        {
          id: 'record_payment',
          name: 'Record Payment',
          description: 'Record a rent payment',
          trigger: { type: 'form_submit', componentId: 'payment-form' },
          actions: [
            { type: 'create_record', model: 'payment' },
            { type: 'update_record', model: 'lease', field: 'lastPaymentDate' },
          ],
        },
      ],
      integrations: ['stripe', 'docusign', 'zillow', 'quickbooks'],
      questions: [
        {
          id: 'focus',
          question: "What's your primary focus?",
          type: 'choice',
          options: ['Managing rental properties', 'Buying/selling properties', 'Both'],
          required: true,
          category: 'scope',
        },
        {
          id: 'payment_processing',
          question: 'Do you need online payment processing?',
          type: 'boolean',
          required: false,
          category: 'features',
        },
        {
          id: 'e_signing',
          question: 'Do you need e-signing for lease agreements?',
          type: 'boolean',
          required: false,
          category: 'features',
        },
        {
          id: 'property_count',
          question: 'How many properties are you managing?',
          type: 'choice',
          options: ['1-5 properties', '6-20 properties', '20+ properties'],
          required: false,
          category: 'scope',
        },
      ],
    });

    // Home Management Domain
    this.domains.set('home_management', {
      domain: 'home_management',
      displayName: 'Home & Family Management',
      keywords: ['home', 'family', 'household', 'domestic', 'house management', 'family management'],
      description: 'Organize and manage family life, schedules, and household tasks',
      standardFeatures: [
        {
          id: 'family_members',
          name: 'Family Members',
          description: 'Manage family member profiles and information',
          required: true,
          dataModels: ['family_member'],
        },
        {
          id: 'chores',
          name: 'Chores & Tasks',
          description: 'Assign and track household chores and tasks',
          required: true,
          dataModels: ['chore'],
        },
        {
          id: 'calendar',
          name: 'Family Calendar',
          description: 'Shared calendar for family events and appointments',
          required: true,
          dataModels: ['event'],
        },
      ],
      optionalFeatures: [
        {
          id: 'meal_planning',
          name: 'Meal Planning',
          description: 'Plan meals and generate grocery lists',
          required: false,
          dataModels: ['meal', 'recipe'],
        },
        {
          id: 'grocery_list',
          name: 'Grocery Lists',
          description: 'Shared shopping lists',
          required: false,
          dataModels: ['grocery_item'],
        },
        {
          id: 'kids_management',
          name: 'Kids Management',
          description: 'Track kids schedules, activities, and information',
          required: false,
          dataModels: ['child', 'activity'],
        },
        {
          id: 'pet_care',
          name: 'Pet Care',
          description: 'Manage pet information, vet appointments, and care schedules',
          required: false,
          dataModels: ['pet', 'vet_appointment'],
        },
        {
          id: 'doctor_appointments',
          name: 'Medical Appointments',
          description: 'Track doctor appointments and medical records',
          required: false,
          dataModels: ['appointment', 'medical_record'],
        },
        {
          id: 'school_schedules',
          name: 'School Schedules',
          description: 'Track school events, homework, and schedules',
          required: false,
          dataModels: ['school_event', 'homework'],
        },
        {
          id: 'home_maintenance',
          name: 'Home Maintenance',
          description: 'Track home maintenance tasks and schedules',
          required: false,
          dataModels: ['maintenance_task'],
        },
        {
          id: 'budget_tracking',
          name: 'Household Budget',
          description: 'Track household expenses and budget',
          required: false,
          dataModels: ['expense', 'budget'],
        },
      ],
      dataModels: [
        {
          id: 'family_member',
          name: 'Family Member',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'name', name: 'Name', type: 'string', required: true },
            { id: 'role', name: 'Role', type: 'string' },
            { id: 'email', name: 'Email', type: 'string' },
            { id: 'phone', name: 'Phone', type: 'string' },
            { id: 'avatar', name: 'Avatar', type: 'string' },
          ],
        },
        {
          id: 'chore',
          name: 'Chore',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'title', name: 'Title', type: 'string', required: true },
            { id: 'description', name: 'Description', type: 'string' },
            { id: 'assignedTo', name: 'Assigned To', type: 'string' },
            { id: 'frequency', name: 'Frequency', type: 'string', defaultValue: 'weekly' },
            { id: 'completed', name: 'Completed', type: 'boolean', defaultValue: false },
            { id: 'dueDate', name: 'Due Date', type: 'date' },
          ],
        },
        {
          id: 'event',
          name: 'Event',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'title', name: 'Title', type: 'string', required: true },
            { id: 'description', name: 'Description', type: 'string' },
            { id: 'startDate', name: 'Start Date', type: 'date', required: true },
            { id: 'endDate', name: 'End Date', type: 'date' },
            { id: 'participants', name: 'Participants', type: 'array' },
            { id: 'location', name: 'Location', type: 'string' },
            { id: 'type', name: 'Type', type: 'string' },
          ],
        },
      ],
      typicalFlows: [
        {
          id: 'assign_chore',
          name: 'Assign Chore',
          description: 'Assign a chore to a family member',
          trigger: { type: 'form_submit', componentId: 'assign-chore-form' },
          actions: [
            { type: 'create_record', model: 'chore' },
            { type: 'send_notification', target: 'assignedTo' },
          ],
        },
        {
          id: 'complete_chore',
          name: 'Complete Chore',
          description: 'Mark a chore as completed',
          trigger: { type: 'click', componentId: 'chore-item' },
          actions: [
            { type: 'update_record', model: 'chore', field: 'completed', value: true },
          ],
        },
      ],
      questions: [
        {
          id: 'family_size',
          question: 'How many family members will use this app?',
          type: 'choice',
          options: ['2-3 people', '4-5 people', '6+ people'],
          required: false,
          category: 'scope',
        },
        {
          id: 'has_children',
          question: 'Do you have children?',
          type: 'boolean',
          required: false,
          category: 'features',
        },
        {
          id: 'has_pets',
          question: 'Do you have pets?',
          type: 'boolean',
          required: false,
          category: 'features',
        },
        {
          id: 'meal_planning',
          question: 'Do you want meal planning features?',
          type: 'boolean',
          required: false,
          category: 'features',
        },
        {
          id: 'budget_tracking',
          question: 'Do you want household budget tracking?',
          type: 'boolean',
          required: false,
          category: 'features',
        },
      ],
    });
  }

  /**
   * Get domain knowledge by domain ID
   */
  getDomain(domainId: string): DomainKnowledge | undefined {
    return this.domains.get(domainId);
  }

  /**
   * Detect which domain(s) match the input
   */
  detectDomains(input: string): Array<{ domain: string; score: number }> {
    const lowerInput = input.toLowerCase();
    const matches: Array<{ domain: string; score: number }> = [];

    for (const [domainId, knowledge] of this.domains.entries()) {
      let score = 0;
      for (const keyword of knowledge.keywords) {
        if (lowerInput.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
      if (score > 0) {
        matches.push({ domain: domainId, score });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);
    return matches;
  }

  /**
   * Get all domains
   */
  getAllDomains(): DomainKnowledge[] {
    return Array.from(this.domains.values());
  }
}
