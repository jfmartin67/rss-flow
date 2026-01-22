# Deployment Notes - Shared Vercel KV Instance

## Issue
Vercel KV database creation failed, requiring the use of an existing KV instance that is shared with another project.

## Solution Implemented
Added **key namespacing** to prevent collisions when multiple projects share the same Redis/KV instance.

### Changes Made

#### 1. Updated `lib/db.ts`
- Added `KV_PREFIX` environment variable support
- Default prefix: `rss-flow`
- All Redis keys are now automatically namespaced:
  - `rss-flow:feeds:list`
  - `rss-flow:articles:read`

```typescript
const KV_PREFIX = process.env.KV_PREFIX || 'rss-flow';
const FEEDS_KEY = `${KV_PREFIX}:feeds:list`;
const READ_ARTICLES_KEY = `${KV_PREFIX}:articles:read`;
```

#### 2. Updated `.env.example`
- Added `KV_PREFIX` configuration with documentation
- Explains the importance of unique prefixes when sharing KV instances

#### 3. Updated `README.md`
- Added section explaining shared KV instance usage
- Updated environment variable setup instructions
- Updated data structure documentation to show namespaced keys
- Added deployment notes about `KV_PREFIX`

### Benefits
1. **No Key Collisions**: Each project uses its own namespace
2. **Flexible**: Easily configurable via environment variable
3. **Safe Default**: Uses "rss-flow" as default prefix
4. **Multi-Project**: Same KV instance can host unlimited projects

### Deployment Configuration

When deploying to Vercel with a shared KV instance:

1. **Set Environment Variables:**
   ```
   KV_URL=<shared_kv_url>
   KV_REST_API_URL=<shared_kv_api_url>
   KV_REST_API_TOKEN=<shared_kv_token>
   KV_REST_API_READ_ONLY_TOKEN=<shared_kv_read_only_token>
   KV_PREFIX=rss-flow
   ```

2. **For Other Projects:** Use different prefixes
   - Project 1: `KV_PREFIX=rss-flow`
   - Project 2: `KV_PREFIX=project2`
   - Project 3: `KV_PREFIX=my-app`

### Original Plan Changes

**Original Plan Statement:**
> Data retention limited to 7 days (can be implemented via TTL or cleanup job)

**Current Status:**
- Key namespacing implemented ✓
- Data retention not yet implemented
- Can be added later via Redis TTL or scheduled cleanup job

**Original Plan Statement:**
> One KV database per project

**Updated Reality:**
- One shared KV database across multiple projects
- Namespacing prevents conflicts
- No functional differences from user perspective

### Testing Shared KV Setup

To verify the namespacing works correctly:

1. Check Redis keys using Vercel KV CLI or dashboard
2. All keys should be prefixed: `rss-flow:*`
3. Other projects using same KV should have different prefixes
4. No data leakage between projects

### Cost Implications
- **Positive**: Single KV instance = lower costs
- **Consideration**: Shared resource limits (storage, requests)
- **Recommendation**: Monitor KV usage across all projects

### Future Considerations

1. **Key TTL**: Implement automatic expiration for read articles
   ```typescript
   await kv.sadd(READ_ARTICLES_KEY, guid);
   await kv.expire(READ_ARTICLES_KEY, 604800); // 7 days
   ```

2. **Cleanup Job**: Scheduled task to remove old read states
3. **Monitoring**: Track KV usage per namespace

## Summary
The application now safely supports shared Vercel KV instances through automatic key namespacing. No changes are required to the core functionality, and users won't notice any difference in behavior.
