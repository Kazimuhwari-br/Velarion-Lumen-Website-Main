import { escapeHtml } from '../../utils/sanitize.js';
import { makeProfileUrl } from '../../utils/routes.js';

export function renderPlayerCard(player) {
  return `
    <article class="player-card">
      <a class="player-card__link" href="${makeProfileUrl(player.id)}">
        <div class="player-card__banner" ${player.banner ? `style="background-image:url('${escapeHtml(player.banner)}')"` : ''}></div>
        <div class="player-card__body">
          <img class="player-card__avatar" src="${escapeHtml(player.avatar)}" alt="Avatar de ${escapeHtml(player.displayName)}" loading="lazy">
          <div class="player-card__info">
            <h2 class="player-card__name">${escapeHtml(player.displayName)}</h2>
            <p class="player-card__username">@${escapeHtml(player.username)}</p>
            <div class="player-card__meta">
              <span>${escapeHtml(player.rank)}</span>
              <span>Lv. ${escapeHtml(player.level)}</span>
            </div>
          </div>
        </div>
      </a>
    </article>
  `;
}
