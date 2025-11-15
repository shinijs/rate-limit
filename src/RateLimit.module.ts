import { Global, Module, DynamicModule, LoggerService } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimitService, RATE_LIMIT_LOGGER } from './RateLimit.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';

export interface RateLimitModuleOptions {
  logger?: LoggerService;
  loggerToken?: string | symbol; // Token to inject logger from DI container
}

@Global()
@Module({})
export class RateLimitModule {
  static forRoot(options?: RateLimitModuleOptions): DynamicModule {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const providers: any[] = [
      RateLimitService,
      RateLimitGuard,
      RateLimitInterceptor,
      {
        provide: 'IRateLimit',
        useExisting: RateLimitService,
      },
    ];

    // Provide logger if custom logger is provided directly
    if (options?.logger) {
      providers.push({
        provide: RATE_LIMIT_LOGGER,
        useValue: options.logger,
      });
    }
    // Or use a logger from DI container via token
    else if (options?.loggerToken) {
      providers.push({
        provide: RATE_LIMIT_LOGGER,
        useFactory: (logger: LoggerService) => logger,
        inject: [options.loggerToken],
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
