import { useState } from 'react';
import { SocialIcon } from './SocialIcon';

/**
 * Files in public/ are served as-is and are not importable modules -- Astro
 * treats a `/foo.png` import as an image asset to process and fails the build.
 * They are referenced by URL string instead.
 */
const HEADSHOT = '/headshot.png';

type Social = {
  label: string;
  href: string;
  icon: string;
  /** Headshot swapped in while this icon is hovered. */
  headshot: string;
};

const SOCIALS: Social[] = [
  {
    label: 'Twitter',
    href: 'https://twitter.com/jasonleibowitz',
    icon: '/icons/twitter.svg',
    headshot: '/twitterprofile.png',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/jasonleibowitz/',
    icon: '/icons/instagram.svg',
    headshot: '/instagramprofile.png',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/jasonleibowitz/',
    icon: '/icons/linkedin.svg',
    headshot: '/linkedinprofile.png',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/jasonleibowitz',
    icon: '/icons/github.svg',
    headshot: '/githubprofile.png',
  },
  {
    label: 'RSS feed',
    href: '/rss.xml',
    icon: '/icons/rss.svg',
    headshot: HEADSHOT,
  },
];

export const HeadshotSocialLinks = () => {
  const [profilePic, setProfilePic] = useState(HEADSHOT);

  return (
    <div className="min-w-full w-10/12">
      <img
        className="rounded-full w-64 max-w-xs m-auto border-4 border-black"
        src={profilePic}
        alt="Jason Leibowitz"
        width={256}
        height={256}
      />
      <div className="flex flex-row justify-center py-8">
        {SOCIALS.map(({ label, href, icon, headshot }) => (
          <SocialIcon
            key={label}
            label={label}
            href={href}
            src={icon}
            onMouseEnter={() => setProfilePic(headshot)}
            onMouseLeave={() => setProfilePic(HEADSHOT)}
          />
        ))}
      </div>
    </div>
  );
};
