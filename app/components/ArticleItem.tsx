'use client';

import { Article, ContentLines } from '@/types';
import { formatRelativeTime, truncateContent } from '@/lib/utils';
import { markAsRead } from '@/app/actions/articles';

interface ArticleItemProps {
  article: Article;
  isRead: boolean;
  contentLines: ContentLines;
  onRead: (guid: string) => void;
}

export default function ArticleItem({ article, isRead, contentLines, onRead }: ArticleItemProps) {
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
      className={`
        py-2 px-4 cursor-pointer
        hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
        ${isRead ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: article.categoryColor }}
          title={article.category}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded text-xs font-medium flex-shrink-0"
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
            <span className="text-xs text-gray-500 dark:text-gray-500 flex-shrink-0">
              {article.feedName}
            </span>
            <span className="text-gray-400 dark:text-gray-600 flex-shrink-0">·</span>
            <h2 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
              {article.title}
            </h2>
          </div>
          {contentLines > 0 && article.content && (
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
    </article>
  );
}
