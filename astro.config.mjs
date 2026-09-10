// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Make sure output is not set to 'static' only
  // If you have output: 'static', change it to:
  output: 'static',

  site: 'https://atemfontem.github.io/weebsite',
  // ... rest of config
});