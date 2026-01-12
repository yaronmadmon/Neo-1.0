/**
 * Cost tracking for AI API usage
 */
export interface CostEntry {
  provider: string;
  model: string;
  tokensUsed: number;
  estimatedCost: number;
  timestamp: Date;
}

export class CostTracker {
  private costs: CostEntry[] = [];
  private dailyBudget: number;
  private dailySpend: Map<string, number> = new Map(); // Date string -> amount

  constructor(dailyBudget: number = 100) {
    this.dailyBudget = dailyBudget;
  }

  /**
   * Calculate estimated cost for OpenAI usage
   */
  calculateOpenAICost(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    // Pricing per 1M tokens (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o-mini': { input: 0.15, output: 0.6 }, // $0.15/$0.60 per 1M tokens
      'gpt-4o': { input: 2.5, output: 10 },
      'gpt-4-turbo': { input: 10, output: 30 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    };

    const modelKey = Object.keys(pricing).find((key) => model.includes(key));
    const rates = modelKey ? pricing[modelKey] : pricing['gpt-4o-mini'];

    const inputCost = (promptTokens / 1_000_000) * rates.input;
    const outputCost = (completionTokens / 1_000_000) * rates.output;

    return inputCost + outputCost;
  }

  /**
   * Calculate estimated cost for Anthropic usage
   */
  calculateAnthropicCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    // Pricing per 1M tokens (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-5-sonnet-20241022': { input: 3, output: 15 }, // $3/$15 per 1M tokens
      'claude-3-opus-20240229': { input: 15, output: 75 },
      'claude-3-sonnet-20240229': { input: 3, output: 15 },
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    };

    const modelKey = Object.keys(pricing).find((key) => model.includes(key));
    const rates = modelKey ? pricing[modelKey] : pricing['claude-3-5-sonnet-20241022'];

    const inputCost = (inputTokens / 1_000_000) * rates.input;
    const outputCost = (outputTokens / 1_000_000) * rates.output;

    return inputCost + outputCost;
  }

  /**
   * Record a cost entry
   */
  recordCost(entry: CostEntry): void {
    this.costs.push(entry);

    const date = entry.timestamp.toISOString().split('T')[0];
    const current = this.dailySpend.get(date) || 0;
    this.dailySpend.set(date, current + entry.estimatedCost);
  }

  /**
   * Check if daily budget would be exceeded
   */
  wouldExceedBudget(estimatedCost: number): boolean {
    const today = new Date().toISOString().split('T')[0];
    const currentSpend = this.dailySpend.get(today) || 0;
    return currentSpend + estimatedCost > this.dailyBudget;
  }

  /**
   * Get today's spending
   */
  getTodaySpending(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.dailySpend.get(today) || 0;
  }

  /**
   * Get total costs
   */
  getTotalCosts(): number {
    return this.costs.reduce((sum, entry) => sum + entry.estimatedCost, 0);
  }

  /**
   * Get costs for a specific date
   */
  getCostsForDate(date: Date): CostEntry[] {
    const dateStr = date.toISOString().split('T')[0];
    return this.costs.filter(
      (entry) => entry.timestamp.toISOString().split('T')[0] === dateStr
    );
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const today = new Date().toISOString().split('T')[0];
    return {
      todaySpend: this.dailySpend.get(today) || 0,
      dailyBudget: this.dailyBudget,
      totalCost: this.getTotalCosts(),
      remainingBudget: Math.max(0, this.dailyBudget - (this.dailySpend.get(today) || 0)),
      entryCount: this.costs.length,
    };
  }
}
