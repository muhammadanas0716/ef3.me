import { site } from '../config.js';
import { safeQuery } from './convex.js';
import { api } from '../../convex/_generated/api.js';
import { renderMarkdown } from './markdown.js';
import { absoluteUrl, postUrl } from './seo.js';

/** How many posts each feed carries. */
const LIMIT = 30;

export const escapeXml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const cdata = (value) => `<![CDATA[${String(value ?? '').replace(/]]>/g, ']]&gt;')}]]>`;

/**
 * Loads the latest posts with their bodies already rendered to HTML.
 *
 * All three feeds are full-text: a reader should never have to click through
 * just to see what the post says, and all three share this one query, so
 * adding a format costs a file, not a round trip per item.
 */
export async function feedItems() {
  const posts = await safeQuery(api.posts.listPublished, { limit: LIMIT, withContent: true }, []);
  return Promise.all(
    posts.map(async (post) => ({
      ...post,
      url: postUrl(post.slug),
      html: (await renderMarkdown(post.content)).html,
    })),
  );
}

export function feedMeta(items) {
  return {
    title: `${site.name}, ${site.blogTitle}`,
    description: site.blogDescription,
    home: absoluteUrl('/blog'),
    updated: new Date(items[0]?.updatedAt ?? items[0]?.publishedAt ?? Date.now()).toISOString(),
  };
}

/** Feeds change rarely; let the CDN hold them and revalidate in the background. */
export function feedHeaders(contentType) {
  return {
    'content-type': `${contentType}; charset=utf-8`,
    'cache-control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400',
  };
}
