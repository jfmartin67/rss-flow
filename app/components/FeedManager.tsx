'use client';

import { useState, useTransition } from 'react';
import { Feed } from '@/types';
import { addFeed, updateFeed, deleteFeed } from '@/app/actions/feeds';
import { type FeedStats } from '@/app/actions/articles';
import { Home, Plus, Trash2, Sun, Moon, Edit2, Check, X, ChevronDown, ChevronUp, TrendingUp, Eye, Calendar, Activity } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface FeedManagerProps {
  initialFeeds: Feed[];
  feedStats: Map<string, FeedStats>;
}

const DEFAULT_COLORS = [
  '#4b5563', // dark grey
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

// Sort feeds by category alphabetically
const sortFeedsByCategory = (feedsToSort: Feed[]): Feed[] => {
  return [...feedsToSort].sort((a, b) => {
    const categoryA = a.category.toLowerCase();
    const categoryB = b.category.toLowerCase();
    if (categoryA < categoryB) return -1;
    if (categoryA > categoryB) return 1;
    // If categories are the same, sort by name
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
};

export default function FeedManager({ initialFeeds, feedStats }: FeedManagerProps) {
  const [feeds, setFeeds] = useState(sortFeedsByCategory(initialFeeds));
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const { theme, toggleTheme } = useTheme();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editColor, setEditColor] = useState('');
  const [expandedStats, setExpandedStats] = useState<Set<string>>(new Set());

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

  const handleEdit = (feed: Feed) => {
    setEditingId(feed.id);
    setEditName(feed.name);
    setEditCategory(feed.category);
    setEditColor(feed.color);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditCategory('');
    setEditColor('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim() || !editCategory.trim()) {
      setError('Name and category are required');
      return;
    }

    startTransition(async () => {
      const result = await updateFeed(id, {
        name: editName.trim(),
        category: editCategory.trim(),
        color: editColor,
      });

      if (result.success) {
        const updatedFeeds = feeds.map(feed =>
          feed.id === id
            ? { ...feed, name: editName.trim(), category: editCategory.trim(), color: editColor }
            : feed
        );
        // Re-sort feeds after update
        setFeeds(sortFeedsByCategory(updatedFeeds));
        setEditingId(null);
        setEditName('');
        setEditCategory('');
        setEditColor('');
      } else {
        setError(result.error || 'Failed to update feed');
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

  const toggleStats = (feedId: string) => {
    setExpandedStats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(feedId)) {
        newSet.delete(feedId);
      } else {
        newSet.add(feedId);
      }
      return newSet;
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Feed Management
          </h1>
          <div className="flex gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <a
              href="/"
              className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              title="Back to Feed"
            >
              <Home size={18} />
            </a>
          </div>
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
            {feeds.map((feed) => {
              const stats = feedStats.get(feed.url);
              const isStatsExpanded = expandedStats.has(feed.id);

              return (
                <div
                  key={feed.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: feed.color }}
                      />
                      <div className="flex-1 min-w-0">
                        {editingId === feed.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="Feed name"
                        />
                        <input
                          type="text"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="Category"
                        />
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tag Color
                          </label>
                          <div className="flex gap-1 flex-wrap">
                            {DEFAULT_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setEditColor(c)}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${
                                  editColor === c ? 'border-gray-900 dark:border-gray-100 scale-110' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: c }}
                                title={c}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {feed.name}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {feed.url}
                        </p>
                      </>
                    )}
                  </div>
                  {editingId !== feed.id && (
                    <span
                      className="px-2 py-1 rounded text-xs font-medium flex-shrink-0"
                      style={{
                        backgroundColor: `${feed.color}20`,
                        color: feed.color,
                      }}
                    >
                      {feed.category}
                    </span>
                  )}
                </div>
                    <div className="ml-4 flex gap-2">
                      {editingId === feed.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(feed.id)}
                            disabled={isPending}
                            className="p-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
                            title="Save"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isPending}
                            className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleStats(feed.id)}
                            className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                            title="Statistics"
                          >
                            {isStatsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <button
                            onClick={() => handleEdit(feed)}
                            disabled={isPending}
                            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(feed.id)}
                            disabled={isPending}
                            className="p-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Statistics Section */}
                  {isStatsExpanded && stats && (
                    <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Statistics (Last 7 Days)
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-start gap-2">
                          <TrendingUp size={16} className="text-blue-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Total Articles</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.totalArticles}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Eye size={16} className="text-green-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Read Rate</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {stats.readRate.toFixed(0)}%
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {stats.readArticles}/{stats.totalArticles}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Calendar size={16} className="text-orange-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Last Article</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {formatDate(stats.lastArticleDate)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Activity size={16} className="text-purple-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Per Day</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {stats.articlesPerDay.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
