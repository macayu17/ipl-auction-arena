create extension if not exists pgcrypto;

create schema if not exists realtime;

create or replace function public.requesting_role()
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    ''
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.requesting_role() = 'admin';
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_code text not null unique,
  logo_url text,
  purse_total integer not null default 1000 check (purse_total >= 0),
  purse_spent integer not null default 0 check (purse_spent >= 0),
  user_id uuid unique references auth.users(id) on delete set null,
  color_primary text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.teams
drop constraint if exists teams_purse_spent_check;

alter table public.teams
add constraint teams_purse_spent_check
check (purse_spent <= purse_total);

create table if not exists public.team_credentials (
  team_id uuid primary key references public.teams(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete cascade,
  login_email text not null unique,
  login_password text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper')),
  nationality text not null check (nationality in ('Indian', 'Overseas')),
  base_price integer not null check (base_price > 0),
  rating integer check (rating between 1 and 100),
  batting_style text,
  bowling_style text,
  ipl_caps integer not null default 0 check (ipl_caps >= 0),
  photo_url text,
  status text not null default 'pool' check (status in ('pool', 'active', 'sold', 'unsold', 'rtm')),
  sold_to uuid references public.teams(id) on delete set null,
  sold_price integer check (sold_price >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.auction_state (
  id integer primary key default 1 check (id = 1),
  phase text not null default 'setup' check (phase in ('setup', 'live', 'paused', 'ended')),
  current_player_id uuid references public.players(id) on delete set null,
  current_bid_amount integer not null default 0 check (current_bid_amount >= 0),
  current_bid_team_id uuid references public.teams(id) on delete set null,
  timer_seconds integer not null default 10 check (timer_seconds >= 0),
  timer_active boolean not null default false,
  bid_increment integer not null default 5 check (bid_increment > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  amount integer not null check (amount > 0),
  timestamp timestamptz not null default timezone('utc', now())
);

create table if not exists public.slides (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text,
  order_index integer not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_players_status on public.players(status);
create index if not exists idx_players_sold_to on public.players(sold_to);
create index if not exists idx_bids_player_timestamp on public.bids(player_id, timestamp desc);
create index if not exists idx_bids_team_id on public.bids(team_id);
create index if not exists idx_team_credentials_user_id on public.team_credentials(user_id);

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at
before update on public.teams
for each row
execute function public.set_updated_at();

drop trigger if exists team_credentials_set_updated_at on public.team_credentials;
create trigger team_credentials_set_updated_at
before update on public.team_credentials
for each row
execute function public.set_updated_at();

drop trigger if exists players_set_updated_at on public.players;
create trigger players_set_updated_at
before update on public.players
for each row
execute function public.set_updated_at();

drop trigger if exists auction_state_set_updated_at on public.auction_state;
create trigger auction_state_set_updated_at
before update on public.auction_state
for each row
execute function public.set_updated_at();

drop trigger if exists slides_set_updated_at on public.slides;
create trigger slides_set_updated_at
before update on public.slides
for each row
execute function public.set_updated_at();

insert into public.auction_state (id)
values (1)
on conflict (id) do nothing;

insert into public.teams (name, short_code, color_primary, purse_total)
values
  ('Mumbai Indians', 'MI', '#004BA0', 1000),
  ('Chennai Super Kings', 'CSK', '#F7A721', 1000),
  ('Royal Challengers Bengaluru', 'RCB', '#C8102E', 1000),
  ('Kolkata Knight Riders', 'KKR', '#3B2585', 1000),
  ('Sunrisers Hyderabad', 'SRH', '#F7631B', 1000),
  ('Delhi Capitals', 'DC', '#0078BC', 1000),
  ('Punjab Kings', 'PBKS', '#A52735', 1000),
  ('Rajasthan Royals', 'RR', '#E4007C', 1000),
  ('Gujarat Titans', 'GT', '#1B3A6B', 1000),
  ('Lucknow Super Giants', 'LSG', '#A0C4E8', 1000)
on conflict (short_code) do update
set
  name = excluded.name,
  color_primary = excluded.color_primary,
  purse_total = excluded.purse_total;

alter table public.teams enable row level security;
alter table public.team_credentials enable row level security;
alter table public.players enable row level security;
alter table public.auction_state enable row level security;
alter table public.bids enable row level security;
alter table public.slides enable row level security;

drop policy if exists "teams_select_admin_or_own" on public.teams;
create policy "teams_select_admin_or_own"
on public.teams
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
);

drop policy if exists "teams_admin_all" on public.teams;
create policy "teams_admin_all"
on public.teams
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "team_credentials_admin_only" on public.team_credentials;
create policy "team_credentials_admin_only"
on public.team_credentials
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "players_select_authenticated" on public.players;
create policy "players_select_authenticated"
on public.players
for select
to authenticated
using (true);

drop policy if exists "players_admin_write" on public.players;
create policy "players_admin_write"
on public.players
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "auction_state_select_authenticated" on public.auction_state;
create policy "auction_state_select_authenticated"
on public.auction_state
for select
to authenticated
using (true);

drop policy if exists "auction_state_admin_write" on public.auction_state;
create policy "auction_state_admin_write"
on public.auction_state
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "bids_select_authenticated" on public.bids;
create policy "bids_select_authenticated"
on public.bids
for select
to authenticated
using (true);

drop policy if exists "bids_insert_team_live_only" on public.bids;
create policy "bids_insert_team_live_only"
on public.bids
for insert
to authenticated
with check (
  public.requesting_role() = 'team'
  and exists (
    select 1
    from public.teams
    where teams.id = bids.team_id
      and teams.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.auction_state
    where auction_state.id = 1
      and auction_state.phase = 'live'
      and auction_state.current_player_id = bids.player_id
      and bids.amount >= auction_state.current_bid_amount + auction_state.bid_increment
  )
  and exists (
    select 1
    from public.teams
    where teams.id = bids.team_id
      and (teams.purse_total - teams.purse_spent) >= bids.amount
  )
);

drop policy if exists "bids_admin_manage" on public.bids;
create policy "bids_admin_manage"
on public.bids
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "slides_select_authenticated" on public.slides;
create policy "slides_select_authenticated"
on public.slides
for select
to authenticated
using (true);

drop policy if exists "slides_admin_write" on public.slides;
create policy "slides_admin_write"
on public.slides
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "authenticated users can receive broadcasts" on realtime.messages;
create policy "authenticated users can receive broadcasts"
on realtime.messages
for select
to authenticated
using (true);

create or replace function public.broadcast_auction_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform realtime.broadcast_changes(
      'auction:global',
      tg_op,
      tg_op,
      tg_table_name,
      tg_table_schema,
      null,
      old
    );
  else
    perform realtime.broadcast_changes(
      'auction:global',
      tg_op,
      tg_op,
      tg_table_name,
      tg_table_schema,
      new,
      old
    );
  end if;

  return null;
end;
$$;

drop trigger if exists broadcast_auction_state_changes on public.auction_state;
create trigger broadcast_auction_state_changes
after insert or update or delete on public.auction_state
for each row
execute function public.broadcast_auction_change();

drop trigger if exists broadcast_bid_changes on public.bids;
create trigger broadcast_bid_changes
after insert or update or delete on public.bids
for each row
execute function public.broadcast_auction_change();

drop trigger if exists broadcast_player_changes on public.players;
create trigger broadcast_player_changes
after insert or update or delete on public.players
for each row
execute function public.broadcast_auction_change();

drop trigger if exists broadcast_team_changes on public.teams;
create trigger broadcast_team_changes
after insert or update or delete on public.teams
for each row
execute function public.broadcast_auction_change();

drop trigger if exists broadcast_slide_changes on public.slides;
create trigger broadcast_slide_changes
after insert or update or delete on public.slides
for each row
execute function public.broadcast_auction_change();
