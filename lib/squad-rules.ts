import type { PlayerRole, SquadRoleCounts, SquadRuleStatus } from "@/types/app.types";

type SquadRoleLimits = {
  min: number;
  max: number | null;
};

export const SQUAD_ROLE_LIMITS: Record<PlayerRole, SquadRoleLimits> = {
  Batsman: { min: 2, max: 3 },
  "Wicket-Keeper": { min: 1, max: 1 },
  "All-Rounder": { min: 3, max: null },
  Bowler: { min: 3, max: 4 },
};

const ROLE_LABELS: Record<PlayerRole, string> = {
  Batsman: "Batsmen",
  "Wicket-Keeper": "Wicket-Keepers",
  "All-Rounder": "All-Rounders",
  Bowler: "Bowlers",
};

export function createEmptySquadRoleCounts(): SquadRoleCounts {
  return {
    Batsman: 0,
    Bowler: 0,
    "All-Rounder": 0,
    "Wicket-Keeper": 0,
  };
}

function isPlayerRole(value: unknown): value is PlayerRole {
  return value === "Batsman" ||
    value === "Bowler" ||
    value === "All-Rounder" ||
    value === "Wicket-Keeper";
}

export function countPlayersByRole(players: Array<{ role: unknown }>): SquadRoleCounts {
  const counts = createEmptySquadRoleCounts();

  for (const player of players) {
    if (isPlayerRole(player.role)) {
      counts[player.role] += 1;
    }
  }

  return counts;
}

export function getEffectiveBatsmanCount(counts: SquadRoleCounts): number {
  return counts.Batsman + counts["All-Rounder"];
}

function evaluateMinViolations(counts: SquadRoleCounts): string[] {
  const minViolations: string[] = [];
  const effectiveBatsmen = getEffectiveBatsmanCount(counts);

  if (effectiveBatsmen < SQUAD_ROLE_LIMITS.Batsman.min) {
    minViolations.push(
      "Need at least 2 batting options (Batsman + All-Rounder)."
    );
  }

  for (const role of ["Wicket-Keeper", "All-Rounder", "Bowler"] as const) {
    const limit = SQUAD_ROLE_LIMITS[role];

    if (counts[role] < limit.min) {
      minViolations.push(`Need at least ${limit.min} ${ROLE_LABELS[role]}.`);
    }
  }

  return minViolations;
}

function evaluateMaxViolations(counts: SquadRoleCounts): string[] {
  const maxViolations: string[] = [];

  for (const role of ["Batsman", "Wicket-Keeper", "Bowler"] as const) {
    const limit = SQUAD_ROLE_LIMITS[role];

    if (limit.max !== null && counts[role] > limit.max) {
      maxViolations.push(`${ROLE_LABELS[role]} cap exceeded (max ${limit.max}).`);
    }
  }

  return maxViolations;
}

export function getSquadRuleStatus(counts: SquadRoleCounts): SquadRuleStatus {
  const minViolations = evaluateMinViolations(counts);
  const maxViolations = evaluateMaxViolations(counts);
  const effectiveBatsmanCount = getEffectiveBatsmanCount(counts);

  return {
    counts,
    effectiveBatsmanCount,
    minViolations,
    maxViolations,
    isMinSatisfied: minViolations.length === 0,
    isMaxSatisfied: maxViolations.length === 0,
    isCompliant: minViolations.length === 0 && maxViolations.length === 0,
  };
}

export function canAddPlayerToSquad(
  counts: SquadRoleCounts,
  role: PlayerRole
): { allowed: boolean; reason: string | null } {
  if (role === "Batsman" && counts.Batsman >= (SQUAD_ROLE_LIMITS.Batsman.max ?? Number.MAX_SAFE_INTEGER)) {
    return { allowed: false, reason: "Batsman max 3" };
  }

  if (
    role === "Wicket-Keeper" &&
    counts["Wicket-Keeper"] >=
      (SQUAD_ROLE_LIMITS["Wicket-Keeper"].max ?? Number.MAX_SAFE_INTEGER)
  ) {
    return { allowed: false, reason: "WK max 1" };
  }

  if (role === "Bowler" && counts.Bowler >= (SQUAD_ROLE_LIMITS.Bowler.max ?? Number.MAX_SAFE_INTEGER)) {
    return { allowed: false, reason: "Bowler max 4" };
  }

  return { allowed: true, reason: null };
}

export function formatRoleRequirement(role: PlayerRole): string {
  if (role === "Batsman") {
    return "Min 2, max 3 (All-Rounders count toward minimum)";
  }

  const limits = SQUAD_ROLE_LIMITS[role];

  if (limits.max === null) {
    return `Min ${limits.min}`;
  }

  if (limits.min === limits.max) {
    return `${limits.min} required`;
  }

  return `${limits.min} to ${limits.max}`;
}
