import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
  Logger,
  LoggerService,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { RateLimitService } from '../RateLimit.service';
import {
  RATE_LIMIT_METADATA,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';
import { RATE_LIMIT_LOGGER } from '../RateLimit.service';

/**
 * NestJS interceptor that handles rate limit response logic and cleanup.
 *
 * This interceptor works in conjunction with the RateLimitGuard to provide
 * advanced rate limiting features like skipping successful or failed requests.
 * It also handles decrementing the rate limit counter when configured to skip
 * certain types of requests.
 *
 * Features:
 * - Supports skipSuccessfulRequests option (2xx status codes)
 * - Supports skipFailedRequests option (4xx/5xx status codes)
 * - Automatically decrements rate limit when skipping requests
 * - Works seamlessly with RateLimitGuard
 * - Uses same key generation logic as guard for consistency
 *
 * Note: The RateLimit decorator automatically applies both the guard and
 * interceptor, so you typically don't need to use this directly unless you
 * want fine-grained control.
 *
 * Usage:
 * Apply to routes or controllers using UseInterceptors decorator.
 *
 * Example (per-route):
 * ```
 * Controller('api')
 * export class ApiController {
 *   Get('data')
 *   UseInterceptors(RateLimitInterceptor)
 *   RateLimit({
 *     requests: 100,
 *     window: '1m',
 *     skipSuccessfulRequests: true
 *   })
 *   getData() {
 *     return { data: 'protected' };
 *   }
 * }
 * ```
 *
 * Example (with guard for skip logic):
 * ```
 * Controller('api')
 * UseGuards(RateLimitGuard)
 * UseInterceptors(RateLimitInterceptor)
 * export class ApiController {
 *   Post('action')
 *   RateLimit({
 *     requests: 10,
 *     window: '1h',
 *     skipFailedRequests: true
 *   })
 *   performAction() {
 *     return { success: true };
 *   }
 * }
 * ```
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger: LoggerService;

  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly reflector: Reflector,
    @Optional()
    @Inject(RATE_LIMIT_LOGGER)
    logger?: LoggerService,
  ) {
    this.logger = logger || new Logger(RateLimitInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const rateLimitOptions =
      this.reflector.getAllAndOverride<RateLimitOptions>(
        RATE_LIMIT_METADATA,
        [context.getHandler(), context.getClass()],
      );

    if (!rateLimitOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Generate the same rate limit key as the guard
    const key = this.generateKey(request, rateLimitOptions);

    return next.handle().pipe(
      tap({
        next: () => {
          void this.handleResponse(key, response.statusCode, rateLimitOptions);
        },
        error: (error: unknown) => {
          // For error responses, check if we should skip failed requests
          const statusCode =
            (error as { status?: number; response?: { statusCode?: number } })
              ?.status ||
            (error as { status?: number; response?: { statusCode?: number } })
              ?.response?.statusCode ||
            500;
          void this.handleResponse(key, statusCode, rateLimitOptions);
        },
      }),
    );
  }

  private async handleResponse(
    key: string,
    statusCode: number,
    options: RateLimitOptions,
  ): Promise<void> {
    try {
      let shouldSkip = false;

      // Check if we should skip successful requests (2xx status codes)
      if (
        options.skipSuccessfulRequests &&
        statusCode >= 200 &&
        statusCode < 300
      ) {
        shouldSkip = true;
        this.logger.debug?.(
          'Skipping rate limit increment for successful request',
          {
            key,
            statusCode,
            skipSuccessfulRequests: options.skipSuccessfulRequests,
          },
        );
      }

      // Check if we should skip failed requests (4xx/5xx status codes)
      if (options.skipFailedRequests && statusCode >= 400) {
        shouldSkip = true;
        this.logger.debug?.(
          'Skipping rate limit increment for failed request',
          {
            key,
            statusCode,
            skipFailedRequests: options.skipFailedRequests,
          },
        );
      }

      if (shouldSkip) {
        await this.rateLimitService.decrementRateLimit(key);
      }
    } catch (error) {
      this.logger.error?.('Failed to handle rate limit response', error, {
        key,
        statusCode,
      });
    }
  }

  private generateKey(request: Request, options: RateLimitOptions): string {
    if (options.keyGenerator) {
      return options.keyGenerator(request);
    }

    // Default key generation based on IP and path (same as guard)
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
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
}


