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

  function cleanSystemValue(value) {
    const C = core();
    if (value === null || value === undefined || value === false) return "";
    if (typeof value !== "string" && typeof value !== "number") return "";
    return C.stripMinecraftCodes(C.cleanValue(value));
  }

  function fallbackText(...values) {
    for (const value of values) {
      const text = cleanSystemValue(value);
      if (text) return text;
    }
    return "";
  }

  function normalizeProfileBadgeEntries(raw) {
    const C = core();
    const output = [];
    const seen = new Set();

    const push = (id, data) => {
      const cleanId = C.cleanValue(id);
      if (!cleanId || seen.has(cleanId)) return;
      seen.add(cleanId);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        output.push(Object.assign({}, data, { id: cleanId }));
      } else {
        output.push({ id: cleanId });
      }
    };

    const visit = (value) => {
      if (value === null || value === undefined || value === false) return;
      if (typeof value === "string" || typeof value === "number") {
        push(value, null);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (typeof value !== "object") return;

      const explicitId = value.id || value.badge_id || value.role_id || value.rank_id || value.value;
      if (explicitId) {
        push(explicitId, value);
        return;
      }

      Object.entries(value).forEach(([key, child]) => {
        if (/^(?:role|rank)_id_/i.test(key)) {
          push(key, child);
        } else if (child && typeof child === "object" && !Array.isArray(child)) {
          const childId = child.id || child.badge_id || child.role_id || child.rank_id;
          if (childId) push(childId, child);
        }
      });
    };

    visit(raw);
    return output;
  }

  function getPlayerSystemEntries(type, player) {
    if (type === "role") {
      return normalizeProfileBadgeEntries(
        player?.badges?.role ??
        player?.badges?.roles ??
        player?.role?.badge_id ??
        player?.role
      );
    }
    return normalizeProfileBadgeEntries(
      player?.badges?.rank ??
      player?.badges?.ranks ??
      player?.rank?.badge_id
    );
  }

  function getRoleLabel(player) {
    const entry = getPlayerSystemEntries("role", player)[0];
    return fallbackText(
      entry?.label,
      entry?.name,
      entry?.title,
      typeof player?.badges?.role === "string" ? player.badges.role : "",
      typeof player?.rank?.role === "string" ? player.rank.role : "",
      typeof player?.clan?.rank === "string" ? player.clan.rank : "",
      entry?.id ? String(entry.id).replace(/^role_id_/i, "").replace(/[_-]+/g, " ") : "",
      "Sem cargo"
    );
  }

  function getRankLabel(player) {
    const entry = getPlayerSystemEntries("rank", player)[0];
    return fallbackText(
      entry?.label,
      entry?.name,
      entry?.title,
      typeof player?.badges?.rank === "string" ? player.badges.rank : "",
      typeof player?.rank?.name === "string" ? player.rank.name : "",
      entry?.id ? String(entry.id).replace(/^rank_id_/i, "").replace(/[_-]+/g, " ") : "",
      "Sem rank"
    );
  }

  function safeSystemColor(value, fallback) {
    const raw = String(value || "").trim();
    return /^#[0-9a-f]{3,8}$/i.test(raw) ? raw : fallback;
  }

  function formatSystemDate(value) {
    const raw = cleanSystemValue(value);
    if (!raw) return "—";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    try { return date.toLocaleString("pt-BR"); }
    catch (_) { return raw; }
  }

  function getSystemDefinition(type, id, extensions) {
    const C = core();
    const cleanId = C.cleanValue(id);
    if (!cleanId) return null;
    const source = type === "role"
      ? (extensions?.badges_roles || extensions?.badges_role || {})
      : (extensions?.badges_ranks || extensions?.badges_rank || {});
    const direct = source && typeof source === "object" ? source[cleanId] : null;
    if (!direct || typeof direct !== "object") return null;
    return C.mergeBadge(direct) || direct;
  }

  function resolveSystemCardData(type, player, extensions) {
    const C = core();
    const isRole = type === "role";
    const entry = getPlayerSystemEntries(type, player)[0] || null;
    const definition = entry ? getSystemDefinition(type, entry.id, extensions) : null;
    const website = definition?.website && typeof definition.website === "object" ? definition.website : {};
    const hierarchy = definition?.hierarchy && typeof definition.hierarchy === "object" ? definition.hierarchy : {};

    const rawId = fallbackText(entry?.id, definition?.id);
    const humanizedId = rawId
      ? rawId.replace(isRole ? /^role_id_/i : /^rank_id_/i, "").replace(/[_-]+/g, " ")
      : "";

    const title = fallbackText(
      definition?.label,
      definition?.name,
      definition?.title,
      website?.label,
      website?.title,
      entry?.label,
      entry?.name,
      entry?.title,
      humanizedId,
      isRole ? getRoleLabel(player) : getRankLabel(player),
      isRole ? "Sem cargo" : "Sem rank"
    );

    const id = rawId || "—";
    const group = fallbackText(
      hierarchy?.group,
      definition?.category,
      definition?.group,
      website?.group,
      isRole ? "role" : "rank"
    ) || (isRole ? "role" : "rank");

    const description = fallbackText(
      definition?.description,
      definition?.desc,
      website?.description,
      website?.desc,
      entry?.description,
      entry?.desc,
      isRole ? "Cargo do perfil." : "Rank do perfil."
    );

    const date = formatSystemDate(
      entry?.unlocked_at ??
      entry?.assigned_at ??
      entry?.created_at ??
      definition?.unlocked_at ??
      definition?.assigned_at ??
      definition?.created_at
    );

    const mediaRaw = fallbackText(
      definition?.icon,
      definition?.emblem,
      definition?.image,
      website?.icon,
      website?.emblem,
      website?.image
    );
    const image = C.getMediaSource ? C.getMediaSource(mediaRaw) : mediaRaw;

    const primary = safeSystemColor(fallbackText(
      definition?.color,
      website?.color,
      definition?.primary_color,
      website?.primary_color
    ), isRole ? "#8168ff" : "#39c7ff");
    const secondary = safeSystemColor(fallbackText(
      definition?.color2,
      website?.color2,
      definition?.secondary_color,
      website?.secondary_color,
      definition?.color,
      website?.color
    ), isRole ? "#55d7ff" : "#9e78ff");
    const highlight = safeSystemColor(fallbackText(
      definition?.glow,
      website?.glow,
      definition?.highlight_color,
      website?.highlight_color,
      definition?.color2,
      website?.color2
    ), isRole ? "#d7c8ff" : "#c9f7ff");

    return { title, id, group, description, date, image, primary, secondary, highlight };
  }

  function buildSystemHologram(type, player, extensions) {
    const C = core();
    const esc = (value) => C.escapeHtml(String(value ?? ""));
    const data = resolveSystemCardData(type, player, extensions);
    const isRole = type === "role";
    const section = isRole ? "Cargo" : "Rank";
    const eyebrow = isRole ? "Função atual" : "Classificação atual";
    const code = isRole ? "ROLE ACCESS" : "RANK MATRIX";
    const sigil = isRole ? "✦" : "◆";

    const facts = isRole
      ? [
          ["Grupo", data.group, "⌂"],
          ["Descrição", data.description, "▤"],
          ["ID", data.id, "⌘"],
          ["Data", data.date, "◷"]
        ]
      : [
          ["Classe", data.group, "◇"],
          ["Descrição", data.description, "▤"],
          ["ID", data.id, "⌘"],
          ["Data", data.date, "◷"]
        ];

    return `
      <section class="vl-system-zero vl-system-zero--${isRole ? "role" : "rank"}"
               style="--sz-primary:${esc(data.primary)};--sz-secondary:${esc(data.secondary)};--sz-highlight:${esc(data.highlight)}"
               aria-label="${esc(section)}: ${esc(data.title)}">
        <div class="vl-system-zero__grid" aria-hidden="true"></div>
        <div class="vl-system-zero__beam" aria-hidden="true"></div>
        <header class="vl-system-zero__header">
          <div class="vl-system-zero__brand">
            <span class="vl-system-zero__brand-mark"><i></i></span>
            <div><small>Sistema</small><strong>${esc(section)}</strong></div>
          </div>
          <span class="vl-system-zero__code">VL // ${esc(code)}</span>
        </header>

        <div class="vl-system-zero__hero">
          <div class="vl-system-zero__seal-wrap" aria-hidden="true">
            <span class="vl-system-zero__orbit vl-system-zero__orbit--a"></span>
            <span class="vl-system-zero__orbit vl-system-zero__orbit--b"></span>
            <span class="vl-system-zero__orbit vl-system-zero__orbit--c"></span>
            <div class="vl-system-zero__seal">
              ${data.image
                ? `<img src="${esc(data.image)}" alt="" loading="eager" decoding="async">`
                : `<span>${sigil}</span>`}
            </div>
          </div>
          <div class="vl-system-zero__identity">
            <small>${esc(eyebrow)}</small>
            <strong>${esc(data.title)}</strong>
            <span>${esc(isRole ? "Cargo principal" : "Rank atual")}</span>
          </div>
        </div>

        <div class="vl-system-zero__facts">
          ${facts.map(([label, value, icon]) => `
            <div class="vl-system-zero__fact">
              <span class="vl-system-zero__fact-icon" aria-hidden="true">${icon}</span>
              <div><small>${esc(label)}</small><strong>${esc(value || "—")}</strong></div>
            </div>`).join("")}
        </div>

        <footer class="vl-system-zero__footer" aria-hidden="true">
          <span></span><b>${isRole ? "AUTHORITY NODE" : "PROGRESSION NODE"}</b><span></span>
        </footer>
      </section>`;
  }

  function render(player, context) {
    const C = core();
    const ctx = context || {};
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
                  ${buildSystemHologram("role", player, extensions)}
                </div>
              </article>

              <article class="vl-public-systems-switcher__page"
                       data-vl-public-subpage data-vl-public-subpage-label="Rank" aria-hidden="true" inert>
                <div class="vl-public-systems-switcher__content">
                  ${buildSystemHologram("rank", player, extensions)}
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
