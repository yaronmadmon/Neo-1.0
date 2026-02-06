import type { AppBlueprint, EntityDef, FieldDef, ProcessedIntent } from '../../types.js';
import type { IndustryFieldSpec, IndustryEntitySpec } from '../../kits/industries/types.js';
import { RequirementsEngine } from '../discovery/RequirementsEngine.js';
import { ProfessionExpander } from './ProfessionExpander.js';
import { PageGenerator } from '../materializer/PageGenerator.js';
import { WorkflowEngine } from '../workflows/WorkflowEngine.js';
import { ThemeBuilder } from '../../dna/theme-builder.js';

/**
 * Theme preset mappings for vibe-to-theme translation
 * Maps user-friendly vibe names to theme-builder presets
 */
const VIBE_TO_THEME_PRESET: Record<string, string> = {
  'clean': 'modern',
  'modern': 'modern',
  'calm': 'minimal',
  'minimal': 'minimal',
  'bold': 'bold',
  'energetic': 'bold',
  'professional': 'professional',
  'serious': 'professional',
  'fun': 'playful',
  'playful': 'playful',
  'elegant': 'elegant',
  'refined': 'elegant',
  'luxury': 'elegant',
  'tech': 'tech',
  'futuristic': 'tech',
  'natural': 'nature',
  'organic': 'nature',
  'nature': 'nature',
};

export class AppBlueprintEngine {
  private requirements = new RequirementsEngine();
  private expander = new ProfessionExpander();
  private pageGenerator = new PageGenerator();
  private workflowEngine = new WorkflowEngine();
  private themeBuilder = new ThemeBuilder();

  generate(intent: ProcessedIntent): AppBlueprint {
    const requirements = this.requirements.analyze({
      text: intent.rawInput || intent.extractedDetails?.appName || 'Business App',
      answers: intent.discoveredInfo,
    });

    // Extract personalization from discoveredInfo including customer-facing flags
    const discoveredInfo = intent.discoveredInfo as {
      businessName?: string;
      themePreset?: string;
      industry?: string;
      customerFacing?: boolean;
      providerFacing?: boolean;
      patientFacing?: boolean;
      customerFeatures?: {
        // E-commerce features
        browseCatalog?: boolean;
        placeOrders?: boolean;
        bookAppointments?: boolean;
        trackOrders?: boolean;
        manageProfile?: boolean;
        viewHistory?: boolean;
        usePromotions?: boolean;
        makePayments?: boolean;
        receiveNotifications?: boolean;
        // Tenant/member portal features
        viewLease?: boolean;
        payRent?: boolean;
        submitMaintenanceRequest?: boolean;
        viewMaintenanceStatus?: boolean;
        viewDocuments?: boolean;
        uploadDocuments?: boolean;
        viewNotices?: boolean;
        sendMessages?: boolean;
        viewSchedule?: boolean;
        makeReservations?: boolean;
      };
      providerFeatures?: {
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
      };
      patientFeatures?: {
        viewProfile?: boolean;
        updateProfile?: boolean;
        viewAppointments?: boolean;
        bookAppointments?: boolean;
        cancelAppointments?: boolean;
        viewTreatmentNotes?: boolean;
        viewDocuments?: boolean;
        uploadDocuments?: boolean;
        viewBilling?: boolean;
        makePayments?: boolean;
        sendMessages?: boolean;
        viewMessages?: boolean;
        submitForms?: boolean;
      };
    } | undefined;

    // Detect surfaces from input if not explicitly set
    const customerFacing = discoveredInfo?.customerFacing ?? this.detectCustomerFacingFromInput(intent.rawInput);
    const customerFeatures = discoveredInfo?.customerFeatures || this.inferCustomerFeatures(intent.rawInput);
    
    // Detect medical/healthcare specific surfaces
    const providerFacing = discoveredInfo?.providerFacing ?? this.detectProviderFacingFromInput(intent.rawInput);
    const patientFacing = discoveredInfo?.patientFacing ?? this.detectPatientFacingFromInput(intent.rawInput);
    const providerFeatures = discoveredInfo?.providerFeatures || this.inferProviderFeatures(intent.rawInput);
    const patientFeatures = discoveredInfo?.patientFeatures || this.inferPatientFeatures(intent.rawInput);

    const expansion = this.expander.expand(requirements.kit, requirements.professionId);
    const modules = this.mergeModules(requirements.selectedModules, expansion.extraModules);
    const entities = this.buildEntities(requirements.kit.entities);
    this.addBundleEntities(entities, modules);
    
    // Use business name from discovery if provided, otherwise fall back to kit name
    const businessName = discoveredInfo?.businessName;
    const displayName = businessName || requirements.kit.name;
    
    // Generate pages - now includes customer/provider/patient pages based on detection
    const pages = this.pageGenerator.generatePages({
      appName: displayName,
      kit: requirements.kit,
      entities,
      modules,
      requiredPageTitles: expansion.extraPages,
      customerFacing,          // Enable customer surface pages
      customerFeatures,        // Specific customer features detected
      providerFacing,          // Enable provider surface pages (medical apps)
      providerFeatures,        // Specific provider features detected
      patientFacing,           // Enable patient surface pages (medical apps)
      patientFeatures,         // Specific patient features detected
    });
    
    // Separate pages by surface for navigation
    const adminPages = pages.filter(p => !p.surface || p.surface === 'admin');
    const customerPages = pages.filter(p => p.surface === 'customer');
    const providerPages = pages.filter(p => p.surface === 'provider');
    const patientPages = pages.filter(p => p.surface === 'patient');
    
    adminPages.forEach((page, index) => {
      page.navigation = {
        showInSidebar: page.navigation?.showInSidebar ?? true,
        showInNavbar: page.navigation?.showInNavbar,
        parentPageId: page.navigation?.parentPageId,
        order: index,
      };
    });
    
    // Set up customer page navigation separately
    customerPages.forEach((page, index) => {
      page.navigation = {
        showInSidebar: page.navigation?.showInSidebar ?? true,
        showInNavbar: false,
        parentPageId: page.navigation?.parentPageId,
        order: index,
      };
    });
    
    // Set up provider page navigation (medical apps)
    providerPages.forEach((page, index) => {
      page.navigation = {
        showInSidebar: page.navigation?.showInSidebar ?? true,
        showInNavbar: false,
        parentPageId: page.navigation?.parentPageId,
        order: index,
      };
    });
    
    // Set up patient page navigation (medical apps)
    patientPages.forEach((page, index) => {
      page.navigation = {
        showInSidebar: page.navigation?.showInSidebar ?? true,
        showInNavbar: false,
        parentPageId: page.navigation?.parentPageId,
        order: index,
      };
    });
    
    const workflows = this.workflowEngine.build({ entities, kit: requirements.kit, modules });

    // App name for ID and metadata
    const appName = businessName || intent.extractedDetails?.appName || `${requirements.kit.name} App`;

    // Generate theme based on vibe/preset from discovery
    const theme = this.generateTheme(discoveredInfo?.themePreset, requirements.kit, discoveredInfo?.industry);

    // Generate branding with logo (use primary color from theme, or default purple)
    const branding = this.generateBranding(appName, theme?.primaryColor || '#8b5cf6');

    // Build the blueprint with dual-surface support
    const blueprint: AppBlueprint = {
      id: this.slugify(appName),
      version: 1,
      name: appName,
      description: businessName 
        ? `${businessName} - ${requirements.kit.name} management app`
        : requirements.kit.name + ' industry app',
      branding,
      behavior: requirements.kit.id,
      // Surfaces configuration - enables surfaces when detected
      surfaces: {
        admin: { 
          enabled: true, 
          defaultPage: adminPages[0]?.id || 'dashboard' 
        },
        // Provider surface (medical/healthcare apps)
        provider: providerFacing ? {
          enabled: true,
          defaultPage: providerPages[0]?.id || 'provider-dashboard',
          features: providerFeatures,
        } : { 
          enabled: false 
        },
        // Patient surface (medical/healthcare apps)
        patient: patientFacing ? {
          enabled: true,
          defaultPage: patientPages[0]?.id || 'patient-home',
          features: patientFeatures,
        } : { 
          enabled: false 
        },
        // Customer surface (e-commerce, tenant portals)
        customer: customerFacing && !patientFacing ? {
          enabled: true,
          defaultPage: customerPages[0]?.id || 'customer-home',
          features: customerFeatures,
        } : { 
          enabled: false 
        },
      } as any,
      entities,  // SHARED entities - single source of truth
      pages,     // All pages (admin + customer), distinguished by 'surface' field
      workflows, // SHARED workflows
      // Admin navigation
      navigation: {
        rules: adminPages.map((page) => ({
          id: `nav-${page.id}`,
          from: '*',
          to: page.id,
          trigger: 'link' as const,
        })),
        defaultPage: adminPages[0]?.id || 'dashboard',
        sidebar: {
          enabled: true,
          position: 'left' as const,
          collapsible: true,
          items: adminPages
            .filter((page) => page.navigation?.showInSidebar !== false)
            .map((page, index) => ({
              pageId: page.id,
              label: page.name,
              icon: page.icon,
              badge: undefined,
            })),
        },
      },
      theme,
      settings: {
        locale: 'en',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm',
        currency: 'USD',
      },
    };
    
    // Add provider navigation if provider surface is enabled (medical apps)
    if (providerFacing && providerPages.length > 0) {
      (blueprint as any).providerNavigation = {
        rules: providerPages.map((page) => ({
          id: `provider-nav-${page.id}`,
          from: '*',
          to: page.id,
          trigger: 'link' as const,
        })),
        defaultPage: providerPages[0]?.id || 'provider-dashboard',
        sidebar: {
          enabled: true,
          position: 'left' as const,
          collapsible: true,
          items: providerPages
            .filter((page) => page.navigation?.showInSidebar !== false)
            .map((page) => ({
              pageId: page.id,
              label: page.name,
              icon: page.icon,
              badge: undefined,
            })),
        },
        showProfile: true,
        showSchedule: true,
        showNotifications: true,
      };
    }
    
    // Add patient navigation if patient surface is enabled (medical apps)
    if (patientFacing && patientPages.length > 0) {
      (blueprint as any).patientNavigation = {
        rules: patientPages.map((page) => ({
          id: `patient-nav-${page.id}`,
          from: '*',
          to: page.id,
          trigger: 'link' as const,
        })),
        defaultPage: patientPages[0]?.id || 'patient-home',
        sidebar: {
          enabled: true,
          position: 'left' as const,
          collapsible: false,
          items: patientPages
            .filter((page) => page.navigation?.showInSidebar !== false)
            .map((page) => ({
              pageId: page.id,
              label: page.name,
              icon: page.icon,
              badge: undefined,
            })),
        },
        showProfile: true,
        showAppointments: patientFeatures?.viewAppointments || patientFeatures?.bookAppointments,
        showMessages: patientFeatures?.viewMessages || patientFeatures?.sendMessages,
      };
    }
    
    // Add customer navigation if customer surface is enabled (non-medical)
    if (customerFacing && !patientFacing && customerPages.length > 0) {
      blueprint.customerNavigation = {
        rules: customerPages.map((page) => ({
          id: `customer-nav-${page.id}`,
          from: '*',
          to: page.id,
          trigger: 'link' as const,
        })),
        defaultPage: customerPages[0]?.id || 'customer-home',
        sidebar: {
          enabled: true,
          position: 'left' as const,
          collapsible: false,
          items: customerPages
            .filter((page) => page.navigation?.showInSidebar !== false)
            .map((page) => ({
              pageId: page.id,
              label: page.name,
              icon: page.icon,
              badge: undefined,
            })),
        },
        showCart: customerFeatures?.placeOrders,
        showProfile: true,
        showOrderHistory: customerFeatures?.trackOrders || customerFeatures?.placeOrders,
      };
    }
    
    return blueprint;
  }
  
  /**
   * Detect customer-facing intent from raw input
   * Automatically enables customer surface when business clearly has external customers
   * Supports both e-commerce AND tenant/member portals
   */
  private detectCustomerFacingFromInput(input: string): boolean {
    if (!input) return false;
    
    const customerFacingPatterns = [
      // Customer/client action patterns - support plural forms (customers, clients, etc.)
      /\b(customers?|clients?|guests?|patients?|members?)\s+(can|should|will|need to|are able to|be able to)\b/i,
      // Online service patterns
      /\b(online|web)\s*(ordering|booking|reservation|appointment|purchase|shop)/i,
      // Browse/view patterns
      /\b(browse|view|see)\s+(the\s+)?(menu|catalog|products?|services?|items?)\b/i,
      // Checkout/payment patterns  
      /\b(checkout|check out|pay online|online payment)\b/i,
      // Order/status tracking
      /\b(track|tracking)\s+(their\s+)?(order|status|delivery|shipment)\b/i,
      // Promotions/coupons
      /\b(coupons?|discounts?|promos?|promotions?)\b/i,
      // Customer portal/app
      /\b(customers?|clients?)\s*(portal|app|interface|access)\b/i,
      // Place order patterns
      /\b(place|make|submit)\s+(an?\s+)?(orders?|bookings?|reservations?)\b/i,
      // Self-service
      /\bself[- ]?service\b/i,
      // Two-sided app patterns
      /\b(two[- ]?sided|dual[- ]?surface|customer[- ]?facing)\b/i,
      
      // === Tenant/Member Portal Patterns ===
      // Tenant action patterns
      /\b(tenants?|residents?|occupants?|renters?)\s+(can|should|will|need to|are able to|be able to)\b/i,
      // Tenant portal patterns
      /\b(tenant|resident|renter|member)\s*(portal|app|interface|access|login)\b/i,
      // Tenant-facing patterns
      /\b(tenant[- ]?facing|resident[- ]?facing)\b/i,
      // Rent payment patterns
      /\b(pay|paying|submit)\s+(their\s+)?(rent|dues|fees)\b/i,
      /\b(rent|dues)\s*(payment|pay|online)\b/i,
      // Lease viewing patterns
      /\b(view|see|access)\s+(their\s+)?(lease|contract|agreement)\b/i,
      // Maintenance request patterns
      /\b(submit|create|file|report)\s+(a\s+)?(maintenance|repair|service)\s*(request|ticket|issue)?\b/i,
      /\b(maintenance|repair)\s*(request|portal|submission)\b/i,
      /\b(tenants?|residents?).{0,30}(maintenance|repairs?)\b/i,
      // Document access patterns
      /\b(view|download|access)\s+(their\s+)?(documents?|files?|notices?|lease)\b/i,
      // Property management with external users
      /\b(property\s+management|real\s+estate|landlord|rental)\b.*\b(portal|app|tenant|resident)\b/i,
      // HOA/Condo patterns
      /\b(hoa|homeowner|condo|association)\s*(member)?\s*(portal|app)?\b/i,
      // Internal + external patterns
      /\b(internal|admin).{0,30}(external|tenant|resident|customer|member)\b/i,
      /\b(owner|admin|management).{0,30}(tenant|resident|member)\s*(portal|facing|app)?\b/i,
      
      // === Medical/Healthcare Patient Portal Patterns ===
      // Patient action patterns
      /\b(patients?)\s+(can|should|will|need to|are able to|be able to)\b/i,
      // Patient portal patterns  
      /\b(patient)\s*(portal|app|interface|access|login)\b/i,
      // Patient-facing patterns
      /\b(patient[- ]?facing)\b/i,
      // Multi-surface medical patterns
      /\b(multiple\s+surfaces?|three\s+surfaces?|admin.{0,20}provider.{0,20}patient)\b/i,
    ];
    
    return customerFacingPatterns.some(pattern => pattern.test(input));
  }
  
  /**
   * Detect if input describes a medical/healthcare app with provider surface
   */
  private detectProviderFacingFromInput(input: string): boolean {
    if (!input) return false;
    
    const providerFacingPatterns = [
      // Provider/doctor/therapist action patterns
      /\b(providers?|doctors?|therapists?|physicians?|nurses?|clinicians?)\s+(can|should|will|need to|are able to|be able to|view|create|manage)\b/i,
      // Provider surface/portal patterns
      /\b(provider|doctor|therapist)\s*(portal|app|interface|dashboard|view)\b/i,
      // Provider-facing patterns
      /\b(provider[- ]?facing)\b/i,
      // Medical/clinic with providers
      /\b(medical|clinic|healthcare|therapy|practice)\b.*\b(provider|doctor|therapist)\b/i,
      // Treatment notes patterns (provider-only)
      /\b(treatment|clinical|soap)\s*(notes?|records?)\b/i,
      // Provider schedule/availability
      /\b(provider|doctor)\s*(schedule|availability|calendar)\b/i,
      // Assigned patients
      /\b(assigned|my)\s*(patients?)\b/i,
      // Multi-surface with provider
      /\b(admin.{0,20}provider|provider.{0,20}patient)\b/i,
      // Multiple surfaces
      /\b(multiple\s+surfaces?|three\s+surfaces?)\b/i,
    ];
    
    return providerFacingPatterns.some(pattern => pattern.test(input));
  }
  
  /**
   * Detect if input describes a medical/healthcare app with patient surface
   */
  private detectPatientFacingFromInput(input: string): boolean {
    if (!input) return false;
    
    const patientFacingPatterns = [
      // Patient action patterns (more specific than customer)
      /\b(patients?)\s+(can|should|will|need to|are able to|be able to|view|book|see)\b/i,
      // Patient portal patterns
      /\b(patient)\s*(portal|app|interface|dashboard|view|access)\b/i,
      // Patient-facing patterns
      /\b(patient[- ]?facing|patient[- ]?surface)\b/i,
      // View medical records
      /\b(view|see|access).{0,15}(treatment|medical|health)\s*(notes?|records?|history)\b/i,
      // Book appointments (medical context)
      /\b(book|schedule|view).{0,10}(appointments?|visits?)\b/i,
      // Pay medical bills
      /\b(pay|view).{0,10}(bills?|billing|invoice)\b/i,
      // Message care team
      /\b(message|contact).{0,15}(care team|doctor|provider|therapist)\b/i,
      // Medical intake forms
      /\b(intake|consent|medical)\s*(forms?)\b/i,
      // Multi-surface with patient
      /\b(provider.{0,20}patient|admin.{0,30}patient)\b/i,
    ];
    
    return patientFacingPatterns.some(pattern => pattern.test(input));
  }
  
  /**
   * Infer specific provider features from input
   */
  private inferProviderFeatures(input: string): {
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
  } {
    if (!input) return {};
    
    return {
      viewAssignedPatients: /\b(assigned|my)\s*(patients?)\b/i.test(input) ||
                           /\b(view|see).{0,15}(patients?)\b/i.test(input),
      viewSchedule: /\b(schedule|calendar|appointments?)\b/i.test(input),
      manageAvailability: /\b(availability|available\s*slots?|set.{0,10}hours)\b/i.test(input),
      createTreatmentNotes: /\b(treatment|clinical|soap|progress)\s*(notes?)\b/i.test(input) ||
                           /\b(create|write).{0,10}(notes?)\b/i.test(input),
      viewPatientHistory: /\b(patient|medical).{0,10}(history|records?)\b/i.test(input),
      viewPatientDocuments: /\b(patient).{0,10}(documents?|files?)\b/i.test(input),
      sendMessages: /\b(message|communicate).{0,15}(patients?)\b/i.test(input),
      createPrescriptions: /\b(prescription|prescribe|medication)\b/i.test(input),
      createReferrals: /\b(referral|refer)\b/i.test(input),
      viewBilling: /\b(billing|charges?|fees?)\b/i.test(input),
    };
  }
  
  /**
   * Infer specific patient features from input
   */
  private inferPatientFeatures(input: string): {
    viewProfile?: boolean;
    updateProfile?: boolean;
    viewAppointments?: boolean;
    bookAppointments?: boolean;
    cancelAppointments?: boolean;
    viewTreatmentNotes?: boolean;
    viewDocuments?: boolean;
    uploadDocuments?: boolean;
    viewBilling?: boolean;
    makePayments?: boolean;
    sendMessages?: boolean;
    viewMessages?: boolean;
    submitForms?: boolean;
  } {
    if (!input) return {};
    
    return {
      viewProfile: /\b(view|see).{0,10}(profile|info|information)\b/i.test(input),
      updateProfile: /\b(update|edit|change).{0,10}(profile|contact|info)\b/i.test(input),
      viewAppointments: /\b(view|see).{0,10}(appointments?|visits?)\b/i.test(input),
      bookAppointments: /\b(book|schedule).{0,10}(appointments?|visits?)\b/i.test(input),
      cancelAppointments: /\b(cancel).{0,10}(appointments?|visits?)\b/i.test(input),
      viewTreatmentNotes: /\b(view|see).{0,15}(treatment|clinical|medical).{0,10}(notes?|records?)\b/i.test(input) ||
                         /\b(approved).{0,10}(records?|notes?)\b/i.test(input),
      viewDocuments: /\b(view|download).{0,10}(documents?|files?)\b/i.test(input),
      uploadDocuments: /\b(upload|submit).{0,10}(documents?|files?)\b/i.test(input),
      viewBilling: /\b(view|see).{0,10}(bills?|billing|balance)\b/i.test(input),
      makePayments: /\b(pay|make.{0,5}payment)\b/i.test(input),
      sendMessages: /\b(message|contact).{0,15}(care team|doctor|provider)\b/i.test(input),
      viewMessages: /\b(view|see).{0,10}(messages?)\b/i.test(input),
      submitForms: /\b(intake|consent).{0,10}(forms?)\b/i.test(input) ||
                   /\b(complete|submit).{0,10}(forms?)\b/i.test(input),
    };
  }
  
  /**
   * Infer specific customer features from input
   * Supports both e-commerce AND tenant/member portal features
   */
  private inferCustomerFeatures(input: string): {
    // E-commerce features
    browseCatalog?: boolean;
    placeOrders?: boolean;
    bookAppointments?: boolean;
    trackOrders?: boolean;
    usePromotions?: boolean;
    makePayments?: boolean;
    receiveNotifications?: boolean;
    // Tenant/member portal features
    viewLease?: boolean;
    payRent?: boolean;
    submitMaintenanceRequest?: boolean;
    viewMaintenanceStatus?: boolean;
    viewDocuments?: boolean;
    uploadDocuments?: boolean;
    viewNotices?: boolean;
    sendMessages?: boolean;
    viewSchedule?: boolean;
    makeReservations?: boolean;
  } {
    if (!input) return {};
    
    return {
      // E-commerce features
      browseCatalog: /\b(browse|menu|catalog|products?|items?|services?)\b/i.test(input),
      placeOrders: /\b(orders?|ordering|place.{0,10}order|purchase|buy|checkout)\b/i.test(input),
      bookAppointments: /\b(book|booking|appointments?|reservations?|schedule)\b/i.test(input),
      trackOrders: /\b(track|tracking|status|where.{0,10}order)\b/i.test(input),
      usePromotions: /\b(coupons?|discounts?|promos?|promotions?|loyalty|rewards?)\b/i.test(input),
      makePayments: /\b(pay|payments?|checkout|purchase|rent|dues|fees)\b/i.test(input),
      receiveNotifications: /\b(notif|alerts?|updates?|ready|when.{0,20}ready)\b/i.test(input),
      
      // Tenant/member portal features
      viewLease: /\b(view|see|access).{0,15}(lease|contract|agreement|terms)\b/i.test(input) ||
                 /\b(lease|contract).{0,15}(details?|info|view)\b/i.test(input),
      payRent: /\b(pay|paying|submit).{0,10}(rent|dues|fees)\b/i.test(input) ||
               /\b(rent|dues).{0,10}(payment|pay|online)\b/i.test(input) ||
               /\b(track|view).{0,15}(rent|payment).{0,10}(history|record)\b/i.test(input),
      submitMaintenanceRequest: /\b(submit|create|file|report|make).{0,10}(maintenance|repair|service).{0,5}(request|ticket|issue)?\b/i.test(input) ||
                                /\b(maintenance|repair).{0,10}(request|submission|portal)\b/i.test(input),
      viewMaintenanceStatus: /\b(view|track|check).{0,15}(maintenance|repair).{0,10}(status|progress)\b/i.test(input) ||
                            /\b(maintenance|repair).{0,10}(status|tracking)\b/i.test(input),
      viewDocuments: /\b(view|download|access).{0,10}(documents?|files?|lease|notices?|invoices?)\b/i.test(input) ||
                     /\b(document|file).{0,10}(library|access|download)\b/i.test(input),
      uploadDocuments: /\b(upload|submit).{0,10}(documents?|files?)\b/i.test(input),
      viewNotices: /\b(view|see|read).{0,10}(notices?|announcements?|messages?|communications?)\b/i.test(input) ||
                   /\b(notices?|announcements?).{0,10}(board|from|landlord|management)\b/i.test(input),
      sendMessages: /\b(send|write|contact).{0,10}(messages?|landlord|management|admin)\b/i.test(input) ||
                    /\b(communication|messaging).{0,10}(log|history|with)\b/i.test(input),
      viewSchedule: /\b(view|see|check).{0,10}(schedule|calendar)\b/i.test(input),
      makeReservations: /\b(book|reserve|schedule).{0,10}(amenities?|facilities?|common.{0,5}area)\b/i.test(input) ||
                        /\b(amenity|facility).{0,10}(booking|reservation)\b/i.test(input),
    };
  }

  /**
   * Generate theme based on vibe/preset preference
   * Falls back to kit-based defaults if no preset specified
   */
  private generateTheme(
    themePreset: string | undefined,
    kit: { uiStyle?: string; id: string },
    industry?: string
  ): AppBlueprint['theme'] {
    // If a theme preset is specified, use the ThemeBuilder
    if (themePreset) {
      // Normalize the preset name (handle vibe names like "calm", "fun", etc.)
      const normalizedPreset = VIBE_TO_THEME_PRESET[themePreset.toLowerCase()] || themePreset.toLowerCase();
      
      try {
        const builtTheme = this.themeBuilder.buildFromKeyword(normalizedPreset, {
          industry: industry || kit.id,
        });
        
        // Map ThemeBuilder border radius values to AppBlueprint expected values
        const borderRadiusMap: Record<string, 'none' | 'small' | 'medium' | 'large'> = {
          'none': 'none', 'sm': 'small', 'small': 'small',
          'md': 'medium', 'medium': 'medium',
          'lg': 'large', 'large': 'large', 'xl': 'large', 'full': 'large',
        };
        const mappedBorderRadius = borderRadiusMap[builtTheme.spacing?.borderRadius || 'medium'] || 'medium';
        
        return {
          primaryColor: builtTheme.colors.primary,
          secondaryColor: builtTheme.colors.secondary || '#4f46e5',
          accentColor: builtTheme.colors.accent || '#f97316',
          mode: builtTheme.mode === 'dark' ? 'dark' : 'light',
          surfaceIntent: builtTheme.surfaceIntent,
          borderRadius: mappedBorderRadius,
          fontFamily: builtTheme.typography?.fontFamily || 'system-ui, -apple-system, sans-serif',
        };
      } catch (e) {
        // Fall through to default if theme building fails
        console.warn('Theme building failed for preset:', themePreset, e);
      }
    }

    // Use ThemeBuilder with industry to get design system colors
    // This ensures industry-appropriate colors are used (e.g., teal for healthcare)
    const effectiveIndustry = industry || kit.id;
    
    try {
      const builtTheme = this.themeBuilder.build({
        industry: effectiveIndustry,
      });
      
      // Map ThemeBuilder border radius values to AppBlueprint expected values
      const borderRadiusMap: Record<string, 'none' | 'small' | 'medium' | 'large'> = {
        'none': 'none', 'sm': 'small', 'small': 'small',
        'md': 'medium', 'medium': 'medium',
        'lg': 'large', 'large': 'large', 'xl': 'large', 'full': 'large',
      };
      const mappedBorderRadius = borderRadiusMap[builtTheme.spacing?.borderRadius || 'medium'] || 'medium';
      
      return {
        primaryColor: builtTheme.colors.primary,
        secondaryColor: builtTheme.colors.secondary || '#4f46e5',
        accentColor: builtTheme.colors.accent || '#f97316',
        mode: builtTheme.mode === 'dark' ? 'dark' : 'light',
        surfaceIntent: builtTheme.surfaceIntent,
        borderRadius: mappedBorderRadius,
        fontFamily: builtTheme.typography?.fontFamily || 'system-ui, -apple-system, sans-serif',
        // Pass through design system info and custom vars for full theme support
        customVars: builtTheme.customVars,
      };
    } catch (e) {
      console.warn('Theme building failed for industry:', effectiveIndustry, e);
      
      // Ultimate fallback - basic defaults
      return {
        primaryColor: kit.uiStyle === 'bold' ? '#0f172a' : '#8b5cf6',
        secondaryColor: '#4f46e5',
        accentColor: '#f97316',
        mode: 'light',
        surfaceIntent: 'neutral-professional',
        borderRadius: 'medium',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      };
    }
  }

  /**
   * Generate branding with an initials-based logo
   */
  private generateBranding(
    appName: string,
    primaryColor: string
  ): AppBlueprint['branding'] {
    // Extract initials from the app/business name (up to 2 characters)
    const words = appName.split(/\s+/).filter(w => w.length > 0);
    let initials: string;
    
    if (words.length >= 2) {
      // First letter of first two words
      initials = (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1 && words[0].length >= 2) {
      // First two letters of single word
      initials = words[0].substring(0, 2).toUpperCase();
    } else {
      initials = (words[0]?.[0] || 'A').toUpperCase();
    }
    
    // Remove # from color for URL
    const bgColor = primaryColor.replace('#', '');
    
    // Generate logo URL using ui-avatars service (same as person avatars but larger)
    const logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bgColor}&color=fff&size=256&bold=true&font-size=0.4`;
    
    return {
      logo: logoUrl,
      logoText: initials,
      tagline: undefined,
    };
  }

  private buildEntities(entities: IndustryEntitySpec[]): EntityDef[] {
    return entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      pluralName: entity.pluralName,
      fields: entity.fields.map((field) => this.toFieldDef(field)),
      displayConfig: this.buildDisplayConfig(entity.fields),
      timestamps: { createdAt: true, updatedAt: true },
    }));
  }

  private toFieldDef(field: IndustryFieldSpec): FieldDef {
    return {
      id: field.id,
      name: field.name,
      type: field.type,
      required: field.required ?? false,
      description: field.description,
      enumOptions: field.enumOptions,
      displayOptions: field.displayOptions,
      reference: field.reference
        ? {
            targetEntity: field.reference.targetEntity,
            displayField: field.reference.displayField,
            relationship: 'many-to-many',
          }
        : undefined,
    };
  }

  private buildDisplayConfig(fields: IndustryFieldSpec[]): EntityDef['displayConfig'] {
    const titleField = fields.find((f) => f.id === 'name' || f.id === 'jobTitle' || f.id === 'projectName')?.id || fields[0]?.id || 'name';
    const subtitleField = fields.find((f) => f.id === 'status')?.id;
    return {
      titleField,
      subtitleField,
      listFields: fields.slice(0, 4).map((f) => f.id),
      searchFields: fields.slice(0, 3).map((f) => f.id),
    };
  }

  private addBundleEntities(entities: EntityDef[], modules: string[]): void {
    const existing = new Set(entities.map((entity) => entity.id));
    const templates: Record<string, EntityDef> = {
      gallery: this.createGenericEntity('gallery', 'Gallery Item', 'Gallery'),
      document: this.createGenericEntity('document', 'Document', 'Documents'),
      payment: this.createPaymentEntity(),
      notification: this.createGenericEntity('notification', 'Notification', 'Notifications'),
      role: this.createGenericEntity('role', 'Role', 'Roles'),
    };

    for (const moduleId of modules) {
      const bundle = modules.includes(moduleId) ? moduleId : null;
      if (bundle === 'gallery' && !existing.has('gallery')) {
        entities.push(templates.gallery);
        existing.add('gallery');
      }
      if (bundle === 'documents' && !existing.has('document')) {
        entities.push(templates.document);
        existing.add('document');
      }
      if (bundle === 'payments' && !existing.has('payment')) {
        entities.push(templates.payment);
        existing.add('payment');
      }
      if (bundle === 'notifications' && !existing.has('notification')) {
        entities.push(templates.notification);
        existing.add('notification');
      }
      if (bundle === 'permissions' && !existing.has('role')) {
        entities.push(templates.role);
        existing.add('role');
      }
    }
  }

  private createGenericEntity(id: string, name: string, pluralName: string): EntityDef {
    return {
      id,
      name,
      pluralName,
      fields: [
        { id: 'name', name: 'Name', type: 'string', required: true },
        { id: 'description', name: 'Description', type: 'richtext', required: false },
        {
          id: 'status',
          name: 'Status',
          type: 'enum',
          enumOptions: [
            { value: 'active', label: 'Active' },
            { value: 'archived', label: 'Archived' },
          ],
          required: false,
        },
      ],
      displayConfig: {
        titleField: 'name',
        subtitleField: 'status',
        listFields: ['name', 'status'],
        searchFields: ['name'],
      },
      timestamps: { createdAt: true, updatedAt: true },
    };
  }

  private createPaymentEntity(): EntityDef {
    return {
      id: 'payment',
      name: 'Payment',
      pluralName: 'Payments',
      fields: [
        { id: 'paymentNumber', name: 'Payment Number', type: 'string', required: true },
        { id: 'amount', name: 'Amount', type: 'currency', required: true },
        { id: 'paymentDate', name: 'Payment Date', type: 'date', required: false },
        {
          id: 'status',
          name: 'Status',
          type: 'enum',
          enumOptions: [
            { value: 'pending', label: 'Pending' },
            { value: 'completed', label: 'Completed' },
            { value: 'failed', label: 'Failed' },
          ],
          required: false,
        },
      ],
      displayConfig: {
        titleField: 'paymentNumber',
        subtitleField: 'status',
        listFields: ['paymentNumber', 'amount', 'status'],
        searchFields: ['paymentNumber'],
      },
      timestamps: { createdAt: true, updatedAt: true },
    };
  }

  private mergeModules(base: string[], extras: string[]): string[] {
    const set = new Set<string>(base);
    for (const moduleId of extras) set.add(moduleId);
    set.add('dashboard');
    set.add('settings');
    return Array.from(set);
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
