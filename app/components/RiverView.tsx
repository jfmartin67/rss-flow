'use client';

import { useState, useTransition } from 'react';
import { Article, TimeRange, ContentLines } from '@/types';
import ArticleItem from './ArticleItem';
import { fetchAllArticles } from '@/app/actions/articles';

interface RiverViewProps {
  initialArticles: Article[];
  initialReadGuids: string[];
}

export default function RiverView({ initialArticles, initialReadGuids }: RiverViewProps) {
  const [articles, setArticles] = useState(initialArticles);
  const [readGuids, setReadGuids] = useState<Set<string>>(new Set(initialReadGuids));
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [contentLines, setContentLines] = useState<ContentLines>(0);
  const [isPending, startTransition] = useTransition();

  const handleTimeRangeChange = async (range: TimeRange) => {
    setTimeRange(range);
    startTransition(async () => {
      const newArticles = await fetchAllArticles(range);
      setArticles(newArticles);
    });
  };

  const handleContentLinesChange = (lines: ContentLines) => {
    setContentLines(lines);
  };

  const handleMarkAsRead = (guid: string) => {
    setReadGuids(prev => new Set(prev).add(guid));
  };

  const handleRefresh = async () => {
    startTransition(async () => {
      const newArticles = await fetchAllArticles(timeRange);
      setArticles(newArticles);
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <header className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              RSS Flow
            </h1>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={isPending}
                className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Refreshing...' : 'Refresh'}
              </button>
              <a
                href="/admin"
                className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Admin
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-2">
                Time Range
              </label>
              <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                {(['24h', '3d', '7d'] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => handleTimeRangeChange(range)}
                    className={`
                      px-4 py-2 text-sm font-medium transition-colors
                      ${timeRange === range
                        ? 'bg-orange-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {range === '24h' ? '24 Hours' : range === '3d' ? '3 Days' : '7 Days'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-2">
                Content Preview
              </label>
              <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                {([0, 1, 2, 3] as ContentLines[]).map((lines) => (
                  <button
                    key={lines}
                    onClick={() => handleContentLinesChange(lines)}
                    className={`
                      px-4 py-2 text-sm font-medium transition-colors
                      ${contentLines === lines
                        ? 'bg-orange-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {lines === 0 ? 'None' : lines}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        {articles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No articles found. Add some feeds in the <a href="/admin" className="text-orange-500 hover:underline">admin panel</a>.
            </p>
          </div>
        ) : (
          <div>
            {articles.map((article) => (
              <ArticleItem
                key={article.guid}
                article={article}
                isRead={readGuids.has(article.guid)}
                contentLines={contentLines}
                onRead={handleMarkAsRead}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
