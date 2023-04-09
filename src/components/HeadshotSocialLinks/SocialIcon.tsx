import React from 'react';

type SocialIconProps = {
  href: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  src: string;
};
export const SocialIcon = ({
  href,
  onMouseEnter,
  onMouseLeave,
  src,
}: SocialIconProps) => (
  <a
    className="pr-8 last-of-type:pr-0"
    href={href}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    <img src={src} className="w-12" />
  </a>
);
