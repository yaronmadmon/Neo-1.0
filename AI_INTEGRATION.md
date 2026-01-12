# AI Integration Guide

This document explains how AI is integrated into Neo and how to configure it.

## Supported Providers

### 1. OpenAI
- **Models**: gpt-4o-mini (default, cost-effective), gpt-4o (higher quality)
- **Features**: JSON mode, function calling, fast responses
- **Best for**: Most use cases, fastest setup

### 2. Anthropic Claude
- **Models**: claude-3-5-sonnet-20241022 (default), claude-3-opus (higher quality)
- **Features**: Strong reasoning, long context windows
- **Best for**: Complex app requirements, better understanding

### 3. Mock Provider
- **Use case**: Development, testing, when no API key available
- **Limitations**: Keyword-based classification only, no schema generation

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Choose provider: 'openai', 'anthropic', or 'mock'
AI_PROVIDER=openai

# OpenAI Configuration
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
# Optional: Custom base URL
# OPENAI_BASE_URL=https://api.openai.com/v1

# Anthropic Configuration (alternative)
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### Programmatic Configuration

```typescript
import { createAIProvider } from '@neo/ai-engine';

const provider = createAIProvider({
  type: 'openai',
  openai: {
    apiKey: 'sk-...',
    model: 'gpt-4o-mini',
  },
});
```

## How It Works

### 1. Intent Processing
- User input is sanitized and checked for safety
- AI analyzes the input and classifies intent
- Returns structured intent with confidence score

### 2. Schema Generation
- AI generates complete app schema from user description
- Includes pages, data models, components, flows
- Validated against safety rules

### 3. Name & Description Generation
- AI creates app name from description
- Generates concise, descriptive text
- Category-aware suggestions

## Cost Management

### Built-in Cost Tracking

```typescript
import { CostTracker } from '@neo/ai-engine';

const tracker = new CostTracker(100); // $100 daily budget

// Automatic tracking on AI calls
// Check budget before expensive operations
if (tracker.wouldExceedBudget(estimatedCost)) {
  throw new Error('Daily budget exceeded');
}

// Get spending summary
const summary = tracker.getSummary();
console.log(`Today: $${summary.todaySpend} / $${summary.dailyBudget}`);
```

### Estimated Costs

**OpenAI gpt-4o-mini** (recommended):
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens
- Typical app generation: ~$0.01 - $0.05

**OpenAI gpt-4o**:
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens
- Typical app generation: ~$0.10 - $0.50

**Anthropic Claude 3.5 Sonnet**:
- Input: $3.00 per 1M tokens
- Output: $15.00 per 1M tokens
- Typical app generation: ~$0.15 - $0.75

## Error Handling

The AI integration includes robust error handling:

- **Timeout protection**: All requests have timeout limits
- **Retry logic**: Automatic retries with exponential backoff
- **Fallback**: Falls back to keyword-based classification if AI fails
- **Safety checks**: All AI outputs are validated

## Best Practices

1. **Use gpt-4o-mini for development**: Cost-effective, good quality
2. **Use gpt-4o for production**: Better quality, more reliable
3. **Set daily budgets**: Prevent unexpected costs
4. **Monitor usage**: Check cost tracker regularly
5. **Cache results**: Reuse generated schemas when possible
6. **Batch operations**: Group similar requests

## Troubleshooting

### API Key Issues
```
Error: OpenAI API key is required
```
**Solution**: Check that `OPENAI_API_KEY` is set in `.env` file

### Rate Limits
```
Error: Rate limit exceeded
```
**Solution**: 
- Use a higher-tier API plan
- Implement request queuing
- Use exponential backoff

### Timeout Errors
```
Error: AI request timeout
```
**Solution**:
- Increase timeout in provider config
- Check network connectivity
- Use faster model (gpt-4o-mini)

### Invalid JSON Response
```
Error: Failed to parse JSON
```
**Solution**: 
- AI provider will retry automatically
- Check that model supports JSON mode
- Fallback to template-based generation

## Advanced Usage

### Custom Prompts

You can customize AI prompts by extending the provider:

```typescript
class CustomAIProvider extends OpenAIProvider {
  async generateAppSchema(userInput: string, category: string) {
    const customPrompt = `Your custom prompt here...`;
    return super.generateAppSchema(userInput, category);
  }
}
```

### Multiple Providers

Use different providers for different operations:

```typescript
const intentProvider = createAIProvider({ type: 'openai', ... });
const schemaProvider = createAIProvider({ type: 'anthropic', ... });
```

### Cost Optimization

1. Use smaller models for simple tasks
2. Cache frequently used results
3. Batch similar requests
4. Set appropriate token limits
5. Monitor and adjust daily budgets
