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
  security: {
    // Astro's blanket check rejects *any* cross-site form-ish POST, which
    // would break RFC 8058 one-click unsubscribe — Gmail POSTs to it from
    // their own servers with `application/x-www-form-urlencoded`, and a
    // sender that refuses those gets penalised.
    //
    // CSRF is handled per route instead: `requireAuth()` enforces same-origin
    // on every editor endpoint, and /api/subscribe does its own check. The
    // only deliberately open endpoint is /api/unsubscribe, which is safe —
    // it is idempotent and authenticated by an unguessable per-subscriber
    // token, not by a cookie.
    checkOrigin: false,
  },
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
