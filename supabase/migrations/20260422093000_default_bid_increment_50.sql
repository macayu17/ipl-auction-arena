alter table public.auction_state
alter column bid_increment set default 50;

update public.auction_state
set bid_increment = 50
where id = 1
  and bid_increment = 5;
