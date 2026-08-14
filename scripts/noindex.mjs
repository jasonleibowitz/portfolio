import { writeFileSync } from 'node:fs';

/**
 * A pull request preview is public and carries `public/resume.pdf`, so nothing
 * should index it. `_headers` is generated rather than committed to `public/`,
 * where a copy would ship to production and suppress the real site.
 */
writeFileSync('dist/_headers', '/*\n  X-Robots-Tag: noindex, nofollow\n');
