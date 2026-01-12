export interface AIProvider {
  complete(
    params: {
      prompt: string;
      maxTokens: number;
      temperature: number;
      timeout: number;
      schema?: any;
      systemPrompt?: string;
    },
    onCostCalculated?: (totalTokens: number, breakdown: { prompt: number; completion: number }) => void
  ): Promise<unknown>;

  generateAppSchema?(userInput: string, category: string, context?: Record<string, unknown>): Promise<any>;
  generateAppName?(userInput: string, category: string): Promise<string>;
  generateDescription?(userInput: string): Promise<string>;
}

export type AIProviderType = 'openai' | 'anthropic' | 'mock';

export interface AIProviderConfig {
  type: AIProviderType;
  openai?: {
    apiKey: string;
    model?: string;
    baseURL?: string;
  };
  anthropic?: {
    apiKey: string;
    model?: string;
  };
}
