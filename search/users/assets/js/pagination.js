export function renderPaginationActions(totalItems, state) {
  const totalPages = Math.max(1, Math.ceil(totalItems / state.itemsPerPage));
  const el = document.getElementById("paginationActions");

  if (!el) return;

  el.innerHTML = "";

  for (let page = 1; page <= totalPages; page++) {
    const button = document.createElement("button");
    button.className = `page-btn${page === state.currentPage ? " is-active" : ""}`;
    button.dataset.page = String(page);
    button.textContent = String(page);
    el.appendChild(button);
  }

  el.onclick = (event) => {
    const btn = event.target.closest(".page-btn[data-page]");
    if (!btn) return;

    state.currentPage = Number(btn.dataset.page);
    window.dispatchEvent(new CustomEvent("players:render"));
  };
}
