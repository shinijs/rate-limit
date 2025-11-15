# Examples

This page contains practical usage examples for `@shinijs/rate-limit`.

## Basic Route Protection

Protect a simple API endpoint with rate limiting:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimit, RateLimitGuard } from '@shinijs/rate-limit';

@Controller('api')
@UseGuards(RateLimitGuard)
export class ApiController {
  @Get('public')
  @RateLimit({ requests: 100, window: '1m' })
  getPublicData() {
    return { data: 'public information' };
  }
}
```

## Different Limits for Different Routes

Apply different rate limits based on endpoint sensitivity:

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { RateLimit, RateLimitGuard } from '@shinijs/rate-limit';

@Controller('api')
@UseGuards(RateLimitGuard)
export class ApiController {
  // Generous limit for read operations
  @Get('articles')
  @RateLimit({ requests: 1000, window: '1h' })
  getArticles() {
    return { articles: [] };
  }

  // Stricter limit for write operations
  @Post('articles')
  @RateLimit({ requests: 10, window: '1h' })
  createArticle() {
    return { success: true };
  }

  // Very strict limit for sensitive operations
  @Post('admin/settings')
  @RateLimit({ requests: 5, window: '1d' })
  updateSettings() {
    return { success: true };
  }
}
```

## User-Specific Rate Limiting

Rate limit based on user ID instead of IP address:

```typescript
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitService } from '@shinijs/rate-limit';

@Injectable()
export class UserService {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async sendEmail(userId: string, email: string) {
    // Rate limit per user
    const result = await this.rateLimitService.checkRateLimit(
      `user:${userId}:email`,
      { requests: 5, window: '1h' }
    );

    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many emails sent',
          remaining: result.remaining,
          resetTime: result.resetTime,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Send email logic here
    return { success: true, remaining: result.remaining };
  }
}
```

## API Key Rate Limiting

Implement rate limiting per API key:

```typescript
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitService } from '@shinijs/rate-limit';

@Injectable()
export class ApiKeyService {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async validateApiKey(apiKey: string) {
    // Different tiers have different limits
    const tier = await this.getApiKeyTier(apiKey);

    const limits = {
      free: { requests: 100, window: '1h' },
      pro: { requests: 1000, window: '1h' },
      enterprise: { requests: 10000, window: '1h' },
    };

    const result = await this.rateLimitService.checkRateLimit(
      `apikey:${apiKey}`,
      limits[tier]
    );

    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded for ${tier} tier`,
          limit: limits[tier].requests,
          remaining: result.remaining,
          resetTime: result.resetTime,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return result;
  }

  private async getApiKeyTier(apiKey: string): Promise<'free' | 'pro' | 'enterprise'> {
    // Your logic to determine tier
    return 'free';
  }
}
```

## Using Interceptor with Headers

Add rate limit information to response headers:

```typescript
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { RateLimit, RateLimitInterceptor } from '@shinijs/rate-limit';

@Controller('api')
@UseInterceptors(RateLimitInterceptor)
export class ApiController {
  @Get('data')
  @RateLimit({ requests: 100, window: '1m' })
  getData() {
    // The interceptor will automatically add headers:
    // X-RateLimit-Limit: 100
    // X-RateLimit-Remaining: 99
    // X-RateLimit-Reset: <timestamp>
    return { data: 'some data' };
  }
}
```

## Global Rate Limiting

Apply rate limiting globally to all routes:

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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

Then use the decorator on specific routes:

```typescript
@Controller('api')
export class ApiController {
  @Get('endpoint')
  @RateLimit({ requests: 50, window: '1m' })
  getData() {
    return { data: 'protected' };
  }
}
```

## Decrementing Rate Limit on Failures

Roll back rate limit count if a request fails:

```typescript
import { Injectable } from '@nestjs/common';
import { RateLimitService } from '@shinijs/rate-limit';

@Injectable()
export class PaymentService {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async processPayment(userId: string, amount: number) {
    const key = `payment:${userId}`;

    // Check rate limit
    const result = await this.rateLimitService.checkRateLimit(
      key,
      { requests: 3, window: '1h' }
    );

    if (!result.allowed) {
      throw new Error('Too many payment attempts');
    }

    try {
      // Attempt payment processing
      await this.chargeCard(amount);
      return { success: true };
    } catch (error) {
      // Decrement on failure so user isn't penalized
      await this.rateLimitService.decrementRateLimit(key);
      throw error;
    }
  }

  private async chargeCard(amount: number): Promise<void> {
    // Payment processing logic
  }
}
```

## Health Check Integration

Monitor rate limiting health:

```typescript
import { Controller, Get } from '@nestjs/common';
import { RateLimitService } from '@shinijs/rate-limit';

@Controller('health')
export class HealthController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @Get()
  async check() {
    const redisHealthy = await this.rateLimitService.healthCheck();

    return {
      status: 'ok',
      redis: redisHealthy ? 'connected' : 'disconnected',
      rateLimit: redisHealthy ? 'distributed' : 'memory-fallback',
    };
  }
}
```

## Custom Rate Limit Keys

Create complex rate limit keys based on multiple factors:

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { RateLimitService } from '@shinijs/rate-limit';

@Injectable()
export class CustomRateLimitService {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async checkCustomLimit(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const ip = request.ip;
    const endpoint = request.route.path;

    // Combine multiple factors into a unique key
    const key = `rate_limit:${userId || 'anonymous'}:${ip}:${endpoint}`;

    return this.rateLimitService.checkRateLimit(
      key,
      { requests: 100, window: '1m' }
    );
  }
}
```

