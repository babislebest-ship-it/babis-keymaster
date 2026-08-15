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
  for (const ban of bans ?? []) {
    if (!ban.is_active) continue;
    if (ban.expires_at && new Date(ban.expires_at).getTime() <= now) continue;
    if (ban.scope === "script") {
      if (!ban.script_id || !target.scriptId || ban.script_id !== target.scriptId) continue;
    } else if (ban.scope !== "global") {
      continue;
    }

    const matchesUserId =
      Boolean(ban.player_user_id) && Boolean(target.playerUserId) && norm(ban.player_user_id) === norm(target.playerUserId);
    const matchesName =
      Boolean(ban.player_name) && Boolean(target.playerName) && norm(ban.player_name) === norm(target.playerName);
    const matchesLicense =
      Boolean(ban.license_id) && Boolean(target.licenseId) && ban.license_id === target.licenseId;
    const matchesIp = Boolean(ban.ip_hash) && Boolean(target.ipHash) && ban.ip_hash === target.ipHash;

    if (matchesUserId || matchesName || matchesLicense || matchesIp) return ban;
  }
  return null;
}
