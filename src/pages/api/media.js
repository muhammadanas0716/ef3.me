import { requireAuth } from '../../lib/auth.js';
import { convex, writeToken } from '../../lib/convex.js';
import { api } from '../../../convex/_generated/api.js';
import { handle, json, HttpError } from '../../lib/post.js';

export const prerender = false;

export async function GET(context) {
  const denied = requireAuth(context);
  if (denied) return denied;

  return handle(async () => {
    const media = await convex().query(api.media.list, { token: writeToken() });
    return json({ media });
  });
}

/**
 * Two-step upload:
 *
 *   1. `{ step: 'url' }`  → a short-lived, single-use Convex upload URL.
 *   2. the browser POSTs the file straight to that URL and gets a storageId.
 *   3. `{ step: 'save' }` → records it and returns the permanent URL.
 *
 * The bytes never pass through this function, so a large image costs no
 * serverless execution time and can't hit the request body limit.
 */
export async function POST(context) {
  const denied = requireAuth(context);
  if (denied) return denied;

  return handle(async () => {
    const body = await context.request.json().catch(() => ({}));
    const token = writeToken();

    if (body.step === 'url') {
      const uploadUrl = await convex().mutation(api.media.generateUploadUrl, { token });
      return json({ uploadUrl });
    }

    if (body.step === 'save') {
      if (!body.storageId) throw new HttpError(400, 'Missing storageId.');
      return json(
        await convex().mutation(api.media.save, {
          token,
          storageId: body.storageId,
          name: String(body.name ?? 'upload').slice(0, 200),
          contentType: body.contentType ? String(body.contentType) : undefined,
          size: Number.isFinite(body.size) ? body.size : undefined,
        }),
      );
    }

    throw new HttpError(400, 'Unknown step.');
  });
}

export async function DELETE(context) {
  const denied = requireAuth(context);
  if (denied) return denied;

  return handle(async () => {
    const { id } = await context.request.json().catch(() => ({}));
    if (!id) throw new HttpError(400, 'Missing id.');
    await convex().mutation(api.media.remove, { token: writeToken(), id });
    return json({ ok: true });
  });
}
