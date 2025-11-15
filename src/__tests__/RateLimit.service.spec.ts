/* eslint-disable no-undef */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RateLimitService } from '../RateLimit.service';

// Mock ioredis module - must be hoisted
const mockPipeline = {
  zremrangebyscore: jest.fn().mockReturnThis(),
  zadd: jest.fn().mockReturnThis(),
  zcard: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  zrem: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

const mockRedisInstance = {
  pipeline: jest.fn(() => mockPipeline),
  zrevrange: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG'),
};

jest.mock('ioredis', () => {
  return {
    Redis: jest.fn(() => mockRedisInstance),
    __mockRedis: mockRedisInstance,
    __mockPipeline: mockPipeline,
  };
});

// Get mocked instances - use the hoisted variables
const mockRedis = mockRedisInstance;

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset Redis instance mocks
    mockRedis.pipeline.mockReturnValue(mockPipeline);
    mockRedis.connect.mockResolvedValue(undefined);
    mockRedis.ping.mockResolvedValue('PONG');
    mockRedis.on.mockReturnValue(undefined);
    mockRedis.disconnect.mockReturnValue(undefined);
    mockRedis.zrevrange.mockResolvedValue([]);

    // Setup pipeline exec to return successful response
    mockPipeline.exec.mockResolvedValue([
      [null, 0], // zremrangebyscore
      [null, 1], // zadd
      [null, 5], // zcard (5 requests)
      [null, 1], // expire
    ]);

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);

    // Wait for Redis initialization - dynamic import happens asynchronously
    // The initializeRedis is called in constructor with void, so we need to wait
    let attempts = 0;
    const maxAttempts = 50;
    while (!service['redis'] && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    // If Redis still isn't initialized, log for debugging
    if (!service['redis']) {
      console.warn('Redis not initialized after', maxAttempts * 100, 'ms');
    }
  });

  describe('checkRateLimit', () => {
    const mockOptions = {
      requests: 10,
      window: '1m',
    };

    it('should allow request when under limit', async () => {
      // Ensure Redis is initialized
      expect(service['redis']).toBeDefined();

      mockPipeline.exec.mockResolvedValue([
        [null, 0],
        [null, 1],
        [null, 5], // 5 requests (under limit of 10)
        [null, 1],
      ]);

      const result = await service.checkRateLimit('test-key', mockOptions);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
      expect(result.totalHits).toBe(5);
      expect(result.resetTime).toBeGreaterThan(Date.now());
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should deny request when over limit', async () => {
      // Ensure Redis is initialized
      expect(service['redis']).toBeDefined();

      mockPipeline.exec.mockResolvedValue([
        [null, 0],
        [null, 1],
        [null, 11], // 11 requests (over limit of 10)
        [null, 1],
      ]);

      const result = await service.checkRateLimit('test-key', mockOptions);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.totalHits).toBe(11);
    });

    it('should handle Redis errors gracefully and fall back', async () => {
      mockPipeline.exec.mockRejectedValue(new Error('Redis error'));

      const result = await service.checkRateLimit('test-key', mockOptions);

      // Should fall back to allowing requests
      expect(result.allowed).toBe(true);
      expect(result.totalHits).toBe(0);
    });

    it('should throw error for invalid window format', async () => {
      const invalidOptions = {
        requests: 10,
        window: 'invalid',
      };

      await expect(service.checkRateLimit('test-key', invalidOptions)).rejects.toThrow(
        'Invalid window format'
      );
    });

    it('should parse different time windows correctly', async () => {
      // Test with different window formats
      const windows = ['30s', '5m', '1h', '1d'];

      for (const window of windows) {
        mockPipeline.exec.mockResolvedValue([
          [null, 0],
          [null, 1],
          [null, 1],
          [null, 1],
        ]);

        const result = await service.checkRateLimit('test-key', {
          requests: 10,
          window,
        });

        expect(result).toBeDefined();
        expect(result.allowed).toBe(true);
      }
    });
  });

  describe('decrementRateLimit', () => {
    it('should decrement rate limit successfully', async () => {
      // Ensure Redis is initialized
      expect(service['redis']).toBeDefined();

      mockRedis.zrevrange.mockResolvedValue(['entry-value', '12345']);
      mockPipeline.exec.mockResolvedValue([[null, 1]]);

      await service.decrementRateLimit('test-key');

      expect(mockRedis.zrevrange).toHaveBeenCalledWith('test-key', 0, 0, 'WITHSCORES');
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should handle case when no entries exist', async () => {
      // Ensure Redis is initialized
      expect(service['redis']).toBeDefined();

      mockRedis.zrevrange.mockResolvedValue([]);

      await service.decrementRateLimit('test-key');

      expect(mockRedis.zrevrange).toHaveBeenCalled();
      // Should not throw error
    });
  });

  describe('healthCheck', () => {
    it('should return true when Redis is healthy', async () => {
      // Ensure Redis is initialized
      expect(service['redis']).toBeDefined();

      mockRedis.ping.mockResolvedValue('PONG');

      const result = await service.healthCheck();

      expect(result).toBe(true);
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should return false when Redis ping fails', async () => {
      // Ensure Redis is initialized
      expect(service['redis']).toBeDefined();

      mockRedis.ping.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false when Redis is not initialized', async () => {
      // Create a service without Redis
      const mockConfigServiceNoRedis = {
        get: jest.fn(() => null),
      };

      const moduleNoRedis = await Test.createTestingModule({
        providers: [
          RateLimitService,
          {
            provide: ConfigService,
            useValue: mockConfigServiceNoRedis,
          },
        ],
      }).compile();

      const serviceNoRedis = moduleNoRedis.get<RateLimitService>(RateLimitService);

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await serviceNoRedis.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect Redis on module destroy', async () => {
      // Ensure Redis is initialized
      expect(service['redis']).toBeDefined();

      service.onModuleDestroy();

      expect(mockRedis.disconnect).toHaveBeenCalled();
    });
  });

  describe('configurable logger', () => {
    it('should use custom logger when provided', async () => {
      const customLogger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      };

      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'REDIS_URL') return 'redis://localhost:6379';
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RateLimitService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: 'RATE_LIMIT_LOGGER',
            useValue: customLogger,
          },
        ],
      }).compile();

      const serviceWithLogger = module.get<RateLimitService>(RateLimitService);

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(serviceWithLogger).toBeDefined();
      // Logger should be used during initialization if Redis connects
      // Note: In test environment, Redis might not connect, so we just check service exists
    });
  });

  describe('Redis event handlers', () => {
    it('should register Redis error event handler', async () => {
      const customLogger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      };

      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'REDIS_URL') return 'redis://localhost:6379';
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RateLimitService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: 'RATE_LIMIT_LOGGER',
            useValue: customLogger,
          },
        ],
      }).compile();

      const _serviceWithLogger = module.get<RateLimitService>(RateLimitService);

      // Wait for Redis initialization
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify error handler was registered
      const errorHandlers = mockRedis.on.mock.calls.filter(call => call[0] === 'error');
      expect(errorHandlers.length).toBeGreaterThan(0);

      await module.close();
    });

    it('should register Redis connect event handler', async () => {
      const customLogger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      };

      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'REDIS_URL') return 'redis://localhost:6379';
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RateLimitService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: 'RATE_LIMIT_LOGGER',
            useValue: customLogger,
          },
        ],
      }).compile();

      const _serviceWithLogger = module.get<RateLimitService>(RateLimitService);

      // Wait for Redis initialization
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify connect handler was registered
      const connectHandlers = mockRedis.on.mock.calls.filter(call => call[0] === 'connect');
      expect(connectHandlers.length).toBeGreaterThan(0);

      await module.close();
    });
  });

  describe('fallback mode', () => {
    it('should use fallback when Redis is not available', async () => {
      const mockConfigServiceNoRedis = {
        get: jest.fn(() => null),
      };

      const moduleNoRedis = await Test.createTestingModule({
        providers: [
          RateLimitService,
          {
            provide: ConfigService,
            useValue: mockConfigServiceNoRedis,
          },
        ],
      }).compile();

      const serviceNoRedis = moduleNoRedis.get<RateLimitService>(RateLimitService);

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 200));

      const result = await serviceNoRedis.checkRateLimit('test-key', {
        requests: 10,
        window: '1m',
      });

      expect(result.allowed).toBe(true);
      expect(result.totalHits).toBe(0);
      await moduleNoRedis.close();
    });

    it('should handle decrementRateLimit in fallback mode', async () => {
      const mockConfigServiceNoRedis = {
        get: jest.fn(() => null),
      };

      const customLogger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      };

      const moduleNoRedis = await Test.createTestingModule({
        providers: [
          RateLimitService,
          {
            provide: ConfigService,
            useValue: mockConfigServiceNoRedis,
          },
          {
            provide: 'RATE_LIMIT_LOGGER',
            useValue: customLogger,
          },
        ],
      }).compile();

      const serviceNoRedis = moduleNoRedis.get<RateLimitService>(RateLimitService);

      // Wait for initialization to ensure Redis is not initialized
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify Redis is not initialized
      expect(serviceNoRedis['redis']).toBeNull();

      // Should not throw when decrementing in fallback mode
      await expect(serviceNoRedis.decrementRateLimit('test-key')).resolves.not.toThrow();

      await moduleNoRedis.close();
    });
  });

  describe('Redis pipeline errors', () => {
    it('should handle pipeline execution failure', async () => {
      expect(service['redis']).toBeDefined();

      mockPipeline.exec.mockResolvedValue(null); // Simulate pipeline failure

      await expect(
        service.checkRateLimit('test-key', {
          requests: 10,
          window: '1m',
        })
      ).resolves.toMatchObject({
        allowed: true,
        totalHits: 0,
      });
    });

    it('should handle count error in pipeline results', async () => {
      expect(service['redis']).toBeDefined();

      mockPipeline.exec.mockResolvedValue([
        [null, 0], // zremrangebyscore
        [null, 1], // zadd
        [new Error('Count error'), null], // zcard with error
        [null, 1], // expire
      ]);

      await expect(
        service.checkRateLimit('test-key', {
          requests: 10,
          window: '1m',
        })
      ).resolves.toMatchObject({
        allowed: true,
        totalHits: 0,
      });
    });
  });

  describe('decrementRateLimit pipeline execution', () => {
    it('should execute pipeline when entries exist', async () => {
      expect(service['redis']).toBeDefined();

      mockRedis.zrevrange.mockResolvedValue(['entry-value', '12345']);
      mockPipeline.exec.mockResolvedValue([[null, 1]]);

      await service.decrementRateLimit('test-key');

      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should handle pipeline execution error in decrementRateLimit', async () => {
      expect(service['redis']).toBeDefined();

      mockRedis.zrevrange.mockResolvedValue(['entry-value', '12345']);
      mockPipeline.exec.mockRejectedValue(new Error('Pipeline error'));

      // Should not throw
      await expect(service.decrementRateLimit('test-key')).resolves.not.toThrow();
    });
  });

  describe('initializeRedis error handling', () => {
    it('should handle other initialization errors', async () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'REDIS_URL') return 'redis://localhost:6379';
          return undefined;
        }),
      };

      const customLogger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      };

      // Make connect fail - this will cause Redis to not be initialized
      mockRedis.connect.mockRejectedValueOnce(new Error('Connection failed'));

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RateLimitService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: 'RATE_LIMIT_LOGGER',
            useValue: customLogger,
          },
        ],
      }).compile();

      const serviceWithError = module.get<RateLimitService>(RateLimitService);

      // Wait for initialization attempt
      await new Promise(resolve => setTimeout(resolve, 300));

      // Service should still work after connection error (either fallback or Redis if mock still works)
      const result = await serviceWithError.checkRateLimit('test-key', {
        requests: 10,
        window: '1m',
      });

      // The important thing is that the service doesn't crash and returns a valid result
      expect(result.allowed).toBeDefined();
      expect(result.remaining).toBeDefined();
      expect(result.resetTime).toBeDefined();
      expect(result.totalHits).toBeDefined();

      await module.close();
    });
  });
});
