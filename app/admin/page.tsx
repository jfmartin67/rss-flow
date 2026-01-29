import FeedManager from '../components/FeedManager';
import { getAllFeeds } from '../actions/feeds';
import { getFeedStatistics, type FeedStats } from '../actions/articles';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const feeds = await getAllFeeds();

  // Fetch statistics for all feeds
  const statsPromises = feeds.map(feed => getFeedStatistics(feed.url));
  const stats = await Promise.all(statsPromises);

  // Create a map for easy lookup
  const statsMap = new Map<string, FeedStats>();
  stats.forEach(stat => statsMap.set(stat.feedUrl, stat));

  return <FeedManager initialFeeds={feeds} feedStats={statsMap} />;
}
