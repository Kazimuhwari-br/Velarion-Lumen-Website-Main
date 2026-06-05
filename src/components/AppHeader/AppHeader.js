import { APP_CONFIG } from '../../config/app.config.js';
import { makeUrl } from '../../utils/routes.js';

export function renderAppHeader(active = 'home') {
  const items = [
    { id: 'home', label: 'Início', href: makeUrl('/') },
    { id: 'players', label: 'Jogadores', href: makeUrl('/search/users/') },
    { id: 'docs', label: 'GitHub', href: 'https://github.com/Kazimuhwari-br/Velarion-Lumen-Website-Main', external: true }
  ];

  return `
    <header class="app-header">
      <a class="app-header__brand" href="${makeUrl('/')}">
        <span class="app-header__mark">VL</span>
        <span>${APP_CONFIG.name}</span>
      </a>
      <nav class="app-header__nav" aria-label="Navegação principal">
        ${items.map((item) => `
          <a class="app-header__link ${active === item.id ? 'is-active' : ''}"
             href="${item.href}"
             ${item.external ? 'target="_blank" rel="noreferrer"' : ''}>
            ${item.label}
          </a>
        `).join('')}
      </nav>
    </header>
  `;
}
