export type BanRow = {
  id: string;
  scope: string;
  script_id: string | null;
  player_user_id: string | null;
  player_name: string | null;
  license_id: string | null;
  ip_hash: string | null;
  reason: string;
  appeal_url: string;
  is_active: boolean;
  expires_at: string | null;
};

export type BanTarget = {
  scriptId: string | null;
  playerUserId?: string | null;
  playerName?: string | null;
  licenseId?: string | null;
  ipHash?: string | null;
};

const norm = (value: unknown) => String(value ?? "").trim().toLowerCase();

/**
 * Returns the first ban that genuinely targets this player.
 * A ban only matches when it explicitly names the player (user id, name,
 * license or ip hash). Bans with no target fields never match anyone.
 */
export function findMatchingBan(bans: BanRow[] | null | undefined, target: BanTarget): BanRow | null {
  const now = Date.now();
  const targetUserId = norm(target.playerUserId);
  const targetName = norm(target.playerName);
  for (const ban of bans ?? []) {
    if (!ban.is_active) continue;
    if (ban.expires_at && new Date(ban.expires_at).getTime() <= now) continue;
    if (ban.scope === "script") {
      if (!ban.script_id || !target.scriptId || ban.script_id !== target.scriptId) continue;
    } else if (ban.scope !== "global") {
      continue;
    }

    const banUserId = norm(ban.player_user_id);
    const banName = norm(ban.player_name);

    // Roblox user id is the authoritative identity. When both sides have one,
    // a mismatch is final: never fall back to a username, license, or shared IP.
    if (banUserId && targetUserId) {
      if (banUserId === targetUserId) return ban;
      continue;
    }

    // Name is only a fallback for legacy records where one side has no user id.
    if (banName && targetName && banName === targetName) return ban;

    // License and IP bans are accepted only when the ban has no player id/name.
    // This prevents a player-targeted ban from spreading to another account
    // that later shares a license or network address.
    const isIdentifierOnlyBan = !banUserId && !banName;
    if (isIdentifierOnlyBan && ban.license_id && target.licenseId && ban.license_id === target.licenseId) return ban;
    if (isIdentifierOnlyBan && ban.ip_hash && target.ipHash && ban.ip_hash === target.ipHash) return ban;
  }
  return null;
}
