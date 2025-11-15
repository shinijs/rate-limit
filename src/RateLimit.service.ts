import {
  Injectable,
  Inject,
  Optional,
  Logger,
  LoggerService,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RateLimitOptions } from './decorators/rate-limit.decorator';
import type { RateLimitResult } from './RateLimit.interface';
import { IRateLimit } from './RateLimit.interface';

export const RATE_LIMIT_LOGGER = Symbol('RATE_LIMIT_LOGGER');

@Injectable()
export class RateLimitService implements IRateLimit, OnModuleDestroy {
  private readonly logger: LoggerService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private redis: any = null; // Using any since ioredis is optional
  // In-memory fallback rate limit storage: key -> array of timestamps
  private readonly fallbackStorage = new Map<string, number[]>();

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(RATE_LIMIT_LOGGER)
    logger?: LoggerService
  ) {
    this.logger = logger || new Logger(RateLimitService.name);
    void this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');

      // If Redis URL is explicitly null/undefined, skip Redis initialization
      if (redisUrl === null || redisUrl === undefined) {
        this.logger.warn?.(
          'Redis URL not configured. Rate limiting will operate in fallback mode (memory-based).'
        );
        return;
      }

      // Try to dynamically import ioredis
      const ioredisModule = await import('ioredis');
      // Handle both default and named exports
      // ioredis v5 exports Redis as default or named export depending on module system
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const RedisConstructor: any =
        (ioredisModule as any).default?.Redis ||
        (ioredisModule as any).Redis ||
        (ioredisModule as any).default ||
        ioredisModule;

      this.redis = new (RedisConstructor as new (
        url: string,
        options?: import('ioredis').RedisOptions,
      ) => import('ioredis').Redis)(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.on('error', (error: unknown) => {
        this.logger.error?.('Redis connection error:', error);
      });

      this.redis.on('connect', () => {
        this.logger.log?.('Connected to Redis for rate limiting');
      });

      await this.redis.connect();
    } catch (error: unknown) {
      // If ioredis is not installed, log and continue in fallback mode
      if (
        error instanceof Error &&
        (error.message.includes('Cannot find module') ||
          error.message.includes('ERR_MODULE_NOT_FOUND'))
      ) {
        this.logger.warn?.(
          'ioredis not found. Rate limiting will operate in fallback mode (memory-based). Install ioredis for distributed rate limiting.'
        );
      } else {
        this.logger.error?.('Failed to initialize Redis connection:', error);
        this.logger.warn?.('Rate limiting will operate in fallback mode (memory-based)');
      }
    }
  }

  async checkRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const windowMs = this.parseWindow(options.window);
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.redis) {
      return this.fallbackRateLimit(key, options, now);
    }

    try {
      return await this.redisRateLimit(key, options, now, windowStart, windowMs);
    } catch (error) {
      this.logger.error?.('Redis rate limit error:', error);
      return this.fallbackRateLimit(key, options, now);
    }
  }

  private async redisRateLimit(
    key: string,
    options: RateLimitOptions,
    now: number,
    windowStart: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const pipeline = this.redis!.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Add current request timestamp
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Count current requests in window (including the current request)
    pipeline.zcard(key);

    // Set expiration to cleanup old keys
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    const [, , [countErr, totalHits]] = results;

    if (countErr) {
      throw countErr;
    }

    const hits = (totalHits as number) || 0;
    const allowed = hits <= options.requests;
    const remaining = Math.max(0, options.requests - hits);
    const resetTime = now + windowMs;

    return {
      allowed,
      remaining,
      resetTime,
      totalHits: hits,
    };
  }

  private fallbackRateLimit(key: string, options: RateLimitOptions, now: number): RateLimitResult {
    const windowMs = this.parseWindow(options.window);
    const windowStart = now - windowMs;

    // Get or create the entry for this key
    let timestamps = this.fallbackStorage.get(key);
    if (!timestamps) {
      timestamps = [];
      this.fallbackStorage.set(key, timestamps);
    }

    // Remove timestamps outside the current window
    const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);

    // Add current request timestamp
    validTimestamps.push(now);

    // Update storage
    this.fallbackStorage.set(key, validTimestamps);

    // Count hits (including current request)
    const hits = validTimestamps.length;
    const allowed = hits <= options.requests;
    const remaining = Math.max(0, options.requests - hits);
    const resetTime = now + windowMs;

    // Log warning only once per key to avoid spam
    if (hits === 1) {
      this.logger.warn?.('Using fallback rate limiting - not suitable for distributed systems');
    }

    // Cleanup old entries periodically (every 1000 requests to avoid performance impact)
    if (this.fallbackStorage.size > 1000) {
      this.cleanupFallbackStorage(windowStart);
    }

    return {
      allowed,
      remaining,
      resetTime,
      totalHits: hits,
    };
  }

  private cleanupFallbackStorage(windowStart: number): void {
    for (const [key, timestamps] of this.fallbackStorage.entries()) {
      const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
      if (validTimestamps.length === 0) {
        this.fallbackStorage.delete(key);
      } else {
        this.fallbackStorage.set(key, validTimestamps);
      }
    }
  }

  private parseWindow(window: string): number {
    const units: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = window.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid window format: ${window}. Use format like '5m', '1h', '30s'`);
    }

    const [, amount, unit] = match;
    return parseInt(amount, 10) * units[unit];
  }

  async decrementRateLimit(key: string): Promise<void> {
    if (!this.redis) {
      // In fallback mode, remove the most recent timestamp
      const timestamps = this.fallbackStorage.get(key);
      if (timestamps && timestamps.length > 0) {
        // Remove the most recent (last) timestamp
        timestamps.pop();
        if (timestamps.length === 0) {
          this.fallbackStorage.delete(key);
        } else {
          this.fallbackStorage.set(key, timestamps);
        }
      }
      return;
    }

    try {
      // Get the most recent entry (highest score) and remove it
      const pipeline = this.redis.pipeline();

      // Get the most recent entry
      const entries = await this.redis.zrevrange(key, 0, 0, 'WITHSCORES');

      if (entries && entries.length >= 2) {
        const entryValue = entries[0];
        // Remove the most recent entry
        pipeline.zrem(key, entryValue);
        await pipeline.exec();

        this.logger.debug?.('Rate limit decremented', {
          key,
          removedEntry: entryValue,
        });
      } else {
        this.logger.debug?.('No entries to decrement for rate limit key', {
          key,
        });
      }
    } catch (error) {
      this.logger.error?.('Failed to decrement rate limit', error, { key });
    }
  }

  /**
   * Check if Redis connection is healthy
   * @returns true if Redis is connected and responding, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    if (!this.redis) {
      this.logger.debug?.('Health check: Redis not initialized');
      return false;
    }

    try {
      await this.redis.ping();
      this.logger.debug?.('Health check: Redis OK');
      return true;
    } catch (error) {
      this.logger.debug?.('Health check: Redis unhealthy', error);
      return false;
    }
  }

  onModuleDestroy(): void {
    if (this.redis) {
      this.redis.disconnect();
    }
    // Cleanup fallback storage
    this.fallbackStorage.clear();
  }
}
