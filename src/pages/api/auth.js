import { checkPin, clearRateLimit, clearSession, rateLimit, setSession } from '../../lib/auth.js';
import { handle, json } from '../../lib/post.js';

export const prerender = false;

export async function POST({ request, cookies, clientAddress }) {
  return handle(async () => {
    const { pin } = await request.json().catch(() => ({}));

    const limit = rateLimit(clientAddress ?? 'unknown');
    if (!limit.ok) {
      return json({ error: `Too many attempts. Try again in ${limit.retryAfter}s.` }, 429);
    }

    // A uniform delay on every attempt, so response time leaks nothing.
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (!checkPin(pin)) {
      return json({ error: 'Wrong PIN.' }, 401);
    }

    clearRateLimit(clientAddress ?? 'unknown');
    setSession(cookies);
    return json({ ok: true });
  });
}

export function DELETE({ cookies }) {
  clearSession(cookies);
  return json({ ok: true });
}
