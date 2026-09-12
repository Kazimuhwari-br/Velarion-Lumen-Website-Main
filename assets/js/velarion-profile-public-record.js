/*
 * Velarion Profile — Public Record
 * Rebuild organizado / composição somente.
 *
 * OWNERSHIP MAP
 * ------------------------------------------------------------------
 * Public Record owns:
 *   1) outer layout;
 *   2) character stage + HUD;
 *   3) placement of Username / Public Data;
 *   4) Cargo / Rank switcher placement;
 *   5) the isolated card_color decorative layer.
 *
 * Public Record DOES NOT own the visual theme of:
 *   - Username  -> velarion-profile-username.css
 *   - Stats     -> velarion-profile-stats.css
 *   - Cargo     -> velarion-profile-cargo.css
 *   - Rank      -> velarion-profile-rank.css
 *
 * IMPORTANT COLOR ISOLATION
 * ------------------------------------------------------------------
 * card_color variables live ONLY on .vl-pr__card-color-layer.
 * The left profile zone receives a fixed #FCFCFF theme via CSS.
 * Cargo/Rank therefore never inherit card_color from this module.
 */
(function (window, document) {
  "use strict";

  if (window.VelarionProfilePublicRecord) return;

  const FIXED_PROFILE_COLOR = "#FCFCFF";

  const SELECTOR = Object.freeze({
    colorLayer: "[data-vl-pr-card-color-layer]",
    switcher: "[data-vl-public-systems-switcher]",
    subPage: "[data-vl-public-subpage]",
    subNav: "[data-vl-public-subnav]",
    publicRoot: ".vl-pr",
    infoStack: ".vl-pr__info-stack",
    scannerHud: ".vl-pr__hud",
    scannerRotorOuter: '[data-vl-pr-scanner-rotor="outer"]',
    scannerRotorInner: '[data-vl-pr-scanner-rotor="inner"]'
  });

  function core() {
    const api = window.VelarionProfileCore;
    if (!api) throw new Error("VelarionProfilePublicRecord requer velarion-profile-core.js.");
    return api;
  }

  function requireComponent(name, api) {
    if (!api || typeof api.render !== "function") {
      throw new Error(`VelarionProfilePublicRecord requer ${name}.js.`);
    }
    return api;
  }

  function resolveFallbackMediaValue(ctx, kind, value, fallbackKey = "default") {
    const C = core();
    const raw = C.getMediaSource(value);

    if (!raw) return C.getMediaSource(C.getFallbackMedia(ctx, kind, "", fallbackKey));

    const fallbackRef = /^fallbacks_id_(.+)$/i.exec(C.cleanValue(raw));
    if (!fallbackRef) return raw;

    return (
      C.getMediaSource(C.getFallbackMedia(ctx, kind, "", fallbackRef[1])) ||
      C.getMediaSource(C.getFallbackMedia(ctx, kind, "", fallbackKey))
    );
  }

  function resolveCharacter(player, ctx) {
    const C = core();
    const characterSlot = C.resolveCharacterSlot(player, ctx.characterSlotId || "id_1");
    const slotData = characterSlot.data || {};

    const mediaValue = Object.prototype.hasOwnProperty.call(slotData, "character_image")
      ? slotData.character_image
      : player?.theme?.card_embed?.character_image;

    const fallbackKey = C.cleanValue(player?.profile?.gender) || C.cleanValue(player?.gender) || "default";
    const fallback = C.getMediaSource(C.getFallbackMedia(ctx, "character", "", fallbackKey));
    const source = resolveFallbackMediaValue(ctx, "character", mediaValue, fallbackKey) || fallback;

    return {
      slot: characterSlot,
      slotData,
      source,
      fallback,
      isWebM: C.isWebMMedia(source),
      fallbackIsWebM: C.isWebMMedia(fallback)
    };
  }

  function resolveCardColor(player, slotData) {
    const C = core();
    const raw = Object.prototype.hasOwnProperty.call(slotData, "card_color")
      ? slotData.card_color
      : player?.theme?.card_embed?.card_color;

    const config = C.normalizeCardColorConfig(raw, "#8b6cff");
    const colors = Array.isArray(config.colors) && config.colors.length
      ? config.colors
      : [config.primary || "#8b6cff"];

    return {
      type: C.normalizeCardColorType(config.type || "none"),
      speed: C.normalizeCardColorSpeed(config.speed, 10),
      primary: config.primary || colors[0] || "#8b6cff",
      colors,
      gradient: C.buildPaletteGradient(colors, "115deg"),
      loopGradient: C.buildPaletteLoopGradient(colors, "115deg")
    };
  }

  function renderCharacterMedia(character, esc) {
    if (!character.source) return "";

    const fallbackAttrs = [
      `data-vl-character-fallback="${esc(character.fallback)}"`,
      `data-vl-character-fallback-webm="${character.fallbackIsWebM ? "1" : "0"}"`
    ].join(" ");

    if (character.isWebM) {
      return `<video src="${esc(character.source)}" autoplay loop muted playsinline preload="auto" tabindex="-1" ${fallbackAttrs} onerror="window.VelarionProfilePublicRecord?.applyCharacterMediaFallback?.(this)"></video>`;
    }

    return `<img src="${esc(character.source)}" alt="" loading="eager" decoding="async" ${fallbackAttrs} onerror="window.VelarionProfilePublicRecord?.applyCharacterMediaFallback?.(this)">`;
  }

  function render(player, context) {
    const C = core();
    const ctx = context || {};
    const esc = (value) => C.escapeHtml(String(value ?? ""));

    const username = requireComponent("velarion-profile-username", window.VelarionProfileUsername);
    const stats = requireComponent("velarion-profile-stats", window.VelarionProfileStats);
    const cargo = requireComponent("velarion-profile-cargo", window.VelarionProfileCargo);
    const rank = requireComponent("velarion-profile-rank", window.VelarionProfileRank);

    const character = resolveCharacter(player, ctx);
    const cardColor = resolveCardColor(player, character.slotData);

    const rootState = character.source ? "has-character" : "no-character";
    const characterClass = character.isWebM ? "is-webm" : "is-image";

    return `
      <div
        class="vl-public-stars-only vl-pr ${rootState}"
        data-character-slot-id="${esc(character.slot.id || "id_1")}"
        data-character-slot-count="${esc(character.slot.ids.length || 1)}"
        data-vl-pr-card-color-type="${esc(cardColor.type)}"
      >
        <!-- CARD_COLOR: isolated decorative channel. Never wraps child components. -->
        <div
          class="vl-pr__card-color-layer"
          data-vl-pr-card-color-layer
          data-card-color-type="${esc(cardColor.type)}"
          data-card-color-speed="${esc(cardColor.speed)}"
          data-card-color-palette="${esc(cardColor.colors.join(","))}"
          style="--vpr-card-current:${esc(cardColor.primary)};--vpr-card-speed:${esc(cardColor.speed)}s;--vpr-card-gradient:${esc(cardColor.gradient)};--vpr-card-loop-gradient:${esc(cardColor.loopGradient)};"
          aria-hidden="true"
        ></div>

        <!-- FIXED PROFILE ZONE: #FCFCFF; card_color is intentionally not inherited here. -->
        <section class="vl-public-stars-only__left-zone vl-pr__left-zone vl-pr__fixed-theme" style="--vpr-fixed-color:${FIXED_PROFILE_COLOR};">
          <div class="vl-public-stars-only__visual vl-pr__character-stage" aria-hidden="true">
            <div class="vl-pr__tech-layer" aria-hidden="true">
              <span class="vl-pr__tech-particle vl-pr__tech-particle--1"></span>
              <span class="vl-pr__tech-particle vl-pr__tech-particle--2"></span>
              <span class="vl-pr__tech-particle vl-pr__tech-particle--3"></span>
              <span class="vl-pr__tech-particle vl-pr__tech-particle--4"></span>
              <span class="vl-pr__tech-particle vl-pr__tech-particle--5"></span>
              <span class="vl-pr__tech-particle vl-pr__tech-particle--6"></span>
              <span class="vl-pr__tech-particle vl-pr__tech-particle--7"></span>
              <span class="vl-pr__tech-particle vl-pr__tech-particle--8"></span>
              <span class="vl-pr__tech-diamond vl-pr__tech-diamond--1"></span>
              <span class="vl-pr__tech-diamond vl-pr__tech-diamond--2"></span>
              <span class="vl-pr__tech-diamond vl-pr__tech-diamond--3"></span>
              <span class="vl-pr__tech-line vl-pr__tech-line--1"></span>
              <span class="vl-pr__tech-line vl-pr__tech-line--2"></span>
              <span class="vl-pr__tech-line vl-pr__tech-line--3"></span>
              <span class="vl-pr__tech-line vl-pr__tech-line--4"></span>
              <span class="vl-pr__tech-bracket vl-pr__tech-bracket--1"></span>
              <span class="vl-pr__tech-bracket vl-pr__tech-bracket--2"></span>
              <span class="vl-pr__tech-reticle vl-pr__tech-reticle--1"><i></i></span>
              <span class="vl-pr__tech-reticle vl-pr__tech-reticle--2"><i></i></span>
              <span class="vl-pr__tech-reticle vl-pr__tech-reticle--3"><i></i></span>
              <span class="vl-pr__tech-reticle vl-pr__tech-reticle--4"><i></i></span>
              <span class="vl-pr__tech-tick vl-pr__tech-tick--1"></span>
              <span class="vl-pr__tech-tick vl-pr__tech-tick--2"></span>
              <span class="vl-pr__tech-tick vl-pr__tech-tick--3"></span>
            </div>

            <div class="vl-public-stars-only__effects vl-pr__hud">
              <!-- Same PNG, cropped to the circular scanner only. These two layers
                   animate the artwork without replacing the PNG with CSS/SVG. -->
              <span class="vl-pr__scanner-rotor vl-pr__scanner-rotor--outer" data-vl-pr-scanner-rotor="outer"></span>
              <span class="vl-pr__scanner-rotor vl-pr__scanner-rotor--inner" data-vl-pr-scanner-rotor="inner"></span>
              <span class="vl-public-stars-only__ring vl-public-stars-only__ring--one"></span>
              <span class="vl-public-stars-only__ring vl-public-stars-only__ring--two"></span>
              <span class="vl-public-stars-only__diamond vl-public-stars-only__diamond--one"></span>
              <span class="vl-public-stars-only__diamond vl-public-stars-only__diamond--two"></span>
              <span class="vl-public-stars-only__diamond vl-public-stars-only__diamond--three"></span>
            </div>


            ${character.source ? `<div class="vl-public-stars-only__character vl-pr__character ${characterClass}">${renderCharacterMedia(character, esc)}</div>` : ""}

          </div>

          <div class="vl-public-info-stack vl-public-info-stack--document vl-pr__info-stack">
            ${username.render(player, ctx)}
            ${stats.render(player, ctx)}
          </div>
        </section>

        <!-- SYSTEMS ZONE: layout only. Cargo/Rank keep their own --sz-* themes. -->
        <section class="vl-public-stars-only__right-zone vl-pr__systems-zone">
          <div class="vl-public-systems-switcher vl-pr__switcher" data-vl-public-systems-switcher data-subpage-index="0" data-sub-direction="none">
            <button class="vl-public-systems-switcher__nav vl-public-systems-switcher__nav--next" type="button" data-vl-public-subnav="1" aria-label="Avançar">
              <span aria-hidden="true">›</span>
            </button>

            <div class="vl-public-systems-switcher__viewport">
              <article class="vl-public-systems-switcher__page is-active" data-vl-public-subpage data-vl-public-subpage-label="Cargo" aria-hidden="false">
                <div class="vl-public-systems-switcher__content">${cargo.render(player, ctx)}</div>
              </article>
              <article class="vl-public-systems-switcher__page" data-vl-public-subpage data-vl-public-subpage-label="Rank" aria-hidden="true" inert>
                <div class="vl-public-systems-switcher__content">${rank.render(player, ctx)}</div>
              </article>
            </div>
          </div>
        </section>
      </div>`;
  }

  /* -----------------------------------------------------------------
   * Systems sub-navigation
   * ----------------------------------------------------------------- */
  let publicSystemsSubNavigationReady = false;

  function setPublicSystemsSubPage(root, requestedIndex, direction = 0) {
    if (!root) return;

    const pages = Array.from(root.querySelectorAll(SELECTOR.subPage));
    if (!pages.length) return;

    const total = pages.length;
    const index = ((Number(requestedIndex) % total) + total) % total;

    pages.forEach((page, pageIndex) => {
      const active = pageIndex === index;
      page.classList.toggle("is-active", active);
      page.setAttribute("aria-hidden", active ? "false" : "true");
      if (active) page.removeAttribute("inert");
      else page.setAttribute("inert", "");
    });

    root.dataset.subpageIndex = String(index);
    root.dataset.subDirection = direction < 0 ? "prev" : direction > 0 ? "next" : "none";

    root.querySelectorAll(SELECTOR.subNav).forEach((button) => {
      const delta = Number(button.dataset.vlPublicSubnav || 0);
      const targetIndex = ((index + delta) % total + total) % total;
      const label = pages[targetIndex]?.dataset.vlPublicSubpageLabel || `Página ${targetIndex + 1}`;
      button.setAttribute("aria-label", delta < 0 ? `Voltar para ${label}` : `Avançar para ${label}`);
      button.title = delta < 0 ? `Voltar: ${label}` : `Próximo: ${label}`;
    });

    const current = pages[index];
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
      const button = event.target.closest?.(SELECTOR.subNav);
      if (!button) return;

      const root = button.closest(SELECTOR.switcher);
      if (!root) return;

      const delta = Number(button.dataset.vlPublicSubnav || 0);
      if (!delta) return;

      event.preventDefault();
      event.stopPropagation();
      setPublicSystemsSubPage(root, Number(root.dataset.subpageIndex || 0) + delta, delta);
    });
  }

  /* -----------------------------------------------------------------
   * Character fallback
   * ----------------------------------------------------------------- */
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

  /* -----------------------------------------------------------------
   * Local color compatibility helpers.
   * Do not depend on optional VelarionProfileCore helpers that may not exist
   * in older/current profile-core builds.
   * ----------------------------------------------------------------- */
  function isValidHexColor(value) {
    return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(value || "").trim());
  }

  function normalizeHex6(value) {
    const raw = String(value || "").trim();
    if (!isValidHexColor(raw)) return null;
    if (raw.length === 4) {
      return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
    }
    return raw.toLowerCase();
  }

  function interpolateHexColorLocal(from, to, progress) {
    const a = normalizeHex6(from);
    const b = normalizeHex6(to);
    if (!a || !b) return a || b || "#8b6cff";

    const t = Math.max(0, Math.min(1, Number(progress) || 0));
    const ar = parseInt(a.slice(1, 3), 16);
    const ag = parseInt(a.slice(3, 5), 16);
    const ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16);
    const bg = parseInt(b.slice(3, 5), 16);
    const bb = parseInt(b.slice(5, 7), 16);

    const channel = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
    return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`;
  }

  /* -----------------------------------------------------------------
   * card_color runtime — ONLY .vl-pr__card-color-layer is mutated.
   * ----------------------------------------------------------------- */
  const cardColorRuntime = {
    nodes: new Set(),
    raf: 0,
    startedAt: performance.now()
  };

  function getRuntimePalette(layer) {
    const C = core();
    return String(layer?.dataset?.cardColorPalette || "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => isValidHexColor(value));
  }

  function applyDynamicCardColor(layer, color) {
    const C = core();
    if (!layer || !isValidHexColor(color)) return;
    layer.style.setProperty("--vpr-card-current", color);
  }

  function updateAnimatedCardColors(now) {
    const C = core();
    let hasAnimatedNode = false;

    cardColorRuntime.nodes.forEach((layer) => {
      if (!layer || !layer.isConnected) {
        cardColorRuntime.nodes.delete(layer);
        return;
      }

      const type = C.normalizeCardColorType(layer.dataset.cardColorType);
      const colors = getRuntimePalette(layer);
      if (colors.length < 2 || !["rotate", "pulse"].includes(type)) return;

      hasAnimatedNode = true;

      const speed = C.normalizeCardColorSpeed(layer.dataset.cardColorSpeed, 10);
      const elapsedSeconds = (now - cardColorRuntime.startedAt) / 1000;
      const cycle = ((elapsedSeconds % speed) / speed) * colors.length;
      const baseIndex = Math.floor(cycle) % colors.length;
      const nextIndex = (baseIndex + 1) % colors.length;
      const localProgress = cycle - Math.floor(cycle);

      if (type === "rotate") {
        const previousIndex = Number(layer.dataset.vlPrCardColorRuntimeIndex ?? -1);
        if (previousIndex !== baseIndex) {
          layer.dataset.vlPrCardColorRuntimeIndex = String(baseIndex);
          applyDynamicCardColor(layer, colors[baseIndex]);
        }
        return;
      }

      const eased = localProgress * localProgress * (3 - 2 * localProgress);
      applyDynamicCardColor(layer, typeof C.interpolateHexColor === "function"
        ? C.interpolateHexColor(colors[baseIndex], colors[nextIndex], eased)
        : interpolateHexColorLocal(colors[baseIndex], colors[nextIndex], eased));
    });

    if (hasAnimatedNode || cardColorRuntime.nodes.size) {
      cardColorRuntime.raf = requestAnimationFrame(updateAnimatedCardColors);
    } else {
      cardColorRuntime.raf = 0;
    }
  }

  function setupCardColorEffects(root) {
    const C = core();
    const scope = root || document;

    scope.querySelectorAll?.(SELECTOR.colorLayer).forEach((layer) => {
      if (layer.dataset.vlPrCardColorBound === "true") return;
      layer.dataset.vlPrCardColorBound = "true";

      const colors = getRuntimePalette(layer);
      const type = C.normalizeCardColorType(layer.dataset.cardColorType);

      if (colors.length) applyDynamicCardColor(layer, colors[0]);
      if (colors.length > 1 && ["rotate", "pulse"].includes(type)) {
        cardColorRuntime.nodes.add(layer);
      }
    });

    if (cardColorRuntime.nodes.size && !cardColorRuntime.raf) {
      cardColorRuntime.startedAt = performance.now();
      cardColorRuntime.raf = requestAnimationFrame(updateAnimatedCardColors);
    }
  }

  function hydrate(root) {
    ensurePublicSystemsSubNavigation();
    const scope = root || document;
    scope.querySelectorAll?.('[data-vl-fallback-pending="1"]').forEach(applyCharacterMediaFallback);

    /* Scanner/Micro-HUD motion is independent from optional card_color runtime. */
    setupLeftFxMotion(scope);

    try {
      setupCardColorEffects(scope);
    } catch (error) {
      console.warn("[VelarionProfilePublicRecord] card_color runtime ignorado por incompatibilidade de Core.", error);
    }
  }

  window.VelarionProfilePublicRecord = {
    render,
    hydrate,
    refresh: hydrate,
    applyCharacterMediaFallback,
    setSubPage: setPublicSystemsSubPage
  };
})(window, document);
