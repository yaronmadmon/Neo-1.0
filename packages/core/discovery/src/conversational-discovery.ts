/**
 * Conversational Discovery Service
 * 
 * SMART DISCOVERY FLOW:
 * 1. Detect industry from user input
 * 2. Ask 3-4 SMART questions relevant to that industry
 * 3. Show what we'll build based on answers
 * 4. User confirms → Build
 * 
 * Rules:
 * - Minimum 3 questions, maximum 4 questions
 * - Questions must be industry-specific and relevant
 * - After questions, SHOW the features we'll build
 * - Then get confirmation
 */

import type { AIProviderForDiscovery } from './ai-discovery-handler.js';

/**
 * Question limits for discovery
 */
const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 4;

/**
 * Vibe/Theme presets that map to existing theme presets
 * These are user-friendly labels that map to theme-builder presets
 */
const VIBE_PRESETS: Array<{ label: string; value: string; description: string }> = [
  { label: 'Clean & Modern', value: 'modern', description: 'Contemporary look with smooth animations' },
  { label: 'Calm & Minimal', value: 'minimal', description: 'Simple, understated, lots of white space' },
  { label: 'Bold & Energetic', value: 'bold', description: 'High contrast, strong typography' },
  { label: 'Professional', value: 'professional', description: 'Trustworthy, corporate feel' },
  { label: 'Fun & Playful', value: 'playful', description: 'Colorful, rounded, friendly' },
  { label: 'Elegant & Refined', value: 'elegant', description: 'Luxurious, serif fonts, sophisticated' },
  { label: 'Tech & Futuristic', value: 'tech', description: 'Sci-fi inspired, compact, cyber' },
  { label: 'Natural & Organic', value: 'nature', description: 'Earthy greens, relaxed, organic feel' },
];

// Legacy constants kept for backwards compatibility
const MIN_CONFIDENCE_FOR_AUTO_COMPLETE = 0.95;
const MIN_CONFIDENCE_FOR_CONFIRM = 0.70;

/**
 * Kit Knowledge - What we know about each industry
 * This tells the AI what features are available and what smart questions to ask
 */
interface KitKnowledge {
  name: string;
  coreFeatures: string[];  // Always included
  optionalFeatures: string[];  // Can be added based on answers
  smartQuestions: Array<{
    id: string;
    question: string;
    purpose: string;  // What this question helps us understand
    featureImpact: string[];  // Which features this affects
  }>;
  featureDescriptions: Record<string, string>;  // Human-readable feature descriptions
}

const KIT_KNOWLEDGE: Record<string, KitKnowledge> = {
  plumber: {
    name: 'Plumber',
    coreFeatures: ['jobs', 'clients', 'scheduling', 'invoicing'],
    optionalFeatures: ['online_payments', 'team_management', 'materials_tracking', 'quotes', 'document_scanner'],
    smartQuestions: [
      {
        id: 'service_type',
        question: "What type of plumbing work do you mostly do - emergency repairs, new installations, or both?",
        purpose: "Understand urgency levels and job types",
        featureImpact: ['urgency_levels', 'job_types']
      },
      {
        id: 'team_size',
        question: "Do you work solo or have a team of technicians?",
        purpose: "Team management needs",
        featureImpact: ['team_management', 'technician_assignment']
      },
      {
        id: 'payment_needs',
        question: "Do you need to collect payments on-site or send invoices for later payment?",
        purpose: "Payment workflow",
        featureImpact: ['online_payments', 'invoicing']
      },
      {
        id: 'materials',
        question: "Do you need to track parts and materials inventory?",
        purpose: "Inventory needs",
        featureImpact: ['materials_tracking', 'inventory']
      }
    ],
    featureDescriptions: {
      jobs: "Job tracking with status updates",
      clients: "Client/homeowner database",
      scheduling: "Appointment scheduling & calendar",
      invoicing: "Create and send invoices",
      online_payments: "Collect payments online",
      team_management: "Manage technicians & assignments",
      materials_tracking: "Track parts & inventory",
      quotes: "Create estimates & quotes",
      urgency_levels: "Emergency vs. routine job priority",
      document_scanner: "Scan receipts & documents"
    }
  },
  electrician: {
    name: 'Electrician',
    coreFeatures: ['jobs', 'clients', 'scheduling', 'invoicing'],
    optionalFeatures: ['online_payments', 'team_management', 'permits', 'quotes'],
    smartQuestions: [
      {
        id: 'service_type',
        question: "What electrical work do you specialize in - residential, commercial, or both?",
        purpose: "Service scope",
        featureImpact: ['job_types', 'pricing']
      },
      {
        id: 'team_size',
        question: "Do you work solo or have a crew?",
        purpose: "Team management needs",
        featureImpact: ['team_management']
      },
      {
        id: 'permits',
        question: "Do you often need to track permits and inspections?",
        purpose: "Compliance tracking",
        featureImpact: ['permits', 'documents']
      },
      {
        id: 'payment_needs',
        question: "How do customers typically pay you - on-site, invoice, or both?",
        purpose: "Payment workflow",
        featureImpact: ['online_payments', 'invoicing']
      }
    ],
    featureDescriptions: {
      jobs: "Job tracking with status",
      clients: "Client database",
      scheduling: "Scheduling & calendar",
      invoicing: "Invoicing",
      online_payments: "Online payment collection",
      team_management: "Crew management",
      permits: "Permit & inspection tracking",
      quotes: "Estimates & quotes"
    }
  },
  salon: {
    name: 'Salon',
    coreFeatures: ['appointments', 'clients', 'services', 'staff'],
    optionalFeatures: ['online_booking', 'payments', 'inventory', 'loyalty'],
    smartQuestions: [
      {
        id: 'services',
        question: "What services do you offer - hair, nails, spa treatments, or a mix?",
        purpose: "Service types",
        featureImpact: ['services', 'pricing']
      },
      {
        id: 'team_size',
        question: "How many stylists/staff do you have?",
        purpose: "Staff management needs",
        featureImpact: ['staff', 'scheduling']
      },
      {
        id: 'booking',
        question: "Do you want clients to book appointments online, or just by phone/walk-in?",
        purpose: "Booking workflow",
        featureImpact: ['online_booking']
      },
      {
        id: 'payments',
        question: "Do you need to track product sales and inventory, or just services?",
        purpose: "Inventory needs",
        featureImpact: ['inventory', 'products']
      }
    ],
    featureDescriptions: {
      appointments: "Appointment booking & calendar",
      clients: "Client profiles & history",
      services: "Service menu & pricing",
      staff: "Staff schedules & assignments",
      online_booking: "Online appointment booking",
      payments: "Payment processing",
      inventory: "Product inventory",
      loyalty: "Loyalty program"
    }
  },
  restaurant: {
    name: 'Restaurant',
    coreFeatures: ['menu', 'orders', 'tables', 'staff'],
    optionalFeatures: ['reservations', 'online_ordering', 'inventory', 'delivery'],
    smartQuestions: [
      {
        id: 'service_type',
        question: "What type of restaurant - dine-in, takeout, delivery, or all of the above?",
        purpose: "Service model",
        featureImpact: ['tables', 'delivery', 'online_ordering']
      },
      {
        id: 'reservations',
        question: "Do you take reservations, or is it walk-in only?",
        purpose: "Reservation needs",
        featureImpact: ['reservations']
      },
      {
        id: 'team_size',
        question: "How big is your team - just you, small crew, or full staff?",
        purpose: "Staff management",
        featureImpact: ['staff', 'scheduling']
      },
      {
        id: 'inventory',
        question: "Do you need to track ingredient inventory?",
        purpose: "Inventory management",
        featureImpact: ['inventory']
      }
    ],
    featureDescriptions: {
      menu: "Menu management",
      orders: "Order tracking",
      tables: "Table management",
      staff: "Staff scheduling",
      reservations: "Reservation system",
      online_ordering: "Online ordering",
      inventory: "Ingredient inventory",
      delivery: "Delivery management"
    }
  },
  'real estate': {
    name: 'Real Estate',
    coreFeatures: ['properties', 'clients', 'showings', 'documents'],
    optionalFeatures: ['rent_collection', 'tenant_portal', 'maintenance', 'listings'],
    smartQuestions: [
      {
        id: 'business_type',
        question: "Do you focus on sales, rentals/property management, or both?",
        purpose: "Business model",
        featureImpact: ['rent_collection', 'listings', 'tenant_portal']
      },
      {
        id: 'team_size',
        question: "Are you a solo agent or part of a team/brokerage?",
        purpose: "Team needs",
        featureImpact: ['team_management', 'lead_sharing']
      },
      {
        id: 'payments',
        question: "Do you need to collect rent or payments online?",
        purpose: "Payment collection",
        featureImpact: ['rent_collection', 'online_payments']
      },
      {
        id: 'maintenance',
        question: "Do you handle property maintenance requests?",
        purpose: "Maintenance workflow",
        featureImpact: ['maintenance', 'work_orders']
      }
    ],
    featureDescriptions: {
      properties: "Property listings & details",
      clients: "Client/lead database",
      showings: "Showing scheduling",
      documents: "Document management",
      rent_collection: "Online rent collection",
      tenant_portal: "Tenant self-service portal",
      maintenance: "Maintenance request tracking",
      listings: "MLS-style listings"
    }
  },
  'property management': {
    name: 'Property Management',
    coreFeatures: ['properties', 'units', 'tenants', 'leases', 'rent_payments', 'maintenance_requests', 'documents'],
    optionalFeatures: ['tenant_portal', 'online_payments', 'reports', 'notices', 'communication_log'],
    smartQuestions: [
      {
        id: 'portfolio_size',
        question: "How many properties and units do you manage?",
        purpose: "Scale of operations",
        featureImpact: ['bulk_operations', 'reports', 'team_management']
      },
      {
        id: 'tenant_portal',
        question: "Do tenants need their own portal to pay rent, submit maintenance requests, and view documents?",
        purpose: "Tenant self-service",
        featureImpact: ['tenant_portal', 'online_payments', 'maintenance_requests']
      },
      {
        id: 'maintenance_workflow',
        question: "How do you handle maintenance - in-house team, external contractors, or both?",
        purpose: "Maintenance workflow",
        featureImpact: ['maintenance_requests', 'vendor_management', 'work_orders']
      },
      {
        id: 'reporting_needs',
        question: "Do you need detailed financial reports by property, tenant, or time period?",
        purpose: "Reporting requirements",
        featureImpact: ['reports', 'financial_tracking', 'occupancy_tracking']
      }
    ],
    featureDescriptions: {
      properties: "Track all your properties with addresses and details",
      units: "Manage individual units within properties",
      tenants: "Tenant database with contact info and lease history",
      leases: "Lease agreements with terms, dates, and documents",
      rent_payments: "Track rent payments, late fees, and payment history",
      maintenance_requests: "Tenant-submitted maintenance requests with status tracking",
      documents: "Store leases, notices, invoices, and other documents",
      tenant_portal: "Self-service portal for tenants to pay rent, submit requests, view documents",
      online_payments: "Accept rent payments online via card or bank transfer",
      reports: "Financial and occupancy reports by property, tenant, and period",
      notices: "Send and track notices to tenants",
      communication_log: "Log all communications with tenants"
    }
  },
  'landlord': {
    name: 'Property Management',
    coreFeatures: ['properties', 'units', 'tenants', 'leases', 'rent_payments', 'maintenance_requests'],
    optionalFeatures: ['tenant_portal', 'online_payments', 'documents', 'reports'],
    smartQuestions: [
      {
        id: 'portfolio_size',
        question: "How many rental properties or units do you own?",
        purpose: "Scale of operations",
        featureImpact: ['units', 'reports']
      },
      {
        id: 'tenant_portal',
        question: "Would you like tenants to have their own portal to pay rent and submit maintenance requests?",
        purpose: "Tenant self-service",
        featureImpact: ['tenant_portal', 'online_payments', 'maintenance_requests']
      },
      {
        id: 'payment_tracking',
        question: "How do you currently track rent payments and late fees?",
        purpose: "Payment workflow",
        featureImpact: ['rent_payments', 'online_payments', 'reports']
      },
      {
        id: 'maintenance',
        question: "How do tenants report maintenance issues to you?",
        purpose: "Maintenance workflow",
        featureImpact: ['maintenance_requests', 'tenant_portal']
      }
    ],
    featureDescriptions: {
      properties: "Track your rental properties",
      units: "Manage units within each property",
      tenants: "Tenant information and history",
      leases: "Lease terms and documents",
      rent_payments: "Track rent payments and due dates",
      maintenance_requests: "Maintenance request tracking",
      tenant_portal: "Tenant self-service portal",
      online_payments: "Online rent collection",
      documents: "Document storage",
      reports: "Financial and occupancy reports"
    }
  },
  contractor: {
    name: 'Contractor',
    coreFeatures: ['projects', 'clients', 'estimates', 'invoicing'],
    optionalFeatures: ['team_management', 'materials', 'timeline', 'photos'],
    smartQuestions: [
      {
        id: 'project_type',
        question: "What type of projects - remodeling, new construction, repairs, or a mix?",
        purpose: "Project complexity",
        featureImpact: ['projects', 'timeline']
      },
      {
        id: 'team_size',
        question: "Do you work solo or have a crew/subcontractors?",
        purpose: "Team management",
        featureImpact: ['team_management', 'scheduling']
      },
      {
        id: 'estimates',
        question: "Do you create detailed estimates/bids for projects?",
        purpose: "Estimating needs",
        featureImpact: ['estimates', 'quotes']
      },
      {
        id: 'photos',
        question: "Do you need to track before/after photos and project progress?",
        purpose: "Documentation",
        featureImpact: ['photos', 'timeline']
      }
    ],
    featureDescriptions: {
      projects: "Project tracking",
      clients: "Client database",
      estimates: "Estimates & bids",
      invoicing: "Invoicing",
      team_management: "Crew management",
      materials: "Materials tracking",
      timeline: "Project timeline",
      photos: "Photo documentation"
    }
  },
  cleaning: {
    name: 'Cleaning Service',
    coreFeatures: ['jobs', 'clients', 'scheduling', 'invoicing'],
    optionalFeatures: ['team_management', 'supplies', 'recurring', 'checklists'],
    smartQuestions: [
      {
        id: 'service_type',
        question: "Do you do residential cleaning, commercial, or both?",
        purpose: "Service type",
        featureImpact: ['job_types', 'pricing']
      },
      {
        id: 'team_size',
        question: "Do you clean solo or have a team?",
        purpose: "Team needs",
        featureImpact: ['team_management', 'assignments']
      },
      {
        id: 'recurring',
        question: "Do most clients have recurring schedules (weekly, bi-weekly)?",
        purpose: "Scheduling pattern",
        featureImpact: ['recurring', 'scheduling']
      },
      {
        id: 'supplies',
        question: "Do you need to track cleaning supplies and inventory?",
        purpose: "Supply management",
        featureImpact: ['supplies', 'inventory']
      }
    ],
    featureDescriptions: {
      jobs: "Job tracking",
      clients: "Client database",
      scheduling: "Scheduling & calendar",
      invoicing: "Invoicing",
      team_management: "Team assignments",
      supplies: "Supply tracking",
      recurring: "Recurring job scheduling",
      checklists: "Cleaning checklists"
    }
  },
  fitness: {
    name: 'Fitness / Gym',
    coreFeatures: ['members', 'classes', 'schedule', 'check_in'],
    optionalFeatures: ['payments', 'trainers', 'equipment', 'nutrition'],
    smartQuestions: [
      {
        id: 'business_type',
        question: "Is this for a gym, personal training, fitness classes, or a mix?",
        purpose: "Business model",
        featureImpact: ['classes', 'trainers', 'members']
      },
      {
        id: 'memberships',
        question: "Do you have membership plans or pay-per-session?",
        purpose: "Payment model",
        featureImpact: ['payments', 'memberships']
      },
      {
        id: 'team_size',
        question: "Do you have multiple trainers/instructors?",
        purpose: "Staff needs",
        featureImpact: ['trainers', 'scheduling']
      },
      {
        id: 'tracking',
        question: "Do you want to track client progress and workouts?",
        purpose: "Progress tracking",
        featureImpact: ['progress', 'workouts']
      }
    ],
    featureDescriptions: {
      members: "Member management",
      classes: "Class scheduling",
      schedule: "Calendar & bookings",
      check_in: "Member check-in",
      payments: "Payment processing",
      trainers: "Trainer management",
      equipment: "Equipment tracking",
      nutrition: "Nutrition tracking"
    }
  }
};

// Default kit for unknown industries
const DEFAULT_KIT: KitKnowledge = {
  name: 'Business',
  coreFeatures: ['clients', 'tasks', 'calendar', 'notes'],
  optionalFeatures: ['invoicing', 'team', 'documents'],
  smartQuestions: [
    {
      id: 'business_type',
      question: "What does your business do day-to-day?",
      purpose: "Core workflow",
      featureImpact: ['tasks', 'workflow']
    },
    {
      id: 'clients',
      question: "Do you work with clients/customers directly?",
      purpose: "Client management",
      featureImpact: ['clients', 'crm']
    },
    {
      id: 'team_size',
      question: "Is it just you or do you have a team?",
      purpose: "Team needs",
      featureImpact: ['team']
    },
    {
      id: 'payments',
      question: "Do you need to send invoices or collect payments?",
      purpose: "Payment needs",
      featureImpact: ['invoicing', 'payments']
    }
  ],
  featureDescriptions: {
    clients: "Client database",
    tasks: "Task management",
    calendar: "Calendar & scheduling",
    notes: "Notes & documentation",
    invoicing: "Invoicing",
    team: "Team management",
    documents: "Document storage"
  }
};

/**
 * Get kit knowledge for an industry
 */
function getKitKnowledge(industry: string): KitKnowledge {
  const normalized = industry.toLowerCase().trim();
  return KIT_KNOWLEDGE[normalized] || DEFAULT_KIT;
}

/**
 * Conversation state for chat-based discovery
 */
export interface ConversationState {
  step: number;
  collectedInfo: Record<string, unknown>;
  originalInput: string;
  detectedIndustry?: string;
  detectedIntent?: string;
  questionsAsked: string[];
  /** Number of smart questions asked (tracked for min 3, max 4 limit) */
  questionCount: number;
  confidence: number;
  /** Whether user has explicitly confirmed they want to proceed */
  userConfirmed?: boolean;
  /** Pending confirmation - discovery is offering to build but awaiting user confirmation */
  pendingConfirmation?: boolean;
  /** Features that will be enabled based on user answers */
  enabledFeatures: string[];
  /** User's answers to questions (for building feature summary) */
  answers: Record<string, string>;
}

/**
 * Chat response from the discovery service
 * 
 * NOTE: options and quickReplies are DEPRECATED.
 * They remain in the interface for backward compatibility but should not be populated.
 * Frontend should render free-text input, not buttons.
 */
export interface ChatResponse {
  message?: string;
  acknowledgment?: string;
  question?: string;
  /** @deprecated - Do not populate. Use free-text input instead of forced options. */
  options?: string[];
  /** @deprecated - Do not populate. Buttons force users into predefined paths. */
  quickReplies?: string[];
  complete: boolean;
  appConfig?: Record<string, unknown>;
  completionMessage?: string;
  step: number;
  collectedInfo: Record<string, unknown>;
  questionsAsked?: string[];
  /** Number of smart questions asked (min 3, max 4) */
  questionCount?: number;
  /** Accumulated answers to questions (for vibe, businessName, etc.) */
  answers?: Record<string, unknown>;
  /** Features that will be enabled based on user answers */
  enabledFeatures?: string[];
  confidence?: number;
  /** If true, user must confirm before building. Prevents premature completion. */
  requiresConfirmation?: boolean;
  /** If true, the next response is expected to be a confirmation (yes/no). */
  pendingConfirmation?: boolean;
}

// Context-aware responses - different responses based on what we actually learned
const RESPONSES = {
  // When we understand the industry clearly
  industryUnderstood: (industry: string) => [
    `Got it - ${industry}! I can work with that.`,
    `${industry} - perfect, I know exactly the kind of app you need.`,
    `A ${industry} app - great, that helps me understand what to build.`,
  ],
  
  // When user says "Other" or something vague - ASK FOR CLARIFICATION
  needsClarification: [
    "I'd like to understand better - can you tell me what your business actually does? What's the main service or product?",
    "Help me out - what kind of work do you do day-to-day? That'll help me build the right app.",
    "I want to make sure I build something useful - what does your business do exactly?",
  ],
  
  // When we learn team size
  teamSizeUnderstood: {
    solo: [
      "Solo operation - got it. I'll keep things simple and focused.",
      "Just you - perfect, I'll build something lean that doesn't overwhelm.",
    ],
    small: [
      "Small team - I'll include what you need to coordinate without overcomplicating things.",
      "Got it, small crew. I'll add team features that actually help.",
    ],
    team: [
      "Larger team - I'll make sure there's proper organization and permissions.",
      "Understood - I'll build in the team management features you'll need.",
    ],
  },
  
  // When we learned nothing useful
  learnedNothing: [
    "I'm not quite following - can you tell me more about what you need?",
    "Help me understand better - what kind of business is this for?",
    "I want to make sure I get this right - what does your business do?",
  ],
  
  // Neutral acknowledgment when we got partial info
  neutral: [
    "Okay.",
    "Got it.",
    "Understood.",
  ],
  
  // When ready to build
  readyToBuild: (industry: string, teamSize: string) => [
    `Got it - a ${industry} app for ${teamSize === 'solo' ? 'a solo operation' : 'a team'}. Let me build that for you.`,
    `Perfect - I understand what you need. Building your ${industry} app now.`,
    `Clear picture now. Let me create something that fits your ${industry} business.`,
  ],
  
  // Generic completion
  completion: [
    "Alright, I have what I need. Building your app now.",
    "Got enough to work with. Let me put this together for you.",
    "I think I understand what you need. Building it now.",
  ],
};

/**
 * @deprecated QUESTIONS object is deprecated.
 * 
 * WHY: Hardcoded questions with predefined options cause:
 * 1. Premature completion - system rushes to match users to categories
 * 2. Generic apps - users are forced into predefined paths instead of describing their unique needs
 * 3. Poor UX - feels like a form, not a conversation
 * 
 * INSTEAD: Use AI to dynamically generate contextual follow-up questions based on:
 * - What the user has already said
 * - What information is still uncertain
 * - Domain knowledge from industry kits (as reference, not forced categories)
 * 
 * This object is preserved for reference and backward compatibility only.
 * New code should NOT use these hardcoded questions.
 */
const QUESTIONS_DEPRECATED = {
  industry: {
    question: "What kind of business or project is this for?",
    friendlyVariants: [
      "Tell me a bit about your business - what do you do?",
      "What kind of business are we building this for?",
      "I'd love to know more - what's your business about?",
    ],
    // NOTE: These options are DEPRECATED - they force users into categories
    options: ['Restaurant', 'Salon/Spa', 'Fitness/Gym', 'Real Estate', 'Medical/Health', 'Retail/Shop', 'Services', 'Other'],
  },
  teamSize: {
    question: "Is it just you, or do you have a team?",
    friendlyVariants: [
      "Will you be using this solo, or with a team?",
      "Are you flying solo on this, or is there a team involved?",
      "Quick one - is this for just you, or do you have people helping you?",
    ],
    options: ['Just me', 'Small team (2-5)', 'Larger team (6+)'],
  },
  mainGoal: {
    question: "What's the main thing you want this app to help with?",
    friendlyVariants: [
      "What's the #1 problem you want this to solve?",
      "If this app could do one thing really well, what would it be?",
      "What's the biggest headache this should fix for you?",
    ],
    options: ['Manage bookings/appointments', 'Track customers/clients', 'Handle orders/sales', 'Organize my work', 'All of the above'],
  },
  customerFacing: {
    question: "Will your customers use this too, or just you/your team?",
    friendlyVariants: [
      "Should customers be able to book or order through this?",
      "Do you need a customer-facing side, or is this internal only?",
    ],
    options: ['Yes, customers will use it', 'No, just internal', 'Maybe later'],
  },
};

/**
 * Sub-vertical questions to distinguish between similar industries
 */
const SUB_VERTICAL_QUESTIONS: Record<string, {
  trigger: string;
  question: string;
  options: Array<{ label: string; kit: string }>;
}> = {
  real_estate: {
    trigger: 'real-estate',
    question: "Are you managing rental properties, or helping people buy/sell homes?",
    options: [
      { label: "Managing rental properties (landlord/property manager)", kit: 'property-management' },
      { label: "Helping people buy/sell homes (real estate agent)", kit: 'real-estate' },
    ],
  },
  fitness: {
    trigger: 'fitness-coach',
    question: "Are you a personal trainer working 1-on-1, or running a gym with memberships?",
    options: [
      { label: "Personal trainer (1-on-1 clients)", kit: 'fitness-coach' },
      { label: "Gym or studio with memberships", kit: 'gym' },
    ],
  },
  cleaning: {
    trigger: 'cleaning',
    question: "Are you cleaning homes, or commercial/office buildings?",
    options: [
      { label: "Residential cleaning (homes)", kit: 'cleaning' },
      { label: "Commercial cleaning (offices/buildings)", kit: 'commercial-cleaning' },
    ],
  },
};

/**
 * Complexity questions to tailor the app based on business size
 * Affects: features included, UI complexity, permissions system
 */
const COMPLEXITY_QUESTIONS: Record<string, {
  question: string;
  options: Array<{ label: string; complexity: 'simple' | 'medium' | 'advanced' }>;
}> = {
  'property-management': {
    question: "How many properties do you manage?",
    options: [
      { label: "1-5 properties (solo landlord)", complexity: 'simple' },
      { label: "6-50 properties (small company)", complexity: 'medium' },
      { label: "50+ properties (large company)", complexity: 'advanced' },
    ],
  },
  'gym': {
    question: "What's the size of your gym?",
    options: [
      { label: "Small studio (1 location)", complexity: 'simple' },
      { label: "Medium gym (1-3 locations)", complexity: 'medium' },
      { label: "Large gym chain (4+ locations)", complexity: 'advanced' },
    ],
  },
  'tutor': {
    question: "How many students do you work with?",
    options: [
      { label: "1-10 students (independent tutor)", complexity: 'simple' },
      { label: "11-50 students (small tutoring business)", complexity: 'medium' },
      { label: "50+ students (tutoring center)", complexity: 'advanced' },
    ],
  },
  'cleaning': {
    question: "How many clients do you serve?",
    options: [
      { label: "1-10 regular clients (solo cleaner)", complexity: 'simple' },
      { label: "11-50 clients (small team)", complexity: 'medium' },
      { label: "50+ clients (cleaning company)", complexity: 'advanced' },
    ],
  },
  'commercial-cleaning': {
    question: "How many buildings/contracts do you manage?",
    options: [
      { label: "1-5 buildings (small operation)", complexity: 'simple' },
      { label: "6-20 buildings (medium company)", complexity: 'medium' },
      { label: "20+ buildings (large company)", complexity: 'advanced' },
    ],
  },
  'restaurant': {
    question: "What's the size of your restaurant operation?",
    options: [
      { label: "Single small restaurant", complexity: 'simple' },
      { label: "Busy restaurant or 2-3 locations", complexity: 'medium' },
      { label: "Restaurant group (4+ locations)", complexity: 'advanced' },
    ],
  },
  'ecommerce': {
    question: "How many products do you sell?",
    options: [
      { label: "Under 50 products (small shop)", complexity: 'simple' },
      { label: "50-500 products (growing store)", complexity: 'medium' },
      { label: "500+ products (large catalog)", complexity: 'advanced' },
    ],
  },
  'mechanic': {
    question: "What's the size of your auto shop?",
    options: [
      { label: "Solo mechanic or 1-2 bays", complexity: 'simple' },
      { label: "Small shop (3-6 bays)", complexity: 'medium' },
      { label: "Large shop or multiple locations", complexity: 'advanced' },
    ],
  },
  'salon': {
    question: "What's the size of your salon?",
    options: [
      { label: "Solo stylist or small booth rental", complexity: 'simple' },
      { label: "Salon with 2-5 stylists", complexity: 'medium' },
      { label: "Large salon or multiple locations", complexity: 'advanced' },
    ],
  },
  'medical': {
    question: "What's the size of your practice?",
    options: [
      { label: "Solo practitioner", complexity: 'simple' },
      { label: "Small practice (2-5 providers)", complexity: 'medium' },
      { label: "Large practice or clinic", complexity: 'advanced' },
    ],
  },
  'plumber': {
    question: "What's the size of your plumbing business?",
    options: [
      { label: "Solo plumber", complexity: 'simple' },
      { label: "Small team (2-5 plumbers)", complexity: 'medium' },
      { label: "Large company (6+ plumbers)", complexity: 'advanced' },
    ],
  },
  'electrician': {
    question: "What's the size of your electrical business?",
    options: [
      { label: "Solo electrician", complexity: 'simple' },
      { label: "Small team (2-5 electricians)", complexity: 'medium' },
      { label: "Large company (6+ electricians)", complexity: 'advanced' },
    ],
  },
  'hvac': {
    question: "What's the size of your HVAC business?",
    options: [
      { label: "Solo technician", complexity: 'simple' },
      { label: "Small team (2-5 technicians)", complexity: 'medium' },
      { label: "Large company (6+ technicians)", complexity: 'advanced' },
    ],
  },
  'landscaping': {
    question: "What's the size of your landscaping business?",
    options: [
      { label: "Solo landscaper", complexity: 'simple' },
      { label: "Small crew (2-5 people)", complexity: 'medium' },
      { label: "Large company with multiple crews", complexity: 'advanced' },
    ],
  },
  'home-health': {
    question: "How many caregivers do you coordinate?",
    options: [
      { label: "Solo caregiver", complexity: 'simple' },
      { label: "Small team (2-10 caregivers)", complexity: 'medium' },
      { label: "Agency with 10+ caregivers", complexity: 'advanced' },
    ],
  },
  'bakery': {
    question: "What's the size of your bakery?",
    options: [
      { label: "Home bakery or small shop", complexity: 'simple' },
      { label: "Established bakery with staff", complexity: 'medium' },
      { label: "Multiple locations or wholesale", complexity: 'advanced' },
    ],
  },
};

/**
 * Domain signal keywords for smart detection
 */
const DOMAIN_SIGNALS: Record<string, {
  triggers: string[];
  suggestedKit: string;
  clarifyingQuestion?: string;
  addModule?: string;
}> = {
  property_management: {
    triggers: ['rent', 'rental', 'tenant', 'lease', 'landlord', 'property manager', 'unit', 'apartment'],
    suggestedKit: 'property-management',
    clarifyingQuestion: "Sounds like property management! Should I set up tenant tracking and rent collection?",
  },
  gym: {
    triggers: ['member', 'membership', 'gym', 'fitness class', 'class schedule', 'workout class'],
    suggestedKit: 'gym',
    clarifyingQuestion: "Are you running a gym with memberships?",
  },
  student: {
    triggers: ['student', 'lesson', 'tutoring', 'curriculum', 'homework', 'grade'],
    suggestedKit: 'tutor',
    clarifyingQuestion: "Should I set this up for tutoring with student tracking?",
  },
  payments: {
    triggers: ['stripe', 'payment processing', 'subscription billing', 'online payment', 'checkout'],
    addModule: 'payments',
    suggestedKit: '',
    clarifyingQuestion: "Should I add payment processing with Stripe?",
  },
  scheduling: {
    triggers: ['booking', 'appointment', 'schedule', 'calendar', 'availability'],
    addModule: 'scheduling',
    suggestedKit: '',
  },
  commercial_cleaning: {
    triggers: ['office cleaning', 'janitorial', 'commercial cleaning', 'facility', 'building maintenance'],
    suggestedKit: 'commercial-cleaning',
    clarifyingQuestion: "This sounds like commercial cleaning - should I set it up for business clients?",
  },
};

/**
 * Get a random item from an array
 */
function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Conversational Discovery Handler
 */
export class ConversationalDiscoveryHandler {
  private aiProvider?: AIProviderForDiscovery;

  constructor(aiProvider?: AIProviderForDiscovery) {
    this.aiProvider = aiProvider;
  }

  /**
   * Start a new conversation
   * 
   * SMART DISCOVERY FLOW:
   * 1. Detect industry from input
   * 2. Get kit knowledge for that industry
   * 3. Ask the first smart question
   */
  async startConversation(input: string): Promise<ChatResponse> {
    // Analyze the initial input using AI if available, otherwise keyword fallback
    const analysis = await this.analyzeInputWithAI(input);
    
    // Get kit knowledge for this industry
    const industry = analysis.industry || 'general';
    const kit = getKitKnowledge(industry);
    
    console.log('🚀 Smart Discovery - Starting:', {
      input,
      industry,
      kitName: kit.name,
      coreFeatures: kit.coreFeatures,
    });
    
    // Initialize state with kit features
    const state: ConversationState = {
      step: 1,
      collectedInfo: {
        originalDescription: input,
        industry,
        ...analysis.extracted,
      },
      originalInput: input,
      detectedIndustry: industry,
      detectedIntent: analysis.intent,
      questionsAsked: [],
      questionCount: 0,  // Track smart questions asked
      confidence: analysis.confidence,
      userConfirmed: false,
      pendingConfirmation: false,
      enabledFeatures: [...kit.coreFeatures],  // Start with core features
      answers: {},
    };

    // Get the first smart question from the kit
    const firstQuestion = kit.smartQuestions[0];
    if (!firstQuestion) {
      // No questions in kit - this shouldn't happen but handle gracefully
      return this.showFeaturesAndConfirm(state, kit);
    }

    state.questionsAsked.push(firstQuestion.id);
    state.questionCount = 1;

    // Format opening message
    const industryName = kit.name;
    const openingMessage = `Got it - a ${industryName} app! Let me ask a few quick questions to build exactly what you need.`;

    return {
      message: `${openingMessage}\n\n${firstQuestion.question}`,
      complete: false,
      step: state.step,
      collectedInfo: state.collectedInfo,
      questionsAsked: state.questionsAsked,
      confidence: state.confidence,
      questionCount: state.questionCount,
      enabledFeatures: state.enabledFeatures,
      answers: state.answers || {},
    };
  }

  /**
   * Continue the conversation with a user response
   * 
   * SMART DISCOVERY FLOW:
   * - Track question count (min 3, max 4)
   * - Use kit knowledge to ask relevant questions
   * - After questions, show features and confirm
   */
  async continueConversation(
    userMessage: string,
    state: ConversationState
  ): Promise<ChatResponse> {
    const lower = userMessage.toLowerCase().trim();
    
    // Get kit knowledge for this industry
    const industry = state.detectedIndustry || state.collectedInfo.industry as string || 'general';
    const kit = getKitKnowledge(industry);
    
    // Initialize missing state fields (for backwards compatibility)
    const questionCount = state.questionCount || state.questionsAsked.length || 0;
    const enabledFeatures = state.enabledFeatures || [...kit.coreFeatures];
    const answers = state.answers || {};
    
    console.log('📝 Smart Discovery - Continue:', {
      userMessage: userMessage.substring(0, 50),
      questionCount,
      industry,
      pendingConfirmation: state.pendingConfirmation,
    });
    
    // QUICK BUILD SHORTCUT: If user says "just build it" or similar at ANY point
    const quickBuildPhrases = [
      'just build', 'build now', 'skip', 'no more questions', 'stop asking',
      'build it already', 'just make it', 'make it now', 'create now',
      'enough questions', 'thats enough', 'that enough', 'done', 'finish',
      'build please', 'just do it', 'go build', 'build the app'
    ];
    
    if (quickBuildPhrases.some(phrase => lower.includes(phrase))) {
      console.log('⚡ Quick build triggered by user');
      return this.createSmartCompletionResponse({
        ...state,
        questionCount,
        enabledFeatures,
        answers,
        userConfirmed: true,
      }, kit);
    }
    
    // Check if this is a confirmation response
    if (state.pendingConfirmation) {
      return this.handleSmartConfirmationResponse(userMessage, {
        ...state,
        questionCount,
        enabledFeatures,
        answers,
      }, kit);
    }

    // Store the user's answer
    const lastQuestionId = state.questionsAsked[state.questionsAsked.length - 1] || 'initial';
    const updatedAnswers = { ...answers, [lastQuestionId]: userMessage };
    
    // Handle vibe question answer
    if (lastQuestionId === 'vibe') {
      const vibeAnswer = lower.trim();
      if (vibeAnswer !== 'skip' && vibeAnswer !== 'default') {
        // Try to match to a vibe preset
        const matchedVibe = VIBE_PRESETS.find(v => 
          vibeAnswer.includes(v.value) || 
          vibeAnswer.includes(v.label.toLowerCase()) ||
          v.label.toLowerCase().includes(vibeAnswer)
        );
        if (matchedVibe) {
          updatedAnswers.vibe = matchedVibe.value;
        } else {
          // Use the raw answer - theme builder can handle keywords
          updatedAnswers.vibe = vibeAnswer;
        }
      }
      // Continue to show features and confirm (or ask business name)
      return this.showFeaturesAndConfirm({
        ...state,
        step: state.step + 1,
        questionCount,
        enabledFeatures,
        answers: updatedAnswers,
      }, kit, 'Got it!');
    }
    
    // Handle business name question answer
    if (lastQuestionId === 'businessName') {
      const nameAnswer = userMessage.trim();
      if (nameAnswer.toLowerCase() !== 'skip' && nameAnswer.toLowerCase() !== 'later') {
        updatedAnswers.businessName = nameAnswer;
      }
      // Now show the final confirmation
      return this.showFeaturesAndConfirm({
        ...state,
        step: state.step + 1,
        questionCount,
        enabledFeatures,
        answers: updatedAnswers,
        pendingConfirmation: true,
      }, kit, 'Perfect!');
    }
    
    // Analyze answer to determine which optional features to enable
    const newFeatures = this.analyzeAnswerForFeatures(userMessage, kit);
    const updatedFeatures = [...new Set([...enabledFeatures, ...newFeatures])];
    
    // Generate acknowledgment
    const acknowledgment = this.generateSmartAcknowledgment(userMessage, questionCount);
    
    // Check if we've asked enough questions (min 3)
    const newQuestionCount = questionCount + 1;  // Count this answer
    
    // Decide: ask another question or show features?
    if (newQuestionCount < MIN_QUESTIONS) {
      // Haven't asked minimum questions yet - ask next question
      const nextQuestion = kit.smartQuestions[newQuestionCount];
      if (nextQuestion) {
        const updatedState: ConversationState = {
          ...state,
          step: state.step + 1,
          questionCount: newQuestionCount,
          questionsAsked: [...state.questionsAsked, nextQuestion.id],
          enabledFeatures: updatedFeatures,
          answers: updatedAnswers,
        };
        
        return {
          message: `${acknowledgment}\n\n${nextQuestion.question}`,
          complete: false,
          step: updatedState.step,
          collectedInfo: state.collectedInfo,
          questionsAsked: updatedState.questionsAsked,
          questionCount: newQuestionCount,
          enabledFeatures: updatedFeatures,
          confidence: state.confidence,
          answers: updatedAnswers,
        };
      }
    }
    
    // Check if we should ask one more optional question (up to max 4)
    if (newQuestionCount < MAX_QUESTIONS && newQuestionCount >= MIN_QUESTIONS) {
      // Check if there's an unanswered important question
      const nextQuestion = kit.smartQuestions[newQuestionCount];
      if (nextQuestion) {
        // Only ask 4th question if previous answers were vague
        const previousAnswersVague = Object.values(updatedAnswers).some(
          a => String(a).length < 10 || /^(yes|no|both|maybe|idk|ok)$/i.test(String(a).trim())
        );
        
        if (previousAnswersVague) {
          const updatedState: ConversationState = {
            ...state,
            step: state.step + 1,
            questionCount: newQuestionCount,
            questionsAsked: [...state.questionsAsked, nextQuestion.id],
            enabledFeatures: updatedFeatures,
            answers: updatedAnswers,
          };
          
          return {
            message: `${acknowledgment}\n\nOne more quick question: ${nextQuestion.question}`,
            complete: false,
            step: updatedState.step,
            collectedInfo: state.collectedInfo,
            questionsAsked: updatedState.questionsAsked,
            questionCount: newQuestionCount,
            enabledFeatures: updatedFeatures,
            confidence: state.confidence,
            answers: updatedAnswers,
          };
        }
      }
    }
    
    // We've asked enough questions - show what we'll build and ask for confirmation
    const updatedState: ConversationState = {
      ...state,
      step: state.step + 1,
      questionCount: newQuestionCount,
      enabledFeatures: updatedFeatures,
      answers: updatedAnswers,
      pendingConfirmation: true,
    };
    
    return this.showFeaturesAndConfirm(updatedState, kit, acknowledgment);
  }

  /**
   * Analyze user's answer to determine which features to enable
   */
  private analyzeAnswerForFeatures(answer: string, kit: KitKnowledge): string[] {
    const lower = answer.toLowerCase();
    const features: string[] = [];
    
    // Check for team-related keywords
    if (/team|crew|staff|employees|technicians|workers/i.test(lower)) {
      features.push('team_management');
    }
    if (/solo|alone|just me|myself|one person/i.test(lower)) {
      // Solo - don't add team features
    }
    
    // Check for payment-related keywords
    if (/payment|pay|collect|card|online|stripe|credit/i.test(lower)) {
      features.push('online_payments');
    }
    
    // Check for inventory/materials keywords
    if (/inventory|materials|parts|supplies|stock|track/i.test(lower)) {
      features.push('materials_tracking', 'inventory');
    }
    
    // Check for scheduling keywords
    if (/recurring|weekly|schedule|regular|repeat/i.test(lower)) {
      features.push('recurring_scheduling');
    }
    
    // Check for emergency/urgency keywords
    if (/emergency|urgent|rush|asap|same.?day/i.test(lower)) {
      features.push('urgency_levels');
    }
    
    return features;
  }

  /**
   * Generate a smart acknowledgment based on answer
   */
  private generateSmartAcknowledgment(answer: string, questionCount: number): string {
    const acks = [
      "Got it!",
      "Perfect!",
      "Great!",
      "Understood!",
      "Nice!",
    ];
    return acks[questionCount % acks.length];
  }

  /**
   * Show the features we'll build and ask for confirmation
   * Now includes optional vibe and business name questions
   */
  private showFeaturesAndConfirm(
    state: ConversationState,
    kit: KitKnowledge,
    acknowledgment?: string
  ): ChatResponse {
    // Check if we still need to ask vibe question (optional but improves personalization)
    if (!state.answers.vibe && !state.questionsAsked.includes('vibe')) {
      const vibeOptions = VIBE_PRESETS.map(v => v.label).join(', ');
      const message = `${acknowledgment ? acknowledgment + '\n\n' : ''}Almost there! What vibe should your app have?\n\nOptions: ${vibeOptions}\n\n(Or just say "skip" to use the default)`;
      
      return {
        message,
        complete: false,
        step: state.step,
        collectedInfo: state.collectedInfo,
        questionsAsked: [...state.questionsAsked, 'vibe'],
        questionCount: state.questionCount,
        enabledFeatures: state.enabledFeatures,
        confidence: state.confidence,
        pendingConfirmation: false,
        answers: state.answers,
      };
    }

    // Check if we still need to ask business name question (optional)
    if (!state.answers.businessName && !state.questionsAsked.includes('businessName')) {
      const message = `One last thing - what's your business name? (This will be used for your app's branding)\n\n(Or just say "skip" to name it later)`;
      
      return {
        message,
        complete: false,
        step: state.step,
        collectedInfo: state.collectedInfo,
        questionsAsked: [...state.questionsAsked, 'businessName'],
        questionCount: state.questionCount,
        enabledFeatures: state.enabledFeatures,
        confidence: state.confidence,
        pendingConfirmation: false,
        answers: state.answers,
      };
    }

    // Build feature list
    const features = state.enabledFeatures || kit.coreFeatures;
    const featureList = features
      .filter(f => kit.featureDescriptions[f])
      .map(f => `• ${kit.featureDescriptions[f]}`)
      .join('\n');
    
    const industryName = kit.name;
    
    // Include personalization summary if provided
    let personalizationNote = '';
    if (state.answers.businessName && state.answers.businessName !== 'skip') {
      personalizationNote += `\n\n📛 Business name: ${state.answers.businessName}`;
    }
    if (state.answers.vibe && state.answers.vibe !== 'skip') {
      const vibePreset = VIBE_PRESETS.find(v => 
        v.value === state.answers.vibe || 
        v.label.toLowerCase().includes(String(state.answers.vibe).toLowerCase())
      );
      if (vibePreset) {
        personalizationNote += `\n🎨 Theme: ${vibePreset.label}`;
      }
    }
    
    const message = `${acknowledgment ? acknowledgment + '\n\n' : ''}Based on what you told me, here's what I'll build for your ${industryName} app:\n\n${featureList}${personalizationNote}\n\nReady to build this?`;
    
    return {
      message,
      complete: false,
      step: state.step,
      collectedInfo: state.collectedInfo,
      questionsAsked: state.questionsAsked,
      questionCount: state.questionCount,
      enabledFeatures: features,
      confidence: 0.9,
      pendingConfirmation: true,
      requiresConfirmation: true,
      answers: state.answers,
    };
  }

  /**
   * Handle user's response to the feature confirmation
   */
  private async handleSmartConfirmationResponse(
    userMessage: string,
    state: ConversationState,
    kit: KitKnowledge
  ): Promise<ChatResponse> {
    const lower = userMessage.toLowerCase().trim();
    
    // Check for positive confirmation - be generous
    const positiveConfirmations = [
      'yes', 'yeah', 'yep', 'yup', 'correct', 'right', 'looks good', 'looks right',
      'that\'s right', 'that\'s correct', 'go ahead', 'build it', 'let\'s go',
      'sounds good', 'sound good', 'sounds great', 'sound great', 'that sounds',
      'perfect', 'exactly', 'proceed', 'start building', 'ok', 'okay', 'k',
      'great', 'good', 'nice', 'awesome', 'cool', 'sure', 'absolutely',
      'do it', 'make it', 'create it', 'yes please', 'please', 'go for it',
      'that works', 'works for me', 'looks great', 'look great',
      'build', 'buld', 'bild', 'built', 'building', 'just build', 'build now',
      'fine', 'alright', 'all right', 'thats fine', 'that fine', 'yea', 'ya',
      'lets do it', 'let do it', 'lets go', 'let go', 'continue', 'next', 'ready'
    ];
    
    const isConfirmed = positiveConfirmations.some(phrase => 
      lower === phrase || lower.includes(phrase) || lower.startsWith(phrase)
    );

    if (isConfirmed) {
      console.log('✅ User confirmed - building app');
      return this.createSmartCompletionResponse({
        ...state,
        userConfirmed: true,
        pendingConfirmation: false,
      }, kit);
    }

    // Check for explicit rejection
    const negativeResponses = ['no', 'nope', 'not right', 'wrong', 'incorrect', 'not correct', 'change'];
    const isRejection = negativeResponses.some(phrase => lower === phrase || lower.startsWith(phrase + ' '));
    
    if (isRejection) {
      return {
        message: "No problem! What would you like me to change or add?",
        complete: false,
        step: state.step,
        collectedInfo: state.collectedInfo,
        questionsAsked: state.questionsAsked,
        questionCount: state.questionCount,
        enabledFeatures: state.enabledFeatures,
        confidence: state.confidence,
        pendingConfirmation: false,
        answers: state.answers,
      };
    }

    // User provided more info - analyze and update features, then re-confirm
    const newFeatures = this.analyzeAnswerForFeatures(userMessage, kit);
    const updatedFeatures = [...new Set([...state.enabledFeatures, ...newFeatures])];
    
    return this.showFeaturesAndConfirm({
      ...state,
      enabledFeatures: updatedFeatures,
    }, kit, "Got it, I'll add that!");
  }

  /**
   * Create the completion response with app config
   */
  private createSmartCompletionResponse(
    state: ConversationState,
    kit: KitKnowledge
  ): ChatResponse {
    const industry = state.detectedIndustry || state.collectedInfo.industry as string || 'general';
    const teamSize = state.enabledFeatures.includes('team_management') ? 'team' : 'solo';
    
    // Extract vibe/theme preference
    const vibe = state.answers.vibe as string | undefined;
    const vibePreset = vibe ? VIBE_PRESETS.find(v => v.value === vibe || v.label.toLowerCase().includes(vibe.toLowerCase())) : undefined;
    
    // Extract business name
    const businessName = state.answers.businessName as string | undefined;
    
    const appConfig = {
      context: 'business',
      industryText: industry,
      teamSize,
      offerType: 'services',
      originalDescription: state.originalInput,
      industry,
      features: state.enabledFeatures,
      answers: state.answers,
      complexity: 'medium',
      userConfirmed: true,
      // New personalization fields
      themePreset: vibePreset?.value || vibe,
      businessName: businessName && businessName.toLowerCase() !== 'skip' ? businessName : undefined,
    };

    const industryName = kit.name;
    
    // Personalize completion message
    let completionMessage = 'Perfect! Building your';
    if (businessName && businessName.toLowerCase() !== 'skip') {
      completionMessage += ` ${businessName}`;
    }
    completionMessage += ` ${industryName} app`;
    if (vibePreset) {
      completionMessage += ` with a ${vibePreset.label.toLowerCase()} vibe`;
    }
    completionMessage += ' now... 🚀';

    return {
      complete: true,
      appConfig,
      completionMessage,
      step: state.step,
      collectedInfo: state.collectedInfo,
      questionCount: state.questionCount,
      enabledFeatures: state.enabledFeatures,
      answers: state.answers,
    };
  }

  // ============================================================================
  // AI-POWERED DISCOVERY METHODS
  // ============================================================================

  /**
   * Analyze input using AI for natural language understanding
   * Falls back to keyword matching only when AI is unavailable
   */
  private async analyzeInputWithAI(input: string): Promise<{
    industry?: string;
    intent?: string;
    confidence: number;
    extracted: Record<string, unknown>;
    subVerticalQuestion?: {
      question: string;
      options: Array<{ label: string; kit: string }>;
    };
    detectedSignals?: string[];
    suggestedModules?: string[];
    aiInterpretation?: string;
  }> {
    // Try AI-powered analysis first
    if (this.aiProvider) {
      try {
        const aiResult = await this.aiAnalyzeInput(input);
        return aiResult;
      } catch (error) {
        console.error('AI analysis failed, falling back to keyword matching:', error);
      }
    }

    // Fallback to keyword-based analysis (existing method)
    // NOTE: Keyword fallback intentionally returns lower confidence
    // to prevent premature completion without AI understanding
    const keywordResult = this.analyzeInput(input);
    
    // IMPORTANT: Cap confidence from keyword-only analysis
    // This prevents premature completion when AI is unavailable
    return {
      ...keywordResult,
      confidence: Math.min(keywordResult.confidence, 0.65),
    };
  }

  /**
   * AI-powered input analysis
   */
  private async aiAnalyzeInput(input: string): Promise<{
    industry?: string;
    intent?: string;
    confidence: number;
    extracted: Record<string, unknown>;
    aiInterpretation?: string;
  }> {
    const systemPrompt = `You are helping understand what kind of app a user needs.

TASK: Analyze user input and identify the business type/industry.

COMMON TYPOS TO RECOGNIZE:
- "plumer", "plummer", "plomber", "pluming" = plumber
- "electrition", "elektric" = electrician
- "restaraunt", "resturant" = restaurant
- "saloon", "sallon" = salon
- "mecanic", "mechanik" = mechanic
- "landscapping" = landscaping
- "contractor", "contractir" = contractor
- "cleanig", "cleaner" = cleaning
- "handiman", "handy man" = handyman
- "roofing", "roofer" = roofer
- "hvac", "air conditioning" = HVAC
- "photography", "photgraphy" = photography
- "accountent" = accountant
- "real estate", "realtor" = real estate

Respond in JSON with these EXACT fields:
{
  "industry": "the business type - use standard names like: plumber, electrician, salon, restaurant, contractor, cleaning, mechanic, etc. Fix typos!",
  "intent": "what they want the app to do",
  "confidence": 0.0-1.0,
  "extracted": {
    "industry": "SAME as above - MUST include here too",
    "mainWorkflow": "what they do day-to-day",
    "services": ["list of services mentioned"],
    "features": ["app features they need"],
    "painPoints": ["problems they mentioned"]
  },
  "interpretation": "brief summary"
}

IMPORTANT: 
- Always include "industry" in BOTH the top level AND inside "extracted"
- Fix common typos (plumer -> plumber)
- Even short inputs like "app for plumber" should extract industry`;

    const response = await this.aiProvider!.complete({
      prompt: `User input: "${input}"\n\nAnalyze and respond with JSON only.`,
      systemPrompt,
      maxTokens: 600,
      temperature: 0.2,
      timeout: 15000,
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Ensure industry is in extracted
        const extracted = parsed.extracted || {};
        if (parsed.industry && !extracted.industry) {
          extracted.industry = parsed.industry;
        }
        
        console.log('🤖 AI analysis result:', {
          industry: parsed.industry,
          confidence: parsed.confidence,
          interpretation: parsed.interpretation,
        });
        
        return {
          industry: parsed.industry,
          intent: parsed.intent,
          confidence: Math.min(parsed.confidence || 0.5, 0.85),
          extracted,
          aiInterpretation: parsed.interpretation,
        };
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }

    // Fallback: try keyword detection for common industries with typo patterns
    const lower = input.toLowerCase();
    let industry: string | undefined;
    
    // Service trades
    if (/plum(b|m)?er|plom|pluming|plumbing/i.test(lower)) industry = 'plumber';
    else if (/electr(ic|ition|ician)|elektr/i.test(lower)) industry = 'electrician';
    else if (/hvac|heating|cooling|air.?condition/i.test(lower)) industry = 'hvac';
    else if (/mechan(ic|ik)|auto.?repair|car.?repair|garage/i.test(lower)) industry = 'mechanic';
    else if (/landscap(e|ing|er)|lawn|garden(er|ing)|yard/i.test(lower)) industry = 'landscaper';
    else if (/roof(er|ing)|roofing/i.test(lower)) industry = 'roofer';
    else if (/paint(er|ing)|painter/i.test(lower)) industry = 'painter';
    else if (/carpet|floor(ing)?|tile/i.test(lower)) industry = 'flooring';
    else if (/handyman|handy.?man|odd.?jobs/i.test(lower)) industry = 'handyman';
    else if (/locksmith|lock.?smith/i.test(lower)) industry = 'locksmith';
    else if (/pest|exterminator|bug/i.test(lower)) industry = 'pest control';
    else if (/pool|swimming/i.test(lower)) industry = 'pool service';
    else if (/window|glass/i.test(lower)) industry = 'window service';
    else if (/appliance|repair/i.test(lower)) industry = 'appliance repair';
    
    // Beauty & wellness
    else if (/salon|beauty|hair|stylist|barber/i.test(lower)) industry = 'salon';
    else if (/spa|massage|wellness/i.test(lower)) industry = 'spa';
    else if (/nail|manicur|pedicur/i.test(lower)) industry = 'nail salon';
    else if (/tattoo|piercing/i.test(lower)) industry = 'tattoo';
    else if (/gym|fitness|personal.?train|trainer/i.test(lower)) industry = 'fitness';
    else if (/yoga|pilates/i.test(lower)) industry = 'yoga studio';
    
    // Food & hospitality
    else if (/restaurant|restaraunt|cafe|diner|bistro/i.test(lower)) industry = 'restaurant';
    else if (/bakery|baker|pastry/i.test(lower)) industry = 'bakery';
    else if (/catering|caterer/i.test(lower)) industry = 'catering';
    else if (/food.?truck/i.test(lower)) industry = 'food truck';
    else if (/bar|pub|tavern|nightclub/i.test(lower)) industry = 'bar';
    else if (/coffee|espresso/i.test(lower)) industry = 'coffee shop';
    else if (/hotel|motel|inn|lodging|bnb|airbnb/i.test(lower)) industry = 'hotel';
    
    // Cleaning & maintenance
    else if (/clean(ing|er)|maid|janitorial|housekeep/i.test(lower)) industry = 'cleaning';
    else if (/laundry|dry.?clean|laundromat/i.test(lower)) industry = 'laundry';
    else if (/trash|waste|junk|hauling/i.test(lower)) industry = 'junk removal';
    else if (/pressure.?wash|power.?wash/i.test(lower)) industry = 'pressure washing';
    
    // Healthcare
    else if (/doctor|clinic|medical|physician/i.test(lower)) industry = 'medical clinic';
    else if (/dentist|dental/i.test(lower)) industry = 'dental';
    else if (/chiropract|chiro/i.test(lower)) industry = 'chiropractor';
    else if (/veterinar|vet|animal|pet/i.test(lower)) industry = 'veterinarian';
    else if (/pharmacy|drug.?store/i.test(lower)) industry = 'pharmacy';
    else if (/therapist|counsel|psych/i.test(lower)) industry = 'therapy';
    else if (/optom|eye|vision|glasses/i.test(lower)) industry = 'optometry';
    
    // Professional services
    else if (/lawyer|attorney|legal/i.test(lower)) industry = 'legal';
    else if (/accountant|accounting|cpa|bookkeep/i.test(lower)) industry = 'accounting';
    else if (/real.?estate|realtor|property/i.test(lower)) industry = 'real estate';
    else if (/insurance/i.test(lower)) industry = 'insurance';
    else if (/consult(ant|ing)/i.test(lower)) industry = 'consulting';
    else if (/photograph|photo.?studio/i.test(lower)) industry = 'photography';
    else if (/videograph|video|film/i.test(lower)) industry = 'videography';
    else if (/wedding|event.?plan/i.test(lower)) industry = 'event planning';
    else if (/tutor|teach|education/i.test(lower)) industry = 'tutoring';
    else if (/music|instrument|lesson/i.test(lower)) industry = 'music lessons';
    else if (/daycare|childcare|nanny/i.test(lower)) industry = 'childcare';
    
    // Retail & ecommerce
    else if (/store|shop|retail|boutique/i.test(lower)) industry = 'retail';
    else if (/ecommerce|e-commerce|online.?store/i.test(lower)) industry = 'ecommerce';
    else if (/florist|flower/i.test(lower)) industry = 'florist';
    else if (/jewel(ry|er)/i.test(lower)) industry = 'jewelry';
    else if (/gift/i.test(lower)) industry = 'gift shop';
    
    // Construction & contracting
    else if (/contract(or|ing)|construct(ion)?|build(er|ing)/i.test(lower)) industry = 'contractor';
    else if (/remodel|renovation/i.test(lower)) industry = 'remodeling';
    else if (/architect/i.test(lower)) industry = 'architecture';
    else if (/interior.?design/i.test(lower)) industry = 'interior design';
    
    // Transportation & delivery
    else if (/taxi|cab|rideshare|uber|lyft/i.test(lower)) industry = 'rideshare';
    else if (/tow(ing)?|tow.?truck/i.test(lower)) industry = 'towing';
    else if (/moving|mover/i.test(lower)) industry = 'moving';
    else if (/delivery|courier/i.test(lower)) industry = 'delivery';
    else if (/truck(ing)?|freight|haul/i.test(lower)) industry = 'trucking';
    
    // Tech & creative
    else if (/web.?(design|develop)|software|app.?dev/i.test(lower)) industry = 'web development';
    else if (/graphic.?design|design.?studio/i.test(lower)) industry = 'graphic design';
    else if (/marketing|seo|social.?media/i.test(lower)) industry = 'marketing';
    else if (/it.?support|tech.?support|computer/i.test(lower)) industry = 'it support';
    
    console.log('🔍 Keyword fallback result:', { input: lower.substring(0, 30), industry });
    
    return {
      industry,
      confidence: industry ? 0.5 : 0.3,
      extracted: industry ? { industry } : {},
    };
  }

  /**
   * Generate an AI-powered contextual follow-up question
   * Based on what's uncertain, not hardcoded question order
   */
  private async generateAIFollowUp(
    state: ConversationState,
    analysis: { industry?: string; confidence: number; extracted: Record<string, unknown> }
  ): Promise<{ id: string; question: string } | null> {
    if (!this.aiProvider) {
      // Without AI, generate a simple clarifying question
      return this.generateFallbackQuestion(state, analysis);
    }

    try {
      const systemPrompt = `You are helping build an app through conversation.
Based on what you know so far, generate ONE specific follow-up question.

RULES:
1. Ask about what makes THIS business unique, not generic categories
2. Don't ask yes/no questions - ask open-ended questions that reveal specifics
3. Focus on workflows, problems, and unique needs
4. If industry seems like a template (salon, gym, etc), ask what makes theirs different
5. Never suggest predefined options - let them describe in their own words

BAD questions (too generic):
- "What industry are you in?"
- "Is this for a team?"
- "Do you need bookings?"

GOOD questions (specific, open-ended):
- "What's the biggest headache in your day-to-day work right now?"
- "Walk me through what happens when a new customer comes in"
- "What makes your [business type] different from others?"
- "What's the one thing you wish you could automate?"

Respond in JSON:
{
  "question": "your specific question",
  "id": "unique_question_id",
  "targetingUncertainty": "what aspect this question clarifies"
}`;

      // Include FULL accumulated knowledge, not just analysis.extracted
      const allKnowledge = { ...state.collectedInfo, ...analysis.extracted };
      const contextSummary = `
ACCUMULATED KNOWLEDGE ABOUT THIS USER:
${JSON.stringify(allKnowledge, null, 2)}

CONVERSATION CONTEXT:
- Industry detected: ${analysis.industry || state.collectedInfo.industry || 'unclear'}
- Confidence: ${analysis.confidence}
- Step: ${state.step}
- Questions already asked: ${state.questionsAsked.join(', ') || 'none'}
- Original input: "${state.originalInput}"

IMPORTANT: Review what we already know above. DO NOT ask about things we already have info on.
If we have enough info to build (industry + some features/problems), ask if they're ready to build instead of more questions.
`;

      const response = await this.aiProvider.complete({
        prompt: `${contextSummary}\n\nGenerate the next follow-up question. Respond with JSON.`,
        systemPrompt,
        maxTokens: 400,
        temperature: 0.5,
        timeout: 10000,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          id: parsed.id || `ai_followup_${state.step}`,
          question: parsed.question,
        };
      }
    } catch (error) {
      console.error('AI follow-up generation failed:', error);
    }

    return this.generateFallbackQuestion(state, analysis);
  }

  /**
   * Fallback question generation when AI is unavailable
   * Uses progressive questions that don't repeat
   */
  private generateFallbackQuestion(
    state: ConversationState,
    analysis: { industry?: string; confidence: number; extracted: Record<string, unknown> }
  ): { id: string; question: string } | null {
    // Check what we already know from collectedInfo
    const info = state.collectedInfo;
    const hasIndustry = info.industry || analysis.industry;
    const hasWorkflow = info.mainWorkflow || info.services || info.features;
    const hasProblem = info.mainProblem || info.painPoints;
    const hasFeatures = info.features || info.painPoints;
    
    // Track which questions we've already asked to avoid repetition
    const askedQuestions = new Set(state.questionsAsked);
    
    // If we have good info, check if we should offer to build
    const hasGoodInfo = hasIndustry && (hasWorkflow || hasProblem || hasFeatures);
    if (hasGoodInfo && state.step >= 3) {
      // We have enough - don't ask more fallback questions
      return null;
    }
    
    // Progressive question flow - each question only asked once
    // Use multiple IDs per concept to avoid repeating similar questions
    const fallbackQuestions = [
      {
        ids: ['business_description', 'industry', 'what_business'],
        condition: () => !hasIndustry,
        question: "What type of business do you run?",
      },
      {
        ids: ['workflow_description', 'mainGoal', 'main_feature', 'services'],
        condition: () => !hasWorkflow && hasIndustry,
        question: "What are the main things you need this app to help you with?",
      },
      {
        ids: ['problem_solving', 'pain_points', 'challenges'],
        condition: () => !hasProblem && hasIndustry,
        question: "What's the biggest challenge you face in running your business right now?",
      },
      {
        ids: ['features', 'needs', 'requirements'],
        condition: () => !hasFeatures && hasIndustry,
        question: "What features would be most useful for you? (like scheduling, payments, invoicing, etc.)",
      },
    ];

    // Find the first question that hasn't been asked yet (by any of its IDs) and whose condition is met
    for (const q of fallbackQuestions) {
      const alreadyAsked = q.ids.some(id => askedQuestions.has(id));
      if (!alreadyAsked && q.condition()) {
        return { id: q.ids[0], question: q.question };
      }
    }

    // If we have some info but haven't offered to build yet
    if (hasIndustry && !askedQuestions.has('ready_to_build')) {
      return {
        id: 'ready_to_build',
        question: "I think I have a good picture of what you need. Should I go ahead and build your app, or is there anything else you'd like to add?",
      };
    }

    return null;
  }

  /**
   * Process user response using AI for better understanding
   * ACCUMULATES information across the conversation
   */
  private async processUserResponseWithAI(
    message: string,
    state: ConversationState
  ): Promise<{ extracted: Record<string, unknown>; confidenceBoost: number; needsClarification?: boolean }> {
    if (this.aiProvider) {
      try {
        // Build comprehensive context from ALL messages so far
        const existingInfo = state.collectedInfo;
        
        const systemPrompt = `You are helping build an app for a user. Analyze their response and extract ALL useful information.

CURRENT ACCUMULATED UNDERSTANDING:
${JSON.stringify(existingInfo, null, 2)}

CONVERSATION SO FAR:
- Original request: "${state.originalInput}"
- Questions asked: ${state.questionsAsked.join(', ') || 'none yet'}
- Step: ${state.step}

YOUR TASK: Extract NEW information from the user's latest response. ADD to what we already know, don't replace it.

IMPORTANT: Use these EXACT field names so the system can track progress:
- "industry": the business type (e.g., "plumber", "salon", etc.)
- "mainWorkflow": what they do day-to-day
- "mainProblem": the biggest challenge they face
- "services": list of services they offer
- "painPoints": specific problems they mentioned
- "features": features they need (payments, scheduling, invoicing, etc.)
- "teamSize": solo, small, or team
- "customerType": who their customers are
- "currentProcess": how they currently do things (paper, spreadsheet, etc.)
- "uniqueAspects": what makes them different

Respond in JSON:
{
  "extracted": {
    // Include ALL fields you can identify from their response
    // Use the exact field names above
  },
  "confidenceBoost": 0.1-0.4 (how much this response helped understand their needs),
  "needsClarification": false,
  "summary": "brief summary of what you learned from this message"
}

EXTRACT EVERYTHING USEFUL. The user gave you information - capture it!`;

        const response = await this.aiProvider.complete({
          prompt: `User's latest response: "${message}"\n\nAnalyze and extract information. Respond with JSON only.`,
          systemPrompt,
          maxTokens: 800,
          temperature: 0.2,
          timeout: 15000,
        });

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const extracted = parsed.extracted || {};
          
          // Log what we extracted for debugging
          console.log('AI extracted from user response:', parsed.summary || 'no summary', extracted);
          
          return {
            extracted,
            // Allow higher confidence boost when user gives good info
            confidenceBoost: Math.min(parsed.confidenceBoost || 0.15, 0.35),
            needsClarification: parsed.needsClarification === true,
          };
        }
      } catch (error) {
        console.error('AI response processing failed:', error);
      }
    }

    // Fallback to existing keyword processing
    return this.processUserResponse(message, state);
  }

  /**
   * Create a response that requires explicit user confirmation before building
   * This prevents premature completion of generic apps
   * 
   * IMPORTANT: Only offer confirmation when we actually have concrete understanding.
   * If we don't understand anything, ask clarifying questions instead.
   */
  private createConfirmationResponse(
    state: ConversationState,
    analysis: { industry?: string; confidence: number; extracted: Record<string, unknown> }
  ): ChatResponse {
    const industry = analysis.industry || state.collectedInfo.industry as string | undefined;
    const industryName = industry ? this.formatIndustryName(industry) : null;
    
    // Build a summary of what we understood
    const understood: string[] = [];
    if (industry && industry !== 'general_business') {
      understood.push(`${industryName} business`);
    }
    if (analysis.extracted.teamSize || state.collectedInfo.teamSize) {
      const size = (analysis.extracted.teamSize || state.collectedInfo.teamSize) as string;
      understood.push(`${size} operation`);
    }
    if (analysis.extracted.mainWorkflow || state.collectedInfo.mainWorkflow) {
      const workflow = (analysis.extracted.mainWorkflow || state.collectedInfo.mainWorkflow) as string;
      understood.push(`focusing on ${workflow}`);
    }
    if (analysis.extracted.mainProblem || state.collectedInfo.mainProblem) {
      const problem = (analysis.extracted.mainProblem || state.collectedInfo.mainProblem) as string;
      understood.push(`solving ${problem}`);
    }
    
    // If we don't actually understand anything concrete, don't offer confirmation
    // Instead, ask a clarifying question
    if (understood.length === 0) {
      // We don't have enough info to even offer confirmation
      // Generate a fallback question instead
      const fallback = this.generateFallbackQuestion(state, analysis);
      if (fallback) {
        return {
          message: fallback.question,
          complete: false,
          step: state.step,
          collectedInfo: state.collectedInfo,
          questionsAsked: [...state.questionsAsked, fallback.id],
          confidence: analysis.confidence,
        };
      }
      
      // Last resort - ask for description
      return {
        message: "I want to make sure I build the right app for you. Can you tell me more about what your business does and what you need this app to help with?",
        complete: false,
        step: state.step,
        collectedInfo: state.collectedInfo,
        questionsAsked: [...state.questionsAsked, 'clarification_request'],
        confidence: analysis.confidence,
      };
    }
    
    const summary = understood.join(', ');

    // Offer confirmation with explicit request for go-ahead
    const confirmationMessage = analysis.confidence >= MIN_CONFIDENCE_FOR_AUTO_COMPLETE
      ? `I think I have a good understanding of what you need: ${summary}. Before I build this, I want to make sure I've got it right. Does this sound accurate, or is there anything unique about your business I should know?`
      : `Based on what you've told me, it sounds like you need an app for ${summary}. Before I create something, I want to make sure it's not just a generic template. What makes YOUR business different from others? Or if this looks right, just say "looks good" and I'll start building.`;

    // Update state to track pending confirmation
    const updatedState: ConversationState = {
      ...state,
      pendingConfirmation: true,
    };

    return {
      message: confirmationMessage,
      complete: false,
      step: state.step,
      collectedInfo: updatedState.collectedInfo,
      questionsAsked: [...state.questionsAsked, 'confirmation'],
      confidence: analysis.confidence,
      requiresConfirmation: true,
      // IMPORTANT: Include pendingConfirmation so frontend passes it back
      pendingConfirmation: true,
    };
  }

  /**
   * Handle user's response to confirmation request
   */
  private async handleConfirmationResponse(
    userMessage: string,
    state: ConversationState
  ): Promise<ChatResponse> {
    const lower = userMessage.toLowerCase().trim();
    
    // Check for positive confirmation - be VERY generous with matching
    // Users often just want the app built without more questions
    const positiveConfirmations = [
      'yes', 'yeah', 'yep', 'yup', 'correct', 'right', 'looks good', 'looks right',
      'that\'s right', 'that\'s correct', 'go ahead', 'build it', 'let\'s go',
      'sounds good', 'sound good', 'sounds great', 'sound great', 'that sounds',
      'perfect', 'exactly', 'proceed', 'start building', 'ok', 'okay', 'k',
      'great', 'good', 'nice', 'awesome', 'cool', 'sure', 'absolutely',
      'do it', 'make it', 'create it', 'yes please', 'please', 'go for it',
      'that works', 'works for me', 'looks great', 'look great',
      // Common typos and variations for "build"
      'build', 'buld', 'bild', 'built', 'building', 'just build', 'build now',
      // More affirmative variations
      'fine', 'alright', 'all right', 'thats fine', 'that fine', 'yea', 'ya',
      'lets do it', 'let do it', 'lets go', 'let go', 'continue', 'next'
    ];
    
    const isConfirmed = positiveConfirmations.some(phrase => 
      lower === phrase || lower.includes(phrase) || lower.startsWith(phrase)
    );

    if (isConfirmed) {
      // User confirmed - now we can complete
      const updatedState: ConversationState = {
        ...state,
        userConfirmed: true,
        pendingConfirmation: false,
      };
      return this.createCompletionResponse(updatedState);
    }

    // Check for explicit rejection (no, not right, wrong, etc.)
    const negativeResponses = ['no', 'nope', 'not right', 'wrong', 'incorrect', 'not correct'];
    const isRejection = negativeResponses.some(phrase => lower === phrase || lower.startsWith(phrase + ' '));
    
    if (isRejection) {
      // User said no - ask what's wrong instead of starting over
      return {
        message: "No problem! What did I get wrong? Or what else should I know about your business?",
        complete: false,
        step: state.step,
        collectedInfo: state.collectedInfo,
        questionsAsked: [...state.questionsAsked, 'correction_request'],
        confidence: state.confidence,
        // Keep state but don't mark as pending confirmation - let them provide more info
        pendingConfirmation: false,
      };
    }

    // User provided more information or corrections (not just "no")
    // Process as a normal response and continue discovery
    const updatedState: ConversationState = {
      ...state,
      pendingConfirmation: false,
    };
    
    // Re-analyze the response with the new information
    return this.continueConversation(userMessage, updatedState);
  }

  /**
   * Analyze initial input for industry, intent, etc.
   */
  private analyzeInput(input: string): {
    industry?: string;
    intent?: string;
    confidence: number;
    extracted: Record<string, unknown>;
    subVerticalQuestion?: {
      question: string;
      options: Array<{ label: string; kit: string }>;
    };
    detectedSignals?: string[];
    suggestedModules?: string[];
  } {
    const lower = input.toLowerCase();
    const extracted: Record<string, unknown> = {};
    let confidence = 0.3;
    const detectedSignals: string[] = [];
    const suggestedModules: string[] = [];

    // Check for domain signals first (high priority)
    for (const [signalId, signal] of Object.entries(DOMAIN_SIGNALS)) {
      for (const trigger of signal.triggers) {
        if (lower.includes(trigger)) {
          detectedSignals.push(signalId);
          if (signal.suggestedKit) {
            extracted.suggestedKit = signal.suggestedKit;
            confidence += 0.2;
          }
          if (signal.addModule) {
            suggestedModules.push(signal.addModule);
          }
          break;
        }
      }
    }

    // Industry detection with expanded keywords AND common typos/misspellings
    const industryMap: Record<string, string[]> = {
      restaurant: ['restaurant', 'restaraunt', 'resturant', 'cafe', 'dining', 'menu', 'takeout', 'delivery', 'kitchen', 'diner'],
      bakery: ['bakery', 'bakry', 'bake', 'baker', 'pastry', 'bread', 'cake', 'cupcake', 'donut', 'pastries', 'baked goods'],
      salon: ['salon', 'saloon', 'beauty', 'hair', 'spa', 'nail', 'barber', 'stylist', 'hairdresser'],
      'fitness-coach': ['fitness', 'trainer', 'workout', 'coach', 'exercise', 'yoga', 'pilates', 'personal training', 'pt'],
      gym: ['gym', 'fitness studio', 'membership', 'fitness class', 'workout class'],
      'real-estate': ['real estate', 'realestate', 'realtor', 'realter', 'listing', 'broker', 'home sale', 'buy sell home'],
      'property-management': ['property management', 'landlord', 'landord', 'tenant', 'rental property', 'lease', 'rent collection'],
      medical: ['medical', 'clinic', 'doctor', 'patient', 'health', 'dental', 'dentist', 'therapy', 'therapist'],
      retail: ['shop', 'store', 'retail', 'ecommerce', 'sell', 'products'],
      'food-service': ['food', 'catering', 'caterer', 'food truck', 'meal prep', 'food delivery'],
      // Plumber with common typos: plumer, plummer, plomber
      plumber: ['plumber', 'plumer', 'plummer', 'plomber', 'plumbing', 'pluming', 'pipe', 'pipes', 'water', 'leak', 'drain', 'drains'],
      // Electrician with common typos: electrition, electrican
      electrician: ['electrician', 'electrition', 'electrican', 'electrical', 'electric', 'wiring', 'circuit'],
      contractor: ['contractor', 'contracter', 'construction', 'renovation', 'builder', 'remodel'],
      cleaning: ['cleaning', 'cleaner', 'cleaners', 'maid', 'housekeeping', 'home cleaning', 'house cleaning'],
      'commercial-cleaning': ['janitorial', 'janitor', 'commercial cleaning', 'office cleaning', 'facility cleaning'],
      tutor: ['tutor', 'tutoring', 'lesson', 'lessons', 'teaching', 'teacher', 'student'],
      // Mechanic with common typos: mecanic, mechanik
      mechanic: ['mechanic', 'mecanic', 'mechanik', 'auto repair', 'car repair', 'vehicle', 'automotive', 'garage'],
      landscaping: ['landscaping', 'landscaper', 'lawn', 'garden', 'gardener', 'yard', 'lawn care', 'lawncare'],
      'home-health': ['home health', 'homehealth', 'caregiver', 'care giver', 'senior care', 'elderly care'],
      photography: ['photographer', 'photography', 'photo studio', 'portraits', 'wedding photography', 'photos'],
      'pet-services': ['pet', 'pets', 'dog', 'dogs', 'grooming', 'groomer', 'pet sitting', 'dog walking', 'veterinary', 'vet'],
      hvac: ['hvac', 'heating', 'cooling', 'air conditioning', 'ac', 'furnace'],
      roofing: ['roofing', 'roofer', 'roof', 'shingles', 'gutters'],
      painter: ['painter', 'painting', 'paint', 'house painter'],
      handyman: ['handyman', 'handy man', 'handywork', 'odd jobs', 'repairs'],
    };

    let detectedIndustry: string | undefined;
    let bestMatchScore = 0;
    
    for (const [industry, keywords] of Object.entries(industryMap)) {
      let score = 0;
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          score += keyword.split(' ').length; // Multi-word matches score higher
        }
      }
      if (score > bestMatchScore) {
        bestMatchScore = score;
        detectedIndustry = industry;
      }
    }

    if (detectedIndustry) {
      extracted.industry = detectedIndustry;
      
      // Boost confidence based on how clear the match is
      // Multi-word matches or "I am a X" patterns get higher confidence
      const explicitPattern = /\b(i am a|i'm a|we are|we're|i run a|my|our)\s+\w*\s*(plumb|salon|gym|restaurant|clean|tutor|mechanic|electric)/i;
      if (explicitPattern.test(input)) {
        confidence += 0.35; // Strong explicit statement
      } else if (bestMatchScore >= 2) {
        confidence += 0.30; // Multi-word match
      } else {
        confidence += 0.25; // Single keyword match
      }
      
      // Override with signal-detected kit if available and more specific
      if (extracted.suggestedKit) {
        detectedIndustry = extracted.suggestedKit as string;
        extracted.industry = detectedIndustry;
      }
    }

    // Check if we need a sub-vertical question
    let subVerticalQuestion: { question: string; options: Array<{ label: string; kit: string }> } | undefined;
    
    if (detectedIndustry) {
      // Check if this industry has ambiguous sub-verticals
      const subVertical = Object.values(SUB_VERTICAL_QUESTIONS).find(sv => sv.trigger === detectedIndustry);
      if (subVertical && !extracted.suggestedKit) {
        subVerticalQuestion = {
          question: subVertical.question,
          options: subVertical.options,
        };
        // Don't auto-increase confidence if we need clarification
        confidence = Math.min(confidence, 0.7);
      }
    }

    // Team size detection - also infer complexity from team size
    if (/\b(just me|solo|myself|one person|freelance|individual|i am a|i'm a)\b/i.test(input)) {
      extracted.teamSize = 'solo';
      extracted.complexity = 'simple'; // Solo = simple complexity
      confidence += 0.2; // Higher boost - we know a lot from this
    } else if (/\b(small team|2-5|few people|couple of)\b/i.test(input)) {
      extracted.teamSize = 'small';
      extracted.complexity = 'medium';
      confidence += 0.15;
    } else if (/\b(team|staff|employees|we have|our team|large|big company)\b/i.test(input)) {
      extracted.teamSize = 'team';
      extracted.complexity = 'medium'; // Default team to medium, can be refined
      confidence += 0.1;
    }

    // Intent detection
    if (/\b(booking|appointment|schedule|reservation)\b/i.test(input)) {
      extracted.mainFeature = 'bookings';
      confidence += 0.15;
    } else if (/\b(order|sale|sell|payment|checkout)\b/i.test(input)) {
      extracted.mainFeature = 'orders';
      confidence += 0.15;
    } else if (/\b(customer|client|crm|contact)\b/i.test(input)) {
      extracted.mainFeature = 'customers';
      confidence += 0.15;
    }

    // Customer-facing detection - comprehensive pattern matching
    // Detects when the business has external customers who transact directly
    const customerFacingPatterns = [
      // Explicit customer portal mentions
      /\b(customer portal|client portal|customer app|client app)\b/i,
      // Online booking/ordering
      /\b(online booking|online ordering|online order|web ordering|customers can book|customers can order)\b/i,
      // Customer access and interaction
      /\b(customers can|clients can|customer access|client access|customers should|clients should)\b/i,
      // Checkout and payments by customers
      /\b(checkout|customer checkout|online payment|pay online|customer pay)\b/i,
      // Order/status tracking by customers  
      /\b(track.{0,10}order|order.{0,10}track|status.{0,10}track|customer.{0,10}notification)\b/i,
      // Booking and reservations by customers
      /\b(make.{0,10}reservation|book.{0,10}appointment|schedule.{0,10}appointment|customer.{0,10}book)\b/i,
      // Two-sided business signals
      /\b(owner.{0,20}customer|admin.{0,20}customer|staff.{0,20}customer|both.{0,10}side)\b/i,
      // Customer self-service
      /\b(self.{0,5}service|customer.{0,10}browse|browse.{0,10}menu|browse.{0,10}product)\b/i,
      // Promotions for customers
      /\b(coupon|discount|promo|promotion|loyalty|reward)\b/i,
    ];
    
    const customerFacingDetected = customerFacingPatterns.some(pattern => pattern.test(input));
    if (customerFacingDetected) {
      extracted.customerFacing = true;
      // Detect specific customer features
      extracted.customerFeatures = {
        browseCatalog: /\b(browse|menu|catalog|products|items|services)\b/i.test(input),
        placeOrders: /\b(order|ordering|purchase|buy)\b/i.test(input),
        bookAppointments: /\b(book|booking|appointment|reservation|schedule)\b/i.test(input),
        trackOrders: /\b(track|status|notification|notif)\b/i.test(input),
        usePromotions: /\b(coupon|discount|promo|promotion|loyalty|reward)\b/i.test(input),
        makePayments: /\b(pay|payment|checkout|purchase)\b/i.test(input),
      };
      confidence += 0.15;
    }

    // Store suggested modules
    if (suggestedModules.length > 0) {
      extracted.suggestedModules = suggestedModules;
    }

    return {
      industry: detectedIndustry,
      confidence: Math.min(confidence, 1),
      extracted,
      subVerticalQuestion,
      detectedSignals: detectedSignals.length > 0 ? detectedSignals : undefined,
      suggestedModules: suggestedModules.length > 0 ? suggestedModules : undefined,
    };
  }

  /**
   * Process user response and extract information
   * NOW DETECTS VAGUE ANSWERS and flags need for clarification
   */
  private processUserResponse(
    message: string,
    state: ConversationState
  ): { extracted: Record<string, unknown>; confidenceBoost: number; needsClarification?: boolean } {
    const lower = message.toLowerCase();
    const extracted: Record<string, unknown> = {};
    let confidenceBoost = 0.15;
    let needsClarification = false;

    // CHECK FOR VAGUE ANSWERS that need clarification
    // If we just asked about industry and user said "Other" or "Services" - we need more info
    const lastQuestion = state.questionsAsked[state.questionsAsked.length - 1];
    if (lastQuestion === 'industry') {
      const vagueAnswers = ['other', 'services', 'something else', 'not listed', 'different'];
      if (vagueAnswers.some(v => lower.includes(v)) || lower === 'other') {
        // User gave vague answer - need clarification
        needsClarification = true;
        confidenceBoost = 0; // We learned nothing
        return { extracted, confidenceBoost, needsClarification };
      }
    }

    // Check if this is a sub-vertical response
    const subVerticalOptions = state.collectedInfo._subVerticalOptions as Array<{ label: string; kit: string }> | undefined;
    if (subVerticalOptions && state.questionsAsked.includes('subVertical')) {
      // Find matching option
      for (const option of subVerticalOptions) {
        if (lower.includes(option.label.toLowerCase().substring(0, 20)) || 
            message.includes(option.label)) {
          extracted.industry = option.kit;
          extracted.resolvedSubVertical = true;
          confidenceBoost += 0.25;
          break;
        }
      }
      // Clean up the temp storage
      extracted._subVerticalOptions = undefined;
    }

    // Check for industry in response (expanded to include sub-verticals)
    if (!state.collectedInfo.industry && !extracted.industry) {
      const industryKeywords: Record<string, string[]> = {
        restaurant: ['restaurant', 'cafe', 'diner'],
        bakery: ['bakery', 'bake', 'baker', 'pastry', 'bread', 'cake'],
        salon: ['salon', 'beauty', 'hair', 'spa'],
        'fitness-coach': ['personal trainer', 'trainer', '1-on-1', 'one-on-one', 'fitness'],
        gym: ['gym', 'membership', 'fitness studio', 'memberships'],
        'real-estate': ['real estate', 'realtor', 'buying', 'selling', 'agent'],
        'property-management': ['property management', 'landlord', 'rental', 'tenant', 'lease'],
        medical: ['medical', 'clinic', 'doctor', 'health'],
        retail: ['retail', 'shop', 'store'],
        'food-service': ['food', 'catering', 'food truck'],
        cleaning: ['home cleaning', 'residential', 'houses', 'cleaning'],
        'commercial-cleaning': ['commercial', 'office', 'building', 'janitorial'],
        tutor: ['tutor', 'teaching', 'student'],
        services: ['service', 'consulting', 'freelance', 'other'],
        photography: ['photography', 'photographer'],
        'pet-services': ['pet', 'dog', 'grooming'],
      };

      for (const [industry, keywords] of Object.entries(industryKeywords)) {
        if (keywords.some(k => lower.includes(k))) {
          extracted.industry = industry;
          confidenceBoost += 0.15;
          break;
        }
      }
    }

    // Check for team size
    if (!state.collectedInfo.teamSize) {
      if (/\b(just me|solo|alone|myself)\b/i.test(lower)) {
        extracted.teamSize = 'solo';
        confidenceBoost += 0.1;
      } else if (/\b(small team|2-5|few people)\b/i.test(lower)) {
        extracted.teamSize = 'small';
        confidenceBoost += 0.1;
      } else if (/\b(team|larger|6\+|big)\b/i.test(lower)) {
        extracted.teamSize = 'team';
        confidenceBoost += 0.1;
      }
    }

    // Check for main goal
    if (/\b(booking|appointment|schedule)\b/i.test(lower)) {
      extracted.mainFeature = 'bookings';
      confidenceBoost += 0.1;
    } else if (/\b(customer|client|crm)\b/i.test(lower)) {
      extracted.mainFeature = 'customers';
      confidenceBoost += 0.1;
    } else if (/\b(order|sale|inventory)\b/i.test(lower)) {
      extracted.mainFeature = 'orders';
      confidenceBoost += 0.1;
    } else if (/\b(organize|manage|track)\b/i.test(lower)) {
      extracted.mainFeature = 'management';
      confidenceBoost += 0.1;
    }

    // Check for domain-specific entities mentioned
    if (/\b(tenant|rent|lease)\b/i.test(lower)) {
      extracted.industry = extracted.industry || 'property-management';
      confidenceBoost += 0.15;
    } else if (/\b(member|membership|class)\b/i.test(lower)) {
      extracted.industry = extracted.industry || 'gym';
      confidenceBoost += 0.15;
    } else if (/\b(student|lesson|homework)\b/i.test(lower)) {
      extracted.industry = extracted.industry || 'tutor';
      confidenceBoost += 0.15;
    }

    // Customer facing - comprehensive detection from user responses
    const customerFacingYesPatterns = [
      /\b(yes|yep|yeah|sure|absolutely|definitely)\b/i,
      /\b(customer|client|they can|public|external)\b/i,
      /\b(order|ordering|book|booking|browse|checkout)\b/i,
      /\b(coupon|discount|promo|notification|track)\b/i,
    ];
    const customerFacingNoPatterns = [
      /\b(no|nope|internal|just us|just me|private|admin only|staff only)\b/i,
    ];
    
    if (!state.collectedInfo.customerFacing && customerFacingYesPatterns.some(p => p.test(lower))) {
      extracted.customerFacing = true;
      // Detect specific customer features from the response
      extracted.customerFeatures = {
        browseCatalog: /\b(browse|menu|catalog|products|items|services)\b/i.test(lower),
        placeOrders: /\b(order|ordering|purchase|buy)\b/i.test(lower),
        bookAppointments: /\b(book|booking|appointment|reservation|schedule)\b/i.test(lower),
        trackOrders: /\b(track|status|notification|notif)\b/i.test(lower),
        usePromotions: /\b(coupon|discount|promo|promotion|loyalty|reward)\b/i.test(lower),
        makePayments: /\b(pay|payment|checkout|purchase)\b/i.test(lower),
      };
      confidenceBoost += 0.15;
    } else if (customerFacingNoPatterns.some(p => p.test(lower))) {
      extracted.customerFacing = false;
      confidenceBoost += 0.1;
    }

    // Check for complexity response
    if (!state.collectedInfo.complexity && state.questionsAsked.includes('complexity')) {
      const industry = state.collectedInfo.industry as string | undefined;
      if (industry && COMPLEXITY_QUESTIONS[industry]) {
        const complexityQ = COMPLEXITY_QUESTIONS[industry];
        for (const option of complexityQ.options) {
          // Match if user response contains key parts of the option label
          if (lower.includes(option.label.toLowerCase().substring(0, 15)) ||
              message.includes(option.label)) {
            extracted.complexity = option.complexity;
            confidenceBoost += 0.15;
            break;
          }
        }
        // Fallback: detect complexity keywords
        if (!extracted.complexity) {
          if (/\b(solo|just me|small|1-5|1-10|under 50|single)\b/i.test(lower)) {
            extracted.complexity = 'simple';
            confidenceBoost += 0.1;
          } else if (/\b(medium|growing|2-5|6-50|11-50|50-500)\b/i.test(lower)) {
            extracted.complexity = 'medium';
            confidenceBoost += 0.1;
          } else if (/\b(large|big|multiple|50\+|500\+|chain|agency)\b/i.test(lower)) {
            extracted.complexity = 'advanced';
            confidenceBoost += 0.1;
          }
        }
      }
    }

    return { extracted, confidenceBoost, needsClarification };
  }

  /**
   * @deprecated This method uses hardcoded question flow which is deprecated.
   * 
   * WHY DEPRECATED:
   * - Hardcoded question order causes premature completion
   * - Predefined options force users into generic categories
   * - Does not adapt to what user actually said
   * 
   * USE INSTEAD: generateAIFollowUp() for dynamic, contextual questions
   * 
   * This method is preserved only for backward compatibility with existing code
   * that may still call it. New code should NOT use this method.
   */
  private getNextQuestion(_state: ConversationState): { id: string; question: string; options: string[] } | null {
    // DEPRECATED: Return null to prevent hardcoded question flow
    // All question generation should now go through generateAIFollowUp()
    console.warn('getNextQuestion() is deprecated. Use generateAIFollowUp() instead.');
    return null;
  }

  /**
   * Create completion response with app config
   * 
   * IMPORTANT: This method should ONLY be called when:
   * 1. Confidence >= 0.95 (MIN_CONFIDENCE_FOR_AUTO_COMPLETE), OR
   * 2. User has explicitly confirmed (state.userConfirmed === true)
   * 
   * This protection prevents premature completion of generic apps.
   * The confidence threshold and confirmation requirement ensure the system
   * truly understands the user's needs before building.
   */
  private createCompletionResponse(state: ConversationState): ChatResponse {
    // SAFETY CHECK: Prevent completion without proper confidence or confirmation
    // This is the key protection against premature generic app generation
    if (state.confidence < MIN_CONFIDENCE_FOR_AUTO_COMPLETE && !state.userConfirmed) {
      console.warn(
        `WARNING: createCompletionResponse called with low confidence (${state.confidence}) ` +
        `without user confirmation. This should not happen. Returning confirmation request instead.`
      );
      return this.createConfirmationResponse(state, {
        industry: state.collectedInfo.industry as string,
        confidence: state.confidence,
        extracted: state.collectedInfo,
      });
    }

    const industry = state.collectedInfo.industry || state.detectedIndustry || 'general_business';
    const teamSize = (state.collectedInfo.teamSize as string) || 'team';
    
    const appConfig = {
      context: 'business',
      industryText: industry,
      teamSize: teamSize === 'solo' ? 'solo' : 'team',
      offerType: 'services',
      customerFacing: state.collectedInfo.customerFacing ?? false,
      mainFeature: state.collectedInfo.mainFeature || 'management',
      originalDescription: state.originalInput,
      // Include all collected info for richer app generation
      ...state.collectedInfo,
      // Complexity level affects features, UI complexity, and permissions
      complexity: (state.collectedInfo.complexity as 'simple' | 'medium' | 'advanced') || 'medium',
      // Flag indicating user explicitly confirmed their needs
      userConfirmed: state.userConfirmed || false,
    };

    // Context-aware completion message
    let completionMessage: string;
    if (industry && industry !== 'general_business') {
      const formattedIndustry = this.formatIndustryName(industry as string);
      completionMessage = random(RESPONSES.readyToBuild(formattedIndustry, teamSize));
    } else {
      completionMessage = random(RESPONSES.completion);
    }

    return {
      complete: true,
      appConfig,
      completionMessage,
      step: state.step,
      collectedInfo: state.collectedInfo,
    };
  }

  /**
   * Format industry name for display
   */
  private formatIndustryName(industry: string): string {
    const names: Record<string, string> = {
      restaurant: 'restaurant',
      bakery: 'bakery',
      salon: 'salon',
      'fitness-coach': 'personal training',
      gym: 'gym/fitness studio',
      'real-estate': 'real estate',
      'property-management': 'property management',
      medical: 'healthcare',
      retail: 'retail',
      'food-service': 'food service',
      plumber: 'plumbing',
      electrician: 'electrical services',
      contractor: 'contracting',
      cleaning: 'cleaning services',
      'commercial-cleaning': 'commercial cleaning',
      tutor: 'tutoring',
      mechanic: 'auto repair',
      landscaping: 'landscaping',
      'home-health': 'home health care',
      photography: 'photography',
      'pet-services': 'pet services',
    };
    return names[industry] || industry.replace(/-/g, ' ');
  }
}
