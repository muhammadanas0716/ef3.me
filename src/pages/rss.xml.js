import { site } from '../config.js';
import { safeQuery } from '../lib/convex.js';
import { api } from '../../convex/_generated/api.js';
import { renderMarkdown } from '../lib/markdown.js';
import { absoluteUrl, postUrl } from '../lib/seo.js';

const escape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const cdata = (value) => `<![CDATA[${String(value ?? '').replace(/]]>/g, ']]&gt;')}]]>`;

export async function GET() {
  // Full-text feed: readers get the whole post, not a teaser. Bodies come back
  // in the same round trip so the feed is one query, not one per item.
  const posts = await safeQuery(api.posts.listPublished, { limit: 30, withContent: true }, []);

  const items = await Promise.all(
    posts.map(async (post) => {
      const { html } = await renderMarkdown(post.content);
      return [
        '    <item>',
        `      <title>${escape(post.title)}</title>`,
        `      <link>${postUrl(post.slug)}</link>`,
        `      <guid isPermaLink="true">${postUrl(post.slug)}</guid>`,
        `      <pubDate>${new Date(post.publishedAt ?? Date.now()).toUTCString()}</pubDate>`,
        `      <description>${escape(post.excerpt)}</description>`,
        `      <content:encoded>${cdata(html)}</content:encoded>`,
        ...post.tags.map((tag) => `      <category>${escape(tag)}</category>`),
        '    </item>',
      ].join('\n');
    }),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escape(`${site.name} — ${site.blogTitle}`)}</title>
    <link>${absoluteUrl('/blog')}</link>
    <description>${escape(site.blogDescription)}</description>
    <language>${site.lang}</language>
    <lastBuildDate>${new Date(posts[0]?.publishedAt ?? Date.now()).toUTCString()}</lastBuildDate>
    <atom:link href="${absoluteUrl('/rss.xml')}" rel="self" type="application/rss+xml" />
${items.join('\n')}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400',
    },
  });
}
