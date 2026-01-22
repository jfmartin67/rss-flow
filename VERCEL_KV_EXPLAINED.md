# Vercel KV Environment Variables Explained

## Quick Answer
**You need ALL 4 variables**, but you don't need to understand them in detail - Vercel provides all of them automatically when you connect a KV database. Just copy all 4 from the Vercel dashboard.

## Detailed Explanation

### What is Vercel KV?
Vercel KV is a Redis-compatible database service built on Upstash Redis. It's optimized for serverless environments.

### The 4 Environment Variables

#### 1. `KV_URL` (Direct Redis Connection)
```
KV_URL=redis://default:***@bold-falcon-12345.upstash.io:6379
```
- **What**: Traditional Redis connection string
- **Protocol**: Redis wire protocol (TCP, port 6379)
- **Use case**: Direct Redis connections (persistent connections)
- **Not ideal for**: Serverless functions (connection overhead)

#### 2. `KV_REST_API_URL` (HTTP Endpoint)
```
KV_REST_API_URL=https://bold-falcon-12345.upstash.io
```
- **What**: HTTP REST API endpoint for Redis operations
- **Protocol**: HTTPS (port 443)
- **Use case**: Serverless functions (stateless HTTP requests)
- **Ideal for**: Vercel Edge Functions, API Routes, Server Actions

#### 3. `KV_REST_API_TOKEN` (Write Token)
```
KV_REST_API_TOKEN=AaaaBbbbCcccDdddEeee1234567890
```
- **What**: Authentication token with **full access** (read + write)
- **Permissions**: Can perform ANY Redis operation (GET, SET, SADD, DEL, etc.)
- **Used by**: Write operations (saving feeds, marking as read)
- **Security**: Keep this secret, only use server-side

#### 4. `KV_REST_API_READ_ONLY_TOKEN` (Read Token)
```
KV_REST_API_READ_ONLY_TOKEN=XxxxYyyyZzzz9876543210
```
- **What**: Authentication token with **read-only access**
- **Permissions**: Can only perform read operations (GET, SMEMBERS, etc.)
- **Used by**: Optional - can be used for read operations for extra security
- **Security**: Less risky if exposed, but still keep it server-side

## How RSS Flow Uses Them

Our application uses the `@vercel/kv` SDK, which automatically:

1. **Detects the environment** (serverless vs. traditional server)
2. **Chooses the best connection method**:
   - **Serverless (Vercel)**: Uses REST API (KV_REST_API_URL + tokens)
   - **Traditional server**: Uses direct Redis (KV_URL)
3. **Selects the appropriate token**:
   - Read operations: Can use read-only token
   - Write operations: Requires full access token

### Example Operations in RSS Flow

```typescript
// These use REST API with KV_REST_API_TOKEN (write token)
await kv.set('rss-flow:feeds:list', JSON.stringify(feeds));  // SET operation
await kv.sadd('rss-flow:articles:read', articleGuid);        // SADD operation

// These use REST API with KV_REST_API_READ_ONLY_TOKEN (read token)
await kv.get('rss-flow:feeds:list');                         // GET operation
await kv.smembers('rss-flow:articles:read');                 // SMEMBERS operation
```

The `@vercel/kv` SDK handles all this automatically - you don't need to choose which token to use.

## Why This Architecture?

### Serverless-Friendly
Traditional Redis connections require:
- Opening TCP connection (slow)
- Keeping connection alive (costs memory)
- Closing connection (overhead)

REST API approach:
- Single HTTP request (fast)
- No persistent state (serverless-friendly)
- Auto-scaling friendly

### Security Layers
Having separate tokens allows:
- **Defense in depth**: Read-only token limits damage if leaked
- **Principle of least privilege**: Use minimum required permissions
- **Audit trail**: Different tokens can be tracked separately

## What You Need to Do

### For Local Development:
1. Create a Vercel KV database in the dashboard
2. Copy **ALL 4 variables** from the ".env.local" tab
3. Paste them into your `.env.local` file
4. Add `KV_PREFIX=rss-flow`

### For Vercel Deployment:
1. Go to Project Settings → Environment Variables
2. Add **ALL 4 KV variables** (Vercel may auto-populate these)
3. Add `KV_PREFIX=rss-flow`
4. Deploy

## Common Questions

**Q: Can I use just KV_URL?**
A: Technically yes, but not recommended for Vercel deployments. The REST API method is optimized for serverless.

**Q: Do I need the read-only token?**
A: The SDK uses it automatically when appropriate. Always provide all 4 variables.

**Q: What if I'm sharing KV with another project?**
A: All credentials are the same (same database), but use different `KV_PREFIX` values to namespace the keys.

**Q: Are these secrets secure?**
A: Yes, keep them server-side only. Never expose in client-side code or commit to Git.

## Summary

| Variable | Purpose | Required | Used For |
|----------|---------|----------|----------|
| `KV_URL` | Direct Redis connection | Yes | Fallback/traditional |
| `KV_REST_API_URL` | HTTP endpoint | Yes | Serverless primary |
| `KV_REST_API_TOKEN` | Full access | Yes | Write operations |
| `KV_REST_API_READ_ONLY_TOKEN` | Read access | Yes | Read operations |
| `KV_PREFIX` | Key namespace | Recommended | Multi-project KV |

**TL;DR**: Copy all 4 KV variables from Vercel dashboard + add `KV_PREFIX=rss-flow`. Done!
