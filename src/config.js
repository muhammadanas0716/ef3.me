/**
 * Everything personal about the site lives here. Edit this file, not the
 * templates.
 */
export const site = {
  name: 'Muhammad Anas',
  /** Legal/full name, used in structured data alongside the one I go by. */
  legalName: 'Muhammad Anas',
  /** Shown in <title> suffixes, feeds and structured data. */
  shortName: 'ef3',
  url: (import.meta.env.PUBLIC_SITE_URL || 'https://ef3.me').replace(/\/$/, ''),
  locale: 'en_US',
  lang: 'en',
  /** The home page <title> suffix. Keep it under ~50 characters. */
  tagline: 'ML, finance, and a journal of both',
  description:
    'Freshman at NYU Abu Dhabi studying computer science, economics and film. A working journal of machine learning, deep learning and the places they meet finance.',
  /** Used on the blog index and in feed metadata. */
  blogTitle: 'Journal',
  blogDescription:
    'Notes from the middle of learning: machine learning, deep learning, and any fun stuff I see along the way.',
  /** Twitter/X handle without the @, for Twitter card attribution. Empty = omitted. */
  twitter: '',
  email: 'ma10016@nyu.edu',
  /**
   * Profile URLs, emitted as schema.org `sameAs`. This is how search engines
   * tie the site to the same *person* across the web, so add every profile
   * you actually maintain.
   */
  sameAs: ['https://github.com/muhammadanas0716'],
  /** Affiliation, used in the Person schema. */
  affiliation: { name: 'NYU Abu Dhabi', url: 'https://nyuad.nyu.edu' },
};

/** Top-right links, on every page. */
export const nav = [
  { label: 'journal', href: '/blog' },
  { label: 'stack', href: '/techstack' },
  { label: 'github', href: 'https://github.com/muhammadanas0716' },
];

/**
 * The home page. Prose is written in markdown so links, emphasis and lists
 * all work exactly like they do in a post.
 */
export const about = {
  intro: `I'm **Muhammad Anas**, nickname's Effie and **ef3** is just a shorter way to write it. I'm a freshman at [NYU Abu Dhabi](https://nyuad.nyu.edu) studying computer science, economics
and film, mostly interested in machine learning and what it does to finance. I learn in public,
which is what [this journal](/blog) is.`,
  sections: [
    {
      heading: 'Currently',
      items: [
        'Working through deep learning from first principles — backprop, optimisation, and the architectures that actually earn their complexity.',
        'Reading a book on titled Crime and Punishment by Dostoevsky, just trying philosophy and literature for a change.',
        'Writing up a few things I learned, most days.',
      ],
    },
    {
      heading: "Project I', most proud of",
      items: [
        "Built a dank-memer bot script that mined coins 24/7 and got me to top 10 richest in the world, then spent the winnings running MrBeast-style giveaways during Covid.'",
        "Also one more thing I built for my brother was that he stutters, so I built an ML model that would predict his stuttered words and correct them in real-time, which he used for a while and it helped him a lot.'",
      ],
    },
  ],
  /** Optional. Path to an image in /public, or a full URL. */
  avatar: '',
  signoff: '-- Effie',
};
