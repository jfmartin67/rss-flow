'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, Loader2, Copy } from 'lucide-react';
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

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

  // Handle context menu for text selection
  useEffect(() => {
    if (!isOpen || !content) return;

    const handleContextMenu = (e: MouseEvent) => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';

      if (text && selection && selection.rangeCount > 0) {
        // Check if selection is within the content area
        const anchorNode = selection.anchorNode;
        const focusNode = selection.focusNode;

        const isWithinContent = contentRef.current && (
          contentRef.current.contains(anchorNode) ||
          contentRef.current.contains(focusNode)
        );

        if (isWithinContent) {
          e.preventDefault();
          setSelectedText(text);
          setMenuPosition({ x: e.clientX, y: e.clientY });
          setShowContextMenu(true);
        }
      }
    };

    // Hide menu when clicking elsewhere
    const handleClick = () => {
      setShowContextMenu(false);
    };

    const contentEl = contentRef.current;
    if (contentEl) {
      contentEl.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('click', handleClick);
    }

    return () => {
      if (contentEl) {
        contentEl.removeEventListener('contextmenu', handleContextMenu);
      }
      document.removeEventListener('click', handleClick);
    };
  }, [isOpen, content]);

  const handleCopyQuote = async () => {
    if (!selectedText) return;

    // Format as markdown with citation at the beginning
    // Split by newlines and add > prefix to each line
    const lines = selectedText.split('\n');
    const quotedLines = lines.map(line => `> ${line}`).join('\n');
    const markdown = `[${article.title?.trim() || 'Untitled'}](${article.link}) — ${article.feedName}\n\n${quotedLines}`;

    try {
      await navigator.clipboard.writeText(markdown);
      setShowContextMenu(false);
      setSelectedText('');
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-200"
        onClick={(e) => {
          // Only close if clicking the backdrop itself, not bubbled events
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-4 md:inset-8 lg:inset-16 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 select-text">
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
        <div className="flex-1 overflow-y-auto p-4 md:p-6 select-text relative">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : content ? (
            <div
              ref={contentRef}
              className="prose dark:prose-invert max-w-none prose-sm md:prose-base prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-orange-500 hover:prose-a:text-orange-600 select-text cursor-text"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No content available
            </div>
          )}

        </div>

        {/* Context Menu */}
        {showContextMenu && (
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl py-1 min-w-40"
            style={{
              top: `${menuPosition.y}px`,
              left: `${menuPosition.x}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCopyQuote}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <Copy size={16} />
              Copy Quote
            </button>
          </div>
        )}

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
