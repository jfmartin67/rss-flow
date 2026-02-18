import { getFeeds } from '@/lib/db';
import { Feed } from '@/types';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const feeds = await getFeeds();

  // Group feeds by category
  const byCategory = new Map<string, Feed[]>();
  for (const feed of feeds) {
    const cat = feed.category || 'Uncategorized';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(feed);
  }

  // Sort categories alphabetically, feeds within each category by name
  const sortedCategories = [...byCategory.keys()].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  const outlines = sortedCategories.map((category) => {
    const categoryFeeds = byCategory.get(category)!.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
    const feedOutlines = categoryFeeds
      .map(
        (f) =>
          `      <outline type="rss" text="${escapeXml(f.name)}" title="${escapeXml(f.name)}" xmlUrl="${escapeXml(f.url)}" />`
      )
      .join('\n');
    return `    <outline text="${escapeXml(category)}">\n${feedOutlines}\n    </outline>`;
  }).join('\n');

  const dateCreated = new Date().toUTCString();
  const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>RSS Flow Subscriptions</title>
    <dateCreated>${dateCreated}</dateCreated>
  </head>
  <body>
${outlines}
  </body>
</opml>`;

  return new Response(opml, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rss-flow-subscriptions.opml"',
    },
  });
}
