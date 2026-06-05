import { escapeHtml, getDisplayName, getUsername, getBanner, getCharacter } from "./utilities.js";

export function openDetail(playerId, sourceCard, state) {
  const player = state.playersData.find((item) => item._id === playerId);
  if (!player) return;

  state.activePlayerId = playerId;

  const detailView = document.getElementById("detailView");
  const detailContent = document.getElementById("detailContent");

  detailContent.innerHTML = createDetailView(player);
  detailView.classList.add("active");

  requestAnimationFrame(() => {
    detailView.classList.add("ready");
  });
}

export function closeDetail(state) {
  const detailView = document.getElementById("detailView");

  detailView.classList.remove("ready");

  setTimeout(() => {
    detailView.classList.remove("active");
    state.activePlayerId = null;
  }, 350);
}

export function createDetailView(player) {
  const displayName = getDisplayName(player);
  const username = getUsername(player);

  return `
    <div class="detail-shell">
      <div class="detail-card">
        <div class="detail-bg">
          <img src="${escapeHtml(getBanner(player))}" alt="${escapeHtml(displayName)}">
        </div>

        <div class="detail-character-wrap">
          <img src="${escapeHtml(getCharacter(player))}" alt="${escapeHtml(displayName)}">
        </div>

        <div class="detail-bottom">
          <div class="detail-username-line">${escapeHtml(username)}</div>
          <h1 class="detail-title">${escapeHtml(displayName)}</h1>
        </div>
      </div>

      <section class="detail-info">
        <div class="info-panel">
          <h2 class="info-title">Informações</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">ID</span>
              <span class="info-value">${escapeHtml(player._id)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Clan</span>
              <span class="info-value">${escapeHtml(player?.clan?.id || "-")}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}
