import { site } from '../config.js';
import { absoluteUrl } from '../lib/seo.js';
import { cdata, escapeXml, feedHeaders, feedItems, feedMeta } from '../lib/feed.js';

export async function GET() {
  const items = await feedItems();
  const meta = feedMeta(items);

  const body = items
    .map((post) =>
      [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${post.url}</link>`,
        `      <guid isPermaLink="true">${post.url}</guid>`,
        `      <pubDate>${new Date(post.publishedAt ?? Date.now()).toUTCString()}</pubDate>`,
        `      <description>${escapeXml(post.excerpt)}</description>`,
        `      <content:encoded>${cdata(post.html)}</content:encoded>`,
        ...post.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`),
        '    </item>',
      ].join('\n'),
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(meta.title)}</title>
    <link>${meta.home}</link>
    <description>${escapeXml(meta.description)}</description>
    <language>${site.lang}</language>
    <lastBuildDate>${new Date(meta.updated).toUTCString()}</lastBuildDate>
    <atom:link href="${absoluteUrl('/rss.xml')}" rel="self" type="application/rss+xml" />
${body}
  </channel>
</rss>
`;

  return new Response(xml, { headers: feedHeaders('application/rss+xml') });
}
