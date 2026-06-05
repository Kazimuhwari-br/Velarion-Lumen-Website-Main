export function renderSearchBox() {
  return `
    <form class="search-box" data-search-form>
      <label class="search-box__label" for="player-search">Buscar jogador</label>
      <div class="search-box__control">
        <input id="player-search" class="search-box__input" type="search" placeholder="Digite nome, @username, rank ou nível..." autocomplete="off" data-search-input>
        <button class="search-box__button" type="submit">Buscar</button>
      </div>
    </form>
  `;
}

export function filterPlayers(players, query) {
  const term = String(query || '').trim().toLowerCase();
  if (!term) return players;

  return players.filter((player) => {
    const text = [player.displayName, player.username, player.login, player.rank, player.role, player.level]
      .join(' ')
      .toLowerCase();
    return text.includes(term);
  });
}
