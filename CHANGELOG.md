# Changelog

All notable changes to RSS Flow are listed here, grouped by feature area and date.

---

## 2026-03-03

### Fixed
- Article modal now opens correctly when "Hide Read Articles" is enabled — the article was being filtered out of the list the moment it was marked read, unmounting the component before the modal could render. Local read-state update is now deferred to when the modal is closed.

### Changed
- Read dot is now vertically centered within the article row.
- Read dot inflates on hover as tactile UI feedback.

### Improved
- Read stats (feed read-rate in admin) now only count articles opened in full, not articles marked read via the dot. A separate `articles:opened` Redis set tracks full opens.

---

## 2026-03-02

### Added
- **By Source** display mode: groups articles by feed with collapsible sections, useful for catching up on a single source.
- OPML export now respects the active view and category filters.

---

## 2026-02-28

### Added
- Feed favicons displayed on article cards (river, frontpage) and in the article modal.

### Improved
- Read dot is larger with a bigger tap/click hit area for easier interaction on mobile.
- Frontpage cards fade out and are removed from the DOM when marked as read via the dot.

---

## 2026-02-23

### Fixed
- Wrong article content shown in modal when opening articles in quick succession.
- Default view and auto-refresh interval now restored correctly from localStorage.

---

## 2026-02-22 — Frontpage Display Mode

### Added
- **Frontpage** display mode: newspaper-style masonry card grid with article images, category color accents, and image skeleton loading.
- Reading stats slide-in panel (bar chart icon in toolbar) showing per-feed read rates.
- Per-category unread counts shown in filter pills.
- Frontpage cards show 4 columns on large screens.

---

## 2026-02-?? — Views & Admin Improvements

### Added
- **Views**: group feeds into named views (e.g. "Work", "Personal") with a main-page switcher. Views persist in localStorage.
- View renaming in admin bulk-renames all feeds in a view at once.
- Category and view autocomplete in the add/edit feed forms.
- OPML export (desktop toolbar and hamburger menu).

### Changed
- AI model updated to `claude-haiku-4-5-20251001`.
- View switcher moved inline with time range and content lines controls.
- Desktop toolbar compacted: smaller segments, no labels, divider added.

### Fixed
- Articles disappearing after a view is renamed.
- View datalist not showing dropdown in the add-feed form.
- Page reload after adding a feed replaced with an in-place state update (#11).
- Duplicate feed URL validation in `addFeed` server action (#4).
- Feed URL format validated client-side before submitting (#5).
- Empty feed list vs. fetch error now correctly distinguished (#6).
- 10-second timeout added to article content fetch (#3).
- Permanent spinner and infinite retry loop in AI summary and key quotes (#7).
- `AI_APICallError` (credit balance, auth issues) caught cleanly without a stack trace.
- Fixed variable name clash in `getAllFeedStatistics`.
- Fixed `MapIterator` spread for lower TypeScript targets.

---

## 2026-02-?? — AI Digest & Article Viewer

### Added
- **AI Digest**: generates a plain-language summary of all unread articles in the current view.
- **AI Summary**: auto-generated summary shown at the top of each article modal.
- **AI Key Quotes**: extracted key quotes shown in the article modal.
- All AI results cached in Redis (90-day TTL).
- 30-second timeout on AI summary and key quote generation.
- Article modal opens as a right-side slide-in panel on desktop/iPad.
- "Send to Microblog" button on AI summaries and key quotes.

### Improved
- Article modal content is selectable; right-click (desktop) or long-press (mobile) shows a context menu to copy a quote or send it to microblog with Markdown citation.
- Text selection preserved visually while context menu is open.

---

## 2026-02-?? — Feed Management & Core UX

### Added
- **Auto-refresh** with a "N new articles — tap to load" banner instead of interrupting the current read.
- **Mark as Unread**: read dot now toggles read state in both directions.
- **Mark All as Read** button and unread count badge.
- **Hide Read Articles** toggle.
- **Collapsible category filter** with mobile landscape support.
- Low-velocity feed articles highlighted with a blue left border.
- Unread count badge in filter pills (mobile).
- Menu auto-closes after selecting an item.

### Improved
- Article list virtualized with `@tanstack/react-virtual` for smooth scrolling over large feeds.
- Smart interleaving balances high-velocity and low-velocity feeds.
- Pull-to-refresh rewritten with spring physics and SVG arc indicator.
- Loading skeleton shown on initial page load.
- Feed statistics batch-fetched to avoid N+1 queries.
- Feed statistics panel in admin with per-feed read rates and article velocity.
- Color picker for feed category color in admin.
- Hamburger menu for mobile/tablet with smooth animations.
- Fixed-width metadata column for consistent title alignment.

### Fixed
- Article modal broken by virtualizer CSS transform.
- RSS and scraped HTML sanitized before rendering in article modal.
- Lazy content loading with fallback to feed snippet.

---

## 2026-01-21 — Initial Release

### Added
- RSS feed reader built with Next.js 14 App Router, TypeScript, and Tailwind CSS.
- Feed management (add, edit, delete) with category labels and color coding.
- River-of-news article list with configurable content preview lines (0–3).
- Unread/read state tracked per article in Redis.
- Time range filter (1h, 6h, 24h, 3d, 7d).
- Dark/light mode toggle persisted in localStorage.
- Progressive Web App (PWA) support.
- Vercel KV (Redis via ioredis) for persistent storage.
- OPML import/export.
- Vercel Speed Insights.
