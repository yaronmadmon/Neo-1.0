/**
 * Behavior Bundles
 * Pre-defined behavior/kit definitions for common app types
 * Each bundle provides: entity definitions, default pages, workflow rules, layouts, naming conventions
 */

import type { EntityDef, PageDef, WorkflowDef, LayoutConfig } from './types.js';

// ============================================================
// BEHAVIOR BUNDLE INTERFACE
// ============================================================

export interface BehaviorBundle {
  id: string;
  name: string;
  description: string;
  category: string;
  keywords: string[];
  
  // Entity definitions
  entities: EntityDef[];
  
  // Default pages
  pages: PageDef[];
  
  // Workflow rules
  workflows: WorkflowDef[];
  
  // Default theme
  theme: {
    primaryColor: string;
    secondaryColor?: string;
    accentColor?: string;
  };
  
  // Naming conventions
  naming: {
    entityNaming: 'singular' | 'plural';
    routeStyle: 'kebab' | 'camel' | 'snake';
  };
  
  // Icon
  icon: string;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const createStandardIdField = (): EntityDef['fields'][0] => ({
  id: 'id',
  name: 'ID',
  type: 'string',
  required: true,
  unique: true,
  displayOptions: { hidden: true },
});

const createTimestampFields = (): EntityDef['fields'] => ([
  {
    id: 'createdAt',
    name: 'Created At',
    type: 'datetime',
    required: false,
    displayOptions: { readonly: true },
  },
  {
    id: 'updatedAt',
    name: 'Updated At',
    type: 'datetime',
    required: false,
    displayOptions: { readonly: true },
  },
]);

const createStandardListPage = (entityId: string, entityName: string, pluralName: string): PageDef => ({
  id: `${entityId}-list`,
  name: pluralName,
  route: `/${entityId}s`,
  type: 'list',
  entity: entityId,
  layout: {
    type: 'single-column',
    sections: [
      {
        id: 'header',
        type: 'header',
        components: ['page-title', 'add-button'],
      },
      {
        id: 'main',
        type: 'main',
        components: ['search', 'data-list'],
      },
    ],
  },
  components: [
    {
      id: 'page-title',
      type: 'text',
      props: { text: pluralName, variant: 'h1' },
    },
    {
      id: 'add-button',
      type: 'button',
      props: { label: `Add ${entityName}`, variant: 'primary' },
      events: { onClick: `create-${entityId}` },
    },
    {
      id: 'search',
      type: 'input',
      props: { placeholder: `Search ${pluralName.toLowerCase()}...`, type: 'search' },
    },
    {
      id: 'data-list',
      type: 'list',
      props: { source: entityId },
    },
  ],
  navigation: {
    showInSidebar: true,
    order: 1,
  },
});

const createStandardFormPage = (entityId: string, entityName: string, fields: EntityDef['fields']): PageDef => ({
  id: `${entityId}-form`,
  name: `Add ${entityName}`,
  route: `/${entityId}s/new`,
  type: 'form',
  entity: entityId,
  layout: {
    type: 'single-column',
    sections: [
      {
        id: 'header',
        type: 'header',
        components: ['page-title', 'back-button'],
      },
      {
        id: 'main',
        type: 'main',
        components: ['entity-form'],
      },
    ],
  },
  components: [
    {
      id: 'page-title',
      type: 'text',
      props: { text: `Add ${entityName}`, variant: 'h1' },
    },
    {
      id: 'back-button',
      type: 'button',
      props: { label: 'Back', variant: 'ghost' },
      events: { onClick: `navigate-${entityId}-list` },
    },
    {
      id: 'entity-form',
      type: 'form',
      props: { submitLabel: `Save ${entityName}` },
      children: fields
        .filter(f => f.id !== 'id' && !f.displayOptions?.hidden)
        .map(field => ({
          id: `field-${field.id}`,
          type: 'input',
          props: {
            name: field.id,
            label: field.name,
            type: field.type === 'number' ? 'number' : field.type === 'boolean' ? 'checkbox' : 'text',
            required: field.required,
            placeholder: field.displayOptions?.placeholder || `Enter ${field.name.toLowerCase()}`,
          },
        })),
    },
  ],
  navigation: {
    showInSidebar: false,
  },
});

const createStandardDetailPage = (entityId: string, entityName: string): PageDef => ({
  id: `${entityId}-detail`,
  name: `${entityName} Details`,
  route: `/${entityId}s/:id`,
  type: 'detail',
  entity: entityId,
  layout: {
    type: 'single-column',
    sections: [
      {
        id: 'header',
        type: 'header',
        components: ['page-title', 'action-buttons'],
      },
      {
        id: 'main',
        type: 'main',
        components: ['entity-details'],
      },
    ],
  },
  components: [
    {
      id: 'page-title',
      type: 'text',
      props: { text: entityName, variant: 'h1' },
      bindings: { text: 'name' },
    },
    {
      id: 'action-buttons',
      type: 'container',
      children: [
        {
          id: 'edit-button',
          type: 'button',
          props: { label: 'Edit', variant: 'secondary' },
        },
        {
          id: 'delete-button',
          type: 'button',
          props: { label: 'Delete', variant: 'danger' },
        },
      ],
    },
    {
      id: 'entity-details',
      type: 'card',
      props: { source: entityId },
    },
  ],
  navigation: {
    showInSidebar: false,
  },
});

const createStandardCrudWorkflows = (entityId: string, entityName: string): WorkflowDef[] => [
  {
    id: `create-${entityId}`,
    name: `Create ${entityName}`,
    enabled: true,
    trigger: {
      type: 'form_submit',
      componentId: 'entity-form',
    },
    actions: [
      {
        id: 'create-action',
        type: 'create_record',
        config: { entityId, source: 'form_data' },
      },
      {
        id: 'notify-success',
        type: 'show_notification',
        config: { message: `${entityName} created successfully!`, type: 'success' },
      },
      {
        id: 'navigate-back',
        type: 'navigate',
        config: { pageId: `${entityId}-list` },
      },
    ],
  },
  {
    id: `navigate-${entityId}-list`,
    name: `Go to ${entityName} List`,
    enabled: true,
    trigger: {
      type: 'button_click',
      componentId: 'back-button',
    },
    actions: [
      {
        id: 'navigate',
        type: 'navigate',
        config: { pageId: `${entityId}-list` },
      },
    ],
  },
];

// ============================================================
// CRM BUNDLE
// ============================================================

export const CRMBundle: BehaviorBundle = {
  id: 'crm',
  name: 'CRM',
  description: 'Customer Relationship Management system for managing contacts, leads, and deals',
  category: 'business',
  keywords: ['crm', 'customer', 'client', 'sales', 'lead', 'deal', 'contact', 'pipeline'],
  icon: '👥',
  
  entities: [
    {
      id: 'contact',
      name: 'Contact',
      pluralName: 'Contacts',
      description: 'Customer or prospect contact information',
      icon: '👤',
      fields: [
        createStandardIdField(),
        { id: 'name', name: 'Name', type: 'string', required: true },
        { id: 'email', name: 'Email', type: 'email', required: true },
        { id: 'phone', name: 'Phone', type: 'phone', required: false },
        { id: 'company', name: 'Company', type: 'string', required: false },
        { id: 'title', name: 'Job Title', type: 'string', required: false },
        {
          id: 'status',
          name: 'Status',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'lead', label: 'Lead', color: '#fbbf24' },
            { value: 'prospect', label: 'Prospect', color: '#60a5fa' },
            { value: 'customer', label: 'Customer', color: '#34d399' },
            { value: 'inactive', label: 'Inactive', color: '#9ca3af' },
          ],
          defaultValue: 'lead',
        },
        { id: 'notes', name: 'Notes', type: 'richtext', required: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'name',
        subtitleField: 'company',
        listFields: ['name', 'email', 'company', 'status'],
        searchFields: ['name', 'email', 'company'],
      },
    },
    {
      id: 'deal',
      name: 'Deal',
      pluralName: 'Deals',
      description: 'Sales opportunities and deals',
      icon: '💰',
      fields: [
        createStandardIdField(),
        { id: 'title', name: 'Title', type: 'string', required: true },
        { id: 'value', name: 'Value', type: 'currency', required: true },
        {
          id: 'contactId',
          name: 'Contact',
          type: 'reference',
          required: true,
          reference: { targetEntity: 'contact', displayField: 'name', relationship: 'many-to-many' },
        },
        {
          id: 'stage',
          name: 'Stage',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'qualification', label: 'Qualification', color: '#fbbf24' },
            { value: 'proposal', label: 'Proposal', color: '#60a5fa' },
            { value: 'negotiation', label: 'Negotiation', color: '#a78bfa' },
            { value: 'closed_won', label: 'Closed Won', color: '#34d399' },
            { value: 'closed_lost', label: 'Closed Lost', color: '#f87171' },
          ],
          defaultValue: 'qualification',
        },
        { id: 'closeDate', name: 'Expected Close Date', type: 'date', required: false },
        { id: 'notes', name: 'Notes', type: 'richtext', required: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'title',
        subtitleField: 'value',
        listFields: ['title', 'contactId', 'value', 'stage'],
        searchFields: ['title'],
      },
    },
    {
      id: 'activity',
      name: 'Activity',
      pluralName: 'Activities',
      description: 'Customer interactions and activities',
      icon: '📅',
      fields: [
        createStandardIdField(),
        {
          id: 'type',
          name: 'Type',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'call', label: 'Call', color: '#60a5fa' },
            { value: 'email', label: 'Email', color: '#34d399' },
            { value: 'meeting', label: 'Meeting', color: '#a78bfa' },
            { value: 'note', label: 'Note', color: '#fbbf24' },
          ],
        },
        { id: 'subject', name: 'Subject', type: 'string', required: true },
        {
          id: 'contactId',
          name: 'Contact',
          type: 'reference',
          required: true,
          reference: { targetEntity: 'contact', displayField: 'name', relationship: 'many-to-many' },
        },
        { id: 'date', name: 'Date', type: 'datetime', required: true },
        { id: 'description', name: 'Description', type: 'richtext', required: false },
        { id: 'completed', name: 'Completed', type: 'boolean', required: false, defaultValue: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'subject',
        subtitleField: 'type',
        listFields: ['type', 'subject', 'contactId', 'date', 'completed'],
        searchFields: ['subject', 'description'],
      },
    },
  ],
  
  pages: [],
  workflows: [],
  
  theme: {
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    accentColor: '#3b82f6',
  },
  
  naming: {
    entityNaming: 'singular',
    routeStyle: 'kebab',
  },
};

// ============================================================
// INVENTORY BUNDLE
// ============================================================

export const InventoryBundle: BehaviorBundle = {
  id: 'inventory',
  name: 'Inventory Management',
  description: 'Track and manage inventory, stock levels, and products',
  category: 'business',
  keywords: ['inventory', 'stock', 'product', 'warehouse', 'quantity', 'item', 'sku'],
  icon: '📦',
  
  entities: [
    {
      id: 'product',
      name: 'Product',
      pluralName: 'Products',
      description: 'Products and items in inventory',
      icon: '📦',
      fields: [
        createStandardIdField(),
        { id: 'name', name: 'Name', type: 'string', required: true },
        { id: 'sku', name: 'SKU', type: 'string', required: true, unique: true },
        { id: 'description', name: 'Description', type: 'richtext', required: false },
        {
          id: 'categoryId',
          name: 'Category',
          type: 'reference',
          required: false,
          reference: { targetEntity: 'category', displayField: 'name', relationship: 'many-to-many' },
        },
        { id: 'price', name: 'Price', type: 'currency', required: true },
        { id: 'cost', name: 'Cost', type: 'currency', required: false },
        { id: 'quantity', name: 'Quantity', type: 'number', required: true, defaultValue: 0 },
        { id: 'minStock', name: 'Min Stock Level', type: 'number', required: false, defaultValue: 10 },
        {
          id: 'status',
          name: 'Status',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'active', label: 'Active', color: '#34d399' },
            { value: 'low_stock', label: 'Low Stock', color: '#fbbf24' },
            { value: 'out_of_stock', label: 'Out of Stock', color: '#f87171' },
            { value: 'discontinued', label: 'Discontinued', color: '#9ca3af' },
          ],
          defaultValue: 'active',
        },
        { id: 'image', name: 'Image', type: 'image', required: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'name',
        subtitleField: 'sku',
        imageField: 'image',
        listFields: ['name', 'sku', 'quantity', 'price', 'status'],
        searchFields: ['name', 'sku', 'description'],
      },
    },
    {
      id: 'category',
      name: 'Category',
      pluralName: 'Categories',
      description: 'Product categories',
      icon: '📁',
      fields: [
        createStandardIdField(),
        { id: 'name', name: 'Name', type: 'string', required: true },
        { id: 'description', name: 'Description', type: 'string', required: false },
        { id: 'color', name: 'Color', type: 'string', required: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'name',
        listFields: ['name', 'description'],
        searchFields: ['name'],
      },
    },
    {
      id: 'stockMovement',
      name: 'Stock Movement',
      pluralName: 'Stock Movements',
      description: 'Track stock in/out movements',
      icon: '🔄',
      fields: [
        createStandardIdField(),
        {
          id: 'productId',
          name: 'Product',
          type: 'reference',
          required: true,
          reference: { targetEntity: 'product', displayField: 'name', relationship: 'many-to-many' },
        },
        {
          id: 'type',
          name: 'Type',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'in', label: 'Stock In', color: '#34d399' },
            { value: 'out', label: 'Stock Out', color: '#f87171' },
            { value: 'adjustment', label: 'Adjustment', color: '#fbbf24' },
          ],
        },
        { id: 'quantity', name: 'Quantity', type: 'number', required: true },
        { id: 'date', name: 'Date', type: 'datetime', required: true },
        { id: 'notes', name: 'Notes', type: 'string', required: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'productId',
        subtitleField: 'type',
        listFields: ['productId', 'type', 'quantity', 'date'],
        searchFields: ['notes'],
      },
    },
  ],
  
  pages: [],
  workflows: [],
  
  theme: {
    primaryColor: '#059669',
    secondaryColor: '#047857',
    accentColor: '#10b981',
  },
  
  naming: {
    entityNaming: 'singular',
    routeStyle: 'kebab',
  },
};

// ============================================================
// FITNESS BUNDLE
// ============================================================

export const FitnessBundle: BehaviorBundle = {
  id: 'fitness',
  name: 'Fitness Tracker',
  description: 'Track workouts, exercises, and fitness goals',
  category: 'health',
  keywords: ['fitness', 'workout', 'exercise', 'gym', 'training', 'health', 'weight', 'cardio'],
  icon: '💪',
  
  entities: [
    {
      id: 'workout',
      name: 'Workout',
      pluralName: 'Workouts',
      description: 'Workout sessions',
      icon: '🏋️',
      fields: [
        createStandardIdField(),
        { id: 'name', name: 'Name', type: 'string', required: true },
        { id: 'date', name: 'Date', type: 'date', required: true },
        {
          id: 'type',
          name: 'Type',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'strength', label: 'Strength', color: '#f87171' },
            { value: 'cardio', label: 'Cardio', color: '#60a5fa' },
            { value: 'flexibility', label: 'Flexibility', color: '#34d399' },
            { value: 'hiit', label: 'HIIT', color: '#fbbf24' },
            { value: 'sports', label: 'Sports', color: '#a78bfa' },
          ],
        },
        { id: 'duration', name: 'Duration (min)', type: 'number', required: true },
        { id: 'caloriesBurned', name: 'Calories Burned', type: 'number', required: false },
        { id: 'notes', name: 'Notes', type: 'richtext', required: false },
        { id: 'completed', name: 'Completed', type: 'boolean', required: false, defaultValue: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'name',
        subtitleField: 'type',
        listFields: ['name', 'type', 'date', 'duration', 'completed'],
        searchFields: ['name', 'notes'],
      },
    },
    {
      id: 'exercise',
      name: 'Exercise',
      pluralName: 'Exercises',
      description: 'Individual exercises within workouts',
      icon: '🎯',
      fields: [
        createStandardIdField(),
        { id: 'name', name: 'Name', type: 'string', required: true },
        {
          id: 'workoutId',
          name: 'Workout',
          type: 'reference',
          required: true,
          reference: { targetEntity: 'workout', displayField: 'name', relationship: 'many-to-many' },
        },
        { id: 'sets', name: 'Sets', type: 'number', required: false },
        { id: 'reps', name: 'Reps', type: 'number', required: false },
        { id: 'weight', name: 'Weight (lbs)', type: 'number', required: false },
        { id: 'distance', name: 'Distance (miles)', type: 'number', required: false },
        { id: 'duration', name: 'Duration (min)', type: 'number', required: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'name',
        listFields: ['name', 'sets', 'reps', 'weight'],
        searchFields: ['name'],
      },
    },
    {
      id: 'goal',
      name: 'Goal',
      pluralName: 'Goals',
      description: 'Fitness goals and targets',
      icon: '🎯',
      fields: [
        createStandardIdField(),
        { id: 'title', name: 'Title', type: 'string', required: true },
        { id: 'description', name: 'Description', type: 'string', required: false },
        {
          id: 'type',
          name: 'Type',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'weight', label: 'Weight Goal', color: '#f87171' },
            { value: 'strength', label: 'Strength Goal', color: '#60a5fa' },
            { value: 'endurance', label: 'Endurance Goal', color: '#34d399' },
            { value: 'habit', label: 'Habit Goal', color: '#fbbf24' },
          ],
        },
        { id: 'targetValue', name: 'Target Value', type: 'number', required: true },
        { id: 'currentValue', name: 'Current Value', type: 'number', required: false, defaultValue: 0 },
        { id: 'unit', name: 'Unit', type: 'string', required: false },
        { id: 'deadline', name: 'Deadline', type: 'date', required: false },
        { id: 'completed', name: 'Completed', type: 'boolean', required: false, defaultValue: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'title',
        subtitleField: 'type',
        listFields: ['title', 'type', 'targetValue', 'currentValue', 'deadline', 'completed'],
        searchFields: ['title', 'description'],
      },
    },
  ],
  
  pages: [],
  workflows: [],
  
  theme: {
    primaryColor: '#ec4899',
    secondaryColor: '#db2777',
    accentColor: '#f472b6',
  },
  
  naming: {
    entityNaming: 'singular',
    routeStyle: 'kebab',
  },
};

// ============================================================
// REAL ESTATE BUNDLE
// ============================================================

export const RealEstateBundle: BehaviorBundle = {
  id: 'real-estate',
  name: 'Real Estate',
  description: 'Property management and real estate listings',
  category: 'business',
  keywords: ['real estate', 'property', 'listing', 'rental', 'house', 'apartment', 'tenant', 'landlord'],
  icon: '🏠',
  
  entities: [
    {
      id: 'property',
      name: 'Property',
      pluralName: 'Properties',
      description: 'Real estate properties',
      icon: '🏠',
      fields: [
        createStandardIdField(),
        { id: 'title', name: 'Title', type: 'string', required: true },
        { id: 'address', name: 'Address', type: 'string', required: true },
        { id: 'city', name: 'City', type: 'string', required: true },
        { id: 'state', name: 'State', type: 'string', required: false },
        { id: 'zipCode', name: 'Zip Code', type: 'string', required: false },
        {
          id: 'type',
          name: 'Type',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'house', label: 'House', color: '#60a5fa' },
            { value: 'apartment', label: 'Apartment', color: '#34d399' },
            { value: 'condo', label: 'Condo', color: '#a78bfa' },
            { value: 'commercial', label: 'Commercial', color: '#fbbf24' },
            { value: 'land', label: 'Land', color: '#9ca3af' },
          ],
        },
        { id: 'bedrooms', name: 'Bedrooms', type: 'number', required: false },
        { id: 'bathrooms', name: 'Bathrooms', type: 'number', required: false },
        { id: 'sqft', name: 'Square Feet', type: 'number', required: false },
        { id: 'price', name: 'Price', type: 'currency', required: true },
        {
          id: 'status',
          name: 'Status',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'available', label: 'Available', color: '#34d399' },
            { value: 'pending', label: 'Pending', color: '#fbbf24' },
            { value: 'sold', label: 'Sold', color: '#60a5fa' },
            { value: 'rented', label: 'Rented', color: '#a78bfa' },
          ],
          defaultValue: 'available',
        },
        { id: 'description', name: 'Description', type: 'richtext', required: false },
        { id: 'image', name: 'Image', type: 'image', required: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'title',
        subtitleField: 'address',
        imageField: 'image',
        listFields: ['title', 'type', 'bedrooms', 'bathrooms', 'price', 'status'],
        searchFields: ['title', 'address', 'city', 'description'],
      },
    },
    {
      id: 'client',
      name: 'Client',
      pluralName: 'Clients',
      description: 'Buyers, sellers, and renters',
      icon: '👤',
      fields: [
        createStandardIdField(),
        { id: 'name', name: 'Name', type: 'string', required: true },
        { id: 'email', name: 'Email', type: 'email', required: true },
        { id: 'phone', name: 'Phone', type: 'phone', required: false },
        {
          id: 'type',
          name: 'Type',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'buyer', label: 'Buyer', color: '#60a5fa' },
            { value: 'seller', label: 'Seller', color: '#34d399' },
            { value: 'renter', label: 'Renter', color: '#fbbf24' },
            { value: 'landlord', label: 'Landlord', color: '#a78bfa' },
          ],
        },
        { id: 'budget', name: 'Budget', type: 'currency', required: false },
        { id: 'notes', name: 'Notes', type: 'richtext', required: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'name',
        subtitleField: 'type',
        listFields: ['name', 'email', 'type', 'budget'],
        searchFields: ['name', 'email'],
      },
    },
    {
      id: 'showing',
      name: 'Showing',
      pluralName: 'Showings',
      description: 'Property showings and appointments',
      icon: '📅',
      fields: [
        createStandardIdField(),
        {
          id: 'propertyId',
          name: 'Property',
          type: 'reference',
          required: true,
          reference: { targetEntity: 'property', displayField: 'title', relationship: 'many-to-many' },
        },
        {
          id: 'clientId',
          name: 'Client',
          type: 'reference',
          required: true,
          reference: { targetEntity: 'client', displayField: 'name', relationship: 'many-to-many' },
        },
        { id: 'date', name: 'Date', type: 'datetime', required: true },
        {
          id: 'status',
          name: 'Status',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'scheduled', label: 'Scheduled', color: '#60a5fa' },
            { value: 'completed', label: 'Completed', color: '#34d399' },
            { value: 'cancelled', label: 'Cancelled', color: '#f87171' },
          ],
          defaultValue: 'scheduled',
        },
        { id: 'notes', name: 'Notes', type: 'string', required: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'propertyId',
        subtitleField: 'clientId',
        listFields: ['propertyId', 'clientId', 'date', 'status'],
        searchFields: ['notes'],
      },
    },
  ],
  
  pages: [],
  workflows: [],
  
  theme: {
    primaryColor: '#0891b2',
    secondaryColor: '#0e7490',
    accentColor: '#22d3ee',
  },
  
  naming: {
    entityNaming: 'singular',
    routeStyle: 'kebab',
  },
};

// ============================================================
// HOME MANAGEMENT BUNDLE
// ============================================================

export const HomeManagementBundle: BehaviorBundle = {
  id: 'home-management',
  name: 'Home Management',
  description: 'Manage household tasks, chores, and family activities',
  category: 'home',
  keywords: ['home', 'family', 'chores', 'household', 'cleaning', 'shopping', 'maintenance'],
  icon: '🏡',
  
  entities: [
    {
      id: 'task',
      name: 'Task',
      pluralName: 'Tasks',
      description: 'Household tasks and chores',
      icon: '✅',
      fields: [
        createStandardIdField(),
        { id: 'title', name: 'Title', type: 'string', required: true },
        { id: 'description', name: 'Description', type: 'string', required: false },
        {
          id: 'category',
          name: 'Category',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'cleaning', label: 'Cleaning', color: '#60a5fa' },
            { value: 'maintenance', label: 'Maintenance', color: '#fbbf24' },
            { value: 'shopping', label: 'Shopping', color: '#34d399' },
            { value: 'cooking', label: 'Cooking', color: '#f87171' },
            { value: 'errands', label: 'Errands', color: '#a78bfa' },
            { value: 'other', label: 'Other', color: '#9ca3af' },
          ],
        },
        { id: 'assignedTo', name: 'Assigned To', type: 'string', required: false },
        { id: 'dueDate', name: 'Due Date', type: 'date', required: false },
        {
          id: 'priority',
          name: 'Priority',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'low', label: 'Low', color: '#34d399' },
            { value: 'medium', label: 'Medium', color: '#fbbf24' },
            { value: 'high', label: 'High', color: '#f87171' },
          ],
          defaultValue: 'medium',
        },
        {
          id: 'frequency',
          name: 'Frequency',
          type: 'enum',
          required: false,
          enumOptions: [
            { value: 'once', label: 'One-time', color: '#9ca3af' },
            { value: 'daily', label: 'Daily', color: '#60a5fa' },
            { value: 'weekly', label: 'Weekly', color: '#34d399' },
            { value: 'monthly', label: 'Monthly', color: '#fbbf24' },
          ],
          defaultValue: 'once',
        },
        { id: 'completed', name: 'Completed', type: 'boolean', required: false, defaultValue: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'title',
        subtitleField: 'category',
        listFields: ['title', 'category', 'assignedTo', 'dueDate', 'priority', 'completed'],
        searchFields: ['title', 'description'],
      },
    },
    {
      id: 'shoppingItem',
      name: 'Shopping Item',
      pluralName: 'Shopping List',
      description: 'Items to buy',
      icon: '🛒',
      fields: [
        createStandardIdField(),
        { id: 'name', name: 'Item', type: 'string', required: true },
        { id: 'quantity', name: 'Quantity', type: 'number', required: false, defaultValue: 1 },
        { id: 'unit', name: 'Unit', type: 'string', required: false },
        {
          id: 'category',
          name: 'Category',
          type: 'enum',
          required: false,
          enumOptions: [
            { value: 'groceries', label: 'Groceries', color: '#34d399' },
            { value: 'household', label: 'Household', color: '#60a5fa' },
            { value: 'personal', label: 'Personal', color: '#a78bfa' },
            { value: 'other', label: 'Other', color: '#9ca3af' },
          ],
          defaultValue: 'groceries',
        },
        { id: 'purchased', name: 'Purchased', type: 'boolean', required: false, defaultValue: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'name',
        subtitleField: 'category',
        listFields: ['name', 'quantity', 'category', 'purchased'],
        searchFields: ['name'],
      },
    },
    {
      id: 'event',
      name: 'Event',
      pluralName: 'Events',
      description: 'Family events and appointments',
      icon: '📅',
      fields: [
        createStandardIdField(),
        { id: 'title', name: 'Title', type: 'string', required: true },
        { id: 'description', name: 'Description', type: 'string', required: false },
        { id: 'date', name: 'Date', type: 'datetime', required: true },
        { id: 'endDate', name: 'End Date', type: 'datetime', required: false },
        { id: 'location', name: 'Location', type: 'string', required: false },
        { id: 'attendees', name: 'Attendees', type: 'string', required: false },
        { id: 'reminder', name: 'Reminder', type: 'boolean', required: false, defaultValue: true },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'title',
        subtitleField: 'date',
        listFields: ['title', 'date', 'location'],
        searchFields: ['title', 'description', 'location'],
      },
    },
  ],
  
  pages: [],
  workflows: [],
  
  theme: {
    primaryColor: '#10b981',
    secondaryColor: '#059669',
    accentColor: '#34d399',
  },
  
  naming: {
    entityNaming: 'singular',
    routeStyle: 'kebab',
  },
};

// ============================================================
// COOKING / RECIPES BUNDLE
// ============================================================

export const CookingBundle: BehaviorBundle = {
  id: 'cooking',
  name: 'Recipe & Cooking',
  description: 'Manage recipes, meal planning, and cooking',
  category: 'personal',
  keywords: ['recipe', 'cooking', 'meal', 'food', 'kitchen', 'ingredient', 'menu', 'chef'],
  icon: '🍳',
  
  entities: [
    {
      id: 'recipe',
      name: 'Recipe',
      pluralName: 'Recipes',
      description: 'Cooking recipes',
      icon: '📖',
      fields: [
        createStandardIdField(),
        { id: 'name', name: 'Name', type: 'string', required: true },
        { id: 'description', name: 'Description', type: 'string', required: false },
        {
          id: 'category',
          name: 'Category',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'breakfast', label: 'Breakfast', color: '#fbbf24' },
            { value: 'lunch', label: 'Lunch', color: '#34d399' },
            { value: 'dinner', label: 'Dinner', color: '#60a5fa' },
            { value: 'dessert', label: 'Dessert', color: '#f472b6' },
            { value: 'snack', label: 'Snack', color: '#a78bfa' },
            { value: 'drink', label: 'Drink', color: '#22d3ee' },
          ],
        },
        { id: 'prepTime', name: 'Prep Time (min)', type: 'number', required: false },
        { id: 'cookTime', name: 'Cook Time (min)', type: 'number', required: false },
        { id: 'servings', name: 'Servings', type: 'number', required: false },
        {
          id: 'difficulty',
          name: 'Difficulty',
          type: 'enum',
          required: false,
          enumOptions: [
            { value: 'easy', label: 'Easy', color: '#34d399' },
            { value: 'medium', label: 'Medium', color: '#fbbf24' },
            { value: 'hard', label: 'Hard', color: '#f87171' },
          ],
          defaultValue: 'medium',
        },
        { id: 'ingredients', name: 'Ingredients', type: 'richtext', required: true },
        { id: 'instructions', name: 'Instructions', type: 'richtext', required: true },
        { id: 'image', name: 'Image', type: 'image', required: false },
        { id: 'favorite', name: 'Favorite', type: 'boolean', required: false, defaultValue: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'name',
        subtitleField: 'category',
        imageField: 'image',
        listFields: ['name', 'category', 'prepTime', 'cookTime', 'difficulty', 'favorite'],
        searchFields: ['name', 'description', 'ingredients'],
      },
    },
    {
      id: 'mealPlan',
      name: 'Meal Plan',
      pluralName: 'Meal Plans',
      description: 'Weekly or daily meal plans',
      icon: '📅',
      fields: [
        createStandardIdField(),
        { id: 'date', name: 'Date', type: 'date', required: true },
        {
          id: 'mealType',
          name: 'Meal Type',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'breakfast', label: 'Breakfast', color: '#fbbf24' },
            { value: 'lunch', label: 'Lunch', color: '#34d399' },
            { value: 'dinner', label: 'Dinner', color: '#60a5fa' },
            { value: 'snack', label: 'Snack', color: '#a78bfa' },
          ],
        },
        {
          id: 'recipeId',
          name: 'Recipe',
          type: 'reference',
          required: false,
          reference: { targetEntity: 'recipe', displayField: 'name', relationship: 'many-to-many' },
        },
        { id: 'notes', name: 'Notes', type: 'string', required: false },
        { id: 'prepared', name: 'Prepared', type: 'boolean', required: false, defaultValue: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'date',
        subtitleField: 'mealType',
        listFields: ['date', 'mealType', 'recipeId', 'prepared'],
        searchFields: ['notes'],
      },
    },
  ],
  
  pages: [],
  workflows: [],
  
  theme: {
    primaryColor: '#f97316',
    secondaryColor: '#ea580c',
    accentColor: '#fb923c',
  },
  
  naming: {
    entityNaming: 'singular',
    routeStyle: 'kebab',
  },
};

// ============================================================
// SERVICES BUNDLE (General Service Business)
// ============================================================

export const ServicesBundle: BehaviorBundle = {
  id: 'services',
  name: 'Service Business',
  description: 'Manage appointments, clients, and services for service-based businesses',
  category: 'business',
  keywords: ['service', 'appointment', 'booking', 'client', 'schedule', 'salon', 'spa', 'consulting'],
  icon: '📋',
  
  entities: [
    {
      id: 'service',
      name: 'Service',
      pluralName: 'Services',
      description: 'Services offered',
      icon: '💼',
      fields: [
        createStandardIdField(),
        { id: 'name', name: 'Name', type: 'string', required: true },
        { id: 'description', name: 'Description', type: 'richtext', required: false },
        { id: 'duration', name: 'Duration (min)', type: 'number', required: true },
        { id: 'price', name: 'Price', type: 'currency', required: true },
        {
          id: 'category',
          name: 'Category',
          type: 'string',
          required: false,
        },
        { id: 'active', name: 'Active', type: 'boolean', required: false, defaultValue: true },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'name',
        subtitleField: 'price',
        listFields: ['name', 'duration', 'price', 'active'],
        searchFields: ['name', 'description'],
      },
    },
    {
      id: 'client',
      name: 'Client',
      pluralName: 'Clients',
      description: 'Client information',
      icon: '👤',
      fields: [
        createStandardIdField(),
        { id: 'name', name: 'Name', type: 'string', required: true },
        { id: 'email', name: 'Email', type: 'email', required: true },
        { id: 'phone', name: 'Phone', type: 'phone', required: false },
        { id: 'address', name: 'Address', type: 'string', required: false },
        { id: 'notes', name: 'Notes', type: 'richtext', required: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'name',
        subtitleField: 'email',
        listFields: ['name', 'email', 'phone'],
        searchFields: ['name', 'email', 'phone'],
      },
    },
    {
      id: 'appointment',
      name: 'Appointment',
      pluralName: 'Appointments',
      description: 'Scheduled appointments',
      icon: '📅',
      fields: [
        createStandardIdField(),
        {
          id: 'clientId',
          name: 'Client',
          type: 'reference',
          required: true,
          reference: { targetEntity: 'client', displayField: 'name', relationship: 'many-to-many' },
        },
        {
          id: 'serviceId',
          name: 'Service',
          type: 'reference',
          required: true,
          reference: { targetEntity: 'service', displayField: 'name', relationship: 'many-to-many' },
        },
        { id: 'date', name: 'Date', type: 'datetime', required: true },
        {
          id: 'status',
          name: 'Status',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'scheduled', label: 'Scheduled', color: '#60a5fa' },
            { value: 'confirmed', label: 'Confirmed', color: '#34d399' },
            { value: 'completed', label: 'Completed', color: '#a78bfa' },
            { value: 'cancelled', label: 'Cancelled', color: '#f87171' },
            { value: 'no_show', label: 'No Show', color: '#fbbf24' },
          ],
          defaultValue: 'scheduled',
        },
        { id: 'notes', name: 'Notes', type: 'string', required: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'clientId',
        subtitleField: 'serviceId',
        listFields: ['clientId', 'serviceId', 'date', 'status'],
        searchFields: ['notes'],
      },
    },
  ],
  
  pages: [],
  workflows: [],
  
  theme: {
    primaryColor: '#8b5cf6',
    secondaryColor: '#7c3aed',
    accentColor: '#a78bfa',
  },
  
  naming: {
    entityNaming: 'singular',
    routeStyle: 'kebab',
  },
};

// ============================================================
// PLUMBER BUNDLE
// ============================================================

export const PlumberBundle: BehaviorBundle = {
  id: 'plumber',
  name: 'Plumber',
  description: 'Field service management for plumbing businesses',
  category: 'business',
  keywords: ['plumber', 'plumbing', 'service call', 'repair', 'installation', 'pipe', 'leak'],
  icon: 'dY`G',

  entities: [
    {
      id: 'job',
      name: 'Job',
      pluralName: 'Jobs',
      description: 'Service jobs and work orders',
      icon: 'dY`S',
      fields: [
        createStandardIdField(),
        { id: 'jobTitle', name: 'Job Title', type: 'string', required: true },
        { id: 'description', name: 'Description', type: 'richtext', required: false },
        {
          id: 'clientId',
          name: 'Client',
          type: 'reference',
          required: true,
          reference: {
            targetEntity: 'client',
            displayField: 'clientName',
            relationship: 'many-to-many',
          },
        },
        { id: 'address', name: 'Address', type: 'string', required: true },
        { id: 'appointmentDate', name: 'Appointment Date', type: 'datetime', required: true },
        {
          id: 'status',
          name: 'Status',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'scheduled', label: 'Scheduled', color: '#60a5fa' },
            { value: 'in_progress', label: 'In Progress', color: '#f59e0b' },
            { value: 'completed', label: 'Completed', color: '#34d399' },
            { value: 'on_hold', label: 'On Hold', color: '#9ca3af' },
          ],
          defaultValue: 'scheduled',
        },
        { id: 'photos', name: 'Photos', type: 'image', required: false },
        { id: 'invoiceTotal', name: 'Invoice Total', type: 'currency', required: false },
        { id: 'paid', name: 'Paid', type: 'boolean', required: false, defaultValue: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'jobTitle',
        subtitleField: 'status',
        listFields: ['jobTitle', 'clientId', 'appointmentDate', 'status', 'invoiceTotal', 'paid'],
        searchFields: ['jobTitle', 'description', 'address'],
      },
    },
    {
      id: 'client',
      name: 'Client',
      pluralName: 'Clients',
      description: 'Client profiles and contact details',
      icon: 'dY`',
      fields: [
        createStandardIdField(),
        { id: 'clientName', name: 'Client Name', type: 'string', required: true },
        { id: 'phone', name: 'Phone', type: 'phone', required: true },
        { id: 'email', name: 'Email', type: 'email', required: false },
        { id: 'address', name: 'Address', type: 'string', required: true },
        { id: 'notes', name: 'Notes', type: 'richtext', required: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'clientName',
        subtitleField: 'phone',
        listFields: ['clientName', 'phone', 'email', 'address'],
        searchFields: ['clientName', 'phone', 'email'],
      },
    },
    {
      id: 'appointment',
      name: 'Appointment',
      pluralName: 'Appointments',
      description: 'Scheduled service appointments',
      icon: 'dY".',
      fields: [
        createStandardIdField(),
        {
          id: 'jobId',
          name: 'Job',
          type: 'reference',
          required: true,
          reference: {
            targetEntity: 'job',
            displayField: 'jobTitle',
            relationship: 'many-to-many',
          },
        },
        { id: 'appointmentDate', name: 'Appointment Date', type: 'datetime', required: true },
        { id: 'location', name: 'Location', type: 'string', required: true },
        { id: 'notes', name: 'Notes', type: 'richtext', required: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'appointmentDate',
        subtitleField: 'location',
        listFields: ['appointmentDate', 'location', 'jobId'],
        searchFields: ['location', 'notes'],
      },
    },
    {
      id: 'invoice',
      name: 'Invoice',
      pluralName: 'Invoices',
      description: 'Invoices and payment tracking',
      icon: 'dY`%',
      fields: [
        createStandardIdField(),
        {
          id: 'jobId',
          name: 'Job',
          type: 'reference',
          required: true,
          reference: {
            targetEntity: 'job',
            displayField: 'jobTitle',
            relationship: 'many-to-many',
          },
        },
        { id: 'invoiceTotal', name: 'Invoice Total', type: 'currency', required: true },
        {
          id: 'status',
          name: 'Status',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'unpaid', label: 'Unpaid', color: '#f87171' },
            { value: 'paid', label: 'Paid', color: '#34d399' },
            { value: 'overdue', label: 'Overdue', color: '#f59e0b' },
          ],
          defaultValue: 'unpaid',
        },
        { id: 'issuedDate', name: 'Issued Date', type: 'date', required: true },
        { id: 'dueDate', name: 'Due Date', type: 'date', required: true },
        { id: 'notes', name: 'Notes', type: 'richtext', required: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'invoiceTotal',
        subtitleField: 'status',
        listFields: ['jobId', 'invoiceTotal', 'status', 'dueDate'],
        searchFields: ['status', 'notes'],
      },
    },
    {
      id: 'task',
      name: 'Task',
      pluralName: 'Tasks',
      description: 'Job-related tasks and checklist items',
      icon: 'dY`?',
      fields: [
        createStandardIdField(),
        { id: 'title', name: 'Title', type: 'string', required: true },
        { id: 'description', name: 'Description', type: 'richtext', required: false },
        {
          id: 'jobId',
          name: 'Job',
          type: 'reference',
          required: false,
          reference: {
            targetEntity: 'job',
            displayField: 'jobTitle',
            relationship: 'many-to-many',
          },
        },
        {
          id: 'status',
          name: 'Status',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'todo', label: 'To Do', color: '#9ca3af' },
            { value: 'doing', label: 'In Progress', color: '#60a5fa' },
            { value: 'done', label: 'Done', color: '#34d399' },
          ],
          defaultValue: 'todo',
        },
        { id: 'dueDate', name: 'Due Date', type: 'date', required: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'title',
        subtitleField: 'status',
        listFields: ['title', 'status', 'dueDate'],
        searchFields: ['title', 'description'],
      },
    },
    {
      id: 'message',
      name: 'Message',
      pluralName: 'Messages',
      description: 'Client communications and notes',
      icon: 'dY`"',
      fields: [
        createStandardIdField(),
        {
          id: 'clientId',
          name: 'Client',
          type: 'reference',
          required: true,
          reference: {
            targetEntity: 'client',
            displayField: 'clientName',
            relationship: 'many-to-many',
          },
        },
        { id: 'subject', name: 'Subject', type: 'string', required: true },
        { id: 'body', name: 'Message', type: 'richtext', required: true },
        { id: 'sentAt', name: 'Sent At', type: 'datetime', required: true },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'subject',
        subtitleField: 'sentAt',
        listFields: ['subject', 'sentAt', 'clientId'],
        searchFields: ['subject', 'body'],
      },
    },
  ],

  pages: [
    {
      id: 'plumber-dashboard',
      name: 'Dashboard',
      route: '/',
      type: 'dashboard',
      layout: {
        type: 'dashboard-grid',
        sections: [
          { id: 'header', type: 'header', components: ['dashboard-title'] },
          { id: 'main', type: 'main', components: ['stats', 'recent-jobs', 'recent-invoices'] },
        ],
      },
      components: [
        { id: 'dashboard-title', type: 'text', props: { text: 'Plumber Dashboard', variant: 'h1' } },
        { id: 'stats', type: 'dashboard', props: { columns: 3 } },
        { id: 'recent-jobs', type: 'list', props: { source: 'job' } },
        { id: 'recent-invoices', type: 'list', props: { source: 'invoice' } },
      ],
      navigation: { showInSidebar: true, order: 0 },
    },
    createStandardListPage('job', 'Job', 'Jobs'),
    createStandardDetailPage('job', 'Job'),
    createStandardFormPage('job', 'Job', [
      createStandardIdField(),
      { id: 'jobTitle', name: 'Job Title', type: 'string', required: true },
      { id: 'description', name: 'Description', type: 'richtext', required: false },
      { id: 'clientId', name: 'Client', type: 'reference', required: true, reference: { targetEntity: 'client', displayField: 'clientName', relationship: 'many-to-many' } },
      { id: 'address', name: 'Address', type: 'string', required: true },
      { id: 'appointmentDate', name: 'Appointment Date', type: 'datetime', required: true },
      { id: 'status', name: 'Status', type: 'enum', required: true, enumOptions: [
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'on_hold', label: 'On Hold' },
      ], defaultValue: 'scheduled' },
      { id: 'invoiceTotal', name: 'Invoice Total', type: 'currency', required: false },
      { id: 'paid', name: 'Paid', type: 'boolean', required: false },
    ]),
    createStandardListPage('client', 'Client', 'Clients'),
    {
      id: 'appointments-calendar',
      name: 'Schedule',
      route: '/schedule',
      type: 'calendar',
      entity: 'appointment',
      layout: {
        type: 'single-column',
        sections: [
          { id: 'header', type: 'header', components: ['page-title'] },
          { id: 'main', type: 'main', components: ['calendar'] },
        ],
      },
      components: [
        { id: 'page-title', type: 'text', props: { text: 'Schedule', variant: 'h1' } },
        { id: 'calendar', type: 'calendar', props: { source: 'appointment', dateField: 'appointmentDate', titleField: 'location' } },
      ],
      navigation: { showInSidebar: true, order: 4 },
    },
    createStandardListPage('invoice', 'Invoice', 'Invoices'),
    createStandardListPage('task', 'Task', 'Tasks'),
    createStandardListPage('message', 'Message', 'Messages'),
    {
      id: 'settings',
      name: 'Settings',
      route: '/settings',
      type: 'custom',
      layout: {
        type: 'single-column',
        sections: [
          { id: 'header', type: 'header', components: ['page-title'] },
          { id: 'main', type: 'main', components: ['settings-card'] },
        ],
      },
      components: [
        { id: 'page-title', type: 'text', props: { text: 'Settings', variant: 'h1' } },
        { id: 'settings-card', type: 'card', props: { title: 'App Settings', value: 'Configure notifications, defaults, and team access.' } },
      ],
      navigation: { showInSidebar: true, order: 9 },
    },
  ],

  workflows: [
    ...createStandardCrudWorkflows('job', 'Job'),
    ...createStandardCrudWorkflows('client', 'Client'),
    ...createStandardCrudWorkflows('invoice', 'Invoice'),
    ...createStandardCrudWorkflows('task', 'Task'),
    ...createStandardCrudWorkflows('message', 'Message'),
  ],

  theme: {
    primaryColor: '#0ea5e9',
    secondaryColor: '#0f766e',
    accentColor: '#f97316',
  },
  naming: {
    entityNaming: 'singular',
    routeStyle: 'kebab',
  },
};

// ============================================================
// TASK/TODO BUNDLE
// ============================================================

export const TaskBundle: BehaviorBundle = {
  id: 'task',
  name: 'Task Manager',
  description: 'Simple task and to-do list management',
  category: 'personal',
  keywords: ['task', 'todo', 'checklist', 'list', 'to-do', 'reminder'],
  icon: '✅',
  
  entities: [
    {
      id: 'task',
      name: 'Task',
      pluralName: 'Tasks',
      description: 'Tasks and to-dos',
      icon: '✅',
      fields: [
        createStandardIdField(),
        { id: 'title', name: 'Title', type: 'string', required: true },
        { id: 'description', name: 'Description', type: 'string', required: false },
        { id: 'dueDate', name: 'Due Date', type: 'date', required: false },
        {
          id: 'priority',
          name: 'Priority',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'low', label: 'Low', color: '#34d399' },
            { value: 'medium', label: 'Medium', color: '#fbbf24' },
            { value: 'high', label: 'High', color: '#f87171' },
          ],
          defaultValue: 'medium',
        },
        {
          id: 'status',
          name: 'Status',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'pending', label: 'Pending', color: '#9ca3af' },
            { value: 'in_progress', label: 'In Progress', color: '#60a5fa' },
            { value: 'completed', label: 'Completed', color: '#34d399' },
          ],
          defaultValue: 'pending',
        },
        { id: 'completed', name: 'Completed', type: 'boolean', required: false, defaultValue: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'title',
        subtitleField: 'status',
        listFields: ['title', 'dueDate', 'priority', 'status', 'completed'],
        searchFields: ['title', 'description'],
      },
    },
  ],
  
  pages: [],
  workflows: [],
  
  theme: {
    primaryColor: '#8b5cf6',
    secondaryColor: '#7c3aed',
    accentColor: '#a78bfa',
  },
  
  naming: {
    entityNaming: 'singular',
    routeStyle: 'kebab',
  },
};

// ============================================================
// HABIT TRACKER BUNDLE
// ============================================================

export const HabitBundle: BehaviorBundle = {
  id: 'habit',
  name: 'Habit Tracker',
  description: 'Track daily habits and build routines',
  category: 'personal',
  keywords: ['habit', 'routine', 'daily', 'streak', 'track', 'goal', 'self-improvement'],
  icon: '🎯',
  
  entities: [
    {
      id: 'habit',
      name: 'Habit',
      pluralName: 'Habits',
      description: 'Habits to track',
      icon: '🎯',
      fields: [
        createStandardIdField(),
        { id: 'name', name: 'Name', type: 'string', required: true },
        { id: 'description', name: 'Description', type: 'string', required: false },
        { id: 'icon', name: 'Icon', type: 'string', required: false },
        {
          id: 'frequency',
          name: 'Frequency',
          type: 'enum',
          required: true,
          enumOptions: [
            { value: 'daily', label: 'Daily', color: '#60a5fa' },
            { value: 'weekly', label: 'Weekly', color: '#34d399' },
            { value: 'monthly', label: 'Monthly', color: '#fbbf24' },
          ],
          defaultValue: 'daily',
        },
        { id: 'streak', name: 'Current Streak', type: 'number', required: false, defaultValue: 0 },
        { id: 'bestStreak', name: 'Best Streak', type: 'number', required: false, defaultValue: 0 },
        { id: 'targetCount', name: 'Target Count', type: 'number', required: false, defaultValue: 1 },
        { id: 'active', name: 'Active', type: 'boolean', required: false, defaultValue: true },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'name',
        subtitleField: 'frequency',
        listFields: ['name', 'frequency', 'streak', 'active'],
        searchFields: ['name', 'description'],
      },
    },
    {
      id: 'habitLog',
      name: 'Habit Log',
      pluralName: 'Habit Logs',
      description: 'Daily habit completion logs',
      icon: '📊',
      fields: [
        createStandardIdField(),
        {
          id: 'habitId',
          name: 'Habit',
          type: 'reference',
          required: true,
          reference: { targetEntity: 'habit', displayField: 'name', relationship: 'many-to-many' },
        },
        { id: 'date', name: 'Date', type: 'date', required: true },
        { id: 'count', name: 'Count', type: 'number', required: false, defaultValue: 1 },
        { id: 'notes', name: 'Notes', type: 'string', required: false },
        ...createTimestampFields(),
      ],
      displayConfig: {
        titleField: 'habitId',
        subtitleField: 'date',
        listFields: ['habitId', 'date', 'count'],
        searchFields: ['notes'],
      },
    },
  ],
  
  pages: [],
  workflows: [],
  
  theme: {
    primaryColor: '#8b5cf6',
    secondaryColor: '#7c3aed',
    accentColor: '#a78bfa',
  },
  
  naming: {
    entityNaming: 'singular',
    routeStyle: 'kebab',
  },
};

// ============================================================
// ALL BUNDLES REGISTRY
// ============================================================

export const BEHAVIOR_BUNDLES: Record<string, BehaviorBundle> = {
  'crm': CRMBundle,
  'inventory': InventoryBundle,
  'fitness': FitnessBundle,
  'real-estate': RealEstateBundle,
  'home-management': HomeManagementBundle,
  'cooking': CookingBundle,
  'services': ServicesBundle,
  'plumber': PlumberBundle,
  'task': TaskBundle,
  'habit': HabitBundle,
};

/**
 * Get a behavior bundle by ID
 */
export function getBehaviorBundle(id: string): BehaviorBundle | undefined {
  return BEHAVIOR_BUNDLES[id];
}

/**
 * Detect behavior from user input
 */
export function detectBehavior(input: string): { behaviorId: string; confidence: number } | null {
  const lowerInput = input.toLowerCase();
  
  let bestMatch: { behaviorId: string; confidence: number } | null = null;
  
  for (const [id, bundle] of Object.entries(BEHAVIOR_BUNDLES)) {
    let score = 0;
    
    // Check keywords
    for (const keyword of bundle.keywords) {
      if (lowerInput.includes(keyword)) {
        score += keyword.length > 4 ? 2 : 1;
      }
    }
    
    // Check name match
    if (lowerInput.includes(bundle.name.toLowerCase())) {
      score += 5;
    }
    
    // Normalize score to confidence (0-1)
    const confidence = Math.min(score / 10, 1);
    
    if (confidence > 0.2 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = { behaviorId: id, confidence };
    }
  }
  
  return bestMatch;
}

/**
 * Get all available behavior bundles
 */
export function getAllBehaviorBundles(): BehaviorBundle[] {
  return Object.values(BEHAVIOR_BUNDLES);
}
