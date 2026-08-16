/**
 * Everything personal about the site lives here. Edit this file, not the
 * templates.
 */
export const site = {
  name: 'Muhammad Anas',
  /** Shown in <title> suffixes, feeds and structured data. */
  shortName: 'Effie Labs',
  url: (import.meta.env.PUBLIC_SITE_URL || 'https://effielabs.com').replace(/\/$/, ''),
  locale: 'en_US',
  lang: 'en',
  /** The home page <title> suffix. Keep it under ~50 characters. */
  tagline: 'ML, finance, and a journal of both',
  description:
    'Freshman at NYU Abu Dhabi studying computer science, economics and film. A working journal of machine learning, deep learning and the places they meet finance.',
  /** Used on the blog index and in feed metadata. */
  blogTitle: 'Journal',
  blogDescription:
    'Notes from the middle of learning: machine learning, deep learning, quantitative finance and university, written down the day I understand them.',
  /** Twitter/X handle without the @, for Twitter card attribution. Empty = omitted. */
  twitter: '',
  email: 'iam.muhammadanas0716@gmail.com',
  /**
   * Profile URLs, emitted as schema.org `sameAs`. This is how search engines
   * tie the site to the same *person* across the web, so add every profile
   * you actually maintain.
   */
  sameAs: ['https://github.com/muhammadanas0716'],
  /** Affiliation, used in the Person schema. */
  affiliation: { name: 'NYU Abu Dhabi', url: 'https://nyuad.nyu.edu' },
};

/** Top-right links on every page. First one gets the little bird glyph. */
export const nav = [
  { label: 'journal', href: '/blog' },
  { label: 'github', href: 'https://github.com/muhammadanas0716' },
];

/**
 * The home page. Prose is written in markdown so links, emphasis and lists
 * all work exactly like they do in a post.
 */
export const about = {
  intro: `I'm a freshman at [NYU Abu Dhabi](https://nyuad.nyu.edu), studying computer science,
economics and film. I'm mostly interested in machine learning and what it does to finance — and I
learn in public, which is what [this journal](/blog) is.`,
  sections: [
    {
      heading: 'Currently',
      items: [
        'Working through deep learning from first principles — backprop, optimisation, and the architectures that actually earn their complexity.',
        'Pointing all of it at markets: signals, backtests, and the difference between a real edge and an overfit one.',
        'Writing up one thing I learned, most days.',
      ],
    },
    {
      heading: 'Previously',
      items: [
        'Built [Depressed-Amogoi](https://github.com/muhammadanas0716/Depressed-Amogoi) in grade 7 — a Discord bot for my school server, and still the project I am fondest of.',
        'Wrote a Dank Memer bot that mined coins around the clock and got me to top 10 richest in the world, then spent the winnings running MrBeast-style giveaways in 2020.',
      ],
    },
  ],
  /** Optional. Path to an image in /public, or a full URL. */
  avatar: '',
  signoff: '-- Anas',
};
