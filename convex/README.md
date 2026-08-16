# Convex backend

Functions live here; `_generated/` is written by the Convex CLI.

- `schema.js`, `posts` and `media` tables plus their indexes.
- `posts.js`, public read queries + writer-only mutations.
- `media.js`, Convex file storage upload URLs and the media library.
- `lib.js`, `assertWriter()` shared-secret gate and public field shaping.

Every mutation (and every query that can see drafts) takes a `token` argument
checked against the `WRITE_TOKEN` environment variable on the deployment. Set
it once with:

```sh
npx convex env set WRITE_TOKEN "$(openssl rand -hex 32)"
```

Use the *same* value for `WRITE_TOKEN` in `.env.local` / Vercel so the Astro
server can call these functions. Nothing else may know it.
