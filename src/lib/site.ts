/** Nav, social links and page keys, shared by the header, tab bar and footer. */

/**
 * Drives the active nav state. A page key is not always its nav key: a post
 * highlights Writing, a project page highlights Projects.
 */
export type PageKey =
  | 'home'
  | 'about'
  | 'projects'
  | 'project'
  | 'writing'
  | 'post'
  | 'lists'
  | 'list'
  | 'missing';

export type NavKey = 'home' | 'about' | 'projects' | 'writing' | 'lists';

/**
 * Which nav item lights up for a given page. `null` for a page that is in no
 * section: the 404 belongs to none of them, and lighting one would tell the
 * reader they are somewhere they are not.
 */
export const NAV_FOR_PAGE: Record<PageKey, NavKey | null> = {
  home: 'home',
  about: 'about',
  projects: 'projects',
  project: 'projects',
  writing: 'writing',
  post: 'writing',
  lists: 'lists',
  list: 'lists',
  missing: null,
};

/** Order is fixed: Home · About · Projects · Writing · Lists. */
export const NAV: { key: NavKey; label: string; href: string; icon: string }[] =
  [
    { key: 'home', label: 'Home', href: '/', icon: 'lucide:house' },
    {
      key: 'about',
      label: 'About',
      href: '/about/',
      icon: 'lucide:user-round',
    },
    {
      key: 'projects',
      label: 'Projects',
      href: '/projects/',
      icon: 'lucide:briefcase',
    },
    {
      key: 'writing',
      label: 'Writing',
      href: '/writing/',
      icon: 'lucide:file-text',
    },
    { key: 'lists', label: 'Lists', href: '/lists/', icon: 'lucide:list' },
  ];

export type SocialKey = 'github' | 'linkedin' | 'twitter' | 'instagram' | 'rss';

export type Social = {
  key: SocialKey;
  /** Accessible name. The bird is long gone, so the X chip says so. */
  label: string;
  href: string;
  icon: string;
  /** Whether hovering this chip swaps the homepage avatar. */
  hasAvatar?: boolean;
};

export const SOCIALS: Social[] = [
  {
    key: 'github',
    label: 'GitHub',
    href: 'https://github.com/jasonleibowitz',
    icon: 'simple-icons:github',
    hasAvatar: true,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/jasonleibowitz/',
    icon: 'simple-icons:linkedin',
    hasAvatar: true,
  },
  {
    key: 'twitter',
    label: 'X, formerly known as Twitter',
    href: 'https://twitter.com/jasonleibowitz',
    icon: 'simple-icons:x',
    hasAvatar: true,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/jasonleibowitz/',
    icon: 'simple-icons:instagram',
    hasAvatar: true,
  },
  { key: 'rss', label: 'RSS feed', href: '/rss.xml', icon: 'lucide:rss' },
];

/** The four that drive the homepage avatar swap; RSS has no picture. */
export const AVATAR_SOCIALS = SOCIALS.filter((s) => s.hasAvatar);

export const EMAIL = 'jason@leibowitz.me';

/**
 * What the Writing archive says it is, in the one place all four surfaces read
 * it from: the page's meta description, its header intro, the RSS feed's own
 * description, and the head link that offers the feed.
 *
 * The shared sentence is named separately because the header has room for a
 * clause a meta description does not, and the two used to differ by that clause
 * plus whatever had drifted.
 */
const WRITING_LEAD =
  "Long reviews of hardware I probably didn't need to buy, plus the occasional how-to";

export const WRITING = {
  eyebrow: 'Archive',
  title: 'Writing',
  headline: 'Writing',
  description: `${WRITING_LEAD}.`,
  intro: `${WRITING_LEAD} I wrote so I'd never have to work it out twice.`,
} as const;

const LISTS_LEAD =
  'Recommendations I get asked for often enough that it was easier to write them down';

/**
 * The `/lists` masthead, in the same shape, and for one more reason: the share
 * card is drawn outside Astro by `scripts/og-card.ts`, which reads this file.
 * Copy left inline in the page would have to be typed a second time in the
 * script, and the card would then keep the old wording after an edit.
 *
 * `headline` is separate from `title` because this page's masthead is a
 * sentence and its nav label is a word. Writing's are the same word, which is
 * why both of its keys hold it.
 */
export const LISTS = {
  eyebrow: 'Lists',
  title: 'Lists',
  headline: 'Things, ranked and sorted',
  description: `${LISTS_LEAD}.`,
  intro: `${LISTS_LEAD}. Shorter than a post, updated whenever something changes.`,
} as const;

/** How the feed names itself, in its XML and in the head link offering it. */
export const FEED_TITLE = `${WRITING.title} · Jason Leibowitz`;

/** Jason supplies the PDF; it belongs at `public/resume.pdf`. */
export const RESUME_HREF = '/resume.pdf';

/**
 * The "Join the beta" link on a TestFlight app's project page.
 *
 * A `mailto:` rather than a form because the site is static and has nowhere to
 * post one. The trade is that the tester types their own details, so the body
 * ships as a template with the three fields TestFlight actually needs already
 * labeled -- an empty mail window gets a name and nothing else back.
 *
 * The iCloud line carries its own note because it is the one people get wrong:
 * Apple sends the invite to the address on their Apple ID, so a work address
 * typed here is an invite that never arrives.
 */
export function testflightRequestHref(app: string): string {
  const subject = `${app} TestFlight Access Request`;
  const body = [
    `Hi Jason,`,
    ``,
    `I'd like a TestFlight invite for ${app}.`,
    ``,
    `First name:`,
    `Last name:`,
    `iCloud email:`,
    `  (the address registered with your Apple ID, since TestFlight can only send`,
    `  the invite there)`,
    ``,
    `Thanks!`,
  ].join('\n');

  return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
