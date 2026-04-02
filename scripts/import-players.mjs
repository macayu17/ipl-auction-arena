import fs from "node:fs/promises";
import path from "node:path";

import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const csvPath = path.join(process.cwd(), "IPL AUCTION DATA SHEET.csv");

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
  ].map(normalizeNameKey)
);

function normalizeNameKey(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeRole(category) {
  const normalized = category.trim().toLowerCase().replace(/\s+/g, "");

  if (normalized === "allrounder" || normalized === "allrounders") {
    return "All-Rounder";
  }

  if (
    normalized === "batter" ||
    normalized === "batsman" ||
    normalized === "batters"
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

function inferNationality(name) {
  return overseasPlayers.has(normalizeNameKey(name)) ? "Overseas" : "Indian";
}

function inferBasePrice(rating) {
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

function inferIplCaps(rating) {
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

async function main() {
  const csv = await fs.readFile(csvPath, "utf8");
  const parsed = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader(header) {
      return header.trim();
    },
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? "Failed to parse player CSV.");
  }

  const existingPlayersResult = await supabase.from("players").select("name");

  if (existingPlayersResult.error) {
    throw existingPlayersResult.error;
  }

  const existingNames = new Set(
    (existingPlayersResult.data ?? []).map((player) =>
      normalizeNameKey(player.name)
    )
  );
  const seen = new Set();
  const playersToInsert = [];

  for (const row of parsed.data) {
    const rawName = row["Player's Name"]?.trim();
    const rawCategory = row.Category?.trim();
    const rawRating = Number(row.Rating);

    if (!rawName || !rawCategory || Number.isNaN(rawRating)) {
      continue;
    }

    const key = normalizeNameKey(rawName);

    if (seen.has(key) || existingNames.has(key)) {
      continue;
    }

    seen.add(key);

    playersToInsert.push({
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
    });
  }

  if (playersToInsert.length > 0) {
    const insertResult = await supabase.from("players").insert(playersToInsert);

    if (insertResult.error) {
      throw insertResult.error;
    }
  }

  console.log(`CSV parsed from ${csvPath}`);
  console.log(`Inserted players: ${playersToInsert.length}`);
  console.log(
    `Skipped existing or duplicate names: ${parsed.data.length - playersToInsert.length}`
  );
}

main().catch((error) => {
  console.error("Player import failed.");
  console.error(error);
  process.exit(1);
});
