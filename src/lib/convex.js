import { ConvexHttpClient } from 'convex/browser';

/**
 * Reads env from both `process.env` (Vercel, `convex dev`-written `.env.local`)
 * and Astro's `import.meta.env`, since which one is populated depends on
 * whether we're in the Vite pipeline or a plain Node context.
 */
export function env(name) {
  const fromNode = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  return fromNode ?? import.meta.env?.[name] ?? undefined;
}

const CONVEX_URL = env('CONVEX_URL') || env('PUBLIC_CONVEX_URL') || env('VITE_CONVEX_URL');

let client;

/** Lazily created so a missing URL only errors on routes that actually query. */
export function convex() {
  if (!CONVEX_URL) {
    throw new Error(
      'CONVEX_URL is not set. Run `pnpm convex:dev` once to create a deployment, ' +
        'then copy the URL it writes into .env.local.',
    );
  }
  client ??= new ConvexHttpClient(CONVEX_URL);
  return client;
}

export const isConvexConfigured = Boolean(CONVEX_URL);

/** The shared secret that authorises writes. Server-side only: never ship it. */
export function writeToken() {
  const token = env('WRITE_TOKEN');
  if (!token) throw new Error('WRITE_TOKEN is not set.');
  return token;
}

/**
 * Public reads should never take the whole page down. If Convex is
 * unreachable or unconfigured we log and fall back, so the shell still
 * renders (and still returns a 200 with valid SEO tags).
 */
export async function safeQuery(fn, args, fallback) {
  if (!isConvexConfigured) return fallback;
  try {
    return await convex().query(fn, args);
  } catch (error) {
    console.error('[convex] query failed:', error?.message ?? error);
    return fallback;
  }
}
