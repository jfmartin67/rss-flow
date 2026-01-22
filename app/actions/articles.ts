'use server';

import { Article, TimeRange } from '@/types';
import { getFeeds, getReadArticles, markArticleAsRead as dbMarkAsRead } from '@/lib/db';
import { fetchAllFeeds } from '@/lib/rss';
import { filterByTimeRange } from '@/lib/utils';

export async function fetchAllArticles(timeRange: TimeRange = '24h'): Promise<Article[]> {
  try {
    const feeds = await getFeeds();

    if (feeds.length === 0) {
      return [];
    }

    const articles = await fetchAllFeeds(feeds);

    // Filter by time range
    const filteredArticles = filterByTimeRange(articles, timeRange);

    return filteredArticles;
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

export async function getReadArticlesList(): Promise<string[]> {
  try {
    const readSet = await getReadArticles();
    return Array.from(readSet);
  } catch (error) {
    console.error('Error getting read articles:', error);
    return [];
  }
}
