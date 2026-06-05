import { renderAppHeader } from '../../components/AppHeader/AppHeader.js';
import { renderProfileView } from '../../components/ProfileView/ProfileView.js';
import { getPlayerById } from '../../services/players.service.js';
import { getQueryParam, makeUrl } from '../../utils/routes.js';

const app = document.querySelector('#app');

async function initProfilePage() {
  const playerId = getQueryParam('id');

  app.innerHTML = `
    ${renderAppHeader('players')}
    <main class="page-shell">
      <a class="back-link" href="${makeUrl('/search/users/')}">← Voltar para jogadores</a>
      <div data-profile class="loading-state">Carregando perfil...</div>
    </main>
  `;

  const target = document.querySelector('[data-profile]');

  if (!playerId) {
    target.outerHTML = renderProfileView(null);
    return;
  }

  try {
    const player = await getPlayerById(playerId);
    target.outerHTML = renderProfileView(player);
  } catch (error) {
    console.error(error);
    target.textContent = 'Não foi possível carregar este perfil.';
  }
}

initProfilePage();
