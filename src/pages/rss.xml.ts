import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPublished } from '@lib/content';

export async function GET(context: APIContext) {
  const posts = await getPublished('blog');

  return rss({
    title: "Jason Leibowitz's Blog",
    description: 'A blog about web development and other things.',
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
