export function renderViewModeToggle(activeMode = 'cards') {
  const mode = activeMode === 'list' ? 'list' : 'cards';

  return `
    <div class="view-toolbar" aria-label="Controles de visualização">
      <p class="view-toolbar__label">Visualização</p>
      <div class="view-toggle" role="group" aria-label="Alternar modo de exibição">
        <button class="view-toggle__button ${mode === 'cards' ? 'is-active' : ''}" type="button" data-view-mode="cards" aria-pressed="${mode === 'cards'}">
          Cards
        </button>
        <button class="view-toggle__button ${mode === 'list' ? 'is-active' : ''}" type="button" data-view-mode="list" aria-pressed="${mode === 'list'}">
          Lista
        </button>
      </div>
    </div>
  `;
}
