import { Global, Module, DynamicModule, LoggerService } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimitService, RATE_LIMIT_LOGGER } from './RateLimit.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';

export interface RateLimitModuleOptions {
  logger?: LoggerService;
}

@Global()
@Module({})
export class RateLimitModule {
  static forRoot(options?: RateLimitModuleOptions): DynamicModule {
    const providers: any[] = [
      RateLimitService,
      RateLimitGuard,
      RateLimitInterceptor,
      {
        provide: 'IRateLimit',
        useExisting: RateLimitService,
      },
    ];

    // Provide logger if custom logger is provided
    if (options?.logger) {
      providers.push({
        provide: RATE_LIMIT_LOGGER,
        useValue: options.logger,
      });
    }

    return {
      module: RateLimitModule,
      imports: [ConfigModule],
      providers,
      exports: [RateLimitService, RateLimitGuard, RateLimitInterceptor, 'IRateLimit'],
    };
  }
}
