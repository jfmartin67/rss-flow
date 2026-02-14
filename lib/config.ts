// Pull-to-refresh physics
export const PULL_THRESHOLD = 64;        // px of drag needed to trigger refresh
export const INDICATOR_HEIGHT = 56;      // px height of the resting spinner area
export const ARC_RADIUS = 9;             // radius of the SVG progress arc
export const SPRING_STIFFNESS_BOUNCE = 360;
export const SPRING_STIFFNESS_SNAP = 680;
export const SPRING_DAMPING_BOUNCE = 24;
export const SPRING_DAMPING_SNAP = 52;

// Content display
export const CONTENT_TRUNCATE_CHARS: Record<1 | 2 | 3, number> = { 1: 200, 2: 400, 3: 600 };
export const VIRTUAL_ITEM_HEIGHT: Record<0 | 1 | 2 | 3, number> = { 0: 37, 1: 62, 2: 82, 3: 102 };
export const VIRTUAL_OVERSCAN = 8;

// RSS parsing & content extraction
export const RSS_PARSER_TIMEOUT = 10000;           // ms before aborting a feed fetch
export const RSS_EXCERPT_THRESHOLD = 1000;         // chars below which RSS content is treated as an excerpt
export const RSS_CONTENT_MIN_LENGTH = 500;         // chars below which RSS content is not used directly
export const EXTRACT_READABILITY_CHAR_THRESHOLD = 500; // Readability minimum char count
export const EXTRACT_MIN_CONTENT_LENGTH = 200;     // minimum extracted length to consider valid

// AI
export const AI_MODEL = 'claude-3-5-haiku-20241022';
export const AI_MAX_INPUT_CHARS = 15000;           // max chars sent to Claude (~3000 words)
export const AI_CACHE_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days
export const AI_MAX_QUOTES = 3;
export const AI_MAX_QUOTE_LENGTH = 500;

// Feed display & interleaving
export const FEED_MAX_CONSECUTIVE = 2;             // max consecutive articles from the same feed
export const FEED_VELOCITY_THRESHOLDS = { '24h': 1, '3d': 2, '7d': 3 } as const;

// Statistics
export const STATS_WINDOW_DAYS = 7;
