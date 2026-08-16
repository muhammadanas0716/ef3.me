/**
 * Every write path is gated on a shared secret that only the Astro server
 * knows (`WRITE_TOKEN`). Convex functions are publicly callable by anyone who
 * knows the deployment URL, so this is what stops a stranger from publishing
 * to the blog.
 */
export function assertWriter(token) {
  const expected = process.env.WRITE_TOKEN;
  if (!expected) {
    throw new Error('WRITE_TOKEN is not configured on the Convex deployment.');
  }
  if (typeof token !== 'string' || !timingSafeEqual(token, expected)) {
    throw new Error('Not authorised.');
  }
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Strips internal fields a public reader has no business seeing. */
export function publicPost(doc) {
  if (!doc) return null;
  return {
    id: doc._id,
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    content: doc.content,
    tags: doc.tags,
    coverImage: doc.coverImage ?? null,
    coverAlt: doc.coverAlt ?? null,
    canonicalUrl: doc.canonicalUrl ?? null,
    series: doc.series ?? null,
    status: doc.status,
    publishedAt: doc.publishedAt ?? null,
    notifiedAt: doc.notifiedAt ?? null,
    updatedAt: doc.updatedAt,
    wordCount: doc.wordCount,
    readingMinutes: doc.readingMinutes,
  };
}

/** Listing payload — no `content`, so index pages stay small. */
export function postSummary(doc) {
  const { content, ...rest } = publicPost(doc);
  return rest;
}
