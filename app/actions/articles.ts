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
