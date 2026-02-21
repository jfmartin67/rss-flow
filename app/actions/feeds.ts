'use server';

import { revalidatePath } from 'next/cache';
import { Feed } from '@/types';
import { getFeeds, addFeed as dbAddFeed, updateFeed as dbUpdateFeed, deleteFeed as dbDeleteFeed } from '@/lib/db';
import { fetchFeedMetadata } from '@/lib/rss';

export async function addFeed(url: string, category: string, color: string, view: string = 'Default'): Promise<{ success: boolean; error?: string }> {
  try {
    // Reject duplicate URLs before doing any network work
    const existingFeeds = await getFeeds();
    if (existingFeeds.some(f => f.url === url)) {
      return { success: false, error: 'A feed with this URL already exists' };
    }

    // Fetch feed metadata to get the feed name
    const metadata = await fetchFeedMetadata(url);

    const newFeed: Feed = {
      id: `feed-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      url,
      category,
      color,
      name: metadata.name,
      view: view || 'Default',
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

export async function updateFeed(id: string, updates: { name?: string; category?: string; color?: string; view?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    await dbUpdateFeed(id, updates);
    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true };
  } catch (error) {
    console.error('Error updating feed:', error);
    return {
      success: false,
      error: 'Failed to update feed',
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
  const feeds = await getFeeds();
  // Sort feeds by category alphabetically, then by name
  return feeds.sort((a, b) => {
    const categoryA = a.category.toLowerCase();
    const categoryB = b.category.toLowerCase();
    if (categoryA < categoryB) return -1;
    if (categoryA > categoryB) return 1;
    // If categories are the same, sort by name
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}
