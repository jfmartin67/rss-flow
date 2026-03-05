'use client';

import { useState, useRef } from 'react';
import { FileText } from 'lucide-react';
import { Article, ContentLines } from '@/types';
import { formatRelativeTime, truncateContent, getFaviconUrl } from '@/lib/utils';
import { markAsRead, markAsUnread, markAsOpened, fetchArticleContent } from '@/app/actions/articles';
import ArticleModal from './ArticleModal';

interface ArticleItemProps {
  article: Article;
  isRead: boolean;
  contentLines: ContentLines;
  onRead: (guid: string) => void;
  onUnread: (guid: string) => void;
  isLowVelocity?: boolean;
}

export default function ArticleItem({ article, isRead, contentLines, onRead, onUnread, isLowVelocity = false }: ArticleItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  // Track whether onRead should fire when the modal closes, to avoid
  // calling it at open-time (which would remove the item from the list
  // when hideReadArticles is on, unmounting this component mid-render).
  const pendingOnRead = useRef(false);

  const handleClick = async () => {
    // Open article in new tab
    if (article.link) {
      window.open(article.link, '_blank', 'noopener,noreferrer');
    }

    // Mark as read
    if (!isRead) {
      onRead(article.guid);
      await markAsRead(article.guid);
    }
  };

  const handleOpenModal = async () => {
    // Capture read state before opening; defer local state update to onClose
    // so the article isn't removed from the filtered list while the modal is open.
    pendingOnRead.current = !isRead;
    setIsModalOpen(true);

    // Persist to server immediately, but don't update local state yet
    if (!isRead) {
      markAsRead(article.guid);
    }
    markAsOpened(article.guid);

    // Fetch content if not already loaded
    if (fullContent === null && !isLoadingContent) {
      setIsLoadingContent(true);
      const result = await fetchArticleContent(article.feedUrl, article.guid);
      if (result.success && result.content) {
        setFullContent(result.content);
      } else {
        setFullContent('Failed to load article content.');
      }
      setIsLoadingContent(false);
    }
  };

  return (
    <article
      onClick={handleClick}
      className={`py-0.5 px-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-800 ${
        isLowVelocity ? 'border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/10' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isRead) {
              onUnread(article.guid);
              markAsUnread(article.guid);
            } else {
              onRead(article.guid);
              markAsRead(article.guid);
            }
          }}
          className="group/dot p-2 -m-2 flex-shrink-0 transition-opacity hover:opacity-60"
          title={isRead ? 'Mark as unread' : 'Mark as read'}
          aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
        >
          <span
            className={`w-3.5 h-3.5 rounded-full block flex-shrink-0 transition-transform group-hover/dot:scale-125 ${
              isRead ? 'border-2 border-gray-300 dark:border-gray-600' : ''
            }`}
            style={isRead ? undefined : { backgroundColor: article.categoryColor }}
          />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            {/* Fixed width metadata section */}
            <div className="flex items-center gap-2 md:w-72 flex-shrink-0">
              <span
                className="px-2 py-1 rounded-full text-xs font-bold flex-shrink-0 truncate md:w-24 md:text-center"
                style={{
                  backgroundColor: `${article.categoryColor}20`,
                  color: article.categoryColor,
                }}
              >
                {article.category}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400 flex-shrink-0 tabular-nums md:w-14">
                {formatRelativeTime(article.pubDate)}
              </span>
              <span className="flex items-center gap-1 max-md:hidden flex-1 min-w-0">
                <img
                  src={getFaviconUrl(article.feedUrl)}
                  alt=""
                  width={12}
                  height={12}
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="text-xs text-gray-500 dark:text-gray-500 truncate font-bold">
                  {article.feedName}
                </span>
              </span>
            </div>
            {/* Title section - always starts at same position */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal();
                }}
                className="p-1 text-gray-400 hover:text-orange-500 dark:text-gray-500 dark:hover:text-orange-400 transition-colors flex-shrink-0"
                title="Read full article"
                aria-label="Read full article"
              >
                <FileText size={16} />
              </button>
              <h2 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
                {article.title?.trim() || (article.content?.trim() ? `"${article.content.trim()}"` : 'Untitled')}
              </h2>
            </div>
          </div>
          {contentLines > 0 && article.content && article.title?.trim() && (
            <div className="flex items-start gap-2 mt-1">
              {/* Spacer to align with metadata section */}
              <div className="md:w-72 flex-shrink-0" />
              {/* Content preview aligned with title */}
              <div className="flex items-start gap-2 flex-1 min-w-0">
                {/* Spacer for read button alignment */}
                <div className="w-6 flex-shrink-0" />
                <p
                  className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex-1"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: contentLines,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {truncateContent(article.content, contentLines as 1 | 2 | 3)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Article Modal */}
      <ArticleModal
        article={article}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          if (pendingOnRead.current) {
            pendingOnRead.current = false;
            onRead(article.guid);
          }
        }}
        content={fullContent}
        isLoading={isLoadingContent}
      />
    </article>
  );
}
