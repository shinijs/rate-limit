---
layout: home

hero:
  name: "@shinijs/rate-limit"
  text: "Flexible Rate Limiting for NestJS"
  tagline: Protect your APIs with distributed rate limiting powered by Redis
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/shinijs/rate-limit

features:
  - icon: 🚀
    title: Redis-Powered
    details: Distributed rate limiting with Redis support and automatic memory-based fallback
  - icon: 🎨
    title: TypeScript First
    details: Full type safety and IntelliSense support for an excellent developer experience
  - icon: 🔧
    title: Flexible Configuration
    details: Per-route rate limits with customizable time windows (seconds, minutes, hours, days)
  - icon: 📦
    title: NestJS Native
    details: Seamless integration using decorators, guards, and interceptors
  - icon: 🧪
    title: Battle Tested
    details: Comprehensive test coverage with 33 passing tests
  - icon: 🌐
    title: Production Ready
    details: Built for distributed systems with horizontal scaling support
---

## Quick Start

```bash
pnpm add @shinijs/rate-limit
```

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimit, RateLimitGuard } from '@shinijs/rate-limit';

@Controller('api')
@UseGuards(RateLimitGuard)
export class ApiController {
  @Get('users')
  @RateLimit({ requests: 100, window: '1m' }) // 100 requests per minute
  getUsers() {
    return { users: [] };
  }

  @Get('sensitive')
  @RateLimit({ requests: 5, window: '1h' }) // Stricter limit for sensitive endpoints
  getSensitiveData() {
    return { data: 'secret' };
  }
}
```

## Installation

See the [Installation Guide](/guide/getting-started) for detailed setup instructions.

## Key Features

- ✅ **Distributed Rate Limiting** - Redis-backed rate limiting for multi-instance deployments
- ✅ **Automatic Fallback** - Gracefully falls back to memory-based limiting when Redis is unavailable
- ✅ **Multiple Integration Patterns** - Use decorators, guards, interceptors, or service directly
- ✅ **Flexible Time Windows** - Support for seconds, minutes, hours, and days
- ✅ **TypeScript Support** - Full type definitions and IntelliSense
- ✅ **Health Monitoring** - Built-in health check for Redis connectivity

## Documentation

- [Getting Started](/guide/getting-started) - Installation and basic usage
- [Configuration](/guide/configuration) - Redis setup and environment variables
- [API Reference](/api/RateLimit-module) - Complete API documentation
- [Examples](/guide/examples) - Usage examples and patterns

