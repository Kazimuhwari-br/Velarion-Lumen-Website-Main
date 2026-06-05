const DATA_URL = 'https://kazimuhwaribedrock-default-rtdb.firebaseio.com/profilePlayers.json';
const EXTENSIONS_DATA_URL = 'https://kazimuhwaribedrock-extensions-default-rtdb.firebaseio.com/information_panel.json';
const CLANS_DATA_URL = 'https://kazimuhwaribedrock-clans-default-rtdb.firebaseio.com/clanPlayers.json';
let extensionsData = null; let clansData = {}; let playersData = []; let filteredPlayers = []; let activePlayerId = null; let isTransitionRunning = false; let pageScrollBeforeDetail = 0; let isListMode = false; let currentPage = 1; let itemsPerPage = 6;
function getSiteBasePath(){ const repo = '/Velarion-Lumen-Website-Main'; return location.pathname.startsWith(repo) ? repo : ''; }
function makeProfileUrl(playerId){ return `${getSiteBasePath()}/users/${encodeURIComponent(playerId)}/profile/`; }
function makeSearchUrl(){ return `${getSiteBasePath()}/`; }
function getAvatar(player){ return player?.profile?.avatar || DEFAULT_PLAYER_AVATAR || ''; }
function getCharacter(player){ return player?.profile?.character || DEFAULT_PLAYER_CHARACTER || getAvatar(player); }
function getBanner(player){ return player?.profile?.banner || DEFAULT_PLAYER_BANNER || ''; }
function getDisplayName(player){ return player?.profile?.display_name || player?.profile?.display_username || player?._id || 'Jogador'; }
function getUsername(player){ return player?.profile?.display_username || player?._id || ''; }
function getCardTitle(player){ return player?.profile?.title || ''; }
function getLevelText(player){ return `Lv.${player?.level?.value ?? 0}`; }
function getPlayerClanName(player){ return player?.clan?.name || 'Sem clan'; }
function stripMinecraftCodes(value){ return String(value ?? '').replace(/§./g, ''); }
function buildUsernameLine(player){ return `<span class="username-with-emblem"><span class="player-username">@${escapeHtml(stripMinecraftCodes(getUsername(player)))}</span>${buildVerifiedEmblemHtml(player)}</span>`; }
function buildVerifiedEmblemHtml(){ return ''; }
function buildTitleHtml(player){ return `<h2 class="title"><span class="title-text">${escapeHtml(stripMinecraftCodes(getDisplayName(player)))}</span></h2>`; }
function buildClanInfoCardHtml(player){ return `<article class="clan-info-card"><div class="clan-info-text"><strong class="clan-info-title">${escapeHtml(getPlayerClanName(player))}</strong></div></article>`; }
async function load(){ initTheme(); bindSearch(); const [playersResponse, extensionsResponse, clansResponse] = await Promise.allSettled([fetch(DATA_URL), fetch(EXTENSIONS_DATA_URL), fetch(CLANS_DATA_URL)]); const playersJson = playersResponse.status === 'fulfilled' ? await playersResponse.value.json() : {}; extensionsData = extensionsResponse.status === 'fulfilled' ? await extensionsResponse.value.json() : null; clansData = clansResponse.status === 'fulfilled' ? await clansResponse.value.json() : {}; playersData = Object.entries(playersJson || {}).map(([id, value]) => ({ _id:id, ...value })); filteredPlayers = playersData; render(); }
document.addEventListener('DOMContentLoaded', load);
