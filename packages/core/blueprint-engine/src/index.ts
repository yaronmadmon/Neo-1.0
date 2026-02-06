/**
 * Blueprint Engine
 * Core engine for app generation and management
 * 
 * This is the single source of truth for building apps in Neo.
 * 
 * Architecture:
 * 1. Blueprint Engine - Takes processed intent → produces AppBlueprint
 * 2. Page Materializer - Takes AppBlueprint → produces renderable UI
 * 3. Workflow Engine - Converts workflows to executable actions
 * 4. Data Generator - Creates tables, fields, and sample data
 * 5. Voice Editor - Modifies blueprints via voice/text commands
 * 6. Behavior Bundles - Pre-defined app patterns (CRM, Inventory, etc.)
 */

// Types
export * from './types.js';

// Blueprint Engine (Phase 1)
export { BlueprintEngine, blueprintEngine } from './blueprint-engine.js';

// Page Materializer (Phase 2)
export { 
  PageMaterializer, 
  pageMaterializer,
  type MaterializedComponent,
  type MaterializedPage,
  type MaterializedApp,
  type MaterializationContext,
} from './page-materializer.js';

// Workflow Engine (Phase 3)
export {
  WorkflowEngine,
  WorkflowGenerator,
  workflowEngine,
  workflowGenerator,
  type WorkflowContext,
  type WorkflowAPI,
  type ActionResult,
  type WorkflowResult,
} from './workflow-engine.js';

// Voice Workflow Parser (Phase 6)
export {
  VoiceWorkflowParser,
  voiceWorkflowParser,
  normalizeTriggerType,
  type VoiceWorkflowParseResult,
} from './voice-workflow-parser.js';

// Voice Integrations Parser (Phase 9)
export {
  VoiceIntegrationsParser,
  voiceIntegrationsParser,
  type VoiceIntegrationParseResult,
} from './voice-integrations-parser.js';

// App Analysis (Phase 10)
export * from './app-analysis/index.js';
export { AppInsightsEngine, appInsightsEngine } from './app-analysis/app-insights-engine.js';

// Voice App Coach (Phase 10)
export {
  VoiceAppCoach,
  voiceAppCoach,
  type CoachResponse,
} from './voice-app-coach.js';

// App Explainer (Phase 10)
export {
  explainApp,
  answerQuestion,
  type AppExplanation,
} from './app-explainer.js';

// App Improvement Applier (Phase 10)
export {
  applyAppImprovements,
} from './app-improvement-applier.js';

// Theme Engine (Phase 7)
export {
  VoiceThemeParser,
  voiceThemeParser,
  colorNameToHex,
  generateColorPalette,
  type VoiceThemeCommand,
  type ThemeParseResult,
} from './theme-engine.js';

// Data Generator (Phase 4)
export {
  DataGenerator,
  dataGenerator,
  type GeneratedRecord,
  type GeneratedData,
  type TableSchema,
  type DatabaseSchema,
} from './data-generator.js';

// Voice Editor (Phase 5)
export {
  VoiceEditor,
  voiceEditor,
  type VoiceCommand,
  type CommandIntent,
  type ExtractedEntities,
  type EditResult,
  type Change,
} from './voice-editor.js';

// Error Hardener (Phase 7)
export {
  ErrorHardener,
  errorHardener,
  type ValidationIssue,
  type ValidationResult,
} from './error-hardener.js';

// Behavior Bundles (Phase 6)
export {
  type BehaviorBundle,
  CRMBundle,
  InventoryBundle,
  FitnessBundle,
  RealEstateBundle,
  HomeManagementBundle,
  CookingBundle,
  ServicesBundle,
  PlumberBundle,
  TaskBundle,
  HabitBundle,
  BEHAVIOR_BUNDLES,
  getBehaviorBundle,
  detectBehavior,
  getAllBehaviorBundles,
} from './behavior-bundles.js';

// New Industry Intelligence + Blueprint stack
export { RequirementsEngine } from './lib/discovery/RequirementsEngine.js';
export { AppBlueprintEngine } from './lib/blueprint/AppBlueprintEngine.js';
export { ProfessionExpander } from './lib/blueprint/ProfessionExpander.js';
export { PageGenerator, type CustomerFeatures, type PageGeneratorInput } from './lib/materializer/PageGenerator.js';
export { WorkflowEngine as BlueprintWorkflowEngine } from './lib/workflows/WorkflowEngine.js';
export { DataModelGenerator } from './lib/data/DataModelGenerator.js';
export { LayoutEngine } from './lib/ui/LayoutEngine.js';
export { listIndustryKits, getIndustryKit } from './kits/industries/index.js';
export type { IndustryKit, IndustryKitId, IndustryEntitySpec, IndustryFieldSpec } from './kits/industries/types.js';
export { listBehaviorBundleSpecs, getBehaviorBundleSpec } from './behaviors/index.js';

// ============================================================
// PHASE 1: INTELLIGENCE LAYER (Voice-First Understanding)
// ============================================================
// The complete natural language understanding system for audio-first app creation
// Note: We export with namespace to avoid conflicts with core types
export { 
  NeoIntelligence, 
  neoIntelligence,
  NLPEngine,
  IndustryMapper,
  FeatureDetector,
  EntityInferenceEngine,
  WorkflowInferenceEngine,
  UILayoutSelector,
  BehaviorMatcher,
  VoiceRevisionEngine,
} from './intelligence/index.js';

// Export intelligence types with explicit naming to avoid conflicts
export type {
  VoiceInput,
  AppContext as IntelligenceAppContext,
  ParsedInput,
  IndustryMapping,
  DetectedFeature,
  InferredEntity,
  InferredWorkflow,
  SelectedLayout,
  MatchedBehavior,
  RevisionResult,
  IntelligenceResult,
} from './intelligence/types.js';

// ============================================================
// PHASE 2: DNA SYSTEM (Complete Blueprint Generation)
// ============================================================
// The DNA system generates complete multi-page apps from voice input
export {
  AppSchema,
  PageBuilder,
  EntityBuilder,
  WorkflowBuilder,
  NavigationBuilder,
  ThemeBuilder,
  DataModelInference,
  NeoBlueprintEngine,
  neoBlueprintEngine,
} from './dna/index.js';

// Export DNA types
export type {
  UnifiedAppSchema,
  PageBuildContext,
  EntityBuildContext,
  WorkflowBuildContext,
  NavigationBuildContext,
  ThemeBuildContext,
  DataModelContext,
} from './dna/index.js';
export type { NeoRole, NeoAccessRule, NeoPermissions } from './dna/index.js';
export {
  hasRolePermission,
  ROLE_HIERARCHY,
  createDefaultPermissions,
  createPageAccessRule,
  createFieldAccessRule,
  createRowAccessRule,
  createActionAccessRule,
} from './dna/index.js';

// ============================================================
// DESIGN SYSTEMS (Research-Based Visual Layer)
// ============================================================
// Core design systems with psychological intent, industry mappings,
// and cohesive visual configurations
export {
  DESIGN_SYSTEMS,
  INDUSTRY_DESIGN_SYSTEM_MAP,
  getDesignSystem,
  getDesignSystemForIndustry,
  getDesignSystemByIntent,
  designSystemToTheme,
  listDesignSystems,
  hasDesignSystemMapping,
  validateThemeCoherence,
} from './dna/index.js';
export type {
  DesignSystem,
  DesignSystemId,
  DesignSystemPalette,
  DesignSystemTypography,
  DesignSystemSpacing,
  DesignSystemShadows,
  DesignSystemAnimations,
} from './dna/index.js';

// ============================================================
// DASHBOARD INTENT SYSTEM (Phase 18 - Semantic Dashboard Layer)
// ============================================================
// Story, hierarchy, KPIs, and actions with domain personality
export {
  // Generator
  generateDashboardIntent,
  getIndustrySectionConfig,
  extendIndustrySectionConfig,
  INDUSTRY_SECTION_CONFIGS,
  // Entity analysis
  findStatusEntities,
  findSchedulableEntities,
  findPrimaryDateField,
  findStatusField,
  findMetricFields,
  // Ordering constants
  ROLE_ORDER,
  PRIORITY_ORDER,
  ACTIONABLE_ROLES,
  // Time scope helpers
  TIME_SCOPE_LABELS,
  TIME_SCOPE_SHORT_LABELS,
  TIME_SCOPE_FILTERS,
  filterByTimeScope,
  // Action helpers
  shouldShowAction,
  filterVisibleActions,
  // Validation
  validateSection,
  validateDashboardIntent,
  // Sorting
  sortSections,
  // Display helpers
  formatMetricLabel,
  canHaveActions,
  inferLayoutHint,
} from './dna/index.js';

export type {
  SectionRole,
  SectionPriority,
  TimeScope,
  LayoutHint,
  EmphasisLevel,
  ActionVisibilityRule,
  DomainMetric,
  ContextualAction,
  DashboardSection,
  DashboardIntent,
  IndustrySectionConfig,
} from './dna/index.js';

// ============================================================
// MERGER SYSTEM (AI Pipeline Integration)
// ============================================================
// Merges industry kits with AI customizations and validates for Studio
export {
  AppMerger,
  createAppMerger,
  type BuildExplanation,
  type MergeResult,
} from './merger/app-merger.js';

export {
  StudioValidator,
  createStudioValidator,
  validateForStudio,
  type ValidationIssue as MergerValidationIssue,
  type ValidationResult as MergerValidationResult,
  type ValidationOptions,
} from './merger/studio-validator.js';

// ============================================================
// APP CONFIGURATION (Kit + Configuration Layer)
// ============================================================
// Controls how kits are presented without modifying the kits themselves
// Key concepts: Terminology, Feature Visibility, Defaults, Sample Data
export {
  // Types
  type FeatureVisibility,
  type ComplexityLevel,
  type PrimaryView,
  type LocationStyle,
  type EntityTerminology,
  type FeatureVisibilityConfig,
  type ViewDefaults,
  type SampleDataContext,
  type DiscoveryContext,
  type ConfigurationAssumptions,
  type AppConfiguration,
  type PartialAppConfiguration,
  type KitDefaultConfiguration,
  type DiscoveryOutput,
  type SampleRecord,
  type GeneratedSampleData,
  // Kit defaults
  getKitDefaults,
  getKitsWithDefaults,
  hasKitDefaults,
  // Configuration builder
  buildConfiguration,
  mergeConfiguration,
  createMinimalConfiguration,
  // Sample data generator
  generateSampleData,
  generateWelcomeMessage,
  generateSetupSummary,
} from './app-configuration/index.js';

// ============================================================
// UNIFIED API
// ============================================================

import { BlueprintEngine } from './blueprint-engine.js';
import { PageMaterializer } from './page-materializer.js';
import { DataGenerator } from './data-generator.js';
import { AppBlueprintEngine } from './lib/blueprint/AppBlueprintEngine.js';
import { DataModelGenerator } from './lib/data/DataModelGenerator.js';
import { VoiceEditor } from './voice-editor.js';
import { NeoIntelligence } from './intelligence/index.js';
import { NeoBlueprintEngine } from './dna/neo-blueprint-engine.js';
import { AppMerger, type BuildExplanation, type MergeResult } from './merger/app-merger.js';
import { StudioValidator, type ValidationResult as StudioValidationResult } from './merger/studio-validator.js';
import { getIndustryKit } from './kits/industries/index.js';
import type { AppBlueprint, ProcessedIntent } from './types.js';
import type { MaterializedApp } from './page-materializer.js';
import type { GeneratedData } from './data-generator.js';
import type { IntelligenceResult, VoiceInput, AppContext, RevisionResult } from './intelligence/types.js';
import type { BlueprintResult } from './dna/neo-blueprint-engine.js';

/**
 * Complete app generation result
 */
export interface GeneratedAppResult {
  blueprint: AppBlueprint;
  materializedApp: MaterializedApp;
  sampleData: GeneratedData;
}

/**
 * AI Pipeline generation result with explanation
 */
export interface AIPipelineResult extends GeneratedAppResult {
  /** Build explanation documenting what was built and why */
  explanation: BuildExplanation;
  /** Studio validation result */
  validation: StudioValidationResult;
  /** Industry kit that was used */
  kitUsed: string;
  /** Whether the pipeline used the full AI flow or fell back */
  usedAIPipeline: boolean;
}

/**
 * Main unified API for app generation
 */
export class NeoEngine {
  private blueprintEngine: BlueprintEngine;
  private appBlueprintEngine: AppBlueprintEngine;
  private dnaEngine: NeoBlueprintEngine;
  private pageMaterializer: PageMaterializer;
  private dataGenerator: DataGenerator;
  private dataModelGenerator: DataModelGenerator;
  private voiceEditor: VoiceEditor;
  private intelligence: NeoIntelligence;
  private appMerger: AppMerger;
  private studioValidator: StudioValidator;

  constructor() {
    this.blueprintEngine = new BlueprintEngine();
    this.appBlueprintEngine = new AppBlueprintEngine();
    this.dnaEngine = new NeoBlueprintEngine();
    this.pageMaterializer = new PageMaterializer();
    this.dataGenerator = new DataGenerator();
    this.dataModelGenerator = new DataModelGenerator();
    this.voiceEditor = new VoiceEditor();
    this.intelligence = new NeoIntelligence();
    this.appMerger = new AppMerger();
    this.studioValidator = new StudioValidator({ autoFix: true });
  }

  /**
   * Understand voice input using the Intelligence Layer
   * Returns a complete understanding of what the user wants
   */
  async understand(input: string | VoiceInput): Promise<IntelligenceResult> {
    const voiceInput: VoiceInput = typeof input === 'string' 
      ? { text: input }
      : input;
    
    return this.intelligence.understand(voiceInput);
  }

  /**
   * Generate a complete app from processed intent
   */
  async generateApp(intent: ProcessedIntent): Promise<GeneratedAppResult> {
    // Step 1: Generate blueprint
    const blueprint = this.appBlueprintEngine.generate(intent);

    // Extract industry context from intent for visual blocks
    const discoveredInfo = intent.discoveredInfo as {
      industry?: string;
      primaryIntent?: 'operations' | 'customer-facing' | 'internal' | 'hybrid';
      context?: Record<string, unknown>;
      features?: string[];
    } | undefined;

    // Build materialization context with industry info
    const materializationContext = this.buildMaterializationContext(discoveredInfo);

    // Step 2: Materialize into renderable format with context
    const materializedApp = this.pageMaterializer.materialize(blueprint, materializationContext);

    // Step 3: Generate sample data with enhanced templates
    const sampleData = this.dataGenerator.generateSampleData(blueprint);

    return {
      blueprint,
      materializedApp,
      sampleData,
    };
  }

  /**
   * Build materialization context from discovered info
   * NOW INCLUDES KIT'S DASHBOARD TEMPLATE for industry-specific layouts
   */
  private buildMaterializationContext(discoveredInfo?: {
    industry?: string;
    primaryIntent?: 'operations' | 'customer-facing' | 'internal' | 'hybrid';
    features?: string[];
  }): import('./page-materializer.js').MaterializationContext {
    if (!discoveredInfo?.industry) {
      return {};
    }

    // Get the industry kit to access its dashboard template
    const kit = getIndustryKit(discoveredInfo.industry as any);

    // Map industry to dashboard type (use kit's dashboardType if available)
    const industryToDashboardType: Record<string, 'operations' | 'sales' | 'service' | 'health'> = {
      'gym': 'health',
      'fitness-coach': 'health',
      'medical': 'health',
      'home-health': 'health',
      'salon': 'service',
      'spa': 'service',
      'plumber': 'service',
      'electrician': 'service',
      'contractor': 'service',
      'tutor': 'service',
      'cleaning': 'service',
      'commercial-cleaning': 'service',
      'ecommerce': 'sales',
      'retail': 'sales',
      'real-estate': 'sales',
      'property-management': 'operations',
      'restaurant': 'operations',
      'cafe': 'operations',
      'bakery': 'operations',
    };

    const dashboardType = kit.dashboardType || industryToDashboardType[discoveredInfo.industry] || 'operations';

    return {
      industry: {
        id: discoveredInfo.industry,
        name: kit.name || discoveredInfo.industry.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        dashboardType,
      },
      features: discoveredInfo.features || [],
      // Pass kit's dashboard template for industry-specific KPIs, charts, and lists
      dashboardTemplate: kit.dashboardTemplate,
      // Pass kit's terminology for proper entity naming
      terminology: kit.terminology,
    };
  }

  /**
   * Generate app using the AI Pipeline (2-call system)
   * This uses industry kits + AI customizations for intelligent app building
   * 
   * @param intent - Processed intent with discoveredInfo from AI Understanding
   * @returns AIPipelineResult with blueprint, explanation, and validation
   */
  async generateAppWithAIPipeline(intent: ProcessedIntent): Promise<AIPipelineResult> {
    // Extract discovered info from intent
    const discoveredInfo = intent.discoveredInfo as {
      industry?: string;
      primaryIntent?: 'operations' | 'customer-facing' | 'internal' | 'hybrid';
      context?: Record<string, unknown>;
      teamSize?: string;
    } | undefined;

    // Determine industry and primary intent
    const industryId = discoveredInfo?.industry || 
      intent.extractedDetails?.category || 
      'general_business';
    
    const primaryIntent = discoveredInfo?.primaryIntent || 'operations';

    // Get the industry kit
    const kit = getIndustryKit(industryId as any);

    // Build understanding result for merger
    const understanding = {
      industry: kit.id,
      primaryIntent: primaryIntent as 'operations' | 'customer-facing' | 'internal' | 'hybrid',
      confidence: 0.85, // Default confidence for discovered info
      context: {
        teamSize: discoveredInfo?.teamSize as 'solo' | 'small' | 'medium' | 'large' | undefined,
        features: intent.extractedDetails?.features || [],
        preferences: [],
      },
      suggestedQuestions: [],
    };

    // Use the merger to combine kit with any customizations
    // Note: For now, we pass null for customizations since the AI customization
    // service would need to be called separately (requires AIProvider)
    const mergeResult = this.appMerger.merge(
      kit,
      null, // Customizations would come from AICustomizationService
      understanding,
      intent.rawInput
    );

    // Validate the blueprint for Studio compatibility
    const validation = this.studioValidator.validate(mergeResult.blueprint);

    // Use the validated/fixed blueprint if auto-fix was applied
    const finalBlueprint = validation.blueprint || mergeResult.blueprint;

    // Build materialization context with industry info
    const materializationContext = this.buildMaterializationContext({
      industry: discoveredInfo?.industry,
      primaryIntent: discoveredInfo?.primaryIntent,
      features: intent.extractedDetails?.features,
    });

    // Materialize into renderable format with context
    const materializedApp = this.pageMaterializer.materialize(finalBlueprint, materializationContext);

    // Generate sample data with enhanced templates
    const sampleData = this.dataGenerator.generateSampleData(finalBlueprint);

    return {
      blueprint: finalBlueprint,
      materializedApp,
      sampleData,
      explanation: mergeResult.explanation,
      validation,
      kitUsed: kit.id,
      usedAIPipeline: true,
    };
  }

  /**
   * Get the app merger for direct access
   */
  getAppMerger(): AppMerger {
    return this.appMerger;
  }

  /**
   * Get the studio validator for direct access
   */
  getStudioValidator(): StudioValidator {
    return this.studioValidator;
  }

  /**
   * Generate app from voice input with full intelligence understanding
   * This is the primary voice-first API
   */
  async generateAppFromVoice(input: string | VoiceInput): Promise<GeneratedAppResult & { understanding: IntelligenceResult }> {
    // Step 1: Understand the voice input
    const understanding = await this.understand(input);
    
    // Step 2: Convert understanding to processed intent
    const intent: ProcessedIntent = {
      rawInput: typeof input === 'string' ? input : input.text,
      type: 'create_app',
      behavior: understanding.behavior?.id,
      extractedDetails: {
        category: understanding.industry.id,
        appName: undefined,
        entities: understanding.entities.map(e => ({
          name: e.name,
          fields: e.fields.map(f => ({ name: f.name, type: f.type })),
        })),
        pages: understanding.layout.secondaryLayouts.map(l => ({
          name: l,
          type: l,
        })),
      },
    };
    
    // Step 3: Generate the app
    const result = await this.generateApp(intent);
    
    return {
      ...result,
      understanding,
    };
  }

  /**
   * Process voice revision on an existing app
   */
  async processVoiceRevision(
    input: string | VoiceInput,
    appContext: AppContext
  ): Promise<RevisionResult> {
    const voiceInput: VoiceInput = typeof input === 'string'
      ? { text: input, appContext }
      : { ...input, appContext };
    
    return this.intelligence.revise(voiceInput, appContext);
  }

  /**
   * Apply a voice/text command to an existing app
   */
  async applyCommand(
    blueprint: AppBlueprint,
    command: string
  ): Promise<{
    result: import('./voice-editor.js').EditResult;
    materializedApp: MaterializedApp;
    sampleData: GeneratedData;
  }> {
    // Apply the voice command
    const result = await this.voiceEditor.processCommand(blueprint, command);

    if (!result.success) {
      return {
        result,
        materializedApp: this.pageMaterializer.materialize(blueprint),
        sampleData: this.dataGenerator.generateSampleData(blueprint),
      };
    }

    // Re-materialize
    const materializedApp = this.pageMaterializer.materialize(result.newBlueprint);

    // Update data if needed
    const sampleData = this.dataGenerator.generateSampleData(result.newBlueprint);

    return {
      result,
      materializedApp,
      sampleData,
    };
  }

  /**
   * Create a minimal app from raw text input
   */
  async createAppFromInput(input: string): Promise<GeneratedAppResult> {
    // Create a simple processed intent
    const intent: ProcessedIntent = {
      rawInput: input,
      type: 'create_app',
    };

    return this.generateApp(intent);
  }

  /**
   * Get the intelligence layer for direct access
   */
  getIntelligence(): NeoIntelligence {
    return this.intelligence;
  }

  /**
   * Generate a complete app using the DNA Blueprint Engine (Phase 2)
   * This is the most powerful generation method, producing complete multi-page apps
   */
  async generateWithDNA(input: string | VoiceInput): Promise<BlueprintResult & { materializedApp: MaterializedApp }> {
    // Step 1: Understand the voice input
    const voiceInput: VoiceInput = typeof input === 'string' 
      ? { text: input }
      : input;
    
    const understanding = await this.intelligence.understand(voiceInput);
    
    // Step 2: Generate blueprint using DNA engine
    const blueprintResult = await this.dnaEngine.generate({
      voiceInput,
      intelligence: understanding,
      industry: understanding.industry.id,
    });
    
    // Step 3: Convert DNA schema to legacy AppBlueprint for materialization
    // (Future: PageMaterializer will be updated to use UnifiedAppSchema directly)
    const legacyBlueprint = this.convertToLegacyBlueprint(blueprintResult.schema);
    
    // Build materialization context from understanding
    const materializationContext = this.buildMaterializationContext({
      industry: understanding.industry?.id,
      features: understanding.features?.map(f => f.id) || [],
    });
    
    // Step 4: Materialize into renderable format with context
    const materializedApp = this.pageMaterializer.materialize(legacyBlueprint, materializationContext);
    
    return {
      ...blueprintResult,
      materializedApp,
    };
  }

  /**
   * Convert UnifiedAppSchema to legacy AppBlueprint
   * This is a compatibility layer until all systems use UnifiedAppSchema
   */
  private convertToLegacyBlueprint(schema: import('./dna/schema.js').UnifiedAppSchema): AppBlueprint {
    // Type-safe conversion with explicit casts where needed
    const mapLayoutType = (type: string): 'single-column' | 'two-column' | 'sidebar-left' | 'sidebar-right' | 'dashboard-grid' | 'full-width' => {
      const typeMap: Record<string, 'single-column' | 'two-column' | 'sidebar-left' | 'sidebar-right' | 'dashboard-grid' | 'full-width'> = {
        'single_column': 'single-column',
        'two_column': 'two-column',
        'sidebar_left': 'sidebar-left',
        'sidebar_right': 'sidebar-right',
        'dashboard_grid': 'dashboard-grid',
        'full_width': 'full-width',
      };
      return typeMap[type] || 'single-column';
    };

    const mapPageType = (type: string): 'list' | 'detail' | 'form' | 'dashboard' | 'calendar' | 'kanban' | 'table' | 'grid' | 'timeline' | 'map' | 'chart' | 'custom' => {
      const validTypes = ['list', 'detail', 'form', 'dashboard', 'calendar', 'kanban', 'table', 'grid', 'timeline', 'map', 'chart', 'custom'];
      return validTypes.includes(type) ? type as any : 'custom';
    };

    return {
      id: schema.id,
      version: schema.version,
      name: schema.name,
      description: schema.description,
      behavior: schema.behavior,
      entities: schema.entities.map(e => ({
        id: e.id,
        name: e.name,
        pluralName: e.pluralName,
        description: e.description,
        icon: e.icon,
        fields: e.fields.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type as import('./types.js').FieldType,
          required: f.required ?? false,
          unique: f.unique,
          defaultValue: f.defaultValue,
          description: f.description,
          enumOptions: f.enumOptions,
          reference: f.reference ? {
            targetEntity: f.reference.entity,
            displayField: f.reference.displayField,
            relationship: 'many-to-many' as const,
          } : undefined,
          displayOptions: f.display,
        })),
        displayConfig: e.display,
        timestamps: e.timestamps,
      })),
      pages: schema.pages.map(p => ({
        id: p.id,
        name: p.name,
        route: p.route,
        type: mapPageType(p.type),
        icon: p.icon,
        entity: p.entity,
        layout: {
          type: mapLayoutType(p.layout.type),
          sections: p.layout.sections.map((s: any) => ({
            id: s.id,
            type: s.type,
            title: s.title,
            collapsed: s.collapsed,
            width: s.width,
            components: s.components,
          })),
          responsive: p.layout.responsive ? {
            mobile: p.layout.responsive.mobile?.type as 'stack' | 'hide-sidebar' | 'bottom-nav' | undefined,
            tablet: p.layout.responsive.tablet?.collapseSidebar ? 'collapse-sidebar' : 'show-all' as 'collapse-sidebar' | 'show-all' | undefined,
          } : undefined,
        },
        components: p.components.map((c: any) => ({
          id: c.id,
          type: c.type,
          props: c.props,
          bindings: c.bindings,
          events: c.events,
          children: c.children?.map((child: any) => ({
            id: child.id,
            type: child.type,
            props: child.props,
          })),
          styles: c.styles,
          conditions: c.conditions,
        })),
        navigation: p.navigation,
        settings: p.config ? {
          pagination: p.config.pagination ? {
            enabled: p.config.pagination.enabled,
            pageSize: p.config.pagination.pageSize,
          } : undefined,
          search: p.config.search ? {
            enabled: p.config.search.enabled,
            placeholder: p.config.search.placeholder || '',
          } : undefined,
          filters: p.config.filters?.map((f: any) => ({
            field: f.field,
            type: f.type === 'date_range' ? 'date-range' : 
                  f.type === 'number_range' ? 'number-range' :
                  f.type === 'boolean' ? 'select' : f.type,
          })),
        } : undefined,
      })),
      workflows: schema.workflows.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        enabled: w.enabled,
        trigger: {
          type: w.trigger.type as any,
          componentId: w.trigger.componentId,
          entityId: w.trigger.entityId,
          fieldId: w.trigger.fieldId,
          condition: w.trigger.condition,
        },
        actions: w.actions.map((a: any) => ({
          id: a.id,
          type: a.type,
          config: a.config,
          condition: a.condition,
          thenActions: a.thenActions?.map((ta: any) => ({
            id: ta.id,
            type: ta.type,
            config: ta.config,
          })),
          elseActions: a.elseActions?.map((ea: any) => ({
            id: ea.id,
            type: ea.type,
            config: ea.config,
          })),
        })),
        onError: w.onError ? {
          action: w.onError.action === 'notify' ? 'stop' : w.onError.action,
          notification: w.onError.notification,
        } : undefined,
      })),
      navigation: {
        rules: schema.navigation.rules,
        defaultPage: schema.navigation.defaultPage,
        sidebar: schema.navigation.sidebar ? {
          enabled: schema.navigation.sidebar.enabled,
          position: schema.navigation.sidebar.position,
          collapsible: schema.navigation.sidebar.collapsible,
          items: schema.navigation.sidebar.groups.flatMap(g => 
            g.items.map(item => ({
              pageId: item.pageId,
              icon: item.icon,
              label: item.label,
              badge: item.badge,
            }))
          ),
        } : undefined,
      },
      theme: {
        primaryColor: schema.theme.colors.primary,
        secondaryColor: schema.theme.colors.secondary,
        accentColor: schema.theme.colors.accent,
        mode: schema.theme.mode,
        borderRadius: schema.theme.spacing?.borderRadius === 'none' ? 'none' :
                      schema.theme.spacing?.borderRadius === 'sm' ? 'small' :
                      schema.theme.spacing?.borderRadius === 'lg' ? 'large' : 'medium',
        fontFamily: schema.theme.typography?.fontFamily,
        // Extended design system support
        typography: schema.theme.typography,
        spacing: schema.theme.spacing,
        shadows: schema.theme.shadows,
        animations: schema.theme.animations,
        // Custom CSS variables from design system (includes --neo-design-system)
        customVars: schema.theme.customVars,
      },
      settings: schema.settings,
    };
  }

  /**
   * Get the DNA Blueprint Engine for direct access
   */
  getDNAEngine(): NeoBlueprintEngine {
    return this.dnaEngine;
  }
}

// Export singleton
export const neoEngine = new NeoEngine();
