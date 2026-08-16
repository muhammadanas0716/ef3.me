import { env } from './convex.js';
import { site } from '../config.js';
import { absoluteUrl, postUrl } from './seo.js';
import { escapeHtml } from './markdown.js';

const RESEND_ENDPOINT = 'https://api.resend.com';

/** Resend accepts at most 100 messages per batch call. */
const BATCH_SIZE = 100;

export function isEmailConfigured() {
  return Boolean(env('RESEND_API_KEY') && env('NEWSLETTER_FROM'));
}

function config() {
  const apiKey = env('RESEND_API_KEY');
  const from = env('NEWSLETTER_FROM');
  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY and NEWSLETTER_FROM must both be set to send email.');
  }
  return { apiKey, from, replyTo: env('NEWSLETTER_REPLY_TO') || site.email || undefined };
}

async function resend(path, body) {
  const { apiKey } = config();
  const response = await fetch(`${RESEND_ENDPOINT}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message ?? `Resend responded ${response.status}`);
  }
  return data;
}

/* --------------------------------------------------------------- templates */

const PAPER = '#feeccf';
const INK = '#1c1917';
const SOFT = '#4a4137';
const FAINT = '#857a6c';
const ACCENT = '#f59e0b';

/**
 * Email HTML is deliberately old-fashioned — tables, inline styles, no
 * external CSS — because that is the only thing every mail client agrees on.
 * It still uses the site's paper-and-amber palette.
 */
function shell({ preheader, body, footer }) {
  return `<!doctype html>
<html lang="${site.lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:520px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
                    font-size:16px;line-height:1.6;color:${INK};">
        <tr><td style="padding-bottom:28px;">
          <a href="${absoluteUrl('/')}" style="color:${INK};text-decoration:none;font-weight:700;letter-spacing:-0.02em;">
            ${escapeHtml(site.name)}
          </a>
        </td></tr>
        ${body}
        <tr><td style="padding-top:36px;border-top:1px solid #e0cfae;color:${FAINT};
                       font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.6;">
          ${footer}
        </td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function button(href, label) {
  return `<a href="${href}" style="display:inline-block;background:${INK};color:${PAPER};
    text-decoration:none;padding:11px 20px;border-radius:4px;font-size:14px;
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(label)}</a>`;
}

function confirmEmail(confirmUrl) {
  return {
    subject: `Confirm your subscription to ${site.blogTitle.toLowerCase()}`,
    html: shell({
      preheader: 'One click to confirm and you are on the list.',
      body: `
        <tr><td style="padding-bottom:16px;">
          You asked for new posts from <strong>${escapeHtml(site.blogTitle.toLowerCase())}</strong>
          — notes on machine learning, deep learning and finance, sent when something new goes up.
        </td></tr>
        <tr><td style="padding-bottom:24px;color:${SOFT};">One click to confirm:</td></tr>
        <tr><td style="padding-bottom:28px;">${button(confirmUrl, 'Confirm subscription')}</td></tr>
        <tr><td style="color:${FAINT};font-size:14px;">
          If that wasn't you, ignore this — nothing happens without the click.
        </td></tr>`,
      footer: `<a href="${absoluteUrl('/')}" style="color:${FAINT};">${escapeHtml(new URL(site.url).host)}</a>`,
    }),
    text: `Confirm your subscription to ${site.blogTitle.toLowerCase()}:\n\n${confirmUrl}\n\nIf that wasn't you, ignore this email.`,
  };
}

function postEmail(post, unsubscribeUrl) {
  const url = postUrl(post.slug);
  const topic = post.tags?.length ? post.tags.join(' · ') : site.blogTitle.toLowerCase();

  return {
    subject: post.title,
    html: shell({
      preheader: post.excerpt,
      body: `
        <tr><td style="padding-bottom:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
                       font-size:12px;color:${FAINT};letter-spacing:0.04em;">
          ${escapeHtml(topic)} · ${post.readingMinutes} min read
        </td></tr>
        <tr><td style="padding-bottom:14px;">
          <a href="${url}" style="color:${INK};text-decoration:none;font-size:22px;font-weight:700;
             line-height:1.3;letter-spacing:-0.02em;border-bottom:2px solid ${ACCENT};">
            ${escapeHtml(post.title)}
          </a>
        </td></tr>
        <tr><td style="padding-bottom:28px;color:${SOFT};">${escapeHtml(post.excerpt)}</td></tr>
        <tr><td style="padding-bottom:8px;">${button(url, 'Read it')}</td></tr>`,
      footer: `You're getting this because you subscribed at
        <a href="${absoluteUrl('/blog')}" style="color:${FAINT};">${escapeHtml(new URL(site.url).host)}</a>.
        <a href="${unsubscribeUrl}" style="color:${FAINT};">Unsubscribe</a>.`,
    }),
    text: `${post.title}\n\n${post.excerpt}\n\nRead it: ${url}\n\nUnsubscribe: ${unsubscribeUrl}`,
  };
}

/* ------------------------------------------------------------------ sending */

export async function sendConfirmation(email, token) {
  const { from, replyTo } = config();
  const { subject, html, text } = confirmEmail(absoluteUrl(`/subscribe/confirm?token=${token}`));

  await resend('/emails', {
    from,
    to: [email],
    subject,
    html,
    text,
    reply_to: replyTo,
  });
}

/**
 * Mails every confirmed subscriber about a new post.
 *
 * Each message carries its own unsubscribe link plus the `List-Unsubscribe`
 * headers, which is what keeps a bulk send out of the spam folder — Gmail and
 * Outlook both weight one-click unsubscribe heavily.
 *
 * Returns how many were sent and how many failed, so the editor can report it
 * honestly rather than claiming success.
 */
export async function sendNewPost(post, subscribers) {
  if (subscribers.length === 0) return { sent: 0, failed: 0 };
  const { from, replyTo } = config();

  const messages = subscribers.map(({ email, token }) => {
    // Two URLs for the same thing: the page a human lands on, and the
    // endpoint a mail provider POSTs to for one-click (RFC 8058).
    const unsubscribeUrl = absoluteUrl(`/unsubscribe?token=${token}`);
    const oneClickUrl = absoluteUrl(`/api/unsubscribe?token=${token}`);
    const { subject, html, text } = postEmail(post, unsubscribeUrl);
    return {
      from,
      to: [email],
      subject,
      html,
      text,
      reply_to: replyTo,
      headers: {
        'List-Unsubscribe': `<${oneClickUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    };
  });

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      await resend('/emails/batch', batch);
      sent += batch.length;
    } catch (error) {
      // One bad batch shouldn't stop the rest of the list being told.
      console.error('[email] batch failed:', error?.message ?? error);
      failed += batch.length;
    }
  }

  return { sent, failed };
}
