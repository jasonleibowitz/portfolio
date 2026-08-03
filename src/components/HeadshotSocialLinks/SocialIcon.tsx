type SocialIconProps = {
  label: string;
  href: string;
  src: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export const SocialIcon = ({
  label,
  href,
  src,
  onMouseEnter,
  onMouseLeave,
}: SocialIconProps) => {
  const isExternal = href.startsWith('http');

  return (
    <a
      className="pr-8 last-of-type:pr-0"
      href={href}
      aria-label={label}
      {...(isExternal
        ? { target: '_blank', rel: 'noreferrer noopener' }
        : undefined)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <img src={src} className="w-12" alt="" width={48} height={48} />
    </a>
  );
};
