/**
 * Player identity helpers.
 *
 * One real person must map to exactly one player_history row, even when the
 * loader reports them first by name only and later with a Roblox user id.
 */

export type PlayerIdentity = {
  playerUserId?: string | null;
  playerName?: string | null;
  ipHash?: string | null;
};

export function buildPlayerKey(identity: PlayerIdentity): string {
  const userId = (identity.playerUserId ?? "").trim();
  if (userId) return `uid:${userId}`;
  const name = (identity.playerName ?? "").trim().toLowerCase();
  if (name) return `name:${name}`;
  return `ip:${(identity.ipHash ?? "unknown").trim()}`;
}

/**
 * Finds the single history row that belongs to this player, preferring the
 * strongest identifier available (user id > username > legacy key).
 */
export async function findPlayerHistoryRow(db: any, identity: PlayerIdentity) {
  const userId = (identity.playerUserId ?? "").trim();
  const name = (identity.playerName ?? "").trim();
  const keys = [buildPlayerKey(identity)];
  if (userId) keys.push(userId);
  if (name) keys.push(name, `name:${name.toLowerCase()}`);

  if (userId) {
    const { data } = await db
      .from("player_history")
      .select("*")
      .eq("player_user_id", userId)
      .order("last_seen_at", { ascending: false })
      .limit(1);
    if (data?.length) return data[0];
  }

  if (name) {
    const { data } = await db
      .from("player_history")
      .select("*")
      .ilike("player_name", name)
      .order("last_seen_at", { ascending: false })
      .limit(1);
    if (data?.length) return data[0];
  }

  const { data } = await db
    .from("player_history")
    .select("*")
    .in("player_key", Array.from(new Set(keys)))
    .order("last_seen_at", { ascending: false })
    .limit(1);
  return data?.length ? data[0] : null;
}