/**
 * Feature Detector
 * 
 * Detects features and capabilities from natural language input.
 * Understands what functionality the user needs based on their description.
 */

import type {
  ParsedInput,
  IndustryMapping,
  DetectedFeature,
  FeatureId,
  SemanticIntent,
} from './types.js';

// ============================================================
// FEATURE DEFINITIONS
// ============================================================

interface FeatureDefinition {
  id: FeatureId;
  name: string;
  keywords: string[];
  intents: SemanticIntent[];
  dependencies?: FeatureId[];
  conflicts?: FeatureId[];
  industries?: string[];
  defaultPriority: 'essential' | 'important' | 'nice_to_have';
  description: string;
}

const FEATURES: FeatureDefinition[] = [
  // DATA MANAGEMENT
  {
    id: 'crud',
    name: 'Data Management',
    keywords: ['add', 'create', 'edit', 'update', 'delete', 'remove', 'manage', 'record', 'entry'],
    intents: ['managing', 'organizing'],
    defaultPriority: 'essential',
    description: 'Create, read, update, and delete records',
  },
  {
    id: 'search',
    name: 'Search',
    keywords: ['search', 'find', 'lookup', 'query', 'filter by'],
    intents: ['organizing'],
    defaultPriority: 'important',
    description: 'Search and find records quickly',
  },
  {
    id: 'filtering',
    name: 'Filtering',
    keywords: ['filter', 'narrow', 'show only', 'by status', 'by date', 'by type'],
    intents: ['organizing'],
    defaultPriority: 'important',
    description: 'Filter data by various criteria',
  },
  {
    id: 'sorting',
    name: 'Sorting',
    keywords: ['sort', 'order', 'arrange', 'newest', 'oldest', 'alphabetical'],
    intents: ['organizing'],
    defaultPriority: 'nice_to_have',
    description: 'Sort data in different orders',
  },
  {
    id: 'bulk_actions',
    name: 'Bulk Actions',
    keywords: ['bulk', 'batch', 'multiple', 'all at once', 'mass update'],
    intents: ['managing'],
    defaultPriority: 'nice_to_have',
    description: 'Perform actions on multiple records at once',
  },

  // SCHEDULING
  {
    id: 'calendar',
    name: 'Calendar View',
    keywords: ['calendar', 'schedule view', 'month view', 'week view', 'day view'],
    intents: ['scheduling'],
    defaultPriority: 'important',
    description: 'Visual calendar display of events',
  },
  {
    id: 'appointments',
    name: 'Appointment Booking',
    keywords: ['appointment', 'booking', 'schedule', 'reserve', 'slot', 'availability'],
    intents: ['scheduling'],
    industries: ['healthcare', 'services', 'fitness', 'professional'],
    defaultPriority: 'essential',
    description: 'Book and manage appointments',
  },
  {
    id: 'reminders',
    name: 'Reminders',
    keywords: ['reminder', 'remind', 'alert', 'notification', 'before', 'upcoming'],
    intents: ['scheduling', 'communicating'],
    defaultPriority: 'important',
    description: 'Automated reminders for upcoming events',
  },
  {
    id: 'recurring_events',
    name: 'Recurring Events',
    keywords: ['recurring', 'repeat', 'weekly', 'monthly', 'daily', 'every'],
    intents: ['scheduling'],
    dependencies: ['calendar'],
    defaultPriority: 'nice_to_have',
    description: 'Support for repeating events',
  },

  // COMMUNICATION
  {
    id: 'messaging',
    name: 'In-App Messaging',
    keywords: ['message', 'chat', 'communicate', 'send', 'inbox', 'conversation'],
    intents: ['communicating'],
    defaultPriority: 'important',
    description: 'Send and receive messages within the app',
  },
  {
    id: 'notifications',
    name: 'Push Notifications',
    keywords: ['notify', 'notification', 'push', 'alert', 'update'],
    intents: ['communicating'],
    defaultPriority: 'important',
    description: 'Send push notifications to users',
  },
  {
    id: 'sms',
    name: 'SMS Integration',
    keywords: ['sms', 'text message', 'text', 'mobile'],
    intents: ['communicating'],
    defaultPriority: 'nice_to_have',
    description: 'Send SMS text messages',
  },
  {
    id: 'email',
    name: 'Email Integration',
    keywords: ['email', 'mail', 'send email', 'email notification'],
    intents: ['communicating'],
    defaultPriority: 'important',
    description: 'Send and track emails',
  },

  // BILLING & PAYMENTS
  {
    id: 'invoicing',
    name: 'Invoicing',
    keywords: ['invoice', 'bill', 'billing', 'charge', 'payment request'],
    intents: ['billing'],
    industries: ['trades', 'professional', 'creative', 'services'],
    defaultPriority: 'essential',
    description: 'Create and send invoices',
  },
  {
    id: 'payments',
    name: 'Payment Processing',
    keywords: ['payment', 'pay', 'collect', 'stripe', 'credit card', 'accept payment'],
    intents: ['billing'],
    dependencies: ['invoicing'],
    defaultPriority: 'important',
    description: 'Accept online payments',
  },
  {
    id: 'quotes',
    name: 'Quotes & Estimates',
    keywords: ['quote', 'estimate', 'proposal', 'bid', 'pricing'],
    intents: ['billing'],
    industries: ['trades', 'construction', 'creative', 'professional'],
    defaultPriority: 'important',
    description: 'Create quotes and estimates for clients',
  },
  {
    id: 'subscriptions',
    name: 'Subscription Billing',
    keywords: ['subscription', 'recurring billing', 'monthly payment', 'membership fee'],
    intents: ['billing'],
    dependencies: ['payments'],
    defaultPriority: 'nice_to_have',
    description: 'Manage recurring subscription payments',
  },

  // DOCUMENTS
  {
    id: 'documents',
    name: 'Document Management',
    keywords: ['document', 'file', 'attachment', 'contract', 'agreement', 'pdf'],
    intents: ['organizing'],
    defaultPriority: 'important',
    description: 'Store and organize documents',
  },
  {
    id: 'file_upload',
    name: 'File Uploads',
    keywords: ['upload', 'attach', 'file', 'image', 'photo', 'picture'],
    intents: ['organizing'],
    defaultPriority: 'important',
    description: 'Upload and attach files to records',
  },
  {
    id: 'signatures',
    name: 'E-Signatures',
    keywords: ['signature', 'sign', 'e-sign', 'docusign', 'contract signing'],
    intents: [],
    dependencies: ['documents'],
    industries: ['professional', 'real_estate', 'trades'],
    defaultPriority: 'nice_to_have',
    description: 'Collect electronic signatures',
  },
  {
    id: 'templates',
    name: 'Document Templates',
    keywords: ['template', 'form', 'standard', 'reusable', 'preset'],
    intents: [],
    dependencies: ['documents'],
    defaultPriority: 'nice_to_have',
    description: 'Create reusable document templates',
  },

  // TEAM & COLLABORATION
  {
    id: 'user_management',
    name: 'Multi-User Support',
    keywords: ['user', 'team', 'member', 'account', 'login', 'access'],
    intents: ['collaborating'],
    defaultPriority: 'important',
    description: 'Support multiple users with accounts',
  },
  {
    id: 'roles',
    name: 'Roles & Permissions',
    keywords: ['role', 'permission', 'access control', 'admin', 'restricted'],
    intents: ['collaborating'],
    dependencies: ['user_management'],
    defaultPriority: 'important',
    description: 'Control access with roles and permissions',
  },
  {
    id: 'assignments',
    name: 'Task Assignments',
    keywords: ['assign', 'delegate', 'responsible', 'owner', 'assigned to'],
    intents: ['collaborating', 'managing'],
    dependencies: ['user_management'],
    defaultPriority: 'important',
    description: 'Assign tasks to team members',
  },
  {
    id: 'comments',
    name: 'Comments & Notes',
    keywords: ['comment', 'note', 'annotation', 'feedback', 'discussion'],
    intents: ['collaborating', 'communicating'],
    defaultPriority: 'nice_to_have',
    description: 'Add comments and notes to records',
  },

  // REPORTING
  {
    id: 'dashboard',
    name: 'Dashboard',
    keywords: ['dashboard', 'overview', 'summary', 'at a glance', 'home page'],
    intents: ['reporting', 'monitoring'],
    defaultPriority: 'important',
    description: 'Visual dashboard with key metrics',
  },
  {
    id: 'reports',
    name: 'Reports',
    keywords: ['report', 'analysis', 'breakdown', 'summary report'],
    intents: ['reporting'],
    defaultPriority: 'important',
    description: 'Generate detailed reports',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    keywords: ['analytics', 'statistics', 'metrics', 'kpi', 'performance'],
    intents: ['reporting', 'monitoring'],
    defaultPriority: 'nice_to_have',
    description: 'Track and analyze key metrics',
  },
  {
    id: 'exports',
    name: 'Data Export',
    keywords: ['export', 'download', 'csv', 'excel', 'pdf export'],
    intents: ['reporting'],
    defaultPriority: 'nice_to_have',
    description: 'Export data to various formats',
  },

  // WORKFLOW
  {
    id: 'workflow',
    name: 'Workflow Automation',
    keywords: ['workflow', 'automation', 'automate', 'automatic', 'trigger', 'when then'],
    intents: ['automating'],
    defaultPriority: 'important',
    description: 'Automate repetitive tasks',
  },
  {
    id: 'approvals',
    name: 'Approval Workflows',
    keywords: ['approval', 'approve', 'review', 'sign off', 'authorization'],
    intents: ['automating'],
    dependencies: ['workflow', 'user_management'],
    defaultPriority: 'nice_to_have',
    description: 'Multi-step approval processes',
  },
  {
    id: 'status_tracking',
    name: 'Status Tracking',
    keywords: ['status', 'progress', 'stage', 'phase', 'step', 'pipeline'],
    intents: ['tracking', 'monitoring'],
    defaultPriority: 'important',
    description: 'Track progress through stages',
  },
  {
    id: 'pipelines',
    name: 'Pipeline / Kanban View',
    keywords: ['pipeline', 'kanban', 'board', 'columns', 'drag and drop', 'stages'],
    intents: ['tracking', 'organizing'],
    dependencies: ['status_tracking'],
    defaultPriority: 'important',
    description: 'Visual pipeline/kanban board',
  },

  // INDUSTRY-SPECIFIC
  {
    id: 'inventory',
    name: 'Inventory Management',
    keywords: ['inventory', 'stock', 'material', 'supply', 'parts', 'warehouse'],
    intents: ['tracking', 'managing'],
    industries: ['trades', 'retail', 'hospitality'],
    defaultPriority: 'important',
    description: 'Track inventory and stock levels',
  },
  {
    id: 'job_tracking',
    name: 'Job/Project Tracking',
    keywords: ['job', 'project', 'work order', 'service call', 'ticket'],
    intents: ['tracking', 'managing'],
    industries: ['trades', 'services', 'creative'],
    defaultPriority: 'essential',
    description: 'Track jobs and projects from start to finish',
  },
  {
    id: 'client_portal',
    name: 'Client Portal',
    keywords: ['client portal', 'customer portal', 'self-service', 'client access'],
    intents: ['collaborating'],
    defaultPriority: 'nice_to_have',
    description: 'Client-facing portal for self-service',
  },
  {
    id: 'booking_widget',
    name: 'Public Booking Widget',
    keywords: ['booking widget', 'online booking', 'public scheduling', 'book online'],
    intents: ['scheduling'],
    dependencies: ['appointments'],
    defaultPriority: 'nice_to_have',
    description: 'Public widget for online bookings',
  },
];

// ============================================================
// FEATURE DETECTOR
// ============================================================

export class FeatureDetector {
  /**
   * Detect features from parsed input
   */
  async detect(
    parsed: ParsedInput,
    industry: IndustryMapping
  ): Promise<DetectedFeature[]> {
    const detected: DetectedFeature[] = [];
    const inputText = parsed.normalized;
    
    // Score all features
    const scores = this.scoreFeatures(parsed, industry);
    
    // Filter and prioritize
    const sortedScores = scores
      .filter(s => s.score > 0.1)
      .sort((a, b) => b.score - a.score);
    
    // Convert to detected features
    for (const { featureId, score, reason } of sortedScores) {
      const feature = FEATURES.find(f => f.id === featureId)!;
      
      // Check dependencies are met
      const dependenciesMet = !feature.dependencies || 
        feature.dependencies.every(dep => 
          sortedScores.some(s => s.featureId === dep && s.score > 0.2)
        );
      
      if (!dependenciesMet) continue;
      
      // Determine priority
      let priority: DetectedFeature['priority'] = feature.defaultPriority;
      if (score > 0.8) priority = 'essential';
      else if (score > 0.5) priority = 'important';
      else priority = 'nice_to_have';
      
      detected.push({
        id: featureId,
        name: feature.name,
        confidence: Math.min(score, 1),
        priority,
        reasoning: reason,
        dependencies: feature.dependencies,
        suggestedImplementation: this.getSuggestedImplementation(featureId),
      });
    }
    
    // Add essential features that weren't explicitly mentioned
    const essentialFeatures = this.getEssentialFeatures(industry);
    for (const essential of essentialFeatures) {
      if (!detected.find(d => d.id === essential.id)) {
        detected.push({
          id: essential.id,
          name: essential.name,
          confidence: 0.6,
          priority: 'essential',
          reasoning: `Standard feature for ${industry.name}`,
          dependencies: essential.dependencies,
        });
      }
    }
    
    return detected;
  }

  /**
   * Score all features against the input
   */
  private scoreFeatures(
    parsed: ParsedInput,
    industry: IndustryMapping
  ): Array<{ featureId: FeatureId; score: number; reason: string }> {
    const results: Array<{ featureId: FeatureId; score: number; reason: string }> = [];
    const inputText = parsed.normalized;
    
    for (const feature of FEATURES) {
      let score = 0;
      const reasons: string[] = [];
      
      // Keyword matching
      for (const keyword of feature.keywords) {
        if (inputText.includes(keyword)) {
          score += 0.25;
          reasons.push(`Matched keyword: "${keyword}"`);
        }
      }
      
      // Intent matching
      for (const intent of feature.intents) {
        if (parsed.intents.includes(intent)) {
          score += 0.2;
          reasons.push(`Matched intent: ${intent}`);
        }
      }
      
      // Industry matching
      if (feature.industries && feature.industries.includes(industry.id)) {
        score += 0.15;
        reasons.push(`Relevant to ${industry.name}`);
      }
      
      // Noun matching
      for (const noun of parsed.nouns) {
        if (feature.keywords.some(k => k.includes(noun) || noun.includes(k.split(' ')[0]))) {
          score += 0.15;
          reasons.push(`Noun "${noun}" suggests this feature`);
          break;
        }
      }
      
      // Action verb matching
      for (const action of parsed.actions) {
        if (feature.keywords.some(k => k.includes(action))) {
          score += 0.1;
          reasons.push(`Action "${action}" relates to this feature`);
          break;
        }
      }
      
      // Phrase matching
      for (const phrase of parsed.phrases) {
        const phraseWords = phrase.toLowerCase().split(' ');
        for (const keyword of feature.keywords) {
          if (keyword.split(' ').some(kw => phraseWords.includes(kw))) {
            score += 0.15;
            reasons.push(`Phrase "${phrase}" suggests this feature`);
            break;
          }
        }
      }
      
      if (score > 0) {
        results.push({
          featureId: feature.id,
          score,
          reason: reasons.slice(0, 2).join('; '),
        });
      }
    }
    
    return results;
  }

  /**
   * Get essential features for an industry
   */
  private getEssentialFeatures(industry: IndustryMapping): FeatureDefinition[] {
    return FEATURES.filter(f => {
      // Always include CRUD
      if (f.id === 'crud') return true;
      
      // Include if marked essential and relevant to industry
      if (f.defaultPriority === 'essential') {
        if (!f.industries || f.industries.includes(industry.id)) {
          return true;
        }
      }
      
      return false;
    });
  }

  /**
   * Get suggested implementation notes
   */
  private getSuggestedImplementation(featureId: FeatureId): string {
    const implementations: Partial<Record<FeatureId, string>> = {
      'crud': 'Standard list, form, and detail views with create/edit/delete actions',
      'search': 'Full-text search with filter chips and autocomplete',
      'calendar': 'Monthly calendar view with event details on click',
      'appointments': 'Time slot picker with availability checking',
      'invoicing': 'Invoice builder with line items, tax calculation, and PDF export',
      'payments': 'Stripe integration for card payments',
      'dashboard': 'Summary cards with key metrics and recent activity',
      'pipelines': 'Drag-and-drop kanban board with status columns',
      'job_tracking': 'Job card with timeline, status updates, and attachments',
      'inventory': 'Stock levels with low inventory alerts',
    };
    
    return implementations[featureId] || '';
  }

  /**
   * Get feature by ID
   */
  getFeature(id: FeatureId): FeatureDefinition | undefined {
    return FEATURES.find(f => f.id === id);
  }

  /**
   * Get all available features
   */
  getAllFeatures(): FeatureDefinition[] {
    return FEATURES;
  }

  /**
   * Get features that depend on a given feature
   */
  getDependentFeatures(featureId: FeatureId): FeatureDefinition[] {
    return FEATURES.filter(f => 
      f.dependencies && f.dependencies.includes(featureId)
    );
  }
}
