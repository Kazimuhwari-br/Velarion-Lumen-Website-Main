/* ======================================================================
   Velarion Profile — Registro Público renderer/runtime independente
   ====================================================================== */
(function(window, document) {
  "use strict";

  if (window.VelarionProfilePublicRecord) return;

  function core() {
    const api = window.VelarionProfileCore;
    if (!api) throw new Error("VelarionProfilePublicRecord requer velarion-profile-core.js.");
    return api;
  }

  function getRarityId(player) {
    const C = core();
    const raw = player?.stats?.rarity;
    if (typeof raw === "string" || typeof raw === "number") return C.cleanValue(raw);
    if (raw && typeof raw === "object") return C.cleanValue(raw.id || raw.rarity_id || raw.value);
    return C.cleanValue(player?.badges?.rarity_id || player?.badges?.rarity || player?.rarity_id);
  }

  function getRoleLabel(player) {
    return core().stripMinecraftCodes(player?.badges?.role || player?.rank?.role || player?.clan?.rank || player?.role || "Sem cargo");
  }

  function getRankLabel(player) {
    return core().stripMinecraftCodes(player?.badges?.rank || player?.rank?.name || player?.rank?.role || "Sem rank");
  }

  function fallbackRole(player) {
    const C = core();
    return `<div class="vl-public-module-badge-card"><strong>${C.escapeHtml(getRoleLabel(player))}</strong><span>Cargo principal</span></div>`;
  }

  function fallbackRank(player) {
    const C = core();
    return `<div class="vl-public-module-badge-card"><strong>${C.escapeHtml(getRankLabel(player))}</strong><span>Rank atual</span></div>`;
  }

  function buildPublicHelpers(ctx) {
    const C = core();
    return {
      buildRoleInfoEmblemHtml: C.pick(ctx, "buildRoleInfoEmblemHtml", fallbackRole),
      buildRankInfoEmblemHtml: C.pick(ctx, "buildRankInfoEmblemHtml", fallbackRank)
    };
  }

  function render(player, context) {
    const C = core();
    const ctx = context || {};
    const h = buildPublicHelpers(ctx);
    const extensions = ctx?.extensionsData || {};
    const source = extensions.badges_raritys || extensions.badges_rarities || {};
    const rarityId = getRarityId(player);
    const esc = (value) => C.escapeHtml(String(value ?? ""));

    const aliases = rarityId ? [
      rarityId,
      rarityId.replace(/^rarity_id_/i, "raritys_id_"),
      rarityId.replace(/^raritys_id_/i, "rarity_id_")
    ] : [];

    const rarityKey = aliases.find((key) => source?.[key]) || "";
    const rarityData = C.mergeBadge(rarityKey ? source[rarityKey] : null) || {};

    /* Mantém a mesma leitura de estrelas da implementação anterior. */
    const starsValue = rarityData.website?.stars ?? rarityData.stars ?? rarityData.profile?.stars ?? "";
    let stars = 0;
    let maxStars = Number(rarityData.website?.max_stars ?? rarityData.max_stars ?? rarityData.profile?.max_stars ?? 0);
    if (typeof starsValue === "number" || /^\d+(?:\.\d+)?$/.test(String(starsValue).trim())) {
      stars = Math.max(0, Math.round(Number(starsValue)));
    } else {
      stars = Math.max(0, (C.cleanValue(starsValue).match(/★/g) || []).length);
    }
    if (!Number.isFinite(maxStars) || maxStars <= 0) maxStars = stars;
    if (maxStars < stars) maxStars = stars;

    const stats = player?.stats && typeof player.stats === "object" ? player.stats : {};
    const combat = stats?.combat && typeof stats.combat === "object" ? stats.combat : {};
    const rarityStats = stats?.rarity && typeof stats.rarity === "object" ? stats.rarity : {};

    const publicInfoUsername =
      C.cleanValue(player?.profile?.display_username) ||
      C.cleanValue(player?.display_username) ||
      C.cleanValue(player?.id) ||
      "—";

    const publicInfoRegisteredAt = C.cleanValue(stats?.timestamps?.account_created_at);

    const formatDocumentDateTime = (value) => {
      const raw = C.cleanValue(value);
      if (!raw) return "—";
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return raw;
      try {
        return new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }).format(date);
      } catch (_) {
        return raw;
      }
    };

    const asNumber = (value, fallback = 0) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const formatInteger = (value) => new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 0
    }).format(Math.max(0, Math.round(asNumber(value, 0))));

    const formatRatio = (value) => {
      const number = asNumber(value, 0);
      return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    };

    const normalizeRarityLabel = (value) => {
      const raw = C.cleanValue(value);
      if (!raw) return "—";
      return raw
        .replace(/^raritys?_id_/i, "")
        .replace(/^rarity_id_/i, "")
        .replace(/[_-]+/g, " ")
        .trim()
        .toUpperCase() || "—";
    };

    const characterMediaRaw = player?.theme?.card_embed?.character_image;
    const configuredCharacterImage = C.getMediaSource(characterMediaRaw);
    const characterFallbackKey = C.cleanValue(player?.profile?.gender) || C.cleanValue(player?.gender) || "default";
    const fallbackCharacterImage = C.getMediaSource(C.getFallbackMedia(ctx, "character", "", characterFallbackKey));
    const characterImage = configuredCharacterImage || fallbackCharacterImage;
    const characterIsWebM = C.isWebMMedia(characterImage);
    const fallbackCharacterIsWebM = C.isWebMMedia(fallbackCharacterImage);

    return `
      <div class="vl-public-stars-only ${characterImage ? "has-character" : "no-character"}" data-vl-public-stars="${esc(stars)}" data-vl-public-max-stars="${esc(maxStars)}">

        <div class="vl-public-stars-only__left-zone">
          <div class="vl-public-stars-only__visual" aria-hidden="true">
            <div class="vl-public-stars-only__effects">
              <span class="vl-public-stars-only__ring vl-public-stars-only__ring--one"></span>
              <span class="vl-public-stars-only__ring vl-public-stars-only__ring--two"></span>
              <span class="vl-public-stars-only__diamond vl-public-stars-only__diamond--one"></span>
              <span class="vl-public-stars-only__diamond vl-public-stars-only__diamond--two"></span>
              <span class="vl-public-stars-only__diamond vl-public-stars-only__diamond--three"></span>
            </div>

            ${characterImage ? `
              <div class="vl-public-stars-only__character ${characterIsWebM ? "is-webm" : "is-image"}">
                ${characterIsWebM
                  ? `<video
                       src="${esc(characterImage)}"
                       autoplay
                       loop
                       muted
                       playsinline
                       preload="auto"
                       tabindex="-1"
                       data-vl-character-fallback="${esc(fallbackCharacterImage)}"
                       data-vl-character-fallback-webm="${fallbackCharacterIsWebM ? "1" : "0"}"
                       onerror="window.VelarionProfilePublicRecord?.applyCharacterMediaFallback?.(this)"
                     ></video>`
                  : `<img
                       src="${esc(characterImage)}"
                       alt=""
                       loading="eager"
                       decoding="async"
                       data-vl-character-fallback="${esc(fallbackCharacterImage)}"
                       data-vl-character-fallback-webm="${fallbackCharacterIsWebM ? "1" : "0"}"
                       onerror="window.VelarionProfilePublicRecord?.applyCharacterMediaFallback?.(this)"
                     >`
                }
              </div>` : ""}
          </div>

          <div class="vl-public-info-stack vl-public-info-stack--document">
            <section class="vl-adventurer-document" aria-label="Documento público do jogador">
              <div class="vl-adventurer-document__top">
                <span class="vl-adventurer-document__sigil" aria-hidden="true"><i></i></span>
                <div class="vl-adventurer-document__title vl-adventurer-document__title--username">
                  <strong>${esc(publicInfoUsername)}</strong>
                </div>
              </div>

              <div class="vl-adventurer-document__divider" aria-hidden="true"></div>

              <div class="vl-adventurer-document__rows vl-adventurer-document__rows--single">
                <div class="vl-adventurer-document__row vl-adventurer-document__row--registration">
                  <span class="vl-adventurer-document__row-icon" aria-hidden="true">◷</span>
                  <div>
                    <small>Registro</small>
                    <strong>${esc(formatDocumentDateTime(publicInfoRegisteredAt))}</strong>
                  </div>
                </div>
              </div>
            </section>

            <aside class="vl-public-secondary vl-public-secondary--compact vl-public-quickstats vl-public-quickstats--rebuild"
                   aria-label="Dados públicos do jogador">
              <div class="vl-public-quickstats__frame-corner vl-public-quickstats__frame-corner--tl" aria-hidden="true"></div>
              <div class="vl-public-quickstats__frame-corner vl-public-quickstats__frame-corner--br" aria-hidden="true"></div>

              <div class="vl-public-secondary__topline vl-public-quickstats__header">
                <span>Dados públicos</span>
                <small>Resumo</small>
              </div>

              <section class="vl-public-quickstats__rarity vl-public-quickstats__rarity--hero" aria-label="Rarity">
                <span class="vl-public-quickstats__rarity-mark vl-public-quickstats__rarity-mark--hero" aria-hidden="true"><i></i></span>
                <div class="vl-public-quickstats__rarity-copy vl-public-quickstats__rarity-copy--hero">
                  <strong>${esc(normalizeRarityLabel(rarityStats.id))}</strong>
                  <small>Rarity</small>
                </div>
              </section>

              <div class="vl-public-quickstats__divider"></div>

              <section class="vl-public-quickstats__combat vl-public-quickstats__combat--hero" aria-label="Estatísticas de combate">
                <div class="vl-public-quickstats__combat-title">
                  <span class="vl-public-quickstats__combat-icon" aria-hidden="true">⚔</span>
                  <strong>Combate</strong>
                </div>
                <div class="vl-public-quickstats__combat-grid vl-public-quickstats__combat-grid--hero">
                  <span><small>Kills</small><strong>${esc(formatInteger(combat.kills))}</strong></span>
                  <span><small>Deaths</small><strong>${esc(formatInteger(combat.deaths))}</strong></span>
                  <span><small>Assists</small><strong>${esc(formatInteger(combat.assists))}</strong></span>
                  <span><small>K/D</small><strong>${esc(formatRatio(combat.kd_ratio))}</strong></span>
                </div>
              </section>
            </aside>
          </div>
        </div>

        <div class="vl-public-stars-only__right-zone">
          <div class="vl-public-systems-switcher" data-vl-public-systems-switcher data-subpage-index="0" data-sub-direction="none">
            <button class="vl-public-systems-switcher__nav vl-public-systems-switcher__nav--next"
                    type="button" data-vl-public-subnav="1" aria-label="Avançar para Rank">
              <span aria-hidden="true">›</span>
            </button>

            <div class="vl-public-systems-switcher__viewport">
              <article class="vl-public-systems-switcher__page is-active"
                       data-vl-public-subpage data-vl-public-subpage-label="Cargo" aria-hidden="false">
                <div class="vl-public-systems-switcher__content">
                  ${h.buildRoleInfoEmblemHtml(player)}
                </div>
              </article>

              <article class="vl-public-systems-switcher__page"
                       data-vl-public-subpage data-vl-public-subpage-label="Rank" aria-hidden="true" inert>
                <div class="vl-public-systems-switcher__content">
                  ${h.buildRankInfoEmblemHtml(player)}
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>`;
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
      button.setAttribute("aria-label", delta < 0 ? `Voltar para ${targetLabel}` : `Avançar para ${targetLabel}`);
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
      const button = event.target.closest?.("[data-vl-public-subnav]");
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
    const C = core();
    element?.removeAttribute?.("data-vl-fallback-pending");
    if (!element || element.dataset.vlFallbackApplied === "1") return;
    const fallback = C.cleanValue(element.dataset.vlCharacterFallback);
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

  function hydrate(root) {
    ensurePublicSystemsSubNavigation();
    const scope = root || document;
    scope.querySelectorAll?.('[data-vl-fallback-pending="1"]').forEach(applyCharacterMediaFallback);
  }

  window.VelarionProfilePublicRecord = {
    render,
    hydrate,
    refresh: hydrate,
    applyCharacterMediaFallback,
    setSubPage: setPublicSystemsSubPage
  };
})(window, document);
