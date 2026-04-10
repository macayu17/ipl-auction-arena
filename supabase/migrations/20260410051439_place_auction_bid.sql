CREATE OR REPLACE FUNCTION place_auction_bid(p_team_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    v_auction_state auction_state%ROWTYPE;
    v_team teams%ROWTYPE;
    v_player players%ROWTYPE;
    v_next_bid_amount int;
    v_purse_remaining int;
BEGIN
    -- 1. Lock and load current auction state
    SELECT * INTO v_auction_state FROM auction_state WHERE id = 1 FOR UPDATE;

    -- Basic state validations
    IF v_auction_state.phase != 'live' THEN
        RETURN json_build_object('success', false, 'error', 'Auction is not live');
    END IF;

    IF v_auction_state.current_bid_team_id = p_team_id THEN
        RETURN json_build_object('success', false, 'error', 'Team is already the highest bidder');
    END IF;

    IF v_auction_state.current_player_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No active player');
    END IF;

    -- 2. Load player context
    SELECT * INTO v_player FROM players WHERE id = v_auction_state.current_player_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Current player not found');
    END IF;

    -- 3. Load team context
    SELECT * INTO v_team FROM teams WHERE id = p_team_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Bidding team not found');
    END IF;

    -- 4. Calculate next bid logic mathematically identically to Next.js getNextBidAmount()
    IF v_auction_state.current_bid_amount > 0 THEN
        v_next_bid_amount := v_auction_state.current_bid_amount + v_auction_state.bid_increment;
    ELSE
        v_next_bid_amount := v_player.base_price;
    END IF;

    -- 5. Validate Wallet Purse
    v_purse_remaining := v_team.purse_total - v_team.purse_spent;
    IF v_purse_remaining < v_next_bid_amount THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient purse remaining');
    END IF;

    -- 6. Execute atomic INSERT bid log
    INSERT INTO bids (player_id, team_id, amount) 
    VALUES (v_player.id, v_team.id, v_next_bid_amount);

    -- 7. Execute atomic UPDATE to main auction state
    UPDATE auction_state 
    SET 
        current_bid_amount = v_next_bid_amount,
        current_bid_team_id = v_team.id,
        timer_seconds = 30,
        timer_active = true,
        phase = 'live',
        updated_at = now()
    WHERE id = 1;

    -- 8. Return exactly formatted Delta for instantaneous UI processing
    RETURN json_build_object(
        'success', true,
        'delta', json_build_object(
            'currentBidAmount', v_next_bid_amount,
            'currentBidTeamId', v_team.id,
            'currentBidTeamCode', v_team.short_code,
            'timerSeconds', 30,
            'timerActive', true
        )
    );
END;
$$;
