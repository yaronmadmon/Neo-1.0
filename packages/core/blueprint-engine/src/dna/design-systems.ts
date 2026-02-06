/**
 * Neo Design Systems - Research-Based Design Knowledge Layer
 * 
 * This file defines the COMPLETE set of design systems available in Neo.
 * Each system is based on color psychology, UX research, and industry best practices.
 * 
 * RULES:
 * 1. Neo must NEVER invent colors - only SELECT from these systems
 * 2. Neo must NEVER mix systems - each app gets ONE system
 * 3. Selection is deterministic based on industry + intent
 * 4. Systems are designed to be COHESIVE and RESTRAINED
 * 
 * Research Sources:
 * - Color psychology: Labrecque & Milne (2012) "Exciting red and competent blue"
 * - Trust & credibility: Stanford Web Credibility Research
 * - Healthcare UX: Nielsen Norman Group healthcare guidelines
 * - Enterprise design: IBM Design Language, Salesforce Lightning
 * - Consumer apps: Material Design, Apple HIG
 */

import type { UnifiedTheme } from './schema.js';
import { getSurfaceIntentForDesignSystem, type SurfaceIntent } from './surface-theme.js';

// ============================================================
// DESIGN SYSTEM TYPES
// ============================================================

export interface DesignSystemPalette {
  /** Main brand color - used for primary actions, headers, key UI elements */
  primary: string;
  /** Supporting color - used for secondary actions, accents */
  secondary: string;
  /** Highlight color - used sparingly for emphasis, CTAs, alerts */
  accent: string;
  /** Success state - confirmations, completed items */
  success: string;
  /** Warning state - cautions, pending items */
  warning: string;
  /** Error state - errors, destructive actions */
  error: string;
  /** Informational state - tips, neutral notifications */
  info: string;
  /** Page background */
  background: string;
  /** Card/container background */
  surface: string;
  /** Main text color */
  text: string;
  /** Secondary/muted text color */
  textMuted: string;
  /** Border/divider color */
  border: string;
}

export interface DesignSystemTypography {
  /** Body text font family */
  fontFamily: string;
  /** Heading font family */
  headingFamily: string;
  /** Monospace font family */
  monoFamily: string;
  /** Base font size scale */
  fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  /** Line height */
  lineHeight: 'tight' | 'normal' | 'relaxed';
}

export interface DesignSystemSpacing {
  /** Overall density */
  scale: 'compact' | 'normal' | 'relaxed';
  /** Corner rounding */
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Card internal padding */
  cardPadding: 'sm' | 'md' | 'lg';
}

export interface DesignSystemShadows {
  /** Whether shadows are used */
  enabled: boolean;
  /** Shadow depth */
  intensity: 'subtle' | 'medium' | 'strong';
}

export interface DesignSystemAnimations {
  /** Whether animations are used */
  enabled: boolean;
  /** Animation speed */
  duration: 'fast' | 'normal' | 'slow';
  /** Animation curve */
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';
}

export interface DesignSystem {
  /** Unique identifier */
  id: DesignSystemId;
  /** Display name */
  name: string;
  /** Psychological intent - what the user should FEEL */
  intent: string;
  /** Detailed description of the design philosophy */
  philosophy: string;
  /** Industries this system is best suited for */
  suitableFor: string[];
  /** Industries this system should NOT be used for */
  notSuitableFor: string[];
  /** Light mode color palette */
  colors: {
    light: DesignSystemPalette;
    dark: DesignSystemPalette;
  };
  /** Typography settings */
  typography: DesignSystemTypography;
  /** Spacing and layout settings */
  spacing: DesignSystemSpacing;
  /** Shadow settings */
  shadows: DesignSystemShadows;
  /** Animation settings */
  animations: DesignSystemAnimations;
  /** Component-level preferences */
  componentPreferences: {
    /** Button style: 'solid' | 'outline' | 'ghost' | 'soft' */
    buttonStyle: 'solid' | 'outline' | 'ghost' | 'soft';
    /** Card style: 'elevated' | 'outlined' | 'filled' */
    cardStyle: 'elevated' | 'outlined' | 'filled';
    /** Input style: 'outlined' | 'filled' | 'underlined' */
    inputStyle: 'outlined' | 'filled' | 'underlined';
    /** Table style: 'striped' | 'bordered' | 'minimal' */
    tableStyle: 'striped' | 'bordered' | 'minimal';
  };
}

// ============================================================
// DESIGN SYSTEM IDS (CANONICAL LIST)
// ============================================================

export type DesignSystemId =
  | 'trust-stability'      // Finance, Real Estate, Legal, Insurance
  | 'calm-care'            // Healthcare, Medical, Wellness, Therapy
  | 'operational-strength' // Construction, Manufacturing, Logistics, Field Services
  | 'warm-craft'           // Hospitality, Bakery, Café, Artisan businesses
  | 'modern-saas'          // Technology, SaaS, Startups, Digital services
  | 'luxury-refinement'    // High-end retail, Salons, Premium services
  | 'friendly-approachable'// Education, Tutoring, Community services
  | 'data-precision'       // Analytics, Scientific, Research, Engineering
  | 'creative-expressive'  // Design, Photography, Creative agencies
  | 'energetic-dynamic';   // Fitness, Sports, Youth-oriented services

// ============================================================
// CORE DESIGN SYSTEMS
// ============================================================

/**
 * TRUST & STABILITY
 * 
 * Psychology: Blue conveys trust, stability, and competence.
 * Research shows blue is the most universally preferred color and
 * is associated with reliability and professionalism.
 * 
 * Best for: Financial services, real estate, legal, insurance
 */
const TRUST_STABILITY: DesignSystem = {
  id: 'trust-stability',
  name: 'Trust & Stability',
  intent: 'Convey reliability, professionalism, and confidence',
  philosophy: `
    This system uses deep blues and neutral tones to create a sense of 
    institutional trust. The palette is conservative and professional,
    avoiding bright colors that might suggest frivolity. Typography is
    clean and readable, shadows are subtle, and animations are minimal
    to avoid distraction. Perfect for industries where users need to
    feel their assets and information are in safe hands.
  `.trim(),
  suitableFor: [
    'finance', 'banking', 'insurance', 'real-estate', 'property-management',
    'legal', 'accounting', 'consulting', 'government'
  ],
  notSuitableFor: ['fitness', 'entertainment', 'children', 'creative'],
  colors: {
    light: {
      primary: '#1e40af',     // Deep blue - trust, stability
      secondary: '#1d4ed8',   // Slightly brighter blue
      accent: '#0891b2',      // Teal accent - professional but not cold
      success: '#059669',     // Muted green - stable success
      warning: '#d97706',     // Amber - visible but not alarming
      error: '#dc2626',       // Red - clear but professional
      info: '#0284c7',        // Sky blue - informational
      background: '#f8fafc',  // Very light gray - clean, professional
      surface: '#ffffff',     // Pure white cards
      text: '#1e293b',        // Dark slate - high readability
      textMuted: '#64748b',   // Slate gray - subtle secondary text
      border: '#e2e8f0',      // Light slate border
    },
    dark: {
      primary: '#60a5fa',     // Lighter blue for dark mode
      secondary: '#3b82f6',
      accent: '#22d3ee',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#38bdf8',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textMuted: '#94a3b8',
      border: '#334155',
    },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    headingFamily: '"IBM Plex Sans", sans-serif',
    monoFamily: '"IBM Plex Mono", monospace',
    fontSize: 'base',
    lineHeight: 'normal',
  },
  spacing: {
    scale: 'normal',
    borderRadius: 'md',
    cardPadding: 'md',
  },
  shadows: {
    enabled: true,
    intensity: 'subtle',
  },
  animations: {
    enabled: true,
    duration: 'normal',
    easing: 'ease-in-out',
  },
  componentPreferences: {
    buttonStyle: 'solid',
    cardStyle: 'elevated',
    inputStyle: 'outlined',
    tableStyle: 'striped',
  },
};

/**
 * CALM & CARE
 * 
 * Psychology: Teal and soft greens convey healing, calm, and care.
 * Healthcare research shows these colors reduce anxiety and create
 * a sense of safety. Important for environments where users may be
 * stressed or vulnerable.
 * 
 * Best for: Healthcare, medical clinics, therapy, wellness, senior care
 */
const CALM_CARE: DesignSystem = {
  id: 'calm-care',
  name: 'Calm & Care',
  intent: 'Create a soothing, safe, and caring environment',
  philosophy: `
    This system prioritizes user comfort above all else. The teal and
    soft green palette is proven to reduce anxiety and promote feelings
    of safety. Spacing is generous to avoid feeling cramped, text is
    highly readable, and animations are gentle. This system assumes
    users may be stressed, unwell, or vulnerable - every element should
    feel supportive rather than demanding.
  `.trim(),
  suitableFor: [
    'medical', 'healthcare', 'therapy-clinic', 'wellness', 'home-health',
    'veterinary', 'dental', 'pharmacy', 'senior-care', 'mental-health'
  ],
  notSuitableFor: ['nightlife', 'entertainment', 'sports', 'construction'],
  colors: {
    light: {
      primary: '#0d9488',     // Teal - calming, healing
      secondary: '#14b8a6',   // Lighter teal
      accent: '#0891b2',      // Cyan accent - fresh, clean
      success: '#059669',     // Emerald - healthy, positive
      warning: '#d97706',     // Amber - gentle warning
      error: '#dc2626',       // Red - important but not aggressive
      info: '#0284c7',        // Sky blue - informational
      background: '#f0fdfa',  // Very light teal tint - calming
      surface: '#ffffff',
      text: '#134e4a',        // Dark teal - soft but readable
      textMuted: '#5f9ea0',   // Muted teal
      border: '#99f6e4',      // Light teal border
    },
    dark: {
      primary: '#2dd4bf',
      secondary: '#5eead4',
      accent: '#22d3ee',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#38bdf8',
      background: '#042f2e',
      surface: '#134e4a',
      text: '#f0fdfa',
      textMuted: '#5eead4',
      border: '#115e59',
    },
  },
  typography: {
    fontFamily: '"Source Sans Pro", -apple-system, sans-serif',
    headingFamily: '"Source Sans Pro", sans-serif',
    monoFamily: '"Source Code Pro", monospace',
    fontSize: 'base',
    lineHeight: 'relaxed',  // More generous for readability
  },
  spacing: {
    scale: 'relaxed',       // Spacious, non-cramped feel
    borderRadius: 'lg',     // Soft, rounded corners
    cardPadding: 'lg',
  },
  shadows: {
    enabled: true,
    intensity: 'subtle',    // Gentle shadows
  },
  animations: {
    enabled: true,
    duration: 'slow',       // Gentle, non-jarring animations
    easing: 'ease',
  },
  componentPreferences: {
    buttonStyle: 'soft',    // Soft, non-aggressive buttons
    cardStyle: 'elevated',
    inputStyle: 'outlined',
    tableStyle: 'minimal',
  },
};

/**
 * OPERATIONAL STRENGTH
 * 
 * Psychology: Dark slates and orange accents convey strength, reliability,
 * and industrial capability. This is about getting things done.
 * 
 * Best for: Construction, manufacturing, logistics, field services, trades
 */
const OPERATIONAL_STRENGTH: DesignSystem = {
  id: 'operational-strength',
  name: 'Operational Strength',
  intent: 'Project capability, durability, and reliability',
  philosophy: `
    This system is built for industries where physical work and operational
    efficiency matter. The dark slate primary with orange accents suggests
    strength and urgency. The compact spacing and bold typography make
    information scannable for busy professionals. This isn't about being
    pretty - it's about being functional and trustworthy.
  `.trim(),
  suitableFor: [
    'contractor', 'construction', 'manufacturing', 'logistics',
    'plumber', 'electrician', 'hvac', 'roofing', 'mechanic',
    'handyman', 'landscaping', 'cleaning'
  ],
  notSuitableFor: ['luxury', 'beauty', 'children', 'healthcare'],
  colors: {
    light: {
      primary: '#1e293b',     // Dark slate - industrial strength
      secondary: '#334155',   // Slightly lighter slate
      accent: '#f97316',      // Orange - visibility, urgency, action
      success: '#22c55e',     // Green - job complete
      warning: '#eab308',     // Yellow - caution (safety colors)
      error: '#dc2626',       // Red - stop, danger
      info: '#0284c7',        // Blue - informational
      background: '#f8fafc',  // Light gray - clean work environment
      surface: '#ffffff',
      text: '#0f172a',        // Near black - maximum readability
      textMuted: '#64748b',
      border: '#cbd5e1',      // Visible borders
    },
    dark: {
      primary: '#e2e8f0',
      secondary: '#cbd5e1',
      accent: '#fb923c',
      success: '#4ade80',
      warning: '#facc15',
      error: '#f87171',
      info: '#38bdf8',
      background: '#020617',
      surface: '#0f172a',
      text: '#f8fafc',
      textMuted: '#94a3b8',
      border: '#1e293b',
    },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif',
    headingFamily: '"Plus Jakarta Sans", sans-serif',
    monoFamily: '"Fira Code", monospace',
    fontSize: 'base',
    lineHeight: 'tight',    // Compact for dense information
  },
  spacing: {
    scale: 'compact',       // Efficient use of space
    borderRadius: 'sm',     // Subtle rounding, utilitarian
    cardPadding: 'md',
  },
  shadows: {
    enabled: true,
    intensity: 'medium',
  },
  animations: {
    enabled: true,
    duration: 'fast',       // Quick, no time wasted
    easing: 'ease-out',
  },
  componentPreferences: {
    buttonStyle: 'solid',
    cardStyle: 'outlined',  // Clear boundaries
    inputStyle: 'outlined',
    tableStyle: 'bordered', // Clear data separation
  },
};

/**
 * WARM CRAFT & HOSPITALITY
 * 
 * Psychology: Warm ambers and earth tones convey warmth, craft, and
 * welcoming hospitality. These colors stimulate appetite and create
 * feelings of comfort and authenticity.
 * 
 * Best for: Restaurants, bakeries, cafés, artisan shops, hospitality
 */
const WARM_CRAFT: DesignSystem = {
  id: 'warm-craft',
  name: 'Warm Craft & Hospitality',
  intent: 'Create warmth, comfort, and artisanal authenticity',
  philosophy: `
    This system captures the feeling of a welcoming establishment where
    care and craft matter. Warm amber and cream tones stimulate appetite
    and create comfort. The slightly softer corners and relaxed spacing
    feel approachable rather than corporate. Typography uses serif
    headings to suggest tradition and quality.
  `.trim(),
  suitableFor: [
    'restaurant', 'bakery', 'cafe', 'hospitality', 'hotel',
    'catering', 'food-truck', 'brewery', 'winery', 'artisan'
  ],
  notSuitableFor: ['technology', 'finance', 'medical', 'construction'],
  colors: {
    light: {
      primary: '#b45309',     // Warm amber - appetizing, welcoming
      secondary: '#d97706',   // Lighter amber
      accent: '#059669',      // Sage green - freshness, natural
      success: '#16a34a',     // Green - fresh, good
      warning: '#ca8a04',     // Gold - attention
      error: '#dc2626',       // Red
      info: '#0369a1',        // Blue
      background: '#fffbeb',  // Warm cream - cozy
      surface: '#ffffff',
      text: '#451a03',        // Dark brown - warm text
      textMuted: '#92400e',   // Warm muted brown
      border: '#fde68a',      // Light amber border
    },
    dark: {
      primary: '#fbbf24',
      secondary: '#f59e0b',
      accent: '#34d399',
      success: '#4ade80',
      warning: '#facc15',
      error: '#f87171',
      info: '#38bdf8',
      background: '#1c1917',
      surface: '#292524',
      text: '#fef3c7',
      textMuted: '#d6d3d1',
      border: '#44403c',
    },
  },
  typography: {
    fontFamily: '"Lato", -apple-system, sans-serif',
    headingFamily: '"Playfair Display", Georgia, serif',  // Elegant serif headings
    monoFamily: '"Source Code Pro", monospace',
    fontSize: 'base',
    lineHeight: 'relaxed',
  },
  spacing: {
    scale: 'relaxed',
    borderRadius: 'lg',     // Soft, friendly corners
    cardPadding: 'lg',
  },
  shadows: {
    enabled: true,
    intensity: 'subtle',
  },
  animations: {
    enabled: true,
    duration: 'normal',
    easing: 'ease',
  },
  componentPreferences: {
    buttonStyle: 'solid',
    cardStyle: 'elevated',
    inputStyle: 'outlined',
    tableStyle: 'minimal',
  },
};

/**
 * MODERN SAAS
 * 
 * Psychology: Purple/indigo conveys innovation, creativity, and modernity.
 * This is the standard for technology products - familiar to users of
 * modern software while still feeling fresh.
 * 
 * Best for: Technology, SaaS, startups, digital services
 */
const MODERN_SAAS: DesignSystem = {
  id: 'modern-saas',
  name: 'Modern SaaS Clarity',
  intent: 'Project innovation, modernity, and digital sophistication',
  philosophy: `
    This system reflects contemporary digital product design. The indigo/
    purple palette is associated with innovation and creativity while
    remaining professional. Clean typography, moderate spacing, and subtle
    animations create a polished, modern feel. This is the default for
    technology products where users expect a familiar digital experience.
  `.trim(),
  suitableFor: [
    'technology', 'saas', 'startup', 'digital-agency', 'software',
    'ecommerce', 'marketplace', 'platform'
  ],
  notSuitableFor: ['healthcare', 'legal', 'traditional-craft'],
  colors: {
    light: {
      primary: '#6366f1',     // Indigo - modern, innovative
      secondary: '#8b5cf6',   // Purple - creative, premium
      accent: '#ec4899',      // Pink accent - energy, action
      success: '#10b981',     // Emerald - positive
      warning: '#f59e0b',     // Amber
      error: '#ef4444',       // Red
      info: '#3b82f6',        // Blue
      background: '#f8fafc',  // Clean light gray
      surface: '#ffffff',
      text: '#0f172a',        // Dark slate
      textMuted: '#64748b',
      border: '#e2e8f0',
    },
    dark: {
      primary: '#818cf8',
      secondary: '#a78bfa',
      accent: '#f472b6',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textMuted: '#94a3b8',
      border: '#334155',
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    headingFamily: '"Inter", sans-serif',
    monoFamily: '"JetBrains Mono", monospace',
    fontSize: 'base',
    lineHeight: 'normal',
  },
  spacing: {
    scale: 'normal',
    borderRadius: 'lg',
    cardPadding: 'md',
  },
  shadows: {
    enabled: true,
    intensity: 'subtle',
  },
  animations: {
    enabled: true,
    duration: 'fast',
    easing: 'ease-out',
  },
  componentPreferences: {
    buttonStyle: 'solid',
    cardStyle: 'elevated',
    inputStyle: 'outlined',
    tableStyle: 'striped',
  },
};

/**
 * LUXURY & REFINEMENT
 * 
 * Psychology: Neutral stone tones, serif typography, and minimal decoration
 * convey sophistication and exclusivity. Less is more.
 * 
 * Best for: High-end retail, luxury salons, premium services
 */
const LUXURY_REFINEMENT: DesignSystem = {
  id: 'luxury-refinement',
  name: 'Luxury & Refinement',
  intent: 'Convey exclusivity, sophistication, and premium quality',
  philosophy: `
    This system embodies restraint and sophistication. The neutral stone
    palette avoids bright colors that might feel mass-market. Serif
    typography and generous whitespace suggest quality and attention to
    detail. Every element should feel curated and intentional. This is
    not about being flashy - it's about quiet confidence.
  `.trim(),
  suitableFor: [
    'salon', 'spa', 'luxury-retail', 'high-end-services',
    'interior-design', 'jewelry', 'fashion', 'premium'
  ],
  notSuitableFor: ['budget', 'construction', 'fitness', 'children'],
  colors: {
    light: {
      primary: '#57534e',     // Warm stone - sophisticated
      secondary: '#78716c',   // Lighter stone
      accent: '#a8a29e',      // Soft accent
      success: '#65a30d',     // Muted green
      warning: '#ca8a04',     // Gold
      error: '#b91c1c',       // Deep red
      info: '#0369a1',        // Muted blue
      background: '#fafaf9',  // Very subtle warm white
      surface: '#ffffff',
      text: '#1c1917',        // Near black
      textMuted: '#78716c',   // Stone gray
      border: '#e7e5e4',      // Subtle border
    },
    dark: {
      primary: '#d6d3d1',
      secondary: '#a8a29e',
      accent: '#78716c',
      success: '#84cc16',
      warning: '#eab308',
      error: '#ef4444',
      info: '#0ea5e9',
      background: '#0c0a09',
      surface: '#1c1917',
      text: '#fafaf9',
      textMuted: '#a8a29e',
      border: '#292524',
    },
  },
  typography: {
    fontFamily: '"Cormorant Garamond", Georgia, serif',
    headingFamily: '"Playfair Display", serif',
    monoFamily: '"DM Mono", monospace',
    fontSize: 'lg',           // Slightly larger for elegance
    lineHeight: 'relaxed',
  },
  spacing: {
    scale: 'relaxed',         // Generous whitespace
    borderRadius: 'none',     // Sharp corners - sophisticated
    cardPadding: 'lg',
  },
  shadows: {
    enabled: false,           // No shadows - cleaner
    intensity: 'subtle',
  },
  animations: {
    enabled: true,
    duration: 'slow',         // Graceful, unhurried
    easing: 'ease',
  },
  componentPreferences: {
    buttonStyle: 'outline',   // Understated buttons
    cardStyle: 'outlined',
    inputStyle: 'underlined', // Minimal input style
    tableStyle: 'minimal',
  },
};

/**
 * FRIENDLY & APPROACHABLE
 * 
 * Psychology: Soft purples and rounded forms feel approachable and
 * non-threatening. Good for education and community services where
 * users should feel welcomed, not intimidated.
 * 
 * Best for: Education, tutoring, community services, non-profits
 */
const FRIENDLY_APPROACHABLE: DesignSystem = {
  id: 'friendly-approachable',
  name: 'Friendly & Approachable',
  intent: 'Create a welcoming, non-intimidating environment',
  philosophy: `
    This system prioritizes approachability. The soft purple palette
    feels friendly without being childish. Generous rounding and relaxed
    spacing make interfaces feel safe to explore. Perfect for educational
    contexts where users might feel uncertain or nervous.
  `.trim(),
  suitableFor: [
    'tutor', 'education', 'school', 'community', 'non-profit',
    'childcare', 'library', 'youth-services'
  ],
  notSuitableFor: ['finance', 'legal', 'construction', 'luxury'],
  colors: {
    light: {
      primary: '#7c3aed',     // Violet - friendly, creative
      secondary: '#8b5cf6',   // Softer purple
      accent: '#f472b6',      // Soft pink accent
      success: '#10b981',     // Friendly green
      warning: '#f59e0b',     // Warm amber
      error: '#f43f5e',       // Soft red
      info: '#06b6d4',        // Cyan
      background: '#faf5ff',  // Very light purple tint
      surface: '#ffffff',
      text: '#1e1b4b',        // Dark purple-ish
      textMuted: '#6b7280',
      border: '#e9d5ff',      // Light purple border
    },
    dark: {
      primary: '#a78bfa',
      secondary: '#c084fc',
      accent: '#f9a8d4',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#fb7185',
      info: '#22d3ee',
      background: '#1e1b4b',
      surface: '#312e81',
      text: '#f5f3ff',
      textMuted: '#a5b4fc',
      border: '#4c1d95',
    },
  },
  typography: {
    fontFamily: '"Nunito", -apple-system, sans-serif',
    headingFamily: '"Nunito", sans-serif',  // Friendly, rounded font
    monoFamily: '"Fira Code", monospace',
    fontSize: 'base',
    lineHeight: 'relaxed',
  },
  spacing: {
    scale: 'relaxed',
    borderRadius: 'xl',       // Very rounded - friendly
    cardPadding: 'lg',
  },
  shadows: {
    enabled: true,
    intensity: 'subtle',
  },
  animations: {
    enabled: true,
    duration: 'normal',
    easing: 'spring',         // Playful spring animation
  },
  componentPreferences: {
    buttonStyle: 'soft',
    cardStyle: 'elevated',
    inputStyle: 'filled',     // Soft filled inputs
    tableStyle: 'minimal',
  },
};

/**
 * DATA & PRECISION
 * 
 * Psychology: Cool cyans and monospace-influenced typography convey
 * technical precision and data accuracy. For users who value information
 * density and precision over aesthetics.
 * 
 * Best for: Analytics, scientific, research, engineering
 */
const DATA_PRECISION: DesignSystem = {
  id: 'data-precision',
  name: 'Data & Precision',
  intent: 'Convey technical precision and data reliability',
  philosophy: `
    This system is designed for information-dense applications where
    precision matters more than aesthetics. The cool cyan palette feels
    technical without being cold. Compact spacing maximizes data density,
    and monospace-influenced typography suggests exactness.
  `.trim(),
  suitableFor: [
    'analytics', 'scientific', 'research', 'engineering',
    'laboratory', 'data-services', 'monitoring'
  ],
  notSuitableFor: ['hospitality', 'children', 'creative', 'luxury'],
  colors: {
    light: {
      primary: '#0891b2',     // Cyan - technical, precise
      secondary: '#06b6d4',   // Lighter cyan
      accent: '#6366f1',      // Indigo accent
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      background: '#f0f9ff',  // Very light cyan tint
      surface: '#ffffff',
      text: '#0c4a6e',        // Dark cyan
      textMuted: '#64748b',
      border: '#bae6fd',
    },
    dark: {
      primary: '#22d3ee',
      secondary: '#67e8f9',
      accent: '#818cf8',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
      background: '#0c4a6e',
      surface: '#0369a1',
      text: '#f0f9ff',
      textMuted: '#7dd3fc',
      border: '#0284c7',
    },
  },
  typography: {
    fontFamily: '"Space Grotesk", -apple-system, sans-serif',
    headingFamily: '"Space Grotesk", sans-serif',
    monoFamily: '"Fira Code", monospace',
    fontSize: 'sm',           // Smaller for data density
    lineHeight: 'normal',
  },
  spacing: {
    scale: 'compact',         // Dense layout
    borderRadius: 'sm',       // Minimal rounding
    cardPadding: 'sm',
  },
  shadows: {
    enabled: true,
    intensity: 'subtle',
  },
  animations: {
    enabled: true,
    duration: 'fast',
    easing: 'linear',         // Precise, no bounce
  },
  componentPreferences: {
    buttonStyle: 'solid',
    cardStyle: 'outlined',
    inputStyle: 'outlined',
    tableStyle: 'bordered',   // Clear data boundaries
  },
};

/**
 * CREATIVE & EXPRESSIVE
 * 
 * Psychology: Deep purple with pink accents suggests creativity and
 * artistic expression. For creative professionals who want their tools
 * to reflect their identity.
 * 
 * Best for: Design, photography, creative agencies, art
 */
const CREATIVE_EXPRESSIVE: DesignSystem = {
  id: 'creative-expressive',
  name: 'Creative & Expressive',
  intent: 'Celebrate creativity and artistic expression',
  philosophy: `
    This system is for creative professionals. The rich purple palette
    with pink accents feels artistic and expressive. Typography is
    distinctive without being hard to read. The goal is to feel
    inspiring rather than generic.
  `.trim(),
  suitableFor: [
    'photographer', 'design-agency', 'creative', 'art-gallery',
    'music', 'video-production', 'graphic-design'
  ],
  notSuitableFor: ['finance', 'healthcare', 'construction', 'legal'],
  colors: {
    light: {
      primary: '#7c3aed',     // Rich purple - creative
      secondary: '#9333ea',   // Violet
      accent: '#ec4899',      // Pink - expressive
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      background: '#faf5ff',  // Light purple
      surface: '#ffffff',
      text: '#2e1065',        // Dark purple
      textMuted: '#6b21a8',
      border: '#e9d5ff',
    },
    dark: {
      primary: '#a78bfa',
      secondary: '#c084fc',
      accent: '#f472b6',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
      background: '#2e1065',
      surface: '#4c1d95',
      text: '#faf5ff',
      textMuted: '#c4b5fd',
      border: '#6b21a8',
    },
  },
  typography: {
    fontFamily: '"DM Sans", -apple-system, sans-serif',
    headingFamily: '"Sora", sans-serif',  // Distinctive headings
    monoFamily: '"JetBrains Mono", monospace',
    fontSize: 'base',
    lineHeight: 'normal',
  },
  spacing: {
    scale: 'normal',
    borderRadius: 'lg',
    cardPadding: 'md',
  },
  shadows: {
    enabled: true,
    intensity: 'medium',
  },
  animations: {
    enabled: true,
    duration: 'normal',
    easing: 'ease-out',
  },
  componentPreferences: {
    buttonStyle: 'solid',
    cardStyle: 'elevated',
    inputStyle: 'outlined',
    tableStyle: 'minimal',
  },
};

/**
 * ENERGETIC & DYNAMIC
 * 
 * Psychology: Red and orange convey energy, urgency, and excitement.
 * Use sparingly - this is for genuinely high-energy contexts like
 * fitness where the energy is appropriate.
 * 
 * Best for: Fitness, sports, gyms, high-energy services
 */
const ENERGETIC_DYNAMIC: DesignSystem = {
  id: 'energetic-dynamic',
  name: 'Energetic & Dynamic',
  intent: 'Project energy, motivation, and dynamic action',
  philosophy: `
    This system is for high-energy contexts where excitement is the goal.
    Red and orange stimulate and motivate. Bold typography and strong
    shadows create impact. This should only be used where the energy
    matches the context - misusing it in calmer industries will feel
    jarring and aggressive.
  `.trim(),
  suitableFor: [
    'gym', 'fitness-coach', 'sports', 'martial-arts',
    'adventure', 'extreme-sports', 'gaming'
  ],
  notSuitableFor: ['healthcare', 'legal', 'finance', 'senior-care', 'meditation'],
  colors: {
    light: {
      primary: '#dc2626',     // Red - energy, passion
      secondary: '#ea580c',   // Orange - motivation
      accent: '#f97316',      // Bright orange accent
      success: '#22c55e',
      warning: '#eab308',
      error: '#b91c1c',       // Darker red for errors
      info: '#0284c7',
      background: '#fef2f2',  // Very light red tint
      surface: '#ffffff',
      text: '#450a0a',        // Dark red-brown
      textMuted: '#7f1d1d',
      border: '#fecaca',
    },
    dark: {
      primary: '#f87171',
      secondary: '#fb923c',
      accent: '#fdba74',
      success: '#4ade80',
      warning: '#facc15',
      error: '#fca5a5',
      info: '#38bdf8',
      background: '#450a0a',
      surface: '#7f1d1d',
      text: '#fef2f2',
      textMuted: '#fca5a5',
      border: '#991b1b',
    },
  },
  typography: {
    fontFamily: '"Oswald", -apple-system, sans-serif',  // Bold, athletic
    headingFamily: '"Oswald", sans-serif',
    monoFamily: '"Fira Code", monospace',
    fontSize: 'lg',
    lineHeight: 'tight',
  },
  spacing: {
    scale: 'compact',
    borderRadius: 'sm',       // Sharp, dynamic
    cardPadding: 'md',
  },
  shadows: {
    enabled: true,
    intensity: 'strong',      // Bold shadows
  },
  animations: {
    enabled: true,
    duration: 'fast',
    easing: 'spring',         // Energetic bounce
  },
  componentPreferences: {
    buttonStyle: 'solid',
    cardStyle: 'elevated',
    inputStyle: 'outlined',
    tableStyle: 'striped',
  },
};

// ============================================================
// DESIGN SYSTEMS REGISTRY
// ============================================================

export const DESIGN_SYSTEMS: Record<DesignSystemId, DesignSystem> = {
  'trust-stability': TRUST_STABILITY,
  'calm-care': CALM_CARE,
  'operational-strength': OPERATIONAL_STRENGTH,
  'warm-craft': WARM_CRAFT,
  'modern-saas': MODERN_SAAS,
  'luxury-refinement': LUXURY_REFINEMENT,
  'friendly-approachable': FRIENDLY_APPROACHABLE,
  'data-precision': DATA_PRECISION,
  'creative-expressive': CREATIVE_EXPRESSIVE,
  'energetic-dynamic': ENERGETIC_DYNAMIC,
};

// ============================================================
// INDUSTRY TO DESIGN SYSTEM MAPPING
// ============================================================

/**
 * Default mapping from industry kit ID to design system.
 * This is the AUTHORITATIVE mapping - Neo should not deviate from this
 * unless explicitly requested by the user.
 */
export const INDUSTRY_DESIGN_SYSTEM_MAP: Record<string, DesignSystemId> = {
  // Trust & Stability - finance, real estate, legal
  'real-estate': 'trust-stability',
  'property-management': 'trust-stability',
  'accounting': 'trust-stability',
  'legal': 'trust-stability',
  'insurance': 'trust-stability',
  'finance': 'trust-stability',
  
  // Calm & Care - healthcare, wellness
  'medical': 'calm-care',
  'therapy-clinic': 'calm-care',
  'home-health': 'calm-care',
  'wellness': 'calm-care',
  'veterinary': 'calm-care',
  'dental': 'calm-care',
  
  // Operational Strength - trades, construction
  'contractor': 'operational-strength',
  'plumber': 'operational-strength',
  'electrician': 'operational-strength',
  'mechanic': 'operational-strength',
  'handyman': 'operational-strength',
  'roofing': 'operational-strength',
  'hvac': 'operational-strength',
  'landscaping': 'operational-strength',
  'cleaning': 'operational-strength',
  'commercial-cleaning': 'operational-strength',
  
  // Warm Craft - hospitality, food
  'bakery': 'warm-craft',
  'restaurant': 'warm-craft',
  'cafe': 'warm-craft',
  'catering': 'warm-craft',
  'hospitality': 'warm-craft',
  
  // Modern SaaS - technology, e-commerce
  'ecommerce': 'modern-saas',
  'technology': 'modern-saas',
  'saas': 'modern-saas',
  'startup': 'modern-saas',
  'general_business': 'modern-saas',  // Fallback for generic businesses
  
  // Luxury & Refinement - premium services
  'salon': 'luxury-refinement',
  'spa': 'luxury-refinement',
  
  // Friendly & Approachable - education
  'tutor': 'friendly-approachable',
  'school': 'friendly-approachable',
  'education': 'friendly-approachable',
  
  // Creative & Expressive - creative industries
  'photographer': 'creative-expressive',
  'design-agency': 'creative-expressive',
  
  // Energetic & Dynamic - fitness
  'gym': 'energetic-dynamic',
  'fitness-coach': 'energetic-dynamic',
  'sports': 'energetic-dynamic',
  
  // Home services - friendly, approachable
  'home-organizer': 'friendly-approachable',
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get the design system for an industry.
 * Falls back to 'modern-saas' if industry is unknown.
 */
export function getDesignSystemForIndustry(industryId: string): DesignSystem {
  const systemId = INDUSTRY_DESIGN_SYSTEM_MAP[industryId] || 'modern-saas';
  return DESIGN_SYSTEMS[systemId];
}

/**
 * Get design system by ID.
 */
export function getDesignSystem(id: DesignSystemId): DesignSystem {
  return DESIGN_SYSTEMS[id];
}

/**
 * List all available design systems.
 */
export function listDesignSystems(): DesignSystem[] {
  return Object.values(DESIGN_SYSTEMS);
}

/**
 * Check if an industry has a mapped design system.
 */
export function hasDesignSystemMapping(industryId: string): boolean {
  return industryId in INDUSTRY_DESIGN_SYSTEM_MAP;
}

/**
 * Get design system recommendation based on keywords.
 * Used for intent-based selection when industry is ambiguous.
 */
export function getDesignSystemByIntent(keywords: string[]): DesignSystemId {
  const keywordLower = keywords.map(k => k.toLowerCase());
  
  // Trust keywords
  if (keywordLower.some(k => ['professional', 'corporate', 'trustworthy', 'reliable', 'secure'].includes(k))) {
    return 'trust-stability';
  }
  
  // Care keywords
  if (keywordLower.some(k => ['caring', 'health', 'wellness', 'medical', 'calm', 'healing'].includes(k))) {
    return 'calm-care';
  }
  
  // Industrial keywords
  if (keywordLower.some(k => ['industrial', 'construction', 'rugged', 'tough', 'durable'].includes(k))) {
    return 'operational-strength';
  }
  
  // Warm keywords
  if (keywordLower.some(k => ['warm', 'cozy', 'artisan', 'craft', 'homemade', 'welcoming'].includes(k))) {
    return 'warm-craft';
  }
  
  // Tech keywords
  if (keywordLower.some(k => ['modern', 'tech', 'digital', 'innovative', 'startup'].includes(k))) {
    return 'modern-saas';
  }
  
  // Luxury keywords
  if (keywordLower.some(k => ['luxury', 'premium', 'elegant', 'sophisticated', 'exclusive'].includes(k))) {
    return 'luxury-refinement';
  }
  
  // Friendly keywords
  if (keywordLower.some(k => ['friendly', 'approachable', 'educational', 'community', 'welcoming'].includes(k))) {
    return 'friendly-approachable';
  }
  
  // Data keywords
  if (keywordLower.some(k => ['data', 'analytics', 'precision', 'scientific', 'technical'].includes(k))) {
    return 'data-precision';
  }
  
  // Creative keywords
  if (keywordLower.some(k => ['creative', 'artistic', 'design', 'expressive', 'visual'].includes(k))) {
    return 'creative-expressive';
  }
  
  // Energetic keywords
  if (keywordLower.some(k => ['energetic', 'fitness', 'dynamic', 'active', 'sports'].includes(k))) {
    return 'energetic-dynamic';
  }
  
  // Default to modern SaaS
  return 'modern-saas';
}

/**
 * Convert a DesignSystem to a UnifiedTheme.
 * This is the bridge between the design system and the app schema.
 */
export function designSystemToTheme(
  system: DesignSystem,
  mode: 'light' | 'dark' | 'auto' = 'light'
): UnifiedTheme {
  const colorPalette = mode === 'dark' ? system.colors.dark : system.colors.light;
  
  // Auto-assign surface intent based on design system
  const surfaceIntent = getSurfaceIntentForDesignSystem(system.id);
  
  return {
    preset: 'professional', // We're using design systems, not legacy presets
    colors: colorPalette,
    mode,
    surfaceIntent,
    typography: system.typography,
    spacing: system.spacing,
    shadows: system.shadows,
    animations: system.animations,
    customVars: {
      '--neo-primary': colorPalette.primary,
      '--neo-secondary': colorPalette.secondary,
      '--neo-accent': colorPalette.accent,
      '--neo-success': colorPalette.success,
      '--neo-warning': colorPalette.warning,
      '--neo-error': colorPalette.error,
      '--neo-info': colorPalette.info,
      '--neo-background': colorPalette.background,
      '--neo-surface': colorPalette.surface,
      '--neo-text': colorPalette.text,
      '--neo-text-muted': colorPalette.textMuted,
      '--neo-border': colorPalette.border,
      '--neo-font-family': system.typography.fontFamily,
      '--neo-font-heading': system.typography.headingFamily,
      '--neo-design-system': system.id,
      '--neo-design-system-name': system.name,
    },
  };
}

/**
 * Validate that a theme is consistent with its design system.
 * Returns issues if the theme has been modified in ways that break coherence.
 */
export function validateThemeCoherence(
  theme: UnifiedTheme,
  designSystemId?: DesignSystemId
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // If we know the design system, validate against it
  if (designSystemId && DESIGN_SYSTEMS[designSystemId]) {
    const system = DESIGN_SYSTEMS[designSystemId];
    const expectedColors = theme.mode === 'dark' ? system.colors.dark : system.colors.light;
    
    // Check if primary color has been changed
    if (theme.colors.primary !== expectedColors.primary) {
      issues.push(`Primary color ${theme.colors.primary} does not match design system ${designSystemId}`);
    }
  }
  
  // Check for color coherence (basic heuristics)
  // This is a simplified check - a real implementation might use color theory
  
  return {
    valid: issues.length === 0,
    issues,
  };
}
