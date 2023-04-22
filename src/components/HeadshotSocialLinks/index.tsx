import React, { useState } from 'react';
import { SocialIcon } from './SocialIcon';

import headshot from '/headshot.png';
import twitterHeadshot from '/twitterprofile.png';
import instagramHeadshot from '/instagramprofile.png';
import linkedInHeadshot from '/linkedinprofile.png';
import gitHubHeadshot from '/githubprofile.png';

import twitterIcon from '/icons/twitter.svg';
import instagramIcon from '/icons/instagram.svg';
import linkedInIcon from '/icons/linkedin.svg';
import gitHubIcon from '/icons/github.svg';
import rssIcon from '/icons/rss.svg';

export const HeadshotSocialLinks = () => {
  const [profilePic, setProfilePic] = useState(headshot);
  const resetProfilePic = () => setProfilePic(headshot);

  return (
    <div className="min-w-full w-10/12">
      <img
        className="rounded-full w-64 max-w-xs m-auto border-4 border-black"
        src={profilePic}
      />
      <div className="flex flex-row justify-center py-8">
        <SocialIcon
          href=""
          onMouseEnter={() => setProfilePic(twitterHeadshot)}
          onMouseLeave={resetProfilePic}
          src={twitterIcon}
        />

        <SocialIcon
          href=""
          onMouseEnter={() => setProfilePic(instagramHeadshot)}
          onMouseLeave={resetProfilePic}
          src={instagramIcon}
        />

        <SocialIcon
          href=""
          onMouseEnter={() => setProfilePic(linkedInHeadshot)}
          onMouseLeave={resetProfilePic}
          src={linkedInIcon}
        />

        <SocialIcon
          href=""
          onMouseEnter={() => setProfilePic(gitHubHeadshot)}
          onMouseLeave={resetProfilePic}
          src={gitHubIcon}
        />

        <SocialIcon
          href=""
          onMouseEnter={() => setProfilePic(gitHubHeadshot)}
          onMouseLeave={resetProfilePic}
          src={rssIcon}
        />
      </div>
    </div>
  );
};
