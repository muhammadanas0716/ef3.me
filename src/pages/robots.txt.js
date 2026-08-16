import { absoluteUrl } from '../lib/seo.js';

export function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /write
Disallow: /api/

Sitemap: ${absoluteUrl('/sitemap.xml')}
`;

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=86400',
    },
  });
}
