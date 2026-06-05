import { renderAppHeader } from '../../components/AppHeader/AppHeader.js';
import { renderPlayerGrid } from '../../components/PlayerGrid/PlayerGrid.js';
import { renderSearchBox, filterPlayers } from '../../components/SearchBox/SearchBox.js';
import { getPlayers } from '../../services/players.service.js';

const app = document.querySelector('#app');
let allPlayers = [];

function renderResults(players) {
  const result = document.querySelector('[data-results]');
  result.innerHTML = renderPlayerGrid(players);
}

async function initSearchUsersPage() {
  app.innerHTML = `
    ${renderAppHeader('players')}
    <main class="page-shell">
      <section class="section-heading section-heading--large">
        <p class="eyebrow">Busca</p>
        <h1>Jogadores</h1>
        <p>Encontre jogadores por nome, username, rank ou nível.</p>
      </section>
      ${renderSearchBox()}
      <div data-results class="loading-state">Carregando jogadores...</div>
    </main>
  `;

  try {
    allPlayers = await getPlayers();
    renderResults(allPlayers);
  } catch (error) {
    console.error(error);
    document.querySelector('[data-results]').textContent = 'Não foi possível carregar os jogadores.';
  }

  const form = document.querySelector('[data-search-form]');
  const input = document.querySelector('[data-search-input]');

  input.addEventListener('input', () => renderResults(filterPlayers(allPlayers, input.value)));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    renderResults(filterPlayers(allPlayers, input.value));
  });
}

initSearchUsersPage();
