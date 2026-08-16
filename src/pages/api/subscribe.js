import { randomBytes } from 'node:crypto';
import { convex, writeToken, isConvexConfigured } from '../../lib/convex.js';
import { api } from '../../../convex/_generated/api.js';
import { handle, json, HttpError } from '../../lib/post.js';
import { isEmailConfigured, sendConfirmation } from '../../lib/email.js';
import { rateLimit } from '../../lib/auth.js';

export const prerender = false;

// Deliberately loose: catches typos and obvious junk without trying to be an
// RFC 5322 parser. The confirmation email is the real validator.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST({ request, clientAddress, url }) {
  return handle(async () => {
    // Public endpoint, so it needs its own brake.
    const limit = rateLimit(`subscribe:${clientAddress ?? 'unknown'}`);
    if (!limit.ok) throw new HttpError(429, 'Too many attempts. Try again shortly.');

    const origin = request.headers.get('origin');
    if (origin && new URL(origin).host !== url.host) {
      throw new HttpError(403, 'Cross-origin request refused.');
    }

    const { email, source } = await request.json().catch(() => ({}));
    const address = String(email ?? '').trim().toLowerCase();

    if (!EMAIL.test(address) || address.length > 254) {
      throw new HttpError(400, 'That doesn’t look like an email address.');
    }
    if (!isConvexConfigured) throw new HttpError(503, 'Subscriptions are not set up yet.');

    const token = randomBytes(24).toString('base64url');
    const result = await convex().mutation(api.subscribers.subscribe, {
      token,
      email: address,
      source: source ? String(source).slice(0, 60) : undefined,
    });

    // Already confirmed: say the same thing as a fresh sign-up rather than
    // confirming to a stranger that this address is on the list.
    if (result.status === 'active') {
      return json({ ok: true, message: 'Check your inbox to confirm.' });
    }

    if (isEmailConfigured()) {
      await sendConfirmation(address, result.token);
    } else {
      console.warn('[subscribe] Resend is not configured; no confirmation sent to', address);
    }

    return json({ ok: true, message: 'Check your inbox to confirm.' });
  });
}
