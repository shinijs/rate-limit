# @shinijs/rate-limit

> A flexible and powerful rate limiting solution for NestJS applications with Redis support

[![CI](https://github.com/shinijs/rate-limit/actions/workflows/ci.yml/badge.svg)](https://github.com/shinijs/rate-limit/actions/workflows/ci.yml)
[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://shinijs.github.io/rate-limit/)

📚 **[Full Documentation](https://shinijs.github.io/rate-limit/)** | [API Reference](https://shinijs.github.io/rate-limit/api/RateLimit-module) | [Examples](https://shinijs.github.io/rate-limit/guide/examples)

## Features

- ✅ **NestJS Integration** - Seamless integration with NestJS ecosystem via decorators, guards, and interceptors
- ✅ **Redis Support** - Distributed rate limiting using Redis with automatic fallback to memory-based limiting
- ✅ **TypeScript** - Full type safety and IntelliSense support
- ✅ **Flexible Configuration** - Per-route rate limits with customizable time windows
- ✅ **Multiple Patterns** - Use decorators, guards, or interceptors based on your needs
- ✅ **Tested** - Comprehensive test coverage with 33 passing tests

## Installation

```bash
pnpm add @shinijs/rate-limit
```

### Peer Dependencies

This package requires the following peer dependencies to be installed in your project:

| Package | Version | Required |
|---------|---------|----------|
| `@nestjs/common` | `^11.0.0` | Yes |
| `@nestjs/config` | `^4.0.0` | Yes |
| `reflect-metadata` | `^0.2.0` | Yes |
| `rxjs` | `^7.8.0` | Yes |
| `ioredis` | `^5.0.0` | No (Optional) |

**Install all required peer dependencies:**

```bash
pnpm add @nestjs/common@^11.0.0 @nestjs/config@^4.0.0 reflect-metadata@^0.2.0 rxjs@^7.8.0
```

**For Redis support (recommended for production):**

```bash
pnpm add ioredis@^5.0.0
```

## Quick Start

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimitModule } from '@shinijs/rate-limit';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RateLimitModule,
  ],
})
export class AppModule {}
```

### 2. Configure Redis (Optional but Recommended)

Create a `.env` file:

```env
REDIS_URL=redis://localhost:6379
```

If Redis is not configured, the library will automatically fall back to memory-based rate limiting.

### 3. Use the Decorator

```typescript
import { Controller, Get } from '@nestjs/common';
import { RateLimit } from '@shinijs/rate-limit';

@Controller('api')
export class ApiController {
  @Get('endpoint')
  @RateLimit({ requests: 10, window: '1m' }) // 10 requests per minute
  async getData() {
    return { message: 'Success' };
  }
}
```

### 4. Or Use the Guard

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimit, RateLimitGuard } from '@shinijs/rate-limit';

@Controller('api')
@UseGuards(RateLimitGuard)
export class ApiController {
  @Get('endpoint')
  @RateLimit({ requests: 100, window: '1h' }) // 100 requests per hour
  async getData() {
    return { message: 'Success' };
  }
}
```

### 5. Or Use the Service Directly

```typescript
import { Injectable } from '@nestjs/common';
import { RateLimitService } from '@shinijs/rate-limit';

@Injectable()
export class YourService {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async processRequest(userId: string) {
    const result = await this.rateLimitService.checkRateLimit(
      `user:${userId}`,
      { requests: 50, window: '5m' }
    );

    if (!result.allowed) {
      throw new Error('Rate limit exceeded');
    }

    // Process the request
    return { remaining: result.remaining };
  }
}
```

## Configuration

### Time Window Formats

The `window` parameter accepts the following formats:

- `s` - seconds (e.g., `30s` = 30 seconds)
- `m` - minutes (e.g., `5m` = 5 minutes)
- `h` - hours (e.g., `1h` = 1 hour)
- `d` - days (e.g., `1d` = 1 day)

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection URL | `undefined` (falls back to memory-based limiting) |

Example:
```env
REDIS_URL=redis://localhost:6379
# Or with authentication
REDIS_URL=redis://:password@localhost:6379
# Or for Redis cluster
REDIS_URL=redis://localhost:6379/0
```

## API Reference

### RateLimitService

#### `checkRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult>`

Checks if a request is allowed based on the rate limit configuration.

**Parameters:**
- `key` - Unique identifier for the rate limit (e.g., user ID, IP address)
- `options` - Rate limit configuration
  - `requests` - Maximum number of requests allowed
  - `window` - Time window (e.g., '1m', '1h')

**Returns:**
```typescript
{
  allowed: boolean;      // Whether the request is allowed
  remaining: number;     // Remaining requests in current window
  resetTime: number;     // Timestamp when the limit resets
  totalHits: number;     // Total requests in current window
}
```

#### `decrementRateLimit(key: string): Promise<void>`

Decrements the rate limit counter (useful for rolling back failed requests).

#### `healthCheck(): Promise<boolean>`

Checks if Redis connection is healthy. Returns `false` if Redis is not configured or unhealthy.

### Decorators

#### `@RateLimit(options: RateLimitOptions)`

Applies rate limiting to a route handler.

```typescript
@RateLimit({ requests: 10, window: '1m' })
```

### Guards

#### `RateLimitGuard`

A NestJS guard that enforces rate limits based on the `@RateLimit` decorator.

### Interceptors

#### `RateLimitInterceptor`

A NestJS interceptor that enforces rate limits and adds rate limit headers to responses.

## Redis vs Memory-Based Mode

### With Redis (Recommended for Production)
- ✅ Distributed rate limiting across multiple instances
- ✅ Persistent rate limit data
- ✅ Accurate counting
- ✅ Suitable for horizontal scaling

### Memory-Based Fallback
- ⚠️ Only works for single-instance applications
- ⚠️ Rate limits reset on application restart
- ⚠️ Not suitable for distributed systems
- ℹ️ Automatically used when Redis is not available

## Testing

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov
```

## Documentation

📚 **[Full Documentation](https://shinijs.github.io/rate-limit/)** is available with:

- Complete API reference
- Configuration guide
- Usage examples
- Best practices

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting pull requests.

## License

MIT © Shironex

