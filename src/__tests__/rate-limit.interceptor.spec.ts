import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { RateLimitInterceptor } from '../interceptors/rate-limit.interceptor';
import { RateLimitService } from '../RateLimit.service';
import { RATE_LIMIT_METADATA, RateLimitOptions } from '../decorators/rate-limit.decorator';
import type { Request, Response } from 'express';

describe('RateLimitInterceptor', () => {
  let interceptor: RateLimitInterceptor;
  let rateLimitService: jest.Mocked<RateLimitService>;
  let reflector: Reflector;

  const mockRequest = {
    ip: '127.0.0.1',
    path: '/test',
    method: 'GET',
    socket: { remoteAddress: '127.0.0.1' },
    route: { path: '/test' },
  } as unknown as Request;

  const mockResponse = {
    statusCode: 200,
  } as unknown as Response;

  const mockContext = {
    switchToHttp: jest.fn(() => ({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    })),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  const mockHandler: CallHandler = {
    handle: jest.fn(() => of({ data: 'test' })),
  } as unknown as CallHandler;

  beforeEach(async () => {
    rateLimitService = {
      decrementRateLimit: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RateLimitService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitInterceptor,
        {
          provide: RateLimitService,
          useValue: rateLimitService,
        },
        Reflector,
      ],
    }).compile();

    // Get the reflector instance from the module
    reflector = module.get<Reflector>(Reflector);

    interceptor = module.get<RateLimitInterceptor>(RateLimitInterceptor);
  });

  describe('intercept', () => {
    it('should pass through when no rate limit metadata', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = interceptor.intercept(mockContext, mockHandler);

      expect(result).toBeDefined();
      expect(rateLimitService.decrementRateLimit).not.toHaveBeenCalled();
    });

    it('should not decrement for normal successful request', done => {
      const options: RateLimitOptions = {
        requests: 10,
        window: '1m',
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(options);
      mockResponse.statusCode = 200;

      interceptor.intercept(mockContext, mockHandler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(rateLimitService.decrementRateLimit).not.toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });

    it('should decrement for successful request when skipSuccessfulRequests is true', done => {
      const options: RateLimitOptions = {
        requests: 10,
        window: '1m',
        skipSuccessfulRequests: true,
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(options);
      mockResponse.statusCode = 200;

      interceptor.intercept(mockContext, mockHandler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(rateLimitService.decrementRateLimit).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });

    it('should decrement for failed request when skipFailedRequests is true', done => {
      const options: RateLimitOptions = {
        requests: 10,
        window: '1m',
        skipFailedRequests: true,
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(options);

      const errorHandler: CallHandler = {
        handle: jest.fn(() =>
          throwError(() => ({
            status: 400,
            message: 'Bad Request',
          }))
        ),
      } as unknown as CallHandler;

      interceptor.intercept(mockContext, errorHandler).subscribe({
        error: () => {
          setTimeout(() => {
            expect(rateLimitService.decrementRateLimit).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });

    it('should not decrement for failed request when skipFailedRequests is false', done => {
      const options: RateLimitOptions = {
        requests: 10,
        window: '1m',
        skipFailedRequests: false,
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(options);

      const errorHandler: CallHandler = {
        handle: jest.fn(() =>
          throwError(() => ({
            status: 400,
            message: 'Bad Request',
          }))
        ),
      } as unknown as CallHandler;

      interceptor.intercept(mockContext, errorHandler).subscribe({
        error: () => {
          setTimeout(() => {
            expect(rateLimitService.decrementRateLimit).not.toHaveBeenCalled();
            done();
          }, 10);
        },
      });
    });
  });
});
