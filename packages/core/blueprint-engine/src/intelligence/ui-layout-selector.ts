/**
 * UI Layout Selector
 * 
 * Selects appropriate UI layouts based on natural language.
 * Understands how the user wants their app to look and feel.
 */

import type {
  ParsedInput,
  IndustryMapping,
  DetectedFeature,
  SelectedLayout,
  LayoutType,
  ThemePreference,
  NavigationStyle,
  FeatureId,
} from './types.js';

// ============================================================
// LAYOUT DEFINITIONS
// ============================================================

interface LayoutDefinition {
  type: LayoutType;
  name: string;
  keywords: string[];
  bestFor: string[];
  industries: string[];
  features: FeatureId[];
  description: string;
}

const LAYOUTS: LayoutDefinition[] = [
  {
    type: 'list',
    name: 'List View',
    keywords: ['list', 'simple', 'basic', 'table', 'rows'],
    bestFor: ['browsing', 'many items', 'quick scanning'],
    industries: ['personal', 'home', 'services'],
    features: ['crud', 'search', 'filtering'],
    description: 'Simple list layout for browsing items',
  },
  {
    type: 'table',
    name: 'Data Table',
    keywords: ['table', 'spreadsheet', 'grid', 'columns', 'data heavy'],
    bestFor: ['data analysis', 'many fields', 'sorting', 'comparing'],
    industries: ['professional', 'retail', 'technology'],
    features: ['filtering', 'sorting', 'exports', 'bulk_actions'],
    description: 'Spreadsheet-like table for data-heavy apps',
  },
  {
    type: 'cards',
    name: 'Card Grid',
    keywords: ['cards', 'tiles', 'visual', 'gallery', 'grid'],
    bestFor: ['visual content', 'images', 'products'],
    industries: ['creative', 'retail', 'real_estate'],
    features: ['file_upload'],
    description: 'Visual card layout for rich content',
  },
  {
    type: 'kanban',
    name: 'Kanban Board',
    keywords: ['kanban', 'board', 'columns', 'drag', 'stages', 'pipeline', 'workflow'],
    bestFor: ['status tracking', 'workflows', 'projects'],
    industries: ['trades', 'creative', 'professional', 'technology'],
    features: ['status_tracking', 'pipelines', 'workflow'],
    description: 'Drag-and-drop board for tracking progress',
  },
  {
    type: 'calendar',
    name: 'Calendar View',
    keywords: ['calendar', 'schedule', 'month', 'week', 'day', 'agenda'],
    bestFor: ['time-based', 'scheduling', 'events'],
    industries: ['healthcare', 'fitness', 'hospitality', 'services'],
    features: ['calendar', 'appointments', 'scheduling'],
    description: 'Calendar display for date-based data',
  },
  {
    type: 'timeline',
    name: 'Timeline View',
    keywords: ['timeline', 'history', 'chronological', 'activity'],
    bestFor: ['activity tracking', 'history', 'progress'],
    industries: ['professional', 'healthcare'],
    features: ['status_tracking'],
    description: 'Chronological timeline of events',
  },
  {
    type: 'dashboard',
    name: 'Dashboard',
    keywords: ['dashboard', 'overview', 'summary', 'metrics', 'kpis', 'at a glance'],
    bestFor: ['monitoring', 'reporting', 'overview'],
    industries: ['trades', 'professional', 'retail'],
    features: ['dashboard', 'reports', 'analytics'],
    description: 'Summary dashboard with key metrics',
  },
  {
    type: 'form',
    name: 'Form-Centric',
    keywords: ['form', 'wizard', 'step by step', 'onboarding'],
    bestFor: ['data entry', 'registration', 'complex input'],
    industries: ['healthcare', 'professional'],
    features: ['crud'],
    description: 'Focus on data entry forms',
  },
  {
    type: 'split',
    name: 'Split View',
    keywords: ['split', 'side by side', 'dual', 'comparison'],
    bestFor: ['comparison', 'reference', 'detail'],
    industries: ['professional', 'retail'],
    features: ['search'],
    description: 'Side-by-side split layout',
  },
  {
    type: 'master_detail',
    name: 'Master-Detail',
    keywords: ['master detail', 'list detail', 'inbox style', 'email style'],
    bestFor: ['messaging', 'email', 'records with details'],
    industries: ['professional', 'services'],
    features: ['messaging', 'documents'],
    description: 'List on left, detail on right',
  },
  {
    type: 'wizard',
    name: 'Step Wizard',
    keywords: ['wizard', 'steps', 'guided', 'multi-step', 'workflow'],
    bestFor: ['complex processes', 'onboarding', 'guided flows'],
    industries: ['healthcare', 'professional'],
    features: ['approvals', 'workflow'],
    description: 'Multi-step guided process',
  },
];

// Theme style keywords
const STYLE_KEYWORDS: Record<ThemePreference['style'], string[]> = {
  modern: ['modern', 'contemporary', 'fresh', 'new', 'trendy', 'sleek'],
  minimal: ['minimal', 'minimalist', 'simple', 'clean', 'bare', 'basic'],
  bold: ['bold', 'colorful', 'vibrant', 'bright', 'eye catching', 'striking'],
  professional: ['professional', 'corporate', 'business', 'formal', 'enterprise'],
  playful: ['playful', 'fun', 'casual', 'friendly', 'cheerful', 'light'],
};

// Color suggestions by industry
const INDUSTRY_COLORS: Record<string, { primary: string; accent: string }> = {
  trades: { primary: '#f59e0b', accent: '#d97706' },      // Orange/amber
  healthcare: { primary: '#10b981', accent: '#059669' },   // Green/teal
  hospitality: { primary: '#ef4444', accent: '#dc2626' },  // Red
  professional: { primary: '#3b82f6', accent: '#2563eb' }, // Blue
  creative: { primary: '#8b5cf6', accent: '#7c3aed' },     // Purple
  fitness: { primary: '#ec4899', accent: '#db2777' },      // Pink
  retail: { primary: '#14b8a6', accent: '#0d9488' },       // Teal
  real_estate: { primary: '#6366f1', accent: '#4f46e5' },  // Indigo
  education: { primary: '#0ea5e9', accent: '#0284c7' },    // Sky blue
  personal: { primary: '#8b5cf6', accent: '#7c3aed' },     // Purple
  home: { primary: '#22c55e', accent: '#16a34a' },         // Green
  services: { primary: '#3b82f6', accent: '#2563eb' },     // Blue
};

// ============================================================
// UI LAYOUT SELECTOR
// ============================================================

export class UILayoutSelector {
  /**
   * Select appropriate layouts based on parsed input
   */
  async select(
    parsed: ParsedInput,
    industry: IndustryMapping,
    features: DetectedFeature[]
  ): Promise<SelectedLayout> {
    // Score all layouts
    const layoutScores = this.scoreLayouts(parsed, industry, features);
    const sorted = layoutScores.sort((a, b) => b.score - a.score);
    
    // Primary layout
    const primary = sorted[0];
    
    // Secondary layouts (top 2-3 alternatives)
    const secondary = sorted
      .slice(1, 4)
      .filter(s => s.score > 0.3)
      .map(s => s.type);
    
    // Determine density
    const density = this.selectDensity(parsed, industry);
    
    // Determine theme
    const theme = this.selectTheme(parsed, industry);
    
    // Determine navigation style
    const navigation = this.selectNavigation(parsed, features);
    
    return {
      primaryLayout: primary.type,
      secondaryLayouts: secondary,
      density,
      theme,
      navigation,
      confidence: primary.score,
      reasoning: primary.reason,
    };
  }

  /**
   * Score all layouts
   */
  private scoreLayouts(
    parsed: ParsedInput,
    industry: IndustryMapping,
    features: DetectedFeature[]
  ): Array<{ type: LayoutType; score: number; reason: string }> {
    const results: Array<{ type: LayoutType; score: number; reason: string }> = [];
    const inputText = parsed.normalized;
    const featureIds = new Set(features.map(f => f.id));
    
    for (const layout of LAYOUTS) {
      let score = 0;
      const reasons: string[] = [];
      
      // Keyword matching
      for (const keyword of layout.keywords) {
        if (inputText.includes(keyword)) {
          score += 0.25;
          reasons.push(`Matched "${keyword}"`);
        }
      }
      
      // Industry matching
      if (layout.industries.includes(industry.id)) {
        score += 0.15;
        reasons.push(`Good for ${industry.name}`);
      }
      
      // Feature matching
      for (const feature of layout.features) {
        if (featureIds.has(feature)) {
          score += 0.2;
          reasons.push(`Supports ${feature}`);
        }
      }
      
      // Semantic intent matching
      if (parsed.intents.includes('scheduling') && layout.type === 'calendar') {
        score += 0.3;
        reasons.push('Scheduling intent');
      }
      if (parsed.intents.includes('tracking') && layout.type === 'kanban') {
        score += 0.25;
        reasons.push('Tracking intent');
      }
      if (parsed.intents.includes('reporting') && layout.type === 'dashboard') {
        score += 0.3;
        reasons.push('Reporting intent');
      }
      
      // Style adjective matching
      for (const adj of parsed.adjectives) {
        if (layout.keywords.includes(adj.toLowerCase())) {
          score += 0.15;
          reasons.push(`Style: "${adj}"`);
        }
      }
      
      results.push({
        type: layout.type,
        score: Math.min(score, 1),
        reason: reasons.slice(0, 2).join('; ') || 'Default layout',
      });
    }
    
    // Ensure at least list has a base score
    const listResult = results.find(r => r.type === 'list');
    if (listResult && listResult.score === 0) {
      listResult.score = 0.3;
      listResult.reason = 'Default layout';
    }
    
    return results;
  }

  /**
   * Select density based on input and industry
   */
  private selectDensity(
    parsed: ParsedInput,
    industry: IndustryMapping
  ): SelectedLayout['density'] {
    const text = parsed.normalized;
    
    // Check for explicit mentions
    if (/compact|dense|small|tight/i.test(text)) return 'compact';
    if (/spacious|roomy|airy|large|big/i.test(text)) return 'spacious';
    if (/comfortable|normal|regular/i.test(text)) return 'comfortable';
    
    // Industry-based defaults
    const compactIndustries = ['professional', 'technology', 'retail'];
    if (compactIndustries.includes(industry.id)) return 'compact';
    
    const spaciousIndustries = ['creative', 'personal', 'home'];
    if (spaciousIndustries.includes(industry.id)) return 'spacious';
    
    return 'comfortable';
  }

  /**
   * Select theme based on input and industry
   */
  private selectTheme(
    parsed: ParsedInput,
    industry: IndustryMapping
  ): ThemePreference {
    const text = parsed.normalized;
    
    // Detect mode
    let mode: ThemePreference['mode'] = 'light';
    if (/dark\s*(mode|theme)?/i.test(text)) mode = 'dark';
    if (/light\s*(mode|theme)?/i.test(text)) mode = 'light';
    
    // Detect style
    let style: ThemePreference['style'] = 'modern';
    for (const [styleName, keywords] of Object.entries(STYLE_KEYWORDS)) {
      if (keywords.some(kw => text.includes(kw))) {
        style = styleName as ThemePreference['style'];
        break;
      }
    }
    
    // Also check adjectives
    for (const adj of parsed.adjectives) {
      for (const [styleName, keywords] of Object.entries(STYLE_KEYWORDS)) {
        if (keywords.includes(adj.toLowerCase())) {
          style = styleName as ThemePreference['style'];
          break;
        }
      }
    }
    
    // Get colors from industry
    const colors = INDUSTRY_COLORS[industry.id] || INDUSTRY_COLORS.services;
    
    return {
      mode,
      style,
      primaryColor: colors.primary,
      accentColor: colors.accent,
    };
  }

  /**
   * Select navigation style
   */
  private selectNavigation(
    parsed: ParsedInput,
    features: DetectedFeature[]
  ): NavigationStyle {
    const text = parsed.normalized;
    
    // Check for explicit mentions
    if (/sidebar|side\s*menu/i.test(text)) {
      return { type: 'sidebar', position: 'left', collapsible: true };
    }
    if (/top\s*(bar|menu|nav)|header/i.test(text)) {
      return { type: 'topbar', position: 'top', collapsible: false };
    }
    if (/bottom\s*(tabs?|nav|menu)|tab\s*bar/i.test(text)) {
      return { type: 'bottom_tabs', position: 'bottom', collapsible: false };
    }
    if (/hamburger|mobile\s*menu/i.test(text)) {
      return { type: 'hamburger', position: 'left', collapsible: true };
    }
    
    // Default based on feature count
    const pageCount = features.filter(f => 
      ['dashboard', 'calendar', 'reports', 'pipelines'].includes(f.id)
    ).length;
    
    if (pageCount > 3) {
      // Many features = sidebar
      return { type: 'sidebar', position: 'left', collapsible: true };
    }
    
    // Default to sidebar for most apps
    return { type: 'sidebar', position: 'left', collapsible: true };
  }

  /**
   * Get layout definition by type
   */
  getLayout(type: LayoutType): LayoutDefinition | undefined {
    return LAYOUTS.find(l => l.type === type);
  }

  /**
   * Get all available layouts
   */
  getAllLayouts(): LayoutDefinition[] {
    return LAYOUTS;
  }
}
