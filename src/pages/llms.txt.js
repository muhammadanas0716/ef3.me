import { site } from '../config.js';
import { safeQuery } from '../lib/convex.js';
import { api } from '../../convex/_generated/api.js';
import { absoluteUrl, postUrl, formatDate } from '../lib/seo.js';

/**
 * llms.txt, a plain-text index for language models and AI crawlers, in the
 * emerging convention. Cheap to serve, and it means a model summarising the
 * site gets the real structure instead of guessing from scraped HTML.
 */
export async function GET() {
  const posts = await safeQuery(api.posts.listPublished, {}, []);

  const lines = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `Author: ${site.name}. ${site.affiliation ? `Affiliation: ${site.affiliation.name}.` : ''}`.trim(),
    `Site: ${site.url}`,
    '',
    '## Pages',
    '',
    `- [About](${absoluteUrl('/')}): who I am and what I am working on.`,
    `- [${site.blogTitle}](${absoluteUrl('/blog')}): ${site.blogDescription}`,
    '',
    '## Posts',
    '',
    ...posts.map(
      (post) =>
        `- [${post.title}](${postUrl(post.slug)}), ${formatDate(post.publishedAt, {
          style: 'short',
        })}, ${post.readingMinutes} min${post.tags.length ? `, tags: ${post.tags.join(', ')}` : ''}. ${post.excerpt}`,
    ),
    '',
    '## Feeds',
    '',
    `- [RSS](${absoluteUrl('/rss.xml')}), full text`,
    `- [Atom](${absoluteUrl('/atom.xml')}), full text`,
    `- [JSON Feed](${absoluteUrl('/feed.json')}), full text`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400',
    },
  });
}
