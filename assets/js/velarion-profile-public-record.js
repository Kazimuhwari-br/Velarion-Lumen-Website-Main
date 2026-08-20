/* ======================================================================
   Velarion Profile — Registro Público (runtime)
   ====================================================================== */
(function(window, document) {
  "use strict";

  if (window.VelarionProfilePublicRecord) {
    window.VelarionProfilePublicRecord.refresh?.(document);
    return;
  }

  function cleanValue(value) {
    const helper = window.VelarionProfile?.helpers?.cleanValue;
    return typeof helper === "function" ? helper(value) : String(value ?? "").trim();
  }

  let publicSystemsSubNavigationReady = false;


  function setPublicSystemsSubPage(root, nextIndex, direction = 0) {
    if (!root) return;

    const pages = Array.from(root.querySelectorAll("[data-vl-public-subpage]"));
    if (!pages.length) return;

    const total = pages.length;
    const index = ((Number(nextIndex) % total) + total) % total;

    pages.forEach((page, pageIndex) => {
      const active = pageIndex === index;
      page.classList.toggle("is-active", active);
      page.setAttribute("aria-hidden", active ? "false" : "true");
      if (active) page.removeAttribute("inert");
      else page.setAttribute("inert", "");
    });

    root.dataset.subpageIndex = String(index);
    root.dataset.subDirection = direction < 0 ? "prev" : direction > 0 ? "next" : "none";

    const current = pages[index];
    const label = current?.dataset.vlPublicSubpageLabel || `Página ${index + 1}`;

    const labelNode = root.querySelector("[data-vl-public-subpage-current]");
    if (labelNode) labelNode.textContent = label;

    const counter = root.querySelector("[data-vl-public-subpage-counter]");
    if (counter) counter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

    root.querySelectorAll("[data-vl-public-subnav]").forEach((button) => {
      const delta = Number(button.dataset.vlPublicSubnav || 0);
      const targetIndex = ((index + delta) % total + total) % total;
      const targetLabel = pages[targetIndex]?.dataset.vlPublicSubpageLabel || `Página ${targetIndex + 1}`;
      button.setAttribute(
        "aria-label",
        delta < 0 ? `Voltar para ${targetLabel}` : `Avançar para ${targetLabel}`
      );
      button.title = delta < 0 ? `Voltar: ${targetLabel}` : `Próximo: ${targetLabel}`;
    });

    if (current) {
      current.classList.remove("vl-public-systems-switcher__page--enter");
      void current.offsetWidth;
      current.classList.add("vl-public-systems-switcher__page--enter");
    }
  }

  function ensurePublicSystemsSubNavigation() {
    if (publicSystemsSubNavigationReady) return;
    publicSystemsSubNavigationReady = true;

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-vl-public-subnav]");
      if (!button) return;

      const root = button.closest("[data-vl-public-systems-switcher]");
      if (!root) return;

      const current = Number(root.dataset.subpageIndex || 0);
      const delta = Number(button.dataset.vlPublicSubnav || 0);
      if (!delta) return;

      event.preventDefault();
      event.stopPropagation();
      setPublicSystemsSubPage(root, current + delta, delta);
    });
  }

  function applyCharacterMediaFallback(element) {
    element?.removeAttribute?.("data-vl-fallback-pending");
    if (!element || element.dataset.vlFallbackApplied === "1") return;

    const fallback = cleanValue(element.dataset.vlCharacterFallback);
    if (!fallback) {
      element.remove();
      return;
    }

    element.dataset.vlFallbackApplied = "1";
    const fallbackIsWebM = element.dataset.vlCharacterFallbackWebm === "1";

    if (fallbackIsWebM && element.tagName !== "VIDEO") {
      const video = document.createElement("video");
      video.src = fallback;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.tabIndex = -1;
      video.dataset.vlFallbackApplied = "1";
      video.onerror = () => video.remove();
      element.replaceWith(video);
      return;
    }

    if (!fallbackIsWebM && element.tagName !== "IMG") {
      const image = document.createElement("img");
      image.src = fallback;
      image.alt = "";
      image.loading = "eager";
      image.decoding = "async";
      image.dataset.vlFallbackApplied = "1";
      image.onerror = () => image.remove();
      element.replaceWith(image);
      return;
    }

    element.src = fallback;
    element.onerror = () => element.remove();
  }

  function refresh(root) {
    ensurePublicSystemsSubNavigation();
    const scope = root || document;
    scope.querySelectorAll?.('[data-vl-fallback-pending="1"]').forEach((element) => {
      applyCharacterMediaFallback(element);
    });
  }

  window.VelarionProfilePublicRecord = {
    refresh,
    applyCharacterMediaFallback
  };

  refresh(document);
})(window, document);
