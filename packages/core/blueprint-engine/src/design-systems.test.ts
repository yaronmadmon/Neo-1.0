/**
 * Design Systems Validation Test
 * 
 * This test validates that:
 * 1. Design systems are correctly mapped to industries
 * 2. The same app logic can be re-skinned with different design systems
 * 3. Visual differences are intentional and meaningful
 * 4. Theme generation is deterministic and explainable
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DESIGN_SYSTEMS,
  INDUSTRY_DESIGN_SYSTEM_MAP,
  getDesignSystem,
  getDesignSystemForIndustry,
  getDesignSystemByIntent,
  designSystemToTheme,
  listDesignSystems,
  hasDesignSystemMapping,
  validateThemeCoherence,
  type DesignSystem,
  type DesignSystemId,
} from './dna/design-systems.js';
import { ThemeBuilder } from './dna/theme-builder.js';

describe('Design Systems', () => {
  // ============================================================
  // STEP 1: VERIFY EXISTENCE
  // ============================================================

  describe('Design System Registry', () => {
    it('should have exactly 10 design systems', () => {
      const systems = listDesignSystems();
      expect(systems.length).toBe(10);
    });

    it('should have all expected design system IDs', () => {
      const expectedIds: DesignSystemId[] = [
        'trust-stability',
        'calm-care',
        'operational-strength',
        'warm-craft',
        'modern-saas',
        'luxury-refinement',
        'friendly-approachable',
        'data-precision',
        'creative-expressive',
        'energetic-dynamic',
      ];
      
      expectedIds.forEach(id => {
        expect(DESIGN_SYSTEMS[id]).toBeDefined();
        expect(DESIGN_SYSTEMS[id].id).toBe(id);
      });
    });

    it('each design system should have required properties', () => {
      listDesignSystems().forEach(system => {
        // Core properties
        expect(system.id).toBeDefined();
        expect(system.name).toBeDefined();
        expect(system.intent).toBeDefined();
        expect(system.philosophy).toBeDefined();
        
        // Industry mapping
        expect(system.suitableFor).toBeDefined();
        expect(system.suitableFor.length).toBeGreaterThan(0);
        expect(system.notSuitableFor).toBeDefined();
        
        // Colors
        expect(system.colors.light).toBeDefined();
        expect(system.colors.dark).toBeDefined();
        expect(system.colors.light.primary).toBeDefined();
        expect(system.colors.light.secondary).toBeDefined();
        expect(system.colors.light.accent).toBeDefined();
        
        // Typography
        expect(system.typography.fontFamily).toBeDefined();
        expect(system.typography.headingFamily).toBeDefined();
        
        // Spacing
        expect(system.spacing.scale).toBeDefined();
        expect(system.spacing.borderRadius).toBeDefined();
        
        // Component preferences
        expect(system.componentPreferences.buttonStyle).toBeDefined();
        expect(system.componentPreferences.cardStyle).toBeDefined();
      });
    });
  });

  // ============================================================
  // STEP 2: VERIFY DESIGN SYSTEMS ARE DISTINCT
  // ============================================================

  describe('Design System Distinctiveness', () => {
    it('design systems should have visually distinct color palettes', () => {
      // Group systems by their primary color
      const colorGroups = new Map<string, string[]>();
      
      listDesignSystems().forEach(system => {
        const primary = system.colors.light.primary;
        if (!colorGroups.has(primary)) {
          colorGroups.set(primary, []);
        }
        colorGroups.get(primary)!.push(system.id);
      });
      
      // Most should be unique, but we allow up to 2 systems to share
      // a primary if they're in related psychological categories
      // (e.g., friendly-approachable and creative-expressive both use violet)
      colorGroups.forEach((systems, color) => {
        expect(systems.length).toBeLessThanOrEqual(2);
        if (systems.length > 1) {
          // If colors are shared, systems should have different accents
          const accents = systems.map(id => DESIGN_SYSTEMS[id as DesignSystemId].colors.light.accent);
          expect(new Set(accents).size).toBe(accents.length);
        }
      });
      
      // Ensure we have at least 8 distinct primary colors
      expect(colorGroups.size).toBeGreaterThanOrEqual(8);
    });

    it('design systems should have distinct intents', () => {
      const intents = new Set<string>();
      
      listDesignSystems().forEach(system => {
        expect(intents.has(system.intent)).toBe(false);
        intents.add(system.intent);
      });
    });
    
    it('design systems with same primary should have different typography', () => {
      // Find systems with same primary
      const systems = listDesignSystems();
      
      for (let i = 0; i < systems.length; i++) {
        for (let j = i + 1; j < systems.length; j++) {
          if (systems[i].colors.light.primary === systems[j].colors.light.primary) {
            // If primary is same, typography should differ
            const sameFont = systems[i].typography.fontFamily === systems[j].typography.fontFamily;
            const sameHeading = systems[i].typography.headingFamily === systems[j].typography.headingFamily;
            expect(sameFont && sameHeading).toBe(false);
          }
        }
      }
    });
  });

  // ============================================================
  // STEP 3: INDUSTRY MAPPING
  // ============================================================

  describe('Industry to Design System Mapping', () => {
    it('should have mappings for all major industry categories', () => {
      const majorIndustries = [
        'real-estate', 'medical', 'contractor', 'bakery',
        'ecommerce', 'salon', 'tutor', 'photographer', 'gym',
      ];
      
      majorIndustries.forEach(industry => {
        expect(hasDesignSystemMapping(industry)).toBe(true);
      });
    });

    it('should return appropriate design systems for industries', () => {
      // Healthcare should get calm-care
      expect(getDesignSystemForIndustry('medical').id).toBe('calm-care');
      expect(getDesignSystemForIndustry('therapy-clinic').id).toBe('calm-care');
      
      // Finance/Real Estate should get trust-stability
      expect(getDesignSystemForIndustry('real-estate').id).toBe('trust-stability');
      expect(getDesignSystemForIndustry('property-management').id).toBe('trust-stability');
      
      // Construction/Trades should get operational-strength
      expect(getDesignSystemForIndustry('contractor').id).toBe('operational-strength');
      expect(getDesignSystemForIndustry('plumber').id).toBe('operational-strength');
      
      // Hospitality should get warm-craft
      expect(getDesignSystemForIndustry('bakery').id).toBe('warm-craft');
      expect(getDesignSystemForIndustry('restaurant').id).toBe('warm-craft');
      
      // Technology should get modern-saas
      expect(getDesignSystemForIndustry('ecommerce').id).toBe('modern-saas');
      
      // Fitness should get energetic-dynamic
      expect(getDesignSystemForIndustry('gym').id).toBe('energetic-dynamic');
    });

    it('should fall back to modern-saas for unknown industries', () => {
      expect(getDesignSystemForIndustry('unknown-industry').id).toBe('modern-saas');
    });
  });

  // ============================================================
  // STEP 4: SELECTION LOGIC
  // ============================================================

  describe('Design System Selection Logic', () => {
    it('should select design system based on keywords', () => {
      expect(getDesignSystemByIntent(['professional', 'trustworthy'])).toBe('trust-stability');
      expect(getDesignSystemByIntent(['medical', 'calm'])).toBe('calm-care');
      expect(getDesignSystemByIntent(['industrial', 'rugged'])).toBe('operational-strength');
      expect(getDesignSystemByIntent(['warm', 'artisan'])).toBe('warm-craft');
      expect(getDesignSystemByIntent(['modern', 'tech'])).toBe('modern-saas');
      expect(getDesignSystemByIntent(['luxury', 'premium'])).toBe('luxury-refinement');
      expect(getDesignSystemByIntent(['friendly', 'educational'])).toBe('friendly-approachable');
      expect(getDesignSystemByIntent(['data', 'precision'])).toBe('data-precision');
      expect(getDesignSystemByIntent(['creative', 'artistic'])).toBe('creative-expressive');
      expect(getDesignSystemByIntent(['fitness', 'energetic'])).toBe('energetic-dynamic');
    });

    it('should default to modern-saas for ambiguous keywords', () => {
      expect(getDesignSystemByIntent(['random', 'words'])).toBe('modern-saas');
      expect(getDesignSystemByIntent([])).toBe('modern-saas');
    });
  });

  // ============================================================
  // STEP 5: THEME GENERATION
  // ============================================================

  describe('Theme Generation', () => {
    let themeBuilder: ThemeBuilder;

    beforeEach(() => {
      themeBuilder = new ThemeBuilder();
    });

    it('should generate theme from design system', () => {
      const theme = themeBuilder.buildFromDesignSystem('medical');
      
      expect(theme.colors.primary).toBe('#0d9488'); // Calm-care teal
      expect(theme.mode).toBe('light');
      expect(theme.customVars?.['--neo-design-system']).toBe('calm-care');
    });

    it('should generate dark mode theme from design system', () => {
      const lightTheme = themeBuilder.buildFromDesignSystem('medical', 'light');
      const darkTheme = themeBuilder.buildFromDesignSystem('medical', 'dark');
      
      expect(lightTheme.colors.background).toBe('#f0fdfa'); // Light teal background
      expect(darkTheme.colors.background).toBe('#042f2e'); // Dark teal background
    });

    it('should generate different themes for different industries', () => {
      const medicalTheme = themeBuilder.buildFromDesignSystem('medical');
      const constructionTheme = themeBuilder.buildFromDesignSystem('contractor');
      const bakeryTheme = themeBuilder.buildFromDesignSystem('bakery');
      
      // Colors should be different
      expect(medicalTheme.colors.primary).not.toBe(constructionTheme.colors.primary);
      expect(constructionTheme.colors.primary).not.toBe(bakeryTheme.colors.primary);
      expect(bakeryTheme.colors.primary).not.toBe(medicalTheme.colors.primary);
      
      // Typography should differ
      expect(medicalTheme.typography?.fontFamily).not.toBe(bakeryTheme.typography?.fontFamily);
      
      // Spacing might differ
      expect(constructionTheme.spacing?.scale).toBe('compact'); // Operational
      expect(medicalTheme.spacing?.scale).toBe('relaxed'); // Calm-care
    });

    it('should generate theme from specific design system ID', () => {
      const theme = themeBuilder.buildFromDesignSystemId('luxury-refinement');
      
      expect(theme.colors.primary).toBe('#57534e'); // Stone gray
      expect(theme.typography?.fontFamily).toContain('Cormorant Garamond');
      expect(theme.shadows?.enabled).toBe(false); // Luxury has no shadows
    });

    it('should generate theme from intent keywords', () => {
      const theme = themeBuilder.buildFromIntent(['creative', 'artistic']);
      
      expect(theme.customVars?.['--neo-design-system']).toBe('creative-expressive');
      expect(theme.colors.primary).toBe('#7c3aed'); // Purple
    });

    it('ThemeBuilder.build() should use design system when industry is specified', () => {
      const theme = themeBuilder.build({ industry: 'medical' });
      
      // Should use calm-care design system
      expect(theme.colors.primary).toBe('#0d9488');
      expect(theme.customVars?.['--neo-design-system']).toBe('calm-care');
    });
  });

  // ============================================================
  // STEP 6: VALIDATION - SAME APP, DIFFERENT SKINS
  // ============================================================

  describe('Same App, Different Design Systems', () => {
    let themeBuilder: ThemeBuilder;

    beforeEach(() => {
      themeBuilder = new ThemeBuilder();
    });

    // Simulate an "Appointment Booking" app that could be used in multiple industries
    const createMockApp = (theme: ReturnType<typeof themeBuilder.buildFromDesignSystem>) => {
      return {
        name: 'Appointment Booking',
        entities: ['Appointment', 'Customer', 'Service'],
        pages: ['Dashboard', 'Appointments', 'Customers', 'Services', 'Settings'],
        theme,
      };
    };

    it('appointment booking app should look different for medical vs salon', () => {
      const medicalTheme = themeBuilder.buildFromDesignSystem('medical');
      const salonTheme = themeBuilder.buildFromDesignSystem('salon');
      
      const medicalApp = createMockApp(medicalTheme);
      const salonApp = createMockApp(salonTheme);
      
      // Same structure
      expect(medicalApp.entities).toEqual(salonApp.entities);
      expect(medicalApp.pages).toEqual(salonApp.pages);
      
      // Different visual design
      expect(medicalApp.theme.colors.primary).not.toBe(salonApp.theme.colors.primary);
      expect(medicalApp.theme.typography?.fontFamily).not.toBe(salonApp.theme.typography?.fontFamily);
      
      // Medical should be calming (teal)
      expect(medicalApp.theme.colors.primary).toBe('#0d9488');
      // Salon should be refined (stone)
      expect(salonApp.theme.colors.primary).toBe('#57534e');
      
      // Medical should have relaxed spacing
      expect(medicalApp.theme.spacing?.scale).toBe('relaxed');
      // Salon should also have relaxed spacing (luxury)
      expect(salonApp.theme.spacing?.scale).toBe('relaxed');
    });

    it('job management app should look different for construction vs home services', () => {
      const constructionTheme = themeBuilder.buildFromDesignSystem('contractor');
      const homeOrganizerTheme = themeBuilder.buildFromDesignSystem('home-organizer');
      
      // Construction: Industrial, bold, compact
      expect(constructionTheme.colors.primary).toBe('#1e293b'); // Dark slate
      expect(constructionTheme.spacing?.scale).toBe('compact');
      expect(constructionTheme.spacing?.borderRadius).toBe('sm');
      
      // Home organizer: Friendly, relaxed
      expect(homeOrganizerTheme.colors.primary).toBe('#7c3aed'); // Violet
      expect(homeOrganizerTheme.spacing?.scale).toBe('relaxed');
      expect(homeOrganizerTheme.spacing?.borderRadius).toBe('xl');
    });
  });

  // ============================================================
  // PSYCHOLOGICAL INTENT VALIDATION
  // ============================================================

  describe('Psychological Intent', () => {
    it('healthcare design system should convey calm and care', () => {
      const system = getDesignSystem('calm-care');
      
      // Teal is scientifically proven to reduce anxiety
      expect(system.colors.light.primary).toBe('#0d9488');
      expect(system.colors.light.background).toBe('#f0fdfa'); // Light teal tint
      
      // Spacing should be relaxed (non-cramped)
      expect(system.spacing.scale).toBe('relaxed');
      
      // Animations should be slow (gentle)
      expect(system.animations.duration).toBe('slow');
      
      // Button style should be soft (non-aggressive)
      expect(system.componentPreferences.buttonStyle).toBe('soft');
    });

    it('construction design system should convey operational strength', () => {
      const system = getDesignSystem('operational-strength');
      
      // Dark slate for industrial strength
      expect(system.colors.light.primary).toBe('#1e293b');
      
      // Orange accent for visibility and urgency
      expect(system.colors.light.accent).toBe('#f97316');
      
      // Compact spacing for efficiency
      expect(system.spacing.scale).toBe('compact');
      
      // Fast animations for no wasted time
      expect(system.animations.duration).toBe('fast');
    });

    it('fitness design system should convey energy and motivation', () => {
      const system = getDesignSystem('energetic-dynamic');
      
      // Red for energy and passion
      expect(system.colors.light.primary).toBe('#dc2626');
      
      // Strong shadows for impact
      expect(system.shadows.intensity).toBe('strong');
      
      // Spring easing for energetic bounce
      expect(system.animations.easing).toBe('spring');
    });
  });

  // ============================================================
  // DETERMINISM AND EXPLAINABILITY
  // ============================================================

  describe('Determinism and Explainability', () => {
    it('design system selection should be deterministic', () => {
      // Same input should always produce same output
      for (let i = 0; i < 10; i++) {
        expect(getDesignSystemForIndustry('medical').id).toBe('calm-care');
        expect(getDesignSystemForIndustry('contractor').id).toBe('operational-strength');
        expect(getDesignSystemForIndustry('bakery').id).toBe('warm-craft');
      }
    });

    it('design system should have explainable intent', () => {
      listDesignSystems().forEach(system => {
        // Intent should be meaningful
        expect(system.intent.length).toBeGreaterThan(20);
        
        // Philosophy should explain the design choices
        expect(system.philosophy.length).toBeGreaterThan(100);
        
        // Should list suitable industries
        expect(system.suitableFor.length).toBeGreaterThan(0);
      });
    });

    it('theme should record which design system was used', () => {
      const themeBuilder = new ThemeBuilder();
      const theme = themeBuilder.buildFromDesignSystem('medical');
      
      // Theme should record the design system for explainability
      expect(theme.customVars?.['--neo-design-system']).toBe('calm-care');
      expect(theme.customVars?.['--neo-design-system-name']).toBe('Calm & Care');
    });
  });
});
