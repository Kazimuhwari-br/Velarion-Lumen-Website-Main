import { renderAppHeader } from '../../components/AppHeader/AppHeader.js';
import { renderPlayers } from '../../components/PlayerGrid/PlayerGrid.js';
import { renderSearchBox, filterPlayers } from '../../components/SearchBox/SearchBox.js';
import { renderViewModeToggle } from '../../components/ViewModeToggle/ViewModeToggle.js';
import { getPlayers } from '../../services/players.service.js';

const app = document.querySelector('#app');
let allPlayers = [];
let currentQuery = '';
let currentMode = localStorage.getItem('velarion:view-mode') || 'cards';

function getCurrentPlayers() {
  return filterPlayers(allPlayers, currentQuery);
}

function renderResults() {
  const result = document.querySelector('[data-results]');
  const counter = document.querySelector('[data-results-count]');
  const players = getCurrentPlayers();

  if (counter) {
    counter.textContent = `${players.length} jogador${players.length === 1 ? '' : 'es'} encontrado${players.length === 1 ? '' : 's'}`;
  }

  result.innerHTML = renderPlayers(players, currentMode);
}

function updateToggleState() {
  document.querySelectorAll('[data-view-mode]').forEach((button) => {
    const active = button.dataset.viewMode === currentMode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

async function initSearchUsersPage() {
  app.innerHTML = `
    ${renderAppHeader('players')}
    <main class="page-shell">
      <section class="section-heading section-heading--large">
        <p class="eyebrow">Busca</p>
        <h1>Jogadores</h1>
        <p>Encontre jogadores por nome, username, rank, cargo, país ou nível.</p>
      </section>

      <section class="players-panel">
        ${renderSearchBox()}
        <div class="players-panel__bar">
          <p class="players-panel__count" data-results-count>Carregando jogadores...</p>
          ${renderViewModeToggle(currentMode)}
        </div>
        <div data-results class="loading-state">Carregando jogadores...</div>
      </section>
    </main>
  `;

  try {
    allPlayers = await getPlayers();
    renderResults();
  } catch (error) {
    console.error(error);
    document.querySelector('[data-results]').textContent = 'Não foi possível carregar os jogadores.';
  }

  const form = document.querySelector('[data-search-form]');
  const input = document.querySelector('[data-search-input]');

  input.addEventListener('input', () => {
    currentQuery = input.value;
    renderResults();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    currentQuery = input.value;
    renderResults();
  });

  document.querySelectorAll('[data-view-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      currentMode = button.dataset.viewMode === 'list' ? 'list' : 'cards';
      localStorage.setItem('velarion:view-mode', currentMode);
      updateToggleState();
      renderResults();
    });
  });
}

initSearchUsersPage();
