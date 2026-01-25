import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

/**
 * Extracts the full article content from a URL using Mozilla Readability.
 * This is useful when RSS feeds only provide excerpts.
 * Uses the same algorithm as Firefox Reader Mode for reliable extraction.
 * Uses linkedom (lightweight DOM) for serverless compatibility.
 *
 * @param url - The URL of the article to extract
 * @returns The extracted article content (HTML) or null if extraction fails
 */
export async function extractFullArticle(url: string): Promise<string | null> {
  try {
    console.log(`[Extract] Attempting to extract full article from: ${url}`);

    // Fetch the article page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      console.error(`[Extract] Failed to fetch article: ${response.status} ${response.statusText}`);
      return null;
    }

    const html = await response.text();
    console.log(`[Extract] Fetched HTML (${html.length} chars)`);

    // Create a DOM using linkedom (lightweight, serverless-friendly)
    const { document } = parseHTML(html);

    // Set the document's baseURI for relative links
    Object.defineProperty(document, 'documentURI', {
      value: url,
      writable: false,
    });

    // Use Mozilla Readability to parse the article
    const reader = new Readability(document, {
      debug: false,
      charThreshold: 500, // Minimum character count
    });
    const article = reader.parse();

    if (!article || !article.content) {
      console.warn(`[Extract] Readability could not extract article content from ${url}`);
      return null;
    }

    // Validate that we got meaningful content
    if (article.content.length < 200) {
      console.warn(`[Extract] Extracted content too short (${article.content.length} chars), likely not article content`);
      return null;
    }

    const textLength = article.textContent?.length || 0;
    console.log(`[Extract] Successfully extracted article: "${article.title}" (${article.content.length} chars HTML, ${textLength} chars text)`);

    return article.content;
  } catch (error) {
    console.error(`[Extract] Error extracting article from ${url}:`, error);
    return null;
  }
}
