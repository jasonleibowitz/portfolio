import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function get() {
  const posts = await getCollection('blog');

  return rss({
    title: "Jason Leibowitz's Blog",
    description: 'A blog about web development and other things.',
    site: 'https://leibowitz.me',
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.slug}`,
    })),
    customData: `<language>en-US</language>`,
  });
}
