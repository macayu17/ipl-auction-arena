# Supabase Setup

This project is already wired for Supabase Auth, Postgres, and Realtime Broadcast.
Use this checklist to get the hosted project live with minimal delay.

## 1. Create the Supabase project

1. Go to the Supabase dashboard and create a new project.
2. Copy the project URL, anon key, service role key, and project ref.
3. Copy [.env.example](f:\IPL Auction\mock-ipl-auction\.env.example) to `.env.local`.
4. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_PROJECT_REF`
   - `AUCTION_ADMIN_EMAIL`
   - `AUCTION_ADMIN_PASSWORD`

## 2. Run the database migration

Open the Supabase dashboard SQL editor and run:

- [supabase/migrations/001_initial.sql](f:\IPL Auction\mock-ipl-auction\supabase\migrations\001_initial.sql)

What it does:
- creates the auction tables
- seeds the 10 IPL teams
- creates the single `auction_state` row
- enables RLS policies
- sets up Realtime Broadcast triggers on auction tables
- creates the `team_credentials` table for captain handoff

## 3. Bootstrap the users

Run this from the project root after `.env.local` is filled:

```powershell
node --env-file=.env.local .\scripts\setup-auction.mjs
```

This script will:
- create or update the admin user
- create or update all 10 team users
- link `teams.user_id`
- store captain login credentials in `team_credentials`

## 4. Regenerate database types

If you have the Supabase CLI available, run:

```powershell
npx supabase gen types typescript --project-id YOUR_PROJECT_REF --schema public > .\types\database.types.ts
```

Replace `YOUR_PROJECT_REF` with the actual value or use `SUPABASE_PROJECT_REF` from your env.

## 5. Start the frontend

```powershell
npm run dev
```

Open:

- `http://127.0.0.1:3000/login`

Expected result after setup:
- admin credentials route to `/admin/auction`
- captain credentials route to `/team/auction`
- preview warnings disappear once the app can read a valid authenticated user and linked team row

## 6. Realtime strategy for low delay

This project is set up to use Supabase Realtime Broadcast for live auction tables.

Why:
- Broadcast is the recommended Supabase approach for scalability and security
- your auction only has about 11 concurrent users
- bid payloads are tiny

Recommended live events:
- `auction_state` updates
- `bids` inserts
- `players` sale status changes
- `teams` purse updates

## 7. Event-day flow

1. Run the SQL migration.
2. Run the bootstrap script.
3. Test one admin login and one captain login.
4. Add/import players.
5. Open the admin screen on the auctioneer machine.
6. Open each team screen on phone or laptop.
7. Start the auction.

## 8. Official references

- Supabase Next.js auth quickstart: https://supabase.com/docs/guides/auth/quickstarts/nextjs
- Supabase Broadcast docs: https://supabase.com/docs/guides/realtime/broadcast
- Supabase database changes guide: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
- Supabase admin auth API: https://supabase.com/docs/reference/javascript/admin-api
