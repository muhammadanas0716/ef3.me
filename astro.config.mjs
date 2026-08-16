// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// Vite hasn't loaded `.env` files yet when this config is evaluated, so pull
// them in here — otherwise `site` silently falls back to the default and every
// canonical URL, feed link and OG image points at the wrong origin locally.
// On Vercel the files don't exist and the real env vars are already present.
for (const file of ['.env', '.env.local']) {
  try {
    process.loadEnvFile(file);
  } catch {
    /* not present — fine */
  }
}

const site = (process.env.PUBLIC_SITE_URL || 'https://effielabs.com').replace(/\/$/, '');

export default defineConfig({
  site,
  output: 'server',
  // One canonical shape per URL. Without this `/blog` and `/blog/` are two
  // addresses for the same page, which splits ranking signals.
  trailingSlash: 'never',
  adapter: vercel({
    // Cache rendered pages on Vercel's CDN like static files, but never the
    // authenticated editor or any API route.
    isr: {
      expiration: 60,
      exclude: ['/write', /^\/api\/.*/],
    },
    imageService: true,
    maxDuration: 30,
  }),
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
