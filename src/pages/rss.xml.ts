import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPublished } from '@lib/content';
import { FEED_TITLE, WRITING } from '@lib/site';

export async function GET(context: APIContext) {
  const posts = await getPublished('blog');

  return rss({
    title: FEED_TITLE,
    description: WRITING.description,
    site: context.site ?? 'https://leibowitz.me',
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/writing/${post.id}/`,
    })),
    customData: `<language>en-US</language>`,
  });
}
