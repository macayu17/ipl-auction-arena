import { Database } from "./database.types";

// Derived row types
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type TeamInsert = Database["public"]["Tables"]["teams"]["Insert"];
export type TeamUpdate = Database["public"]["Tables"]["teams"]["Update"];

export type Player = Database["public"]["Tables"]["players"]["Row"];
export type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
export type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"];

export type AuctionState = Database["public"]["Tables"]["auction_state"]["Row"];
export type AuctionStateInsert =
  Database["public"]["Tables"]["auction_state"]["Insert"];
export type AuctionStateUpdate = Database["public"]["Tables"]["auction_state"]["Update"];

export type Bid = Database["public"]["Tables"]["bids"]["Row"];
export type BidInsert = Database["public"]["Tables"]["bids"]["Insert"];

export type Slide = Database["public"]["Tables"]["slides"]["Row"];
export type SlideInsert = Database["public"]["Tables"]["slides"]["Insert"];

export type TeamCredential = Database["public"]["Tables"]["team_credentials"]["Row"];
export type TeamCredentialInsert =
  Database["public"]["Tables"]["team_credentials"]["Insert"];
export type TeamCredentialUpdate =
  Database["public"]["Tables"]["team_credentials"]["Update"];

// App-specific types
export type PlayerRole = "Batsman" | "Bowler" | "All-Rounder" | "Wicket-Keeper";
export type PlayerNationality = "Indian" | "Overseas";
export type PlayerStatus = "pool" | "active" | "sold" | "unsold" | "rtm";
export type AuctionPhase = "setup" | "live" | "paused" | "ended";

export type UserRole = "admin" | "team";

export type SquadRoleCounts = Record<PlayerRole, number>;

export type SquadRuleStatus = {
  counts: SquadRoleCounts;
  effectiveBatsmanCount: number;
  minViolations: string[];
  maxViolations: string[];
  isMinSatisfied: boolean;
  isMaxSatisfied: boolean;
  isCompliant: boolean;
};

// Extended types with relations
export interface BidWithTeam extends Bid {
  team?: Team;
}

export interface PlayerWithTeam extends Player {
  team?: Team;
}

export interface TeamWithSummary extends Team {
  players_acquired: number;
  purse_remaining: number;
  squad_rating_total: number;
  role_counts: SquadRoleCounts;
  squad_rule_status: SquadRuleStatus;
  credentials: TeamCredential | null;
}

// IPL Team seed data
export const IPL_TEAMS = [
  { name: "Mumbai Indians", short_code: "MI", color_primary: "#004BA0", purse_total: 1000 },
  { name: "Chennai Super Kings", short_code: "CSK", color_primary: "#F7A721", purse_total: 1000 },
  { name: "Royal Challengers Bengaluru", short_code: "RCB", color_primary: "#C8102E", purse_total: 1000 },
  { name: "Kolkata Knight Riders", short_code: "KKR", color_primary: "#3B2585", purse_total: 1000 },
  { name: "Sunrisers Hyderabad", short_code: "SRH", color_primary: "#F7631B", purse_total: 1000 },
  { name: "Delhi Capitals", short_code: "DC", color_primary: "#0078BC", purse_total: 1000 },
  { name: "Punjab Kings", short_code: "PBKS", color_primary: "#A52735", purse_total: 1000 },
  { name: "Rajasthan Royals", short_code: "RR", color_primary: "#E4007C", purse_total: 1000 },
  { name: "Gujarat Titans", short_code: "GT", color_primary: "#1B3A6B", purse_total: 1000 },
  { name: "Lucknow Super Giants", short_code: "LSG", color_primary: "#A0C4E8", purse_total: 1000 },
] as const;
