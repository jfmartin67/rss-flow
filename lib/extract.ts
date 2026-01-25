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
    console.log(`Attempting to extract full article from: ${url}`);

    // Fetch the article page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch article: ${response.status}`);
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
    const reader = new Readability(document);
    const article = reader.parse();

    if (!article || !article.content) {
      console.log('Readability could not extract article content');
      return null;
    }

    // Validate that we got meaningful content
    if (article.content.length < 100) {
      console.log('Extracted content too short, likely not article content');
      return null;
    }

    console.log(`Successfully extracted article: ${article.title} (${article.content.length} chars)`);

    return article.content;
  } catch (error) {
    console.error(`Error extracting article from ${url}:`, error);
    return null;
  }
}
