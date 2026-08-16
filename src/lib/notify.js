import { convex, writeToken } from './convex.js';
import { api } from '../../convex/_generated/api.js';
import { isEmailConfigured, sendNewPost } from './email.js';

/**
 * Announces a post to the mailing list, exactly once, ever.
 *
 * The `claimNotification` mutation stamps `notifiedAt` and returns the post
 * only to the first caller, so re-saving a published post, or two saves
 * racing, can never send twice. If the send itself fails the claim is
 * released so the next save retries.
 *
 * Never throws: a newsletter problem must not fail the save that the writer
 * actually asked for. The outcome is returned instead, for the editor to show.
 */
export async function announcePost(id) {
  if (!isEmailConfigured()) return null;

  const token = writeToken();
  let claimed;

  try {
    claimed = await convex().mutation(api.posts.claimNotification, { token, id });
  } catch (error) {
    console.error('[notify] could not claim:', error?.message ?? error);
    return null;
  }

  // Already announced, still a draft, or gone.
  if (!claimed) return null;

  try {
    const subscribers = await convex().query(api.subscribers.listActive, { token });
    if (subscribers.length === 0) return { sent: 0, failed: 0 };

    const result = await sendNewPost(claimed, subscribers);

    // Nothing got through, let a later save try again.
    if (result.sent === 0 && result.failed > 0) {
      await convex().mutation(api.posts.releaseNotification, { token, id });
    }
    return result;
  } catch (error) {
    console.error('[notify] send failed:', error?.message ?? error);
    try {
      await convex().mutation(api.posts.releaseNotification, { token, id });
    } catch {
      /* the claim stays; better a missed email than a duplicate one */
    }
    return { sent: 0, failed: 0, error: error?.message ?? 'Send failed.' };
  }
}
