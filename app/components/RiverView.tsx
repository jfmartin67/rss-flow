'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Article, TimeRange, ContentLines } from '@/types';
import ArticleItem from './ArticleItem';
import { fetchAllArticles } from '@/app/actions/articles';
import { RefreshCw, Settings, Sun, Moon, Menu, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import HamburgerMenu from './HamburgerMenu';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [, setCurrentTime] = useState<Date>(new Date());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const { theme, toggleTheme } = useTheme();
  const articlesContainerRef = useRef<HTMLDivElement>(null);
  const previousArticleCountRef = useRef(initialArticles.length);

  // Update the current time every minute to refresh the "last updated" display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Smooth scroll animation when new articles are added
  useEffect(() => {
    const container = articlesContainerRef.current;
    if (!container) return;

    const newArticleCount = articles.length;
    const previousCount = previousArticleCountRef.current;

    // Only animate if we have new articles (more than before)
    if (newArticleCount > previousCount && previousCount > 0) {
      // Wait for DOM to update
      requestAnimationFrame(() => {
        const firstArticle = container.firstElementChild as HTMLElement;
        if (firstArticle) {
          // Calculate the height of new content
          const newArticlesCount = newArticleCount - previousCount;
          let totalHeight = 0;

          for (let i = 0; i < Math.min(newArticlesCount, container.children.length); i++) {
            const child = container.children[i] as HTMLElement;
            totalHeight += child.offsetHeight;
          }

          // Smoothly scroll down to reveal new content
          window.scrollTo({
            top: window.scrollY + totalHeight,
            behavior: 'smooth'
          });
        }
      });
    }

    previousArticleCountRef.current = newArticleCount;
  }, [articles]);

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
      setLastRefreshTime(new Date());
    });
  };

  const formatRefreshTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    // Show time for today, or date for older
    const today = now.toDateString() === date.toDateString();
    if (today) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  // Extract unique categories from articles
  const getUniqueCategories = (): { category: string; color: string }[] => {
    const categoryMap = new Map<string, string>();
    articles.forEach(article => {
      if (article.category && !categoryMap.has(article.category)) {
        categoryMap.set(article.category, article.categoryColor);
      }
    });
    return Array.from(categoryMap.entries()).map(([category, color]) => ({ category, color }));
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleClearCategories = () => {
    setSelectedCategories(new Set());
  };

  // Filter articles by selected categories
  const filteredArticles = selectedCategories.size === 0
    ? articles
    : articles.filter(article => selectedCategories.has(article.category));

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <header className="sticky top-0 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-50 shadow-sm">
        <div className="w-full px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <Image
                src="/avatar.png"
                alt="Avatar"
                width={40}
                height={40}
                className="rounded-full"
              />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 font-[family-name:var(--font-red-hat-display)]">
                RSS Flow
              </h1>
            </div>

            <div className="hidden md:flex items-center gap-4 flex-1 justify-center">
              <div className="flex flex-col items-center gap-1">
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
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
                  Time Range
                </div>
              </div>

              <div className="flex flex-col items-center gap-1">
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
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
                  Content Preview
                </div>
              </div>
            </div>

            {/* Hamburger button - mobile only */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden p-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
              title="Menu"
              aria-label="Open menu"
              aria-expanded={isMenuOpen}
            >
              <Menu size={18} />
            </button>

            <div className="hidden md:flex gap-2 flex-shrink-0">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`p-2 rounded transition-colors ${
                  isFilterOpen || selectedCategories.size > 0
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
                title="Filter by Category"
              >
                <Filter size={18} />
              </button>
              <button
                onClick={handleRefresh}
                disabled={isPending}
                className="p-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={18} className={isPending ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <a
                href="/admin"
                className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                title="Admin"
              >
                <Settings size={18} />
              </a>
            </div>
          </div>
          {/* Last Updated Timestamp */}
          <div className="mt-2 text-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {formatRefreshTime(lastRefreshTime)}
            </span>
          </div>
        </div>
      </header>

      {/* Collapsible Filter Section - Desktop only */}
      {isFilterOpen && (
        <div className="hidden md:block w-full bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="w-full px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Filter by Category
              </h3>
              {selectedCategories.size > 0 && (
                <button
                  onClick={handleClearCategories}
                  className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {getUniqueCategories().map(({ category, color }) => (
                <button
                  key={category}
                  onClick={() => handleCategoryToggle(category)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-bold transition-all
                    ${selectedCategories.has(category)
                      ? 'text-white shadow-md'
                      : 'border-2'
                    }
                  `}
                  style={{
                    backgroundColor: selectedCategories.has(category) ? color : 'transparent',
                    borderColor: color,
                    color: selectedCategories.has(category) ? 'white' : color,
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hamburger Menu */}
      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)}>
        <div className="space-y-6">
          {/* Time Range Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Time Range
            </h3>
            <div className="flex flex-col gap-2">
              {(['24h', '3d', '7d'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    handleTimeRangeChange(range);
                    setIsMenuOpen(false);
                  }}
                  className={`
                    px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${timeRange === range
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {range === '24h' ? '24 Hours' : range === '3d' ? '3 Days' : '7 Days'}
                </button>
              ))}
            </div>
          </div>

          {/* Content Preview Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Content Preview
            </h3>
            <div className="flex flex-col gap-2">
              {([0, 1, 2, 3] as ContentLines[]).map((lines) => (
                <button
                  key={lines}
                  onClick={() => {
                    handleContentLinesChange(lines);
                    setIsMenuOpen(false);
                  }}
                  className={`
                    px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${contentLines === lines
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {lines === 0 ? 'None' : `${lines} Line${lines > 1 ? 's' : ''}`}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Section - Landscape only */}
          <div className="landscape-only">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Filter by Category
              </h3>
              {selectedCategories.size > 0 && (
                <button
                  onClick={handleClearCategories}
                  className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {getUniqueCategories().map(({ category, color }) => (
                <button
                  key={category}
                  onClick={() => handleCategoryToggle(category)}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-bold transition-all
                    ${selectedCategories.has(category)
                      ? 'text-white'
                      : 'border-2'
                    }
                  `}
                  style={{
                    backgroundColor: selectedCategories.has(category) ? color : 'transparent',
                    borderColor: color,
                    color: selectedCategories.has(category) ? 'white' : color,
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Actions Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Actions
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  handleRefresh();
                  setIsMenuOpen(false);
                }}
                disabled={isPending}
                className="px-4 py-3 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} className={isPending ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={toggleTheme}
                className="px-4 py-3 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              </button>
              <a
                href="/admin"
                className="px-4 py-3 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <Settings size={18} />
                Settings
              </a>
            </div>
          </div>
        </div>
      </HamburgerMenu>

      <main className="w-full">
        {articles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No articles found. Add some feeds in the <a href="/admin" className="text-orange-500 hover:underline">admin panel</a>.
            </p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No articles match the selected categories.
            </p>
          </div>
        ) : (
          <div ref={articlesContainerRef}>
            {filteredArticles.map((article) => (
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
