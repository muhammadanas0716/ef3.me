import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { assertWriter } from './lib.js';

/**
 * Convex hands back a short-lived, single-use URL that the browser POSTs the
 * file straight to — the bytes never pass through the Astro server.
 */
export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    assertWriter(token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const save = mutation({
  args: {
    token: v.string(),
    storageId: v.id('_storage'),
    name: v.string(),
    contentType: v.optional(v.string()),
    size: v.optional(v.number()),
    alt: v.optional(v.string()),
  },
  handler: async (ctx, { token, ...media }) => {
    assertWriter(token);
    const id = await ctx.db.insert('media', { ...media, createdAt: Date.now() });
    return { id, url: await ctx.storage.getUrl(media.storageId) };
  },
});

export const list = query({
  args: { token: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { token, limit }) => {
    assertWriter(token);
    const docs = await ctx.db
      .query('media')
      .withIndex('by_created')
      .order('desc')
      .take(limit ?? 60);
    return await Promise.all(
      docs.map(async (d) => ({
        id: d._id,
        name: d.name,
        contentType: d.contentType ?? null,
        size: d.size ?? null,
        createdAt: d.createdAt,
        url: await ctx.storage.getUrl(d.storageId),
      })),
    );
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id('media') },
  handler: async (ctx, { token, id }) => {
    assertWriter(token);
    const doc = await ctx.db.get(id);
    if (!doc) return false;
    await ctx.storage.delete(doc.storageId);
    await ctx.db.delete(id);
    return true;
  },
});
