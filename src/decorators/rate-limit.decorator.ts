import { SetMetadata, applyDecorators, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { RateLimitInterceptor } from '../interceptors/rate-limit.interceptor';

export const RATE_LIMIT_METADATA = 'rate_limit_metadata';

/**
 * Configuration options for the RateLimit decorator
 */
export interface RateLimitOptions {
  /** Number of requests allowed within the window. Default: 100 */
  requests: number;
  /** Time window for rate limiting (e.g., '1m', '1h', '30s'). Default: '1m' */
  window: string;
  /**
   * Custom key generator function for rate limiting.
   * Default generates key based on IP address and request path.
   *
   * @param req - Express request object
   * @returns string - Unique key for rate limiting
   */
  keyGenerator?: (req: Request) => string;
  /** Whether to skip rate limiting for successful requests (2xx status). Default: false */
  skipSuccessfulRequests?: boolean;
  /** Whether to skip rate limiting for failed requests (4xx/5xx status). Default: false */
  skipFailedRequests?: boolean;
}

/**
 * Decorator that applies rate limiting to controller methods or entire controllers.
 *
 * This decorator uses Redis-based sliding window rate limiting to track and limit
 * requests. It provides distributed rate limiting that works across multiple
 * application instances and includes comprehensive logging and monitoring.
 *
 * The decorator automatically applies both RateLimitGuard and RateLimitInterceptor
 * to enforce the rate limit and handle response logic.
 *
 * @param options - Configuration options for rate limiting behavior
 * @param options.requests - Maximum number of requests allowed within the time window
 * @param options.window - Time window in format: number + unit (s/m/h/d). Examples: '30s', '5m', '1h', '7d'
 * @param options.keyGenerator - Optional custom function to generate rate limit keys
 * @param options.skipSuccessfulRequests - If true, don't count requests that return 2xx status
 * @param options.skipFailedRequests - If true, don't count requests that return 4xx/5xx status
 *
 * @returns A combined decorator that applies guards and interceptors
 *
 * @example
 * Basic usage - limit login attempts to 10 per minute
 * ```ts
 * // In your controller:
 * // import { RateLimit } from '@shinijs/rate-limit';
 * //
 * // Apply the decorator to your route:
 * RateLimit({ requests: 10, window: '1m' })
 * async login(loginDto: LoginDto) {
 *   return this.authService.login(loginDto);
 * }
 * ```
 *
 * @example
 * Controller-level rate limiting - applies to all routes in the controller
 * ```ts
 * // Apply to entire controller:
 * // RateLimit({ requests: 1000, window: '1h' })
 * // export class ApiController { ... }
 * //
 * // Override for specific route:
 * RateLimit({ requests: 5, window: '10m' })
 * async uploadFile() {
 *   return this.uploadService.handleUpload();
 * }
 * ```
 *
 * @example
 * Custom key generation for user-specific rate limiting
 * ```ts
 * RateLimit({
 *   requests: 5,
 *   window: '15m',
 *   keyGenerator: (req) => {
 *     const userId = req.user?.id || 'anonymous';
 *     return 'user:' + userId + ':profile-update';
 *   }
 * })
 * async updateProfile(updateDto: UpdateProfileDto) {
 *   return this.userService.updateProfile(updateDto);
 * }
 * ```
 *
 * @example
 * Skip counting failed requests (useful for login attempts)
 * ```ts
 * RateLimit({
 *   requests: 10,
 *   window: '1h',
 *   skipFailedRequests: true
 * })
 * async sensitiveOperation() {
 *   // Only successful requests count toward the limit
 *   return this.performOperation();
 * }
 * ```
 */
export const RateLimit = (options: RateLimitOptions) => {
  const defaultOptions: RateLimitOptions = {
    ...options,
    requests: options.requests ?? 100,
    window: options.window ?? '1m',
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    skipFailedRequests: options.skipFailedRequests ?? false,
  };

  return applyDecorators(
    SetMetadata(RATE_LIMIT_METADATA, defaultOptions),
    UseGuards(RateLimitGuard),
    UseInterceptors(RateLimitInterceptor)
  );
};
