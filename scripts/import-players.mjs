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

const csvPathCandidates = [
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

function normalizeMemeNameKey(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const memePlayerNameKeys = new Set([
  "richardkettleborough",
  "richardkettleboroughumpire",
  "jayshah",
  "jayshahscriptwriter",
]);

function isMemePlayerName(name) {
  return memePlayerNameKeys.has(normalizeMemeNameKey(name ?? ""));
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

async function resolveCsvPath() {
  for (const candidatePath of csvPathCandidates) {
    try {
      await fs.access(candidatePath);
      return candidatePath;
    } catch {
      continue;
    }
  }

  return null;
}

function parseCsvRows(csv) {
  const parsedWithHeader = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader(header) {
      return header.trim();
    },
  });

  if (parsedWithHeader.errors.length > 0) {
    throw new Error(parsedWithHeader.errors[0]?.message ?? "Failed to parse player CSV.");
  }

  const hasValidHeaderRows = parsedWithHeader.data.some((row) => {
    const rawName = row["Player's Name"]?.trim();
    const rawCategory = row.Category?.trim();
    const rawRating = Number(row.Rating);

    return !!rawName && !!rawCategory && !Number.isNaN(rawRating);
  });

  if (hasValidHeaderRows) {
    return parsedWithHeader.data;
  }

  const parsedWithoutHeader = Papa.parse(csv, {
    header: false,
    skipEmptyLines: true,
  });

  if (parsedWithoutHeader.errors.length > 0) {
    throw new Error(parsedWithoutHeader.errors[0]?.message ?? "Failed to parse player CSV.");
  }

  return parsedWithoutHeader.data.map((row) => ({
    "Player's Name": String(row[0] ?? ""),
    Category: String(row[1] ?? ""),
    Rating: String(row[2] ?? ""),
  }));
}

function isQueueEligibleStatus(status) {
  return status === "pool" || status === "unsold";
}

function compareQueueOrder(left, right) {
  const memeDiff = Number(isMemePlayerName(left.name)) - Number(isMemePlayerName(right.name));

  if (memeDiff !== 0) {
    return memeDiff;
  }

  const queueDiff = (left.queue_order ?? Number.MAX_SAFE_INTEGER) -
    (right.queue_order ?? Number.MAX_SAFE_INTEGER);

  if (queueDiff !== 0) {
    return queueDiff;
  }

  return left.name.localeCompare(right.name);
}

async function main() {
  const csvPath = await resolveCsvPath();

  if (!csvPath) {
    throw new Error("No bundled player CSV found. Expected ipl  PLAYER DETAILS.csv or IPL AUCTION DATA SHEET.csv");
  }

  const csv = await fs.readFile(csvPath, "utf8");
  const parsedRows = parseCsvRows(csv);

  const existingPlayersResult = await supabase
    .from("players")
    .select("id, name, status, queue_order");

  if (existingPlayersResult.error) {
    throw existingPlayersResult.error;
  }

  const existingPlayers = existingPlayersResult.data ?? [];
  const existingByName = new Map();

  for (const player of existingPlayers) {
    const key = normalizeNameKey(player.name);
    const current = existingByName.get(key);

    if (
      !current ||
      (!isQueueEligibleStatus(current.status) && isQueueEligibleStatus(player.status))
    ) {
      existingByName.set(key, player);
    }
  }

  const remainingQueuePlayers = existingPlayers
    .filter((player) => isQueueEligibleStatus(player.status))
    .sort(compareQueueOrder);

  const seenCsvNames = new Set();
  const consumedExistingIds = new Set();
  const orderedQueueEntries = [];

  for (const row of parsedRows) {
    const rawName = row["Player's Name"]?.trim();
    const rawCategory = row.Category?.trim();
    const rawRating = Number(row.Rating);

    if (!rawName || !rawCategory || Number.isNaN(rawRating)) {
      continue;
    }

    const key = normalizeNameKey(rawName);

    if (seenCsvNames.has(key)) {
      continue;
    }

    seenCsvNames.add(key);

    const existingPlayer = existingByName.get(key);

    if (existingPlayer) {
      if (
        isQueueEligibleStatus(existingPlayer.status) &&
        !consumedExistingIds.has(existingPlayer.id)
      ) {
        orderedQueueEntries.push({ kind: "existing", player: existingPlayer });
        consumedExistingIds.add(existingPlayer.id);
      }

      continue;
    }

    orderedQueueEntries.push({
      kind: "new",
      player: {
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
      },
    });
  }

  for (const player of remainingQueuePlayers) {
    if (consumedExistingIds.has(player.id)) {
      continue;
    }

    orderedQueueEntries.push({ kind: "existing", player });
    consumedExistingIds.add(player.id);
  }

  const playersToInsert = [];
  const queueOrderUpdates = [];
  const normalizedOrderedQueueEntries = [
    ...orderedQueueEntries.filter((entry) => !isMemePlayerName(entry.player.name)),
    ...orderedQueueEntries.filter((entry) => isMemePlayerName(entry.player.name)),
  ];

  for (const [index, entry] of normalizedOrderedQueueEntries.entries()) {
    const queueOrder = index + 1;

    if (entry.kind === "new") {
      playersToInsert.push({
        ...entry.player,
        queue_order: queueOrder,
      });
      continue;
    }

    if ((entry.player.queue_order ?? null) !== queueOrder) {
      queueOrderUpdates.push({
        id: entry.player.id,
        queue_order: queueOrder,
      });
    }
  }

  if (playersToInsert.length > 0) {
    const insertResult = await supabase.from("players").insert(playersToInsert);

    if (insertResult.error) {
      throw insertResult.error;
    }
  }

  if (queueOrderUpdates.length > 0) {
    for (const update of queueOrderUpdates) {
      const updateResult = await supabase
        .from("players")
        .update({ queue_order: update.queue_order })
        .eq("id", update.id);

      if (updateResult.error) {
        throw updateResult.error;
      }
    }
  }

  console.log(`CSV parsed from ${csvPath}`);
  console.log(`Inserted players: ${playersToInsert.length}`);
  console.log(`Reordered existing queue players: ${queueOrderUpdates.length}`);
  console.log(`Total CSV players considered: ${seenCsvNames.size}`);
  console.log(`Skipped invalid/duplicate rows: ${parsedRows.length - seenCsvNames.size}`);
}

main().catch((error) => {
  console.error("Player import failed.");
  console.error(error);
  process.exit(1);
});
