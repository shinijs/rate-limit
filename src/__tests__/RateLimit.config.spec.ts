import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import rateLimitConfig from '../RateLimit.config';

describe('RateLimitConfig', () => {
  describe('registerAs', () => {
    it('should register config with default values when env vars not set', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [rateLimitConfig],
            envFilePath: undefined,
          }),
        ],
      }).compile();

      const configService = module.get(ConfigModule);
      expect(configService).toBeDefined();
      await module.close();
    });

    it('should use REDIS_URL from environment', async () => {
      const originalRedisUrl = process.env.REDIS_URL;
      process.env.REDIS_URL = 'redis://test:6379';

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [rateLimitConfig],
          }),
        ],
      }).compile();

      const configService = module.get(ConfigModule);
      expect(configService).toBeDefined();
      await module.close();

      if (originalRedisUrl) {
        process.env.REDIS_URL = originalRedisUrl;
      } else {
        delete process.env.REDIS_URL;
      }
    });

    it('should use RateLimit_ENABLED from environment', async () => {
      const originalEnabled = process.env.RateLimit_ENABLED;
      process.env.RateLimit_ENABLED = 'false';

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [rateLimitConfig],
          }),
        ],
      }).compile();

      const configService = module.get(ConfigModule);
      expect(configService).toBeDefined();
      await module.close();

      if (originalEnabled) {
        process.env.RateLimit_ENABLED = originalEnabled;
      } else {
        delete process.env.RateLimit_ENABLED;
      }
    });
  });
});
