/**
 * Regenerates `src/lib/logos.js` from `simple-icons`.
 *
 *   node scripts/logos.mjs
 *
 * simple-icons tracks each company's own brand guidelines, so this is the
 * official mark — we just bake it into the bundle rather than hotlinking a
 * CDN that might move or disappear.
 */
import { writeFileSync } from 'node:fs';
import * as si from 'simple-icons';

const WANTED = {
  astro: 'Astro',
  convex: 'Convex',
  vercel: 'Vercel',
  resend: 'Resend',
  tailwindcss: 'TailwindCss',
  pnpm: 'Pnpm',
  markdown: 'Markdown',
  sharp: 'Sharp',
  nodedotjs: 'Nodedotjs',
};

const logos = {};
for (const [key, slug] of Object.entries(WANTED)) {
  const icon = si[`si${slug}`];
  if (!icon) throw new Error(`simple-icons has no mark for "${slug}"`);
  logos[key] = { title: icon.title, hex: `#${icon.hex}`, path: icon.path };
}

const header = `/**
 * Official brand marks, extracted from \`simple-icons\` (which tracks each
 * company's own brand guidelines) so the logos ship with the site instead of
 * being hotlinked at runtime — no third-party request, no layout shift, and
 * nothing breaks when someone reorganises their CDN.
 *
 * Regenerate with: node scripts/logos.mjs
 */
export const logos = `;

writeFileSync('src/lib/logos.js', `${header}${JSON.stringify(logos, null, 2)};\n`);
console.log(`wrote ${Object.keys(logos).length} marks to src/lib/logos.js`);
