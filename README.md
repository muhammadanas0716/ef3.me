# ef3.me

Effie's personal site and ML/DL journal. Astro (plain JS, on-demand rendered),
Convex for the database and image storage, Resend for the newsletter, deployed
on Vercel.

- `/`, about me
- `/blog`, the journal, `/blog/<slug>` for a post, `/tags/<tag>` to filter
- `/techstack`, what the site is built from, and why
- `/write`, PIN-locked markdown editor with live preview and image uploads
- `/rss.xml`, `/atom.xml`, `/feed.json`, full-text feeds
- `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/og/<slug>.png`, generated

## Setup

```sh
pnpm install
cp .env.example .env.local
```

### 1. Convex

```sh
pnpm convex:dev          # creates the deployment, writes CONVEX_URL to .env.local
```

Leave that running while you work, it pushes `convex/` on every save.

Then set the shared write secret on the deployment, using the **same value** as
`WRITE_TOKEN` in `.env.local`:

```sh
npx convex env set WRITE_TOKEN "$(openssl rand -hex 32)"
```

### 2. Local env

Fill in `.env.local`:

| Variable | What it is |
| --- | --- |
| `PUBLIC_SITE_URL` | Public origin, no trailing slash. Canonical URLs, feeds and OG images all derive from it. |
| `CONVEX_URL` | Written by `convex dev`. |
| `WRITE_PIN` | Unlocks `/write`. |
| `AUTH_SECRET` | Signs the editor session cookie. `openssl rand -hex 32`. |
| `WRITE_TOKEN` | Must match the Convex env var above. |
| `RESEND_API_KEY` | Optional. Without it the subscribe form still records addresses, it just can't send. |
| `NEWSLETTER_FROM` | e.g. `Effie <journal@ef3.me>`. The domain must be verified in Resend. |

### 3. Run it

```sh
pnpm dev                 # in a second terminal
```

## Writing

Open `/write`, enter the PIN. The editor is plain markdown with a toolbar; the
preview runs the *same* renderer as the live post, so nothing surprises you
after publishing.

Beyond standard markdown and GFM (tables, task lists, strikethrough):

| Syntax | Result |
| --- | --- |
| `$x^2$`, `$$ … $$` | KaTeX, inline and display |
| ```` ```python ```` | Shiki highlighting, with a copy button |
| `> [!NOTE]` | Callout, also `TIP`, `IMPORTANT`, `WARNING`, `CAUTION` |
| `[^1]` … `[^1]: text` | Footnotes, collected at the bottom |
| A URL alone on a line | Embed, YouTube, Vimeo, Loom, Spotify, CodePen; anything else becomes a link card |

Shortcuts: `⌘S` save, `⌘B` bold, `⌘I` italic, `⌘K` link, `⌘E` inline code.
`Tab` indents, `Enter` continues lists and quotes. Paste or drag an image
anywhere in the editor to upload it to Convex storage and insert it.

Work is kept in `localStorage` as you type and pushed to the server every 25
seconds once a post exists, so a crashed tab costs almost nothing.

Posts save as drafts until you set the status to `published` in the **details**
panel. Drafts are invisible to every public route, the feed and the sitemap.

## SEO

Handled for you, but worth knowing about:

- Canonical URL, Open Graph and Twitter cards on every page, all derived from
  `PUBLIC_SITE_URL` so they can't drift apart.
- JSON-LD throughout: `Person` (with `alternateName`, `sameAs` and
  `affiliation`) + `WebSite` on the home page, `Blog` + `ItemList` on the
  index, `BlogPosting` + `BreadcrumbList` on posts, `SoftwareApplication`
  entries on `/techstack`.
- Meta descriptions are clamped to ~158 characters on a word boundary, so
  Google never truncates one mid-word.
- A 1200×630 OG image rendered per post at `/og/<slug>.png` (satori + sharp),
  cached for a week.
- Three full-text feeds, `rss.xml`, `atom.xml`, `feed.json`, plus
  `llms.txt`, a plain-text index for AI crawlers. All generated from the
  database, so a new post appears everywhere the moment it publishes.
- `sitemap.xml` includes each post's social image via the image extension.
- Related posts (by shared tags) at the foot of every article, for internal
  linking; `trailingSlash: 'never'` so one page never has two URLs.
- The body font is preloaded from its hashed build URL, the largest single
  LCP win available here.
- Pages are ISR-cached on Vercel's CDN for 60s with a week of
  stale-while-revalidate; `/write` and `/api/*` are never cached.

Set the **excerpt** in the details panel: it becomes the meta description. If a
post appeared elsewhere first, set **canonical url** so you don't compete with
yourself.

## Deploying to Vercel

Set these in the Vercel project (Production and Preview):

```
PUBLIC_SITE_URL   https://your-domain.com
CONVEX_DEPLOY_KEY <from the Convex dashboard, Settings → Deploy keys>
WRITE_PIN         …
AUTH_SECRET       …
WRITE_TOKEN       … (same value as the Convex env var)
```

Override the build command so Convex deploys and injects `CONVEX_URL`:

```sh
npx convex deploy --cmd 'pnpm build'
```

Remember to set `WRITE_TOKEN` on the **production** Convex deployment too:

```sh
npx convex env set --prod WRITE_TOKEN "<same value>"
```

## Making it yours

`src/config.js` holds the name, bio, nav links and blog copy, edit that rather
than the templates. Colours and type live at the top of `src/styles/global.css`
(`--color-paper`, `--color-accent`, `--measure`).

## Layout

```
convex/          schema, queries, mutations, file storage
src/config.js    everything personal
src/lib/         markdown pipeline, convex client, auth, SEO helpers
src/pages/       routes, API endpoints, feeds
src/components/  header, post list, editor, PIN gate
```

## The newsletter

Readers subscribe from `/blog`. The flow is double opt-in:

1. They enter an address → it's stored as `pending` with a random token.
2. Resend sends a confirmation email → clicking the link flips them to `active`.
3. The **first time** a post is published, every `active` subscriber is emailed
   the title, excerpt and link.

Step 3 is guarded by `posts.claimNotification`, a Convex mutation that stamps
`notifiedAt` and returns the post only to the first caller. Because Convex
mutations are transactions, re-saving a published post, or two saves racing , 
cannot send twice. If the send fails, the claim is released so the next save
retries.

Every email carries a per-subscriber unsubscribe link plus the
`List-Unsubscribe` headers, so Gmail's own one-click button works. That
endpoint (`/api/unsubscribe`) is deliberately open to cross-origin POSTs, it's
idempotent and authenticated by the token, and refusing those requests is what
gets a sender flagged.

To see the list:

```sh
npx convex run subscribers:counts '{"token":"<WRITE_TOKEN>"}'
npx convex run subscribers:remove '{"token":"<WRITE_TOKEN>","email":"..."}'
```

## Security model

- `/write` is behind a PIN; the session is a signed, expiring, httpOnly cookie.
- Convex functions are publicly callable by anyone who learns the deployment
  URL, so every mutation and every draft-reading query takes a `WRITE_TOKEN`
  that only the Astro server holds. Guessing the URL gets you published posts
  and nothing else.
- Astro's blanket `checkOrigin` is off (it would break one-click unsubscribe);
  each editor endpoint enforces same-origin itself via `requireAuth()`.
- Uploads go browser → Convex directly, so the bytes never touch the function.
