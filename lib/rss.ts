import Parser from 'rss-parser';
import { Article, Feed } from '@/types';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'RSS-Flow/1.0',
  },
});

export interface FeedMetadata {
  name: string;
  description?: string;
}

export async function fetchFeedMetadata(url: string): Promise<FeedMetadata> {
  try {
    const feed = await parser.parseURL(url);
    return {
      name: feed.title || url,
      description: feed.description,
    };
  } catch (error) {
    console.error(`Error fetching feed metadata from ${url}:`, error);
    throw new Error(`Failed to fetch feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function fetchFeedArticles(feed: Feed): Promise<Article[]> {
  try {
    const parsedFeed = await parser.parseURL(feed.url);

    if (!parsedFeed.items) {
      return [];
    }

    return parsedFeed.items.map(item => ({
      guid: item.guid || item.link || item.title || `${feed.id}-${Date.now()}`,
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      // Always include contentSnippet for preview, but not full content
      content: item.contentSnippet || '',
      feedName: feed.name,
      feedUrl: feed.url,
      category: feed.category,
      categoryColor: feed.color,
    }));
  } catch (error) {
    console.error(`Error fetching articles from ${feed.url}:`, error);
    return [];
  }
}

export async function fetchArticleContent(feedUrl: string, articleGuid: string): Promise<string> {
  try {
    const parsedFeed = await parser.parseURL(feedUrl);

    if (!parsedFeed.items) {
      return '';
    }

    const item = parsedFeed.items.find(
      item => (item.guid || item.link || item.title) === articleGuid
    );

    if (!item) {
      return '';
    }

    return item.contentSnippet || item.content || item.summary || '';
  } catch (error) {
    console.error(`Error fetching article content from ${feedUrl}:`, error);
    return '';
  }
}

export async function fetchAllFeeds(feeds: Feed[]): Promise<Article[]> {
  const articlePromises = feeds.map(feed => fetchFeedArticles(feed));
  const articleArrays = await Promise.all(articlePromises);

  const allArticles = articleArrays.flat();

  // Sort by publication date, newest first
  allArticles.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return allArticles;
}
