/**
 * Behavior Matcher
 * 
 * Matches natural language input to behavior bundles.
 * Behavior bundles are pre-configured app templates with complete functionality.
 */

import type {
  ParsedInput,
  IndustryMapping,
  DetectedFeature,
  MatchedBehavior,
  FeatureId,
  ThemePreference,
} from './types.js';

// ============================================================
// BEHAVIOR BUNDLE DEFINITIONS
// ============================================================

interface BehaviorBundle {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  industries: string[];
  features: FeatureId[];
  entities: string[];
  workflows: string[];
  theme: ThemePreference;
  weight: number; // Higher = more specific
}

const BEHAVIOR_BUNDLES: BehaviorBundle[] = [
  // SERVICE BUSINESSES
  {
    id: 'plumber',
    name: 'Plumbing Business',
    description: 'Complete plumbing business management',
    keywords: ['plumber', 'plumbing', 'pipe', 'drain', 'water heater', 'leak', 'toilet'],
    industries: ['trades'],
    features: ['job_tracking', 'scheduling', 'invoicing', 'quotes', 'inventory', 'messaging', 'dashboard'],
    entities: ['client', 'job', 'quote', 'invoice', 'material', 'appointment'],
    workflows: ['create-job', 'complete-job', 'create-invoice', 'send-invoice'],
    theme: { mode: 'light', style: 'professional', primaryColor: '#0ea5e9', accentColor: '#0284c7' },
    weight: 10,
  },
  {
    id: 'electrician',
    name: 'Electrical Business',
    description: 'Electrical contractor management',
    keywords: ['electrician', 'electrical', 'wiring', 'panel', 'circuit', 'outlet'],
    industries: ['trades'],
    features: ['job_tracking', 'scheduling', 'invoicing', 'quotes', 'inventory', 'dashboard'],
    entities: ['client', 'job', 'quote', 'invoice', 'material'],
    workflows: ['create-job', 'complete-job', 'create-invoice'],
    theme: { mode: 'light', style: 'professional', primaryColor: '#f59e0b', accentColor: '#d97706' },
    weight: 10,
  },
  {
    id: 'hvac',
    name: 'HVAC Business',
    description: 'Heating and cooling service management',
    keywords: ['hvac', 'heating', 'cooling', 'air conditioning', 'ac', 'furnace'],
    industries: ['trades'],
    features: ['job_tracking', 'scheduling', 'invoicing', 'quotes', 'inventory', 'reminders', 'dashboard'],
    entities: ['client', 'job', 'quote', 'invoice', 'material', 'appointment'],
    workflows: ['create-job', 'complete-job', 'create-invoice', 'schedule-maintenance'],
    theme: { mode: 'light', style: 'professional', primaryColor: '#3b82f6', accentColor: '#2563eb' },
    weight: 10,
  },
  {
    id: 'contractor',
    name: 'General Contractor',
    description: 'Construction project management',
    keywords: ['contractor', 'construction', 'remodel', 'renovation', 'building'],
    industries: ['trades', 'construction'],
    features: ['job_tracking', 'scheduling', 'invoicing', 'quotes', 'documents', 'dashboard'],
    entities: ['client', 'project', 'quote', 'invoice', 'document'],
    workflows: ['create-project', 'update-project', 'create-invoice'],
    theme: { mode: 'light', style: 'professional', primaryColor: '#78716c', accentColor: '#57534e' },
    weight: 9,
  },

  // HEALTHCARE
  {
    id: 'medical-practice',
    name: 'Medical Practice',
    description: 'Healthcare practice management',
    keywords: ['doctor', 'medical', 'clinic', 'patient', 'healthcare', 'physician'],
    industries: ['healthcare'],
    features: ['appointments', 'calendar', 'reminders', 'documents', 'messaging', 'dashboard'],
    entities: ['patient', 'appointment', 'document', 'invoice'],
    workflows: ['book-appointment', 'send-reminder', 'create-invoice'],
    theme: { mode: 'light', style: 'professional', primaryColor: '#10b981', accentColor: '#059669' },
    weight: 9,
  },
  {
    id: 'dental',
    name: 'Dental Practice',
    description: 'Dental office management',
    keywords: ['dentist', 'dental', 'teeth', 'orthodontist'],
    industries: ['healthcare'],
    features: ['appointments', 'calendar', 'reminders', 'documents', 'invoicing', 'dashboard'],
    entities: ['patient', 'appointment', 'document', 'invoice'],
    workflows: ['book-appointment', 'send-reminder'],
    theme: { mode: 'light', style: 'professional', primaryColor: '#06b6d4', accentColor: '#0891b2' },
    weight: 10,
  },
  {
    id: 'therapy',
    name: 'Therapy Practice',
    description: 'Therapist practice management',
    keywords: ['therapist', 'therapy', 'counselor', 'psychologist', 'mental health'],
    industries: ['healthcare'],
    features: ['appointments', 'calendar', 'reminders', 'documents', 'invoicing'],
    entities: ['client', 'appointment', 'document', 'invoice'],
    workflows: ['book-appointment', 'send-reminder'],
    theme: { mode: 'light', style: 'minimal', primaryColor: '#a855f7', accentColor: '#9333ea' },
    weight: 10,
  },

  // FITNESS
  {
    id: 'personal-trainer',
    name: 'Personal Trainer',
    description: 'Personal training business',
    keywords: ['trainer', 'personal training', 'fitness', 'workout', 'exercise', 'gym'],
    industries: ['fitness'],
    features: ['appointments', 'calendar', 'status_tracking', 'invoicing', 'messaging', 'dashboard'],
    entities: ['client', 'appointment', 'invoice'],
    workflows: ['book-session', 'send-reminder', 'create-invoice'],
    theme: { mode: 'light', style: 'bold', primaryColor: '#ec4899', accentColor: '#db2777' },
    weight: 9,
  },

  // PROFESSIONAL SERVICES
  {
    id: 'consulting',
    name: 'Consulting Business',
    description: 'Consulting practice management',
    keywords: ['consultant', 'consulting', 'advisor', 'strategy'],
    industries: ['professional'],
    features: ['job_tracking', 'invoicing', 'documents', 'calendar', 'dashboard'],
    entities: ['client', 'project', 'invoice', 'document'],
    workflows: ['create-project', 'create-invoice', 'send-invoice'],
    theme: { mode: 'light', style: 'professional', primaryColor: '#3b82f6', accentColor: '#2563eb' },
    weight: 8,
  },
  {
    id: 'law-firm',
    name: 'Law Firm',
    description: 'Legal practice management',
    keywords: ['lawyer', 'attorney', 'legal', 'law firm', 'case'],
    industries: ['professional'],
    features: ['job_tracking', 'documents', 'calendar', 'invoicing', 'dashboard'],
    entities: ['client', 'project', 'document', 'invoice'],
    workflows: ['create-case', 'update-case', 'create-invoice'],
    theme: { mode: 'light', style: 'professional', primaryColor: '#1e40af', accentColor: '#1e3a8a' },
    weight: 9,
  },

  // CREATIVE
  {
    id: 'photography',
    name: 'Photography Business',
    description: 'Photography studio management',
    keywords: ['photographer', 'photography', 'photo', 'shoot', 'session', 'wedding'],
    industries: ['creative'],
    features: ['appointments', 'invoicing', 'quotes', 'documents', 'calendar', 'file_upload'],
    entities: ['client', 'appointment', 'quote', 'invoice', 'document'],
    workflows: ['book-session', 'create-invoice', 'send-invoice'],
    theme: { mode: 'light', style: 'modern', primaryColor: '#8b5cf6', accentColor: '#7c3aed' },
    weight: 9,
  },
  {
    id: 'design-studio',
    name: 'Design Studio',
    description: 'Design agency management',
    keywords: ['designer', 'design', 'graphic', 'branding', 'creative', 'agency'],
    industries: ['creative'],
    features: ['job_tracking', 'invoicing', 'quotes', 'documents', 'calendar', 'pipelines'],
    entities: ['client', 'project', 'quote', 'invoice'],
    workflows: ['create-project', 'update-project', 'create-invoice'],
    theme: { mode: 'light', style: 'modern', primaryColor: '#f43f5e', accentColor: '#e11d48' },
    weight: 8,
  },

  // REAL ESTATE
  {
    id: 'property-manager',
    name: 'Property Manager',
    description: 'Rental property management',
    keywords: ['property', 'landlord', 'rental', 'tenant', 'lease', 'rent'],
    industries: ['real_estate'],
    features: ['status_tracking', 'invoicing', 'documents', 'messaging', 'calendar', 'dashboard'],
    entities: ['property', 'client', 'invoice', 'document'],
    workflows: ['collect-rent', 'create-lease', 'maintenance-request'],
    theme: { mode: 'light', style: 'professional', primaryColor: '#6366f1', accentColor: '#4f46e5' },
    weight: 9,
  },
  {
    id: 'realtor',
    name: 'Real Estate Agent',
    description: 'Real estate agent CRM',
    keywords: ['realtor', 'real estate agent', 'broker', 'listing', 'showing'],
    industries: ['real_estate'],
    features: ['status_tracking', 'calendar', 'documents', 'messaging', 'pipelines', 'dashboard'],
    entities: ['client', 'property', 'appointment', 'document'],
    workflows: ['schedule-showing', 'follow-up', 'close-deal'],
    theme: { mode: 'light', style: 'professional', primaryColor: '#0ea5e9', accentColor: '#0284c7' },
    weight: 9,
  },

  // PERSONAL PRODUCTIVITY
  {
    id: 'todo',
    name: 'Task Manager',
    description: 'Personal task management',
    keywords: ['todo', 'task', 'tasks', 'to-do', 'checklist', 'personal'],
    industries: ['personal'],
    features: ['crud', 'status_tracking', 'reminders'],
    entities: ['task'],
    workflows: ['create-task', 'complete-task'],
    theme: { mode: 'light', style: 'minimal', primaryColor: '#8b5cf6', accentColor: '#7c3aed' },
    weight: 7,
  },
  {
    id: 'habit-tracker',
    name: 'Habit Tracker',
    description: 'Personal habit tracking',
    keywords: ['habit', 'habits', 'routine', 'daily', 'tracker', 'streak'],
    industries: ['personal', 'fitness'],
    features: ['status_tracking', 'reminders', 'analytics'],
    entities: ['task'],
    workflows: ['log-habit', 'check-streak'],
    theme: { mode: 'light', style: 'playful', primaryColor: '#22c55e', accentColor: '#16a34a' },
    weight: 8,
  },

  // CRM
  {
    id: 'crm',
    name: 'Customer CRM',
    description: 'Customer relationship management',
    keywords: ['crm', 'customer', 'sales', 'leads', 'contacts', 'pipeline'],
    industries: ['services', 'professional', 'retail'],
    features: ['crud', 'status_tracking', 'pipelines', 'messaging', 'calendar', 'dashboard'],
    entities: ['client', 'project', 'appointment'],
    workflows: ['create-lead', 'convert-lead', 'follow-up'],
    theme: { mode: 'light', style: 'professional', primaryColor: '#3b82f6', accentColor: '#2563eb' },
    weight: 7,
  },

  // GENERIC
  {
    id: 'service-business',
    name: 'Service Business',
    description: 'General service business management',
    keywords: ['service', 'business', 'clients', 'appointments'],
    industries: ['services'],
    features: ['crud', 'appointments', 'invoicing', 'calendar', 'dashboard'],
    entities: ['client', 'appointment', 'invoice'],
    workflows: ['book-appointment', 'create-invoice'],
    theme: { mode: 'light', style: 'professional', primaryColor: '#3b82f6', accentColor: '#2563eb' },
    weight: 5,
  },
];

// ============================================================
// BEHAVIOR MATCHER
// ============================================================

export class BehaviorMatcher {
  /**
   * Match input to a behavior bundle
   */
  async match(
    parsed: ParsedInput,
    industry: IndustryMapping,
    features: DetectedFeature[]
  ): Promise<MatchedBehavior | null> {
    // Score all bundles
    const scores = this.scoreBundles(parsed, industry, features);
    
    // Get best match
    const sorted = scores.sort((a, b) => b.score - a.score);
    const best = sorted[0];
    
    // Only return if confidence is high enough
    if (!best || best.score < 0.3) {
      return null;
    }
    
    const bundle = BEHAVIOR_BUNDLES.find(b => b.id === best.id)!;
    
    return {
      id: bundle.id,
      name: bundle.name,
      confidence: best.score,
      features: bundle.features,
      entities: bundle.entities,
      workflows: bundle.workflows,
      theme: bundle.theme,
      reasoning: best.reason,
    };
  }

  /**
   * Score all bundles
   */
  private scoreBundles(
    parsed: ParsedInput,
    industry: IndustryMapping,
    features: DetectedFeature[]
  ): Array<{ id: string; score: number; reason: string }> {
    const results: Array<{ id: string; score: number; reason: string }> = [];
    const inputText = parsed.normalized;
    const featureIds = new Set(features.map(f => f.id));
    
    for (const bundle of BEHAVIOR_BUNDLES) {
      let score = 0;
      const reasons: string[] = [];
      
      // Keyword matching (weighted by bundle weight)
      for (const keyword of bundle.keywords) {
        if (inputText.includes(keyword)) {
          score += 0.15 * (bundle.weight / 10);
          reasons.push(`Keyword: "${keyword}"`);
        }
      }
      
      // Industry matching
      if (bundle.industries.includes(industry.id)) {
        score += 0.2;
        reasons.push(`Industry: ${industry.name}`);
      }
      
      // Profession matching (high weight)
      if (industry.profession && bundle.id === industry.profession.id) {
        score += 0.4;
        reasons.push(`Profession match`);
      }
      
      // Feature overlap
      let featureOverlap = 0;
      for (const feature of bundle.features) {
        if (featureIds.has(feature)) {
          featureOverlap++;
        }
      }
      if (bundle.features.length > 0) {
        const featureScore = (featureOverlap / bundle.features.length) * 0.3;
        score += featureScore;
        if (featureOverlap > 0) {
          reasons.push(`${featureOverlap} feature match`);
        }
      }
      
      // Noun matching
      for (const noun of parsed.nouns) {
        if (bundle.keywords.some(k => k.includes(noun) || noun.includes(k.split(' ')[0]))) {
          score += 0.1;
          reasons.push(`Noun: "${noun}"`);
          break;
        }
      }
      
      // Bundle weight factor
      score *= (1 + (bundle.weight - 5) * 0.05);
      
      results.push({
        id: bundle.id,
        score: Math.min(score, 1),
        reason: reasons.slice(0, 2).join('; ') || 'General match',
      });
    }
    
    return results;
  }

  /**
   * Get behavior bundle by ID
   */
  getBundle(id: string): BehaviorBundle | undefined {
    return BEHAVIOR_BUNDLES.find(b => b.id === id);
  }

  /**
   * Get all bundles for an industry
   */
  getBundlesForIndustry(industryId: string): BehaviorBundle[] {
    return BEHAVIOR_BUNDLES.filter(b => b.industries.includes(industryId));
  }

  /**
   * Get all available bundles
   */
  getAllBundles(): BehaviorBundle[] {
    return BEHAVIOR_BUNDLES;
  }
}
