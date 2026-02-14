import Parser from 'rss-parser';
import { Article, Feed } from '@/types';
import { extractFullArticle } from './extract';
import { RSS_PARSER_TIMEOUT, RSS_EXCERPT_THRESHOLD, RSS_CONTENT_MIN_LENGTH } from './config';
import { sanitizeArticleHtml } from './sanitize';

const parser = new Parser({
  timeout: RSS_PARSER_TIMEOUT,
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

    // Get content from RSS
    const rssContent = item.content || item.summary || '';
    const contentSnippet = item.contentSnippet || '';

    // Check if this is likely just an excerpt by looking at the text content length
    // contentSnippet is the text-only version, so it's a better indicator
    const isLikelyExcerpt = contentSnippet.length < RSS_EXCERPT_THRESHOLD;

    // If content snippet suggests this is an excerpt, try to extract the full article
    if (isLikelyExcerpt && item.link) {
      const extractedContent = await extractFullArticle(item.link);

      if (extractedContent) {
        return sanitizeArticleHtml(extractedContent);
      }
    }

    // If we have substantial RSS content (and didn't extract), use it
    if (rssContent && rssContent.length > RSS_CONTENT_MIN_LENGTH) {
      return sanitizeArticleHtml(rssContent);
    }

    // Fallback to whatever RSS provided
    return sanitizeArticleHtml(rssContent || contentSnippet);
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
