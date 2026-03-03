'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Article } from '@/types';
import { formatRelativeTime, truncateContent, getFaviconUrl } from '@/lib/utils';
import { markAsRead, markAsUnread, markAsOpened, fetchArticleContent } from '@/app/actions/articles';
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [hidden, setHidden] = useState(false);

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
    markAsOpened(article.guid);
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

  if (hidden) return null;

  return (
    <>
      <article
        onClick={handleClick}
        className={`break-inside-avoid mb-4 flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer overflow-hidden transition-[opacity,shadow] duration-300 ${
          article.imageUrl ? 'shadow-sm hover:shadow-md' : 'shadow-xl hover:shadow-2xl'
        } ${fadingOut ? 'opacity-0 pointer-events-none' : ''}`}
      >
        {/* Top accent border */}
        <div className="h-[3px] flex-shrink-0" style={{ backgroundColor: article.categoryColor }} />

        {/* Article image */}
        {article.imageUrl && !imageError && (
          <div className="relative w-full h-40 flex-shrink-0">
            {/* Skeleton shown while image loads */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            {/* Category color gradient bleeding down from bottom of image */}
            <div
              className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
              style={{ background: `linear-gradient(to bottom, transparent, ${article.categoryColor}99)` }}
            />
          </div>
        )}

        {/* Faint color bleed continues into text area */}
        <div
          className="flex flex-col gap-1.5 p-3 flex-1"
          style={article.imageUrl && !imageError
            ? { background: `linear-gradient(to bottom, ${article.categoryColor}22, transparent 40%)` }
            : undefined
          }
        >
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
          <div className="flex items-center gap-1.5 min-w-0">
            <img
              src={getFaviconUrl(article.feedUrl)}
              alt=""
              width={12}
              height={12}
              className="w-3 h-3 rounded-sm flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate">
              {article.feedName}
            </p>
          </div>

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
                setFadingOut(true);
                setTimeout(() => {
                  setHidden(true);
                  onRead(article.guid);
                  markAsRead(article.guid);
                }, 320);
              }
            }}
            className="p-2 -m-2 flex-shrink-0 transition-opacity hover:opacity-60"
            title={isRead ? 'Mark as unread' : 'Mark as read'}
            aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
          >
            <span
              className={`w-3.5 h-3.5 rounded-full block flex-shrink-0 ${
                isRead ? 'border-2 border-gray-300 dark:border-gray-600' : ''
              }`}
              style={isRead ? undefined : { backgroundColor: article.categoryColor }}
            />
          </button>
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
