// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://fullwashandset.net',
  base: '/',
  output: 'static',
  trailingSlash: 'never',
});