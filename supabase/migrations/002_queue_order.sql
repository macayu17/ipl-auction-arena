alter table public.players
add column if not exists queue_order integer;

with ranked_players as (
  select
    id,
    row_number() over (
      order by
        coalesce(rating, 0) desc,
        base_price desc,
        name asc
    ) as next_queue_order
  from public.players
)
update public.players
set queue_order = ranked_players.next_queue_order
from ranked_players
where public.players.id = ranked_players.id
  and public.players.queue_order is null;

create index if not exists idx_players_queue_order
on public.players(queue_order);
