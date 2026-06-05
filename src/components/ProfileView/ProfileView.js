import { escapeHtml } from '../../utils/sanitize.js';

export function renderProfileView(player) {
  if (!player) {
    return '<section class="profile-view"><p class="empty-state">Perfil não encontrado.</p></section>';
  }

  return `
    <section class="profile-view">
      <div class="profile-view__banner" ${player.banner ? `style="background-image:url('${escapeHtml(player.banner)}')"` : ''}></div>
      <div class="profile-view__body">
        <img class="profile-view__avatar" src="${escapeHtml(player.avatar)}" alt="Avatar de ${escapeHtml(player.displayName)}">
        <div class="profile-view__content">
          <p class="eyebrow">Perfil de jogador</p>
          <h1>${escapeHtml(player.displayName)}</h1>
          <p class="profile-view__username">@${escapeHtml(player.username)}</p>
          <div class="profile-view__stats">
            <span>Rank: <strong>${escapeHtml(player.rank)}</strong></span>
            <span>Nível: <strong>${escapeHtml(player.level)}</strong></span>
            ${player.country ? `<span>País: <strong>${escapeHtml(player.country)}</strong></span>` : ''}
          </div>
          ${player.bio ? `<p class="profile-view__bio">${escapeHtml(player.bio)}</p>` : ''}
        </div>
      </div>
    </section>
  `;
}
