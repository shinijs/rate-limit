import type { RateLimitOptions } from './decorators/rate-limit.decorator';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

export interface IRateLimit {
  checkRateLimit(
    key: string,
    options: RateLimitOptions,
  ): Promise<RateLimitResult>;
  decrementRateLimit(key: string): Promise<void>;
  healthCheck(): Promise<boolean>;
}

