import { registerAs } from '@nestjs/config';

export interface RateLimitConfig {
  enabled: boolean;
  redisUrl: string;
}

export default registerAs(
  'RateLimit',
  (): RateLimitConfig => ({
    enabled: process.env.RateLimit_ENABLED !== 'false',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  }),
);

