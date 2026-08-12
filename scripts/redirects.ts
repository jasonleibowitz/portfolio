import { existsSync, writeFileSync } from 'node:fs';
import { published, type Draftable } from './content.ts';

/**
 * Writes `dist/_redirects`, the last part of `pnpm build`.
 *
 * A post keeps every address it ever had. `aliases` in its frontmatter holds
 * them, and each one becomes a 301 to the address the post has today. The
 * addresses of the five posts that predate the `slug` field carry ten years of
 * links from other sites, thus none of them may stop working.
 *
 * The old address lives with the post, and not in `astro.config.mjs`, for the
 * reason the images of a post live with it: deleting the post takes its
 * redirects, and renaming it carries them. The admin writes one line into the
 * post it is changing, and needs to read no other file.
 *
 * A 301 and not the redirect of Astro: `redirects` in the config gives a page
 * that holds `<meta http-equiv="refresh">`, which needs a download and a render
 * before the reader moves. Cloudflare reads `_redirects` at the edge and
 * answers 301 with no body. The file is generated and not in git, as
 * `_headers` is: a wrong copy in `public/` would ship to the live site.
 *
 * `wrangler.jsonc` declares no `main`, thus every request is a request for a
 * static file. This matters, because Cloudflare does not apply this file to a
 * request that Worker code answers.
 */

/** Where the built site is, and where Cloudflare reads `_redirects`. */
const DIST = 'dist';

/** One `from to status` line. Cloudflare allows 2,000 of them. */
type Rule = [from: string, to: string];

/**
 * Both of the paths a post has ever been under. `/writing` is the address
 * today, and `/blog` is where every post was until this site replaced the old
 * one. `astro.config.mjs` sends `/blog/<something>` to `/writing/<something>`,
 * which is right for a post that still has its old name and wrong for a post
 * that took a new one, thus each alias gets a rule under both.
 */
function rulesFor(id: string, aliases: string[]): Rule[] {
  return aliases.flatMap((alias): Rule[] => [
    [`/writing/${alias}/`, `/writing/${id}/`],
    [`/blog/${alias}/`, `/writing/${id}/`],
  ]);
}

/**
 * Stops the build when a rule points at a page that the build did not make.
 *
 * Nothing else checks this. Astro checks the target of a redirect in its own
 * config, and it never reads this file, thus a slug that changes without its
 * alias changing would publish a redirect to a 404.
 */
function refuseMissingTarget(rules: Rule[]): void {
  for (const [from, to] of rules) {
    if (!existsSync(`${DIST}${to}index.html`)) {
      throw new Error(
        `The redirect from ${from} points at ${to}, and the build made no ` +
          `page there.\nAn \`aliases\` entry in a post names an address the ` +
          'post used to have. The `slug` of that post is what it must point ' +
          'at now.'
      );
    }
  }
}

interface PostData extends Draftable {
  pubDate: string;
}

const posts = published<PostData>('src/content/blog', (d) => d.pubDate);
const rules = posts.flatMap((post) =>
  rulesFor(post.id, post.data.aliases ?? [])
);

refuseMissingTarget(rules);

writeFileSync(
  `${DIST}/_redirects`,
  rules.map(([from, to]) => `${from} ${to} 301`).join('\n') + '\n'
);

console.log(`  ${rules.length} redirects  ${DIST}/_redirects`);
