'use client';

import { useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BarChart2 } from 'lucide-react';
import { Article, TimeRange } from '@/types';

interface StatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
  readGuids: Set<string>;
  timeRange: TimeRange;
  selectedView: string;
}

export default function StatsPanel({ isOpen, onClose, articles, readGuids, timeRange, selectedView }: StatsPanelProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const viewArticles = useMemo(
    () => articles.filter(a => selectedView === 'All' || a.view === selectedView),
    [articles, selectedView]
  );

  const stats = useMemo(() => {
    const total = viewArticles.length;
    const read = viewArticles.filter(a => readGuids.has(a.guid)).length;
    const unread = total - read;
    const readRate = total > 0 ? Math.round((read / total) * 100) : 0;
    return { total, read, unread, readRate };
  }, [viewArticles, readGuids]);

  const dailyData = useMemo(() => {
    const days = timeRange === '24h' ? 1 : timeRange === '3d' ? 3 : 7;
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (days - 1 - i));
      const next = new Date(date);
      next.setDate(next.getDate() + 1);

      const dayArticles = viewArticles.filter(a => {
        const pub = new Date(a.pubDate);
        return pub >= date && pub < next;
      });
      const daysAgo = days - 1 - i;
      const label = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yest.' : date.toLocaleDateString('en-US', { weekday: 'short' });

      return {
        label,
        total: dayArticles.length,
        read: dayArticles.filter(a => readGuids.has(a.guid)).length,
      };
    });
  }, [viewArticles, readGuids, timeRange]);

  const maxDayTotal = Math.max(...dailyData.map(d => d.total), 1);

  const topFeeds = useMemo(() => {
    const map = new Map<string, { name: string; total: number; read: number }>();
    viewArticles.forEach(a => {
      const e = map.get(a.feedUrl) ?? { name: a.feedName, total: 0, read: 0 };
      e.total++;
      if (readGuids.has(a.guid)) e.read++;
      map.set(a.feedUrl, e);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [viewArticles, readGuids]);

  const topCategories = useMemo(() => {
    const map = new Map<string, { name: string; color: string; total: number; read: number }>();
    viewArticles.forEach(a => {
      const e = map.get(a.category) ?? { name: a.category, color: a.categoryColor, total: 0, read: 0 };
      e.total++;
      if (readGuids.has(a.guid)) e.read++;
      map.set(a.category, e);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [viewArticles, readGuids]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 md:bg-black/0 z-50" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reading stats"
        className="fixed z-50 bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden inset-4 rounded-lg md:top-0 md:bottom-0 md:right-0 md:left-auto md:w-[420px] md:rounded-r-none md:rounded-l-xl border-l border-gray-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Reading Stats</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">· {timeRange}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label="Close stats"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

          {/* Headline tiles */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Read', value: stats.read, className: 'text-orange-500' },
              { label: 'Unread', value: stats.unread, className: 'text-gray-500 dark:text-gray-400' },
              { label: 'Read rate', value: `${stats.readRate}%`, className: 'text-green-500' },
            ].map(({ label, value, className }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className={`text-2xl font-bold tabular-nums ${className}`}>{value}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Daily activity chart — only shown for 3d and 7d */}
          {dailyData.length > 1 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Activity</h3>
              <div className="flex items-end gap-1.5" style={{ height: '96px' }}>
                {dailyData.map(({ label, total, read }) => (
                  <div key={label} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                      {total > 0 ? (
                        <div
                          className="w-full rounded-t overflow-hidden"
                          style={{ height: `${Math.max((total / maxDayTotal) * 80, 4)}px` }}
                        >
                          <div className="w-full h-full flex flex-col-reverse">
                            <div
                              className="w-full bg-orange-400 flex-shrink-0"
                              style={{ height: `${(read / total) * 100}%` }}
                            />
                            <div className="w-full bg-gray-200 dark:bg-gray-600 flex-1" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full rounded h-1 bg-gray-100 dark:bg-gray-800" />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">{label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                  <span className="w-2 h-2 rounded-sm bg-orange-400 inline-block" /> Read
                </span>
                <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                  <span className="w-2 h-2 rounded-sm bg-gray-200 dark:bg-gray-600 inline-block" /> Unread
                </span>
              </div>
            </div>
          )}

          {/* Top feeds */}
          {topFeeds.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Top Feeds</h3>
              <div className="space-y-3">
                {topFeeds.map(({ name, total, read }) => (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{name}</span>
                      <span className="text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">{read}/{total}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full"
                        style={{ width: `${total > 0 ? (read / total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {topCategories.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Categories</h3>
              <div className="space-y-3">
                {topCategories.map(({ name, color, total, read }) => (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-bold truncate" style={{ color }}>{name}</span>
                      <span className="text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">{read}/{total}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${color}25` }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${total > 0 ? (read / total) * 100 : 0}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>,
    document.body
  );
}
