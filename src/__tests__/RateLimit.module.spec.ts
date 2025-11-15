import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RateLimitModule } from '../RateLimit.module';
import { RateLimitService } from '../RateLimit.service';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { RateLimitInterceptor } from '../interceptors/rate-limit.interceptor';

describe('RateLimitModule', () => {
  describe('Module Configuration', () => {
    it('should be defined', () => {
      expect(RateLimitModule).toBeDefined();
    });

    it('should create module with forRoot()', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [RateLimitModule.forRoot(), ConfigModule.forRoot()],
      }).compile();

      expect(module).toBeDefined();
      await module.close();
    });

    it('should create module with custom logger', async () => {
      const customLogger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          RateLimitModule.forRoot({ logger: customLogger }),
          ConfigModule.forRoot(),
        ],
      }).compile();

      expect(module).toBeDefined();
      await module.close();
    });
  });

  describe('Providers', () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [RateLimitModule.forRoot(), ConfigModule.forRoot()],
      }).compile();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should provide RateLimitService', () => {
      const service = module.get<RateLimitService>(RateLimitService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(RateLimitService);
    });

    it('should provide RateLimitGuard', () => {
      const guard = module.get<RateLimitGuard>(RateLimitGuard);
      expect(guard).toBeDefined();
      expect(guard).toBeInstanceOf(RateLimitGuard);
    });

    it('should provide RateLimitInterceptor', () => {
      const interceptor = module.get<RateLimitInterceptor>(
        RateLimitInterceptor,
      );
      expect(interceptor).toBeDefined();
      expect(interceptor).toBeInstanceOf(RateLimitInterceptor);
    });

    it('should provide IRateLimit token', () => {
      const service = module.get<RateLimitService>('IRateLimit');
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(RateLimitService);
    });
  });

  describe('Exports', () => {
    it('should export RateLimitService', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [RateLimitModule.forRoot(), ConfigModule.forRoot()],
      }).compile();

      const service = module.get<RateLimitService>(RateLimitService);
      expect(service).toBeDefined();
      await module.close();
    });

    it('should export RateLimitGuard', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [RateLimitModule.forRoot(), ConfigModule.forRoot()],
      }).compile();

      const guard = module.get<RateLimitGuard>(RateLimitGuard);
      expect(guard).toBeDefined();
      await module.close();
    });

    it('should export RateLimitInterceptor', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [RateLimitModule.forRoot(), ConfigModule.forRoot()],
      }).compile();

      const interceptor = module.get<RateLimitInterceptor>(
        RateLimitInterceptor,
      );
      expect(interceptor).toBeDefined();
      await module.close();
    });
  });
});
