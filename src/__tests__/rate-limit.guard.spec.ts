import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { RateLimitService } from '../RateLimit.service';
import type { RateLimitOptions } from '../decorators/rate-limit.decorator';
import type { Request, Response } from 'express';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let rateLimitService: jest.Mocked<RateLimitService>;
  let reflector: Reflector;

  const mockRequest = {
    ip: '127.0.0.1',
    path: '/test',
    method: 'GET',
    socket: { remoteAddress: '127.0.0.1' },
    route: { path: '/test' },
    get: jest.fn(() => 'test-agent'),
  } as unknown as Request;

  const mockResponse = {
    setHeader: jest.fn(),
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

  beforeEach(async () => {
    rateLimitService = {
      checkRateLimit: jest.fn(),
    } as unknown as jest.Mocked<RateLimitService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        {
          provide: RateLimitService,
          useValue: rateLimitService,
        },
        Reflector,
      ],
    }).compile();

    // Get the reflector instance from the module
    reflector = module.get<Reflector>(Reflector);

    guard = module.get<RateLimitGuard>(RateLimitGuard);
  });

  describe('canActivate', () => {
    it('should allow request when no rate limit metadata', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(rateLimitService.checkRateLimit).not.toHaveBeenCalled();
    });

    it('should allow request when under limit', async () => {
      const options: RateLimitOptions = {
        requests: 10,
        window: '1m',
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(options);

      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 5,
        resetTime: Date.now() + 60000,
        totalHits: 5,
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(rateLimitService.checkRateLimit).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
    });

    it('should throw HttpException when limit exceeded', async () => {
      const options: RateLimitOptions = {
        requests: 10,
        window: '1m',
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(options);

      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        totalHits: 11,
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(HttpException);

      await expect(guard.canActivate(mockContext)).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    it('should allow request on service error (fail open)', async () => {
      const options: RateLimitOptions = {
        requests: 10,
        window: '1m',
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(options);

      rateLimitService.checkRateLimit.mockRejectedValue(new Error('Service error'));

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });

  describe('generateKey', () => {
    it('should use custom keyGenerator if provided', async () => {
      const options: RateLimitOptions = {
        requests: 10,
        window: '1m',
        keyGenerator: req => `custom:${req.ip}`,
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(options);

      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 5,
        resetTime: Date.now() + 60000,
        totalHits: 5,
      });

      await guard.canActivate(mockContext);

      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith('custom:127.0.0.1', options);
    });

    it('should use default key format when no keyGenerator', async () => {
      const options: RateLimitOptions = {
        requests: 10,
        window: '1m',
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(options);

      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 5,
        resetTime: Date.now() + 60000,
        totalHits: 5,
      });

      await guard.canActivate(mockContext);

      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'rate_limit:127.0.0.1:/test',
        options
      );
    });

    it('should use request.path when route.path is not available', async () => {
      const options: RateLimitOptions = {
        requests: 10,
        window: '1m',
      };

      const mockRequestNoRoute = {
        ip: '127.0.0.1',
        path: '/alternative-path',
        method: 'GET',
        socket: { remoteAddress: '127.0.0.1' },
        route: undefined,
        get: jest.fn(() => 'test-agent'),
      } as unknown as Request;

      const mockContextNoRoute = {
        switchToHttp: jest.fn(() => ({
          getRequest: () => mockRequestNoRoute,
          getResponse: () => mockResponse,
        })),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(options);

      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 5,
        resetTime: Date.now() + 60000,
        totalHits: 5,
      });

      await guard.canActivate(mockContextNoRoute);

      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'rate_limit:127.0.0.1:/alternative-path',
        options
      );
    });

    it('should use fallback path when request.path is not a string', async () => {
      const options: RateLimitOptions = {
        requests: 10,
        window: '1m',
      };

      const mockRequestInvalidPath = {
        ip: '127.0.0.1',
        path: null,
        method: 'GET',
        socket: { remoteAddress: '127.0.0.1' },
        route: undefined,
        get: jest.fn(() => 'test-agent'),
      } as unknown as Request;

      const mockContextInvalidPath = {
        switchToHttp: jest.fn(() => ({
          getRequest: () => mockRequestInvalidPath,
          getResponse: () => mockResponse,
        })),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(options);

      rateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 5,
        resetTime: Date.now() + 60000,
        totalHits: 5,
      });

      await guard.canActivate(mockContextInvalidPath);

      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'rate_limit:127.0.0.1:/',
        options
      );
    });
  });
});
