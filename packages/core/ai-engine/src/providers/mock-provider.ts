import type { AIProvider } from './types.js';

/**
 * Mock AI provider for development and testing
 * Falls back to keyword-based classification
 */
export class MockAIProvider implements AIProvider {
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
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Extract user input from prompt
    const userInput = params.prompt.split('USER REQUEST:')[1]?.split('\n')[0]?.trim() || 
                     params.prompt.split('User request:')[1]?.split('\n')[0]?.trim() ||
                     params.prompt;

    // Basic intent classification
    return {
      type: this.classifyIntent(userInput),
      input: userInput,
      confidence: 0.7,
    };
  }

  async generateAppSchema(userInput: string, category: string): Promise<any> {
    // Mock provider doesn't generate schemas - let the generator handle it
    // Return null to trigger fallback to enhanced generateBasicSchema
    return null;
  }

  async generateAppName(userInput: string, category: string): Promise<string> {
    const words = userInput.split(' ').slice(0, 3);
    return words.join(' ') || `${category} App`;
  }

  async generateDescription(userInput: string): Promise<string> {
    return userInput.length > 200 ? userInput.substring(0, 197) + '...' : userInput;
  }

  private classifyIntent(input: string): string {
    const lower = input.toLowerCase();
    
    if (lower.includes('modify') || lower.includes('change') || lower.includes('update')) {
      return 'modify_app';
    } else if (lower.includes('add') && (lower.includes('feature') || lower.includes('function'))) {
      return 'add_feature';
    } else if (lower.includes('design') || lower.includes('color') || lower.includes('theme')) {
      return 'change_design';
    } else if (lower.includes('data') || lower.includes('record') || lower.includes('item')) {
      return 'add_data';
    } else if (lower.includes('flow') || lower.includes('workflow') || lower.includes('process')) {
      return 'create_flow';
    } else if (lower.includes('integrate') || lower.includes('connect') || lower.includes('api')) {
      return 'add_integration';
    }
    
    return 'create_app';
  }
}
