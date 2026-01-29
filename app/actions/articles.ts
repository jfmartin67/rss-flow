'use server';

import { Article, TimeRange } from '@/types';
import { getFeeds, getReadArticles, markArticleAsRead as dbMarkAsRead, markMultipleArticlesAsRead as dbMarkMultipleAsRead } from '@/lib/db';
import { fetchAllFeeds, fetchArticleContent as rssFetchArticleContent } from '@/lib/rss';
import { filterByTimeRange, interleaveArticles } from '@/lib/utils';

export async function fetchAllArticles(timeRange: TimeRange = '24h'): Promise<Article[]> {
  try {
    const feeds = await getFeeds();

    if (feeds.length === 0) {
      return [];
    }

    const articles = await fetchAllFeeds(feeds);

    // Filter by time range
    const filteredArticles = filterByTimeRange(articles, timeRange);

    // Apply smart interleaving to balance feed velocity
    const interleavedArticles = interleaveArticles(filteredArticles, 2);

    return interleavedArticles;
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
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

export async function getFeedStatistics(feedUrl: string): Promise<FeedStats> {
  try {
    // Fetch all articles from the past 30 days for this feed
    const allArticles = await fetchAllArticles('7d');
    const feedArticles = allArticles.filter(article => article.feedUrl === feedUrl);

    // Get read articles
    const readGuids = await getReadArticlesList();
    const readSet = new Set(readGuids);

    const readArticles = feedArticles.filter(article => readSet.has(article.guid)).length;
    const totalArticles = feedArticles.length;
    const readRate = totalArticles > 0 ? (readArticles / totalArticles) * 100 : 0;

    // Calculate last article date
    const lastArticleDate = feedArticles.length > 0
      ? feedArticles.reduce((latest, article) =>
          article.pubDate > latest ? article.pubDate : latest,
          feedArticles[0].pubDate
        )
      : null;

    // Calculate articles per day (based on 7 day window)
    const articlesPerDay = totalArticles / 7;

    return {
      feedUrl,
      totalArticles,
      readArticles,
      readRate,
      lastArticleDate,
      articlesPerDay,
    };
  } catch (error) {
    console.error('Error fetching feed statistics:', error);
    return {
      feedUrl,
      totalArticles: 0,
      readArticles: 0,
      readRate: 0,
      lastArticleDate: null,
      articlesPerDay: 0,
    };
  }
}
