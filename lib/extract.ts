import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

/**
 * Extracts the full article content from a URL using Mozilla's Readability algorithm.
 * This is useful when RSS feeds only provide excerpts.
 *
 * @param url - The URL of the article to extract
 * @returns The extracted article content (HTML) or null if extraction fails
 */
export async function extractFullArticle(url: string): Promise<string | null> {
  try {
    // Fetch the article page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS-Flow/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch article: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Parse with JSDOM
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.content) {
      return null;
    }

    return article.content;
  } catch (error) {
    console.error(`Error extracting article from ${url}:`, error);
    return null;
  }
}
