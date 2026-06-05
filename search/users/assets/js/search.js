import { stripMinecraftCodes } from "./utilities.js";

export function applySearch(query, state) {
  const q = String(query || "").trim().toLowerCase();

  state.currentPage = 1;

  if (!q) {
    state.filteredPlayers = state.playersData.slice();
    return;
  }

  state.filteredPlayers = state.playersData.filter((player) => {
    const values = [
      player?.account?.login,
      player?.account?.discord_userid,
      player?.account?.xbox_userid,
      player?.clan?.id,
      player?.rank?.name,
      player?.profile?.display_name
    ];

    return values
      .map((value) => stripMinecraftCodes(String(value || "")).toLowerCase())
      .some((value) => value.includes(q));
  });
}
