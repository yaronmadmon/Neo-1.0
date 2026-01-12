import type { AIProvider, AIProviderConfig, AIProviderType } from './types.js';
import { OpenAIProvider } from './openai-provider.js';
import { AnthropicProvider } from './anthropic-provider.js';
import { MockAIProvider } from './mock-provider.js';

export function createAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.type) {
    case 'openai':
      if (!config.openai?.apiKey) {
        throw new Error('OpenAI API key is required');
      }
      return new OpenAIProvider({
        apiKey: config.openai.apiKey,
        model: config.openai.model,
        baseURL: config.openai.baseURL,
      });

    case 'anthropic':
      if (!config.anthropic?.apiKey) {
        throw new Error('Anthropic API key is required');
      }
      return new AnthropicProvider({
        apiKey: config.anthropic.apiKey,
        model: config.anthropic.model,
      });

    case 'mock':
    default:
      return new MockAIProvider();
  }
}

export function createAIProviderFromEnv(): AIProvider {
  const providerType = (process.env.AI_PROVIDER || 'mock') as AIProviderType;

  if (providerType === 'openai' && process.env.OPENAI_API_KEY) {
    return createAIProvider({
      type: 'openai',
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        baseURL: process.env.OPENAI_BASE_URL,
      },
    });
  }

  if (providerType === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return createAIProvider({
      type: 'anthropic',
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      },
    });
  }

  // Fallback to mock
  return createAIProvider({ type: 'mock' });
}
