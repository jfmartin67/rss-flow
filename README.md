# RSS Flow

A minimal, web-based RSS reader with "river of news" style interface built with Next.js, Vercel KV, and Tailwind CSS.

## Features

- **River of News Interface**: Chronological stream of articles from all feeds
- **Time Range Filtering**: View articles from 24h, 3d, or 7d
- **Adjustable Content Preview**: Toggle between 1, 2, or 3 lines of content
- **Category Organization**: Color-coded category pills for easy scanning
- **Read State Tracking**: Mark articles as read automatically when clicked
- **PWA Support**: Install as a standalone app on mobile and desktop
- **Dark Mode**: Automatic dark mode support based on system preferences
- **Feed Management**: Simple admin interface for adding/removing feeds

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **Database**: Vercel KV (Redis)
- **RSS Parsing**: rss-parser
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
   - Create a new KV database
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
```

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
- Click any article to open it in a new tab and mark it as read
- Use the time range selector to filter articles
- Adjust content preview lines for your preferred density

### Admin Panel

- Access at `/admin`
- Add new RSS feeds
- Delete existing feeds
- View all configured feeds

## Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Import the project in Vercel:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your repository

3. Configure environment variables:
   - Add all `KV_*` variables from your `.env.local`

4. Deploy:
   - Vercel will automatically build and deploy

5. Set up authentication for `/admin` (optional but recommended):
   - Go to your project settings in Vercel
   - Navigate to "Deployment Protection"
   - Enable "Vercel Authentication"
   - Configure password protection for the `/admin` route

## Data Structure

### Vercel KV Schema

```
feeds:list          → JSON string containing array of feeds
articles:read       → Redis Set containing article GUIDs marked as read
```

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
  category: string;       // Category name
  categoryColor: string;  // Category color
}
```

## Project Structure

```
rss-flow/
├── app/
│   ├── actions/
│   │   ├── articles.ts       # Article server actions
│   │   └── feeds.ts          # Feed CRUD operations
│   ├── admin/
│   │   └── page.tsx          # Admin panel
│   ├── components/
│   │   ├── ArticleItem.tsx   # Single article component
│   │   ├── FeedManager.tsx   # Feed management UI
│   │   └── RiverView.tsx     # Main feed display
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page
├── lib/
│   ├── db.ts                 # Vercel KV utilities
│   ├── rss.ts                # RSS parsing
│   └── utils.ts              # Helper functions
├── types/
│   └── index.ts              # TypeScript definitions
└── public/
    ├── manifest.json         # PWA manifest
    └── icon.svg              # App icon source
```

## Features Roadmap

- [ ] Search functionality
- [ ] Export OPML
- [ ] Import OPML
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
