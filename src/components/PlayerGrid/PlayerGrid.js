import { renderPlayerCard } from '../PlayerCard/PlayerCard.js';

export function renderPlayerGrid(players) {
  if (!players.length) {
    return '<p class="empty-state">Nenhum jogador encontrado.</p>';
  }

  return `<section class="player-grid">${players.map(renderPlayerCard).join('')}</section>`;
}
