import {
  escapeHtml,
  normalizeHexColor,
  hexToRgba,
  getDisplayName,
  getUsername,
  getBanner,
  getCharacter
} from "./utilities.js";

export function createCard(player, index) {
  const color = normalizeHexColor(player?.theme?.card_embed?.card_color || "#5865F2");
  const displayName = getDisplayName(player);
  const username = getUsername(player);
  const banner = getBanner(player);
  const character = getCharacter(player);

  return `
    <article
      class="card"
      data-player-id="${escapeHtml(player._id)}"
      style="
        --accent: ${color};
        --accent-soft: ${hexToRgba(color, 0.18)};
        --accent-mid: ${hexToRgba(color, 0.28)};
      "
      tabindex="0"
      aria-label="${escapeHtml(displayName)}"
    >
      <div class="card-bg">
        <img src="${escapeHtml(banner)}" alt="${escapeHtml(displayName)}" loading="lazy">
      </div>

      <div class="card-visual">
        <div class="character-wrap">
          <img src="${escapeHtml(character)}" alt="${escapeHtml(displayName)}" loading="lazy">
        </div>
      </div>

      <div class="card-outline"></div>
      <div class="side-rail"></div>

      <div class="card-bottom">
        <div class="player-username-line">${escapeHtml(username)}</div>
        <h2 class="title">${escapeHtml(displayName)}</h2>
      </div>
    </article>
  `;
}

export function createListCard(player, index) {
  const color = normalizeHexColor(player?.theme?.card_embed?.card_color || "#5865F2");
  const displayName = getDisplayName(player);
  const username = getUsername(player);
  const banner = getBanner(player);

  return `
    <article
      class="card list-card"
      data-player-id="${escapeHtml(player._id)}"
      style="--accent:${color}"
      tabindex="0"
    >
      <div class="list-banner">
        <img src="${escapeHtml(banner)}" alt="${escapeHtml(displayName)}" loading="lazy">
      </div>

      <div class="list-avatar">
        <img src="${escapeHtml(banner)}" alt="${escapeHtml(displayName)}" loading="lazy">
      </div>

      <div class="list-info">
        <strong class="list-displayname">${escapeHtml(displayName)}</strong>
        <span class="list-username">${escapeHtml(username)}</span>
      </div>

      <div class="list-meta">
        <span class="list-level">${escapeHtml(player?.level || "-")}</span>
      </div>
    </article>
  `;
}

export function attach3DEffect() {
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      card.style.setProperty("--mx", `${x}px`);
      card.style.setProperty("--my", `${y}px`);
    });
  });
}
