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
        border-b border-gray-200 dark:border-gray-700 py-3 px-4 cursor-pointer
        hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
        ${isRead ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
          style={{ backgroundColor: article.categoryColor }}
          title={article.category}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <h2 className="font-semibold text-base text-gray-900 dark:text-gray-100">
              {article.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
            <span className="font-medium">{article.feedName}</span>
            <span>•</span>
            <span>{formatRelativeTime(article.pubDate)}</span>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: `${article.categoryColor}20`,
                color: article.categoryColor,
              }}
            >
              {article.category}
            </span>
          </div>
          {article.content && (
            <p
              className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: contentLines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {truncateContent(article.content, contentLines)}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
