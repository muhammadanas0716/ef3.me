import { requireAuth } from '../../lib/auth.js';
import { renderMarkdown, countWords, readingMinutes } from '../../lib/markdown.js';
import { handle, json } from '../../lib/post.js';

export const prerender = false;

/**
 * The editor's preview renders through the exact same pipeline as the live
 * post, so what you see while writing is what actually ships.
 */
export async function POST(context) {
  const denied = requireAuth(context);
  if (denied) return denied;

  return handle(async () => {
    const { markdown = '' } = await context.request.json().catch(() => ({}));
    const { html, toc } = await renderMarkdown(markdown);
    return json({
      html,
      toc,
      wordCount: countWords(markdown),
      readingMinutes: readingMinutes(markdown),
    });
  });
}
