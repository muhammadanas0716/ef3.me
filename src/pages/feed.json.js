import { site } from '../config.js';
import { absoluteUrl, ogUrl } from '../lib/seo.js';
import { feedHeaders, feedItems, feedMeta } from '../lib/feed.js';

/** JSON Feed 1.1 — what most modern readers and scrapers prefer to parse. */
export async function GET() {
  const items = await feedItems();
  const meta = feedMeta(items);

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: meta.title,
    description: meta.description,
    home_page_url: meta.home,
    feed_url: absoluteUrl('/feed.json'),
    language: site.lang,
    authors: [{ name: site.name, url: site.url }],
    items: items.map((post) => ({
      id: post.url,
      url: post.url,
      title: post.title,
      summary: post.excerpt,
      content_html: post.html,
      image: post.coverImage || ogUrl(post.slug),
      date_published: new Date(post.publishedAt ?? Date.now()).toISOString(),
      date_modified: new Date(post.updatedAt ?? post.publishedAt ?? Date.now()).toISOString(),
      tags: post.tags,
    })),
  };

  return new Response(JSON.stringify(feed, null, 2), { headers: feedHeaders('application/feed+json') });
}
