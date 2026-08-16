import { site } from '../config.js';

export function absoluteUrl(path = '/') {
  return new URL(path, `${site.url}/`).toString();
}

export function postUrl(slug) {
  return absoluteUrl(`/blog/${slug}`);
}

export function ogUrl(slug = 'home') {
  return absoluteUrl(`/og/${slug}.png`);
}

export function isoDate(ms) {
  return ms ? new Date(ms).toISOString() : undefined;
}

export function formatDate(ms, { style = 'long' } = {}) {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: style === 'short' ? 'short' : 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Search engines truncate descriptions around 155–160 characters. Excerpts may
 * be longer for on-page display, so clamp on a word boundary for the meta tag
 * rather than letting Google cut mid-word.
 */
export function metaDescription(text, limit = 158) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : limit).replace(/[;:.\s]+$/, '')}…`;
}

/* ---------------------------------------------------------- structured data */

/** A reusable image node, Google prefers dimensions over a bare URL string. */
function imageObject(url, { width = 1200, height = 630, caption } = {}) {
  return {
    '@type': 'ImageObject',
    url,
    width,
    height,
    caption: caption || undefined,
  };
}

export function personSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${site.url}/#person`,
    name: site.name,
    // The name I go by, plus the legal one, `alternateName` is how you tell a
    // search engine that "Effie" and "Muhammad Anas" are the same person.
    alternateName: site.legalName ? [site.legalName, site.shortName] : undefined,
    url: site.url,
    description: site.description,
    email: site.email ? `mailto:${site.email}` : undefined,
    sameAs: site.sameAs?.length ? site.sameAs : undefined,
    affiliation: site.affiliation
      ? { '@type': 'CollegeOrUniversity', name: site.affiliation.name, url: site.affiliation.url }
      : undefined,
    knowsAbout: [
      'Machine learning',
      'Deep learning',
      'Quantitative finance',
      'Computer science',
    ],
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    url: site.url,
    name: site.shortName,
    description: site.description,
    inLanguage: site.lang,
    publisher: { '@id': `${site.url}/#person` },
    author: { '@id': `${site.url}/#person` },
  };
}

export function blogSchema(posts = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${site.url}/blog#blog`,
    url: absoluteUrl('/blog'),
    name: `${site.blogTitle}, ${site.name}`,
    description: site.blogDescription,
    inLanguage: site.lang,
    author: { '@id': `${site.url}/#person` },
    publisher: { '@id': `${site.url}/#person` },
    isPartOf: { '@id': `${site.url}/#website` },
    blogPost: posts.slice(0, 20).map((post) => ({
      '@type': 'BlogPosting',
      '@id': `${postUrl(post.slug)}#post`,
      headline: post.title,
      url: postUrl(post.slug),
      datePublished: isoDate(post.publishedAt),
      dateModified: isoDate(post.updatedAt),
      keywords: post.tags?.length ? post.tags.join(', ') : undefined,
    })),
  };
}

/** An explicit, ordered list of the posts on a listing page. */
export function itemListSchema(posts, { name, url }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    url: absoluteUrl(url),
    numberOfItems: posts.length,
    itemListElement: posts.slice(0, 50).map((post, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: postUrl(post.slug),
      name: post.title,
    })),
  };
}

export function postSchema(post) {
  const url = postUrl(post.slug);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#post`,
    headline: post.title.slice(0, 110), // Google ignores headlines beyond this
    description: post.excerpt,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: isoDate(post.publishedAt),
    dateModified: isoDate(post.updatedAt ?? post.publishedAt),
    image: imageObject(post.coverImage || ogUrl(post.slug), { caption: post.coverAlt }),
    keywords: post.tags?.length ? post.tags.join(', ') : undefined,
    articleSection: post.series || post.tags?.[0] || undefined,
    wordCount: post.wordCount,
    timeRequired: `PT${post.readingMinutes}M`,
    inLanguage: site.lang,
    isAccessibleForFree: true,
    isPartOf: { '@id': `${site.url}/blog#blog` },
    author: { '@id': `${site.url}/#person` },
    publisher: { '@id': `${site.url}/#person` },
  };
}

export function breadcrumbSchema(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
}

/** Drops undefined values so the emitted JSON-LD stays clean. */
export function jsonLd(value) {
  return JSON.stringify(value, (_key, v) => (v === undefined ? undefined : v));
}

/**
 * Posts sharing the most tags with this one, newest first. Pure internal
 * linking: it keeps readers moving and gives crawlers more paths into the
 * archive than the index alone.
 */
export function relatedPosts(post, all, limit = 3) {
  const tags = new Set(post.tags ?? []);
  return all
    .filter((other) => other.slug !== post.slug)
    .map((other) => ({
      post: other,
      shared: (other.tags ?? []).filter((tag) => tags.has(tag)).length,
    }))
    .filter((entry) => entry.shared > 0)
    .sort((a, b) => b.shared - a.shared || (b.post.publishedAt ?? 0) - (a.post.publishedAt ?? 0))
    .slice(0, limit)
    .map((entry) => entry.post);
}
