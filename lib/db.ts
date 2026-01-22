import Redis from 'ioredis';
import { Feed } from '@/types';

// Namespace prefix to avoid key collisions when sharing KV instance
const KV_PREFIX = process.env.KV_PREFIX || 'rss-flow';

const FEEDS_KEY = `${KV_PREFIX}:feeds:list`;
const READ_ARTICLES_KEY = `${KV_PREFIX}:articles:read`;

// Create Redis client using KV_URL (direct Redis connection)
// Connection string format: redis://user:password@host:port
const redis = new Redis(process.env.KV_URL || process.env.REDIS_URL || '', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

// Ensure connection is established
redis.connect().catch(err => {
  console.error('Redis connection error:', err);
});

export async function getFeeds(): Promise<Feed[]> {
  try {
    const feedsJson = await redis.get(FEEDS_KEY);
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
    await redis.set(FEEDS_KEY, JSON.stringify(feeds));
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

export async function updateFeed(id: string, updates: Partial<Feed>): Promise<void> {
  const feeds = await getFeeds();
  const feedIndex = feeds.findIndex(feed => feed.id === id);
  if (feedIndex === -1) {
    throw new Error('Feed not found');
  }
  feeds[feedIndex] = { ...feeds[feedIndex], ...updates };
  await saveFeeds(feeds);
}

export async function deleteFeed(id: string): Promise<void> {
  const feeds = await getFeeds();
  const filteredFeeds = feeds.filter(feed => feed.id !== id);
  await saveFeeds(filteredFeeds);
}

export async function markArticleAsRead(guid: string): Promise<void> {
  try {
    await redis.sadd(READ_ARTICLES_KEY, guid);
  } catch (error) {
    console.error('Error marking article as read:', error);
    throw new Error('Failed to mark article as read');
  }
}

export async function getReadArticles(): Promise<Set<string>> {
  try {
    const readGuids = await redis.smembers(READ_ARTICLES_KEY);
    return new Set(readGuids || []);
  } catch (error) {
    console.error('Error getting read articles:', error);
    return new Set();
  }
}
