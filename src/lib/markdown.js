import { Marked, Renderer } from 'marked';
import GithubSlugger from 'github-slugger';
import katex from 'katex';
import { createHighlighter } from 'shiki';

const LANGS = [
  'python',
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'bash',
  'json',
  'yaml',
  'toml',
  'sql',
  'rust',
  'c',
  'cpp',
  'go',
  'java',
  'r',
  'julia',
  'markdown',
  'diff',
  'html',
  'css',
  'latex',
  'ini',
];

const LANG_ALIASES = {
  py: 'python',
  js: 'javascript',
  ts: 'typescript',
  sh: 'bash',
  zsh: 'bash',
  shell: 'bash',
  console: 'bash',
  yml: 'yaml',
  md: 'markdown',
  tex: 'latex',
  'c++': 'cpp',
  golang: 'go',
};

const CALLOUTS = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'];

let highlighterPromise;

/** One highlighter per server instance; loading the grammars is the slow part. */
function highlighter() {
  highlighterPromise ??= createHighlighter({ themes: ['github-light'], langs: LANGS }).catch(
    (error) => {
      // Never cache a rejection, a transient failure shouldn't disable
      // highlighting for the whole lifetime of the instance.
      highlighterPromise = undefined;
      throw error;
    },
  );
  return highlighterPromise;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMath(expression, displayMode) {
  try {
    return katex.renderToString(expression, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
    });
  } catch {
    return `<code class="math-error">${escapeHtml(expression)}</code>`;
  }
}

/* --------------------------------------------------------------- extensions */

const blockMath = {
  name: 'blockMath',
  level: 'block',
  start(src) {
    const index = src.indexOf('$$');
    return index === -1 ? undefined : index;
  },
  tokenizer(src) {
    const match = /^\$\$([\s\S]+?)\$\$(?:\n+|$)/.exec(src);
    if (!match) return undefined;
    return { type: 'blockMath', raw: match[0], text: match[1].trim() };
  },
  renderer(token) {
    return `<div class="math-block" role="math">${renderMath(token.text, true)}</div>\n`;
  },
};

const inlineMath = {
  name: 'inlineMath',
  level: 'inline',
  start(src) {
    const index = src.indexOf('$');
    return index === -1 ? undefined : index;
  },
  tokenizer(src) {
    // A non-space is required right after the opening `$` (and no digit after
    // the closing one) so that prose like "$5 and $6" stays prose.
    const match = /^\$(?!\s)((?:\\.|[^$\n])+?)(?<!\s)\$(?!\d)/.exec(src);
    if (!match) return undefined;
    return { type: 'inlineMath', raw: match[0], text: match[1] };
  },
  renderer(token) {
    return renderMath(token.text, false);
  },
};

/* ------------------------------------------------------------------ embeds */

/**
 * Turns a bare URL sitting alone on its own line into an embed.
 *
 * Providers that support iframes get a real player, kept 16:9 by CSS and
 * lazy-loaded so an embed never costs anything above the fold. Everything else
 * becomes a plain link card: no third-party JavaScript is ever injected,
 * which keeps the page fast, private and immune to a provider's script
 * breaking the article.
 */
const EMBEDS = [
  {
    name: 'YouTube',
    match: /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/i,
    // youtube-nocookie avoids setting tracking cookies before a click.
    src: (id, url) => {
      const start = /[?&]t=(\d+)/.exec(url)?.[1];
      return `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ''}`;
    },
    title: 'YouTube video',
  },
  {
    name: 'Vimeo',
    match: /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/i,
    src: (id) => `https://player.vimeo.com/video/${id}`,
    title: 'Vimeo video',
  },
  {
    name: 'Loom',
    match: /^https?:\/\/(?:www\.)?loom\.com\/share\/([\w]+)/i,
    src: (id) => `https://www.loom.com/embed/${id}`,
    title: 'Loom recording',
  },
  {
    name: 'CodePen',
    match: /^https?:\/\/codepen\.io\/([\w-]+)\/pen\/([\w-]+)/i,
    src: (_id, url) => url.replace('/pen/', '/embed/'),
    title: 'CodePen',
    ratio: '4 / 3',
  },
  {
    name: 'Spotify',
    match: /^https?:\/\/open\.spotify\.com\/(track|episode|album|playlist|show)\/([\w]+)/i,
    src: (_id, url) => url.replace('open.spotify.com/', 'open.spotify.com/embed/').split('?')[0],
    title: 'Spotify',
    height: 152,
  },
];

/** Recognisable link cards for things that cannot be framed. */
const LINK_CARDS = [
  { name: 'Colab', match: /^https?:\/\/colab\.research\.google\.com\//i, label: 'Google Colab' },
  { name: 'arXiv', match: /^https?:\/\/arxiv\.org\//i, label: 'arXiv paper' },
  { name: 'GitHub', match: /^https?:\/\/github\.com\//i, label: 'GitHub' },
  { name: 'HuggingFace', match: /^https?:\/\/huggingface\.co\//i, label: 'Hugging Face' },
  { name: 'X', match: /^https?:\/\/(?:x|twitter)\.com\/[^/]+\/status\//i, label: 'Post on X' },
  { name: 'Kaggle', match: /^https?:\/\/(?:www\.)?kaggle\.com\//i, label: 'Kaggle' },
];

function renderEmbed(url) {
  for (const provider of EMBEDS) {
    const match = provider.match.exec(url);
    if (!match) continue;
    const src = provider.src(match[1], url);
    const style = provider.height
      ? `height:${provider.height}px`
      : `aspect-ratio:${provider.ratio ?? '16 / 9'}`;
    return (
      `<figure class="embed" data-provider="${provider.name.toLowerCase()}" style="${style}">` +
      `<iframe src="${escapeHtml(src)}" title="${escapeHtml(provider.title)}" loading="lazy" ` +
      `frameborder="0" referrerpolicy="strict-origin-when-cross-origin" ` +
      `allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" ` +
      `allowfullscreen></iframe></figure>\n`
    );
  }

  const card = LINK_CARDS.find((entry) => entry.match.test(url));
  let host;
  try {
    host = new URL(url).host.replace(/^www\./, '');
  } catch {
    return null;
  }
  const path = decodeURIComponent(url.replace(/^https?:\/\/(www\.)?[^/]+/, '')) || '/';

  return (
    `<a class="link-card" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">` +
    `<span class="link-card-label">${escapeHtml(card?.label ?? host)}</span>` +
    `<span class="link-card-path">${escapeHtml(path.slice(0, 90))}</span>` +
    `<span class="link-card-host">${escapeHtml(host)} ↗</span></a>\n`
  );
}

const embed = {
  name: 'embed',
  level: 'block',
  start(src) {
    const index = src.search(/^https?:\/\//m);
    return index === -1 ? undefined : index;
  },
  tokenizer(src) {
    // Must be the entire line, a URL inside a sentence stays a plain link.
    const match = /^(https?:\/\/\S+)[ \t]*(?:\n+|$)/.exec(src);
    if (!match) return undefined;
    const html = renderEmbed(match[1]);
    if (!html) return undefined;
    return { type: 'embed', raw: match[0], html };
  },
  renderer(token) {
    return token.html;
  },
};

/** `[^ref]` superscripts plus `[^ref]: …` definitions collected for the end. */
function footnoteExtensions(state) {
  return [
    {
      name: 'footnoteRef',
      level: 'inline',
      start(src) {
        const index = src.indexOf('[^');
        return index === -1 ? undefined : index;
      },
      tokenizer(src) {
        const match = /^\[\^([^\]\s]+)\]/.exec(src);
        if (!match) return undefined;
        return { type: 'footnoteRef', raw: match[0], id: match[1] };
      },
      renderer(token) {
        const id = token.id;
        let order = state.order.indexOf(id);
        if (order === -1) order = state.order.push(id) - 1;
        const safe = escapeHtml(id);
        return (
          `<sup class="footnote-ref">` +
          `<a id="fnref-${safe}" href="#fn-${safe}">${order + 1}</a></sup>`
        );
      },
    },
    {
      name: 'footnoteDef',
      level: 'block',
      start(src) {
        const match = /^\[\^[^\]\s]+\]:/m.exec(src);
        return match ? match.index : undefined;
      },
      tokenizer(src) {
        const match = /^\[\^([^\]\s]+)\]:[ \t]*([\s\S]*?)(?=\n{2,}|\n\[\^|$)/.exec(src);
        if (!match) return undefined;
        state.definitions.set(match[1], match[2].trim());
        // The source is consumed here; the rendered list is appended at the end.
        return { type: 'footnoteDef', raw: match[0] };
      },
      renderer() {
        return '';
      },
    },
  ];
}

/* ----------------------------------------------------------------- renderer */

function buildRenderer({ slugger, toc }) {
  return {
    heading({ tokens, depth }) {
      const inner = this.parser.parseInline(tokens);
      const plain = stripTags(inner);
      const id = slugger.slug(plain || `section-${toc.length + 1}`);
      if (depth >= 2 && depth <= 3) toc.push({ id, text: plain, depth });
      return (
        `<h${depth} id="${id}">` +
        `<a class="heading-anchor" href="#${id}" aria-label="Link to ${escapeHtml(plain)}">#</a>` +
        `${inner}</h${depth}>\n`
      );
    },

    code({ text, lang, escaped }) {
      // `escaped` means walkTokens already swapped in full Shiki output.
      if (escaped) return text;
      const attrs = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
      return `<figure class="code-block"${attrs}><pre><code>${escapeHtml(text)}</code></pre></figure>\n`;
    },

    link({ href, title, tokens }) {
      const inner = this.parser.parseInline(tokens);
      const external = /^https?:\/\//i.test(href);
      const attrs = [
        `href="${escapeHtml(href)}"`,
        title ? `title="${escapeHtml(title)}"` : '',
        external ? 'target="_blank" rel="noopener noreferrer"' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `<a ${attrs}>${inner}</a>`;
    },

    image({ href, title, text }) {
      const caption = title ? `<figcaption>${escapeHtml(title)}</figcaption>` : '';
      return (
        `<figure class="figure">` +
        `<img src="${escapeHtml(href)}" alt="${escapeHtml(text ?? '')}" loading="lazy" decoding="async" />` +
        `${caption}</figure>`
      );
    },

    table(token) {
      // Wrapped so a wide table scrolls instead of blowing out the column.
      return `<div class="table-scroll">${Renderer.prototype.table.call(this, token)}</div>`;
    },

    blockquote({ tokens }) {
      const body = this.parser.parse(tokens);
      const match = /^\s*<p>\s*\[!(\w+)\]\s*(?:<br\s*\/?>)?\s*/i.exec(body);
      const kind = match && CALLOUTS.includes(match[1].toUpperCase()) ? match[1].toUpperCase() : null;
      if (!kind) return `<blockquote>${body}</blockquote>\n`;
      const rest = body.slice(match[0].length);
      return (
        `<aside class="callout callout-${kind.toLowerCase()}" role="note">` +
        `<p class="callout-title">${kind}</p>` +
        (rest.startsWith('<') ? rest : `<p>${rest}`) +
        `</aside>\n`
      );
    },
  };
}

/* -------------------------------------------------------------------- utils */

export function stripTags(html) {
  return String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

/** Markdown → readable plain text, for excerpts, descriptions and counts. */
export function toPlainText(markdown) {
  return String(markdown ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWords(markdown) {
  const text = toPlainText(markdown);
  return text ? text.split(/\s+/).length : 0;
}

export function readingMinutes(markdown) {
  return Math.max(1, Math.round(countWords(markdown) / 220));
}

export function makeExcerpt(markdown, limit = 180) {
  const text = toPlainText(markdown);
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 60 ? lastSpace : limit).trimEnd()}…`;
}

/* ------------------------------------------------------------------- render */

/**
 * Inline-only markdown, links, emphasis, code. Used for short strings from
 * `config.js` where a full block parse would wrap everything in `<p>`.
 */
export function renderInline(markdown) {
  const marked = new Marked({ gfm: true, async: false });
  marked.use({ extensions: [inlineMath], renderer: buildRenderer({ slugger: new GithubSlugger(), toc: [] }) });
  return marked.parseInline(String(markdown ?? ''));
}

/**
 * Renders a post body. Returns the HTML plus everything the surrounding page
 * needs, table of contents, counts, so nothing has to parse the source twice.
 *
 * A fresh `Marked` instance per call keeps heading slugs and footnote numbering
 * from leaking between concurrently rendered posts.
 */
export async function renderMarkdown(markdown, { highlight = true } = {}) {
  const source = String(markdown ?? '');
  const slugger = new GithubSlugger();
  const toc = [];
  const footnotes = { order: [], definitions: new Map() };

  const marked = new Marked({ gfm: true, breaks: false, async: true });

  marked.use({
    extensions: [blockMath, inlineMath, embed, ...footnoteExtensions(footnotes)],
    async walkTokens(token) {
      if (token.type !== 'code') return;
      token.text = highlight
        ? await highlightCode(token.text, token.lang)
        : plainCode(token.text, token.lang);
      token.escaped = true;
    },
  });
  marked.use({ renderer: buildRenderer({ slugger, toc }) });

  const body = await marked.parse(source);
  const html = body + (await renderFootnotes(footnotes, marked));

  return {
    html,
    toc,
    wordCount: countWords(source),
    readingMinutes: readingMinutes(source),
  };
}

async function renderFootnotes({ order, definitions }, marked) {
  if (order.length === 0) return '';
  const items = await Promise.all(
    order.map(async (id, index) => {
      const body = definitions.get(id);
      const text = body ? await marked.parseInline(body) : '<em>missing footnote</em>';
      const safe = escapeHtml(id);
      return (
        `<li id="fn-${safe}">${text} ` +
        `<a class="footnote-back" href="#fnref-${safe}" aria-label="Back to reference ${
          index + 1
        }">↩</a></li>`
      );
    }),
  );
  return (
    `<section class="footnotes" aria-labelledby="footnote-label">` +
    `<h2 id="footnote-label">Notes</h2><ol>${items.join('\n')}</ol></section>`
  );
}

function codeChrome(lang, inner) {
  const attrs = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
  const label = lang ? `<span class="code-lang">${escapeHtml(lang)}</span>` : '';
  return (
    `<figure class="code-block"${attrs}>${label}` +
    `<button class="code-copy" type="button" data-copy>copy</button>${inner}</figure>`
  );
}

function plainCode(code, lang) {
  return codeChrome(lang, `<pre><code>${escapeHtml(code)}</code></pre>`);
}

async function highlightCode(code, lang) {
  const raw = String(lang ?? '').toLowerCase().trim();
  const normalized = LANG_ALIASES[raw] ?? raw;
  try {
    const shiki = await highlighter();
    return codeChrome(
      lang,
      shiki.codeToHtml(code, {
        lang: LANGS.includes(normalized) ? normalized : 'plaintext',
        theme: 'github-light',
      }),
    );
  } catch (error) {
    console.error('[markdown] highlight failed:', error?.message ?? error);
    return plainCode(code, lang);
  }
}
