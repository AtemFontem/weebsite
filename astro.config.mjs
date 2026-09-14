// astro.config.mjs
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://fullwashandset.net',
  base: '/',
  output: 'server',
  trailingSlash: 'never',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
    sessionKVBindingName: undefined,
  }),
  
});