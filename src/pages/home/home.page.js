import { renderAppHeader } from '../../components/AppHeader/AppHeader.js';
import { renderPlayerGrid } from '../../components/PlayerGrid/PlayerGrid.js';
import { getPlayers } from '../../services/players.service.js';
import { makeUrl } from '../../utils/routes.js';

const app = document.querySelector('#app');

async function initHomePage() {
  app.innerHTML = `
    ${renderAppHeader('home')}
    <main class="page-shell">
      <section class="hero-section">
        <p class="eyebrow">Comunidade Minecraft Bedrock</p>
        <h1>Velarion Lumen</h1>
        <p class="hero-section__text">
          Plataforma de jogadores com perfis, ranks, emblemas e identidade visual em fantasia moderna anime.
        </p>
        <div class="hero-section__actions">
          <a class="button button--primary" href="${makeUrl('/search/users/')}">Ver jogadores</a>
          <a class="button button--ghost" href="https://github.com/Kazimuhwari-br/Velarion-Lumen-Website-Main" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </section>
      <section class="section-block">
        <div class="section-heading">
          <p class="eyebrow">Destaques</p>
          <h2>Jogadores recentes</h2>
        </div>
        <div data-home-players class="loading-state">Carregando jogadores...</div>
      </section>
    </main>
  `;

  const target = document.querySelector('[data-home-players]');

  try {
    const players = await getPlayers();
    target.outerHTML = renderPlayerGrid(players.slice(0, 6));
  } catch (error) {
    console.error(error);
    target.textContent = 'Não foi possível carregar os jogadores.';
  }
}

initHomePage();
