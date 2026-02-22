'use client';

import { useState, useTransition, useEffect, useRef, useCallback, useMemo } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import Image from 'next/image';
import { Article, TimeRange, ContentLines } from '@/types';
import ArticleItem from './ArticleItem';
import ArticleModal from './ArticleModal';
import DigestPanel from './DigestPanel';
import { fetchAllArticles, markAllAsRead, getReadArticlesList, fetchArticleContent, markAsRead } from '@/app/actions/articles';
import { RefreshCw, Settings, Sun, Moon, Menu, Filter, ChevronDown, ChevronUp, CheckCheck, EyeOff, Eye, Download } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import HamburgerMenu from './HamburgerMenu';
import LoadingSkeleton from './LoadingSkeleton';
import {
  PULL_THRESHOLD, INDICATOR_HEIGHT, ARC_RADIUS,
  SPRING_STIFFNESS_BOUNCE, SPRING_STIFFNESS_SNAP, SPRING_DAMPING_BOUNCE, SPRING_DAMPING_SNAP,
  VIRTUAL_ITEM_HEIGHT, VIRTUAL_OVERSCAN,
  FEED_VELOCITY_THRESHOLDS,
  AUTO_REFRESH_INTERVALS, type AutoRefreshInterval,
} from '@/lib/config';

const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS; // ≈ 56.5

export default function RiverView() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [readGuids, setReadGuids] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [contentLines, setContentLines] = useState<ContentLines>(0);
  const [isPending, startTransition] = useTransition();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [, setCurrentTime] = useState<Date>(new Date());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedView, setSelectedView] = useState<string>('All');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [hideReadArticles, setHideReadArticles] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<AutoRefreshInterval>(0);
  const [pendingArticles, setPendingArticles] = useState<Article[] | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isDigestOpen, setIsDigestOpen] = useState(false);
  const [digestOpenedArticle, setDigestOpenedArticle] = useState<Article | null>(null);
  const [digestOpenedContent, setDigestOpenedContent] = useState<string | null>(null);
  const [isDigestArticleLoading, setIsDigestArticleLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const listRef = useRef<HTMLDivElement>(null);
  const currentArticleGuidsRef = useRef<Set<string>>(new Set());

  // Pull-to-refresh — phase drives CSS class changes only; distance is raw DOM
  const [pullPhase, setPullPhase] = useState<'idle' | 'pulling' | 'refreshing'>('idle');
  const pullPhaseRef = useRef<'idle' | 'pulling' | 'refreshing'>('idle');
  const pullDistanceRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isPullingRef = useRef(false);
  const springRafRef = useRef(0);
  const prevIsPendingRef = useRef(false);

  // DOM refs for direct 60fps manipulation (bypass React re-renders)
  const indicatorWrapperRef = useRef<HTMLDivElement>(null);
  const arcCircleRef = useRef<SVGCircleElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  // Stable ref to handleRefresh to avoid stale closures in touch effect
  const handleRefreshRef = useRef<() => void>(() => {});

  // Direct DOM update — called every animation frame, never triggers React render
  const updateDOM = useCallback((distance: number) => {
    const wrapper = indicatorWrapperRef.current;
    if (!wrapper) return;
    wrapper.style.height = `${Math.max(0, distance)}px`;

    if (pullPhaseRef.current !== 'pulling') return;
    const progress = Math.min(distance / PULL_THRESHOLD, 1);

    // Arc fill: stroke-dashoffset goes from full (hidden) to 0 (complete circle)
    if (arcCircleRef.current) {
      arcCircleRef.current.style.strokeDashoffset = `${ARC_CIRCUMFERENCE * (1 - progress)}`;
      arcCircleRef.current.style.opacity = `${0.3 + 0.7 * progress}`;
    }
    // Label fades in after 50% pulled
    if (labelRef.current) {
      labelRef.current.textContent = progress >= 1 ? 'Release to refresh' : '';
      labelRef.current.style.opacity = `${Math.max(0, (progress - 0.5) * 2)}`;
    }
  }, []); // safe — only refs and module constants

  // Spring physics: animates height from `from` → `to` with optional bounce overshoot
  const runSpring = useCallback((
    from: number,
    to: number,
    bounce: boolean,
    onComplete?: () => void,
  ) => {
    cancelAnimationFrame(springRafRef.current);
    let pos = from;
    let vel = 0;
    let lastT = performance.now();
    const k = bounce ? SPRING_STIFFNESS_BOUNCE : SPRING_STIFFNESS_SNAP;
    const damp = bounce ? SPRING_DAMPING_BOUNCE : SPRING_DAMPING_SNAP;

    const step = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 1 / 30);
      lastT = t;
      vel += (-k * (pos - to) - damp * vel) * dt;
      pos += vel * dt;

      // Clamp to 0 so we never show negative height
      const display = to === 0 ? Math.max(0, pos) : pos;
      pullDistanceRef.current = display;
      updateDOM(display);

      if (Math.abs(pos - to) > 0.5 || Math.abs(vel) > 5) {
        springRafRef.current = requestAnimationFrame(step);
      } else {
        pullDistanceRef.current = to;
        updateDOM(to);
        onComplete?.();
      }
    };
    springRafRef.current = requestAnimationFrame(step);
  }, [updateDOM]);

  // Fetch initial data client-side so the loading skeleton is always visible
  useEffect(() => {
    const savedView = localStorage.getItem('rss-flow:selectedView');
    if (savedView) setSelectedView(savedView);

    Promise.all([fetchAllArticles('24h'), getReadArticlesList()]).then(([result, guids]) => {
      setArticles(result.articles);
      setFetchError(result.error ?? null);
      setReadGuids(new Set(guids));
      setIsInitialLoading(false);
    });
  }, []);

  // Update the current time every minute to refresh the "last updated" display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Pull-to-refresh touch handlers — non-passive touchmove to call preventDefault
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0 && pullPhaseRef.current === 'idle') {
        touchStartYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current) return;
      const delta = e.touches[0].clientY - touchStartYRef.current;
      if (delta <= 0) { isPullingRef.current = false; return; }
      e.preventDefault();

      if (pullPhaseRef.current === 'idle') {
        pullPhaseRef.current = 'pulling';
        setPullPhase('pulling');
      }

      // Rubber-band: ~60% speed before threshold, strong resistance after
      const dist = delta < PULL_THRESHOLD
        ? delta * 0.6
        : PULL_THRESHOLD * 0.6 + (delta - PULL_THRESHOLD) * 0.12;

      pullDistanceRef.current = dist;
      updateDOM(dist);
    };

    const onTouchEnd = () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;
      const dist = pullDistanceRef.current;

      if (dist >= PULL_THRESHOLD) {
        // Commit to refresh: reset pull visuals, snap to resting height, fire refresh
        pullPhaseRef.current = 'refreshing';
        setPullPhase('refreshing');
        if (arcCircleRef.current) {
          arcCircleRef.current.style.strokeDashoffset = '0';
          arcCircleRef.current.style.opacity = '1';
        }
        if (labelRef.current) labelRef.current.style.opacity = '0';
        runSpring(dist, INDICATOR_HEIGHT, false, () => handleRefreshRef.current());
      } else {
        // Didn't reach threshold — bounce back with spring
        runSpring(dist, 0, true, () => {
          setPullPhase('idle');
          pullPhaseRef.current = 'idle';
        });
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      cancelAnimationFrame(springRafRef.current);
    };
  }, [updateDOM, runSpring]);

  // Keep guid set current so background refresh can detect new articles
  useEffect(() => {
    currentArticleGuidsRef.current = new Set(articles.map(a => a.guid));
  }, [articles]);

  // Background auto-refresh — fetches silently and stages new articles behind a banner
  useEffect(() => {
    if (autoRefreshInterval === 0) return;
    const id = setInterval(async () => {
      const { articles: fresh } = await fetchAllArticles(timeRange);
      const newOnes = fresh.filter(a => !currentArticleGuidsRef.current.has(a.guid));
      if (newOnes.length > 0) {
        setPendingArticles(fresh);
        setPendingCount(newOnes.length);
      }
    }, autoRefreshInterval * 60 * 1000);
    return () => clearInterval(id);
  }, [autoRefreshInterval, timeRange]);

  const applyPendingArticles = () => {
    if (!pendingArticles) return;
    setArticles(pendingArticles);
    setLastRefreshTime(new Date());
    setPendingArticles(null);
    setPendingCount(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cycleAutoRefresh = () => {
    const idx = AUTO_REFRESH_INTERVALS.indexOf(autoRefreshInterval);
    setAutoRefreshInterval(AUTO_REFRESH_INTERVALS[(idx + 1) % AUTO_REFRESH_INTERVALS.length]);
  };

  const handleTimeRangeChange = async (range: TimeRange) => {
    setTimeRange(range);
    setPendingArticles(null);
    setPendingCount(0);
    startTransition(async () => {
      const result = await fetchAllArticles(range);
      setArticles(result.articles);
      setFetchError(result.error ?? null);
    });
  };

  const handleContentLinesChange = (lines: ContentLines) => {
    setContentLines(lines);
  };

  // Derive sorted list of distinct view names from loaded articles
  const availableViews = useMemo(() => {
    const views = new Set<string>();
    articles.forEach(a => { if (a.view) views.add(a.view); });
    return Array.from(views).sort();
  }, [articles]);

  // Reset selectedView if the persisted name no longer exists (e.g. after a view rename)
  useEffect(() => {
    if (selectedView === 'All' || availableViews.length === 0) return;
    if (!availableViews.includes(selectedView)) {
      setSelectedView('All');
      localStorage.removeItem('rss-flow:selectedView');
    }
  }, [availableViews, selectedView]);

  const handleViewChange = (v: string) => {
    setSelectedView(v);
    localStorage.setItem('rss-flow:selectedView', v);
    // Clear category filter when switching views to avoid stale selections
    setSelectedCategories(new Set());
  };

  const handleMarkAsRead = (guid: string) => {
    setReadGuids(prev => new Set(prev).add(guid));
  };

  const handleMarkAsUnread = (guid: string) => {
    setReadGuids(prev => {
      const next = new Set(prev);
      next.delete(guid);
      return next;
    });
  };

  const handleOpenArticleFromDigest = async (article: Article) => {
    setIsDigestOpen(false);
    setDigestOpenedArticle(article);
    setDigestOpenedContent(null);
    setIsDigestArticleLoading(true);
    handleMarkAsRead(article.guid);
    markAsRead(article.guid);
    const result = await fetchArticleContent(article.feedUrl, article.guid);
    setDigestOpenedContent(result.success && result.content ? result.content : 'Failed to load article content.');
    setIsDigestArticleLoading(false);
  };

  const handleRefresh = async () => {
    setPendingArticles(null);
    setPendingCount(0);
    startTransition(async () => {
      const result = await fetchAllArticles(timeRange);
      setArticles(result.articles);
      setFetchError(result.error ?? null);
      setLastRefreshTime(new Date());
    });
  };
  handleRefreshRef.current = handleRefresh;

  // When a refresh completes (isPending flips false), spring the indicator back
  useEffect(() => {
    if (prevIsPendingRef.current && !isPending && pullPhaseRef.current === 'refreshing') {
      runSpring(pullDistanceRef.current, 0, true, () => {
        setPullPhase('idle');
        pullPhaseRef.current = 'idle';
      });
    }
    prevIsPendingRef.current = isPending;
  }, [isPending, runSpring]);

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

  // Extract unique categories from articles, scoped to the selected view
  const getUniqueCategories = (): { category: string; color: string }[] => {
    const categoryMap = new Map<string, string>();
    articles.forEach(article => {
      if (selectedView !== 'All' && article.view !== selectedView) return;
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

  // Filter articles by view, selected categories, and read status
  const filteredArticles = articles.filter(article => {
    // Filter by view
    if (selectedView !== 'All' && article.view !== selectedView) return false;
    // Filter by category if categories are selected
    if (selectedCategories.size > 0 && !selectedCategories.has(article.category)) {
      return false;
    }
    // Filter out read articles if hideReadArticles is enabled
    if (hideReadArticles && readGuids.has(article.guid)) {
      return false;
    }
    return true;
  });

  // Article count per category — respects view filter and hideReadArticles, used for filter pill badges
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    articles.forEach(article => {
      if (selectedView !== 'All' && article.view !== selectedView) return;
      if (hideReadArticles && readGuids.has(article.guid)) return;
      counts.set(article.category, (counts.get(article.category) || 0) + 1);
    });
    return counts;
  }, [articles, selectedView, hideReadArticles, readGuids]);

  // Memoized feed velocities — computed once per articles/view/timeRange change, not per item
  const feedVelocities = useMemo(() => {
    const counts = new Map<string, number>();
    articles.forEach(article => {
      if (selectedView !== 'All' && article.view !== selectedView) return;
      counts.set(article.feedUrl, (counts.get(article.feedUrl) || 0) + 1);
    });
    return counts;
  }, [articles, selectedView]);

  const isLowVelocityFeed = useCallback((feedUrl: string): boolean => {
    return (feedVelocities.get(feedUrl) || 0) <= FEED_VELOCITY_THRESHOLDS[timeRange];
  }, [feedVelocities, timeRange]);

  // Virtualizer — measures actual rendered heights; estimateSize is just the initial guess
  const virtualizer = useWindowVirtualizer({
    count: filteredArticles.length,
    estimateSize: useCallback(() => VIRTUAL_ITEM_HEIGHT[contentLines], [contentLines]),
    overscan: VIRTUAL_OVERSCAN,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  // Unread articles (filtered) — used for the badge count and digest panel
  const unreadArticles = useMemo(
    () => filteredArticles.filter(a => !readGuids.has(a.guid)),
    [filteredArticles, readGuids]
  );
  const unreadCount = unreadArticles.length;

  // Mark all visible articles as read
  const handleMarkAllAsRead = async () => {
    const unreadGuids = filteredArticles
      .filter(article => !readGuids.has(article.guid))
      .map(article => article.guid);

    if (unreadGuids.length === 0) return;

    // Optimistically update UI
    setReadGuids(prev => {
      const newSet = new Set(prev);
      unreadGuids.forEach(guid => newSet.add(guid));
      return newSet;
    });

    // Persist to database
    await markAllAsRead(unreadGuids);
  };

  if (isInitialLoading) return <LoadingSkeleton />;

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
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 font-[family-name:var(--font-red-hat-display)]">
                  RSS Flow
                </h1>
                {unreadCount > 0 && (
                  <button
                    onClick={() => setIsDigestOpen(true)}
                    className="flex items-center justify-center min-w-[24px] h-6 px-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-full transition-colors"
                    title="Open unread digest"
                    aria-label={`${unreadCount} unread articles — open digest`}
                  >
                    {unreadCount}
                  </button>
                )}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3 flex-1 justify-center">
              <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                {(['24h', '3d', '7d'] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => handleTimeRangeChange(range)}
                    title={range === '24h' ? '24 Hours' : range === '3d' ? '3 Days' : '7 Days'}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                      timeRange === range
                        ? 'bg-orange-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>

              <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                {([0, 1, 2, 3] as ContentLines[]).map((lines) => (
                  <button
                    key={lines}
                    onClick={() => handleContentLinesChange(lines)}
                    title={lines === 0 ? 'No preview' : `${lines} line${lines > 1 ? 's' : ''} preview`}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                      contentLines === lines
                        ? 'bg-orange-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {lines === 0 ? '—' : lines}
                  </button>
                ))}
              </div>

              {availableViews.length > 1 && (
                <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                  {(['All', ...availableViews]).map((v) => (
                    <button
                      key={v}
                      onClick={() => handleViewChange(v)}
                      className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selectedView === v
                          ? 'bg-orange-500 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
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

            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
              <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                {formatRefreshTime(lastRefreshTime)}
              </span>
              <button
                onClick={() => setHideReadArticles(!hideReadArticles)}
                className={`p-2 rounded transition-colors ${
                  hideReadArticles
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
                title={hideReadArticles ? 'Show Read Articles' : 'Hide Read Articles'}
              >
                {hideReadArticles ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
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
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                title="Mark All as Read"
              >
                <CheckCheck size={18} />
              </button>
              <button
                onClick={cycleAutoRefresh}
                className={`px-2 py-1.5 rounded text-xs font-semibold transition-colors ${
                  autoRefreshInterval > 0
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
                title={autoRefreshInterval === 0 ? 'Auto-refresh: off' : `Auto-refresh: every ${autoRefreshInterval}m`}
              >
                {autoRefreshInterval === 0 ? 'Auto' : `${autoRefreshInterval}m`}
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
                href="/api/export/opml"
                download="rss-flow-subscriptions.opml"
                className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                title="Export OPML"
              >
                <Download size={18} />
              </a>
              <a
                href="/admin"
                className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                title="Admin"
              >
                <Settings size={18} />
              </a>
            </div>
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
                    px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5
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
                  <span className={`text-[10px] font-semibold tabular-nums ${selectedCategories.has(category) ? 'opacity-80' : 'opacity-60'}`}>
                    {categoryCounts.get(category) ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hamburger Menu */}
      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)}>
        <div className="space-y-6">
          {/* Unread count summary */}
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Unread articles</span>
            <button
              onClick={() => { setIsMenuOpen(false); if (unreadCount > 0) setIsDigestOpen(true); }}
              disabled={unreadCount === 0}
              className={`text-sm font-bold tabular-nums px-2.5 py-0.5 rounded-full transition-colors ${unreadCount > 0 ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-default'}`}
              title={unreadCount > 0 ? 'Open unread digest' : undefined}
            >
              {unreadCount}
            </button>
          </div>

          {/* View Section — only when multiple views exist */}
          {availableViews.length > 1 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                View
              </h3>
              <div className="flex flex-col gap-2">
                {(['All', ...availableViews]).map((v) => (
                  <button
                    key={v}
                    onClick={() => { handleViewChange(v); setIsMenuOpen(false); }}
                    className={`
                      px-4 py-3 text-sm font-medium rounded-lg transition-colors
                      ${selectedView === v
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                    px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5
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
                  <span className={`text-xs font-semibold tabular-nums ${selectedCategories.has(category) ? 'opacity-80' : 'opacity-60'}`}>
                    {categoryCounts.get(category) ?? 0}
                  </span>
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
                  setHideReadArticles(!hideReadArticles);
                  setIsMenuOpen(false);
                }}
                className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  hideReadArticles
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {hideReadArticles ? <EyeOff size={18} /> : <Eye size={18} />}
                {hideReadArticles ? 'Show Read Articles' : 'Hide Read Articles'}
              </button>
              <button
                onClick={() => {
                  handleMarkAllAsRead();
                  setIsMenuOpen(false);
                }}
                disabled={unreadCount === 0}
                className="px-4 py-3 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCheck size={18} />
                Mark All as Read
              </button>
              <button
                onClick={() => { cycleAutoRefresh(); setIsMenuOpen(false); }}
                className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  autoRefreshInterval > 0
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <RefreshCw size={18} />
                {autoRefreshInterval === 0 ? 'Auto-refresh: off' : `Auto-refresh: ${autoRefreshInterval}m`}
              </button>
              <button
                onClick={() => {
                  handleRefresh();
                  setIsMenuOpen(false);
                }}
                disabled={isPending}
                className="px-4 py-3 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} className={isPending ? 'animate-spin' : ''} />
                Refresh now
              </button>
              <button
                onClick={() => { toggleTheme(); setIsMenuOpen(false); }}
                className="px-4 py-3 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              </button>
              <a
                href="/api/export/opml"
                download="rss-flow-subscriptions.opml"
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-3 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Export OPML
              </a>
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

      {/* Pull-to-refresh indicator — height driven by direct DOM, never by React state */}
      <div
        ref={indicatorWrapperRef}
        className="w-full bg-white dark:bg-gray-900 overflow-hidden flex flex-col justify-end"
        style={{ height: 0 }}
      >
        <div className={`h-[56px] flex items-center justify-center gap-2 ${
          pullPhase === 'refreshing' ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'
        }`}>
          {/* Arc fills as you pull; becomes a full spinning circle during refresh */}
          <div className={pullPhase === 'refreshing' ? 'animate-spin' : ''}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle
                cx="11" cy="11" r={ARC_RADIUS}
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={ARC_CIRCUMFERENCE}
                strokeDashoffset={ARC_CIRCUMFERENCE}
                ref={arcCircleRef}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '11px 11px', opacity: 0 }}
              />
            </svg>
          </div>
          <span
            ref={labelRef}
            className="text-sm font-medium"
            style={{ opacity: 0 }}
          />
        </div>
      </div>

      {/* New articles banner — appears after a background auto-refresh */}
      {pendingArticles && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-orange-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg cursor-pointer hover:bg-orange-600 active:scale-95 transition-all flex items-center gap-2 select-none"
          onClick={applyPendingArticles}
        >
          <RefreshCw size={14} />
          {pendingCount} new article{pendingCount !== 1 ? 's' : ''} — tap to load
        </div>
      )}

      {/* Digest panel — triggered by tapping the unread count badge */}
      <DigestPanel
        isOpen={isDigestOpen}
        onClose={() => setIsDigestOpen(false)}
        unreadArticles={unreadArticles}
      />

      {/* Article modal opened from within the digest */}
      {digestOpenedArticle && (
        <ArticleModal
          article={digestOpenedArticle}
          isOpen={true}
          onClose={() => { setDigestOpenedArticle(null); setDigestOpenedContent(null); }}
          content={digestOpenedContent}
          isLoading={isDigestArticleLoading}
        />
      )}

      {fetchError && (
        <div className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm text-center">
          {fetchError}
        </div>
      )}

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
              No articles match the current filters
              {selectedView !== 'All' ? ` in the "${selectedView}" view` : ''}.
            </p>
          </div>
        ) : (
          <div ref={listRef}>
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const article = filteredArticles[virtualItem.index];
                return (
                  <div
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
                    }}
                  >
                    <ArticleItem
                      article={article}
                      isRead={readGuids.has(article.guid)}
                      contentLines={contentLines}
                      onRead={handleMarkAsRead}
                      onUnread={handleMarkAsUnread}
                      isLowVelocity={isLowVelocityFeed(article.feedUrl)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
