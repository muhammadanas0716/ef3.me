import GithubSlugger from 'github-slugger';
import { countWords, readingMinutes, makeExcerpt } from './markdown.js';

export function slugify(value) {
  const slug = new GithubSlugger().slug(String(value ?? '').trim());
  return slug.slice(0, 96) || `post-${Date.now().toString(36)}`;
}

function cleanTags(tags) {
  const list = Array.isArray(tags)
    ? tags
    : String(tags ?? '')
        .split(',')
        .map((tag) => tag.trim());
  const seen = new Set();
  return list
    .map((tag) => String(tag).trim().toLowerCase().replace(/\s+/g, '-'))
    .filter((tag) => tag && tag.length <= 40 && !seen.has(tag) && seen.add(tag))
    .slice(0, 12);
}

function optional(value) {
  const text = String(value ?? '').trim();
  return text ? text : undefined;
}

/**
 * Turns whatever the editor posted into exactly the shape `posts.create` /
 * `posts.update` validate against. Derived fields (slug, counts, excerpt) are
 * computed here so the database never holds a stale word count.
 */
export function normalizePost(input) {
  const title = String(input?.title ?? '').trim();
  if (!title) throw new HttpError(400, 'A title is required.');

  const content = String(input?.content ?? '');
  const status = input?.status === 'published' ? 'published' : 'draft';

  if (status === 'published' && !content.trim()) {
    throw new HttpError(400, 'A published post needs a body.');
  }

  let publishedAt;
  if (input?.publishedAt) {
    const ms = typeof input.publishedAt === 'number' ? input.publishedAt : Date.parse(input.publishedAt);
    if (Number.isNaN(ms)) throw new HttpError(400, 'The publish date could not be read.');
    publishedAt = ms;
  }

  return {
    title: title.slice(0, 200),
    slug: slugify(input?.slug || title),
    excerpt: (optional(input?.excerpt) ?? makeExcerpt(content)).slice(0, 320),
    content,
    status,
    tags: cleanTags(input?.tags),
    coverImage: optional(input?.coverImage),
    coverAlt: optional(input?.coverAlt),
    canonicalUrl: optional(input?.canonicalUrl),
    series: optional(input?.series),
    publishedAt,
    wordCount: countWords(content),
    readingMinutes: readingMinutes(content),
  };
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

/** Wraps a handler so thrown errors become JSON instead of a 500 HTML page. */
export async function handle(fn) {
  try {
    return await fn();
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status === 500) console.error('[api]', error);
    return json({ error: error?.message ?? 'Something went wrong.' }, status);
  }
}
