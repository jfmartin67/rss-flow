import { Article, TimeRange, ContentLines } from '@/types';

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHour < 24) {
    return `${diffHour}h ago`;
  } else if (diffDay < 7) {
    return `${diffDay}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function filterByTimeRange(articles: Article[], range: TimeRange): Article[] {
  const now = new Date();
  let cutoffMs: number;

  switch (range) {
    case '24h':
      cutoffMs = 24 * 60 * 60 * 1000;
      break;
    case '3d':
      cutoffMs = 3 * 24 * 60 * 60 * 1000;
      break;
    case '7d':
      cutoffMs = 7 * 24 * 60 * 60 * 1000;
      break;
    default:
      return articles;
  }

  const cutoffDate = new Date(now.getTime() - cutoffMs);
  return articles.filter(article => article.pubDate >= cutoffDate);
}

export function truncateContent(content: string, lines: ContentLines): string {
  if (!content) return '';

  // Remove HTML tags
  const textOnly = content.replace(/<[^>]*>/g, '');

  // Split into lines
  const contentLines = textOnly.split('\n').filter(line => line.trim().length > 0);

  // Take only the specified number of lines
  const truncated = contentLines.slice(0, lines).join(' ');

  // Limit total characters for safety
  const maxLength = lines === 1 ? 200 : lines === 2 ? 400 : 600;
  if (truncated.length > maxLength) {
    return truncated.substring(0, maxLength) + '...';
  }

  return truncated;
}

export function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Interleaves articles to prevent more than maxConsecutive articles from the same feed appearing in a row.
 * This helps balance timelines when some feeds publish much more frequently than others.
 *
 * @param articles - Articles sorted chronologically (newest first)
 * @param maxConsecutive - Maximum number of consecutive articles allowed from the same feed (default: 2)
 * @returns Articles with smart interleaving applied
 */
export function interleaveArticles(articles: Article[], maxConsecutive: number = 2): Article[] {
  if (articles.length <= maxConsecutive) {
    return articles;
  }

  const result: Article[] = [];
  const remaining = [...articles];

  while (remaining.length > 0) {
    // Get the next article
    const nextArticle = remaining.shift()!;

    // Check if adding this article would exceed maxConsecutive from the same feed
    const recentFeeds = result.slice(-maxConsecutive).map(a => a.feedName);
    const allSameFeed = recentFeeds.length === maxConsecutive &&
                        recentFeeds.every(name => name === recentFeeds[0]);

    if (allSameFeed && nextArticle.feedName === recentFeeds[0]) {
      // We would have too many consecutive from the same feed
      // Look ahead for an article from a different feed
      const differentFeedIndex = remaining.findIndex(a => a.feedName !== nextArticle.feedName);

      if (differentFeedIndex !== -1) {
        // Found an article from a different feed, use it instead
        const swappedArticle = remaining.splice(differentFeedIndex, 1)[0];
        result.push(swappedArticle);
        // Put the original article back at the front
        remaining.unshift(nextArticle);
      } else {
        // No other feeds available, just add it anyway
        result.push(nextArticle);
      }
    } else {
      // Safe to add this article
      result.push(nextArticle);
    }
  }

  return result;
}
