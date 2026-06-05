import { cleanText } from './sanitize.js';
import { getMediaUrl } from './media.js';
import { APP_CONFIG } from '../config/app.config.js';

export function normalizePlayer(id, player = {}) {
  const account = player.account || {};
  const profile = player.profile || {};
  const theme = player.theme || {};
  const card = theme.card_embed || theme.card || {};

  return {
    id: cleanText(player.id, id),
    rawId: id,
    login: cleanText(account.login || profile.login || player.login, 'unknown'),
    displayName: cleanText(profile.display_name || profile.displayName || account.login || player.name, 'Jogador'),
    username: cleanText(profile.display_username || profile.username || account.login || player.username, 'unknown'),
    rank: cleanText(player.rank?.name || profile.rank?.name || player.rank_name, 'Player'),
    role: cleanText(player.rank?.role || player.role, ''),
    level: getLevel(player),
    avatar: getMediaUrl(card.avatar_bottom_image || profile.avatar || player.avatar, APP_CONFIG.defaults.avatar),
    banner: getMediaUrl(card.banner_bottom_image || profile.banner || player.banner, APP_CONFIG.defaults.banner),
    character: getMediaUrl(card.character_image || profile.character || player.character, APP_CONFIG.defaults.character),
    bio: cleanText(profile.bio || player.bio, ''),
    country: cleanText(player.country?.name || player.country, ''),
    raw: player
  };
}

export function getLevel(player = {}) {
  const value = player.stats?.progression?.level || player.progression?.level || player.level || 0;
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

export function sortPlayers(players) {
  return [...players].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return a.displayName.localeCompare(b.displayName, 'pt-BR');
  });
}
