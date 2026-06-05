import { renderPlayerCard, renderPlayerListItem } from '../PlayerCard/PlayerCard.js';

export function renderPlayers(players, mode = 'cards') {
  if (!players.length) {
    return '<p class="empty-state">Nenhum jogador encontrado.</p>';
  }

  if (mode === 'list') {
    return `<section class="player-list">${players.map(renderPlayerListItem).join('')}</section>`;
  }

  return `<section class="player-grid">${players.map(renderPlayerCard).join('')}</section>`;
}

export const renderPlayerGrid = renderPlayers;
