# Configuration

`@shinijs/rate-limit` can be configured using environment variables and decorator options.

## Environment Variables

### Redis Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | Redis connection URL | `undefined` | No |

The `REDIS_URL` can be configured in various formats:

```env
# Basic connection
REDIS_URL=redis://localhost:6379

# With authentication
REDIS_URL=redis://:password@localhost:6379

# Specific database
REDIS_URL=redis://localhost:6379/0

# With username and password
REDIS_URL=redis://username:password@localhost:6379

# Redis Sentinel
REDIS_URL=redis://localhost:26379

# Redis Cluster
REDIS_URL=redis://node1:6379,node2:6379,node3:6379
```

### Fallback Mode

If `REDIS_URL` is not configured or Redis is unavailable, the library automatically falls back to memory-based rate limiting. This is useful for:

- Development environments
- Single-instance applications
- Testing

::: warning
Memory-based fallback is **not recommended for production** in distributed environments because:
- Rate limits are per-instance, not shared across instances
- Rate limits reset when the application restarts
- Not suitable for horizontal scaling
:::

## Rate Limit Options

When using the `@RateLimit` decorator or `checkRateLimit` method, you can configure:

### `requests`

Maximum number of requests allowed within the time window.

```typescript
@RateLimit({ requests: 100, window: '1m' })
```

**Type:** `number`
**Required:** Yes
**Example:** `10`, `100`, `1000`

### `window`

Time window for rate limiting. Supports the following formats:

| Format | Unit | Example | Duration |
|--------|------|---------|----------|
| `s` | Seconds | `30s` | 30 seconds |
| `m` | Minutes | `5m` | 5 minutes |
| `h` | Hours | `1h` | 1 hour |
| `d` | Days | `7d` | 7 days |

```typescript
@RateLimit({ requests: 100, window: '1h' }) // 100 requests per hour
```

**Type:** `string`
**Required:** Yes
**Pattern:** `^(\d+)([smhd])$`

## Configuration Examples

### Development Setup

For local development without Redis:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimitModule } from '@shinijs/rate-limit';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.development',
    }),
    RateLimitModule,
  ],
})
export class AppModule {}
```

```env
# .env.development
# No REDIS_URL - will use memory fallback
```

### Production Setup

For production with Redis:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimitModule } from '@shinijs/rate-limit';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.production',
    }),
    RateLimitModule,
  ],
})
export class AppModule {}
```

```env
# .env.production
REDIS_URL=redis://redis-server:6379
```

### Custom Logger

You can provide a custom logger for the rate limit service:

```typescript
import { Module } from '@nestjs/common';
import { RateLimitModule, RATE_LIMIT_LOGGER } from '@shinijs/rate-limit';
import { CustomLogger } from './custom-logger';

@Module({
  imports: [RateLimitModule],
  providers: [
    {
      provide: RATE_LIMIT_LOGGER,
      useClass: CustomLogger,
    },
  ],
})
export class AppModule {}
```

## Per-Route Configuration

Different routes can have different rate limits:

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { RateLimit, RateLimitGuard } from '@shinijs/rate-limit';

@Controller('api')
@UseGuards(RateLimitGuard)
export class ApiController {
  // Public endpoints - generous limits
  @Get('public')
  @RateLimit({ requests: 1000, window: '1h' })
  getPublic() {
    return { data: 'public' };
  }

  // Write operations - moderate limits
  @Post('create')
  @RateLimit({ requests: 50, window: '1h' })
  create() {
    return { success: true };
  }

  // Sensitive operations - strict limits
  @Post('admin')
  @RateLimit({ requests: 10, window: '1d' })
  adminAction() {
    return { success: true };
  }
}
```

## Global Rate Limit

Apply a default rate limit to all routes, then override specific routes:

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RateLimitModule, RateLimitGuard } from '@shinijs/rate-limit';

@Module({
  imports: [RateLimitModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
```

## Redis Connection Options

The library uses ioredis internally with the following default options:

```typescript
{
  maxRetriesPerRequest: 3,
  lazyConnect: true,
}
```

These are optimized for rate limiting use cases and generally don't need to be changed.

## Monitoring and Health Checks

Check Redis connectivity and rate limiting health:

```typescript
import { Injectable } from '@nestjs/common';
import { RateLimitService } from '@shinijs/rate-limit';

@Injectable()
export class MonitoringService {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async getHealth() {
    const isRedisHealthy = await this.rateLimitService.healthCheck();

    return {
      rateLimiting: {
        redis: isRedisHealthy ? 'connected' : 'disconnected',
        mode: isRedisHealthy ? 'distributed' : 'memory-fallback',
        status: 'operational',
      },
    };
  }
}
```

