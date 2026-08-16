import { requireAuth } from '../../../lib/auth.js';
import { convex, writeToken } from '../../../lib/convex.js';
import { api } from '../../../../convex/_generated/api.js';
import { handle, json, normalizePost, HttpError } from '../../../lib/post.js';
import { announcePost } from '../../../lib/notify.js';

export const prerender = false;

/** Every post including drafts — powers the editor's post list. */
export async function GET(context) {
  const denied = requireAuth(context);
  if (denied) return denied;

  return handle(async () => {
    const posts = await convex().query(api.posts.listAll, { token: writeToken() });
    return json({ posts });
  });
}

export async function POST(context) {
  const denied = requireAuth(context);
  if (denied) return denied;

  return handle(async () => {
    const post = normalizePost(await context.request.json().catch(() => ({})));
    const token = writeToken();

    // Checked up front so the editor gets a clear message instead of two
    // posts quietly sharing a URL.
    const taken = await convex().query(api.posts.slugTaken, { token, slug: post.slug });
    if (taken) throw new HttpError(409, `The slug “${post.slug}” is already in use.`);

    const id = await convex().mutation(api.posts.create, { token, post });
    const notified = post.status === 'published' ? await announcePost(id) : null;
    return json({ id, post, notified }, 201);
  });
}
