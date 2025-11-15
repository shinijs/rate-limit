# API Reference

Complete API reference for `@shinijs/rate-limit`.

## Module

### RateLimitModule

The main module that provides rate limiting functionality.

**Import:**
```typescript
import { RateLimitModule } from '@shinijs/rate-limit';
```

**Usage:**

Basic:
```typescript
@Module({
  imports: [RateLimitModule.forRoot()],
})
export class AppModule {}
```

With custom logger via token:
```typescript
@Module({
  imports: [
    RateLimitModule.forRoot({
      loggerToken: YOUR_LOGGER_TOKEN, // Inject logger from DI container
    }),
  ],
})
export class AppModule {}
```

With logger instance:
```typescript
@Module({
  imports: [
    RateLimitModule.forRoot({
      logger: customLoggerInstance, // Provide logger directly
    }),
  ],
})
export class AppModule {}
```

**Exports:**
- `RateLimitService` - The main rate limiting service
- `RateLimitGuard` - Guard for route protection
- `RateLimitInterceptor` - Interceptor for adding headers

## Service

### RateLimitService

The core service for rate limiting operations.

**Import:**
```typescript
import { RateLimitService } from '@shinijs/rate-limit';
```

#### Methods

##### `checkRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult>`

Checks if a request is allowed based on the rate limit configuration.

**Parameters:**
- `key` (string) - Unique identifier for the rate limit (e.g., user ID, IP address, API key)
- `options` (RateLimitOptions) - Rate limit configuration
  - `requests` (number) - Maximum number of requests allowed
  - `window` (string) - Time window (e.g., '1m', '1h', '1d')

**Returns:** `Promise<RateLimitResult>`
```typescript
{
  allowed: boolean;      // Whether the request is allowed
  remaining: number;     // Number of requests remaining in current window
  resetTime: number;     // Timestamp (ms) when the limit resets
  totalHits: number;     // Total number of requests in current window
}
```

**Example:**
```typescript
const result = await rateLimitService.checkRateLimit('user:123', {
  requests: 100,
  window: '1h'
});

if (!result.allowed) {
  throw new Error('Rate limit exceeded');
}
```

##### `decrementRateLimit(key: string): Promise<void>`

Decrements the rate limit counter for a given key. Useful for rolling back the count when a request fails.

**Parameters:**
- `key` (string) - The rate limit key to decrement

**Returns:** `Promise<void>`

**Example:**
```typescript
try {
  await processPayment();
} catch (error) {
  // Roll back the rate limit count
  await rateLimitService.decrementRateLimit('payment:user:123');
  throw error;
}
```

##### `healthCheck(): Promise<boolean>`

Checks if the Redis connection is healthy and operational.

**Returns:** `Promise<boolean>`
- `true` if Redis is connected and responding
- `false` if Redis is not initialized, disconnected, or unhealthy

**Example:**
```typescript
const isHealthy = await rateLimitService.healthCheck();
console.log(`Redis status: ${isHealthy ? 'connected' : 'disconnected'}`);
```

## Decorators

### @RateLimit(options: RateLimitOptions)

Decorator to apply rate limiting to a route handler.

**Import:**
```typescript
import { RateLimit } from '@shinijs/rate-limit';
```

**Parameters:**
- `options` (RateLimitOptions)
  - `requests` (number) - Maximum number of requests allowed
  - `window` (string) - Time window format: `<number><unit>` where unit is `s`, `m`, `h`, or `d`

**Usage:**
```typescript
@Controller('api')
export class ApiController {
  @Get('data')
  @RateLimit({ requests: 100, window: '1m' })
  getData() {
    return { data: 'protected' };
  }
}
```

## Guards

### RateLimitGuard

A NestJS guard that enforces rate limits based on the `@RateLimit` decorator.

**Import:**
```typescript
import { RateLimitGuard } from '@shinijs/rate-limit';
```

**Usage:**

Per-controller:
```typescript
@Controller('api')
@UseGuards(RateLimitGuard)
export class ApiController {
  @Get('data')
  @RateLimit({ requests: 100, window: '1m' })
  getData() {
    return { data: 'protected' };
  }
}
```

Globally:
```typescript
import { APP_GUARD } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
```

**Behavior:**
- Reads rate limit configuration from `@RateLimit` decorator metadata
- Generates rate limit key based on IP address and route path
- Throws `HttpException` with status 429 (Too Many Requests) when limit is exceeded
- Logs errors using the configured logger

## Interceptors

### RateLimitInterceptor

A NestJS interceptor that enforces rate limits and adds rate limit information to response headers.

**Import:**
```typescript
import { RateLimitInterceptor } from '@shinijs/rate-limit';
```

**Usage:**

Per-controller:
```typescript
@Controller('api')
@UseInterceptors(RateLimitInterceptor)
export class ApiController {
  @Get('data')
  @RateLimit({ requests: 100, window: '1m' })
  getData() {
    return { data: 'protected' };
  }
}
```

Per-route:
```typescript
@Controller('api')
export class ApiController {
  @Get('data')
  @UseInterceptors(RateLimitInterceptor)
  @RateLimit({ requests: 100, window: '1m' })
  getData() {
    return { data: 'protected' };
  }
}
```

**Response Headers:**
The interceptor adds the following headers to the response:
- `X-RateLimit-Limit` - Maximum number of requests allowed
- `X-RateLimit-Remaining` - Number of requests remaining
- `X-RateLimit-Reset` - Timestamp when the limit resets

**Example Response:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699564800000
```

## Interfaces

### RateLimitOptions

Configuration options for rate limiting.

```typescript
interface RateLimitOptions {
  requests: number;  // Maximum requests allowed
  window: string;    // Time window (e.g., '1m', '5m', '1h', '1d')
}
```

### RateLimitResult

Result returned from rate limit checks.

```typescript
interface RateLimitResult {
  allowed: boolean;      // Whether the request is allowed
  remaining: number;     // Requests remaining in current window
  resetTime: number;     // Timestamp (ms) when the limit resets
  totalHits: number;     // Total requests in current window
}
```

### IRateLimit

Interface for rate limiting implementations.

```typescript
interface IRateLimit {
  checkRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult>;
  decrementRateLimit(key: string): Promise<void>;
  healthCheck(): Promise<boolean>;
}
```

## Constants

### RATE_LIMIT_METADATA

Symbol used to store rate limit metadata on route handlers.

```typescript
export const RATE_LIMIT_METADATA = Symbol('RATE_LIMIT_METADATA');
```

### RATE_LIMIT_LOGGER

Injection token for providing a custom logger.

**Import:**
```typescript
import { RATE_LIMIT_LOGGER } from '@shinijs/rate-limit';
```

**Usage:**
```typescript
@Module({
  providers: [
    {
      provide: RATE_LIMIT_LOGGER,
      useClass: CustomLogger,
    },
  ],
})
export class AppModule {}
```

## Error Handling

### Rate Limit Exceeded

When a rate limit is exceeded, the guard throws an `HttpException`:

**Status Code:** 429 (Too Many Requests)

**Response Body:**
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded"
}
```

**Example Error Handling:**
```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';

@Catch(HttpException)
export class RateLimitExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();

    if (status === 429) {
      response.status(status).json({
        statusCode: status,
        message: 'Too many requests. Please try again later.',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
```

