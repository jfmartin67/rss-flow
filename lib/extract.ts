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
    // Fetch the article page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

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
      return null;
    }

    // Validate that we got meaningful content
    if (article.content.length < 200) {
      return null;
    }

    return article.content;
  } catch (error) {
    console.error(`Error extracting article from ${url}:`, error);
    return null;
  }
}
