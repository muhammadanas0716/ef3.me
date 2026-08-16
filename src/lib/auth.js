import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { env } from './convex.js';

export const SESSION_COOKIE = 'el_write';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // two weeks

function secret() {
  const value = env('AUTH_SECRET');
  if (!value || value.length < 16) {
    throw new Error('AUTH_SECRET must be set to a random string of at least 16 characters.');
  }
  return value;
}

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function equal(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** Token shape: `<expiry-ms>.<nonce>.<hmac>`. Stateless, so no session store. */
export function createSessionToken() {
  const payload = `${Date.now() + SESSION_TTL_MS}.${randomBytes(9).toString('base64url')}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token) {
  if (typeof token !== 'string') return false;
  const index = token.lastIndexOf('.');
  if (index <= 0) return false;
  const payload = token.slice(0, index);
  const signature = token.slice(index + 1);
  if (!equal(signature, sign(payload))) return false;
  const expiry = Number(payload.split('.')[0]);
  return Number.isFinite(expiry) && expiry > Date.now();
}

export function checkPin(candidate) {
  const pin = env('WRITE_PIN');
  if (!pin) throw new Error('WRITE_PIN is not set.');
  return typeof candidate === 'string' && equal(candidate.trim(), pin);
}

/** True when the request carries a valid, unexpired editor session. */
export function isAuthed(cookies) {
  try {
    return verifySessionToken(cookies.get(SESSION_COOKIE)?.value);
  } catch {
    return false;
  }
}

export function setSession(cookies) {
  cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSession(cookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

/**
 * Best-effort brute-force brake. Serverless instances are short-lived and not
 * shared, so this is a speed bump rather than a wall: the real protection is
 * that a wrong PIN reveals nothing and the PIN itself is never echoed back.
 */
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function rateLimit(key) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(key, { first: now, count: 1 });
    return { ok: true, remaining: MAX_ATTEMPTS - 1 };
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    return { ok: false, retryAfter: Math.ceil((entry.first + WINDOW_MS - now) / 1000) };
  }
  return { ok: true, remaining: MAX_ATTEMPTS - entry.count };
}

export function clearRateLimit(key) {
  attempts.delete(key);
}

function deny(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

/**
 * Cross-site request forgery guard.
 *
 * `SameSite=Lax` already stops a browser attaching the session cookie to a
 * cross-site write, and Astro rejects cross-origin *form* posts, but neither
 * covers a JSON request from a non-browser client, so check the origin
 * ourselves. A mismatched `Origin` is always refused; an absent one is allowed
 * so scripting against your own API from a terminal still works.
 */
function sameOrigin(context) {
  const origin = context.request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === context.url.host;
  } catch {
    return false;
  }
}

/**
 * Guard for every editor endpoint. Takes the whole Astro API context, not
 * just `cookies`, and returns a `Response` to send straight back, or `null`
 * when the caller may proceed.
 */
export function requireAuth(context) {
  // Handed the wrong thing (e.g. just `cookies`), this must fail closed and
  // say so, rather than throwing a TypeError that surfaces as a vague 500.
  if (!context?.request || !context?.url || !context?.cookies) {
    console.error('[auth] requireAuth() needs the full API context, got:', typeof context);
    return deny(500, 'Server misconfigured.');
  }
  if (!sameOrigin(context)) return deny(403, 'Cross-origin request refused.');
  if (!isAuthed(context.cookies)) return deny(401, 'Not authorised.');
  return null;
}
