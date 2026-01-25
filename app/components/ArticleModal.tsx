'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, Loader2, Copy, Send, Sparkles, Quote } from 'lucide-react';
import { Article } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import { generateSummary, extractKeyQuotes } from '@/app/actions/ai';

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
  const selectionRangeRef = useRef<Range | null>(null);
  const highlightSpanRef = useRef<HTMLSpanElement | null>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
  const [quotes, setQuotes] = useState<string[] | null>(null);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState(false);

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

  // Fetch AI summary when content is available
  useEffect(() => {
    if (!isOpen || !content || summary !== null || summaryLoading) {
      return;
    }

    const fetchSummary = async () => {
      setSummaryLoading(true);
      setSummaryError(false);

      const result = await generateSummary(content, article.guid);

      if (result.success && result.summary) {
        setSummary(result.summary);
      } else {
        setSummaryError(true);
        console.log('Summary generation skipped or failed:', result.error);
      }

      setSummaryLoading(false);
    };

    fetchSummary();
  }, [isOpen, content, article.guid, summary, summaryLoading]);

  // Fetch key quotes when content is available
  useEffect(() => {
    if (!isOpen || !content || quotes !== null || quotesLoading) {
      return;
    }

    const fetchQuotes = async () => {
      setQuotesLoading(true);
      setQuotesError(false);

      const result = await extractKeyQuotes(content, article.guid);

      if (result.success && result.quotes) {
        setQuotes(result.quotes);
      } else {
        setQuotesError(true);
        console.log('Quote extraction skipped or failed:', result.error);
      }

      setQuotesLoading(false);
    };

    fetchQuotes();
  }, [isOpen, content, article.guid, quotes, quotesLoading]);

  // Reset summary and quotes when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSummary(null);
      setSummaryError(false);
      setSummaryLoading(false);
      setQuotes(null);
      setQuotesError(false);
      setQuotesLoading(false);
    }
  }, [isOpen]);

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

  // Handle context menu for text selection (desktop and mobile)
  useEffect(() => {
    if (!isOpen || !content) return;

    // Detect if device has touch capability
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Helper to create visual highlight using overlay
    const createHighlight = (range: Range) => {
      // Remove any existing highlight
      removeHighlight();

      // Get all rectangles for the selection (handles multi-line selections)
      const rects = range.getClientRects();

      console.log('Creating highlight for', rects.length, 'rectangles');

      if (rects.length === 0) {
        console.warn('No rectangles found for selection');
        return;
      }

      // Create individual highlight divs for each rectangle (not in a container)
      // This ensures they appear above the modal
      const highlights: HTMLElement[] = [];

      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        console.log('Rect', i, ':', rect.left, rect.top, rect.width, rect.height);

        const highlightRect = document.createElement('div');
        highlightRect.setAttribute('data-selection-highlight', 'true');
        highlightRect.style.cssText = `
          position: fixed;
          left: ${rect.left}px;
          top: ${rect.top}px;
          width: ${rect.width}px;
          height: ${rect.height}px;
          background-color: rgba(59, 130, 246, 0.35);
          pointer-events: none;
          z-index: 51;
          mix-blend-mode: multiply;
        `;

        document.body.appendChild(highlightRect);
        highlights.push(highlightRect);
      }

      // Store reference to first highlight (we'll use querySelectorAll to remove all)
      if (highlights.length > 0) {
        highlightSpanRef.current = highlights[0] as any;
        console.log('Highlight created and added to body:', highlights.length, 'elements');
      }
    };

    // Helper to remove visual highlight
    const removeHighlight = () => {
      const highlights = document.querySelectorAll('[data-selection-highlight]');
      highlights.forEach(h => h.remove());
      highlightSpanRef.current = null;
      console.log('Removed', highlights.length, 'highlight elements');
    };

    // Prevent right-click mousedown from clearing selection
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) { // Right mouse button
        const selection = window.getSelection();
        const text = selection?.toString().trim() || '';

        if (text && selection && selection.rangeCount > 0) {
          const anchorNode = selection.anchorNode;
          const focusNode = selection.focusNode;

          const isWithinContent = contentRef.current && (
            contentRef.current.contains(anchorNode) ||
            contentRef.current.contains(focusNode)
          );

          if (isWithinContent) {
            console.log('Right-click mousedown: preventing default and stopping propagation');
            // Prevent mousedown from clearing the selection
            e.preventDefault();
            // Stop event from bubbling to document listener
            e.stopPropagation();

            // Save the range immediately
            const range = selection.getRangeAt(0);
            selectionRangeRef.current = range.cloneRange();
          }
        }
      }
    };

    // Desktop: right-click
    const handleContextMenu = (e: MouseEvent) => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';

      // If we saved a range from mousedown, use it
      const range = selectionRangeRef.current || (selection?.rangeCount ? selection.getRangeAt(0) : null);

      if ((text || selectionRangeRef.current) && range) {
        // Check if selection is within the content area
        const anchorNode = selection?.anchorNode || range.startContainer;
        const focusNode = selection?.focusNode || range.endContainer;

        const isWithinContent = contentRef.current && (
          contentRef.current.contains(anchorNode) ||
          contentRef.current.contains(focusNode)
        );

        if (isWithinContent) {
          e.preventDefault();

          // Use the saved text or get it from the range
          const selectionText = text || range.toString().trim();

          // Create visual highlight immediately to keep selection visible
          createHighlight(range.cloneRange());

          setSelectedText(selectionText);
          setMenuPosition({ x: e.clientX, y: e.clientY });
          setShowContextMenu(true);
        }
      }
    };

    // Mobile: handle touch end to show menu after selection gesture completes
    const handleTouchEnd = () => {
      // Only handle on touch devices
      if (!isTouchDevice) return;

      // Use a small delay to ensure selection is finalized
      selectionTimeoutRef.current = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim() || '';

        if (text && selection && selection.rangeCount > 0) {
          const anchorNode = selection.anchorNode;
          const focusNode = selection.focusNode;

          const isWithinContent = contentRef.current && (
            contentRef.current.contains(anchorNode) ||
            contentRef.current.contains(focusNode)
          );

          if (isWithinContent) {
            // Get the bounding rect of the selection to position menu
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Save the selection range
            selectionRangeRef.current = range.cloneRange();

            // Create visual highlight for the selection
            createHighlight(range.cloneRange());

            setSelectedText(text);
            // Position menu at the end of selection
            setMenuPosition({
              x: rect.right,
              y: rect.bottom + 5
            });
            setShowContextMenu(true);
          }
        }
      }, 100); // Small delay to ensure selection is finalized
    };

    // Hide menu when clicking/tapping elsewhere
    const handleClickOutside = (e: Event) => {
      // Ignore right-clicks completely (they're handled by contextmenu event)
      if (e instanceof MouseEvent && e.button === 2) {
        console.log('Ignoring right-click in handleClickOutside');
        return;
      }

      // Don't hide if clicking on the menu itself
      if (e.target instanceof Node) {
        const menuElement = document.querySelector('[data-context-menu]');
        if (menuElement?.contains(e.target)) {
          console.log('Click on menu, ignoring');
          return;
        }
      }

      console.log('handleClickOutside: hiding menu and removing highlight');

      // Clear any pending timeout
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
        selectionTimeoutRef.current = null;
      }

      // On desktop, just hide the menu
      if (!isTouchDevice) {
        setShowContextMenu(false);
        selectionRangeRef.current = null;
        removeHighlight();
        return;
      }

      // On mobile, check if there's still a selection after a small delay
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim() || '';
        if (!text) {
          setShowContextMenu(false);
          setSelectedText('');
          selectionRangeRef.current = null;
          removeHighlight();
        }
      }, 10);
    };

    const contentEl = contentRef.current;
    if (contentEl) {
      // Desktop: prevent right-click from clearing selection
      contentEl.addEventListener('mousedown', handleMouseDown);

      // Desktop: right-click context menu
      contentEl.addEventListener('contextmenu', handleContextMenu);

      // Mobile: listen for touch end to show menu after selection (only on touch devices)
      if (isTouchDevice) {
        contentEl.addEventListener('touchend', handleTouchEnd);
      }

      // Hide menu when clicking elsewhere
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }

    return () => {
      removeHighlight();
      // Clear any pending timeout
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
      if (contentEl) {
        contentEl.removeEventListener('mousedown', handleMouseDown);
        contentEl.removeEventListener('contextmenu', handleContextMenu);
        contentEl.removeEventListener('touchend', handleTouchEnd);
      }
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, content]); // Removed showContextMenu to prevent effect re-run from removing highlights

  const handleCopyQuote = async () => {
    if (!selectedText) return;

    // Format as markdown with citation at the beginning
    // Split by newlines and add > prefix to each line
    const lines = selectedText.split('\n');
    const quotedLines = lines.map(line => `> ${line}`).join('\n');
    const markdown = `[${article.title?.trim() || 'Untitled'}](${article.link}) — ${article.feedName}\n\n${quotedLines}`;

    try {
      await navigator.clipboard.writeText(markdown);

      // Clear any pending timeout
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
        selectionTimeoutRef.current = null;
      }

      // Remove all highlights before clearing
      const highlights = document.querySelectorAll('[data-selection-highlight]');
      highlights.forEach(h => h.remove());

      setShowContextMenu(false);
      setSelectedText('');
      selectionRangeRef.current = null;
      highlightSpanRef.current = null;
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

  const handleSendToMicroblog = () => {
    if (!selectedText) return;

    // Format as markdown with citation at the beginning
    const lines = selectedText.split('\n');
    const quotedLines = lines.map(line => `> ${line}`).join('\n');
    const markdown = `[${article.title?.trim() || 'Untitled'}](${article.link}) — ${article.feedName}\n\n${quotedLines}`;

    // URL encode the markdown and open in new tab
    const encodedMarkdown = encodeURIComponent(markdown);
    const url = `https://microblog-poster.numericcitizen.me/?linkpost=${encodedMarkdown}`;

    window.open(url, '_blank', 'noopener,noreferrer');

    // Clear any pending timeout
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
      selectionTimeoutRef.current = null;
    }

    // Remove all highlights before clearing
    const highlights = document.querySelectorAll('[data-selection-highlight]');
    highlights.forEach(h => h.remove());

    setShowContextMenu(false);
    setSelectedText('');
    selectionRangeRef.current = null;
    highlightSpanRef.current = null;
    window.getSelection()?.removeAllRanges();
  };

  const handleSendSummaryToMicroblog = () => {
    if (!summary) return;

    // Format summary as markdown with citation at the beginning
    const lines = summary.split('\n');
    const quotedLines = lines.map(line => `> ${line}`).join('\n');
    const markdown = `[${article.title?.trim() || 'Untitled'}](${article.link}) — ${article.feedName}\n\n${quotedLines}`;

    // URL encode the markdown and open in new tab
    const encodedMarkdown = encodeURIComponent(markdown);
    const url = `https://microblog-poster.numericcitizen.me/?linkpost=${encodedMarkdown}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSendQuoteToMicroblog = (quote: string) => {
    if (!quote) return;

    // Format quote as markdown with citation at the beginning
    const lines = quote.split('\n');
    const quotedLines = lines.map(line => `> ${line}`).join('\n');
    const markdown = `[${article.title?.trim() || 'Untitled'}](${article.link}) — ${article.feedName}\n\n${quotedLines}`;

    // URL encode the markdown and open in new tab
    const encodedMarkdown = encodeURIComponent(markdown);
    const url = `https://microblog-poster.numericcitizen.me/?linkpost=${encodedMarkdown}`;

    window.open(url, '_blank', 'noopener,noreferrer');
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
              <span className="text-gray-400 dark:text-gray-600 max-md:hidden">·</span>
              <span className="text-xs text-gray-500 dark:text-gray-500 font-bold max-md:hidden">
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
            <>
              {/* AI Summary */}
              {(summaryLoading || summary) && !summaryError && (
                <div
                  className={`mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 rounded-r-lg ${summary ? 'cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors' : ''}`}
                  onClick={summary ? handleSendSummaryToMicroblog : undefined}
                  title={summary ? "Click to send summary to microblog" : undefined}
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                          AI Summary
                        </span>
                        {summary && (
                          <Send className="w-3.5 h-3.5 text-orange-500 opacity-60" />
                        )}
                      </div>
                      {summaryLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating summary...</span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {summary}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Key Quotes */}
              {(quotesLoading || (quotes && quotes.length > 0)) && !quotesError && (
                <div className="mb-6 space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <Quote className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                      Key Quotes
                    </span>
                  </div>
                  {quotesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 px-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extracting key quotes...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {quotes?.map((quote, index) => (
                        <div
                          key={index}
                          className="group relative p-3 pl-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic pr-8">
                            "{quote}"
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendQuoteToMicroblog(quote);
                            }}
                            className="absolute top-3 right-3 p-1.5 text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Send quote to microblog"
                            aria-label="Send quote to microblog"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Article Content */}
              <div
                ref={contentRef}
                className={`article-content prose dark:prose-invert max-w-none prose-sm md:prose-base select-text cursor-text ${showContextMenu ? 'preserve-selection' : ''}`}
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No content available
            </div>
          )}

        </div>

        {/* Context Menu */}
        {showContextMenu && (
          <div
            data-context-menu
            className="fixed z-[100] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl py-1 min-w-40 isolate"
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
            <button
              onClick={handleSendToMicroblog}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <Send size={16} />
              Send to Microblog
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
