/**
 * Industry Mapper
 * 
 * Maps natural language input to industries and professions.
 * Understands the context of what business/activity the user is building for.
 */

import type {
  ParsedInput,
  IndustryMapping,
  IndustryId,
  ProfessionMapping,
  BusinessType,
} from './types.js';

// ============================================================
// INDUSTRY KNOWLEDGE BASE
// ============================================================

interface IndustryDefinition {
  id: IndustryId;
  name: string;
  keywords: string[];
  professions: ProfessionDefinition[];
  synonyms: string[];
  relatedFeatures: string[];
  typicalBusinessTypes: BusinessType[];
  dashboardType: 'operations' | 'sales' | 'service' | 'health' | 'productivity';
}

interface ProfessionDefinition {
  id: string;
  name: string;
  keywords: string[];
  specializations: string[];
  typicalFeatures: string[];
}

const INDUSTRIES: IndustryDefinition[] = [
  // TRADES
  {
    id: 'trades',
    name: 'Trades & Home Services',
    keywords: [
      'plumber', 'plumbing', 'electrician', 'electrical', 'hvac', 'heating', 'cooling',
      'contractor', 'construction', 'renovation', 'remodel', 'repair', 'maintenance',
      'handyman', 'carpentry', 'roofing', 'painting', 'flooring', 'landscaping',
      'pool', 'fence', 'garage', 'driveway', 'concrete', 'masonry',
    ],
    professions: [
      {
        id: 'plumber',
        name: 'Plumber',
        keywords: ['plumber', 'plumbing', 'pipe', 'drain', 'water heater', 'toilet', 'faucet', 'leak'],
        specializations: ['residential', 'commercial', 'emergency', 'new construction'],
        typicalFeatures: ['job_tracking', 'scheduling', 'invoicing', 'inventory', 'quotes'],
      },
      {
        id: 'electrician',
        name: 'Electrician',
        keywords: ['electrician', 'electrical', 'wiring', 'circuit', 'panel', 'outlet', 'lighting'],
        specializations: ['residential', 'commercial', 'industrial', 'solar'],
        typicalFeatures: ['job_tracking', 'scheduling', 'invoicing', 'permits', 'inspections'],
      },
      {
        id: 'hvac',
        name: 'HVAC Technician',
        keywords: ['hvac', 'heating', 'cooling', 'air conditioning', 'ac', 'furnace', 'ventilation'],
        specializations: ['residential', 'commercial', 'maintenance', 'installation'],
        typicalFeatures: ['job_tracking', 'scheduling', 'invoicing', 'maintenance_contracts', 'equipment'],
      },
      {
        id: 'contractor',
        name: 'General Contractor',
        keywords: ['contractor', 'construction', 'remodel', 'renovation', 'build', 'addition'],
        specializations: ['residential', 'commercial', 'new construction', 'remodeling'],
        typicalFeatures: ['project_management', 'scheduling', 'quotes', 'invoicing', 'subcontractors'],
      },
    ],
    synonyms: ['home services', 'field service', 'service business'],
    relatedFeatures: ['job_tracking', 'scheduling', 'invoicing', 'inventory', 'quotes', 'messaging'],
    typicalBusinessTypes: ['solo', 'small_team', 'team'],
    dashboardType: 'operations',
  },

  // HEALTHCARE
  {
    id: 'healthcare',
    name: 'Healthcare & Wellness',
    keywords: [
      'doctor', 'medical', 'clinic', 'healthcare', 'health', 'hospital', 'patient',
      'dentist', 'dental', 'chiropractor', 'physical therapy', 'therapist', 'therapy',
      'veterinarian', 'vet', 'pet', 'animal', 'wellness', 'spa', 'massage',
      'mental health', 'counselor', 'psychologist', 'psychiatrist',
    ],
    professions: [
      {
        id: 'medical-practice',
        name: 'Medical Practice',
        keywords: ['doctor', 'physician', 'medical', 'clinic', 'patient', 'appointment'],
        specializations: ['family medicine', 'pediatrics', 'internal medicine', 'specialty'],
        typicalFeatures: ['appointments', 'patient_records', 'billing', 'prescriptions', 'messaging'],
      },
      {
        id: 'dental',
        name: 'Dental Practice',
        keywords: ['dentist', 'dental', 'teeth', 'orthodontist', 'hygienist'],
        specializations: ['general', 'cosmetic', 'orthodontics', 'pediatric'],
        typicalFeatures: ['appointments', 'patient_records', 'treatment_plans', 'billing', 'reminders'],
      },
      {
        id: 'therapy',
        name: 'Therapy Practice',
        keywords: ['therapist', 'therapy', 'counselor', 'psychologist', 'mental health'],
        specializations: ['individual', 'couples', 'family', 'group'],
        typicalFeatures: ['appointments', 'client_notes', 'billing', 'session_tracking'],
      },
      {
        id: 'wellness',
        name: 'Wellness Center',
        keywords: ['wellness', 'spa', 'massage', 'holistic', 'alternative'],
        specializations: ['massage', 'acupuncture', 'meditation', 'nutrition'],
        typicalFeatures: ['appointments', 'client_profiles', 'packages', 'payments'],
      },
    ],
    synonyms: ['medical', 'health services', 'patient care'],
    relatedFeatures: ['appointments', 'patient_records', 'billing', 'reminders', 'messaging'],
    typicalBusinessTypes: ['solo', 'small_team', 'team', 'company'],
    dashboardType: 'health',
  },

  // HOSPITALITY
  {
    id: 'hospitality',
    name: 'Hospitality & Food Service',
    keywords: [
      'restaurant', 'cafe', 'coffee', 'bar', 'pub', 'food', 'dining',
      'hotel', 'motel', 'lodging', 'accommodation', 'resort', 'inn',
      'catering', 'event', 'banquet', 'wedding', 'party',
      'bakery', 'food truck', 'kitchen', 'chef',
    ],
    professions: [
      {
        id: 'restaurant',
        name: 'Restaurant',
        keywords: ['restaurant', 'dining', 'food', 'menu', 'table', 'reservation'],
        specializations: ['fine dining', 'casual', 'fast food', 'takeout'],
        typicalFeatures: ['reservations', 'orders', 'menu', 'inventory', 'staff_scheduling'],
      },
      {
        id: 'cafe',
        name: 'Cafe / Coffee Shop',
        keywords: ['cafe', 'coffee', 'espresso', 'bakery', 'pastry'],
        specializations: ['coffee', 'tea', 'pastries', 'light meals'],
        typicalFeatures: ['orders', 'inventory', 'loyalty_program', 'pos'],
      },
      {
        id: 'hotel',
        name: 'Hotel / Lodging',
        keywords: ['hotel', 'motel', 'inn', 'lodging', 'room', 'guest', 'reservation'],
        specializations: ['boutique', 'business', 'resort', 'bed and breakfast'],
        typicalFeatures: ['reservations', 'room_management', 'guest_profiles', 'billing', 'housekeeping'],
      },
      {
        id: 'catering',
        name: 'Catering / Events',
        keywords: ['catering', 'event', 'wedding', 'party', 'banquet', 'celebration'],
        specializations: ['weddings', 'corporate', 'private parties', 'food delivery'],
        typicalFeatures: ['event_planning', 'quotes', 'invoicing', 'menu_planning', 'staff'],
      },
    ],
    synonyms: ['food service', 'hotel industry', 'restaurants'],
    relatedFeatures: ['reservations', 'orders', 'inventory', 'scheduling', 'payments'],
    typicalBusinessTypes: ['solo', 'small_team', 'team', 'company'],
    dashboardType: 'operations',
  },

  // PROFESSIONAL SERVICES
  {
    id: 'professional',
    name: 'Professional Services',
    keywords: [
      'lawyer', 'attorney', 'legal', 'law firm', 'paralegal',
      'accountant', 'accounting', 'bookkeeper', 'tax', 'cpa',
      'consultant', 'consulting', 'advisor', 'coach',
      'architect', 'engineer', 'surveyor',
      'financial', 'investment', 'insurance', 'broker',
    ],
    professions: [
      {
        id: 'law-firm',
        name: 'Law Firm',
        keywords: ['lawyer', 'attorney', 'legal', 'law', 'case', 'client'],
        specializations: ['family law', 'criminal', 'corporate', 'real estate', 'immigration'],
        typicalFeatures: ['case_management', 'client_portal', 'billing', 'documents', 'calendar'],
      },
      {
        id: 'accounting',
        name: 'Accounting Firm',
        keywords: ['accountant', 'accounting', 'tax', 'bookkeeper', 'cpa', 'financial'],
        specializations: ['tax', 'audit', 'bookkeeping', 'payroll', 'advisory'],
        typicalFeatures: ['client_management', 'billing', 'documents', 'deadlines', 'tasks'],
      },
      {
        id: 'consulting',
        name: 'Consulting',
        keywords: ['consultant', 'consulting', 'advisor', 'strategy', 'management'],
        specializations: ['management', 'it', 'marketing', 'hr', 'operations'],
        typicalFeatures: ['projects', 'time_tracking', 'invoicing', 'proposals', 'client_portal'],
      },
    ],
    synonyms: ['b2b services', 'client services', 'knowledge work'],
    relatedFeatures: ['client_management', 'billing', 'documents', 'time_tracking', 'calendar'],
    typicalBusinessTypes: ['solo', 'small_team', 'team', 'company', 'enterprise'],
    dashboardType: 'service',
  },

  // CREATIVE
  {
    id: 'creative',
    name: 'Creative & Design',
    keywords: [
      'designer', 'design', 'graphic', 'web', 'ui', 'ux',
      'photographer', 'photography', 'studio', 'video', 'videographer',
      'artist', 'art', 'illustration', 'animation',
      'marketing', 'advertising', 'branding', 'agency',
      'writer', 'copywriter', 'content', 'blog',
    ],
    professions: [
      {
        id: 'design-studio',
        name: 'Design Studio',
        keywords: ['designer', 'design', 'graphic', 'branding', 'creative'],
        specializations: ['graphic design', 'web design', 'branding', 'packaging'],
        typicalFeatures: ['projects', 'client_management', 'invoicing', 'portfolio', 'collaboration'],
      },
      {
        id: 'photography',
        name: 'Photography',
        keywords: ['photographer', 'photography', 'photo', 'shoot', 'session'],
        specializations: ['wedding', 'portrait', 'commercial', 'event', 'product'],
        typicalFeatures: ['booking', 'client_management', 'gallery', 'invoicing', 'contracts'],
      },
      {
        id: 'video-production',
        name: 'Video Production',
        keywords: ['video', 'videographer', 'film', 'production', 'editing'],
        specializations: ['commercial', 'documentary', 'music video', 'corporate'],
        typicalFeatures: ['projects', 'scheduling', 'invoicing', 'equipment', 'collaboration'],
      },
    ],
    synonyms: ['creative agency', 'design agency', 'media'],
    relatedFeatures: ['projects', 'client_management', 'portfolio', 'invoicing', 'collaboration'],
    typicalBusinessTypes: ['solo', 'small_team', 'team'],
    dashboardType: 'service',
  },

  // FITNESS
  {
    id: 'fitness',
    name: 'Fitness & Sports',
    keywords: [
      'gym', 'fitness', 'personal trainer', 'trainer', 'workout', 'exercise',
      'yoga', 'pilates', 'crossfit', 'martial arts', 'boxing',
      'sports', 'coach', 'coaching', 'athletic', 'athlete',
      'dance', 'studio', 'class', 'membership',
    ],
    professions: [
      {
        id: 'personal-trainer',
        name: 'Personal Trainer',
        keywords: ['trainer', 'personal training', 'fitness', 'workout', 'client'],
        specializations: ['weight loss', 'strength', 'sports specific', 'rehabilitation'],
        typicalFeatures: ['client_management', 'scheduling', 'workout_plans', 'progress_tracking', 'billing'],
      },
      {
        id: 'gym',
        name: 'Gym / Fitness Center',
        keywords: ['gym', 'fitness center', 'membership', 'equipment', 'class'],
        specializations: ['general fitness', 'crossfit', 'yoga', 'martial arts'],
        typicalFeatures: ['memberships', 'class_scheduling', 'check_in', 'billing', 'staff'],
      },
      {
        id: 'sports-coaching',
        name: 'Sports Coaching',
        keywords: ['coach', 'coaching', 'team', 'athlete', 'training', 'practice'],
        specializations: ['individual', 'team', 'youth', 'professional'],
        typicalFeatures: ['scheduling', 'player_profiles', 'progress_tracking', 'communication'],
      },
    ],
    synonyms: ['health club', 'training', 'athletics'],
    relatedFeatures: ['scheduling', 'client_management', 'progress_tracking', 'billing', 'memberships'],
    typicalBusinessTypes: ['solo', 'small_team', 'team'],
    dashboardType: 'health',
  },

  // RETAIL
  {
    id: 'retail',
    name: 'Retail & E-commerce',
    keywords: [
      'store', 'shop', 'retail', 'sell', 'product', 'merchandise',
      'ecommerce', 'online store', 'inventory', 'stock',
      'boutique', 'apparel', 'clothing', 'fashion',
      'wholesale', 'distributor', 'supplier',
    ],
    professions: [
      {
        id: 'retail-store',
        name: 'Retail Store',
        keywords: ['store', 'shop', 'retail', 'customer', 'product', 'sale'],
        specializations: ['clothing', 'electronics', 'home goods', 'specialty'],
        typicalFeatures: ['inventory', 'pos', 'customer_management', 'orders', 'reporting'],
      },
      {
        id: 'ecommerce',
        name: 'E-commerce',
        keywords: ['online', 'ecommerce', 'website', 'shipping', 'order'],
        specializations: ['b2c', 'b2b', 'dropshipping', 'marketplace'],
        typicalFeatures: ['inventory', 'orders', 'shipping', 'customer_management', 'analytics'],
      },
    ],
    synonyms: ['commerce', 'sales', 'merchandising'],
    relatedFeatures: ['inventory', 'orders', 'customer_management', 'pos', 'shipping'],
    typicalBusinessTypes: ['solo', 'small_team', 'team', 'company'],
    dashboardType: 'sales',
  },

  // REAL ESTATE
  {
    id: 'real_estate',
    name: 'Real Estate',
    keywords: [
      'real estate', 'property', 'realtor', 'agent', 'broker',
      'rental', 'lease', 'tenant', 'landlord', 'property management',
      'listing', 'home', 'house', 'apartment', 'condo',
      'commercial property', 'investment', 'mortgage',
    ],
    professions: [
      {
        id: 'realtor',
        name: 'Real Estate Agent',
        keywords: ['realtor', 'agent', 'broker', 'listing', 'showing', 'buyer', 'seller'],
        specializations: ['residential', 'commercial', 'luxury', 'investment'],
        typicalFeatures: ['listings', 'client_management', 'showings', 'documents', 'pipeline'],
      },
      {
        id: 'property-manager',
        name: 'Property Manager',
        keywords: ['property manager', 'landlord', 'rental', 'tenant', 'lease', 'maintenance'],
        specializations: ['residential', 'commercial', 'vacation rental', 'hoa'],
        typicalFeatures: ['properties', 'tenants', 'leases', 'maintenance', 'rent_collection', 'accounting'],
      },
    ],
    synonyms: ['property', 'housing', 'rentals'],
    relatedFeatures: ['listings', 'client_management', 'documents', 'scheduling', 'payments'],
    typicalBusinessTypes: ['solo', 'small_team', 'team', 'company'],
    dashboardType: 'sales',
  },

  // EDUCATION
  {
    id: 'education',
    name: 'Education & Training',
    keywords: [
      'school', 'education', 'learning', 'teaching', 'teacher',
      'tutor', 'tutoring', 'student', 'class', 'course',
      'training', 'workshop', 'seminar', 'certification',
      'online learning', 'e-learning', 'curriculum',
    ],
    professions: [
      {
        id: 'tutoring',
        name: 'Tutoring Service',
        keywords: ['tutor', 'tutoring', 'student', 'lesson', 'homework', 'subject'],
        specializations: ['academic', 'test prep', 'language', 'music', 'art'],
        typicalFeatures: ['scheduling', 'student_profiles', 'progress_tracking', 'billing', 'resources'],
      },
      {
        id: 'training-center',
        name: 'Training Center',
        keywords: ['training', 'course', 'certification', 'workshop', 'class'],
        specializations: ['professional', 'technical', 'corporate', 'creative'],
        typicalFeatures: ['courses', 'enrollment', 'scheduling', 'progress_tracking', 'certificates'],
      },
    ],
    synonyms: ['learning', 'teaching', 'courses'],
    relatedFeatures: ['scheduling', 'student_management', 'courses', 'progress_tracking', 'billing'],
    typicalBusinessTypes: ['solo', 'small_team', 'team', 'company'],
    dashboardType: 'service',
  },

  // PERSONAL PRODUCTIVITY
  {
    id: 'personal',
    name: 'Personal Productivity',
    keywords: [
      'personal', 'myself', 'my own', 'individual', 'private',
      'task', 'todo', 'habit', 'goal', 'productivity',
      'journal', 'diary', 'notes', 'reminder',
      'budget', 'finance', 'expense', 'savings',
    ],
    professions: [],
    synonyms: ['individual use', 'self management', 'personal life'],
    relatedFeatures: ['tasks', 'habits', 'goals', 'notes', 'reminders', 'calendar'],
    typicalBusinessTypes: ['personal'],
    dashboardType: 'productivity',
  },

  // HOME MANAGEMENT
  {
    id: 'home',
    name: 'Home & Family',
    keywords: [
      'home', 'house', 'family', 'household', 'domestic',
      'chores', 'cleaning', 'organizing', 'declutter',
      'kids', 'children', 'parenting', 'school',
      'pets', 'pet care', 'dog', 'cat',
      'meal', 'recipe', 'grocery', 'cooking',
    ],
    professions: [],
    synonyms: ['household', 'family management', 'domestic'],
    relatedFeatures: ['chores', 'calendar', 'shopping_lists', 'meal_planning', 'budget'],
    typicalBusinessTypes: ['personal'],
    dashboardType: 'productivity',
  },

  // NONPROFIT
  {
    id: 'nonprofit',
    name: 'Nonprofit & Organizations',
    keywords: [
      'nonprofit', 'charity', 'organization', 'ngo', 'foundation',
      'volunteer', 'donation', 'fundraising', 'grant',
      'membership', 'association', 'club', 'community',
      'church', 'religious', 'ministry',
    ],
    professions: [
      {
        id: 'charity',
        name: 'Charity / NGO',
        keywords: ['charity', 'nonprofit', 'donation', 'cause', 'volunteer', 'fundraising'],
        specializations: ['humanitarian', 'environmental', 'educational', 'health'],
        typicalFeatures: ['donations', 'volunteer_management', 'events', 'campaigns', 'reporting'],
      },
      {
        id: 'membership-org',
        name: 'Membership Organization',
        keywords: ['membership', 'association', 'club', 'member', 'dues'],
        specializations: ['professional', 'recreational', 'community', 'industry'],
        typicalFeatures: ['memberships', 'events', 'communications', 'directory', 'dues'],
      },
    ],
    synonyms: ['ngo', 'charity', 'organization'],
    relatedFeatures: ['donations', 'memberships', 'volunteers', 'events', 'communications'],
    typicalBusinessTypes: ['small_team', 'team', 'company'],
    dashboardType: 'operations',
  },

  // SERVICES (DEFAULT/CATCH-ALL)
  {
    id: 'services',
    name: 'General Services',
    keywords: [
      'service', 'business', 'company', 'client', 'customer',
      'appointment', 'booking', 'schedule',
    ],
    professions: [],
    synonyms: ['general business', 'service provider'],
    relatedFeatures: ['scheduling', 'client_management', 'invoicing', 'calendar'],
    typicalBusinessTypes: ['solo', 'small_team', 'team'],
    dashboardType: 'service',
  },
];

// ============================================================
// INDUSTRY MAPPER
// ============================================================

export class IndustryMapper {
  /**
   * Map parsed input to an industry and profession
   */
  async map(parsed: ParsedInput): Promise<IndustryMapping> {
    const scores = this.scoreAllIndustries(parsed);
    const sorted = scores.sort((a, b) => b.score - a.score);
    
    const best = sorted[0];
    const industry = INDUSTRIES.find(i => i.id === best.id)!;
    
    // Detect profession within industry
    const profession = this.detectProfession(parsed, industry);
    
    // Detect business type
    const businessType = this.detectBusinessType(parsed);
    
    // Get alternatives
    const alternatives = sorted.slice(1, 4).map(s => ({
      id: s.id,
      confidence: s.score / Math.max(best.score, 0.01),
    }));
    
    return {
      id: best.id,
      name: industry.name,
      confidence: Math.min(best.score, 1),
      profession,
      businessType,
      alternatives,
    };
  }

  /**
   * Score all industries against the input
   */
  private scoreAllIndustries(parsed: ParsedInput): Array<{ id: IndustryId; score: number }> {
    const results: Array<{ id: IndustryId; score: number }> = [];
    
    const inputText = parsed.normalized;
    const inputNouns = new Set(parsed.nouns.map(n => n.toLowerCase()));
    const inputPhrases = parsed.phrases.map(p => p.toLowerCase());
    
    for (const industry of INDUSTRIES) {
      let score = 0;
      
      // Match keywords
      for (const keyword of industry.keywords) {
        if (inputText.includes(keyword)) {
          score += 0.15;
        }
      }
      
      // Match professions
      for (const profession of industry.professions) {
        for (const keyword of profession.keywords) {
          if (inputText.includes(keyword)) {
            score += 0.2;
          }
        }
      }
      
      // Match synonyms
      for (const synonym of industry.synonyms) {
        if (inputText.includes(synonym)) {
          score += 0.1;
        }
      }
      
      // Match nouns directly
      for (const noun of inputNouns) {
        if (industry.keywords.includes(noun)) {
          score += 0.15;
        }
      }
      
      // Match semantic intents to features
      for (const intent of parsed.intents) {
        const featureMap: Record<string, string[]> = {
          'scheduling': ['appointments', 'scheduling', 'calendar', 'booking'],
          'billing': ['invoicing', 'payments', 'billing', 'quotes'],
          'tracking': ['job_tracking', 'progress_tracking', 'inventory'],
          'managing': ['client_management', 'staff', 'project_management'],
        };
        
        const matchingFeatures = featureMap[intent] || [];
        const hasFeature = matchingFeatures.some(f => 
          industry.relatedFeatures.includes(f)
        );
        if (hasFeature) {
          score += 0.1;
        }
      }
      
      // Phrase matching for more context
      for (const phrase of inputPhrases) {
        for (const keyword of industry.keywords) {
          if (phrase.includes(keyword)) {
            score += 0.1;
          }
        }
      }
      
      results.push({ id: industry.id, score });
    }
    
    // Normalize scores
    const maxScore = Math.max(...results.map(r => r.score), 0.01);
    return results.map(r => ({
      id: r.id,
      score: r.score / maxScore,
    }));
  }

  /**
   * Detect specific profession within an industry
   */
  private detectProfession(parsed: ParsedInput, industry: IndustryDefinition): ProfessionMapping | undefined {
    if (industry.professions.length === 0) return undefined;
    
    let bestMatch: { profession: ProfessionDefinition; score: number } | null = null;
    const inputText = parsed.normalized;
    
    for (const profession of industry.professions) {
      let score = 0;
      
      for (const keyword of profession.keywords) {
        if (inputText.includes(keyword)) {
          score += 0.3;
        }
      }
      
      for (const spec of profession.specializations) {
        if (inputText.includes(spec.toLowerCase())) {
          score += 0.2;
        }
      }
      
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { profession, score };
      }
    }
    
    if (!bestMatch || bestMatch.score < 0.1) return undefined;
    
    const detected = bestMatch.profession;
    const specializations = detected.specializations.filter(s =>
      inputText.includes(s.toLowerCase())
    );
    
    return {
      id: detected.id,
      name: detected.name,
      confidence: Math.min(bestMatch.score, 1),
      specializations,
    };
  }

  /**
   * Detect business type/size from input
   */
  private detectBusinessType(parsed: ParsedInput): BusinessType {
    const text = parsed.normalized;
    
    // Check for explicit mentions
    if (/\b(myself|just me|solo|freelance|independent)\b/i.test(text)) {
      return 'solo';
    }
    if (/\b(small team|few people|2-5|couple of)\b/i.test(text)) {
      return 'small_team';
    }
    if (/\b(team|staff|employees|crew|technicians)\b/i.test(text)) {
      return 'team';
    }
    if (/\b(company|business|enterprise|organization|large)\b/i.test(text)) {
      return 'company';
    }
    if (/\b(personal|myself|my own|private|individual)\b/i.test(text)) {
      return 'personal';
    }
    
    // Check for hints in modifiers
    const teamMod = parsed.modifiers.find(m => 
      m.type === 'quantity' && 
      ['multiple', 'several', 'many', 'team'].includes(m.text.toLowerCase())
    );
    if (teamMod) return 'team';
    
    // Default based on common patterns
    if (parsed.intents.includes('collaborating')) {
      return 'team';
    }
    
    // Default to small team for business apps
    if (parsed.intent === 'create_app') {
      return 'small_team';
    }
    
    return 'solo';
  }

  /**
   * Get industry by ID
   */
  getIndustry(id: IndustryId): IndustryDefinition | undefined {
    return INDUSTRIES.find(i => i.id === id);
  }

  /**
   * Get all industries
   */
  getAllIndustries(): IndustryDefinition[] {
    return INDUSTRIES;
  }
}
