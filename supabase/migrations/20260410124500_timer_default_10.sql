alter table public.auction_state
alter column timer_seconds set default 10;

update public.auction_state
set timer_seconds = 10
where id = 1
  and timer_seconds = 30;

create or replace function public.place_auction_bid(p_team_id uuid)
returns json
language plpgsql
as $$
declare
    v_auction_state auction_state%rowtype;
    v_team teams%rowtype;
    v_player players%rowtype;
    v_next_bid_amount int;
    v_purse_remaining int;
begin
    select * into v_auction_state from auction_state where id = 1 for update;

    if v_auction_state.phase != 'live' then
        return json_build_object('success', false, 'error', 'Auction is not live');
    end if;

    if v_auction_state.current_bid_team_id = p_team_id then
        return json_build_object('success', false, 'error', 'Team is already the highest bidder');
    end if;

    if v_auction_state.current_player_id is null then
        return json_build_object('success', false, 'error', 'No active player');
    end if;

    select * into v_player from players where id = v_auction_state.current_player_id;
    if not found then
        return json_build_object('success', false, 'error', 'Current player not found');
    end if;

    select * into v_team from teams where id = p_team_id;
    if not found then
        return json_build_object('success', false, 'error', 'Bidding team not found');
    end if;

    if v_auction_state.current_bid_amount > 0 then
        v_next_bid_amount := v_auction_state.current_bid_amount + v_auction_state.bid_increment;
    else
        v_next_bid_amount := v_player.base_price;
    end if;

    v_purse_remaining := v_team.purse_total - v_team.purse_spent;
    if v_purse_remaining < v_next_bid_amount then
        return json_build_object('success', false, 'error', 'Insufficient purse remaining');
    end if;

    insert into bids (player_id, team_id, amount)
    values (v_player.id, v_team.id, v_next_bid_amount);

    update auction_state
    set
        current_bid_amount = v_next_bid_amount,
        current_bid_team_id = v_team.id,
        timer_seconds = 10,
        timer_active = true,
        phase = 'live',
        updated_at = now()
    where id = 1;

    return json_build_object(
        'success', true,
        'delta', json_build_object(
            'currentBidAmount', v_next_bid_amount,
            'currentBidTeamId', v_team.id,
            'currentBidTeamCode', v_team.short_code,
            'timerSeconds', 10,
            'timerActive', true
        )
    );
end;
$$;
