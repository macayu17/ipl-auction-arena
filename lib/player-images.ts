import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import Papa from "papaparse";
import { cache } from "react";

type PlayerImageRow = {
  player_name?: string;
  image_filename?: string;
  image_url?: string;
};

type PlayerWithPhoto = {
  name: string;
  photo_url: string | null;
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

const getPlayerImageLookup = cache(async () => {
  try {
    const csv = await fs.readFile(imageManifestPath, "utf8");
    const parsed = Papa.parse<PlayerImageRow>(csv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    if (parsed.errors.length > 0) {
      console.warn("Failed to parse player image manifest:", parsed.errors[0]?.message);
      return new Map<string, string>();
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

    return lookup;
  } catch {
    return new Map<string, string>();
  }
});

export async function applyResolvedPlayerPhotoUrls<T extends PlayerWithPhoto>(
  players: T[]
): Promise<T[]> {
  const lookup = await getPlayerImageLookup();

  return players.map((player) => {
    if (player.photo_url && player.photo_url.trim().length > 0) {
      return player;
    }

    const imagePath = lookup.get(normalizePlayerImageKey(player.name));

    if (!imagePath) {
      return player;
    }

    return {
      ...player,
      photo_url: imagePath,
    };
  });
}