import FeedManager from '../components/FeedManager';
import { getAllFeeds } from '../actions/feeds';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const feeds = await getAllFeeds();

  return <FeedManager initialFeeds={feeds} />;
}
