/** Nav, social links and page keys — shared by the header, dock and footer. */

/**
 * Drives the active nav state. A page key is not always its nav key: a post
 * highlights Writing, a case study highlights Projects.
 */
export type PageKey =
  | 'home'
  | 'about'
  | 'projects'
  | 'case'
  | 'writing'
  | 'post'
  | 'lists'
  | 'list';

export type NavKey = 'home' | 'about' | 'projects' | 'writing' | 'lists';

/** Which nav item lights up for a given page. */
export const NAV_FOR_PAGE: Record<PageKey, NavKey> = {
  home: 'home',
  about: 'about',
  projects: 'projects',
  case: 'projects',
  writing: 'writing',
  post: 'writing',
  lists: 'lists',
  list: 'lists',
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
  /** Whether hovering this chip swaps the homepage portrait. */
  hasPortrait?: boolean;
};

export const SOCIALS: Social[] = [
  {
    key: 'github',
    label: 'GitHub',
    href: 'https://github.com/jasonleibowitz',
    icon: 'simple-icons:github',
    hasPortrait: true,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/jasonleibowitz/',
    icon: 'simple-icons:linkedin',
    hasPortrait: true,
  },
  {
    key: 'twitter',
    label: 'X, formerly known as Twitter',
    href: 'https://twitter.com/jasonleibowitz',
    icon: 'simple-icons:x',
    hasPortrait: true,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/jasonleibowitz/',
    icon: 'simple-icons:instagram',
    hasPortrait: true,
  },
  { key: 'rss', label: 'RSS feed', href: '/rss.xml', icon: 'lucide:rss' },
];

/** The four that drive the homepage portrait swap; RSS has no portrait. */
export const PORTRAIT_SOCIALS = SOCIALS.filter((s) => s.hasPortrait);

export const EMAIL = 'jason@leibowitz.me';

/** Jason supplies the PDF; it belongs at `public/resume.pdf`. */
export const RESUME_HREF = '/resume.pdf';
