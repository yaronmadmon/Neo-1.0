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
  const explicitProvider = process.env.AI_PROVIDER as AIProviderType | undefined;
  const openaiKey = process.env.OPENAI_API_KEY;

  // If explicit provider specified, use that
  if (explicitProvider === 'openai' && process.env.OPENAI_API_KEY) {
    return createAIProvider({
      type: 'openai',
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        baseURL: process.env.OPENAI_BASE_URL,
      },
    });
  }

  if (explicitProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return createAIProvider({
      type: 'anthropic',
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      },
    });
  }

  // Auto-detect from API keys if no explicit provider
  if (!explicitProvider || explicitProvider === 'mock') {
    // Check OpenAI key first
    if (process.env.OPENAI_API_KEY) {
      console.log('🤖 Auto-detected OpenAI API key, using OpenAI provider');
      return createAIProvider({
        type: 'openai',
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          baseURL: process.env.OPENAI_BASE_URL,
        },
      });
    }
    
    // Check Anthropic key
    if (process.env.ANTHROPIC_API_KEY) {
      console.log('🤖 Auto-detected Anthropic API key, using Anthropic provider');
      return createAIProvider({
        type: 'anthropic',
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        },
      });
    }
  }

  // Fallback to mock
  return createAIProvider({ type: 'mock' });
}

/**
 * Check if a real AI provider is available (not mock)
 */
export function hasRealAIProvider(): boolean {
  return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}
