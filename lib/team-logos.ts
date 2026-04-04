/**
 * Official IPL team logo URLs from iplt20.com
 * and the main IPL corporate logo.
 */

export const IPL_LOGO_URL =
  "https://www.iplt20.com/assets/images/IPL_LOGO_CORPORATE_2024.png";

/**
 * Map of team short_code → official team logo URL from documents.iplt20.com
 */
export const TEAM_LOGO_MAP: Record<string, string> = {
  CSK: "https://documents.iplt20.com/ipl/CSK/logos/Logooutline/CSKoutline.png",
  DC: "https://documents.iplt20.com/ipl/DC/Logos/LogoOutline/DCoutline.png",
  GT: "https://documents.iplt20.com/ipl/GT/Logos/Logooutline/GToutline.png",
  KKR: "https://documents.iplt20.com/ipl/KKR/Logos/Logooutline/KKRoutline.png",
  LSG: "https://documents.iplt20.com/ipl/LSG/Logos/Logooutline/LSGoutline.png",
  MI: "https://documents.iplt20.com/ipl/MI/Logos/Logooutline/MIoutline.png",
  PBKS: "https://documents.iplt20.com/ipl/PBKS/Logos/Logooutline/PBKSoutline.png",
  RR: "https://documents.iplt20.com/ipl/RR/Logos/Logooutline/RRoutline.png",
  RCB: "https://documents.iplt20.com/ipl/RCB/Logos/Logooutline/RCBoutline.png",
  SRH: "https://documents.iplt20.com/ipl/SRH/Logos/Logooutline/SRHoutline.png",
};

/**
 * Get the official logo URL for a team by short_code.
 * Falls back to undefined if team code is unknown.
 */
export function getTeamLogoUrl(shortCode: string): string | undefined {
  return TEAM_LOGO_MAP[shortCode.toUpperCase()];
}
