import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { assertWriter } from './lib.js';

/**
 * Sign-up is deliberately public — anyone may subscribe — but it reveals
 * nothing: the caller always gets the same shape back whether the address was
 * new, already pending or already active. Otherwise this endpoint would be a
 * way to test who is on the list.
 */
export const subscribe = mutation({
  args: { email: v.string(), token: v.string(), source: v.optional(v.string()) },
  handler: async (ctx, { email, token, source }) => {
    const normalized = email.trim().toLowerCase();
    const existing = await ctx.db
      .query('subscribers')
      .withIndex('by_email', (q) => q.eq('email', normalized))
      .unique();

    if (existing?.status === 'active') {
      return { status: 'active', token: null };
    }

    if (existing) {
      // Re-subscribing, or asking for the confirmation mail again: issue a
      // fresh token so any old link stops working.
      await ctx.db.patch(existing._id, {
        status: 'pending',
        token,
        unsubscribedAt: undefined,
      });
      return { status: 'pending', token };
    }

    await ctx.db.insert('subscribers', {
      email: normalized,
      status: 'pending',
      token,
      source,
      createdAt: Date.now(),
    });
    return { status: 'pending', token };
  },
});

export const confirm = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const doc = await ctx.db
      .query('subscribers')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique();
    if (!doc) return { ok: false };
    if (doc.status !== 'active') {
      await ctx.db.patch(doc._id, { status: 'active', confirmedAt: Date.now() });
    }
    return { ok: true, email: doc.email };
  },
});

export const unsubscribe = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const doc = await ctx.db
      .query('subscribers')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique();
    if (!doc) return { ok: false };
    await ctx.db.patch(doc._id, { status: 'unsubscribed', unsubscribedAt: Date.now() });
    return { ok: true, email: doc.email };
  },
});

/** The mailing list. Writer-only — this is the one query that exposes addresses. */
export const listActive = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    assertWriter(token);
    const docs = await ctx.db
      .query('subscribers')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect();
    return docs.map((d) => ({ email: d.email, token: d.token }));
  },
});

/**
 * Hard-deletes an address. `unsubscribe` is the normal path — it keeps the
 * row so a re-subscribe is recognised — but a genuine erasure request (or a
 * test address) needs the record gone entirely.
 */
export const remove = mutation({
  args: { token: v.string(), email: v.string() },
  handler: async (ctx, { token, email }) => {
    assertWriter(token);
    const doc = await ctx.db
      .query('subscribers')
      .withIndex('by_email', (q) => q.eq('email', email.trim().toLowerCase()))
      .unique();
    if (!doc) return false;
    await ctx.db.delete(doc._id);
    return true;
  },
});

export const counts = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    assertWriter(token);
    const docs = await ctx.db.query('subscribers').collect();
    return {
      active: docs.filter((d) => d.status === 'active').length,
      pending: docs.filter((d) => d.status === 'pending').length,
      unsubscribed: docs.filter((d) => d.status === 'unsubscribed').length,
    };
  },
});
