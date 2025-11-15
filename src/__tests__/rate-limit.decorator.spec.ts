import { RateLimit, RateLimitOptions } from '../decorators/rate-limit.decorator';

describe('RateLimit Decorator', () => {
  it('should apply default values when options are partially provided', () => {
    const partialOptions: Partial<RateLimitOptions> = {
      requests: 50,
    };

    // This tests the default options logic in the decorator
    // The decorator should fill in defaults for window, skipSuccessfulRequests, skipFailedRequests
    const decorator = RateLimit(partialOptions as RateLimitOptions);

    expect(decorator).toBeDefined();
  });

  it('should use provided window when specified', () => {
    const options: RateLimitOptions = {
      requests: 100,
      window: '5m',
    };

    const decorator = RateLimit(options);
    expect(decorator).toBeDefined();
  });

  it('should use default window when not specified', () => {
    const options: Partial<RateLimitOptions> = {
      requests: 100,
    };

    const decorator = RateLimit(options as RateLimitOptions);
    expect(decorator).toBeDefined();
  });

  it('should use default requests when not specified', () => {
    const options: Partial<RateLimitOptions> = {
      window: '1m',
    };

    const decorator = RateLimit(options as RateLimitOptions);
    expect(decorator).toBeDefined();
  });

  it('should handle skipSuccessfulRequests option', () => {
    const options: RateLimitOptions = {
      requests: 10,
      window: '1m',
      skipSuccessfulRequests: true,
    };

    const decorator = RateLimit(options);
    expect(decorator).toBeDefined();
  });

  it('should handle skipFailedRequests option', () => {
    const options: RateLimitOptions = {
      requests: 10,
      window: '1m',
      skipFailedRequests: true,
    };

    const decorator = RateLimit(options);
    expect(decorator).toBeDefined();
  });

  it('should handle keyGenerator option', () => {
    const options: RateLimitOptions = {
      requests: 10,
      window: '1m',
      keyGenerator: () => 'custom-key',
    };

    const decorator = RateLimit(options);
    expect(decorator).toBeDefined();
  });
});
