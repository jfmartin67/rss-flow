'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Article, ContentLines } from '@/types';
import { formatRelativeTime, truncateContent } from '@/lib/utils';
import { markAsRead } from '@/app/actions/articles';
import ArticleModal from './ArticleModal';

interface ArticleItemProps {
  article: Article;
  isRead: boolean;
  contentLines: ContentLines;
  onRead: (guid: string) => void;
}

export default function ArticleItem({ article, isRead, contentLines, onRead }: ArticleItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  return (
    <article
      onClick={handleClick}
      className="py-0.5 px-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-800"
    >
      <div className="flex items-start gap-2">
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${isRead ? 'invisible' : ''}`}
          style={{ backgroundColor: article.categoryColor }}
          title={article.category}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            {/* Fixed width metadata section */}
            <div className="flex items-center gap-2 w-64 flex-shrink-0">
              <span
                className="px-3 py-1 rounded-full text-xs font-bold flex-shrink-0"
                style={{
                  backgroundColor: `${article.categoryColor}20`,
                  color: article.categoryColor,
                }}
              >
                {article.category}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                {formatRelativeTime(article.pubDate)}
              </span>
              <span className="text-gray-400 dark:text-gray-600 flex-shrink-0">·</span>
              <span className="text-xs text-gray-500 dark:text-gray-500 truncate font-bold">
                {article.feedName}
              </span>
            </div>
            {/* Title section - always starts at same position */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalOpen(true);
                  if (!isRead) {
                    onRead(article.guid);
                    markAsRead(article.guid);
                  }
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
            <p
              className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mt-1"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: contentLines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {truncateContent(article.content, contentLines as 1 | 2 | 3)}
            </p>
          )}
        </div>
      </div>

      {/* Article Modal */}
      <ArticleModal
        article={article}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </article>
  );
}
