export interface Feed {
  id: string;
  url: string;
  category: string;
  color: string;
  name: string;
}

export interface Article {
  guid: string;
  title: string;
  link: string;
  pubDate: Date;
  content: string;
  feedName: string;
  category: string;
  categoryColor: string;
}

export type TimeRange = '24h' | '3d' | '7d';

export type ContentLines = 1 | 2 | 3;
