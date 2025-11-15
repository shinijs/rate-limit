# @shinijs/rate-limit

## 1.1.0

### Minor Changes

- 3d4a589: Add loggerToken support for dependency injection and fix fallback rate limiting implementation.

  **Features:**
  - Add `loggerToken` option to `RateLimitModuleOptions` for injecting logger via DI container
  - Fix fallback rate limiting to properly track hits in memory (was previously broken)
  - Change module system from ESM to CommonJS for better NestJS compatibility
  - Fix Redis dynamic import to handle both default and named exports
  - Add automatic cleanup for fallback storage to prevent memory leaks
  - Support `decrementRateLimit()` in fallback mode

  **Breaking Changes:**
  None - this is a backward compatible enhancement.

  **Migration:**
  No migration needed. Existing code continues to work. You can now optionally use `loggerToken` to inject a custom logger:

  ```typescript
  RateLimitModule.forRoot({
    loggerToken: YOUR_LOGGER_TOKEN,
  });
  ```

## 1.0.1

### Patch Changes

- 51202f0: fixed issues across codebase

## 1.0.0

### Major Changes

- 6f81980: first release
