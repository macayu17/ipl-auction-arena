import "server-only";

import { getRedisValue, hasRedisEnv, setRedisValue, deleteRedisKeys } from "@/lib/redis";
import {
  getAdminAuctionPageData,
  getTeamAuctionPageData,
} from "@/lib/auction-data";

const ADMIN_CACHE_KEY = "auction:snapshot:admin";
const TEAM_CACHE_PREFIX = "auction:snapshot:team:";
const CACHE_TTL_SECONDS = 60;

/* ------------------------------------------------------------------ */
/*  Read snapshot (cache-first, DB fallback)                            */
/* ------------------------------------------------------------------ */

export async function getCachedAdminSnapshot() {
  if (!hasRedisEnv()) {
    return getAdminAuctionPageData();
  }

  const cached = await getRedisValue<Awaited<ReturnType<typeof getAdminAuctionPageData>>>(
    ADMIN_CACHE_KEY
  );

  if (cached) return cached;

  // Cache miss → fetch from DB and warm the cache
  const fresh = await getAdminAuctionPageData();
  void warmAdminCache(fresh);
  return fresh;
}

export async function getCachedTeamSnapshot(userId: string) {
  if (!hasRedisEnv()) {
    return getTeamAuctionPageData(userId);
  }

  const cached = await getRedisValue<Awaited<ReturnType<typeof getTeamAuctionPageData>>>(
    `${TEAM_CACHE_PREFIX}${userId}`
  );

  if (cached) return cached;

  const fresh = await getTeamAuctionPageData(userId);
  void warmTeamCache(userId, fresh);
  return fresh;
}

/* ------------------------------------------------------------------ */
/*  Write-through: warm the cache after mutations                       */
/* ------------------------------------------------------------------ */

export async function warmAdminCache(
  data?: Awaited<ReturnType<typeof getAdminAuctionPageData>>
) {
  if (!hasRedisEnv()) return;

  try {
    const snapshot = data ?? (await getAdminAuctionPageData());
    await setRedisValue(ADMIN_CACHE_KEY, snapshot, CACHE_TTL_SECONDS);
  } catch (error) {
    console.error("Failed to warm admin snapshot cache", error);
  }
}

export async function warmTeamCache(
  userId: string,
  data?: Awaited<ReturnType<typeof getTeamAuctionPageData>>
) {
  if (!hasRedisEnv()) return;

  try {
    const snapshot = data ?? (await getTeamAuctionPageData(userId));
    await setRedisValue(
      `${TEAM_CACHE_PREFIX}${userId}`,
      snapshot,
      CACHE_TTL_SECONDS
    );
  } catch (error) {
    console.error("Failed to warm team snapshot cache", error);
  }
}

/**
 * Warm caches for all connected teams after a mutation.
 * Accepts an array of user IDs of team captains.
 */
export async function warmAllTeamCaches(teamUserIds: string[]) {
  if (!hasRedisEnv() || teamUserIds.length === 0) return;

  await Promise.allSettled(
    teamUserIds.map((userId) => warmTeamCache(userId))
  );
}

/**
 * Invalidate all snapshot caches (admin + all team prefixed keys).
 * Used after full auction reset.
 */
export async function invalidateAllCaches() {
  if (!hasRedisEnv()) return;

  try {
    // Delete the admin cache. Team caches auto-expire via TTL.
    await deleteRedisKeys(ADMIN_CACHE_KEY);
  } catch (error) {
    console.error("Failed to invalidate caches", error);
  }
}
