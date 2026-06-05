import { escapeHtml } from '../../utils/sanitize.js';
import { makeProfileUrl } from '../../utils/routes.js';

function renderInfoChips(player) {
  const chips = [
    player.rank ? `Rank: ${player.rank}` : '',
    player.role ? `Cargo: ${player.role}` : '',
    `Lv. ${player.level}`,
    player.country ? `País: ${player.country}` : ''
  ].filter(Boolean);

  return chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join('');
}

export function renderPlayerCard(player) {
  return `
    <article class="player-card">
      <a class="player-card__link" href="${makeProfileUrl(player.id)}">
        <div class="player-card__banner" ${player.banner ? `style="background-image:url('${escapeHtml(player.banner)}')"` : ''}>
          ${player.character ? `<img class="player-card__character" src="${escapeHtml(player.character)}" alt="" loading="lazy">` : ''}
        </div>
        <div class="player-card__body">
          <img class="player-card__avatar" src="${escapeHtml(player.avatar)}" alt="Avatar de ${escapeHtml(player.displayName)}" loading="lazy">
          <div class="player-card__info">
            <h2 class="player-card__name">${escapeHtml(player.displayName)}</h2>
            <p class="player-card__username">@${escapeHtml(player.username || player.login)}</p>
            <div class="player-card__meta">${renderInfoChips(player)}</div>
            ${player.bio ? `<p class="player-card__bio">${escapeHtml(player.bio)}</p>` : ''}
          </div>
        </div>
      </a>
    </article>
  `;
}

export function renderPlayerListItem(player) {
  return `
    <article class="player-list-item">
      <a class="player-list-item__link" href="${makeProfileUrl(player.id)}">
        <img class="player-list-item__avatar" src="${escapeHtml(player.avatar)}" alt="Avatar de ${escapeHtml(player.displayName)}" loading="lazy">
        <div class="player-list-item__main">
          <div class="player-list-item__identity">
            <h2>${escapeHtml(player.displayName)}</h2>
            <p>@${escapeHtml(player.username || player.login)}</p>
          </div>
          <div class="player-list-item__meta">${renderInfoChips(player)}</div>
        </div>
      </a>
    </article>
  `;
}
