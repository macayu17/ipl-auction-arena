/**
 * Official IPL team color themes — based on each team's jersey and
 * brand identity from iplt20.com.
 *
 * Each team gets:
 *  - primary: dominant jersey/brand color (used for accents, labels, glows)
 *  - accent: secondary jersey color
 *  - bgTint: subtle page-level background tint
 *  - glow: box-shadow / glow effect color
 *  - border: border accent color
 *  - textOnDark: readable text color for dark backgrounds
 */

export type TeamColorTheme = {
  primary: string;
  accent: string;
  bgTint: string;
  glow: string;
  border: string;
  textOnDark: string;
};

export const TEAM_COLORS: Record<string, TeamColorTheme> = {
  /* Chennai Super Kings — yellow/gold jersey */
  CSK: {
    primary: "#FDB913",
    accent: "#004B8D",
    bgTint: "rgba(253,185,19,0.06)",
    glow: "rgba(253,185,19,0.30)",
    border: "rgba(253,185,19,0.35)",
    textOnDark: "#FDB913",
  },
  /* Delhi Capitals — blue/red two-tone jersey */
  DC: {
    primary: "#17479E",
    accent: "#EF1C25",
    bgTint: "rgba(23,71,158,0.08)",
    glow: "rgba(23,71,158,0.35)",
    border: "rgba(23,71,158,0.40)",
    textOnDark: "#4A90D9",
  },
  /* Gujarat Titans — dark navy with cyan accents */
  GT: {
    primary: "#1C2C3B",
    accent: "#6DC8BF",
    bgTint: "rgba(109,200,191,0.06)",
    glow: "rgba(109,200,191,0.30)",
    border: "rgba(109,200,191,0.35)",
    textOnDark: "#6DC8BF",
  },
  /* Kolkata Knight Riders — purple/gold jersey */
  KKR: {
    primary: "#3B215D",
    accent: "#D4A840",
    bgTint: "rgba(59,33,93,0.08)",
    glow: "rgba(212,168,64,0.30)",
    border: "rgba(212,168,64,0.35)",
    textOnDark: "#D4A840",
  },
  /* Lucknow Super Giants — cyan/teal jersey */
  LSG: {
    primary: "#00BBD4",
    accent: "#B52552",
    bgTint: "rgba(0,187,212,0.06)",
    glow: "rgba(0,187,212,0.30)",
    border: "rgba(0,187,212,0.35)",
    textOnDark: "#00BBD4",
  },
  /* Mumbai Indians — blue/gold jersey */
  MI: {
    primary: "#004BA0",
    accent: "#D1AB3E",
    bgTint: "rgba(0,75,160,0.08)",
    glow: "rgba(0,75,160,0.35)",
    border: "rgba(0,75,160,0.40)",
    textOnDark: "#5B9BD5",
  },
  /* Punjab Kings — red/silver jersey */
  PBKS: {
    primary: "#DD1F2D",
    accent: "#A7A9AC",
    bgTint: "rgba(221,31,45,0.06)",
    glow: "rgba(221,31,45,0.30)",
    border: "rgba(221,31,45,0.35)",
    textOnDark: "#F25C5C",
  },
  /* Rajasthan Royals — pink/blue jersey */
  RR: {
    primary: "#E73895",
    accent: "#254AA5",
    bgTint: "rgba(231,56,149,0.06)",
    glow: "rgba(231,56,149,0.30)",
    border: "rgba(231,56,149,0.35)",
    textOnDark: "#E73895",
  },
  /* Royal Challengers Bengaluru — red/black with gold accents */
  RCB: {
    primary: "#D32F2F",
    accent: "#CFB53B",
    bgTint: "rgba(211,47,47,0.06)",
    glow: "rgba(211,47,47,0.30)",
    border: "rgba(211,47,47,0.35)",
    textOnDark: "#E57373",
  },
  /* Sunrisers Hyderabad — orange/black jersey */
  SRH: {
    primary: "#F26522",
    accent: "#000000",
    bgTint: "rgba(242,101,34,0.06)",
    glow: "rgba(242,101,34,0.30)",
    border: "rgba(242,101,34,0.35)",
    textOnDark: "#F26522",
  },
};

export function getTeamColors(shortCode: string): TeamColorTheme | null {
  return TEAM_COLORS[shortCode.toUpperCase()] ?? null;
}
