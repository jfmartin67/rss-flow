'use server';

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import Redis from 'ioredis';

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
    const maxChars = 15000;
    const truncatedContent = plainText.length > maxChars
      ? plainText.substring(0, maxChars) + '...'
      : plainText;

    console.log(`Generating summary for ${articleGuid} (${truncatedContent.length} chars)`);

    // Generate summary using Claude
    const { text } = await generateText({
      model: anthropic('claude-3-5-haiku-20241022'), // Fast and cost-effective
      prompt: `Summarize the following article in 2-3 concise sentences. Focus on the main points and key takeaways:\n\n${truncatedContent}`,
    });

    // Cache for 90 days (Redis EX is in seconds)
    await redis.set(cacheKey, text, 'EX', 60 * 60 * 24 * 90);

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
