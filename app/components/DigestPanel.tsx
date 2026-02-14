'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { Article } from '@/types';
import { generateUnreadDigest, DigestResult } from '@/app/actions/ai';

interface DigestPanelProps {
  isOpen: boolean;
  onClose: () => void;
  unreadArticles: Article[];
}

export default function DigestPanel({ isOpen, onClose, unreadArticles }: DigestPanelProps) {
  const [digest, setDigest] = useState<DigestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch digest whenever the panel opens
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

  // Reset on close so next open re-fetches with current unread list
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

  return createPortal(
    <>
      {/* Backdrop — dim on mobile, transparent on desktop */}
      <div
        className="fixed inset-0 bg-black/50 md:bg-black/0 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
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
          ) : digest?.success && digest.abstract ? (
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {digest.abstract}
            </p>
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
