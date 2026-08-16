import { logos } from './logos.js';

/**
 * What this site is built out of, and why each piece is here.
 *
 * `mark` is an official brand path from `src/lib/logos.js`; `image` is an
 * official SVG downloaded into `public/logos/` for the few projects that
 * aren't in the icon set. Nothing is hotlinked.
 */
export const techstack = [
  {
    name: 'Astro',
    url: 'https://astro.build',
    mark: logos.astro,
    role: 'The web framework everything is built on.',
    why: `Ships zero JavaScript by default, so a page of prose really is just HTML and CSS.
      The two places that need scripting, the editor and the subscribe field, opt in on their
      own, which is why a post loads instantly on a bad connection.`,
  },
  {
    name: 'Convex',
    url: 'https://convex.dev',
    mark: logos.convex,
    role: 'Database, and storage for every image.',
    why: `Posts live in a database rather than in the repo, so publishing is a save, not a git
      commit and a redeploy. Every function is a transaction, which is what makes "never email
      the same post twice" a guarantee instead of a hope.`,
  },
  {
    name: 'Vercel',
    url: 'https://vercel.com',
    mark: logos.vercel,
    role: 'Hosting and the CDN in front of it.',
    why: `Runs the on-demand pages and caches the rendered result at the edge, so a post is
      served like a static file even though it came out of a database a moment ago.`,
  },
  {
    name: 'Resend',
    url: 'https://resend.com',
    mark: logos.resend,
    role: 'Sends the newsletter.',
    why: `A plain HTTP API and sane deliverability defaults. It handles the confirmation email
      and the one that goes out when a post is published, with one-click unsubscribe, which is
      what keeps a small sender out of the spam folder.`,
  },
  {
    name: 'Markdown',
    url: 'https://marked.js.org',
    mark: logos.markdown,
    role: 'The format every post is written in.',
    why: `Rendered on request with marked, extended here for LaTeX, footnotes, callouts and
      embeds. Keeping the source as markdown means the posts outlive this site: they are just
      text, portable anywhere.`,
  },
  {
    name: 'KaTeX',
    url: 'https://katex.org',
    image: '/logos/katex.svg',
    role: 'Typesets the mathematics.',
    why: `Equations are rendered to HTML on the server, so they arrive already laid out, no
      flash of raw LaTeX, and nothing to download before the maths is readable.`,
  },
  {
    name: 'Shiki',
    url: 'https://shiki.style',
    image: '/logos/shiki.svg',
    role: 'Highlights the code.',
    why: `Uses the same TextMate grammars as VS Code, so a Python snippet is coloured exactly
      the way it looks in the editor it was written in. Runs server-side; no highlighter is
      shipped to the browser.`,
  },
  {
    name: 'Satori & sharp',
    url: 'https://github.com/vercel/satori',
    mark: logos.sharp,
    role: 'Draws the social preview images.',
    why: `Every post gets its own 1200×630 card, laid out from the title with Satori and
      converted to PNG by sharp. Rendered on demand and cached, so there is no image to make
      by hand, ever.`,
  },
  {
    name: 'Tailwind CSS',
    url: 'https://tailwindcss.com',
    mark: logos.tailwindcss,
    role: 'Design tokens and the base reset.',
    why: `Used for its token layer and normalisation, not for utility classes. A site this
      small is better served by a few hundred lines of hand-written CSS that anyone can read.`,
  },
  {
    name: 'pnpm',
    url: 'https://pnpm.io',
    mark: logos.pnpm,
    role: 'Installs the dependencies.',
    why: `Strict by default: a package you did not declare is a package you cannot import,
      which catches a whole class of "works on my machine" before it ships.`,
  },
];

/** Shown as a footnote under the list. */
export const typefaces = [
  { name: 'Inter', url: 'https://rsms.me/inter/', use: 'body and headings' },
  { name: 'JetBrains Mono', url: 'https://www.jetbrains.com/lp/mono/', use: 'labels, code and metadata' },
];

/**
 * The whole palette. These are the actual custom properties from
 * `src/styles/global.css`, if you change one there, change it here too.
 */
export const palette = [
  { name: 'Paper', value: '#feeccf', token: '--color-paper', use: 'the background, everywhere' },
  { name: 'Ink', value: '#1c1917', token: '--color-ink', use: 'body text and headings' },
  { name: 'Ink soft', value: '#4a4137', token: '--color-ink-soft', use: 'secondary prose, excerpts' },
  { name: 'Ink faint', value: '#857a6c', token: '--color-ink-faint', use: 'timestamps and labels' },
  { name: 'Amber', value: '#f59e0b', token: '--color-accent', use: 'link underlines, bullets, the publish button' },
  { name: 'Amber deep', value: '#b45309', token: '--color-accent-deep', use: 'hover states and small caps' },
  { name: 'Rule', value: '#e0cfae', token: '--color-rule', use: 'hairlines and borders' },
];
