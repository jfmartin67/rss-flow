'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, Loader2, Copy, Check } from 'lucide-react';
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
  const [showCopyButton, setShowCopyButton] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const [copied, setCopied] = useState(false);

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

  // Handle text selection - wait for mouseup to avoid flashing during drag
  useEffect(() => {
    if (!isOpen || !content) return;

    const handleMouseUp = (e: MouseEvent) => {
      // Small delay to ensure selection is finalized
      setTimeout(() => {
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
            setSelectedText(text);
            setCopied(false);

            // Position the button near the selection
            try {
              const range = selection.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              const modalRect = modalRef.current?.getBoundingClientRect();

              if (modalRect) {
                setButtonPosition({
                  top: rect.bottom - modalRect.top + 8,
                  left: rect.left - modalRect.left,
                });
              }
              setShowCopyButton(true);
            } catch (error) {
              console.error('Error positioning button:', error);
            }
          } else {
            setShowCopyButton(false);
            setSelectedText('');
          }
        } else {
          setShowCopyButton(false);
          setSelectedText('');
        }
      }, 100);
    };

    // Hide button when starting a new selection
    const handleMouseDown = () => {
      setShowCopyButton(false);
      setCopied(false);
    };

    document.addEventListener('mouseup', handleMouseUp);
    const contentEl = contentRef.current;
    if (contentEl) {
      contentEl.addEventListener('mousedown', handleMouseDown);
    }

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      if (contentEl) {
        contentEl.removeEventListener('mousedown', handleMouseDown);
      }
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
      setCopied(true);
      setTimeout(() => {
        setShowCopyButton(false);
        setSelectedText('');
        setCopied(false);
        window.getSelection()?.removeAllRanges();
      }, 1500);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers or permission issues
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

          {/* Copy Quote Button */}
          {showCopyButton && (
            <div
              className="absolute z-50"
              style={{
                top: `${buttonPosition.top}px`,
                left: `${buttonPosition.left}px`,
              }}
            >
              <button
                onClick={handleCopyQuote}
                onMouseDown={(e) => e.preventDefault()} // Prevent text deselection
                className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg shadow-lg hover:bg-orange-600 transition-colors text-sm font-medium whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy Quote
                  </>
                )}
              </button>
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
