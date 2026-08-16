import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { assertWriter, publicPost, postSummary } from './lib.js';

const postFields = {
  title: v.string(),
  slug: v.string(),
  excerpt: v.string(),
  content: v.string(),
  status: v.union(v.literal('draft'), v.literal('published')),
  tags: v.array(v.string()),
  coverImage: v.optional(v.string()),
  coverAlt: v.optional(v.string()),
  canonicalUrl: v.optional(v.string()),
  series: v.optional(v.string()),
  publishedAt: v.optional(v.number()),
  wordCount: v.number(),
  readingMinutes: v.number(),
};

/* ------------------------------------------------------------------ public */

export const listPublished = query({
  args: {
    tag: v.optional(v.string()),
    limit: v.optional(v.number()),
    /** Feeds need the bodies; index pages must not pay for them. */
    withContent: v.optional(v.boolean()),
  },
  handler: async (ctx, { tag, limit, withContent }) => {
    const docs = await ctx.db
      .query('posts')
      .withIndex('by_status_published', (q) => q.eq('status', 'published'))
      .order('desc')
      .collect();

    const filtered = tag
      ? docs.filter((d) => d.tags.some((t) => t.toLowerCase() === tag.toLowerCase()))
      : docs;

    const shape = withContent ? publicPost : postSummary;
    return (limit ? filtered.slice(0, limit) : filtered).map(shape);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const doc = await ctx.db
      .query('posts')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();
    if (!doc || doc.status !== 'published') return null;
    return publicPost(doc);
  },
});

/** Neighbouring posts in publish order, for prev/next links. */
export const neighbours = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const docs = await ctx.db
      .query('posts')
      .withIndex('by_status_published', (q) => q.eq('status', 'published'))
      .order('desc')
      .collect();
    const i = docs.findIndex((d) => d.slug === slug);
    if (i === -1) return { newer: null, older: null };
    return {
      newer: i > 0 ? postSummary(docs[i - 1]) : null,
      older: i < docs.length - 1 ? postSummary(docs[i + 1]) : null,
    };
  },
});

export const tagCounts = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query('posts')
      .withIndex('by_status_published', (q) => q.eq('status', 'published'))
      .collect();
    const counts = new Map();
    for (const doc of docs) {
      for (const tag of doc.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  },
});

/** Slug + timestamps only, everything sitemap.xml needs. */
export const sitemapEntries = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query('posts')
      .withIndex('by_status_published', (q) => q.eq('status', 'published'))
      .order('desc')
      .collect();
    return docs.map((d) => ({
      slug: d.slug,
      updatedAt: d.updatedAt,
      publishedAt: d.publishedAt ?? d.createdAt,
    }));
  },
});

/* ------------------------------------------------------------------ writer */

export const listAll = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    assertWriter(token);
    const docs = await ctx.db.query('posts').withIndex('by_updated').order('desc').collect();
    return docs.map(postSummary);
  },
});

export const getAny = query({
  args: { token: v.string(), id: v.id('posts') },
  handler: async (ctx, { token, id }) => {
    assertWriter(token);
    return publicPost(await ctx.db.get(id));
  },
});

/** Used by the editor to warn before it collides with an existing slug. */
export const slugTaken = query({
  args: { token: v.string(), slug: v.string(), exceptId: v.optional(v.id('posts')) },
  handler: async (ctx, { token, slug, exceptId }) => {
    assertWriter(token);
    const doc = await ctx.db
      .query('posts')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();
    return Boolean(doc && doc._id !== exceptId);
  },
});

export const create = mutation({
  args: { token: v.string(), post: v.object(postFields) },
  handler: async (ctx, { token, post }) => {
    assertWriter(token);
    const now = Date.now();
    return await ctx.db.insert('posts', {
      ...post,
      publishedAt:
        post.status === 'published' ? (post.publishedAt ?? now) : (post.publishedAt ?? undefined),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { token: v.string(), id: v.id('posts'), post: v.object(postFields) },
  handler: async (ctx, { token, id, post }) => {
    assertWriter(token);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error('Post not found.');
    const now = Date.now();
    await ctx.db.patch(id, {
      ...post,
      // First transition to published stamps the date; later edits keep it.
      publishedAt:
        post.status === 'published'
          ? (post.publishedAt ?? existing.publishedAt ?? now)
          : (post.publishedAt ?? existing.publishedAt),
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Claims the right to send the announcement for a post, atomically.
 *
 * Returns the post only on the first call; every later call gets `null`
 * because `notifiedAt` is already stamped. Convex mutations are
 * transactional, so two concurrent saves cannot both win this race and
 * double-mail the list.
 */
export const claimNotification = mutation({
  args: { token: v.string(), id: v.id('posts') },
  handler: async (ctx, { token, id }) => {
    assertWriter(token);
    const doc = await ctx.db.get(id);
    if (!doc || doc.status !== 'published' || doc.notifiedAt) return null;
    await ctx.db.patch(id, { notifiedAt: Date.now() });
    return publicPost(doc);
  },
});

/** Undoes a claim when the send itself failed, so it can be retried. */
export const releaseNotification = mutation({
  args: { token: v.string(), id: v.id('posts') },
  handler: async (ctx, { token, id }) => {
    assertWriter(token);
    await ctx.db.patch(id, { notifiedAt: undefined });
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id('posts') },
  handler: async (ctx, { token, id }) => {
    assertWriter(token);
    await ctx.db.delete(id);
    return true;
  },
});
