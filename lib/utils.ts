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
