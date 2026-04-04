# Redis + JWT Low-Latency Rollout

This project now supports an optional Redis-backed event transport on top of the existing Supabase database flow.

## Why this is the right migration path

- Supabase remains the system of record for auth, RLS, teams, players, bids, and slides.
- Redis is used as the low-latency fan-out layer for auction events.
- The UI can keep working if Redis is not configured because the app falls back to Supabase broadcast refreshes.
- Supabase Auth already uses JWT access tokens for sessions. The new `AUCTION_JWT_SECRET` is only for short-lived stream tokens used by the Redis event route.

## What was added

- `app/api/auth/auction-token/route.ts`
  Mints a short-lived JWT for an authenticated user.
- `app/api/auction/events/route.ts`
  Proxies Redis pub/sub events to the browser with server-sent events.
- `lib/auction-stream-token.ts`
  Signs and verifies the short-lived stream JWT.
- `lib/redis.ts`
  Publishes auction events to Upstash Redis.
- `components/auction/realtime-refresh.tsx`
  Prefers Redis SSE and falls back to the original Supabase channel if Redis or JWT config is missing.

## Required environment variables

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
AUCTION_JWT_SECRET=
```

## Recommended production setup

1. Keep Supabase Auth and Postgres exactly as they are.
2. Provision Upstash Redis.
3. Set the three environment variables above in local and production environments.
4. Apply the new database migration:
   `supabase/migrations/002_queue_order.sql`
5. Redeploy the app.

## Notes

- The current UI still uses `router.refresh()` after events, so Redis improves event delivery latency first.
- The next latency step after this would be replacing page refreshes with direct client-side state patches for bids, timer, and queue updates.
- `AUCTION_JWT_SECRET` should be a long random secret, at least 32 bytes of entropy.
