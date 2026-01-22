'use server';

import { revalidatePath } from 'next/cache';
import { Feed } from '@/types';
import { getFeeds, addFeed as dbAddFeed, deleteFeed as dbDeleteFeed } from '@/lib/db';
import { fetchFeedMetadata } from '@/lib/rss';

export async function addFeed(url: string, category: string, color: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch feed metadata to get the feed name
    const metadata = await fetchFeedMetadata(url);

    const newFeed: Feed = {
      id: `feed-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      url,
      category,
      color,
      name: metadata.name,
    };

    await dbAddFeed(newFeed);
    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true };
  } catch (error) {
    console.error('Error adding feed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add feed',
    };
  }
}

export async function deleteFeed(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await dbDeleteFeed(id);
    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true };
  } catch (error) {
    console.error('Error deleting feed:', error);
    return {
      success: false,
      error: 'Failed to delete feed',
    };
  }
}

export async function getAllFeeds(): Promise<Feed[]> {
  return await getFeeds();
}
