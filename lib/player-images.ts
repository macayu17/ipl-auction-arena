import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import Papa from "papaparse";
import { cache } from "react";

import { isMemePlayer } from "@/lib/meme-players";

type PlayerImageRow = {
  player_name?: string;
  image_filename?: string;
  image_url?: string;
};

type PlayerWithPhoto = {
  name: string;
  photo_url: string | null;
};

type PlayerImageLookup = {
  byKey: Map<string, string>;
  indexedKeys: string[];
};

const imageManifestPath = path.join(
  process.cwd(),
  "public",
  "player-images",
  "player_images.csv"
);

const configuredPlayerImageBaseUrl = process.env.PLAYER_IMAGE_BASE_URL?.trim();
const playerImageBaseUrl =
  configuredPlayerImageBaseUrl && configuredPlayerImageBaseUrl.length > 0
    ? configuredPlayerImageBaseUrl.replace(/\/+$/, "")
    : null;

function normalizePlayerImageKey(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function diceCoefficient(left: string, right: string) {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const buildBigrams = (input: string) => {
    const source = ` ${input} `;
    const set = new Set<string>();

    for (let index = 0; index < source.length - 1; index += 1) {
      set.add(source.slice(index, index + 2));
    }

    return set;
  };

  const leftBigrams = buildBigrams(left);
  const rightBigrams = buildBigrams(right);

  let intersection = 0;

  for (const token of leftBigrams) {
    if (rightBigrams.has(token)) {
      intersection += 1;
    }
  }

  return (2 * intersection) / (leftBigrams.size + rightBigrams.size || 1);
}

function getClosestImageKey(targetKey: string, indexedKeys: string[]) {
  let bestKey: string | null = null;
  let bestScore = 0;

  for (const candidateKey of indexedKeys) {
    if (Math.abs(candidateKey.length - targetKey.length) > 6) {
      continue;
    }

    if (candidateKey[0] !== targetKey[0]) {
      continue;
    }

    const score = diceCoefficient(targetKey, candidateKey);

    if (score > bestScore) {
      bestScore = score;
      bestKey = candidateKey;
    }
  }

  if (!bestKey || bestScore < 0.78) {
    return null;
  }

  return bestKey;
}

function resolvePlayerImagePath(rawFilename?: string, rawImageUrl?: string) {
  const filename = rawFilename?.trim();
  const imageUrl = rawImageUrl?.trim();

  if (filename && filename.length > 0) {
    const encodedFilename = encodeURIComponent(filename);

    if (playerImageBaseUrl) {
      return `${playerImageBaseUrl}/${encodedFilename}`;
    }

    return `/player-images/${encodedFilename}`;
  }

  if (imageUrl && imageUrl.length > 0) {
    return imageUrl;
  }

  return null;
}

const getPlayerImageLookup = cache(async (): Promise<PlayerImageLookup> => {
  try {
    const csv = await fs.readFile(imageManifestPath, "utf8");
    const parsed = Papa.parse<PlayerImageRow>(csv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    if (parsed.errors.length > 0) {
      console.warn("Failed to parse player image manifest:", parsed.errors[0]?.message);
      return {
        byKey: new Map<string, string>(),
        indexedKeys: [],
      };
    }

    const lookup = new Map<string, string>();

    for (const row of parsed.data) {
      const rawName = row.player_name?.trim();
      const rawFilename = row.image_filename?.trim();
      const rawImageUrl = row.image_url?.trim();

      if (!rawName) {
        continue;
      }

      const key = normalizePlayerImageKey(rawName);

      if (!key) {
        continue;
      }

      const imagePath = resolvePlayerImagePath(rawFilename, rawImageUrl);

      if (imagePath) {
        lookup.set(key, imagePath);
      }
    }

    return {
      byKey: lookup,
      indexedKeys: Array.from(lookup.keys()),
    };
  } catch {
    return {
      byKey: new Map<string, string>(),
      indexedKeys: [],
    };
  }
});

export async function applyResolvedPlayerPhotoUrls<T extends PlayerWithPhoto>(
  players: T[]
): Promise<T[]> {
  const { byKey, indexedKeys } = await getPlayerImageLookup();

  return players.map((player) => {
    if (
      !isMemePlayer(player) &&
      player.photo_url &&
      player.photo_url.trim().length > 0
    ) {
      return player;
    }

    const nameKey = normalizePlayerImageKey(player.name);
    const imagePath = byKey.get(nameKey);

    if (imagePath) {
      return {
        ...player,
        photo_url: imagePath,
      };
    }

    const closestKey = getClosestImageKey(nameKey, indexedKeys);

    if (!closestKey) {
      return player;
    }

    const closestImagePath = byKey.get(closestKey);

    if (!closestImagePath) {
      return player;
    }

    return {
      ...player,
      photo_url: closestImagePath,
    };
  });
}
