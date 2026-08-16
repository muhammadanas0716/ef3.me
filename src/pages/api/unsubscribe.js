import { convex, isConvexConfigured } from '../../lib/convex.js';
import { api } from '../../../convex/_generated/api.js';

export const prerender = false;

async function drop(token) {
  if (!token || !isConvexConfigured) return false;
  try {
    const result = await convex().mutation(api.subscribers.unsubscribe, { token });
    return Boolean(result?.ok);
  } catch (error) {
    console.error('[unsubscribe] failed:', error?.message ?? error);
    return false;
  }
}

/**
 * One-click unsubscribe (RFC 8058). Gmail and Outlook POST here directly from
 * their own UI, with no cookie and no confirmation step, so it must work on
 * the token alone and always answer 200, or the provider marks the sender as
 * not honouring unsubscribes.
 */
export async function POST({ url }) {
  await drop(url.searchParams.get('token'));
  return new Response(null, { status: 200, headers: { 'cache-control': 'no-store' } });
}

/** Some clients follow the header with a GET; send those to the real page. */
export function GET({ url }) {
  const token = url.searchParams.get('token') ?? '';
  return new Response(null, {
    status: 302,
    headers: {
      location: `/unsubscribe?token=${encodeURIComponent(token)}`,
      'cache-control': 'no-store',
    },
  });
}
