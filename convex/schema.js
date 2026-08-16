import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  posts: defineTable({
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    // Markdown source. Rendered at request time so edits go live instantly.
    content: v.string(),
    status: v.union(v.literal('draft'), v.literal('published')),
    tags: v.array(v.string()),
    coverImage: v.optional(v.string()),
    coverAlt: v.optional(v.string()),
    canonicalUrl: v.optional(v.string()),
    series: v.optional(v.string()),
    // Millisecond epochs. `publishedAt` is set the first time a post goes live
    // and is what every public listing sorts by.
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    wordCount: v.number(),
    readingMinutes: v.number(),
    // Set the moment the announcement email goes out. Its presence is what
    // stops a post ever being mailed twice, however often it is re-saved.
    notifiedAt: v.optional(v.number()),
  })
    .index('by_slug', ['slug'])
    .index('by_status_published', ['status', 'publishedAt'])
    .index('by_updated', ['updatedAt']),

  subscribers: defineTable({
    email: v.string(),
    // Double opt-in: `pending` until the confirmation link is clicked. Only
    // `active` addresses are ever mailed.
    status: v.union(v.literal('pending'), v.literal('active'), v.literal('unsubscribed')),
    // One unguessable secret per subscriber, used for both the confirm and the
    // unsubscribe link, so neither needs a session.
    token: v.string(),
    source: v.optional(v.string()),
    createdAt: v.number(),
    confirmedAt: v.optional(v.number()),
    unsubscribedAt: v.optional(v.number()),
  })
    .index('by_email', ['email'])
    .index('by_token', ['token'])
    .index('by_status', ['status']),

  media: defineTable({
    storageId: v.id('_storage'),
    name: v.string(),
    contentType: v.optional(v.string()),
    size: v.optional(v.number()),
    alt: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_created', ['createdAt']),
});
