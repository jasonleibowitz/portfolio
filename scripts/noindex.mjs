import { writeFileSync } from 'node:fs';

/**
 * Marks a built site as noindex, for the deploys that land on workers.dev.
 *
 * Every preview and the staging site are publicly reachable, and both carry
 * `public/resume.pdf` and whatever the design happens to look like that day.
 * An unfinished portfolio ranking for Jason's name mid-job-search is the cost
 * of letting a crawler in.
 *
 * `_headers` is generated here rather than committed to `public/`, because a
 * committed copy would ship to production too and quietly suppress the real
 * site. Cloudflare reads the file as configuration and never serves it.
 */
writeFileSync('dist/_headers', '/*\n  X-Robots-Tag: noindex, nofollow\n');
