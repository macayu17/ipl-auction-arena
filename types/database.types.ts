export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          short_code: string;
          logo_url: string | null;
          purse_total: number;
          purse_spent: number;
          user_id: string | null;
          color_primary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          short_code: string;
          logo_url?: string | null;
          purse_total?: number;
          purse_spent?: number;
          user_id?: string | null;
          color_primary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          short_code?: string;
          logo_url?: string | null;
          purse_total?: number;
          purse_spent?: number;
          user_id?: string | null;
          color_primary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      team_credentials: {
        Row: {
          team_id: string;
          user_id: string | null;
          login_email: string;
          login_password: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          team_id: string;
          user_id?: string | null;
          login_email: string;
          login_password: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          team_id?: string;
          user_id?: string | null;
          login_email?: string;
          login_password?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      players: {
        Row: {
          id: string;
          name: string;
          role: "Batsman" | "Bowler" | "All-Rounder" | "Wicket-Keeper";
          nationality: "Indian" | "Overseas";
          base_price: number;
          rating: number;
          batting_style: string | null;
          bowling_style: string | null;
          ipl_caps: number;
          photo_url: string | null;
          status: "pool" | "active" | "sold" | "unsold" | "rtm";
          sold_to: string | null;
          sold_price: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          role: "Batsman" | "Bowler" | "All-Rounder" | "Wicket-Keeper";
          nationality: "Indian" | "Overseas";
          base_price: number;
          rating: number;
          batting_style?: string | null;
          bowling_style?: string | null;
          ipl_caps?: number;
          photo_url?: string | null;
          status?: "pool" | "active" | "sold" | "unsold" | "rtm";
          sold_to?: string | null;
          sold_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: "Batsman" | "Bowler" | "All-Rounder" | "Wicket-Keeper";
          nationality?: "Indian" | "Overseas";
          base_price?: number;
          rating?: number;
          batting_style?: string | null;
          bowling_style?: string | null;
          ipl_caps?: number;
          photo_url?: string | null;
          status?: "pool" | "active" | "sold" | "unsold" | "rtm";
          sold_to?: string | null;
          sold_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      auction_state: {
        Row: {
          id: number;
          phase: "setup" | "live" | "paused" | "ended";
          current_player_id: string | null;
          current_bid_amount: number;
          current_bid_team_id: string | null;
          timer_seconds: number;
          timer_active: boolean;
          bid_increment: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          phase?: "setup" | "live" | "paused" | "ended";
          current_player_id?: string | null;
          current_bid_amount?: number;
          current_bid_team_id?: string | null;
          timer_seconds?: number;
          timer_active?: boolean;
          bid_increment?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          phase?: "setup" | "live" | "paused" | "ended";
          current_player_id?: string | null;
          current_bid_amount?: number;
          current_bid_team_id?: string | null;
          timer_seconds?: number;
          timer_active?: boolean;
          bid_increment?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      bids: {
        Row: {
          id: string;
          player_id: string;
          team_id: string;
          amount: number;
          timestamp: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          team_id: string;
          amount: number;
          timestamp?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          team_id?: string;
          amount?: number;
          timestamp?: string;
        };
      };
      slides: {
        Row: {
          id: string;
          title: string | null;
          image_url: string | null;
          order_index: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title?: string | null;
          image_url?: string | null;
          order_index: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string | null;
          image_url?: string | null;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
