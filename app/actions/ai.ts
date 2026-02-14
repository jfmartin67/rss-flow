'use server';

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import Redis from 'ioredis';
import { AI_MODEL, AI_MAX_INPUT_CHARS, AI_CACHE_TTL_SECONDS, AI_MAX_QUOTES, AI_MAX_QUOTE_LENGTH } from '@/lib/config';

export interface DigestResult {
  success: boolean;
  abstract?: string;
  error?: string;
}

// Namespace prefix to match the rest of the app
const KV_PREFIX = process.env.KV_PREFIX || 'rss-flow';

// Create Redis client using the same connection as the rest of the app
const redis = new Redis(process.env.KV_URL || process.env.REDIS_URL || '', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

// Ensure connection is established
redis.connect().catch(err => {
  console.error('Redis connection error:', err);
});

/**
 * Generate an AI summary for an article using Claude
 * Summaries are cached in Redis for 90 days to minimize API calls
 */
export async function generateSummary(content: string, articleGuid: string): Promise<{ success: boolean; summary?: string; error?: string }> {
  try {
    // Check cache first
    const cacheKey = `${KV_PREFIX}:summary:${articleGuid}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      console.log(`Using cached summary for ${articleGuid}`);
      return { success: true, summary: cached };
    }

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('ANTHROPIC_API_KEY not configured');
      return { success: false, error: 'AI summarization not configured' };
    }

    // Strip HTML tags for cleaner input
    const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // Limit content length to avoid excessive token usage (roughly 3000 words)
    const truncatedContent = plainText.length > AI_MAX_INPUT_CHARS
      ? plainText.substring(0, AI_MAX_INPUT_CHARS) + '...'
      : plainText;

    console.log(`Generating summary for ${articleGuid} (${truncatedContent.length} chars)`);

    // Generate summary using Claude
    const { text } = await generateText({
      model: anthropic(AI_MODEL), // Fast and cost-effective
      prompt: `Summarize the following article in 2-3 concise sentences. Focus on the main points and key takeaways:\n\n${truncatedContent}`,
    });

    // Cache for 90 days (Redis EX is in seconds)
    await redis.set(cacheKey, text, 'EX', AI_CACHE_TTL_SECONDS);

    console.log(`Summary generated and cached for ${articleGuid}`);
    return { success: true, summary: text };

  } catch (error) {
    console.error('Error generating summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate summary'
    };
  }
}

/**
 * Extract key quotes from an article using Claude
 * Quotes are cached in Redis for 90 days to minimize API calls
 */
export async function extractKeyQuotes(content: string, articleGuid: string): Promise<{ success: boolean; quotes?: string[]; error?: string }> {
  try {
    // Check cache first
    const cacheKey = `${KV_PREFIX}:quotes:${articleGuid}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      console.log(`Using cached quotes for ${articleGuid}`);
      try {
        const quotes = JSON.parse(cached);
        return { success: true, quotes };
      } catch {
        // Invalid cache, continue to regenerate
      }
    }

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('ANTHROPIC_API_KEY not configured');
      return { success: false, error: 'AI quote extraction not configured' };
    }

    // Strip HTML tags for cleaner input
    const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // Limit content length to avoid excessive token usage
    const truncatedContent = plainText.length > AI_MAX_INPUT_CHARS
      ? plainText.substring(0, AI_MAX_INPUT_CHARS) + '...'
      : plainText;

    console.log(`Extracting key quotes for ${articleGuid} (${truncatedContent.length} chars)`);

    // Extract quotes using Claude
    const { text } = await generateText({
      model: anthropic(AI_MODEL),
      prompt: `Extract 2-3 of the most important, quotable, or insightful sentences from the following article. These should be complete sentences that stand alone and capture key insights, arguments, or facts. Return ONLY the quotes, one per line, without numbering or additional commentary:\n\n${truncatedContent}`,
    });

    // Parse quotes (split by newlines, filter empty)
    const quotes = text
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0 && q.length < AI_MAX_QUOTE_LENGTH)
      .slice(0, AI_MAX_QUOTES);

    if (quotes.length === 0) {
      return { success: false, error: 'No quotes extracted' };
    }

    await redis.set(cacheKey, JSON.stringify(quotes), 'EX', AI_CACHE_TTL_SECONDS);

    console.log(`${quotes.length} quotes extracted and cached for ${articleGuid}`);
    return { success: true, quotes };

  } catch (error) {
    console.error('Error extracting quotes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract quotes'
    };
  }
}

/**
 * Generate a thematic digest of unread article titles using Claude.
 * Groups articles into 2-5 topic clusters with a short intro.
 * Not cached — unread list changes with every read action.
 */
export async function generateUnreadDigest(
  articles: Array<{ guid: string; title: string; feedName: string; link: string }>
): Promise<DigestResult> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { success: false, error: 'AI not configured' };
    }

    // Cap at 100 articles to keep prompt size reasonable
    const capped = articles.slice(0, 100);

    const articlesForPrompt = capped.map((a, i) => ({
      index: i,
      title: a.title,
      feedName: a.feedName,
    }));

    const { text } = await generateText({
      model: anthropic(AI_MODEL),
      prompt: `You are a reading digest assistant. Write a dense, informative abstract of the following unread RSS article titles — like a morning briefing paragraph. Cover the main topics and notable stories in 3-5 sentences. Be specific about subjects, names, and themes. Plain prose only, no bullet points, no headers.

Article titles:
${articlesForPrompt.map(a => `- ${a.title} (${a.feedName})`).join('\n')}`,
    });

    return { success: true, abstract: text.trim() };

  } catch (error) {
    console.error('Error generating digest:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate digest',
    };
  }
}
