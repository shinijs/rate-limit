import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
  Logger,
  LoggerService,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RateLimitService } from '../RateLimit.service';
import {
  RATE_LIMIT_METADATA,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';
import { RATE_LIMIT_LOGGER } from '../RateLimit.service';

/**
 * NestJS guard that enforces rate limiting based on the RateLimit decorator metadata.
 *
 * This guard checks rate limits before allowing requests to proceed. It uses Redis
 * for distributed rate limiting across multiple instances, with automatic fallback
 * to memory-based limiting when Redis is unavailable.
 *
 * Features:
 * - Reads rate limit configuration from RateLimit decorator
 * - Generates rate limit keys based on IP address and route path
 * - Supports custom key generation via keyGenerator option
 * - Sets rate limit headers on responses
 * - Throws 429 Too Many Requests when limit is exceeded
 * - Fails open (allows requests) if rate limiting service errors
 *
 * Usage:
 * Apply to individual routes or entire controllers using UseGuards decorator.
 *
 * Example (per-controller):
 * ```
 * Controller('api')
 * UseGuards(RateLimitGuard)
 * export class ApiController {
 *   Get('data')
 *   RateLimit({ requests: 100, window: '1m' })
 *   getData() {
 *     return { data: 'protected' };
 *   }
 * }
 * ```
 *
 * Example (global):
 * ```
 * Module({
 *   providers: [{
 *     provide: APP_GUARD,
 *     useClass: RateLimitGuard,
 *   }],
 * })
 * export class AppModule {}
 * ```
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger: LoggerService;

  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly reflector: Reflector,
    @Optional()
    @Inject(RATE_LIMIT_LOGGER)
    logger?: LoggerService,
  ) {
    this.logger = logger || new Logger(RateLimitGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions =
      this.reflector.getAllAndOverride<RateLimitOptions>(
        RATE_LIMIT_METADATA,
        [context.getHandler(), context.getClass()],
      );

    if (!rateLimitOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Generate rate limit key
    const key = this.generateKey(request, rateLimitOptions);

    try {
      const result = await this.rateLimitService.checkRateLimit(
        key,
        rateLimitOptions,
      );

      // Set rate limit headers
      this.setRateLimitHeaders(response, result, rateLimitOptions);

      if (!result.allowed) {
        this.logger.warn?.('Rate limit exceeded', {
          key,
          ip: request.ip,
          userAgent: request.get('user-agent'),
          path: request.path,
          method: request.method,
          totalHits: result.totalHits,
          limit: rateLimitOptions.requests,
          window: rateLimitOptions.window,
        });

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests',
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      this.logger.debug?.('Rate limit check passed', {
        key,
        remaining: result.remaining,
        totalHits: result.totalHits,
        limit: rateLimitOptions.requests,
      });

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error?.('Rate limit check failed', error, {
        key,
        path: request.path,
        method: request.method,
      });

      // Fail open - allow request if rate limiting fails
      return true;
    }
  }

  private generateKey(request: Request, options: RateLimitOptions): string {
    if (options.keyGenerator) {
      return options.keyGenerator(request);
    }

    // Default key generation based on IP and path
    const ip = request?.ip || request.socket?.remoteAddress || 'unknown';
    const path = this.getRequestPath(request);
    return `rate_limit:${ip}:${path}`;
  }

  private getRequestPath(request: Request): string {
    // Express types define request.route.path as any, but it's always a string when present
    const route = request.route as { path?: string } | undefined;
    const routePath = route?.path;
    if (routePath) {
      return routePath;
    }
    // request.path is also typed as any in Express, but it's a string representing the URL path
    const pathValue = request.path;
    return typeof pathValue === 'string' ? pathValue : '/';
  }

  private setRateLimitHeaders(
    response: Response,
    result: { remaining: number; resetTime: number; totalHits: number },
    options: RateLimitOptions,
  ): void {
    response.setHeader('X-RateLimit-Limit', options.requests);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
    response.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
    response.setHeader('X-RateLimit-Window', options.window);

    if (result.remaining <= 0) {
      response.setHeader(
        'Retry-After',
        Math.ceil((result.resetTime - Date.now()) / 1000),
      );
    }
  }
}


