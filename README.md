# Effie Labs

A personal site and ML/DL journal. Astro (JS, on-demand rendered), Convex for
the database and image storage, deployed on Vercel.

- `/` — about me
- `/blog` — the journal, `/blog/<slug>` for a post, `/tags/<tag>` to filter
- `/write` — PIN-locked markdown editor with live preview and image uploads
- `/rss.xml`, `/sitemap.xml`, `/robots.txt`, `/og/<slug>.png` — generated

## Setup

```sh
pnpm install
cp .env.example .env.local
```

### 1. Convex

```sh
pnpm convex:dev          # creates the deployment, writes CONVEX_URL to .env.local
```

Leave that running while you work — it pushes `convex/` on every save.

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
| `> [!NOTE]` | Callout — also `TIP`, `IMPORTANT`, `WARNING`, `CAUTION` |
| `[^1]` … `[^1]: text` | Footnotes, collected at the bottom |

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
- JSON-LD: `Person` + `WebSite` on the home page, `Blog` on the index,
  `BlogPosting` + `BreadcrumbList` on posts.
- A 1200×630 OG image rendered per post at `/og/<slug>.png` (satori + sharp),
  cached for a week.
- `sitemap.xml` and a full-text `rss.xml` generated from the database, so a new
  post appears in both the moment it publishes.
- Pages are ISR-cached on Vercel's CDN for 60s with a week of
  stale-while-revalidate; `/write` and `/api/*` are never cached.

Set the **excerpt** in the details panel — it becomes the meta description. If a
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

`src/config.js` holds the name, bio, nav links and blog copy — edit that rather
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
