import OpenAI from 'openai';
import type { AIProvider } from './types.js';

export interface OpenAIProviderConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
  maxRetries?: number;
  timeout?: number;
}

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private config: {
    apiKey: string;
    model: string;
    baseURL?: string;
    maxRetries: number;
    timeout: number;
  };

  constructor(config: OpenAIProviderConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'gpt-4o-mini', // Using mini for cost efficiency, can use gpt-4o for better quality
      baseURL: config.baseURL,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000, // 30 seconds
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });
  }

  async complete(
    params: {
      prompt: string;
      maxTokens: number;
      temperature: number;
      timeout: number;
      schema?: any;
      systemPrompt?: string;
    },
    onCostCalculated?: (totalTokens: number, breakdown: { prompt: number; completion: number }) => void
  ): Promise<unknown> {
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      if (params.systemPrompt) {
        messages.push({
          role: 'system',
          content: params.systemPrompt,
        });
      }

      messages.push({
        role: 'user',
        content: params.prompt,
      });

      const completionParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        model: this.config.model,
        messages,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
      };

      // Add structured output if schema provided (OpenAI function calling or response_format)
      if (params.schema) {
        // Use JSON mode for structured output (available in newer models)
        if (this.config.model.includes('gpt-4') || this.config.model.includes('gpt-3.5')) {
          completionParams.response_format = { type: 'json_object' };
        }
      }

      const response = await Promise.race([
        this.client.chat.completions.create(completionParams),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('OpenAI request timeout')), params.timeout)
        ),
      ]);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in AI response');
      }

      // Calculate and report cost
      const usage = response.usage;
      if (usage && onCostCalculated) {
        // Cost calculation would be done by CostTracker
        onCostCalculated(usage.total_tokens, {
          prompt: usage.prompt_tokens || 0,
          completion: usage.completion_tokens || 0,
        });
      }

      // Parse JSON response
      try {
        return JSON.parse(content);
      } catch {
        // If not JSON, return as string (fallback)
        return content;
      }
    } catch (error: any) {
      // Check for authentication errors
      if (error?.status === 401 || error?.message?.includes('API key') || error?.message?.includes('authentication') || error?.message?.includes('Invalid API key')) {
        throw new Error('Invalid or missing API key. Please check your OPENAI_API_KEY environment variable.');
      }
      // Check for rate limit errors
      if (error?.status === 429 || error?.message?.includes('rate limit')) {
        throw new Error('API rate limit exceeded. Please try again later.');
      }
      // Check for timeout
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('AI request timeout');
      }
      // Generic error
      throw new Error(`OpenAI API error: ${error?.message || 'Unknown error'}`);
    }
  }

  async generateAppSchema(userInput: string, category: string, context?: Record<string, unknown>): Promise<any> {
    const systemPrompt = `You are an expert app designer and developer. Your job is to generate complete, production-ready app schemas based on user descriptions.

CRITICAL RULES:
1. Generate ONLY valid JSON matching this structure:
{
  "pages": [{"id": "string", "name": "string", "route": "string", "layout": {}, "components": []}],
  "dataModels": [{"id": "string", "name": "string", "fields": [{"id": "string", "name": "string", "type": "string", "required": boolean, "reference": {"targetModel": "string", "displayField": "string"}}]}],
  "components": [],
  "flows": [
    {
      "id": "create-item-flow",
      "name": "Create Item",
      "enabled": true,
      "trigger": {"type": "form_submit", "componentId": "add-item-form"},
      "actions": [{"type": "create_record", "modelId": "item", "message": "Item created successfully"}]
    }
  ]
}

2. NEVER include executable code, scripts, or dangerous patterns
3. Use appropriate field types: string, number, boolean, date, email, url, phone, reference

4. FLOWS ARE REQUIRED FOR INTERACTIVITY - Generate flows for every form and action button:
   - Forms MUST have flows with trigger type "form_submit" and action type "create_record"
   - Delete buttons MUST have flows with trigger type "button_click" and action type "delete_record"
   - Edit/Update buttons MUST have flows with trigger type "button_click" and action type "update_record"
   - Navigation buttons can use action type "navigate" with targetPageId
   
   Flow structure:
   {
     "id": "unique-flow-id",
     "name": "Human readable name",
     "enabled": true,
     "trigger": {
       "type": "form_submit" or "button_click",
       "componentId": "id-of-the-button-or-form-component"
     },
     "actions": [
       {
         "type": "create_record" or "update_record" or "delete_record" or "navigate" or "show_notification" or "refresh_data",
         "modelId": "target-data-model-id",
         "message": "Success message to show user"
       }
     ]
   }
   
   IMPORTANT: Every button with an action purpose (Add, Delete, Edit, Save) MUST have a corresponding flow.
   IMPORTANT: Every form MUST have a flow to handle submission with the form's componentId in the trigger.
   IMPORTANT: The trigger.componentId MUST exactly match the component's id in the page components.

5. Create realistic, useful schemas that match the user's intent
6. Include 2-5 pages for navigation
7. Create 1-3 data models with relevant fields
8. Make routes RESTful (e.g., /items, /items/:id, /dashboard)
9. Component IDs should be descriptive (e.g., "item-list", "contact-form", "add-task-btn")

COMPONENT AND FLOW EXAMPLES:

Example 1 - Form with Create Flow:
Component:
{
  "id": "task-form",
  "componentId": "form",
  "props": {"submitLabel": "Add Task"},
  "children": [
    {"id": "task-title-input", "componentId": "input", "props": {"name": "title", "label": "Task Title", "required": true}}
  ]
}
Flow:
{
  "id": "create-task-flow",
  "name": "Create Task",
  "enabled": true,
  "trigger": {"type": "form_submit", "componentId": "task-form"},
  "actions": [{"type": "create_record", "modelId": "task", "message": "Task added!"}]
}

Example 2 - Delete Button with Delete Flow:
Component:
{
  "id": "delete-task-btn",
  "componentId": "button",
  "props": {"label": "Delete", "variant": "secondary"}
}
Flow:
{
  "id": "delete-task-flow",
  "name": "Delete Task",
  "enabled": true,
  "trigger": {"type": "button_click", "componentId": "delete-task-btn"},
  "actions": [{"type": "delete_record", "modelId": "task", "message": "Task deleted"}]
}

RELATIONAL DATA MODELING (CRITICAL):
When a user describes entities that 'belong to', 'are part of', 'are assigned to', 'are linked to', 'are checked out by', 'are placed by', or have ownership/relationship patterns, use the 'reference' field type instead of creating redundant text or ID fields.

Rule of Thumb:
- If Entity A has many Entity Bs (One-to-Many relationship), Entity B MUST have a reference field pointing to Entity A
- Use the format: {"type": "reference", "reference": {"targetModel": "EntityA", "displayField": "name"}}

Relationship Detection Patterns:
- "Tasks inside a Project" → Task model has reference field to Project
- "Books checked out by Members" → Loan model has reference fields to Book and Member
- "Orders placed by Customers" → Order model has reference field to Customer
- "Comments on a Post" → Comment model has reference field to Post
- "Assignments to Students" → Assignment model has reference field to Student
- "Items in an Order" → OrderItem model has reference fields to Order and Item

Reference Field Requirements:
- When type is "reference", MUST include: reference.targetModel, reference.displayField
- targetModel must match an existing model's id (use lowercase, singular form)
- displayField should be a meaningful field from the target model (usually "name", "title", "fullName", or similar)
- Use camelCase for field ids (e.g., "projectId", "customerId", "bookId")
- The field name should be descriptive (e.g., "Project", "Customer", "Book")

Examples of correct reference fields:
{
  "id": "projectId",
  "name": "Project",
  "type": "reference",
  "required": true,
  "reference": {
    "targetModel": "project",
    "displayField": "name"
  }
}

DO NOT create redundant string fields when a reference relationship exists. Use reference type instead.

Category: ${category}
Generate a schema that fits this category and user's needs. REMEMBER: Every form and action button MUST have a corresponding flow for interactivity!`;

    const userPrompt = `User request: ${userInput}

${context ? `\nContext: ${JSON.stringify(context, null, 2)}` : ''}

Generate a complete app schema as JSON.`;

    const response = await this.complete({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 4000,
      temperature: 0.7, // Slightly creative for better schema generation
      timeout: 60000, // 60 seconds for schema generation
      schema: true, // Enable JSON mode
    });

    return response;
  }

  async generateAppName(userInput: string, category: string): Promise<string> {
    const systemPrompt = `Generate a concise, memorable app name (2-4 words) based on the user's description and category. Return ONLY the name, nothing else.`;

    const response = await this.complete({
      prompt: `User description: ${userInput}\nCategory: ${category}\n\nGenerate an app name:`,
      systemPrompt,
      maxTokens: 20,
      temperature: 0.8,
      timeout: 10000,
    });

    if (typeof response === 'string') {
      return response.trim().replace(/^["']|["']$/g, '');
    }
    if (typeof response === 'object' && response !== null && 'name' in response) {
      return String(response.name);
    }
    return `${category} App`;
  }

  async generateDescription(userInput: string): Promise<string> {
    const systemPrompt = `Generate a brief app description (1-2 sentences, max 200 characters) based on the user's input. Return ONLY the description.`;

    const response = await this.complete({
      prompt: `User request: ${userInput}\n\nGenerate a brief description:`,
      systemPrompt,
      maxTokens: 50,
      temperature: 0.7,
      timeout: 10000,
    });

    if (typeof response === 'string') {
      return response.trim().replace(/^["']|["']$/g, '');
    }
    if (typeof response === 'object' && response !== null && 'description' in response) {
      return String(response.description);
    }
    return userInput.length > 200 ? userInput.substring(0, 197) + '...' : userInput;
  }
}
