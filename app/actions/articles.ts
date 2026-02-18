'use server';

import { Article, TimeRange } from '@/types';
import { getFeeds, getReadArticles, markArticleAsRead as dbMarkAsRead, unmarkArticleAsRead as dbUnmarkAsRead, markMultipleArticlesAsRead as dbMarkMultipleAsRead } from '@/lib/db';
import { fetchAllFeeds, fetchArticleContent as rssFetchArticleContent } from '@/lib/rss';
import { filterByTimeRange, interleaveArticles } from '@/lib/utils';
import { FEED_MAX_CONSECUTIVE, STATS_WINDOW_DAYS } from '@/lib/config';

export async function fetchAllArticles(timeRange: TimeRange = '24h'): Promise<{ articles: Article[]; error?: string }> {
  try {
    const feeds = await getFeeds();

    if (feeds.length === 0) {
      return { articles: [] };
    }

    const articles = await fetchAllFeeds(feeds);

    // Filter by time range
    const filteredArticles = filterByTimeRange(articles, timeRange);

    // Apply smart interleaving to balance feed velocity
    const interleavedArticles = interleaveArticles(filteredArticles, FEED_MAX_CONSECUTIVE);

    return { articles: interleavedArticles };
  } catch (error) {
    console.error('Error fetching articles:', error);
    return { articles: [], error: 'Failed to load articles. Check your connection and try refreshing.' };
  }
}

export async function markAsRead(guid: string): Promise<{ success: boolean }> {
  try {
    await dbMarkAsRead(guid);
    return { success: true };
  } catch (error) {
    console.error('Error marking article as read:', error);
    return { success: false };
  }
}

export async function markAsUnread(guid: string): Promise<{ success: boolean }> {
  try {
    await dbUnmarkAsRead(guid);
    return { success: true };
  } catch (error) {
    console.error('Error marking article as unread:', error);
    return { success: false };
  }
}

export async function markAllAsRead(guids: string[]): Promise<{ success: boolean }> {
  try {
    await dbMarkMultipleAsRead(guids);
    return { success: true };
  } catch (error) {
    console.error('Error marking all articles as read:', error);
    return { success: false };
  }
}

export async function getReadArticlesList(): Promise<string[]> {
  try {
    const readSet = await getReadArticles();
    return Array.from(readSet);
  } catch (error) {
    console.error('Error getting read articles:', error);
    return [];
  }
}

export async function fetchArticleContent(feedUrl: string, articleGuid: string): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const content = await rssFetchArticleContent(feedUrl, articleGuid);
    return { success: true, content };
  } catch (error) {
    console.error('Error fetching article content:', error);
    return {
      success: false,
      error: 'Failed to fetch article content',
    };
  }
}

export interface FeedStats {
  feedUrl: string;
  totalArticles: number;
  readArticles: number;
  readRate: number;
  lastArticleDate: Date | null;
  articlesPerDay: number;
}

function computeStats(feedUrl: string, feedArticles: Article[], readSet: Set<string>): FeedStats {
  const totalArticles = feedArticles.length;
  const readArticles = feedArticles.filter(article => readSet.has(article.guid)).length;
  const readRate = totalArticles > 0 ? (readArticles / totalArticles) * 100 : 0;
  const lastArticleDate = feedArticles.length > 0
    ? feedArticles.reduce((latest, article) =>
        article.pubDate > latest ? article.pubDate : latest,
        feedArticles[0].pubDate
      )
    : null;
  return { feedUrl, totalArticles, readArticles, readRate, lastArticleDate, articlesPerDay: totalArticles / STATS_WINDOW_DAYS };
}

// Returns stats for every feed in a single fetch — avoids N+1 when the admin
// panel loads stats for multiple feeds.
export async function getAllFeedStatistics(): Promise<Record<string, FeedStats>> {
  try {
    const [fetchResult, readGuids] = await Promise.all([
      fetchAllArticles('7d'),
      getReadArticlesList(),
    ]);
    const allArticles = fetchResult.articles;

    const readSet = new Set(readGuids);

    // Group articles by feed URL in one pass
    const byFeed = new Map<string, Article[]>();
    for (const article of allArticles) {
      const bucket = byFeed.get(article.feedUrl);
      if (bucket) {
        bucket.push(article);
      } else {
        byFeed.set(article.feedUrl, [article]);
      }
    }

    const result: Record<string, FeedStats> = {};
    byFeed.forEach((articles, feedUrl) => {
      result[feedUrl] = computeStats(feedUrl, articles, readSet);
    });
    return result;
  } catch (error) {
    console.error('Error fetching all feed statistics:', error);
    return {};
  }
}

export async function getFeedStatistics(feedUrl: string): Promise<FeedStats> {
  try {
    const [result, readGuids] = await Promise.all([
      fetchAllArticles('7d'),
      getReadArticlesList(),
    ]);
    const feedArticles = result.articles.filter(article => article.feedUrl === feedUrl);
    return computeStats(feedUrl, feedArticles, new Set(readGuids));
  } catch (error) {
    console.error('Error fetching feed statistics:', error);
    return { feedUrl, totalArticles: 0, readArticles: 0, readRate: 0, lastArticleDate: null, articlesPerDay: 0 };
  }
}
