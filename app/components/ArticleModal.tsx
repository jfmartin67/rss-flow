'use client';

import { useEffect, useRef } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { Article } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

interface ArticleModalProps {
  article: Article;
  isOpen: boolean;
  onClose: () => void;
  content: string | null;
  isLoading: boolean;
}

export default function ArticleModal({ article, isOpen, onClose, content, isLoading }: ArticleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTab as any);
    firstElement?.focus();

    return () => {
      modal.removeEventListener('keydown', handleTab as any);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-modal-title"
        className="fixed inset-4 md:inset-8 lg:inset-16 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="px-2 py-1 rounded-full text-xs font-bold flex-shrink-0"
                style={{
                  backgroundColor: `${article.categoryColor}20`,
                  color: article.categoryColor,
                }}
              >
                {article.category}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {formatRelativeTime(article.pubDate)}
              </span>
              <span className="text-gray-400 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-500 dark:text-gray-500 font-bold">
                {article.feedName}
              </span>
            </div>
            <h2
              id="article-modal-title"
              className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100"
            >
              {article.title?.trim() || 'Untitled'}
            </h2>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {article.link && (
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink size={20} />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : content ? (
            <div
              className="prose dark:prose-invert max-w-none prose-sm md:prose-base prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-orange-500 hover:prose-a:text-orange-600"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No content available
            </div>
          )}
        </div>

        {/* Footer */}
        {article.link && (
          <div className="p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              <ExternalLink size={18} />
              Read Full Article
            </a>
          </div>
        )}
      </div>
    </>
  );
}
