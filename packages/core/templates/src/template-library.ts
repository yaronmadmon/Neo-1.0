import { AppCategory, type UserIntent } from '@neo/contracts';

export interface AppTemplate {
  id: string;
  name: string;
  description: string;
  category: AppCategory;
  keywords: string[];
  schema: any; // Simplified for now
}

export class TemplateLibrary {
  private templates: Map<AppCategory, AppTemplate[]> = new Map();

  constructor() {
    this.loadTemplates();
  }

  async findBestMatch(intent: UserIntent, category: AppCategory): Promise<AppTemplate | null> {
    const categoryTemplates = this.templates.get(category) || [];

    if (categoryTemplates.length === 0) {
      return null;
    }

    // Score templates based on keyword matching
    const scores = categoryTemplates.map((template) => ({
      template,
      score: this.calculateSimilarity(intent, template),
    }));

    scores.sort((a, b) => b.score - a.score);
    const bestMatch = scores[0];

    // Only return if score is above threshold (30% match)
    return bestMatch.score > 0.3 ? bestMatch.template : null;
  }

  private calculateSimilarity(intent: UserIntent, template: AppTemplate): number {
    const input = intent.input.toLowerCase();
    const templateKeywords = template.keywords.map((k) => k.toLowerCase());

    // Count keyword matches
    const matches = templateKeywords.filter((keyword) => input.includes(keyword)).length;

    // Return score between 0 and 1
    return templateKeywords.length > 0 ? matches / templateKeywords.length : 0;
  }

  private loadTemplates() {
    // Business templates
    this.templates.set(AppCategory.BUSINESS, [
      {
        id: 'crm',
        name: 'CRM System',
        description: 'Customer relationship management system',
        category: AppCategory.BUSINESS,
        keywords: ['customer', 'client', 'sales', 'contacts', 'leads', 'crm'],
        schema: this.getBasicCRMSchema(),
      },
      {
        id: 'project-management',
        name: 'Project Manager',
        description: 'Task and project management system',
        category: AppCategory.BUSINESS,
        keywords: ['project', 'task', 'team', 'kanban', 'gantt', 'management'],
        schema: this.getBasicProjectSchema(),
      },
    ]);

    // Personal templates
    this.templates.set(AppCategory.PERSONAL, [
      {
        id: 'habit-tracker',
        name: 'Habit Tracker',
        description: 'Track and build habits',
        category: AppCategory.PERSONAL,
        keywords: ['habit', 'track', 'daily', 'routine', 'goal'],
        schema: this.getBasicHabitTrackerSchema(),
      },
      {
        id: 'finance-tracker',
        name: 'Personal Finance',
        description: 'Track expenses and budget',
        category: AppCategory.PERSONAL,
        keywords: ['money', 'expense', 'budget', 'finance', 'spending'],
        schema: this.getBasicFinanceSchema(),
      },
    ]);

    // Home templates
    this.templates.set(AppCategory.HOME, [
      {
        id: 'family-hub',
        name: 'Family Hub',
        description: 'Coordinate family life',
        category: AppCategory.HOME,
        keywords: ['family', 'home', 'chores', 'calendar', 'shared'],
        schema: this.getBasicFamilyHubSchema(),
      },
      {
        id: 'home-inventory',
        name: 'Home Inventory',
        description: 'Track home inventory',
        category: AppCategory.HOME,
        keywords: ['inventory', 'items', 'home', 'belongings', 'warranty'],
        schema: this.getBasicInventorySchema(),
      },
    ]);

    // Health templates
    this.templates.set(AppCategory.HEALTH, [
      {
        id: 'fitness-tracker',
        name: 'Fitness Tracker',
        description: 'Track workouts and health',
        category: AppCategory.HEALTH,
        keywords: ['fitness', 'workout', 'health', 'exercise', 'gym'],
        schema: this.getBasicFitnessSchema(),
      },
    ]);

    // Add empty arrays for other categories
    this.templates.set(AppCategory.CREATIVE, []);
    this.templates.set(AppCategory.EDUCATION, []);
  }

  // Template schema generators
  private getBasicCRMSchema() {
    return {
      pages: [
        {
          id: 'contacts',
          name: 'Contacts',
          route: '/contacts',
          layout: { type: 'list' },
          components: [],
        },
      ],
      dataModels: [
        {
          id: 'contact',
          name: 'Contact',
          fields: [
            { id: 'name', name: 'Name', type: 'string', required: true },
            { id: 'email', name: 'Email', type: 'email', required: true },
            { id: 'phone', name: 'Phone', type: 'phone', required: false },
          ],
        },
      ],
      components: [],
      flows: [],
    };
  }

  private getBasicProjectSchema() {
    return {
      pages: [
        {
          id: 'projects',
          name: 'Projects',
          route: '/projects',
          layout: { type: 'board' },
          components: [],
        },
      ],
      dataModels: [
        {
          id: 'project',
          name: 'Project',
          fields: [
            { id: 'title', name: 'Title', type: 'string', required: true },
            { id: 'description', name: 'Description', type: 'string', required: false },
            { id: 'status', name: 'Status', type: 'string', required: true, defaultValue: 'todo' },
          ],
        },
      ],
      components: [],
      flows: [],
    };
  }

  private getBasicHabitTrackerSchema() {
    return {
      pages: [
        {
          id: 'habits',
          name: 'My Habits',
          route: '/habits',
          layout: { type: 'grid' },
          components: [],
        },
      ],
      dataModels: [
        {
          id: 'habit',
          name: 'Habit',
          fields: [
            { id: 'name', name: 'Name', type: 'string', required: true },
            { id: 'frequency', name: 'Frequency', type: 'string', required: true },
            { id: 'streak', name: 'Current Streak', type: 'number', required: false, defaultValue: 0 },
          ],
        },
      ],
      components: [],
      flows: [],
    };
  }

  private getBasicFinanceSchema() {
    return {
      pages: [
        {
          id: 'expenses',
          name: 'Expenses',
          route: '/expenses',
          layout: { type: 'list' },
          components: [],
        },
      ],
      dataModels: [
        {
          id: 'expense',
          name: 'Expense',
          fields: [
            { id: 'amount', name: 'Amount', type: 'number', required: true },
            { id: 'category', name: 'Category', type: 'string', required: true },
            { id: 'date', name: 'Date', type: 'date', required: true },
            { id: 'description', name: 'Description', type: 'string', required: false },
          ],
        },
      ],
      components: [],
      flows: [],
    };
  }

  private getBasicFamilyHubSchema() {
    return {
      pages: [
        {
          id: 'dashboard',
          name: 'Family Dashboard',
          route: '/',
          layout: { type: 'dashboard' },
          components: [],
        },
        {
          id: 'calendar',
          name: 'Calendar',
          route: '/calendar',
          layout: { type: 'calendar' },
          components: [],
        },
      ],
      dataModels: [
        {
          id: 'chore',
          name: 'Chore',
          fields: [
            { id: 'title', name: 'Title', type: 'string', required: true },
            { id: 'assignedTo', name: 'Assigned To', type: 'string', required: false },
            { id: 'completed', name: 'Completed', type: 'boolean', required: false, defaultValue: false },
          ],
        },
      ],
      components: [],
      flows: [],
    };
  }

  private getBasicInventorySchema() {
    return {
      pages: [
        {
          id: 'items',
          name: 'Inventory',
          route: '/items',
          layout: { type: 'grid' },
          components: [],
        },
      ],
      dataModels: [
        {
          id: 'item',
          name: 'Item',
          fields: [
            { id: 'name', name: 'Name', type: 'string', required: true },
            { id: 'category', name: 'Category', type: 'string', required: false },
            { id: 'location', name: 'Location', type: 'string', required: false },
            { id: 'purchaseDate', name: 'Purchase Date', type: 'date', required: false },
          ],
        },
      ],
      components: [],
      flows: [],
    };
  }

  private getBasicFitnessSchema() {
    return {
      pages: [
        {
          id: 'workouts',
          name: 'Workouts',
          route: '/workouts',
          layout: { type: 'list' },
          components: [],
        },
      ],
      dataModels: [
        {
          id: 'workout',
          name: 'Workout',
          fields: [
            { id: 'type', name: 'Type', type: 'string', required: true },
            { id: 'duration', name: 'Duration (minutes)', type: 'number', required: false },
            { id: 'date', name: 'Date', type: 'date', required: true },
          ],
        },
      ],
      components: [],
      flows: [],
    };
  }
}
