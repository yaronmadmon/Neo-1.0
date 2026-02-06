import type { EntityDef, PageDef, PageType, SurfaceType } from '../../types.js';
import type { IndustryKit } from '../../kits/industries/types.js';
import { LayoutEngine } from '../ui/LayoutEngine.js';
import { BEHAVIOR_BUNDLES } from '../../behaviors/index.js';

/**
 * Customer surface features - what customers can do
 * Supports e-commerce customers, tenant/member portals, AND catering/food service
 */
export interface CustomerFeatures {
  // E-commerce features
  browseCatalog?: boolean;      // Browse products/services/menu
  placeOrders?: boolean;        // Place orders
  bookAppointments?: boolean;   // Book appointments/reservations
  trackOrders?: boolean;        // Track order/appointment status
  manageProfile?: boolean;      // Manage their profile
  viewHistory?: boolean;        // View order/appointment history
  usePromotions?: boolean;      // Use coupons/promotions
  makePayments?: boolean;       // Make payments online
  receiveNotifications?: boolean; // Receive notifications
  
  // Catering/food service features (bakeries, restaurants, caterers)
  requestCatering?: boolean;    // Submit catering requests
  viewQuotes?: boolean;         // View and approve quotes
  viewInvoices?: boolean;       // View and pay invoices
  scheduleDelivery?: boolean;   // Schedule delivery time/date
  trackDelivery?: boolean;      // Track delivery status
  selectPickupOrDelivery?: boolean; // Choose between pickup and delivery
  
  // Tenant/member portal features
  viewLease?: boolean;          // View lease/contract details
  payRent?: boolean;            // Pay rent/dues/fees
  submitMaintenanceRequest?: boolean; // Submit maintenance/support requests
  viewMaintenanceStatus?: boolean;    // Track maintenance request status
  viewDocuments?: boolean;      // View/download documents
  uploadDocuments?: boolean;    // Upload documents
  viewNotices?: boolean;        // View notices/announcements
  sendMessages?: boolean;       // Send messages to admin/staff
  viewSchedule?: boolean;       // View schedules
  makeReservations?: boolean;   // Make facility reservations
}

// Provider features for medical/healthcare apps
export interface ProviderFeatures {
  viewAssignedPatients?: boolean;
  viewSchedule?: boolean;
  manageAvailability?: boolean;
  createTreatmentNotes?: boolean;
  viewPatientHistory?: boolean;
  viewPatientDocuments?: boolean;
  sendMessages?: boolean;
  createPrescriptions?: boolean;
  createReferrals?: boolean;
  viewBilling?: boolean;
}

// Patient features for medical/healthcare apps
export interface PatientFeatures {
  viewProfile?: boolean;
  updateProfile?: boolean;
  viewAppointments?: boolean;
  bookAppointments?: boolean;
  cancelAppointments?: boolean;
  viewTreatmentNotes?: boolean;    // Only approved notes
  viewDocuments?: boolean;
  uploadDocuments?: boolean;
  viewBilling?: boolean;
  makePayments?: boolean;
  sendMessages?: boolean;
  viewMessages?: boolean;
  submitForms?: boolean;
}

export interface PageGeneratorInput {
  appName: string;
  kit: IndustryKit;
  entities: EntityDef[];
  modules: string[];
  requiredPageTitles?: string[];
  // Dual-surface support
  customerFacing?: boolean;           // If true, generate customer surface pages
  customerFeatures?: CustomerFeatures; // Specific features for customer surface
  // Medical/healthcare multi-surface support
  providerFacing?: boolean;           // If true, generate provider surface pages
  providerFeatures?: ProviderFeatures; // Specific features for provider surface
  patientFacing?: boolean;            // If true, generate patient surface pages
  patientFeatures?: PatientFeatures;  // Specific features for patient surface
}

export class PageGenerator {
  private layoutEngine = new LayoutEngine();

  generatePages(input: PageGeneratorInput): PageDef[] {
    const pages: PageDef[] = [];
    const usedIds = new Set<string>();
    const importantEntities = new Set(['job', 'client', 'invoice', 'quote', 'order', 'project', 'catering', 'delivery', 'production']);
    // Increased limits to support complex multi-surface apps (bakeries, restaurants, property mgmt)
    const maxAdminPages = 24;
    const maxCustomerPages = 12;
    const requiredIds = new Set<string>();

    const addPage = (page: PageDef, force = false, maxPages = maxAdminPages) => {
      if (usedIds.has(page.id)) return;
      usedIds.add(page.id);
      const surfacePages = pages.filter(p => p.surface === page.surface);
      if (force || surfacePages.length < maxPages) {
        pages.push(page);
      }
    };

    // ============================================================
    // ADMIN SURFACE PAGES (internal/staff-facing)
    // ============================================================
    
    // Dashboard first - use appName (which may be business name) for dashboard title
    addPage(this.createPage('dashboard', `${input.appName} Dashboard`, 'dashboard', undefined, true, 'admin'));

    // Behavior bundle pages
    // FIX: Use entity names from kit instead of hardcoded bundle titles
    for (const moduleId of input.modules) {
      const bundle = BEHAVIOR_BUNDLES[moduleId];
      if (!bundle) continue;

      bundle.pageTitles.forEach((title, index) => {
        const kind = (bundle.pageKinds[index] || bundle.pageKinds[0]) as PageType;
        const entity = this.resolveEntityForTitle(title, input.entities, bundle.entities);
        
        // Use entity's actual name instead of hardcoded title
        const pageTitle = entity?.pluralName || title;
        const pageName = entity?.name || title.replace(/s$/, '');
        
        addPage(this.createPage(pageTitle, pageTitle, kind, entity?.id, true, 'admin'));

        if (kind === 'list' && entity && importantEntities.has(entity.id)) {
          addPage(this.createPage(`${pageTitle} Details`, `${pageTitle} Details`, 'detail', entity.id, false, 'admin'));
          addPage(this.createPage(`Add ${pageName}`, `Add ${pageName}`, 'form', entity.id, false, 'admin'));
        }
      });
    }

    // Required page titles from profession expander
    if (input.requiredPageTitles?.length) {
      for (const title of input.requiredPageTitles) {
        const entity = this.resolveEntityForTitle(title, input.entities);
        const kind = this.guessPageType(title);
        const page = this.createPage(title, title, kind, entity?.id, true, 'admin');
        requiredIds.add(page.id);
        addPage(page, true);
      }
    }

    // Settings page fallback
    const settingsPage = this.createPage('Settings', 'Settings', 'custom', undefined, true, 'admin');
    requiredIds.add(settingsPage.id);
    addPage(settingsPage, true);

    // ============================================================
    // CUSTOMER SURFACE PAGES (customer-facing)
    // Only generated when customerFacing is true
    // Uses SAME entities as admin - just different views/permissions
    // ============================================================
    
    if (input.customerFacing) {
      const customerPages = this.generateCustomerPages(input);
      customerPages.forEach(page => addPage(page, true, maxCustomerPages));
    }
    
    // ============================================================
    // PROVIDER SURFACE PAGES (provider-facing)
    // For medical/healthcare apps
    // ============================================================
    
    if (input.providerFacing) {
      const providerPages = this.generateProviderPages(input);
      providerPages.forEach(page => addPage(page, true, maxCustomerPages));
    }
    
    // ============================================================
    // PATIENT SURFACE PAGES (patient-facing)
    // For medical/healthcare apps
    // ============================================================
    
    if (input.patientFacing) {
      const patientPages = this.generatePatientPages(input);
      patientPages.forEach(page => addPage(page, true, maxCustomerPages));
    }

    // Trim admin pages if over limit
    const adminPages = pages.filter(p => p.surface === 'admin');
    if (adminPages.length > maxAdminPages) {
      const requiredAdminPages = adminPages.filter((page) => requiredIds.has(page.id));
      const optionalAdminPages = adminPages.filter((page) => !requiredIds.has(page.id));
      const trimmedAdmin = [...requiredAdminPages, ...optionalAdminPages].slice(0, maxAdminPages);
      const customerOnlyPages = pages.filter(p => p.surface === 'customer');
      return [...trimmedAdmin, ...customerOnlyPages];
    }

    return pages;
  }

  /**
   * Generate customer-facing pages based on detected features
   * These pages use the SAME entities as admin but with customer-appropriate views
   * Supports: e-commerce portals, tenant/member portals, AND construction client portals
   */
  private generateCustomerPages(input: PageGeneratorInput): PageDef[] {
    const features = input.customerFeatures || {};
    
    // Determine portal type based on industry and entities
    const isConstructionClient = this.isConstructionClientType(input.kit, input.entities);
    const isTenantPortal = this.isTenantPortalType(features, input.entities);
    
    if (isConstructionClient) {
      return this.generateConstructionClientPages(input, features);
    } else if (isTenantPortal) {
      return this.generateTenantPortalPages(input, features);
    } else {
      return this.generateEcommercePortalPages(input, features);
    }
  }
  
  /**
   * Detect if this should be a construction client portal
   */
  private isConstructionClientType(kit: IndustryKit, entities: EntityDef[]): boolean {
    // Check kit keywords
    if (kit.id === 'contractor' || kit.keywords?.some(k => 
      ['construction', 'contractor', 'builder'].includes(k.toLowerCase())
    )) {
      return true;
    }
    
    // Check for construction-specific entities
    const constructionEntityTypes = ['project', 'changeOrder', 'estimate', 'subcontractor', 'dailyReport'];
    const matchCount = entities.filter(e => constructionEntityTypes.includes(e.id)).length;
    return matchCount >= 2;
  }
  
  /**
   * Generate construction client portal pages
   * Clients see: project status, change orders, estimates, invoices, documents, messages
   */
  private generateConstructionClientPages(input: PageGeneratorInput, features: CustomerFeatures): PageDef[] {
    const clientPages: PageDef[] = [];
    
    // Find relevant entities
    const projectEntity = this.findEntityByType(input.entities, ['project']);
    const changeOrderEntity = this.findEntityByType(input.entities, ['changeOrder']);
    const estimateEntity = this.findEntityByType(input.entities, ['estimate', 'quote']);
    const invoiceEntity = this.findEntityByType(input.entities, ['invoice', 'billing']);
    const documentEntity = this.findEntityByType(input.entities, ['document']);
    const messageEntity = this.findEntityByType(input.entities, ['message', 'communication']);
    const clientEntity = this.findEntityByType(input.entities, ['client']);
    
    // 1. Client Portal Home
    clientPages.push(this.createCustomerPage(
      'client-home',
      'My Projects',
      'client_portal',
      projectEntity?.id,
      'Overview of your construction projects'
    ));
    
    // 2. Project Status
    if (projectEntity) {
      clientPages.push(this.createCustomerPage(
        'client-project-status',
        'Project Status',
        'project_status',
        projectEntity.id,
        'View detailed project progress and timeline'
      ));
    }
    
    // 3. Change Orders (review and approve)
    if (changeOrderEntity) {
      clientPages.push(this.createCustomerPage(
        'client-change-orders',
        'Change Orders',
        'change_order_approval',
        changeOrderEntity.id,
        'Review and approve change orders'
      ));
    }
    
    // 4. Estimates (view approved)
    if (estimateEntity) {
      clientPages.push(this.createCustomerPage(
        'client-estimates',
        'Estimates',
        'estimate_view',
        estimateEntity.id,
        'View project estimates'
      ));
    }
    
    // 5. Invoices & Payments
    if (invoiceEntity) {
      clientPages.push(this.createCustomerPage(
        'client-invoices',
        'Invoices',
        'invoice_view',
        invoiceEntity.id,
        'View and pay invoices'
      ));
    }
    
    // 6. Documents
    if (documentEntity) {
      clientPages.push(this.createCustomerPage(
        'client-documents',
        'Documents',
        'document_library',
        documentEntity.id,
        'View plans, permits, and contracts'
      ));
    }
    
    // 7. Messages
    if (features.sendMessages || messageEntity) {
      clientPages.push(this.createCustomerPage(
        'client-messages',
        'Messages',
        'message_center',
        messageEntity?.id || 'message',
        'Communicate with the project team'
      ));
    }
    
    // 8. Client Profile
    clientPages.push(this.createCustomerPage(
      'client-profile',
      'My Profile',
      'profile',
      clientEntity?.id,
      'Manage your account'
    ));
    
    return clientPages;
  }
  
  /**
   * Detect if this should be a tenant/member portal (property mgmt, gym, HOA, etc.)
   */
  private isTenantPortalType(features: CustomerFeatures, entities: EntityDef[]): boolean {
    // Check feature flags
    if (features.viewLease || features.payRent || features.submitMaintenanceRequest || 
        features.viewMaintenanceStatus || features.viewNotices) {
      return true;
    }
    
    // Check for tenant/property-related entities
    const tenantEntityTypes = ['tenant', 'lease', 'unit', 'property', 'maintenance', 'rent', 'maintenanceRequest'];
    return entities.some(e => tenantEntityTypes.includes(e.id.toLowerCase()));
  }
  
  /**
   * Generate tenant/member portal pages (property management, gyms, HOAs, etc.)
   */
  private generateTenantPortalPages(input: PageGeneratorInput, features: CustomerFeatures): PageDef[] {
    const tenantPages: PageDef[] = [];
    
    // Find relevant entities
    const tenantEntity = this.findEntityByType(input.entities, ['tenant', 'member', 'resident', 'occupant']);
    const leaseEntity = this.findEntityByType(input.entities, ['lease', 'contract', 'agreement', 'membership']);
    const unitEntity = this.findEntityByType(input.entities, ['unit', 'apartment', 'property', 'space']);
    const paymentEntity = this.findEntityByType(input.entities, ['payment', 'rent', 'rentPayment', 'fee', 'dues']);
    const maintenanceEntity = this.findEntityByType(input.entities, ['maintenanceRequest', 'maintenance', 'serviceRequest', 'workOrder', 'ticket']);
    const documentEntity = this.findEntityByType(input.entities, ['document', 'file', 'lease', 'notice']);
    const noticeEntity = this.findEntityByType(input.entities, ['notice', 'announcement', 'message', 'communication']);
    
    // 1. Tenant Portal Home (always included)
    tenantPages.push(this.createCustomerPage(
      'tenant-home',
      'My Portal',
      'tenant_portal',
      tenantEntity?.id,
      'Welcome to your tenant portal'
    ));
    
    // 2. View Lease/Contract (if viewLease or lease entity exists)
    if (features.viewLease || leaseEntity) {
      tenantPages.push(this.createCustomerPage(
        'tenant-lease',
        'My Lease',
        'lease_view',
        leaseEntity?.id || 'lease',
        'View your lease details'
      ));
    }
    
    // 3. Pay Rent (if payRent feature or payment entity exists)
    if (features.payRent || features.makePayments || paymentEntity) {
      tenantPages.push(this.createCustomerPage(
        'tenant-payments',
        'Pay Rent',
        'rent_payment',
        paymentEntity?.id || 'payment',
        'Make a payment'
      ));
    }
    
    // 4. Maintenance Requests (if maintenance features detected)
    if (features.submitMaintenanceRequest || features.viewMaintenanceStatus || maintenanceEntity) {
      tenantPages.push(this.createCustomerPage(
        'tenant-maintenance',
        'Maintenance',
        'maintenance_request',
        maintenanceEntity?.id || 'maintenanceRequest',
        'Submit and track maintenance requests'
      ));
    }
    
    // 5. Documents (if viewDocuments feature or document entity)
    if (features.viewDocuments || features.uploadDocuments || documentEntity) {
      tenantPages.push(this.createCustomerPage(
        'tenant-documents',
        'Documents',
        'document_library',
        documentEntity?.id || 'document',
        'View and download your documents'
      ));
    }
    
    // 6. Notices/Messages (if viewNotices or sendMessages)
    if (features.viewNotices || features.sendMessages || noticeEntity) {
      tenantPages.push(this.createCustomerPage(
        'tenant-notices',
        'Notices',
        'notices_board',
        noticeEntity?.id || 'notice',
        'View notices and announcements'
      ));
    }
    
    // 7. Messages/Communication
    if (features.sendMessages) {
      tenantPages.push(this.createCustomerPage(
        'tenant-messages',
        'Messages',
        'message_center',
        undefined,
        'Communicate with management'
      ));
    }
    
    // 8. Facility Reservations (if makeReservations feature)
    if (features.makeReservations) {
      tenantPages.push(this.createCustomerPage(
        'tenant-reservations',
        'Reservations',
        'facility_booking',
        undefined,
        'Book amenities and facilities'
      ));
    }
    
    // 9. Profile (always useful)
    tenantPages.push(this.createCustomerPage(
      'tenant-profile',
      'My Profile',
      'profile',
      tenantEntity?.id,
      'Manage your account'
    ));
    
    return tenantPages;
  }
  
  /**
   * Generate e-commerce portal pages (restaurants, retail, services, bakeries, caterers, etc.)
   */
  private generateEcommercePortalPages(input: PageGeneratorInput, features: CustomerFeatures): PageDef[] {
    const customerPages: PageDef[] = [];
    
    // Find relevant entities for customer pages
    const productEntity = this.findEntityByType(input.entities, ['product', 'item', 'menu', 'service', 'menuItem', 'pastry', 'dessert', 'cake']);
    const orderEntity = this.findEntityByType(input.entities, ['order', 'booking', 'reservation', 'appointment']);
    const customerEntity = this.findEntityByType(input.entities, ['customer', 'client', 'guest', 'member', 'patient']);
    const cateringEntity = this.findEntityByType(input.entities, ['cateringRequest', 'catering', 'eventRequest', 'eventBooking']);
    const quoteEntity = this.findEntityByType(input.entities, ['quote', 'estimate', 'proposal']);
    const invoiceEntity = this.findEntityByType(input.entities, ['invoice', 'bill']);
    const deliveryEntity = this.findEntityByType(input.entities, ['delivery', 'shipping', 'deliverySchedule']);
    
    // 1. Customer Portal Home (always included for customer surface)
    customerPages.push(this.createCustomerPage(
      'customer-home',
      'Welcome',
      'customer_portal',
      undefined,
      'Welcome to our online portal'
    ));
    
    // 2. Browse Catalog / Menu (if browseCatalog or placeOrders detected)
    if (features.browseCatalog || features.placeOrders || productEntity) {
      const catalogName = this.getCatalogName(input.kit);
      customerPages.push(this.createCustomerPage(
        'customer-menu',
        catalogName,
        'menu',
        productEntity?.id,
        `Browse our ${catalogName.toLowerCase()}`
      ));
    }
    
    // 3. Book Appointment (if bookAppointments detected)
    if (features.bookAppointments) {
      customerPages.push(this.createCustomerPage(
        'customer-booking',
        'Book Appointment',
        'booking',
        orderEntity?.id || 'appointment',
        'Schedule your appointment'
      ));
    }
    
    // 4. Shopping Cart (if placeOrders detected)
    if (features.placeOrders) {
      customerPages.push(this.createCustomerPage(
        'customer-cart',
        'Your Cart',
        'cart',
        orderEntity?.id,
        'Review your order'
      ));
    }
    
    // 5. Checkout (if placeOrders or makePayments detected)
    if (features.placeOrders || features.makePayments) {
      customerPages.push(this.createCustomerPage(
        'customer-checkout',
        'Checkout',
        'checkout',
        orderEntity?.id,
        'Complete your order'
      ));
    }
    
    // 6. Order Tracking (if trackOrders detected or orders exist)
    if (features.trackOrders || orderEntity) {
      customerPages.push(this.createCustomerPage(
        'customer-orders',
        'My Orders',
        'order_tracking',
        orderEntity?.id,
        'Track your orders'
      ));
    }
    
    // ============================================================
    // CATERING-SPECIFIC PAGES (bakeries, restaurants, caterers)
    // ============================================================
    
    // 7. Catering Request Form (if requestCatering feature or catering entity exists)
    if (features.requestCatering || cateringEntity) {
      customerPages.push(this.createCustomerPage(
        'customer-catering',
        'Request Catering',
        'catering_request',
        cateringEntity?.id || 'cateringRequest',
        'Submit a catering request for your event'
      ));
    }
    
    // 8. View Quotes (if viewQuotes feature or quote entity exists)
    if (features.viewQuotes || quoteEntity) {
      customerPages.push(this.createCustomerPage(
        'customer-quotes',
        'My Quotes',
        'quote_view',
        quoteEntity?.id || 'quote',
        'View and approve your catering quotes'
      ));
    }
    
    // 9. View Invoices (if viewInvoices feature or invoice entity exists)
    if (features.viewInvoices || invoiceEntity) {
      customerPages.push(this.createCustomerPage(
        'customer-invoices',
        'My Invoices',
        'invoice_view',
        invoiceEntity?.id || 'invoice',
        'View and pay your invoices'
      ));
    }
    
    // 10. Delivery Schedule (if scheduleDelivery or trackDelivery features)
    if (features.scheduleDelivery || features.trackDelivery || deliveryEntity) {
      customerPages.push(this.createCustomerPage(
        'customer-delivery',
        'Delivery Status',
        'delivery_schedule',
        deliveryEntity?.id || orderEntity?.id || 'delivery',
        'Track your delivery status'
      ));
    }
    
    // 11. Customer Profile (always useful)
    customerPages.push(this.createCustomerPage(
      'customer-profile',
      'My Profile',
      'profile',
      customerEntity?.id,
      'Manage your account'
    ));
    
    return customerPages;
  }
  
  /**
   * Generate provider/field staff pages - adapts terminology based on industry
   * - Healthcare: Providers see patients, schedule, treatment notes
   * - Construction: Field staff see projects, tasks, daily reports
   */
  private generateProviderPages(input: PageGeneratorInput): PageDef[] {
    const providerPages: PageDef[] = [];
    const features = input.providerFeatures || {};
    const isConstruction = input.kit.id === 'contractor' || input.kit.keywords?.some(k => 
      ['construction', 'contractor', 'builder'].includes(k.toLowerCase())
    );
    
    // Find relevant entities based on industry
    const clientEntity = this.findEntityByType(input.entities, ['patient', 'client']);
    const appointmentEntity = this.findEntityByType(input.entities, ['appointment', 'booking', 'visit', 'task']);
    const noteEntity = this.findEntityByType(input.entities, ['treatmentNote', 'clinicalNote', 'dailyReport', 'note']);
    const documentEntity = this.findEntityByType(input.entities, ['document', 'file', 'record']);
    const messageEntity = this.findEntityByType(input.entities, ['message', 'communication', 'issue']);
    const projectEntity = this.findEntityByType(input.entities, ['project']);
    const taskEntity = this.findEntityByType(input.entities, ['task']);
    
    // 1. Dashboard (always included)
    providerPages.push(this.createProviderPage(
      'provider-dashboard',
      'Dashboard',
      'provider_dashboard',
      undefined,
      isConstruction ? 'Your assigned projects overview' : 'Your daily overview'
    ));
    
    // 2. Schedule / Tasks
    if (features.viewSchedule !== false) {
      providerPages.push(this.createProviderPage(
        'provider-schedule',
        isConstruction ? 'My Tasks' : 'My Schedule',
        'provider_schedule',
        isConstruction ? (taskEntity?.id || 'task') : (appointmentEntity?.id || 'appointment'),
        isConstruction ? 'View and update your assigned tasks' : 'View and manage your appointments'
      ));
    }
    
    // 3. My Projects/Patients (assigned only)
    if (features.viewAssignedPatients !== false) {
      providerPages.push(this.createProviderPage(
        isConstruction ? 'provider-projects' : 'provider-patients',
        isConstruction ? 'My Projects' : 'My Patients',
        isConstruction ? 'project_list' : 'patient_list',
        isConstruction ? (projectEntity?.id || 'project') : (clientEntity?.id || 'patient'),
        isConstruction ? 'View your assigned projects' : 'View your assigned patients'
      ));
    }
    
    // 4. Project Details / Patient Chart
    providerPages.push(this.createProviderPage(
      isConstruction ? 'provider-project-details' : 'provider-patient-chart',
      isConstruction ? 'Project Details' : 'Patient Chart',
      isConstruction ? 'project_detail' : 'patient_chart',
      isConstruction ? (projectEntity?.id || 'project') : (clientEntity?.id || 'patient'),
      isConstruction ? 'View project details and status' : 'View patient details and history'
    ));
    
    // 5. Daily Reports / Treatment Notes
    if (features.createTreatmentNotes !== false) {
      providerPages.push(this.createProviderPage(
        isConstruction ? 'provider-daily-reports' : 'provider-treatment-notes',
        isConstruction ? 'Daily Reports' : 'Treatment Notes',
        isConstruction ? 'daily_reports' : 'treatment_notes',
        noteEntity?.id || (isConstruction ? 'dailyReport' : 'treatmentNote'),
        isConstruction ? 'Submit and view daily site reports' : 'Create and view treatment notes'
      ));
    }
    
    // 6. Issues / Availability (construction gets issues, healthcare gets availability)
    if (isConstruction) {
      const issueEntity = this.findEntityByType(input.entities, ['issue', 'problem', 'blocker']);
      providerPages.push(this.createProviderPage(
        'provider-issues',
        'Issues',
        'issue_list',
        issueEntity?.id || 'issue',
        'Report and track project issues'
      ));
    } else if (features.manageAvailability) {
      providerPages.push(this.createProviderPage(
        'provider-availability',
        'My Availability',
        'provider_availability',
        undefined,
        'Set your available time slots'
      ));
    }
    
    // 7. Messages / Issues (construction merges with issues)
    if (features.sendMessages && !isConstruction) {
      providerPages.push(this.createProviderPage(
        'provider-messages',
        'Messages',
        'message_center',
        messageEntity?.id || 'message',
        'Communicate with patients'
      ));
    }
    
    // 8. Documents
    if (features.viewPatientDocuments) {
      providerPages.push(this.createProviderPage(
        'provider-documents',
        'Documents',
        'document_library',
        documentEntity?.id || 'document',
        isConstruction ? 'View project documents and plans' : 'View patient documents'
      ));
    }
    
    // 9. Provider Profile
    providerPages.push(this.createProviderPage(
      'provider-profile',
      'My Profile',
      'profile',
      undefined,
      'Manage your profile'
    ));
    
    return providerPages;
  }
  
  /**
   * Generate patient-facing pages for medical/healthcare apps
   * Patients see their own records, appointments, and can communicate with providers
   */
  private generatePatientPages(input: PageGeneratorInput): PageDef[] {
    const patientPages: PageDef[] = [];
    const features = input.patientFeatures || {};
    
    // Find relevant entities
    const patientEntity = this.findEntityByType(input.entities, ['patient', 'client']);
    const appointmentEntity = this.findEntityByType(input.entities, ['appointment', 'booking', 'visit']);
    const treatmentNoteEntity = this.findEntityByType(input.entities, ['treatmentNote', 'clinicalNote', 'note', 'visitNote']);
    const documentEntity = this.findEntityByType(input.entities, ['document', 'file', 'record']);
    const messageEntity = this.findEntityByType(input.entities, ['message', 'communication']);
    const billingEntity = this.findEntityByType(input.entities, ['billing', 'invoice', 'payment']);
    const formEntity = this.findEntityByType(input.entities, ['intakeForm', 'form', 'questionnaire']);
    
    // 1. Patient Portal Home (always included)
    patientPages.push(this.createPatientPage(
      'patient-home',
      'My Portal',
      'patient_portal',
      patientEntity?.id,
      'Welcome to your patient portal'
    ));
    
    // 2. My Appointments
    if (features.viewAppointments !== false || features.bookAppointments) {
      patientPages.push(this.createPatientPage(
        'patient-appointments',
        'My Appointments',
        'my_appointments',
        appointmentEntity?.id || 'appointment',
        'View and schedule appointments'
      ));
    }
    
    // 3. My Records (approved notes only)
    if (features.viewTreatmentNotes) {
      patientPages.push(this.createPatientPage(
        'patient-records',
        'My Records',
        'my_records',
        treatmentNoteEntity?.id || 'treatmentNote',
        'View your treatment records'
      ));
    }
    
    // 4. My Documents
    if (features.viewDocuments || features.uploadDocuments) {
      patientPages.push(this.createPatientPage(
        'patient-documents',
        'My Documents',
        'document_library',
        documentEntity?.id || 'document',
        'View and upload documents'
      ));
    }
    
    // 5. Billing & Payments
    if (features.viewBilling || features.makePayments) {
      patientPages.push(this.createPatientPage(
        'patient-billing',
        'Billing',
        'my_billing',
        billingEntity?.id || 'billing',
        'View bills and make payments'
      ));
    }
    
    // 6. Messages
    if (features.sendMessages || features.viewMessages) {
      patientPages.push(this.createPatientPage(
        'patient-messages',
        'Messages',
        'message_center',
        messageEntity?.id || 'message',
        'Communicate with your care team'
      ));
    }
    
    // 7. Intake Forms
    if (features.submitForms) {
      patientPages.push(this.createPatientPage(
        'patient-forms',
        'Forms',
        'intake_forms',
        formEntity?.id || 'form',
        'Complete intake forms'
      ));
    }
    
    // 8. Patient Profile
    if (features.viewProfile || features.updateProfile) {
      patientPages.push(this.createPatientPage(
        'patient-profile',
        'My Profile',
        'profile',
        patientEntity?.id,
        'Manage your profile'
      ));
    }
    
    return patientPages;
  }
  
  /**
   * Create a provider-facing page with appropriate defaults
   */
  private createProviderPage(
    id: string,
    name: string,
    type: PageType,
    entityId?: string,
    description?: string
  ): PageDef {
    const layout = this.layoutEngine.layoutForPage(type);
    const components = this.buildProviderComponents(type, entityId, name);
    
    return {
      id,
      name,
      route: `/provider/${id.replace('provider-', '')}`,
      type,
      entity: entityId,
      layout,
      components,
      surface: 'provider' as SurfaceType,
      navigation: {
        showInSidebar: true,
        order: 0,
      },
      autoLayout: {
        showHeader: true,
        showSidebar: true,  // Provider pages have sidebars
        showFooter: false,
      },
    };
  }
  
  /**
   * Create a patient-facing page with appropriate defaults
   */
  private createPatientPage(
    id: string,
    name: string,
    type: PageType,
    entityId?: string,
    description?: string
  ): PageDef {
    const layout = this.layoutEngine.layoutForPage(type);
    const components = this.buildPatientComponents(type, entityId, name);
    
    return {
      id,
      name,
      route: `/patient/${id.replace('patient-', '')}`,
      type,
      entity: entityId,
      layout,
      components,
      surface: 'patient' as SurfaceType,
      navigation: {
        showInSidebar: true,
        order: 0,
      },
      autoLayout: {
        showHeader: true,
        showSidebar: false,  // Patient pages don't have sidebars
        showFooter: true,
      },
    };
  }
  
  /**
   * Build components for provider pages
   */
  private buildProviderComponents(type: PageType, entityId?: string, title?: string): PageDef['components'] {
    const baseComponents: PageDef['components'] = [];
    
    switch (type) {
      case 'provider_dashboard':
        baseComponents.push(
          { id: 'welcome-header', type: 'text', props: { text: 'Welcome, Dr.', variant: 'h1' } },
          { id: 'today-appointments', type: 'statsCard', props: { title: "Today's Appointments", icon: 'Calendar', source: 'appointment' } },
          { id: 'pending-notes', type: 'statsCard', props: { title: 'Pending Notes', icon: 'FileText', source: 'treatmentNote' } },
          { id: 'messages-count', type: 'statsCard', props: { title: 'New Messages', icon: 'MessageSquare', source: 'message' } },
          { id: 'schedule-preview', type: 'calendar', props: { source: 'appointment', mode: 'day', showAddButton: false } },
          { id: 'recent-patients', type: 'list', props: { source: 'patient', limit: 5, title: 'Recent Patients' } }
        );
        break;
        
      case 'provider_schedule':
        baseComponents.push(
          { id: 'schedule-header', type: 'text', props: { text: 'My Schedule', variant: 'h1' } },
          { id: 'schedule-calendar', type: 'calendar', props: { 
            source: entityId || 'appointment',
            mode: 'week',
            views: ['day', 'week', 'month'],
            showFilters: true,
            filterField: 'status'
          } }
        );
        break;
        
      case 'patient_list':
        baseComponents.push(
          { id: 'patients-header', type: 'text', props: { text: 'My Patients', variant: 'h1' } },
          { id: 'patients-search', type: 'searchInput', props: { placeholder: 'Search patients...' } },
          { id: 'patients-list', type: 'dataTable', props: { 
            source: entityId || 'patient',
            columns: ['name', 'dateOfBirth', 'phone', 'lastVisit', 'status'],
            sortable: true,
            filterable: true,
            onRowClick: 'navigate',
            rowClickRoute: '/provider/patient-chart/:id'
          } }
        );
        break;
        
      case 'patient_chart':
        baseComponents.push(
          { id: 'chart-header', type: 'pageHeader', props: { showBack: true, backRoute: '/provider/patients' } },
          { id: 'patient-info', type: 'detailCard', props: { 
            source: entityId || 'patient',
            fields: ['name', 'dateOfBirth', 'phone', 'email', 'address', 'insurance']
          } },
          { id: 'chart-tabs', type: 'tabs', props: { 
            tabs: [
              { id: 'notes', label: 'Treatment Notes' },
              { id: 'appointments', label: 'Appointments' },
              { id: 'documents', label: 'Documents' },
              { id: 'billing', label: 'Billing' }
            ]
          } },
          { id: 'add-note-btn', type: 'button', props: { label: 'Add Treatment Note', variant: 'primary', icon: 'Plus' } },
          { id: 'notes-list', type: 'timeline', props: { source: 'treatmentNote', dateField: 'createdAt', titleField: 'title' } }
        );
        break;
        
      case 'treatment_notes':
        baseComponents.push(
          { id: 'notes-header', type: 'text', props: { text: 'Treatment Notes', variant: 'h1' } },
          { id: 'new-note-btn', type: 'button', props: { label: 'New Note', variant: 'primary', icon: 'Plus' } },
          { id: 'notes-form', type: 'form', props: { 
            source: entityId || 'treatmentNote',
            fields: [
              { id: 'patient', label: 'Patient', type: 'reference', required: true, reference: { entity: 'patient', displayField: 'name' } },
              { id: 'appointment', label: 'Appointment', type: 'reference', reference: { entity: 'appointment', displayField: 'dateTime' } },
              { id: 'chiefComplaint', label: 'Chief Complaint', type: 'text', required: true },
              { id: 'subjective', label: 'Subjective', type: 'richtext' },
              { id: 'objective', label: 'Objective', type: 'richtext' },
              { id: 'assessment', label: 'Assessment', type: 'richtext' },
              { id: 'plan', label: 'Plan', type: 'richtext' },
              { id: 'approvedForPatient', label: 'Approve for Patient View', type: 'boolean', defaultValue: false }
            ],
            submitLabel: 'Save Note',
            writeOnce: true  // Mark form as write-once
          } },
          { id: 'notes-list', type: 'dataTable', props: { 
            source: entityId || 'treatmentNote',
            columns: ['patient', 'createdAt', 'chiefComplaint', 'approvedForPatient'],
            sortable: true
          } }
        );
        break;
        
      case 'provider_availability':
        baseComponents.push(
          { id: 'availability-header', type: 'text', props: { text: 'My Availability', variant: 'h1' } },
          { id: 'availability-calendar', type: 'calendar', props: { 
            mode: 'week',
            editable: true,
            showSlots: true
          } },
          { id: 'recurring-slots', type: 'form', props: { 
            title: 'Set Recurring Availability',
            fields: [
              { id: 'dayOfWeek', label: 'Day', type: 'enum', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
              { id: 'startTime', label: 'Start Time', type: 'time' },
              { id: 'endTime', label: 'End Time', type: 'time' },
              { id: 'slotDuration', label: 'Slot Duration (min)', type: 'number', defaultValue: 30 }
            ]
          } }
        );
        break;
        
      default:
        baseComponents.push(
          { id: `${entityId || 'page'}-title`, type: 'text', props: { text: title || 'Page', variant: 'h1' } }
        );
    }
    
    return baseComponents;
  }
  
  /**
   * Build components for patient pages
   */
  private buildPatientComponents(type: PageType, entityId?: string, title?: string): PageDef['components'] {
    const baseComponents: PageDef['components'] = [];
    
    switch (type) {
      case 'patient_portal':
        baseComponents.push(
          { id: 'welcome-banner', type: 'hero', props: { title: 'Welcome to Your Patient Portal', subtitle: 'Manage your healthcare in one place' } },
          { id: 'next-appointment', type: 'statsCard', props: { title: 'Next Appointment', icon: 'Calendar', source: 'appointment' } },
          { id: 'messages-count', type: 'statsCard', props: { title: 'New Messages', icon: 'MessageSquare', source: 'message' } },
          { id: 'balance-due', type: 'statsCard', props: { title: 'Balance Due', icon: 'DollarSign', source: 'billing' } },
          { id: 'quick-actions', type: 'cardGrid', props: { columns: 4, items: [
            { title: 'Book Appointment', icon: 'Calendar', route: '/patient/appointments' },
            { title: 'View Records', icon: 'FileText', route: '/patient/records' },
            { title: 'Messages', icon: 'MessageSquare', route: '/patient/messages' },
            { title: 'Pay Bill', icon: 'CreditCard', route: '/patient/billing' }
          ] } },
          { id: 'recent-visits', type: 'list', props: { source: 'appointment', limit: 3, title: 'Recent Visits', filter: { status: 'completed' } } }
        );
        break;
        
      case 'my_appointments':
        baseComponents.push(
          { id: 'appointments-header', type: 'text', props: { text: 'My Appointments', variant: 'h1' } },
          { id: 'book-btn', type: 'button', props: { label: 'Book New Appointment', variant: 'primary', icon: 'Plus' } },
          { id: 'upcoming-appointments', type: 'list', props: { 
            source: entityId || 'appointment',
            title: 'Upcoming',
            filter: { status: 'scheduled' },
            cardConfig: { titleField: 'provider', subtitleField: 'dateTime', statusField: 'status' }
          } },
          { id: 'past-appointments', type: 'dataTable', props: { 
            source: entityId || 'appointment',
            title: 'Past Appointments',
            columns: ['dateTime', 'provider', 'type', 'status'],
            filter: { status: 'completed' },
            sortable: true
          } }
        );
        break;
        
      case 'my_records':
        baseComponents.push(
          { id: 'records-header', type: 'text', props: { text: 'My Health Records', variant: 'h1' } },
          { id: 'records-info', type: 'text', props: { text: 'View your approved treatment records and visit summaries.', variant: 'body' } },
          { id: 'records-list', type: 'timeline', props: { 
            source: entityId || 'treatmentNote',
            dateField: 'createdAt',
            titleField: 'chiefComplaint',
            contentField: 'plan',
            filter: { approvedForPatient: true }  // Only show approved records
          } }
        );
        break;
        
      case 'my_billing':
        baseComponents.push(
          { id: 'billing-header', type: 'text', props: { text: 'Billing & Payments', variant: 'h1' } },
          { id: 'balance-card', type: 'statsCard', props: { title: 'Current Balance', icon: 'DollarSign', size: 'large' } },
          { id: 'pay-now-btn', type: 'button', props: { label: 'Pay Now', variant: 'primary' } },
          { id: 'billing-history', type: 'dataTable', props: { 
            source: entityId || 'billing',
            columns: ['date', 'description', 'amount', 'status'],
            title: 'Billing History',
            sortable: true
          } },
          { id: 'payment-methods', type: 'card', props: { title: 'Payment Methods' } }
        );
        break;
        
      case 'intake_forms':
        baseComponents.push(
          { id: 'forms-header', type: 'text', props: { text: 'Patient Forms', variant: 'h1' } },
          { id: 'pending-forms', type: 'list', props: { 
            source: entityId || 'form',
            title: 'Forms to Complete',
            filter: { status: 'pending' },
            emptyMessage: 'No forms to complete at this time.'
          } },
          { id: 'completed-forms', type: 'dataTable', props: { 
            source: entityId || 'form',
            title: 'Completed Forms',
            columns: ['name', 'completedAt'],
            filter: { status: 'completed' }
          } }
        );
        break;
        
      default:
        baseComponents.push(
          { id: `${entityId || 'page'}-title`, type: 'text', props: { text: title || 'Page', variant: 'h1' } }
        );
    }
    
    return baseComponents;
  }
  
  /**
   * Create a customer-facing page with appropriate defaults
   */
  private createCustomerPage(
    id: string,
    name: string,
    type: PageType,
    entityId?: string,
    description?: string
  ): PageDef {
    const layout = this.layoutEngine.layoutForPage(type);
    const components = this.buildCustomerComponents(type, entityId, name);
    
    return {
      id,
      name,
      route: `/customer/${id.replace('customer-', '')}`,  // Customer routes under /customer/
      type,
      entity: entityId,
      layout,
      components,
      surface: 'customer' as SurfaceType,
      navigation: {
        showInSidebar: true,
        order: 0,
      },
      autoLayout: {
        showHeader: true,
        showSidebar: false,  // Customer pages typically don't have sidebars
        showFooter: true,
      },
    };
  }
  
  /**
   * Build components appropriate for customer pages
   * Supports both e-commerce and tenant portal page types
   */
  private buildCustomerComponents(type: PageType, entityId?: string, title?: string): PageDef['components'] {
    const baseComponents: PageDef['components'] = [];
    
    switch (type) {
      // === E-commerce Portal Components ===
      case 'customer_portal':
        baseComponents.push(
          { id: 'welcome-hero', type: 'hero', props: { title: `Welcome Back!`, subtitle: 'What would you like to do today?' } },
          { id: 'quick-actions', type: 'cardGrid', props: { columns: 3 } }
        );
        break;
        
      case 'menu':
        baseComponents.push(
          { id: 'menu-header', type: 'text', props: { text: title || 'Our Menu', variant: 'h1' } },
          { id: 'menu-search', type: 'searchInput', props: { placeholder: 'Search...' } },
          { id: 'menu-grid', type: 'productGrid', props: { source: entityId || 'product', columns: 3, showPrice: true, showAddToCart: true } }
        );
        break;
        
      case 'cart':
        baseComponents.push(
          { id: 'cart-header', type: 'text', props: { text: 'Your Cart', variant: 'h1' } },
          { id: 'cart-items', type: 'cartItems', props: { source: 'cart' } },
          { id: 'cart-summary', type: 'cartSummary', props: {} },
          { id: 'checkout-button', type: 'button', props: { label: 'Proceed to Checkout', variant: 'primary', action: 'navigate', route: '/customer/checkout' } }
        );
        break;
        
      case 'checkout':
        baseComponents.push(
          { id: 'checkout-header', type: 'text', props: { text: 'Checkout', variant: 'h1' } },
          { id: 'checkout-form', type: 'checkoutForm', props: { showContact: true, showPayment: true } },
          { id: 'order-summary', type: 'orderSummary', props: {} }
        );
        break;
        
      case 'booking':
        baseComponents.push(
          { id: 'booking-header', type: 'text', props: { text: 'Book an Appointment', variant: 'h1' } },
          { id: 'booking-calendar', type: 'bookingCalendar', props: { source: entityId || 'appointment' } },
          { id: 'booking-form', type: 'bookingForm', props: {} }
        );
        break;
        
      case 'order_tracking':
        baseComponents.push(
          { id: 'orders-header', type: 'text', props: { text: 'My Orders', variant: 'h1' } },
          { id: 'orders-list', type: 'ordersList', props: { source: entityId || 'order', showStatus: true, showTracking: true } }
        );
        break;
        
      // === Catering Portal Components (bakeries, restaurants, caterers) ===
      case 'catering_request':
        baseComponents.push(
          { id: 'catering-header', type: 'text', props: { text: 'Request Catering', variant: 'h1' } },
          { id: 'catering-intro', type: 'text', props: { text: 'Let us make your event special. Fill out the form below and we\'ll send you a custom quote.', variant: 'body' } },
          { id: 'catering-form', type: 'form', props: { 
            source: entityId || 'cateringRequest',
            fields: [
              { id: 'eventType', label: 'Event Type', type: 'select', options: ['Wedding', 'Corporate', 'Birthday', 'Anniversary', 'Holiday', 'Other'] },
              { id: 'eventDate', label: 'Event Date', type: 'date', required: true },
              { id: 'eventTime', label: 'Event Time', type: 'time' },
              { id: 'guestCount', label: 'Number of Guests', type: 'number', required: true },
              { id: 'venue', label: 'Venue/Location', type: 'text' },
              { id: 'budget', label: 'Budget Range', type: 'select', options: ['Under $500', '$500-$1000', '$1000-$2500', '$2500-$5000', '$5000+'] },
              { id: 'preferences', label: 'Menu Preferences', type: 'textarea', placeholder: 'Tell us about your preferences, dietary restrictions, etc.' },
              { id: 'notes', label: 'Additional Notes', type: 'textarea' }
            ],
            submitLabel: 'Submit Request'
          } },
          { id: 'catering-contact', type: 'card', props: { title: 'Need Help?', content: 'Contact us directly for complex events.' } }
        );
        break;
        
      case 'quote_view':
        baseComponents.push(
          { id: 'quotes-header', type: 'text', props: { text: 'My Quotes', variant: 'h1' } },
          { id: 'pending-quotes', type: 'list', props: { 
            source: entityId || 'quote',
            title: 'Pending Approval',
            cardConfig: { titleField: 'eventType', subtitleField: 'eventDate', statusField: 'status', priceField: 'totalAmount' }
          } },
          { id: 'quote-actions', type: 'button', props: { label: 'Approve Quote', variant: 'primary' } }
        );
        break;
        
      case 'invoice_view':
        baseComponents.push(
          { id: 'invoices-header', type: 'text', props: { text: 'My Invoices', variant: 'h1' } },
          { id: 'invoices-list', type: 'dataTable', props: { 
            source: entityId || 'invoice',
            columns: ['invoiceNumber', 'eventDate', 'totalAmount', 'status', 'dueDate'],
            sortable: true
          } },
          { id: 'pay-btn', type: 'button', props: { label: 'Pay Now', variant: 'primary' } }
        );
        break;
        
      case 'delivery_schedule':
        baseComponents.push(
          { id: 'delivery-header', type: 'text', props: { text: 'Delivery Status', variant: 'h1' } },
          { id: 'active-deliveries', type: 'list', props: { 
            source: entityId || 'delivery',
            title: 'Active Deliveries',
            cardConfig: { titleField: 'orderNumber', subtitleField: 'deliveryDate', statusField: 'status' }
          } },
          { id: 'delivery-map', type: 'map', props: { source: entityId || 'delivery' } }
        );
        break;
        
      // === Tenant/Member Portal Components ===
      case 'tenant_portal':
        baseComponents.push(
          { id: 'welcome-banner', type: 'hero', props: { title: 'Welcome Back!', subtitle: 'Manage your tenancy from one place' } },
          { id: 'rent-status-card', type: 'statsCard', props: { title: 'Rent Status', icon: 'DollarSign', source: 'payment' } },
          { id: 'next-payment-card', type: 'statsCard', props: { title: 'Next Payment Due', icon: 'Calendar', source: 'payment' } },
          { id: 'maintenance-status-card', type: 'statsCard', props: { title: 'Open Requests', icon: 'Wrench', source: 'maintenanceRequest' } },
          { id: 'quick-actions', type: 'cardGrid', props: { columns: 4, items: [
            { title: 'Pay Rent', icon: 'DollarSign', route: '/tenant/payments' },
            { title: 'Maintenance', icon: 'Wrench', route: '/tenant/maintenance' },
            { title: 'Documents', icon: 'FileText', route: '/tenant/documents' },
            { title: 'Messages', icon: 'MessageSquare', route: '/tenant/notices' }
          ] } },
          { id: 'recent-notices', type: 'list', props: { source: 'notice', limit: 3, title: 'Recent Notices' } }
        );
        break;
        
      case 'lease_view':
        baseComponents.push(
          { id: 'lease-header', type: 'text', props: { text: 'My Lease Details', variant: 'h1' } },
          { id: 'lease-info-card', type: 'detailCard', props: { 
            source: entityId || 'lease',
            fields: ['unitNumber', 'startDate', 'endDate', 'monthlyRent', 'securityDeposit', 'status']
          } },
          { id: 'unit-info', type: 'detailCard', props: { source: 'unit', title: 'Unit Information' } },
          { id: 'lease-terms', type: 'richText', props: { source: 'lease', field: 'terms' } },
          { id: 'download-lease', type: 'button', props: { label: 'Download Lease PDF', variant: 'outline', icon: 'Download' } }
        );
        break;
        
      case 'rent_payment':
        baseComponents.push(
          { id: 'payment-header', type: 'text', props: { text: 'Pay Rent', variant: 'h1' } },
          { id: 'current-balance', type: 'statsCard', props: { title: 'Current Balance', value: '$0.00', icon: 'DollarSign', size: 'large' } },
          { id: 'next-due-date', type: 'statsCard', props: { title: 'Due Date', icon: 'Calendar' } },
          { id: 'payment-form', type: 'paymentForm', props: { 
            source: entityId || 'payment',
            showAmount: true,
            showPaymentMethod: true,
            methods: ['card', 'bank', 'check']
          } },
          { id: 'payment-history-header', type: 'text', props: { text: 'Payment History', variant: 'h2' } },
          { id: 'payment-history', type: 'dataTable', props: { 
            source: entityId || 'payment',
            columns: ['date', 'amount', 'method', 'status'],
            sortable: true,
            filterable: true
          } }
        );
        break;
        
      case 'maintenance_request':
        baseComponents.push(
          { id: 'maintenance-header', type: 'text', props: { text: 'Maintenance Requests', variant: 'h1' } },
          { id: 'new-request-btn', type: 'button', props: { label: 'New Request', variant: 'primary', icon: 'Plus', action: 'openModal', modal: 'maintenance-form' } },
          { id: 'active-requests', type: 'kanban', props: { 
            source: entityId || 'maintenanceRequest',
            columnField: 'status',
            columns: [
              { value: 'new', label: 'Submitted', color: 'blue' },
              { value: 'in_progress', label: 'In Progress', color: 'yellow' },
              { value: 'completed', label: 'Completed', color: 'green' }
            ],
            showTimeline: true
          } },
          { id: 'request-history', type: 'dataTable', props: { 
            source: entityId || 'maintenanceRequest',
            columns: ['title', 'category', 'status', 'createdAt', 'resolvedAt'],
            title: 'All Requests'
          } }
        );
        break;
        
      case 'document_library':
        baseComponents.push(
          { id: 'docs-header', type: 'text', props: { text: 'My Documents', variant: 'h1' } },
          { id: 'docs-search', type: 'searchInput', props: { placeholder: 'Search documents...' } },
          { id: 'docs-categories', type: 'tabs', props: { 
            tabs: [
              { id: 'all', label: 'All Documents' },
              { id: 'lease', label: 'Lease Documents' },
              { id: 'notices', label: 'Notices' },
              { id: 'invoices', label: 'Invoices' }
            ]
          } },
          { id: 'docs-list', type: 'fileList', props: { 
            source: entityId || 'document',
            showIcon: true,
            showDate: true,
            showSize: true,
            allowDownload: true
          } },
          { id: 'upload-btn', type: 'fileUpload', props: { label: 'Upload Document', accept: '.pdf,.doc,.docx,.jpg,.png' } }
        );
        break;
        
      case 'notices_board':
        baseComponents.push(
          { id: 'notices-header', type: 'text', props: { text: 'Notices & Announcements', variant: 'h1' } },
          { id: 'pinned-notices', type: 'list', props: { 
            source: entityId || 'notice',
            filter: { pinned: true },
            title: 'Important',
            emptyMessage: 'No pinned notices'
          } },
          { id: 'all-notices', type: 'timeline', props: { 
            source: entityId || 'notice',
            dateField: 'createdAt',
            titleField: 'title',
            contentField: 'content',
            showReadStatus: true
          } }
        );
        break;
        
      case 'message_center':
        baseComponents.push(
          { id: 'messages-header', type: 'text', props: { text: 'Messages', variant: 'h1' } },
          { id: 'new-message-btn', type: 'button', props: { label: 'New Message', variant: 'primary', icon: 'Edit' } },
          { id: 'messages-list', type: 'messageList', props: { 
            source: 'message',
            showAvatar: true,
            showTimestamp: true,
            groupByDate: true
          } },
          { id: 'message-composer', type: 'messageComposer', props: { placeholder: 'Type your message...' } }
        );
        break;
        
      case 'facility_booking':
        baseComponents.push(
          { id: 'booking-header', type: 'text', props: { text: 'Book Amenities', variant: 'h1' } },
          { id: 'amenities-grid', type: 'cardGrid', props: { 
            source: 'amenity',
            columns: 3,
            showImage: true,
            showAvailability: true
          } },
          { id: 'booking-calendar', type: 'calendar', props: { 
            source: 'reservation',
            mode: 'booking',
            showAvailability: true
          } },
          { id: 'my-reservations', type: 'list', props: { 
            source: 'reservation',
            title: 'My Reservations',
            filter: { upcoming: true }
          } }
        );
        break;
        
      case 'profile':
        baseComponents.push(
          { id: 'profile-header', type: 'text', props: { text: 'My Profile', variant: 'h1' } },
          { id: 'profile-form', type: 'profileForm', props: { source: entityId || 'customer' } }
        );
        break;
        
      default:
        baseComponents.push(
          { id: `${entityId || 'page'}-title`, type: 'text', props: { text: title || 'Page', variant: 'h1' } }
        );
    }
    
    return baseComponents;
  }
  
  /**
   * Find an entity by checking multiple possible type names
   */
  private findEntityByType(entities: EntityDef[], possibleIds: string[]): EntityDef | undefined {
    for (const id of possibleIds) {
      const found = entities.find(e => e.id.toLowerCase() === id.toLowerCase());
      if (found) return found;
    }
    // Also check by name
    for (const id of possibleIds) {
      const found = entities.find(e => e.name.toLowerCase().includes(id.toLowerCase()));
      if (found) return found;
    }
    return undefined;
  }
  
  /**
   * Get appropriate catalog name based on industry
   */
  private getCatalogName(kit: IndustryKit): string {
    const kitId = kit.id?.toLowerCase() || '';
    if (kitId.includes('restaurant') || kitId.includes('bakery') || kitId.includes('cafe')) {
      return 'Menu';
    }
    if (kitId.includes('salon') || kitId.includes('spa')) {
      return 'Services';
    }
    if (kitId.includes('retail') || kitId.includes('store')) {
      return 'Products';
    }
    return 'Catalog';
  }

  private createPage(
    idSeed: string, 
    name: string, 
    type: PageType, 
    entityId?: string, 
    showInSidebar = true,
    surface: SurfaceType = 'admin'
  ): PageDef {
    const id = this.slugify(idSeed);
    const layout = this.layoutEngine.layoutForPage(type);
    const components = this.buildComponentsForPage(type, entityId, name);

    return {
      id,
      name,
      route: `/${id}`,
      type,
      entity: entityId,
      layout,
      components,
      surface,  // Surface determines admin vs customer-facing
      navigation: {
        showInSidebar,
        order: 0,
      },
      autoLayout: {
        showHeader: true,
        showSidebar: surface === 'admin',  // Only admin pages have sidebars by default
        showFooter: surface === 'customer', // Customer pages have footers
      },
    };
  }

  private buildComponentsForPage(type: PageType, entityId?: string, title?: string): PageDef['components'] {
    if (type === 'custom' || type === 'timeline' || type === 'grid') {
      return [
        {
          id: `${entityId || 'page'}-title`,
          type: 'text',
          props: { text: title || 'Page', variant: 'h1' },
        },
        {
          id: `${entityId || 'page'}-list`,
          type: 'list',
          props: { source: entityId || 'items' },
        },
      ];
    }

    return [];
  }

  private resolveEntityForTitle(title: string, entities: EntityDef[], preferred?: string[]): EntityDef | undefined {
    const lower = title.toLowerCase();
    
    // First, check if any entity in the kit matches the preferred IDs
    if (preferred?.length) {
      const match = entities.find((entity) => preferred.includes(entity.id));
      if (match) return match;
    }

    // Override mappings for specific page titles to entity types
    const overrides: Record<string, string[]> = {
      technicians: ['staff'],
      staff: ['staff'],
      schedule: ['appointment'],
      calendar: ['appointment'],
      messaging: ['message'],
      messages: ['message'],
      materials: ['material'],
      inventory: ['material'],
      invoices: ['invoice'],
      quotes: ['quote'],
      jobs: ['job'],
      job: ['job'],
      pipeline: ['job'],
      timeline: ['job'],
      payments: ['payment'],
      documents: ['document'],
      gallery: ['gallery'],
      // CRM/client entities - check for industry-specific primary entities first
      clients: ['guest', 'patient', 'tenant', 'member', 'student', 'homeowner', 'vehicleOwner', 'propertyOwner', 'careRecipient', 'customer', 'businessClient', 'client'],
      client: ['guest', 'patient', 'tenant', 'member', 'student', 'homeowner', 'vehicleOwner', 'propertyOwner', 'careRecipient', 'customer', 'businessClient', 'client'],
    };

    for (const [keyword, entityIds] of Object.entries(overrides)) {
      if (lower.includes(keyword)) {
        // Try each possible entity ID in order of preference
        for (const entityId of entityIds) {
          const match = entities.find((entity) => entity.id === entityId);
          if (match) return match;
        }
      }
    }

    // Fallback: match by entity name
    return entities.find((entity) => {
      return lower.includes(entity.name.toLowerCase()) || lower.includes(entity.pluralName.toLowerCase());
    });
  }

  private guessPageType(title: string): PageType {
    const lower = title.toLowerCase();
    if (lower.includes('dashboard')) return 'dashboard';
    if (lower.includes('calendar') || lower.includes('schedule')) return 'calendar';
    if (lower.includes('pipeline') || lower.includes('kanban')) return 'kanban';
    if (lower.includes('timeline')) return 'timeline';
    if (lower.includes('gallery')) return 'grid';
    if (lower.includes('settings')) return 'custom';
    return 'list';
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
