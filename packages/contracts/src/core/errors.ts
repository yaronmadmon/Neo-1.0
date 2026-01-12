export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors?: unknown[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SecurityError extends Error {
  constructor(
    message: string,
    public readonly severity?: 'low' | 'medium' | 'high' | 'critical'
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class SafetyError extends Error {
  constructor(
    message: string,
    public readonly safetyResult?: {
      safe: boolean;
      blocked: boolean;
      violations?: Array<{ type: string; severity: string; message: string }>;
    }
  ) {
    super(message);
    this.name = 'SafetyError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class CostLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CostLimitError';
  }
}
