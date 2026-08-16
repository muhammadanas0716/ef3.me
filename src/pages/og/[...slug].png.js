import satori from 'satori';
import sharp from 'sharp';
import regularFont from '../../assets/fonts/jetbrains-mono-latin-400-normal.woff?inline';
import mediumFont from '../../assets/fonts/jetbrains-mono-latin-500-normal.woff?inline';
import { site } from '../../config.js';
import { safeQuery } from '../../lib/convex.js';
import { api } from '../../../convex/_generated/api.js';
import { formatDate } from '../../lib/seo.js';

const PAPER = '#feeccf';
const INK = '#1c1917';
const FAINT = '#857a6c';
const ACCENT = '#f59e0b';

/** Vite hands these back as `data:` URIs; satori wants the raw bytes. */
function fontBuffer(dataUri) {
  return Buffer.from(dataUri.slice(dataUri.indexOf(',') + 1), 'base64');
}

let fonts;
function loadFonts() {
  fonts ??= [
    { name: 'JetBrains Mono', data: fontBuffer(regularFont), weight: 400, style: 'normal' },
    { name: 'JetBrains Mono', data: fontBuffer(mediumFont), weight: 500, style: 'normal' },
  ];
  return fonts;
}

const el = (type, style, children) => ({ type, props: { style, children } });

function card({ eyebrow, title, footer }) {
  return el(
    'div',
    {
      width: 1200,
      height: 630,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      backgroundColor: PAPER,
      padding: '72px 80px',
      fontFamily: 'JetBrains Mono',
    },
    [
      el('div', { display: 'flex', fontSize: 24, color: FAINT, letterSpacing: '0.04em' }, eyebrow),
      el('div', { display: 'flex', flexDirection: 'column' }, [
        el(
          'div',
          {
            display: 'flex',
            fontSize: title.length > 58 ? 52 : 64,
            fontWeight: 500,
            color: INK,
            lineHeight: 1.22,
            letterSpacing: '-0.02em',
          },
          title,
        ),
        el('div', { display: 'flex', width: 128, height: 5, backgroundColor: ACCENT, marginTop: 34 }, []),
      ]),
      el(
        'div',
        { display: 'flex', justifyContent: 'space-between', fontSize: 24, color: FAINT },
        [
          el('div', { display: 'flex', color: INK }, site.name),
          el('div', { display: 'flex' }, footer),
        ],
      ),
    ],
  );
}

function truncate(value, limit) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}

export async function GET({ params }) {
  const slug = (params.slug ?? 'home').replace(/\.png$/, '');

  let content;
  if (slug === 'home' || slug === 'index') {
    content = {
      eyebrow: new URL(site.url).host,
      title: truncate(site.description, 110),
      footer: 'ml · dl · notes',
    };
  } else if (slug === 'blog') {
    content = {
      eyebrow: `${new URL(site.url).host}/blog`,
      title: truncate(site.blogDescription, 110),
      footer: site.blogTitle.toLowerCase(),
    };
  } else {
    const post = await safeQuery(api.posts.getBySlug, { slug }, null);
    if (!post) return new Response('Not found', { status: 404 });
    content = {
      eyebrow: `${new URL(site.url).host}/blog`,
      title: truncate(post.title, 110),
      footer: `${formatDate(post.publishedAt, { style: 'short' })} · ${post.readingMinutes} min`,
    };
  }

  try {
    const svg = await satori(card(content), { width: 1200, height: 630, fonts: loadFonts() });
    const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

    return new Response(png, {
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public, max-age=0, s-maxage=604800, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('[og] render failed:', error?.message ?? error);
    return new Response('Could not render image', { status: 500 });
  }
}
