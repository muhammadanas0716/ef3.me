import { safeQuery } from '../lib/convex.js';
import { api } from '../../convex/_generated/api.js';
import { absoluteUrl, ogUrl } from '../lib/seo.js';
import { escapeXml } from '../lib/feed.js';

const day = (ms) => new Date(ms).toISOString().slice(0, 10);

export async function GET() {
  const [posts, tags] = await Promise.all([
    safeQuery(api.posts.listPublished, {}, []),
    safeQuery(api.posts.tagCounts, {}, []),
  ]);

  const newest = posts[0]?.updatedAt ?? Date.now();

  const urls = [
    { loc: absoluteUrl('/'), lastmod: day(newest), changefreq: 'weekly', priority: '1.0' },
    { loc: absoluteUrl('/blog'), lastmod: day(newest), changefreq: 'daily', priority: '0.9' },
    ...posts.map((post) => ({
      loc: absoluteUrl(`/blog/${post.slug}`),
      lastmod: day(post.updatedAt || post.publishedAt),
      changefreq: 'monthly',
      priority: '0.8',
      // Declaring the image gets the card into Google Images and improves the
      // odds of a thumbnail appearing next to the result.
      image: { url: post.coverImage || ogUrl(post.slug), title: post.title },
    })),
    ...tags.map((entry) => ({
      loc: absoluteUrl(`/tags/${encodeURIComponent(entry.tag)}`),
      lastmod: day(newest),
      changefreq: 'weekly',
      priority: '0.4',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
  .map(({ loc, lastmod, changefreq, priority, image }) =>
    [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      ...(image
        ? [
            '    <image:image>',
            `      <image:loc>${escapeXml(image.url)}</image:loc>`,
            `      <image:title>${escapeXml(image.title)}</image:title>`,
            '    </image:image>',
          ]
        : []),
      '  </url>',
    ].join('\n'),
  )
  .join('\n')}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400',
    },
  });
}
