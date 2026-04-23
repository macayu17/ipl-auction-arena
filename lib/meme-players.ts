const MEME_PLAYER_NAME_KEYS = new Set([
  "richardkettleboroughumpire",
  "jayshahscriptwriter",
]);

function normalizePlayerNameKey(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

type PlayerNameLike = {
  name: string;
};

type PlayerRatingLike = PlayerNameLike & {
  rating: number | null;
};

export function isMemePlayerName(name: string | null | undefined) {
  if (!name) {
    return false;
  }

  return MEME_PLAYER_NAME_KEYS.has(normalizePlayerNameKey(name));
}

export function isMemePlayer(player: PlayerNameLike | null | undefined) {
  if (!player) {
    return false;
  }

  return isMemePlayerName(player.name);
}

export function getEffectivePlayerRating(player: PlayerRatingLike) {
  if (isMemePlayer(player)) {
    return 0;
  }

  return player.rating ?? 0;
}
