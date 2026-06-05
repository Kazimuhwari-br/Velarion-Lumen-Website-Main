import { APP_CONFIG } from '../config/app.config.js';
import { fetchJson } from './http.service.js';
import { normalizePlayer, sortPlayers } from '../utils/player.js';

let playersCache = null;

export async function getPlayers() {
  if (playersCache) return playersCache;

  const data = await fetchJson(APP_CONFIG.dataUrls.players);

  if (!data || typeof data !== 'object') {
    playersCache = [];
    return playersCache;
  }

  playersCache = sortPlayers(
    Object.entries(data).map(([id, player]) => normalizePlayer(id, player))
  );

  return playersCache;
}

export async function getPlayerById(playerId) {
  const players = await getPlayers();
  return players.find((player) => {
    const candidates = [player.id, player.rawId, player.login, player.username];
    return candidates.some((value) => String(value).toLowerCase() === String(playerId).toLowerCase());
  });
}
