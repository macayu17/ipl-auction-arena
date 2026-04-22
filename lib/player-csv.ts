import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import Papa from "papaparse";

import type { PlayerInsert, PlayerNationality, PlayerRole } from "@/types/app.types";

type RawPlayerRow = {
  "Player's Name": string;
  Category: string;
  Rating: string;
};

export type ImportedPlayerRecord = Pick<
  PlayerInsert,
  | "name"
  | "role"
  | "nationality"
  | "base_price"
  | "rating"
  | "batting_style"
  | "bowling_style"
  | "ipl_caps"
  | "photo_url"
  | "status"
  | "sold_to"
  | "sold_price"
> & {
  source_category: string;
};

const bundledCsvPathCandidates = [
  path.join(process.cwd(), "ipl  PLAYER DETAILS.csv"),
  path.join(process.cwd(), "IPL AUCTION DATA SHEET.csv"),
];

const overseasPlayers = new Set(
  [
    "aaron hardy",
    "abd",
    "adam zampa",
    "aiden markram",
    "albie morkel",
    "allah ghazanfar",
    "alzari joseph",
    "andre russel",
    "angelo mattews",
    "anrich nortje",
    "azmatulah umarzai",
    "ben stokes",
    "brendon mcclluum",
    "cameron green",
    "chris gayle",
    "chris lynn",
    "chris morris",
    "chris lynn",
    "corey anderson",
    "darren sammy",
    "david miller",
    "devon convoy",
    "dewald brevis",
    "dwayne smith",
    "eoin morgan",
    "fazal haq farooqi",
    "george bailey",
    "gerald coetzee",
    "glenn maxwell",
    "glenn phillip",
    "harry brook",
    "henrick klassen",
    "imran tahir",
    "jack fraser mcgurk",
    "james faulkner",
    "jofra archer",
    "josh butler",
    "josh hazelwood",
    "josh inglis",
    "jp duminy",
    "kagiso rabada",
    "kane williamson",
    "kwena maphaka",
    "liam linvingstone",
    "lindl simmons",
    "loki ferguson",
    "mahisha tikshana",
    "marco jensen",
    "marcus stoinis",
    "matheesha pathirana",
    "mitchell green",
    "mitchell johnson",
    "mitchell marsh",
    "mitchell mcclenaghan",
    "mitchell santner",
    "mitchell starc",
    "moen ali",
    "moises henriques",
    "morne morkel",
    "nathan ellis",
    "nicholas pooran",
    "noor ahmed",
    "pat cummins",
    "phillip salt",
    "quinten d'cock",
    "rachin ravindra",
    "rahmanullah gurbaz",
    "rashid khan",
    "roman powel",
    "ryan rickleton",
    "sam curran",
    "sherfane rutherford",
    "shemaron hetmyer",
    "shimron hetmyer",
    "spencer johnson",
    "sunil narein",
    "tim david",
    "trent boult",
    "travis head",
    "tristan stubbs",
    "wanindu hasaranga",
    "will jacks",
  ].map((name) => normalizeNameKey(name))
);

function normalizeNameKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeRole(category: string): PlayerRole {
  const normalized = category.trim().toLowerCase().replace(/\s+/g, "");

  if (normalized === "allrounder" || normalized === "allrounders") {
    return "All-Rounder";
  }

  if (
    normalized === "batter" ||
    normalized === "batsman" ||
    normalized === "batters" ||
    normalized === "batter" ||
    normalized === "batter"
  ) {
    return "Batsman";
  }

  if (normalized === "bowler" || normalized === "bowlers") {
    return "Bowler";
  }

  if (normalized === "wk" || normalized === "wicketkeeper") {
    return "Wicket-Keeper";
  }

  return "Batsman";
}

function inferNationality(name: string): PlayerNationality {
  return overseasPlayers.has(normalizeNameKey(name)) ? "Overseas" : "Indian";
}

function inferBasePrice(rating: number) {
  if (rating >= 95) return 200;
  if (rating >= 90) return 150;
  if (rating >= 85) return 125;
  if (rating >= 80) return 100;
  if (rating >= 75) return 75;
  if (rating >= 70) return 50;
  if (rating >= 65) return 40;
  if (rating >= 60) return 30;
  return 20;
}

function inferIplCaps(rating: number) {
  if (rating >= 95) return 150;
  if (rating >= 90) return 120;
  if (rating >= 85) return 90;
  if (rating >= 80) return 70;
  if (rating >= 75) return 50;
  if (rating >= 70) return 35;
  if (rating >= 65) return 20;
  if (rating >= 60) return 10;
  return 0;
}

async function resolveBundledCsvPath() {
  for (const csvPath of bundledCsvPathCandidates) {
    try {
      await fs.access(csvPath);
      return csvPath;
    } catch {
      continue;
    }
  }

  return null;
}

export async function hasBundledPlayerCsv() {
  return (await resolveBundledCsvPath()) !== null;
}

export async function getBundledPlayerCsvName() {
  const bundledCsvPath = await resolveBundledCsvPath();

  if (!bundledCsvPath) {
    return null;
  }

  return path.basename(bundledCsvPath);
}

function parsePlayerRows(rows: RawPlayerRow[]) {
  const seen = new Set<string>();
  const players: ImportedPlayerRecord[] = [];

  for (const row of rows) {
    const rawName = row["Player's Name"]?.trim();
    const rawCategory = row.Category?.trim();
    const rawRating = Number(row.Rating);

    if (!rawName || !rawCategory || Number.isNaN(rawRating)) {
      continue;
    }

    const key = normalizeNameKey(rawName);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    players.push({
      name: rawName,
      role: normalizeRole(rawCategory),
      nationality: inferNationality(rawName),
      base_price: inferBasePrice(rawRating),
      rating: rawRating,
      batting_style: null,
      bowling_style: null,
      ipl_caps: inferIplCaps(rawRating),
      photo_url: null,
      status: "pool",
      sold_to: null,
      sold_price: null,
      source_category: rawCategory,
    });
  }

  return players;
}

export function parsePlayerCsvText(csv: string) {
  const parsed = Papa.parse<RawPlayerRow>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader(header) {
      return header.trim();
    },
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? "Failed to parse player CSV.");
  }

  const parsedHeaderRows = parsePlayerRows(parsed.data);

  if (parsedHeaderRows.length > 0) {
    return parsedHeaderRows;
  }

  const fallbackParsed = Papa.parse<string[]>(csv, {
    header: false,
    skipEmptyLines: true,
  });

  if (fallbackParsed.errors.length > 0) {
    throw new Error(fallbackParsed.errors[0]?.message ?? "Failed to parse player CSV.");
  }

  const fallbackRows: RawPlayerRow[] = fallbackParsed.data.map((row) => ({
    "Player's Name": String(row[0] ?? ""),
    Category: String(row[1] ?? ""),
    Rating: String(row[2] ?? ""),
  }));

  return parsePlayerRows(fallbackRows);
}

export async function parseBundledPlayerCsv() {
  const bundledCsvPath = await resolveBundledCsvPath();

  if (!bundledCsvPath) {
    throw new Error("No bundled player CSV found.");
  }

  const csv = await fs.readFile(bundledCsvPath, "utf8");
  return parsePlayerCsvText(csv);
}
