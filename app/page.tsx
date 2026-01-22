import RiverView from './components/RiverView';
import { fetchAllArticles, getReadArticlesList } from './actions/articles';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const articles = await fetchAllArticles('24h');
  const readGuids = await getReadArticlesList();

  return <RiverView initialArticles={articles} initialReadGuids={readGuids} />;
}
