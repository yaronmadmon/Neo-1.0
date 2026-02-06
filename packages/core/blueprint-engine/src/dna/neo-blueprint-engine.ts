/**
 * NEO Blueprint Engine
 * 
 * The unified orchestrator that generates complete app blueprints from voice input.
 * This is the heart of Phase 2 - the DNA system.
 * 
 * Takes intelligence layer output and produces a complete, runnable app specification.
 */

import { randomUUID } from 'node:crypto';
import type { UnifiedAppSchema, UnifiedEntity, UnifiedPage, UnifiedWorkflow, UnifiedNavigation, UnifiedTheme, CustomerNavigation, SurfacesConfig } from './schema.js';
import { AppSchema } from './schema.js';
import { PageBuilder, type PageBuildContext } from './page-builder.js';
import { EntityBuilder, type EntityBuildContext } from './entity-builder.js';
import { WorkflowBuilder, type WorkflowBuildContext } from './workflow-builder.js';
import { NavigationBuilder, type NavigationBuildContext } from './navigation-builder.js';
import { ThemeBuilder, type ThemeBuildContext } from './theme-builder.js';
import { DataModelInference, type DataModelContext } from './data-model-inference.js';
import { getSurfaceIntentForDesignSystem, type SurfaceIntent } from './surface-theme.js';
import { getDesignSystemForIndustry } from './design-systems.js';
import type { IntelligenceResult, VoiceInput } from '../intelligence/types.js';

// ============================================================
// TYPES
// ============================================================

export interface BlueprintContext {
  /** Raw voice input from user */
  voiceInput?: VoiceInput;
  /** Processed intelligence result */
  intelligence?: IntelligenceResult;
  /** App name (if specified) */
  appName?: string;
  /** Industry override */
  industry?: string;
  /** Additional features to include */
  additionalFeatures?: string[];
  /** Theme preference */
  themePreference?: 'modern' | 'minimal' | 'bold' | 'professional' | 'playful';
  /** Existing app to modify (for revisions) */
  existingApp?: UnifiedAppSchema;
}

export interface BlueprintResult {
  /** The complete app schema */
  schema: UnifiedAppSchema;
  /** Confidence score (0-1) */
  confidence: number;
  /** Suggested follow-up questions */
  suggestions: string[];
  /** Warnings or notes about the generation */
  warnings: string[];
  /** Generation metadata */
  metadata: {
    generatedAt: string;
    inputLength: number;
    entityCount: number;
    pageCount: number;
    workflowCount: number;
  };
}

// ============================================================
// NEO BLUEPRINT ENGINE
// ============================================================

export class NeoBlueprintEngine {
  private pageBuilder: PageBuilder;
  private entityBuilder: EntityBuilder;
  private workflowBuilder: WorkflowBuilder;
  private navigationBuilder: NavigationBuilder;
  private themeBuilder: ThemeBuilder;
  private dataModelInference: DataModelInference;

  constructor() {
    this.pageBuilder = new PageBuilder();
    this.entityBuilder = new EntityBuilder();
    this.workflowBuilder = new WorkflowBuilder();
    this.navigationBuilder = new NavigationBuilder();
    this.themeBuilder = new ThemeBuilder();
    this.dataModelInference = new DataModelInference();
  }

  /**
   * Generate a complete app blueprint from context
   */
  async generate(ctx: BlueprintContext): Promise<BlueprintResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Step 1: Infer or validate entities
    const entities = this.buildEntities(ctx, warnings);
    if (entities.length === 0) {
      warnings.push('No entities could be inferred. Using default entity structure.');
      entities.push(this.entityBuilder.buildFromName('Item', { industry: ctx.industry }));
    }

    // Step 2: Generate pages for all entities
    const pages = this.buildPages(entities, ctx);
    
    // Step 3: Generate workflows
    const workflows = this.buildWorkflows(entities, pages, ctx);
    
    // Step 4: Build navigation for all surfaces
    const navigation = this.buildNavigation(pages, entities, ctx);
    
    // Step 4b: Build surface-specific navigations
    const surfacesConfig = this.buildSurfacesConfig(pages, ctx);
    const staffNavigation = this.buildSurfaceNavigation(pages, entities, 'staff', ctx);
    const customerNavigation = this.buildSurfaceNavigation(pages, entities, 'customer', ctx);
    const providerNavigation = this.buildSurfaceNavigation(pages, entities, 'provider', ctx);
    const patientNavigation = this.buildSurfaceNavigation(pages, entities, 'patient', ctx);
    
    // Step 5: Build theme
    const theme = this.buildTheme(ctx);

    // Step 6: Determine app name
    const appName = this.determineAppName(ctx, entities);

    // Step 7: Assemble complete schema
    const schema: UnifiedAppSchema = {
      id: this.generateId(appName),
      version: 1,
      name: appName,
      description: this.generateDescription(ctx, entities),
      icon: this.determineAppIcon(ctx, entities),
      behavior: ctx.intelligence?.behavior?.id,
      industry: ctx.intelligence?.industry.id || ctx.industry,
      surfaces: surfacesConfig,
      entities,
      pages,
      workflows,
      navigation,
      // Surface-specific navigations (only included if surface is enabled)
      ...(staffNavigation ? { staffNavigation } : {}),
      ...(customerNavigation ? { customerNavigation } : {}),
      ...(providerNavigation ? { providerNavigation } : {}),
      ...(patientNavigation ? { patientNavigation } : {}),
      theme,
      settings: {
        locale: 'en',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm',
        currency: 'USD',
      },
      features: this.determineFeatures(ctx),
      metadata: {
        createdAt: new Date().toISOString(),
        generatedBy: 'neo-blueprint-engine',
        confidence: this.calculateConfidence(ctx, entities, pages),
        sourceInput: ctx.voiceInput?.text,
      },
    };

    // Step 8: Validate schema
    const validation = AppSchema.validate(schema);
    if (!validation.valid) {
      warnings.push(...(validation.errors || []));
    }

    // Step 9: Generate suggestions
    suggestions.push(...this.generateSuggestions(schema, ctx));

    const confidence = this.calculateConfidence(ctx, entities, pages);

    return {
      schema,
      confidence,
      suggestions,
      warnings,
      metadata: {
        generatedAt: new Date().toISOString(),
        inputLength: ctx.voiceInput?.text?.length || 0,
        entityCount: entities.length,
        pageCount: pages.length,
        workflowCount: workflows.length,
      },
    };
  }

  /**
   * Modify an existing blueprint based on voice revision
   */
  async revise(
    existingSchema: UnifiedAppSchema, 
    revisionInput: VoiceInput,
    intelligence: IntelligenceResult
  ): Promise<BlueprintResult> {
    // Deep clone existing schema
    const schema = JSON.parse(JSON.stringify(existingSchema)) as UnifiedAppSchema;
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Apply revisions based on intent
    const revisionIntent = intelligence.parsed.intent;

    switch (revisionIntent) {
      case 'add_feature':
        this.applyAddFeature(schema, intelligence);
        break;

      case 'add_entity':
        this.applyAddEntity(schema, intelligence);
        break;

      case 'add_page':
        this.applyAddPage(schema, intelligence);
        break;

      case 'change_design':
        this.applyDesignChange(schema, intelligence);
        break;

      case 'modify_app':
        // General modification - try to infer what to change
        this.applyGeneralModification(schema, intelligence);
        break;

      default:
        warnings.push(`Unknown revision intent: ${revisionIntent}`);
    }

    // Update metadata
    schema.metadata = {
      ...schema.metadata,
      updatedAt: new Date().toISOString(),
    };
    schema.version = (schema.version || 1) + 1;

    const confidence = 0.7; // Revisions typically have lower confidence

    return {
      schema,
      confidence,
      suggestions,
      warnings,
      metadata: {
        generatedAt: new Date().toISOString(),
        inputLength: revisionInput.text.length,
        entityCount: schema.entities.length,
        pageCount: schema.pages.length,
        workflowCount: schema.workflows.length,
      },
    };
  }

  // ============================================================
  // BUILD METHODS
  // ============================================================

  private buildEntities(ctx: BlueprintContext, warnings: string[]): UnifiedEntity[] {
    if (ctx.intelligence?.entities && ctx.intelligence.entities.length > 0) {
      // Use intelligence-inferred entities
      return this.dataModelInference.inferFromIntelligence({
        intelligence: ctx.intelligence,
        industry: ctx.industry,
        features: ctx.intelligence.features,
      });
    }

    if (ctx.intelligence?.features && ctx.intelligence.features.length > 0) {
      // Infer from features only
      return this.dataModelInference.inferFromFeatures(
        ctx.intelligence.features,
        ctx.intelligence.industry?.id || ctx.industry
      );
    }

    // Fall back to basic entity from voice input keywords
    if (ctx.voiceInput?.text) {
      const mainNoun = this.extractMainNoun(ctx.voiceInput.text);
      if (mainNoun) {
        return [this.entityBuilder.buildFromName(mainNoun, { industry: ctx.industry })];
      }
    }

    return [];
  }

  private buildPages(entities: UnifiedEntity[], ctx: BlueprintContext): UnifiedPage[] {
    const pages: UnifiedPage[] = [];
    const features = ctx.intelligence?.features || [];

    // Generate dashboard if multiple entities or if explicitly needed
    if (entities.length > 1 || features.some(f => f.id === 'dashboard')) {
      pages.push(this.pageBuilder.generateDashboard(entities, { features }));
    }

    // Generate pages for each entity
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const entityPages = this.pageBuilder.generateForEntity(entity, {
        entity,
        entities,
        features,
        layout: ctx.intelligence?.layout,
        isDefault: entities.length === 1 && i === 0,
        pageIndex: i * 10,
      });
      pages.push(...entityPages);
    }

    // Add settings page
    pages.push(this.pageBuilder.generateSettingsPage());

    return pages;
  }

  private buildWorkflows(
    entities: UnifiedEntity[], 
    pages: UnifiedPage[], 
    ctx: BlueprintContext
  ): UnifiedWorkflow[] {
    return this.workflowBuilder.generateAll({
      entities,
      pages,
      features: ctx.intelligence?.features,
      industry: ctx.intelligence?.industry?.id || ctx.industry,
    });
  }

  private buildNavigation(
    pages: UnifiedPage[], 
    entities: UnifiedEntity[], 
    ctx: BlueprintContext
  ): UnifiedNavigation {
    return this.navigationBuilder.build({
      pages,
      entities,
      features: ctx.intelligence?.features,
      appName: ctx.appName,
      industry: ctx.intelligence?.industry?.id || ctx.industry,
    });
  }

  private buildTheme(ctx: BlueprintContext): UnifiedTheme {
    const industryId = ctx.intelligence?.industry?.id || ctx.industry;
    
    // Build base theme
    let theme: UnifiedTheme;
    if (ctx.themePreference) {
      theme = this.themeBuilder.buildFromKeyword(ctx.themePreference, {
        layout: ctx.intelligence?.layout,
        industry: industryId,
      });
    } else {
      theme = this.themeBuilder.build({
        layout: ctx.intelligence?.layout,
        industry: industryId,
        userPreference: ctx.intelligence?.layout?.theme,
        keywords: ctx.intelligence?.parsed?.adjectives,
      });
    }
    
    // Auto-assign surfaceIntent based on design system / industry
    // This creates the ambient atmosphere for the app
    if (!theme.surfaceIntent && industryId) {
      const designSystem = getDesignSystemForIndustry(industryId);
      const surfaceIntent = getSurfaceIntentForDesignSystem(designSystem.id);
      theme = {
        ...theme,
        surfaceIntent,
      };
    }
    
    // Default to neutral-professional if no surfaceIntent determined
    if (!theme.surfaceIntent) {
      theme = {
        ...theme,
        surfaceIntent: 'neutral-professional' as SurfaceIntent,
      };
    }
    
    return theme;
  }

  // ============================================================
  // REVISION METHODS
  // ============================================================

  private applyAddFeature(schema: UnifiedAppSchema, intel: IntelligenceResult): void {
    const newFeatures = intel.features.filter(f => 
      f.confidence > 0.5 && !this.hasFeature(schema, f.id)
    );

    for (const feature of newFeatures) {
      // Add implied entities
      if (feature.id === 'invoicing' && !schema.entities.find(e => e.id === 'invoice')) {
        schema.entities.push(this.entityBuilder.buildFromName('Invoice', { 
          industry: schema.industry 
        }));
      }

      // Add implied pages
      if (feature.id === 'calendar') {
        const schedulableEntity = schema.entities.find(e => 
          e.behaviors?.includes('schedulable')
        );
        if (schedulableEntity) {
          const calendarPage = this.pageBuilder.generateForEntity(schedulableEntity, {
            features: [feature],
          }).find(p => p.type === 'calendar');
          if (calendarPage) {
            schema.pages.push(calendarPage);
          }
        }
      }
    }
  }

  private applyAddEntity(schema: UnifiedAppSchema, intel: IntelligenceResult): void {
    for (const inferred of intel.entities) {
      if (!schema.entities.find(e => e.id === inferred.id)) {
        const entity = this.entityBuilder.buildFromInference(inferred, {
          industry: schema.industry,
          existingEntities: schema.entities,
        });
        schema.entities.push(entity);

        // Generate pages for new entity
        const entityPages = this.pageBuilder.generateForEntity(entity, {
          entity,
          entities: schema.entities,
        });
        schema.pages.push(...entityPages);

        // Generate workflows
        const entityWorkflows = this.workflowBuilder.generateAll({
          entities: [entity],
          pages: entityPages,
        });
        schema.workflows.push(...entityWorkflows);

        // Update navigation
        schema.navigation = this.navigationBuilder.build({
          pages: schema.pages,
          entities: schema.entities,
        });
      }
    }
  }

  private applyAddPage(schema: UnifiedAppSchema, intel: IntelligenceResult): void {
    // Try to determine what kind of page to add
    const pageType = intel.layout?.primaryLayout || 'list';
    const targetEntity = schema.entities[0];

    if (targetEntity) {
      const newPage = this.pageBuilder.generateForEntity(targetEntity, {
        entity: targetEntity,
        features: intel.features,
      }).find(p => p.type === pageType);

      if (newPage && !schema.pages.find(p => p.id === newPage.id)) {
        schema.pages.push(newPage);
        
        // Update navigation
        schema.navigation = this.navigationBuilder.build({
          pages: schema.pages,
          entities: schema.entities,
        });
      }
    }
  }

  private applyDesignChange(schema: UnifiedAppSchema, intel: IntelligenceResult): void {
    // Apply theme changes
    if (intel.layout?.theme) {
      const newTheme = this.themeBuilder.build({
        userPreference: intel.layout.theme,
        industry: schema.industry,
        keywords: intel.parsed.adjectives,
      });
      schema.theme = newTheme;
    }
  }

  private applyGeneralModification(schema: UnifiedAppSchema, intel: IntelligenceResult): void {
    // Check for keyword-based modifications
    const keywords = intel.parsed.nouns.map(n => n.toLowerCase());

    // Style keywords
    if (keywords.some(k => ['modern', 'minimal', 'bold', 'professional', 'playful'].includes(k))) {
      this.applyDesignChange(schema, intel);
    }

    // Feature keywords
    if (keywords.includes('invoice') || keywords.includes('invoicing')) {
      intel.features.push({ 
        id: 'invoicing', 
        name: 'Invoicing', 
        confidence: 0.9, 
        priority: 'essential',
        reasoning: 'User mentioned invoicing',
      });
      this.applyAddFeature(schema, intel);
    }

    if (keywords.includes('calendar') || keywords.includes('schedule')) {
      intel.features.push({ 
        id: 'calendar', 
        name: 'Calendar', 
        confidence: 0.9, 
        priority: 'essential',
        reasoning: 'User mentioned calendar',
      });
      this.applyAddFeature(schema, intel);
    }
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private determineAppName(ctx: BlueprintContext, entities: UnifiedEntity[]): string {
    // Use explicitly provided name
    if (ctx.appName) return ctx.appName;

    // Try to extract from voice input
    if (ctx.voiceInput?.text) {
      const text = ctx.voiceInput.text.toLowerCase();
      const match = text.match(/(?:called?|named?)\s+['"]?([^'"]+)['"]?/i);
      if (match) return this.toTitleCase(match[1]);
    }

    // Use industry name
    if (ctx.intelligence?.industry?.name) {
      return `${ctx.intelligence.industry.name} App`;
    }

    // Use primary entity name
    if (entities.length > 0) {
      return `${entities[0].name} Manager`;
    }

    return 'My App';
  }

  private generateDescription(ctx: BlueprintContext, entities: UnifiedEntity[]): string {
    const entityNames = entities.map(e => e.pluralName.toLowerCase()).join(', ');
    const industry = ctx.intelligence?.industry?.name || 'your';
    
    return `A ${industry} app to help you manage ${entityNames}.`;
  }

  private determineAppIcon(ctx: BlueprintContext, entities: UnifiedEntity[]): string {
    // Use primary entity icon
    if (entities[0]?.icon) return entities[0].icon;

    // Industry-based icons
    const industryIcons: Record<string, string> = {
      trades: '🔧',
      services: '💼',
      healthcare: '🏥',
      real_estate: '🏠',
      fitness: '💪',
      retail: '🛒',
      hospitality: '🍽️',
      creative: '🎨',
      technology: '💻',
      home: '🏡',
    };

    const industry = ctx.intelligence?.industry?.id || ctx.industry;
    if (industry && industryIcons[industry]) {
      return industryIcons[industry];
    }

    return '📱';
  }

  private determineFeatures(ctx: BlueprintContext): UnifiedAppSchema['features'] {
    const features: UnifiedAppSchema['features'] = {
      auth: true,
      search: true,
      exports: true,
    };

    if (ctx.intelligence?.features) {
      for (const f of ctx.intelligence.features) {
        if (f.id === 'notifications' || f.id === 'reminders') {
          features.notifications = true;
        }
        if (f.id === 'analytics' || f.id === 'reports') {
          features.analytics = true;
        }
      }
    }

    return features;
  }

  private calculateConfidence(ctx: BlueprintContext, entities: UnifiedEntity[], pages: UnifiedPage[]): number {
    let confidence = 0.5;

    // Higher confidence with intelligence data
    if (ctx.intelligence) {
      confidence += 0.2 * (ctx.intelligence.confidence || 0.5);
    }

    // Higher confidence with more entities
    if (entities.length >= 2) confidence += 0.1;
    if (entities.length >= 4) confidence += 0.1;

    // Higher confidence with detected features
    if (ctx.intelligence?.features && ctx.intelligence.features.length > 2) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1);
  }

  private generateSuggestions(schema: UnifiedAppSchema, ctx: BlueprintContext): string[] {
    const suggestions: string[] = [];

    // Suggest adding more entities if only one
    if (schema.entities.length === 1) {
      suggestions.push(`Would you like to add related data types to ${schema.entities[0].pluralName}?`);
    }

    // Suggest features based on entity types
    for (const entity of schema.entities) {
      if (entity.behaviors?.includes('schedulable') && !schema.pages.find(p => p.type === 'calendar')) {
        suggestions.push(`Would you like a calendar view for ${entity.pluralName}?`);
      }

      if (entity.behaviors?.includes('billable') && !schema.entities.find(e => e.id === 'invoice')) {
        suggestions.push('Would you like to add invoicing capabilities?');
      }
    }

    // Suggest theme customization
    if (!ctx.themePreference) {
      suggestions.push('You can customize the look by saying "make it more modern" or "use a minimal style".');
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  private hasFeature(schema: UnifiedAppSchema, featureId: string): boolean {
    // Check if feature is already implemented via entities/pages
    switch (featureId) {
      case 'invoicing':
        return schema.entities.some(e => e.id === 'invoice');
      case 'calendar':
        return schema.pages.some(p => p.type === 'calendar');
      case 'kanban':
        return schema.pages.some(p => p.type === 'kanban');
      default:
        return false;
    }
  }

  private extractMainNoun(text: string): string | null {
    const cleaned = text
      .toLowerCase()
      .replace(/^(build|create|make|design|develop)\s+(me\s+)?(an?\s+)?/i, '')
      .replace(/\s+(app|application|system|tool|manager|tracker)$/i, '')
      .trim();

    const words = cleaned.split(/\s+/);
    return words[0] || null;
  }

  private generateId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + 
      '-' + 
      randomUUID().slice(0, 8);
  }

  private toTitleCase(str: string): string {
    return str.replace(/\b\w/g, c => c.toUpperCase());
  }

  // ============================================================
  // MULTI-SURFACE SUPPORT
  // ============================================================

  /**
   * Build surfaces configuration based on pages and context
   */
  private buildSurfacesConfig(pages: UnifiedPage[], ctx: BlueprintContext): SurfacesConfig {
    const hasStaffPages = pages.some(p => p.surface === 'staff');
    const hasCustomerPages = pages.some(p => p.surface === 'customer');
    const hasProviderPages = pages.some(p => p.surface === 'provider');
    const hasPatientPages = pages.some(p => p.surface === 'patient');

    // Detect if we need staff surface based on features or industry
    const needsStaffSurface = hasStaffPages || 
      ctx.intelligence?.features?.some(f => 
        ['multi_location', 'operators', 'field_staff', 'location_staff'].includes(f.id)
      );

    // Detect if we need customer surface
    const needsCustomerSurface = hasCustomerPages ||
      ctx.intelligence?.features?.some(f =>
        ['customer_portal', 'tenant_portal', 'member_portal', 'online_ordering', 'booking'].includes(f.id)
      );

    return {
      admin: {
        enabled: true,
        defaultPage: pages.find(p => !p.surface || p.surface === 'admin')?.id,
      },
      staff: {
        enabled: needsStaffSurface || hasStaffPages,
        defaultPage: pages.find(p => p.surface === 'staff')?.id || 'staff-dashboard',
        features: {
          viewAssignedLocation: true,
          viewAssignedItems: true,
          processItems: true,
          updateItemStatus: true,
          viewWorkQueue: true,
        },
      },
      provider: {
        enabled: hasProviderPages,
        defaultPage: pages.find(p => p.surface === 'provider')?.id,
      },
      customer: {
        enabled: needsCustomerSurface || hasCustomerPages,
        defaultPage: pages.find(p => p.surface === 'customer')?.id || 'customer-portal',
        features: {
          manageProfile: true,
          viewHistory: true,
          makePayments: true,
          receiveNotifications: true,
        },
      },
      patient: {
        enabled: hasPatientPages,
        defaultPage: pages.find(p => p.surface === 'patient')?.id,
      },
    };
  }

  /**
   * Build navigation for a specific surface (staff, customer, provider, patient)
   */
  private buildSurfaceNavigation(
    pages: UnifiedPage[],
    entities: UnifiedEntity[],
    surface: 'staff' | 'customer' | 'provider' | 'patient',
    ctx: BlueprintContext
  ): CustomerNavigation | undefined {
    // Filter pages for this surface
    const surfacePages = pages.filter(p => p.surface === surface);
    
    // If no pages for this surface, return undefined
    if (surfacePages.length === 0) return undefined;

    const defaultPage = surfacePages.find(p => 
      p.type === 'dashboard' || p.id.includes('portal') || p.id.includes('dashboard')
    ) || surfacePages[0];

    // Build sidebar groups for this surface
    const groups = this.buildSurfaceSidebarGroups(surfacePages, surface);

    return {
      sidebar: {
        enabled: true,
        position: 'left',
        collapsible: true,
        groups,
        footerItems: [
          { action: 'logout', label: 'Log Out', icon: '🚪' },
        ],
      },
      navbar: {
        enabled: true,
        showLogo: true,
        showSearch: surface === 'staff',
        showNotifications: true,
        ...(surface === 'customer' ? { showCart: true, showProfile: true } : {}),
      },
      rules: surfacePages.map(page => ({
        id: `nav-${surface}-to-${page.id}`,
        from: '*',
        to: page.id,
        trigger: 'link' as const,
      })),
      defaultPage: defaultPage.id,
      quickLinks: surfacePages.slice(0, 4).map(p => ({
        pageId: p.id,
        label: p.name,
        icon: p.icon,
      })),
    };
  }

  /**
   * Build sidebar groups for a specific surface
   */
  private buildSurfaceSidebarGroups(
    pages: UnifiedPage[],
    surface: string
  ): NonNullable<CustomerNavigation['sidebar']>['groups'] {
    const groups: NonNullable<CustomerNavigation['sidebar']>['groups'] = [];

    // Main group for dashboard/portal
    const mainPages = pages.filter(p => 
      p.type === 'dashboard' || p.id.includes('portal') || p.id.includes('dashboard')
    );
    if (mainPages.length > 0) {
      groups.push({
        id: 'main',
        items: mainPages.map(p => ({
          pageId: p.id,
          label: p.name,
          icon: p.icon || '🏠',
        })),
      });
    }

    // Work/Tasks group (for staff)
    if (surface === 'staff') {
      const workPages = pages.filter(p => 
        p.id.includes('queue') || p.id.includes('task') || p.id.includes('work') ||
        p.type === 'list' || p.type === 'kanban'
      );
      if (workPages.length > 0) {
        groups.push({
          id: 'work',
          label: 'Work Queue',
          items: workPages.map(p => ({
            pageId: p.id,
            label: p.name,
            icon: p.icon || '📋',
          })),
        });
      }
    }

    // Items/Data group
    const dataPages = pages.filter(p => 
      p.type === 'list' && !mainPages.includes(p)
    );
    if (dataPages.length > 0) {
      groups.push({
        id: 'data',
        label: surface === 'customer' ? 'My Items' : 'Items',
        items: dataPages.map(p => ({
          pageId: p.id,
          label: p.name,
          icon: p.icon || '📦',
        })),
      });
    }

    // Account/Profile group (for customers)
    if (surface === 'customer' || surface === 'patient') {
      const accountPages = pages.filter(p =>
        p.id.includes('profile') || p.id.includes('settings') || 
        p.id.includes('billing') || p.id.includes('account')
      );
      if (accountPages.length > 0) {
        groups.push({
          id: 'account',
          label: 'Account',
          items: accountPages.map(p => ({
            pageId: p.id,
            label: p.name,
            icon: p.icon || '👤',
          })),
        });
      }
    }

    return groups;
  }
}

// Export singleton for convenience
export const neoBlueprintEngine = new NeoBlueprintEngine();
