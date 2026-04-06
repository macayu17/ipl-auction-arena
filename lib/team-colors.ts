/**
 * IPL team color system — jersey-based theming for team views.
 * Each team gets a primary (jersey dominant), accent (secondary),
 * and derived CSS custom property values for backgrounds and glows.
 */

export type TeamColorTheme = {
  primary: string;
  accent: string;
  /** A low-opacity background tint */
  bgTint: string;
  /** Glow/shadow color */
  glow: string;
  /** Border accent */
  border: string;
};

export const TEAM_COLORS: Record<string, TeamColorTheme> = {
  MI: {
    primary: "#004BA0",
    accent: "#0567B1",
    bgTint: "rgba(0,75,160,0.08)",
    glow: "rgba(0,75,160,0.35)",
    border: "rgba(0,75,160,0.4)",
  },
  CSK: {
    primary: "#F7A721",
    accent: "#FFD700",
    bgTint: "rgba(247,167,33,0.08)",
    glow: "rgba(247,167,33,0.35)",
    border: "rgba(247,167,33,0.4)",
  },
  RCB: {
    primary: "#C8102E",
    accent: "#D4A74A",
    bgTint: "rgba(200,16,46,0.08)",
    glow: "rgba(200,16,46,0.35)",
    border: "rgba(200,16,46,0.4)",
  },
  KKR: {
    primary: "#3B2585",
    accent: "#DFAE38",
    bgTint: "rgba(59,37,133,0.08)",
    glow: "rgba(59,37,133,0.35)",
    border: "rgba(59,37,133,0.4)",
  },
  SRH: {
    primary: "#F7631B",
    accent: "#EE3124",
    bgTint: "rgba(247,99,27,0.08)",
    glow: "rgba(247,99,27,0.35)",
    border: "rgba(247,99,27,0.4)",
  },
  DC: {
    primary: "#0078BC",
    accent: "#C41230",
    bgTint: "rgba(0,120,188,0.08)",
    glow: "rgba(0,120,188,0.35)",
    border: "rgba(0,120,188,0.4)",
  },
  PBKS: {
    primary: "#A52735",
    accent: "#DCDDDF",
    bgTint: "rgba(165,39,53,0.08)",
    glow: "rgba(165,39,53,0.35)",
    border: "rgba(165,39,53,0.4)",
  },
  RR: {
    primary: "#E4007C",
    accent: "#254AA5",
    bgTint: "rgba(228,0,124,0.08)",
    glow: "rgba(228,0,124,0.35)",
    border: "rgba(228,0,124,0.4)",
  },
  GT: {
    primary: "#1B3A6B",
    accent: "#6DC8EF",
    bgTint: "rgba(27,58,107,0.08)",
    glow: "rgba(27,58,107,0.35)",
    border: "rgba(27,58,107,0.4)",
  },
  LSG: {
    primary: "#A0C4E8",
    accent: "#2D3E50",
    bgTint: "rgba(160,196,232,0.08)",
    glow: "rgba(160,196,232,0.35)",
    border: "rgba(160,196,232,0.4)",
  },
};

export function getTeamColors(shortCode: string): TeamColorTheme | null {
  return TEAM_COLORS[shortCode.toUpperCase()] ?? null;
}
