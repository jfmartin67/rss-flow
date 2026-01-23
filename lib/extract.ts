import * as cheerio from 'cheerio';

/**
 * Extracts the full article content from a URL using a lightweight extraction algorithm.
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
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, iframe, .ad, .ads, .advertisement, .social-share, .comments').remove();

    // Try to find main content in order of preference
    let content = $('article').first();

    if (content.length === 0) {
      content = $('main').first();
    }

    if (content.length === 0) {
      content = $('[role="main"]').first();
    }

    if (content.length === 0) {
      // Find the element with the most paragraph content
      let maxLength = 0;
      let bestElement = null;

      $('div').each((_, element) => {
        const textLength = $(element).find('p').text().length;
        if (textLength > maxLength) {
          maxLength = textLength;
          bestElement = element;
        }
      });

      if (bestElement) {
        content = $(bestElement);
      }
    }

    if (content.length === 0) {
      return null;
    }

    // Clean up the content
    const extractedHtml = content.html();

    if (!extractedHtml || extractedHtml.length < 100) {
      return null;
    }

    return extractedHtml;
  } catch (error) {
    console.error(`Error extracting article from ${url}:`, error);
    return null;
  }
}
