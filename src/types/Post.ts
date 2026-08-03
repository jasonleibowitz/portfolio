export type BasePost = {
  slug: string;
  data: {
    title: string;
    pubDate: date;
    tags?: string[];
  };
};
