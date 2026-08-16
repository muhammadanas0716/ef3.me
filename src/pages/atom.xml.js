import { site } from '../config.js';
import { absoluteUrl } from '../lib/seo.js';
import { cdata, escapeXml, feedHeaders, feedItems, feedMeta } from '../lib/feed.js';

/** Atom alongside RSS, some readers and aggregators prefer or only accept it. */
export async function GET() {
  const items = await feedItems();
  const meta = feedMeta(items);

  const entries = items
    .map((post) =>
      [
        '  <entry>',
        `    <title>${escapeXml(post.title)}</title>`,
        `    <link href="${post.url}" rel="alternate" type="text/html" />`,
        `    <id>${post.url}</id>`,
        `    <published>${new Date(post.publishedAt ?? Date.now()).toISOString()}</published>`,
        `    <updated>${new Date(post.updatedAt ?? post.publishedAt ?? Date.now()).toISOString()}</updated>`,
        `    <summary>${escapeXml(post.excerpt)}</summary>`,
        `    <content type="html">${cdata(post.html)}</content>`,
        ...post.tags.map((tag) => `    <category term="${escapeXml(tag)}" />`),
        '  </entry>',
      ].join('\n'),
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${site.lang}">
  <title>${escapeXml(meta.title)}</title>
  <subtitle>${escapeXml(meta.description)}</subtitle>
  <id>${absoluteUrl('/blog')}</id>
  <link href="${meta.home}" rel="alternate" type="text/html" />
  <link href="${absoluteUrl('/atom.xml')}" rel="self" type="application/atom+xml" />
  <updated>${meta.updated}</updated>
  <author><name>${escapeXml(site.name)}</name></author>
${entries}
</feed>
`;

  return new Response(xml, { headers: feedHeaders('application/atom+xml') });
}
