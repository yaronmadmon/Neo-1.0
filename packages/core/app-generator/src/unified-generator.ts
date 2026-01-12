import { randomUUID } from 'node:crypto';
import { AppCategory, AppPrivacyLevel, FieldType, type App, type UserIntent, type UserPreferences } from '@neo/contracts';
import { TemplateLibrary, type AppTemplate } from '@neo/templates';
import { IntentProcessor, type AIProvider } from '@neo/ai-engine';
import { SafetyOrchestrator } from '@neo/safety';
import { AppSchema } from '@neo/contracts';
import { SafetyError } from '@neo/contracts';
import { DiscoveryService, type DiscoveredInfo } from '@neo/discovery';

export class UnifiedAppGenerator {
  private discoveryService: DiscoveryService;

  constructor(
    private intentProcessor: IntentProcessor,
    private templates: TemplateLibrary,
    private safetyOrchestrator: SafetyOrchestrator,
    private aiProvider?: AIProvider
  ) {
    this.discoveryService = new DiscoveryService();
  }

  async generateApp(
    rawInput: string,
    preferences?: UserPreferences
  ): Promise<{ app: App; safety: any }> {
    // Step 1: Process intent
    const intentResult = await this.intentProcessor.processIntent(rawInput, {
      preferences,
    });

    if (!intentResult.intent || !intentResult.safety.safe) {
      throw new SafetyError('Intent processing failed', intentResult.safety);
    }

    const intent = intentResult.intent;

    // Step 2: Determine app category
    const category = preferences?.category || (await this.detectCategory(intent));

    // Step 3: Find best template match
    const template = await this.templates.findBestMatch(intent, category);

    // Step 4: Generate schema (use AI if available, otherwise template-based)
    const schema = await this.generateSchema(intent, template, category);

    // Step 5: Generate name and description
    const appName = await this.generateName(intent, category);
    const appDescription = await this.generateDescription(intent);

    // Step 5.5: Inject description into schema components
    if (appDescription && schema.pages?.[0]?.components) {
      const descComponent = schema.pages[0].components.find(
        (c: any) => c.id === 'description'
      );
      if (descComponent && descComponent.props) {
        descComponent.props.text = appDescription;
      }
    }

    // Step 6: Safety validation
    const mockAppForValidation: Partial<App> = {
      schema,
      category,
      name: appName,
    };
    
    const safetyCheck = await this.safetyOrchestrator.validateApp(
      mockAppForValidation as App
    );
    
    if (!safetyCheck.safe) {
      throw new SafetyError('Generated app failed safety checks', safetyCheck);
    }

    // Step 7: Enhance with smart defaults
    const enhanced = await this.enhanceWithDefaults(schema, category);

    // Step 7.5: Ensure description is injected into enhanced schema (in case enhancement cloned it)
    if (appDescription && enhanced.pages?.[0]?.components) {
      const descComponent = enhanced.pages[0].components.find(
        (c: any) => c.id === 'description'
      );
      if (descComponent && descComponent.props) {
        descComponent.props.text = appDescription;
      }
    }

    // Step 8: Generate mock data
    const data = await this.generateMockData(enhanced, category);

    // Step 9: Generate theme (category-aware)
    const theme = await this.generateTheme(category, preferences);

    // Step 10: Determine privacy level
    const privacyLevel = await this.determinePrivacyLevel(intent, preferences);

    // Step 11: Create final app
    const app: App = {
      id: randomUUID(),
      name: appName,
      description: appDescription,
      category,
      privacyLevel,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: preferences?.userId || randomUUID(),
      schema: enhanced,
      theme,
      data,
      settings: {
        offline: category === AppCategory.PERSONAL || category === AppCategory.HOME,
        notifications: true,
        analytics: preferences?.enableAnalytics ?? true,
      },
    };

    // Final safety check
    const finalSafetyCheck = await this.safetyOrchestrator.validateApp(app);

    return {
      app,
      safety: finalSafetyCheck,
    };
  }

  private async detectCategory(intent: UserIntent): Promise<AppCategory> {
    const keywords: Record<AppCategory, string[]> = {
      [AppCategory.BUSINESS]: ['business', 'company', 'team', 'office', 'work', 'enterprise', 'professional'],
      [AppCategory.PERSONAL]: ['personal', 'my', 'me', 'individual', 'myself', 'track', 'manage'],
      [AppCategory.HOME]: ['home', 'family', 'household', 'chores', 'family', 'house'],
      [AppCategory.CREATIVE]: ['art', 'design', 'creative', 'portfolio', 'artwork', 'gallery'],
      [AppCategory.HEALTH]: ['health', 'fitness', 'wellness', 'workout', 'diet', 'exercise'],
      [AppCategory.EDUCATION]: ['learn', 'study', 'course', 'education', 'school', 'student'],
    };

    const input = intent.input.toLowerCase();

    // Score each category
    const scores = Object.entries(keywords).map(([category, words]) => ({
      category: category as AppCategory,
      score: words.filter((word) => input.includes(word)).length,
    }));

    const bestMatch = scores.reduce((a, b) => (a.score > b.score ? a : b));
    return bestMatch.score > 0 ? bestMatch.category : AppCategory.PERSONAL; // Default to personal
  }

  private async generateSchema(
    intent: UserIntent,
    template: AppTemplate | null,
    category: AppCategory
  ): Promise<any> {
    // If AI provider is available and has schema generation, use it
    // Skip if it's the mock provider (returns null) - let enhanced generator handle it
    if (this.aiProvider && typeof this.aiProvider.generateAppSchema === 'function') {
      try {
        const aiSchema = await this.aiProvider.generateAppSchema(
          intent.input,
          category
        );
        // Only use AI schema if it's a valid non-null object with content
        if (aiSchema && typeof aiSchema === 'object' && 
            aiSchema.pages && Array.isArray(aiSchema.pages) && 
            (aiSchema.dataModels?.length > 0 || aiSchema.components?.length > 0)) {
          return aiSchema;
        }
        // If null or empty, fall through to enhanced generator
      } catch (error) {
        console.warn('AI schema generation failed, falling back to enhanced generator:', error);
      }
    }

    // Fallback to template-based generation
    if (template && template.schema) {
      return await this.customizeTemplate(template, intent);
    }

    // Generate from scratch (basic implementation)
    return await this.generateBasicSchema(intent, category);
  }

  private async customizeTemplate(template: AppTemplate, intent: UserIntent): Promise<any> {
    // For now, return template schema as-is
    // In production, customize based on intent
    return template.schema;
  }

  private async generateBasicSchema(intent: UserIntent, category: AppCategory): Promise<any> {
    // Analyze intent to generate meaningful schema
    const input = intent.input.toLowerCase();
    
    // Determine app type based on keywords
    const isTodoApp = input.includes('todo') || input.includes('task') || input.includes('todo list');
    const isHabitTracker = input.includes('habit') || input.includes('routine') || input.includes('track');
    const isCrm = input.includes('crm') || input.includes('customer') || input.includes('client');
    const isInventory = input.includes('inventory') || input.includes('stock') || input.includes('item');
    const isFinance = input.includes('finance') || input.includes('expense') || input.includes('budget') || input.includes('money');
    const isNoteApp = input.includes('note') || input.includes('document');
    
    // Generate schema based on detected app type
    if (isTodoApp) {
      return this.generateTodoAppSchema(category);
    } else if (isHabitTracker) {
      return this.generateHabitTrackerSchema(category);
    } else if (isCrm) {
      return this.generateCrmSchema(category);
    } else if (isInventory) {
      return this.generateInventorySchema(category);
    } else if (isFinance) {
      return this.generateFinanceSchema(category);
    } else if (isNoteApp) {
      return this.generateNoteAppSchema(category);
    }
    
    // Default: Generate a basic functional app
    return this.generateDefaultAppSchema(intent, category);
  }

  /**
   * Generate schema for project tracker with tasks assigned to projects
   * Demonstrates reference fields in action
   */
  private generateProjectTaskAppSchema(category: AppCategory): any {
    return {
      pages: [
        {
          id: 'projects',
          name: 'Projects',
          route: '/',
          layout: { type: 'default' },
          components: [
            {
              id: 'header',
              componentId: 'text',
              props: { text: 'Projects', variant: 'h1' },
            },
            {
              id: 'project-list',
              componentId: 'list',
              props: { source: 'project' },
            },
          ],
        },
        {
          id: 'project-tasks',
          name: 'Project Tasks',
          route: '/projects/:id/tasks',
          layout: { type: 'default' },
          components: [
            {
              id: 'task-list',
              componentId: 'list',
              props: { source: 'task', filterBy: 'projectId' },
            },
          ],
        },
      ],
      dataModels: [
        {
          id: 'project',
          name: 'Project',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'name', name: 'Name', type: 'string', required: true },
            { id: 'description', name: 'Description', type: 'string' },
            { id: 'status', name: 'Status', type: 'string', defaultValue: 'active' },
            { id: 'createdAt', name: 'Created At', type: 'date' },
          ],
        },
        {
          id: 'task',
          name: 'Task',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'title', name: 'Title', type: 'string', required: true },
            { id: 'description', name: 'Description', type: 'string' },
            { 
              id: 'projectId', 
              name: 'Project', 
              type: FieldType.REFERENCE, 
              required: true,
              reference: {
                targetModel: 'project',
                displayField: 'name',
              },
            },
            { id: 'completed', name: 'Completed', type: 'boolean', defaultValue: false },
            { id: 'priority', name: 'Priority', type: 'string', defaultValue: 'medium' },
            { id: 'createdAt', name: 'Created At', type: 'date' },
          ],
        },
      ],
      components: [],
      flows: [],
    };
  }

  /**
   * Generate schema for order management with customer references
   */
  private generateOrderCustomerAppSchema(category: AppCategory): any {
    return {
      pages: [
        {
          id: 'customers',
          name: 'Customers',
          route: '/',
          layout: { type: 'default' },
          components: [
            {
              id: 'customer-list',
              componentId: 'table',
              props: { source: 'customer', columns: ['name', 'email', 'phone'] },
            },
          ],
        },
        {
          id: 'orders',
          name: 'Orders',
          route: '/orders',
          layout: { type: 'default' },
          components: [
            {
              id: 'order-list',
              componentId: 'table',
              props: { source: 'order', columns: ['orderNumber', 'customer', 'total', 'status'] },
            },
          ],
        },
      ],
      dataModels: [
        {
          id: 'customer',
          name: 'Customer',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'name', name: 'Name', type: 'string', required: true },
            { id: 'email', name: 'Email', type: 'email', required: true },
            { id: 'phone', name: 'Phone', type: 'phone' },
            { id: 'address', name: 'Address', type: 'string' },
          ],
        },
        {
          id: 'order',
          name: 'Order',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'orderNumber', name: 'Order Number', type: 'string', required: true },
            { 
              id: 'customerId', 
              name: 'Customer', 
              type: FieldType.REFERENCE, 
              required: true,
              reference: {
                targetModel: 'customer',
                displayField: 'name',
              },
            },
            { id: 'total', name: 'Total', type: 'number', required: true },
            { id: 'status', name: 'Status', type: 'string', defaultValue: 'pending' },
            { id: 'orderDate', name: 'Order Date', type: 'date', required: true },
          ],
        },
      ],
      components: [],
      flows: [],
    };
  }

  private generateTodoAppSchema(category: AppCategory): any {
    return {
      pages: [
        {
          id: 'main',
          name: 'Tasks',
          route: '/',
          layout: { type: 'default' },
          components: [
            {
              id: 'header',
              componentId: 'text',
              props: { text: 'My Tasks', variant: 'h1' },
            },
            {
              id: 'add-task-form',
              componentId: 'form',
              props: { submitLabel: 'Add Task' },
              children: [
                {
                  id: 'task-input',
                  componentId: 'input',
                  props: { label: 'Task Name', placeholder: 'Enter a new task...', required: true },
                },
              ],
            },
            {
              id: 'task-list',
              componentId: 'list',
              props: { source: 'task' }, // Match data model ID
            },
          ],
        },
      ],
      dataModels: [
        {
          id: 'task',
          name: 'Task',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'title', name: 'Title', type: 'string', required: true },
            { id: 'completed', name: 'Completed', type: 'boolean', defaultValue: false },
            { id: 'createdAt', name: 'Created At', type: 'date' },
            { id: 'priority', name: 'Priority', type: 'string', defaultValue: 'medium' },
          ],
        },
      ],
      components: [],
      flows: [
        {
          id: 'add-task',
          name: 'Add Task',
          trigger: { type: 'form_submit', componentId: 'add-task-form' },
          actions: [
            { type: 'create_record', model: 'task', source: 'form_data' },
            { type: 'refresh_list', componentId: 'task-list' },
          ],
        },
        {
          id: 'toggle-task',
          name: 'Toggle Task Complete',
          trigger: { type: 'click', componentId: 'task-item' },
          actions: [
            { type: 'update_record', model: 'task', field: 'completed', value: 'toggle' },
          ],
        },
      ],
    };
  }

  private generateHabitTrackerSchema(category: AppCategory): any {
    return {
      pages: [
        {
          id: 'main',
          name: 'Habits',
          route: '/',
          layout: { type: 'default' },
          components: [
            {
              id: 'header',
              componentId: 'text',
              props: { text: 'My Habits', variant: 'h1' },
            },
            {
              id: 'habit-list',
              componentId: 'list',
              props: { source: 'habit', showStreak: true }, // Match data model ID
            },
            {
              id: 'add-habit-btn',
              componentId: 'button',
              props: { label: 'Add New Habit', action: 'open_modal', modalId: 'add-habit-modal' },
            },
          ],
        },
      ],
      dataModels: [
        {
          id: 'habit',
          name: 'Habit',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'name', name: 'Name', type: 'string', required: true },
            { id: 'frequency', name: 'Frequency', type: 'string', defaultValue: 'daily' },
            { id: 'streak', name: 'Current Streak', type: 'number', defaultValue: 0 },
            { id: 'lastCompleted', name: 'Last Completed', type: 'date' },
          ],
        },
      ],
      components: [],
      flows: [],
    };
  }

  private generateCrmSchema(category: AppCategory): any {
    return {
      pages: [
        {
          id: 'contacts',
          name: 'Contacts',
          route: '/',
          layout: { type: 'default' },
          components: [
            {
              id: 'header',
              componentId: 'text',
              props: { text: 'Customer Contacts', variant: 'h1' },
            },
            {
              id: 'contacts-table',
              componentId: 'table',
              props: { source: 'contact', columns: ['name', 'email', 'company', 'status'] }, // Match data model ID
            },
          ],
        },
        {
          id: 'add-contact',
          name: 'Add Contact',
          route: '/add',
          layout: { type: 'default' },
          components: [
            {
              id: 'contact-form',
              componentId: 'form',
              props: { submitLabel: 'Save Contact' },
            },
          ],
        },
      ],
      dataModels: [
        {
          id: 'contact',
          name: 'Contact',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'name', name: 'Name', type: 'string', required: true },
            { id: 'email', name: 'Email', type: 'email', required: true },
            { id: 'phone', name: 'Phone', type: 'phone' },
            { id: 'company', name: 'Company', type: 'string' },
            { id: 'status', name: 'Status', type: 'string', defaultValue: 'lead' },
          ],
        },
      ],
      components: [],
      flows: [],
    };
  }

  private generateInventorySchema(category: AppCategory): any {
    return {
      pages: [
        {
          id: 'main',
          name: 'Inventory',
          route: '/',
          layout: { type: 'default' },
          components: [
            {
              id: 'header',
              componentId: 'text',
              props: { text: 'Inventory Management', variant: 'h1' },
            },
            {
              id: 'inventory-list',
              componentId: 'list',
              props: { source: 'item', showQuantity: true }, // Match data model ID
            },
          ],
        },
      ],
      dataModels: [
        {
          id: 'item',
          name: 'Inventory Item',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'name', name: 'Item Name', type: 'string', required: true },
            { id: 'quantity', name: 'Quantity', type: 'number', required: true, defaultValue: 0 },
            { id: 'unit', name: 'Unit', type: 'string', defaultValue: 'pieces' },
            { id: 'category', name: 'Category', type: 'string' },
          ],
        },
      ],
      components: [],
      flows: [],
    };
  }

  private generateFinanceSchema(category: AppCategory): any {
    return {
      pages: [
        {
          id: 'dashboard',
          name: 'Dashboard',
          route: '/',
          layout: { type: 'default' },
          components: [
            {
              id: 'balance-card',
              componentId: 'card',
              props: { title: 'Current Balance', value: 'total_balance' },
            },
            {
              id: 'transactions-list',
              componentId: 'list',
              props: { source: 'transaction', showAmount: true }, // Match data model ID
            },
          ],
        },
        {
          id: 'add-transaction',
          name: 'Add Transaction',
          route: '/add',
          layout: { type: 'default' },
          components: [
            {
              id: 'transaction-form',
              componentId: 'form',
              props: { submitLabel: 'Add Transaction' },
            },
          ],
        },
      ],
      dataModels: [
        {
          id: 'transaction',
          name: 'Transaction',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'description', name: 'Description', type: 'string', required: true },
            { id: 'amount', name: 'Amount', type: 'number', required: true },
            { id: 'type', name: 'Type', type: 'string', required: true, defaultValue: 'expense' },
            { id: 'category', name: 'Category', type: 'string' },
            { id: 'date', name: 'Date', type: 'date', required: true },
          ],
        },
      ],
      components: [],
      flows: [],
    };
  }

  private generateNoteAppSchema(category: AppCategory): any {
    return {
      pages: [
        {
          id: 'notes',
          name: 'Notes',
          route: '/',
          layout: { type: 'default' },
          components: [
            {
              id: 'notes-grid',
              componentId: 'list',
              props: { source: 'note', view: 'grid' }, // Match data model ID
            },
            {
              id: 'add-note-btn',
              componentId: 'button',
              props: { label: 'New Note', action: 'navigate', route: '/new' },
            },
          ],
        },
        {
          id: 'edit-note',
          name: 'Edit Note',
          route: '/:id',
          layout: { type: 'default' },
          components: [
            {
              id: 'note-editor',
              componentId: 'form',
              props: { source: 'note', submitLabel: 'Save Note' },
            },
          ],
        },
      ],
      dataModels: [
        {
          id: 'note',
          name: 'Note',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'title', name: 'Title', type: 'string', required: true },
            { id: 'content', name: 'Content', type: 'string' },
            { id: 'createdAt', name: 'Created At', type: 'date' },
            { id: 'updatedAt', name: 'Updated At', type: 'date' },
          ],
        },
      ],
      components: [],
      flows: [],
    };
  }

  private generateDefaultAppSchema(intent: UserIntent, category: AppCategory): any {
    // Generate a basic but functional app structure
    return {
      pages: [
        {
          id: 'main',
          name: 'Main',
          route: '/',
          layout: { type: 'default' },
          components: [
            {
              id: 'welcome-header',
              componentId: 'text',
              props: { text: 'Welcome to Your App', variant: 'h1' },
            },
            {
              id: 'description',
              componentId: 'text',
              props: { text: '', variant: 'body' }, // Empty - will be set by cleaned description
            },
            {
              id: 'main-list',
              componentId: 'list',
              props: { source: 'item' }, // Match data model ID (singular)
            },
          ],
        },
      ],
      dataModels: [
        {
          id: 'item',
          name: 'Item',
          fields: [
            { id: 'id', name: 'ID', type: 'string', required: true },
            { id: 'name', name: 'Name', type: 'string', required: true },
            { id: 'description', name: 'Description', type: 'string' },
            { id: 'createdAt', name: 'Created At', type: 'date' },
          ],
        },
      ],
      components: [],
      flows: [],
    };
  }

  private async enhanceWithDefaults(schema: any, category: AppCategory): Promise<any> {
    // Add navigation if multiple pages
    if (schema.pages.length > 1) {
      // Add navigation component (placeholder)
    }

    // Add common patterns based on category
    if (category === AppCategory.HOME) {
      // Add family sharing defaults
    }

    return schema;
  }

  private async generateMockData(schema: any, category: AppCategory): Promise<Record<string, unknown[]>> {
    const data: Record<string, unknown[]> = {};
    const modelsWithRecords: Array<{ id: string; records: unknown[] }> = [];

    // First pass: Generate all model records (without reference links)
    if (schema.dataModels) {
      for (const model of schema.dataModels) {
        const records = this.generateModelData(model, category);
        data[model.id] = records;
        modelsWithRecords.push({ id: model.id, records });
      }
    }

    // Second pass: Link reference fields to actual records
    if (schema.dataModels) {
      for (const model of schema.dataModels) {
        const records = data[model.id];
        for (const record of records as Array<Record<string, unknown>>) {
          for (const field of model.fields || []) {
            if (field.type === FieldType.REFERENCE && field.reference) {
              // Find target model records
              const targetModelData = modelsWithRecords.find(m => m.id === field.reference.targetModel);
              if (targetModelData && targetModelData.records.length > 0) {
                // Randomly assign a reference to one of the target records
                const randomTargetRecord = targetModelData.records[Math.floor(Math.random() * targetModelData.records.length)] as Record<string, unknown>;
                record[field.id] = randomTargetRecord.id;
              }
            }
          }
        }
      }
    }

    return data;
  }

  private generateModelData(model: any, category: AppCategory): unknown[] {
    // Generate 3-5 sample records
    const count = 3;
    const records: unknown[] = [];

    for (let i = 0; i < count; i++) {
      const record: Record<string, unknown> = { id: randomUUID() };
      
      for (const field of model.fields || []) {
        record[field.id] = this.generateFieldValue(field, category);
      }

      records.push(record);
    }

    return records;
  }

  private generateFieldValue(field: any, category: AppCategory): unknown {
    switch (field.type) {
      case 'string':
        return `Sample ${field.name} ${Math.floor(Math.random() * 100)}`;
      case 'number':
        return Math.floor(Math.random() * 1000);
      case 'boolean':
        return Math.random() > 0.5;
      case 'date':
        return new Date().toISOString();
      case 'email':
        return `sample${Math.floor(Math.random() * 100)}@example.com`;
      case 'reference':
        // For reference fields, we'll need to generate a valid ID
        // This will be handled by the mock data generator after all models are created
        // For now, return null - it will be set when models are linked
        return null;
      default:
        return null;
    }
  }

  private async generateTheme(
    category: AppCategory,
    preferences?: UserPreferences
  ): Promise<any> {
    const baseThemes: Record<AppCategory, any> = {
      [AppCategory.BUSINESS]: {
        colors: {
          primary: '#2563eb',
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#1e293b',
          textSecondary: '#64748b',
        },
      },
      [AppCategory.PERSONAL]: {
        colors: {
          primary: '#8b5cf6',
          background: '#ffffff',
          surface: '#faf5ff',
          text: '#1e293b',
          textSecondary: '#64748b',
        },
      },
      [AppCategory.HOME]: {
        colors: {
          primary: '#10b981',
          background: '#ffffff',
          surface: '#f0fdf4',
          text: '#1e293b',
          textSecondary: '#64748b',
        },
      },
      [AppCategory.HEALTH]: {
        colors: {
          primary: '#ec4899',
          background: '#ffffff',
          surface: '#fdf2f8',
          text: '#1e293b',
          textSecondary: '#64748b',
        },
      },
      [AppCategory.CREATIVE]: {
        colors: {
          primary: '#f59e0b',
          background: '#ffffff',
          surface: '#fffbeb',
          text: '#1e293b',
          textSecondary: '#64748b',
        },
      },
      [AppCategory.EDUCATION]: {
        colors: {
          primary: '#06b6d4',
          background: '#ffffff',
          surface: '#ecfeff',
          text: '#1e293b',
          textSecondary: '#64748b',
        },
      },
    };

    const baseTheme = baseThemes[category] || baseThemes[AppCategory.PERSONAL];

    return {
      ...baseTheme,
      typography: {
        fontFamily: 'system-ui, sans-serif',
        fontSize: {
          small: '0.875rem',
          base: '1rem',
          large: '1.25rem',
        },
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
    };
  }

  private async generateName(intent: UserIntent, category: AppCategory): Promise<string> {
    // Use AI if available
    if (this.aiProvider && typeof this.aiProvider.generateAppName === 'function') {
      try {
        const name = await this.aiProvider.generateAppName(intent.input, category);
        if (name && name.length > 0) {
          // Clean the name - remove any "User Input:" or system prompt prefixes
          const cleaned = name.replace(/^User Input:\s*/i, '').replace(/^Analyze.*$/i, '').trim();
          if (cleaned && cleaned.length > 0) {
            return cleaned;
          }
        }
      } catch (error) {
        console.warn('AI name generation failed, using fallback:', error);
      }
    }

    // Fallback: Generate a better name from intent
    const input = intent.input.toLowerCase().trim();
    
    // Remove common prefixes
    let cleaned = input
      .replace(/^(build|create|make|design|develop)\s+/i, '')
      .replace(/\s+(app|application)$/i, '');
    
    // Extract key words (first 2-3 words)
    const words = cleaned.split(/\s+/).filter(w => w.length > 0).slice(0, 3);
    
    if (words.length > 0) {
      // Capitalize first letter of each word
      const capitalized = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return capitalized + ' App';
    }
    
    // Final fallback
    return `${category.charAt(0).toUpperCase() + category.slice(1)} App`;
  }

  private async generateDescription(intent: UserIntent): Promise<string> {
    // Use AI if available
    if (this.aiProvider && typeof this.aiProvider.generateDescription === 'function') {
      try {
        const description = await this.aiProvider.generateDescription(intent.input);
        if (description && description.length > 0) {
          // Clean description - remove system prompts and prefixes aggressively
          let cleaned = description
            // Remove "A User Input:" or "User Input:" at start
            .replace(/^(A\s+)?User\s+Input:\s*/i, '')
            // Remove Context blocks
            .replace(/Context:\s*\{[^}]*\}\s*/gi, '')
            .replace(/\{[\s\S]*?"preferences"[^}]*\}\s*/gi, '')
            // Remove system prompt instructions
            .replace(/Analyze the intent and return.*$/is, '')
            .replace(/as specified in the system prompt\.?/gi, '')
            // Remove common system prompt phrases
            .replace(/User Input:.*?Context:.*?Analyze the intent.*$/is, '')
            // Replace multiple newlines with single space
            .replace(/\n\s*\n+/g, ' ')
            .replace(/\n+/g, ' ')
            // Remove leading/trailing whitespace
            .trim();
          
          // Remove any remaining system prompt remnants
          if (cleaned.toLowerCase().includes('return the json response') || 
              cleaned.toLowerCase().includes('analyze the intent') ||
              cleaned.toLowerCase().startsWith('user input:')) {
            // Extract the actual description part (usually after the system prompt)
            const parts = cleaned.split(/analyze|return|system prompt|user input:/i);
            cleaned = parts[parts.length - 1]?.trim() || '';
          }
          
          // If description starts with common prefixes, remove them
          cleaned = cleaned.replace(/^(a|an|the)\s+/i, '').trim();
          
          // If we still have a valid description, use it
          if (cleaned.length > 0 && cleaned.length < 1000) {
            return cleaned;
          }
        }
      } catch (error) {
        console.warn('AI description generation failed, using fallback:', error);
      }
    }

    // Fallback: Generate a simple description from intent
    const input = intent.input.trim();
    if (input.length === 0) {
      return '';
    }
    
    // Clean input
    let cleaned = input
      .replace(/^(build|create|make|design|develop)\s+/i, '')
      .replace(/\s+(app|application)$/i, '')
      .trim();
    
    // Generate a simple description
    if (cleaned.length > 0) {
      return `A ${cleaned} application to help you manage and organize your tasks.`;
    }
    
    return '';
  }

  private async determinePrivacyLevel(
    intent: UserIntent,
    preferences?: UserPreferences
  ): Promise<AppPrivacyLevel> {
    // Default privacy based on category
    if (preferences?.privacyFirst) {
      return AppPrivacyLevel.PRIVATE;
    }

    const input = intent.input.toLowerCase();
    if (input.includes('family') || input.includes('home')) {
      return AppPrivacyLevel.FAMILY;
    }

    return AppPrivacyLevel.PRIVATE; // Default to private for safety
  }
}
