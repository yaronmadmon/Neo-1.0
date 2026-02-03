export interface BehaviorBundleSpec {
  id: string;
  name: string;
  entities: string[];
  pageTitles: string[];
  pageKinds: string[];
  workflows: string[];
}

const bundle = (spec: BehaviorBundleSpec): BehaviorBundleSpec => spec;

export const BEHAVIOR_BUNDLES: Record<string, BehaviorBundleSpec> = {
  crm: bundle({
    id: 'crm',
    name: 'CRM Client Bundle',
    entities: ['client'],
    pageTitles: ['Clients'],
    pageKinds: ['list', 'detail', 'form'],
    workflows: ['client-crud'],
  }),
  scheduling: bundle({
    id: 'scheduling',
    name: 'Scheduling Bundle',
    entities: ['appointment'],
    pageTitles: ['Schedule'],
    pageKinds: ['calendar'],
    workflows: ['appointment-crud', 'schedule-reminders'],
  }),
  messaging: bundle({
    id: 'messaging',
    name: 'Messaging Bundle',
    entities: ['message', 'conversation'],
    pageTitles: ['Messaging'],
    pageKinds: ['chat'],
    workflows: ['message-send'],
  }),
  payments: bundle({
    id: 'payments',
    name: 'Payments Bundle',
    entities: ['payment'],
    pageTitles: ['Payments'],
    pageKinds: ['list', 'detail', 'form'],
    workflows: ['payment-capture'],
  }),
  invoices: bundle({
    id: 'invoices',
    name: 'Invoices Bundle',
    entities: ['invoice'],
    pageTitles: ['Invoices'],
    pageKinds: ['list', 'detail', 'form'],
    workflows: ['invoice-crud'],
  }),
  quotes: bundle({
    id: 'quotes',
    name: 'Quotes & Estimates Bundle',
    entities: ['quote'],
    pageTitles: ['Quotes'],
    pageKinds: ['list', 'detail', 'form'],
    workflows: ['quote-crud', 'quote-approval'],
  }),
  tasks: bundle({
    id: 'tasks',
    name: 'Tasks Bundle',
    entities: ['task'],
    pageTitles: ['Tasks'],
    pageKinds: ['kanban', 'list'],
    workflows: ['task-status'],
  }),
  inventory: bundle({
    id: 'inventory',
    name: 'Products & Inventory Bundle',
    entities: ['material', 'product', 'menuItem'],
    pageTitles: ['Materials', 'Inventory'],
    pageKinds: ['table', 'list'],
    workflows: ['inventory-tracking'],
  }),
  orders: bundle({
    id: 'orders',
    name: 'Orders Bundle',
    entities: ['order'],
    pageTitles: ['Orders'],
    pageKinds: ['list', 'detail'],
    workflows: ['order-fulfillment'],
  }),
  documents: bundle({
    id: 'documents',
    name: 'Document Upload Bundle',
    entities: ['document'],
    pageTitles: ['Documents'],
    pageKinds: ['list', 'detail'],
    workflows: ['document-upload'],
  }),
  gallery: bundle({
    id: 'gallery',
    name: 'Gallery Bundle',
    entities: ['gallery'],
    pageTitles: ['Gallery'],
    pageKinds: ['grid'],
    workflows: ['gallery-upload'],
  }),
  dashboard: bundle({
    id: 'dashboard',
    name: 'Dashboard Bundle',
    entities: [],
    pageTitles: ['Dashboard'],
    pageKinds: ['dashboard'],
    workflows: ['dashboard-refresh'],
  }),
  notifications: bundle({
    id: 'notifications',
    name: 'Notifications Bundle',
    entities: ['notification'],
    pageTitles: ['Notifications'],
    pageKinds: ['list'],
    workflows: ['notification-send'],
  }),
  calendar: bundle({
    id: 'calendar',
    name: 'Calendar Bundle',
    entities: ['appointment'],
    pageTitles: ['Calendar'],
    pageKinds: ['calendar'],
    workflows: ['calendar-sync'],
  }),
  'job-pipeline': bundle({
    id: 'job-pipeline',
    name: 'Job Pipeline Bundle',
    entities: ['job'],
    pageTitles: ['Job Pipeline', 'Job Timeline'],
    pageKinds: ['kanban', 'timeline'],
    workflows: ['job-status'],
  }),
  staff: bundle({
    id: 'staff',
    name: 'Staff Bundle',
    entities: ['staff'],
    pageTitles: ['Staff', 'Technicians'],
    pageKinds: ['list', 'detail', 'form'],
    workflows: ['staff-management'],
  }),
  permissions: bundle({
    id: 'permissions',
    name: 'Permissions Bundle',
    entities: ['role'],
    pageTitles: ['Permissions'],
    pageKinds: ['list', 'detail'],
    workflows: ['permission-rules'],
  }),
  ecommerce: bundle({
    id: 'ecommerce',
    name: 'E-Commerce Bundle',
    entities: ['product', 'order'],
    pageTitles: ['Products', 'Orders'],
    pageKinds: ['list', 'detail', 'form'],
    workflows: ['order-fulfillment'],
  }),
};

export const getBehaviorBundleSpec = (id: string): BehaviorBundleSpec | undefined => BEHAVIOR_BUNDLES[id];

export const listBehaviorBundleSpecs = (): BehaviorBundleSpec[] => Object.values(BEHAVIOR_BUNDLES);
