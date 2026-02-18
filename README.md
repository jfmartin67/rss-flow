# RSS Flow

A minimal, web-based RSS reader with "river of news" style interface built with Next.js, Vercel KV, and Tailwind CSS.

## Features

- **River of News Interface**: Chronological stream of articles from all feeds with compact, information-dense layout
- **Time Range Filtering**: View articles from the last 24h, 3 days, or 7 days
- **Adjustable Content Preview**: Toggle between none, 1, 2, or 3 lines of preview text
- **Category Organization**: Color-coded category pills for easy scanning (17 colors including dark grey)
- **Read State Tracking**: Articles auto-mark as read when opened; click the dot to toggle read/unread manually
- **Hide Read Articles**: Filter toggle to show only unread items
- **Article Viewer Panel**: Opens articles in a right-side panel on desktop/iPad; new tab on mobile
- **AI-Powered Digest**: Unread count badge opens a Claude-generated morning-briefing abstract of your unread articles
- **AI Article Summaries**: Per-article AI summaries and key quote extraction, cached in Redis
- **Auto-Refresh**: Background polling with configurable intervals; new articles appear in a banner tap-to-load
- **Pull-to-Refresh**: Spring-physics gesture with SVG arc indicator on mobile
- **Loading Skeleton**: Polished skeleton screen on initial page load
- **Virtual Scrolling**: High-performance list rendering via `@tanstack/react-virtual`
- **Responsive Design**: Full-width layout on tablet/desktop, hamburger menu on mobile
- **Mobile-First Navigation**: Slide-out hamburger menu for touch-friendly mobile experience
- **PWA Support**: Install as a standalone app on mobile and desktop
- **Dark Mode**: Manual theme toggle with system preference support
- **Feed Management**: Admin interface for adding, editing, and removing feeds
- **Editable Feed Metadata**: Change feed names, categories, and tag colors
- **Export OPML**: Download all feed subscriptions as a standard OPML file
- **Consistent Alignment**: Fixed-width source column keeps article titles aligned

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **Database**: Vercel KV (Redis)
- **RSS Parsing**: rss-parser
- **Virtualization**: @tanstack/react-virtual
- **AI**: Vercel AI SDK + Anthropic Claude
- **Analytics**: Vercel Speed Insights
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Vercel account (for KV database)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd rss-flow
```

2. Install dependencies:
```bash
npm install
```

3. Set up Vercel KV:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Create a new KV database OR use an existing one (see note below)
   - Copy the environment variables

4. Create `.env.local` file:
```bash
cp .env.example .env.local
```

5. Add your Vercel KV credentials to `.env.local`:
```env
KV_URL=your_kv_url_here
KV_REST_API_URL=your_kv_rest_api_url_here
KV_REST_API_TOKEN=your_kv_rest_api_token_here
KV_REST_API_READ_ONLY_TOKEN=your_kv_rest_api_read_only_token_here

# Optional: Set a custom prefix if sharing KV with other projects
KV_PREFIX=rss-flow

# Optional: Required for AI digest and article summaries
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

**Important Note - Sharing KV Instance:**
If you're using a single Vercel KV instance shared with other projects, the `KV_PREFIX` environment variable ensures no key collisions occur. All Redis keys are automatically namespaced with this prefix (default: "rss-flow"). For example:
- Keys: `rss-flow:feeds:list`, `rss-flow:articles:read`
- If sharing, use different prefixes for each project (e.g., "rss-flow", "project2", etc.)

6. Generate app icons (see `public/ICONS.md` for instructions)

7. Run the development server:
```bash
npm run dev
```

8. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Adding Feeds

1. Navigate to `/admin`
2. Enter the RSS feed URL
3. Specify a category name
4. Choose a color for the category
5. Click "Add Feed"

### Reading Articles

- Articles are displayed in chronological order (newest first)
- Click any article to open it in a right-side panel (desktop/iPad) or a new tab (mobile)
- Articles are marked as read automatically when opened; click the dot indicator to toggle read/unread
- Use the time range selector to filter articles (24h, 3d, 7d)
- Adjust content preview lines for your preferred density (None, 1, 2, or 3 lines)
- Toggle **Hide Read Articles** to focus on unread items only
- Tap the red unread count badge next to the title to open the AI digest panel
- On mobile: pull down to refresh; use the hamburger menu for all controls
- On desktop: all controls are inline in the header
- If auto-refresh is enabled, new articles appear as a floating banner — tap to load them

### AI Features

AI features require an `ANTHROPIC_API_KEY` environment variable.

- **Unread Digest**: Tap the unread count badge to generate a briefing-style abstract of your current unread articles using Claude
- **Article Summaries**: Available inside the article viewer panel — AI-generated 2-3 sentence summaries cached in Redis for 90 days
- **Key Quotes**: Extract the most quotable sentences from an article, also cached for 90 days

### Exporting Feeds

- Open the hamburger menu (mobile) and tap **Export OPML** to download all your feed subscriptions as a standard `.opml` file, grouped by category
- The OPML file is compatible with all major RSS readers

### Admin Panel

- Access at `/admin`
- Add new RSS feeds with custom categories and colors
- Edit feed names, categories, and tag colors
- Delete existing feeds
- View all configured feeds with color-coded tags
- Choose from 17 predefined colors including dark grey

## Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Import the project in Vercel:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your repository

3. Configure environment variables:
   - Add all `KV_*` variables from your `.env.local`
   - Add `KV_PREFIX=rss-flow` (or your custom prefix if sharing KV with other projects)
   - Add `ANTHROPIC_API_KEY` if you want AI digest and summary features

4. Deploy:
   - Vercel will automatically build and deploy

5. Set up authentication for `/admin` (optional but recommended):
   - Go to your project settings in Vercel
   - Navigate to "Deployment Protection"
   - Enable "Vercel Authentication"
   - Configure password protection for the `/admin` route

## Data Structure

### Vercel KV Schema

All keys are automatically namespaced with the `KV_PREFIX` (default: "rss-flow"):

```
rss-flow:feeds:list        → JSON string containing array of feeds
rss-flow:articles:read     → Redis Set containing article GUIDs marked as read
rss-flow:summary:<guid>    → Cached AI summary string (90-day TTL)
rss-flow:quotes:<guid>     → Cached AI key quotes JSON array (90-day TTL)
```

This namespacing allows multiple projects to share the same KV instance without conflicts.

### Feed Object
```typescript
{
  id: string;         // Unique identifier
  url: string;        // RSS feed URL
  category: string;   // Category name
  color: string;      // Hex color code
  name: string;       // Feed name (fetched from RSS)
}
```

### Article Object
```typescript
{
  guid: string;           // Unique article identifier
  title: string;          // Article title
  link: string;           // Article URL
  pubDate: Date;          // Publication date
  content: string;        // Article content/description
  feedName: string;       // Source feed name
  feedUrl: string;        // Source feed URL
  category: string;       // Category name
  categoryColor: string;  // Category color
}
```

## Project Structure

```
rss-flow/
├── app/
│   ├── actions/
│   │   ├── ai.ts             # AI digest, summary, and quote server actions
│   │   ├── articles.ts       # Article fetching and read-state server actions
│   │   └── feeds.ts          # Feed CRUD operations
│   ├── admin/
│   │   └── page.tsx          # Admin panel
│   ├── api/
│   │   └── export/
│   │       └── opml/
│   │           └── route.ts  # OPML export endpoint
│   ├── components/
│   │   ├── ArticleItem.tsx   # Single article row
│   │   ├── ArticleModal.tsx  # Article viewer panel
│   │   ├── DigestPanel.tsx   # AI unread digest panel
│   │   ├── FeedManager.tsx   # Feed management UI
│   │   ├── HamburgerMenu.tsx # Mobile navigation drawer
│   │   ├── LoadingSkeleton.tsx # Initial load skeleton
│   │   ├── RiverView.tsx     # Main feed display and layout
│   │   └── ThemeProvider.tsx # Dark mode context
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page
├── lib/
│   ├── config.ts             # Constants and configuration
│   ├── db.ts                 # Vercel KV utilities
│   ├── extract.ts            # Article content extraction
│   ├── rss.ts                # RSS parsing
│   ├── sanitize.ts           # HTML sanitization
│   └── utils.ts              # Helper functions
├── types/
│   └── index.ts              # TypeScript definitions
└── public/
    ├── manifest.json         # PWA manifest
    └── icon.svg              # App icon source
```

## Features Roadmap

- [x] Export OPML
- [ ] Import OPML
- [ ] Search functionality
- [ ] Keyboard shortcuts
- [ ] Article starring/bookmarking
- [ ] Multi-user support
- [ ] Feed health monitoring
- [ ] Custom refresh intervals per feed

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
