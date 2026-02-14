import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize HTML from untrusted sources (RSS feeds, scraped pages) before
 * rendering with dangerouslySetInnerHTML. Uses a strict allowlist that covers
 * everything Readability and typical RSS feeds produce while blocking all
 * script vectors (event handlers, javascript: URLs, data: URIs, iframes, etc.).
 */
export function sanitizeArticleHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      // Block
      'p', 'div', 'section', 'article', 'main', 'header', 'footer',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'blockquote', 'pre', 'code', 'hr', 'br',
      'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
      // Inline
      'a', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins',
      'abbr', 'acronym', 'cite', 'q', 'time', 'mark', 'small', 'sub', 'sup',
      'span', 'img',
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'rel', 'target'],
      'img': ['src', 'alt', 'title', 'width', 'height', 'loading'],
      'td': ['colspan', 'rowspan'],
      'th': ['colspan', 'rowspan', 'scope'],
      'abbr': ['title'],
      'acronym': ['title'],
      'time': ['datetime'],
      '*': ['class'],  // allow class on everything (for prose styles)
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https'],  // no data: URIs for images
    },
    transformTags: {
      // Force external links to open safely
      'a': (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
    },
  });
}
