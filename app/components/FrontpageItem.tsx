'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Article } from '@/types';
import { formatRelativeTime, truncateContent } from '@/lib/utils';
import { markAsRead, markAsUnread, fetchArticleContent } from '@/app/actions/articles';
import ArticleModal from './ArticleModal';

interface FrontpageItemProps {
  article: Article;
  isRead: boolean;
  onRead: (guid: string) => void;
  onUnread: (guid: string) => void;
}

export default function FrontpageItem({ article, isRead, onRead, onUnread }: FrontpageItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  const handleClick = async () => {
    if (article.link) {
      window.open(article.link, '_blank', 'noopener,noreferrer');
    }
    if (!isRead) {
      onRead(article.guid);
      await markAsRead(article.guid);
    }
  };

  const handleOpenModal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
    if (!isRead) {
      onRead(article.guid);
      markAsRead(article.guid);
    }
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

  const title = article.title?.trim() || (article.content?.trim() ? `"${article.content.trim()}"` : 'Untitled');

  return (
    <>
      <article
        onClick={handleClick}
        className={`break-inside-avoid mb-4 flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer transition-shadow overflow-hidden ${
          article.imageUrl ? 'shadow-sm hover:shadow-md' : 'shadow-md hover:shadow-lg'
        } ${isRead ? 'opacity-60' : ''}`}
      >
        {/* Top accent border */}
        <div className="h-[3px] flex-shrink-0" style={{ backgroundColor: article.categoryColor }} />

        {/* Article image */}
        {article.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.imageUrl}
            alt=""
            className="w-full object-cover max-h-48"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}

        <div className="flex flex-col gap-1.5 p-3 flex-1">
          {/* Category + time */}
          <div className="flex items-center justify-between gap-2">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold truncate"
              style={{
                backgroundColor: `${article.categoryColor}20`,
                color: article.categoryColor,
              }}
            >
              {article.category}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 tabular-nums">
              {formatRelativeTime(article.pubDate)}
            </span>
          </div>

          {/* Feed name */}
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate">
            {article.feedName}
          </p>

          {/* Article title */}
          <h2
            className="font-bold text-sm text-gray-900 dark:text-gray-100 leading-snug"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </h2>

          {/* Content preview */}
          {article.content && article.title?.trim() && (
            <p
              className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {truncateContent(article.content, 3)}
            </p>
          )}
        </div>

        {/* Footer: read dot + modal button */}
        <div className="flex items-center justify-between px-3 pb-3">
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
            className={`w-2 h-2 rounded-full flex-shrink-0 transition-opacity ${
              isRead
                ? 'border border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
                : 'hover:opacity-60'
            }`}
            style={isRead ? undefined : { backgroundColor: article.categoryColor }}
            title={isRead ? 'Mark as unread' : 'Mark as read'}
            aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
          />
          <button
            onClick={handleOpenModal}
            className="p-1 text-gray-400 hover:text-orange-500 dark:text-gray-500 dark:hover:text-orange-400 transition-colors"
            title="Read full article"
            aria-label="Read full article"
          >
            <FileText size={16} />
          </button>
        </div>
      </article>

      <ArticleModal
        article={article}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        content={fullContent}
        isLoading={isLoadingContent}
      />
    </>
  );
}
