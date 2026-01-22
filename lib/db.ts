import { kv } from '@vercel/kv';
import { Feed } from '@/types';

// Namespace prefix to avoid key collisions when sharing KV instance
const KV_PREFIX = process.env.KV_PREFIX || 'rss-flow';

const FEEDS_KEY = `${KV_PREFIX}:feeds:list`;
const READ_ARTICLES_KEY = `${KV_PREFIX}:articles:read`;

export async function getFeeds(): Promise<Feed[]> {
  try {
    const feedsJson = await kv.get<string>(FEEDS_KEY);
    if (!feedsJson) {
      return [];
    }
    return JSON.parse(feedsJson);
  } catch (error) {
    console.error('Error getting feeds:', error);
    return [];
  }
}

export async function saveFeeds(feeds: Feed[]): Promise<void> {
  try {
    await kv.set(FEEDS_KEY, JSON.stringify(feeds));
  } catch (error) {
    console.error('Error saving feeds:', error);
    throw new Error('Failed to save feeds');
  }
}

export async function addFeed(feed: Feed): Promise<void> {
  const feeds = await getFeeds();
  feeds.push(feed);
  await saveFeeds(feeds);
}

export async function deleteFeed(id: string): Promise<void> {
  const feeds = await getFeeds();
  const filteredFeeds = feeds.filter(feed => feed.id !== id);
  await saveFeeds(filteredFeeds);
}

export async function markArticleAsRead(guid: string): Promise<void> {
  try {
    await kv.sadd(READ_ARTICLES_KEY, guid);
  } catch (error) {
    console.error('Error marking article as read:', error);
    throw new Error('Failed to mark article as read');
  }
}

export async function getReadArticles(): Promise<Set<string>> {
  try {
    const readGuids = await kv.smembers(READ_ARTICLES_KEY);
    return new Set(readGuids || []);
  } catch (error) {
    console.error('Error getting read articles:', error);
    return new Set();
  }
}
