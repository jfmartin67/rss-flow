'use client';

import { useState, useTransition } from 'react';
import { Feed } from '@/types';
import { addFeed, deleteFeed } from '@/app/actions/feeds';
import { Home, Plus, Trash2 } from 'lucide-react';

interface FeedManagerProps {
  initialFeeds: Feed[];
}

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
];

export default function FeedManager({ initialFeeds }: FeedManagerProps) {
  const [feeds, setFeeds] = useState(initialFeeds);
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url || !category) {
      setError('URL and category are required');
      return;
    }

    startTransition(async () => {
      const result = await addFeed(url, category, color);

      if (result.success) {
        setUrl('');
        setCategory('');
        setColor(DEFAULT_COLORS[0]);
        // Refresh the page to get updated feeds
        window.location.reload();
      } else {
        setError(result.error || 'Failed to add feed');
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feed?')) {
      return;
    }

    startTransition(async () => {
      const result = await deleteFeed(id);

      if (result.success) {
        setFeeds(feeds.filter(feed => feed.id !== id));
      } else {
        setError(result.error || 'Failed to delete feed');
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Feed Management
          </h1>
          <a
            href="/"
            className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            title="Back to Feed"
          >
            <Home size={18} />
          </a>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Add New Feed
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                RSS Feed URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/feed.xml"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <input
                type="text"
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Tech, News, Sports"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === c ? 'border-gray-900 dark:border-gray-100 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full p-3 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center"
              title={isPending ? 'Adding Feed...' : 'Add Feed'}
            >
              <Plus size={20} />
            </button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Current Feeds ({feeds.length})
        </h2>

        {feeds.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
            No feeds yet. Add your first feed above.
          </p>
        ) : (
          <div className="space-y-2">
            {feeds.map((feed) => (
              <div
                key={feed.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: feed.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {feed.name}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {feed.url}
                    </p>
                  </div>
                  <span
                    className="px-2 py-1 rounded text-xs font-medium flex-shrink-0"
                    style={{
                      backgroundColor: `${feed.color}20`,
                      color: feed.color,
                    }}
                  >
                    {feed.category}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(feed.id)}
                  disabled={isPending}
                  className="ml-4 p-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
