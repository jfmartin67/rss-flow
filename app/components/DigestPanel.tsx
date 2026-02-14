'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Loader2, FileText } from 'lucide-react';
import { Article } from '@/types';
import { generateUnreadDigest, DigestResult } from '@/app/actions/ai';

interface DigestPanelProps {
  isOpen: boolean;
  onClose: () => void;
  unreadArticles: Article[];
  onOpenArticle: (article: Article) => void;
}

export default function DigestPanel({ isOpen, onClose, unreadArticles, onOpenArticle }: DigestPanelProps) {
  const [digest, setDigest] = useState<DigestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch digest whenever the panel opens (reset on close so it re-fetches with fresh data next time)
  useEffect(() => {
    if (!isOpen || unreadArticles.length === 0) return;
    if (digest !== null) return;

    const fetchDigest = async () => {
      setIsLoading(true);
      const result = await generateUnreadDigest(
        unreadArticles.map(a => ({
          guid: a.guid,
          title: a.title?.trim() || 'Untitled',
          feedName: a.feedName,
          link: a.link || '',
        }))
      );
      setDigest(result);
      setIsLoading(false);
    };

    fetchDigest();
  }, [isOpen, unreadArticles, digest]);

  // Reset digest when closed so next open re-fetches with current unread list
  useEffect(() => {
    if (!isOpen) setDigest(null);
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const findArticle = (guid: string) => unreadArticles.find(a => a.guid === guid);

  return createPortal(
    <>
      {/* Backdrop — dim on mobile, transparent on desktop */}
      <div
        className="fixed inset-0 bg-black/50 md:bg-black/0 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — mirrors ArticleModal layout */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Unread digest"
        className="fixed z-50 bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden inset-4 rounded-lg md:top-0 md:bottom-0 md:right-0 md:left-auto md:w-[60%] md:rounded-r-none md:rounded-l-xl border-l border-gray-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
              Unread Digest
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-normal flex-shrink-0">
              · {unreadArticles.length} article{unreadArticles.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex-shrink-0"
            aria-label="Close digest"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <span className="text-sm">
                Analysing your {unreadArticles.length} unread article{unreadArticles.length !== 1 ? 's' : ''}…
              </span>
            </div>
          ) : digest?.success && digest.themes ? (
            <div className="space-y-6">
              {/* Intro sentence */}
              {digest.intro && (
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic border-l-4 border-orange-400 pl-3">
                  {digest.intro}
                </p>
              )}

              {/* Themed clusters */}
              {digest.themes.map((theme, ti) => (
                <div key={ti}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-2">
                    {theme.label}
                  </h3>
                  <div className="space-y-1">
                    {theme.articles.map((item) => {
                      const article = findArticle(item.guid);
                      return (
                        <button
                          key={item.guid}
                          onClick={() => {
                            if (article) onOpenArticle(article);
                          }}
                          className="w-full text-left group flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <FileText
                            size={14}
                            className="text-gray-400 dark:text-gray-600 flex-shrink-0 mt-0.5 group-hover:text-orange-500 transition-colors"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors leading-snug"
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {item.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                              {item.feedName}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
              {digest?.error ?? 'Could not generate digest. Try again later.'}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
