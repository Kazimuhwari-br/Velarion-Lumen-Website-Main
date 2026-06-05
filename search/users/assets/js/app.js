import { debounce } from "./utilities.js";
import { applySearch } from "./search.js";
import { createCard, createListCard, attach3DEffect } from "./cards.js";
import { openDetail, closeDetail } from "./details.js";
import { renderPaginationActions } from "./pagination.js";
import { applyTheme } from "./themes.js";

const DATA_URL = "https://kazimuhwaribedrock-default-rtdb.firebaseio.com/profilePlayers.json";
const EXTENSIONS_DATA_URL = "https://kazimuhwaribedrock-extensions-default-rtdb.firebaseio.com/information_panel.json";

export const state = {
  playersData: [],
  filteredPlayers: [],
  activePlayerId: null,
  isTransitionRunning: false,
  isListMode: false,
  currentPage: 1,
  itemsPerPage: 6,
  extensionsData: null
};

export const els = {
  players: document.getElementById("players"),
  search: document.getElementById("search"),
  toggleView: document.getElementById("toggleView"),
  paginationActions: document.getElementById("paginationActions"),
  pageSizeSelect: document.getElementById("pageSizeSelect")
};

export function render(players = state.filteredPlayers) {
  const start = (state.currentPage - 1) * state.itemsPerPage;
  const pageItems = players.slice(start, start + state.itemsPerPage);

  els.players.classList.toggle("list-mode", state.isListMode);

  els.players.innerHTML = pageItems.length
    ? pageItems.map((player, index) =>
        state.isListMode ? createListCard(player, index) : createCard(player, index)
      ).join("")
    : `<div class="empty">Nenhum jogador encontrado.</div>`;

  renderPaginationActions(players.length, state);
  attach3DEffect();
}

async function load() {
  try {
    const [playersRes, extensionsRes] = await Promise.all([
      fetch(DATA_URL, { cache: "no-store" }),
      fetch(EXTENSIONS_DATA_URL, { cache: "no-store" })
    ]);

    const playersJson = await playersRes.json();
    const extensionsJson = await extensionsRes.json();

    state.extensionsData = extensionsJson || {};
    state.playersData = Object.entries(playersJson || {}).map(([id, player]) => ({
      _id: id,
      ...player
    }));

    state.filteredPlayers = state.playersData.slice();
    render();
  } catch (error) {
    els.players.innerHTML = `<div class="empty">Erro ao carregar Firebase: ${String(error.message || error)}</div>`;
  }
}

els.search.addEventListener("input", debounce((event) => {
  applySearch(event.target.value, state);
  render();
}, 100));

els.toggleView.addEventListener("click", () => {
  if (state.isTransitionRunning || state.activePlayerId) return;
  state.isListMode = !state.isListMode;
  render();
});

els.players.addEventListener("click", (event) => {
  const card = event.target.closest(".card[data-player-id]");
  if (!card || state.isTransitionRunning) return;
  openDetail(card.dataset.playerId, card, state);
});

document.getElementById("backBtn")?.addEventListener("click", () => {
  closeDetail(state);
});

applyTheme("default");
load();
