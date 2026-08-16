import { requireAuth } from '../../../lib/auth.js';
import { convex, writeToken } from '../../../lib/convex.js';
import { api } from '../../../../convex/_generated/api.js';
import { handle, json, normalizePost, HttpError } from '../../../lib/post.js';
import { announcePost } from '../../../lib/notify.js';

export const prerender = false;

export async function GET(context) {
  const denied = requireAuth(context);
  if (denied) return denied;

  return handle(async () => {
    const post = await convex().query(api.posts.getAny, {
      token: writeToken(),
      id: context.params.id,
    });
    if (!post) throw new HttpError(404, 'Post not found.');
    return json({ post });
  });
}

export async function PUT(context) {
  const denied = requireAuth(context);
  if (denied) return denied;

  return handle(async () => {
    const { id } = context.params;
    const post = normalizePost(await context.request.json().catch(() => ({})));
    const token = writeToken();

    const taken = await convex().query(api.posts.slugTaken, { token, slug: post.slug, exceptId: id });
    if (taken) throw new HttpError(409, `The slug “${post.slug}” is already in use.`);

    await convex().mutation(api.posts.update, { token, id, post });

    // Fires only on the first publish — `claimNotification` is idempotent.
    const notified = post.status === 'published' ? await announcePost(id) : null;
    return json({ id, post, notified });
  });
}

export async function DELETE(context) {
  const denied = requireAuth(context);
  if (denied) return denied;

  return handle(async () => {
    await convex().mutation(api.posts.remove, { token: writeToken(), id: context.params.id });
    return json({ ok: true });
  });
}
