# Getting Started

This guide will help you get started with `@shinijs/rate-limit`.

## Installation

Install the package using your preferred package manager:

```bash
# Using pnpm (recommended)
pnpm add @shinijs/rate-limit

# Using npm
npm install @shinijs/rate-limit

# Using yarn
yarn add @shinijs/rate-limit
```

### Peer Dependencies

Make sure you have the required peer dependencies installed:

```bash
# Required dependencies
pnpm add @nestjs/common@^11.0.0 @nestjs/config@^4.0.0 reflect-metadata@^0.2.0 rxjs@^7.8.0

# Optional (but recommended for production)
pnpm add ioredis@^5.0.0
```

## Basic Setup

### 1. Import the Module

Import `RateLimitModule` in your root module:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimitModule } from '@shinijs/rate-limit';

@Module({
  imports: [
    ConfigModule.forRoot(), // Required for environment variables
    RateLimitModule,
  ],
})
export class AppModule {}
```

### 2. Configure Redis (Optional)

Create a `.env` file in your project root:

```env
REDIS_URL=redis://localhost:6379
```

::: tip
If you don't configure Redis, the library will automatically fall back to memory-based rate limiting. This is fine for development but **not recommended for production** in distributed environments.
:::

## Usage Patterns

### Pattern 1: Using the Decorator with Guard

The most common pattern - use the `@RateLimit` decorator with `RateLimitGuard`:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimit, RateLimitGuard } from '@shinijs/rate-limit';

@Controller('api')
@UseGuards(RateLimitGuard)
export class ApiController {
  @Get('users')
  @RateLimit({ requests: 100, window: '1m' })
  getUsers() {
    return { users: [] };
  }
}
```

### Pattern 2: Using the Interceptor

Use the `RateLimitInterceptor` to automatically add rate limit headers to responses:

```typescript
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { RateLimit, RateLimitInterceptor } from '@shinijs/rate-limit';

@Controller('api')
@UseInterceptors(RateLimitInterceptor)
export class ApiController {
  @Get('data')
  @RateLimit({ requests: 50, window: '5m' })
  getData() {
    return { data: 'some data' };
  }
}
```

### Pattern 3: Using the Service Directly

For more control, inject the `RateLimitService` directly:

```typescript
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitService } from '@shinijs/rate-limit';

@Injectable()
export class CustomService {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async processUserRequest(userId: string) {
    const result = await this.rateLimitService.checkRateLimit(
      `user:${userId}`,
      { requests: 10, window: '1m' }
    );

    if (!result.allowed) {
      throw new HttpException(
        `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Process the request
    return { success: true, remaining: result.remaining };
  }
}
```

## Time Window Format

The `window` parameter accepts the following formats:

| Format | Description | Example |
|--------|-------------|---------|
| `s` | Seconds | `30s` = 30 seconds |
| `m` | Minutes | `5m` = 5 minutes |
| `h` | Hours | `1h` = 1 hour |
| `d` | Days | `1d` = 1 day |

## Health Check

Monitor Redis connectivity:

```typescript
import { Injectable } from '@nestjs/common';
import { RateLimitService } from '@shinijs/rate-limit';

@Injectable()
export class HealthService {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async checkRedis() {
    const isHealthy = await this.rateLimitService.healthCheck();
    return {
      redis: isHealthy ? 'connected' : 'disconnected',
    };
  }
}
```

## Next Steps

- Learn about [Configuration](/guide/configuration)
- Check out [Examples](/guide/examples)
- Read the [API Reference](/api/RateLimit-module)

