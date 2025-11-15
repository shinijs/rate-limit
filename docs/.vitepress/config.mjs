import { defineConfig } from 'vitepress';

export default defineConfig({
  title: '@shinijs/rate-limit',
  description: 'A nest js wrapper for rate-limit',
  base: '/rate-limit/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/RateLimit-module' },
      { text: 'GitHub', link: 'https://github.com/shinijs/rate-limit' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Installation', link: '/guide/getting-started' },
            { text: 'Configuration', link: '/guide/configuration' },
            { text: 'Examples', link: '/guide/examples' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'RateLimitModule', link: '/api/RateLimit-module' },
          ],
        },
      ],
    },
  },
});

