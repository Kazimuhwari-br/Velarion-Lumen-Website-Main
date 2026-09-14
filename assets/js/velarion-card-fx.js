/* ======================================================================
   Velarion Card FX — REBUILD

   Objetivo:
   - manter o FX totalmente externo ao HTML interno de .vl-card;
   - usar a própria .vl-card como fonte autoritativa para card_color;
   - acompanhar none / gradient / rotate / pulse;
   - acompanhar cc_speed em rotate/pulse e a paleta publicada pelo card;
   - sobreviver à recriação/troca do card dentro do mesmo port;
   - compartilhar exatamente o mesmo host de escala (.vl-card-scale);
   - pausar animações fora da viewport e respeitar reduced-motion.
   ====================================================================== */
(function(window, document) {
  "use strict";

  const VERSION = "8.4.0-card-color-type-sync";
  const PORT_SELECTOR = '.vl-profile-card-port[data-official-card-port="true"]';
  const CARD_SELECTOR = ".vl-card";
  const SCALE_SELECTOR = ".vl-card-scale";
  const COLOR_TYPES = new Set(["none", "gradient", "rotate", "pulse", "rainbow"]);

  const instances = new Map();
  let globalRaf = 0;
  let globalObserver = null;

  const reducedMotionQuery = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false, addEventListener: null };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeType(value) {
    const raw = String(value || "").trim().toLowerCase();
    const aliases = {
      solid: "none",
      static: "none",
      grad: "gradient",
      cycle: "rotate",
      cycling: "rotate",
      smooth: "pulse",
      spectrum: "rainbow",
      rgb: "rainbow",
      colours: "rainbow",
      colors: "rainbow"
    };
    const normalized = aliases[raw] || raw || "none";
    return COLOR_TYPES.has(normalized) ? normalized : "none";
  }

  function normalizeSpeed(value, fallback = 10) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(300, Math.max(0.25, parsed));
  }

  function isCssColor(value) {
    const text = String(value || "").trim();
    if (!text) return false;
    if (window.CSS && typeof window.CSS.supports === "function") {
      try {
        return window.CSS.supports("color", text);
      } catch (_) {}
    }
    return /^#[0-9a-f]{3,8}$/i.test(text) || /^(?:rgb|hsl)a?\(/i.test(text) || /^color-mix\(/i.test(text);
  }

  function parseSerializedPalette(rawValue) {
    /*
      IMPORTANTE — sem limite de cc_idN.

      O velarion-card.js já normaliza card_color aceitando qualquer chave
      /^cc_id\d+$/ e publica TODA a paleta, ordenada numericamente, em
      data-card-color-palette. Aqui o FX apenas consome essa serialização.

      Não existe slice(), maxColors, limite numérico de N ou quantidade máxima
      de entradas. Se o card publicar 14, 106, 500 ou 9000 cores válidas, todas
      entram na paleta do FX.
    */
    const raw = String(rawValue || "").trim();
    if (!raw) return [];

    const values = raw.split(",");
    const palette = [];

    for (let index = 0; index < values.length; index += 1) {
      const color = values[index].trim();
      if (isCssColor(color)) palette.push(color);
    }

    return palette;
  }

  function readPalette(card) {
    return parseSerializedPalette(card?.dataset?.cardColorPalette);
  }

  function buildGradient(colors, angle, loop) {
    const palette = Array.isArray(colors) && colors.length ? colors.slice() : ["#ff84cf"];
    if (loop && palette.length > 1) palette.push(palette[0]);
    if (palette.length === 1) palette.push(palette[0]);

    const maxIndex = palette.length - 1;
    const stops = palette.map((color, index) => {
      const pct = maxIndex ? (index / maxIndex) * 100 : 0;
      return `${color} ${Number(pct.toFixed(4))}%`;
    });

    return `linear-gradient(${angle}, ${stops.join(", ")})`;
  }

  function readCardConfiguration(card) {
    const type = normalizeType(card?.dataset?.cardColorType);
    const speed = type === "gradient" ? null : normalizeSpeed(card?.dataset?.cardColorSpeed, 10);
    const palette = readPalette(card);
    const style = card ? getComputedStyle(card) : null;

    const livePrimary = String(style?.getPropertyValue("--card-color") || "").trim();
    const liveSecondary = String(style?.getPropertyValue("--card-color2") || "").trim();
    const liveGlow = String(style?.getPropertyValue("--card-glow") || "").trim();

    const primary = isCssColor(livePrimary)
      ? livePrimary
      : (palette[0] || "#ff84cf");

    const secondary = isCssColor(liveSecondary)
      ? liveSecondary
      : (palette[1] || `color-mix(in srgb, ${primary} 34%, #ffffff 66%)`);

    const glow = isCssColor(liveGlow) ? liveGlow : primary;

    const sourceGradient = String(style?.getPropertyValue("--card-palette-gradient") || "").trim();
    const sourceLoopGradient = String(style?.getPropertyValue("--card-palette-loop-gradient") || "").trim();

    const rainbowGradient = "linear-gradient(90deg, #ff304f 0%, #ff8a2a 16.66%, #ffe45b 33.33%, #45e88a 50%, #38a8ff 66.66%, #7d5cff 83.33%, #ff3fc8 100%)";
    const rainbowLoopGradient = "linear-gradient(90deg, #ff304f 0%, #ff8a2a 16.66%, #ffe45b 33.33%, #45e88a 50%, #38a8ff 66.66%, #7d5cff 83.33%, #ff3fc8 100%, #ff304f 116.66%)";
    const gradient = type === "rainbow"
      ? rainbowGradient
      : (sourceGradient || buildGradient(palette.length ? palette : [primary], "135deg", false));
    const loopGradient = type === "rainbow"
      ? rainbowLoopGradient
      : (sourceLoopGradient || buildGradient(palette.length ? palette : [primary], "90deg", true));

    return {
      type,
      speed,
      palette: palette.length ? palette : [primary],
      primary,
      secondary,
      glow,
      gradient,
      loopGradient
    };
  }

  function cardConfigSignature(card) {
    if (!card) return "";
    return [
      normalizeType(card.dataset.cardColorType),
      normalizeType(card.dataset.cardColorType) === "gradient" ? "" : normalizeSpeed(card.dataset.cardColorSpeed, 10),
      String(card.dataset.cardColorPalette || "")
    ].join("|");
  }

  function setStyleProperty(element, name, value, cache, cacheKey) {
    if (!element) return;
    const next = String(value ?? "").trim();
    if (cache && cache[cacheKey] === next) return;
    if (next) element.style.setProperty(name, next);
    else element.style.removeProperty(name);
    if (cache) cache[cacheKey] = next;
  }

  function createParticle(index, front) {
    const particle = document.createElement("i");
    particle.className = "vl-card-fx__particle";

    const side = index % 4;
    let x;
    let y;

    if (side === 0) {
      x = 8 + Math.random() * 84;
      y = 4 + Math.random() * 14;
    } else if (side === 1) {
      x = 80 + Math.random() * 17;
      y = 12 + Math.random() * 76;
    } else if (side === 2) {
      x = 8 + Math.random() * 84;
      y = 82 + Math.random() * 14;
    } else {
      x = 3 + Math.random() * 17;
      y = 12 + Math.random() * 76;
    }

    const size = front ? 2.2 + Math.random() * 3.2 : 2 + Math.random() * 4.8;
    const duration = 3.4 + Math.random() * 4.8;
    const delay = -(Math.random() * duration);
    const driftX = -16 + Math.random() * 32;
    const driftY = -(10 + Math.random() * 25);
    const opacity = .45 + Math.random() * .55;
    const shapes = ["dot", "dot", "diamond", "star"];

    particle.dataset.shape = shapes[Math.floor(Math.random() * shapes.length)];
    particle.dataset.paletteIndex = String(index);
    particle.style.setProperty("--particle-x", `${x}%`);
    particle.style.setProperty("--particle-y", `${y}%`);
    particle.style.setProperty("--particle-size", `${size.toFixed(2)}px`);
    particle.style.setProperty("--particle-duration", `${duration.toFixed(2)}s`);
    particle.style.setProperty("--particle-twinkle", `${(1.5 + Math.random() * 2.1).toFixed(2)}s`);
    particle.style.setProperty("--particle-delay", `${delay.toFixed(2)}s`);
    particle.style.setProperty("--particle-delay-2", `${(delay * .43).toFixed(2)}s`);
    particle.style.setProperty("--particle-star-size", `${(size * 2.2).toFixed(2)}px`);
    particle.style.setProperty("--particle-drift-x", `${driftX.toFixed(1)}px`);
    particle.style.setProperty("--particle-drift-y", `${driftY.toFixed(1)}px`);
    particle.style.setProperty("--particle-opacity", opacity.toFixed(2));

    return particle;
  }

  function createBackLayer() {
    const root = document.createElement("div");
    root.className = "vl-card-fx";
    root.setAttribute("aria-hidden", "true");

    const paletteField = document.createElement("div");
    paletteField.className = "vl-card-fx__palette-field";

    const aura = document.createElement("div");
    aura.className = "vl-card-fx__aura";

    const orbitA = document.createElement("div");
    orbitA.className = "vl-card-fx__orbit vl-card-fx__orbit--a";

    const orbitB = document.createElement("div");
    orbitB.className = "vl-card-fx__orbit vl-card-fx__orbit--b";

    const edge = document.createElement("div");
    edge.className = "vl-card-fx__edge";

    const floor = document.createElement("div");
    floor.className = "vl-card-fx__floor";

    const particles = document.createElement("div");
    particles.className = "vl-card-fx__particles";

    const particleCount = window.innerWidth <= 520 ? 6 : 12;
    for (let i = 0; i < particleCount; i += 1) {
      particles.appendChild(createParticle(i, false));
    }

    root.append(paletteField, aura, orbitA, orbitB, edge, floor, particles);
    return root;
  }

  function createFrontLayer() {
    const root = document.createElement("div");
    root.className = "vl-card-fx-front";
    root.setAttribute("aria-hidden", "true");

    const sweep = document.createElement("div");
    sweep.className = "vl-card-fx-front__sweep";

    const beam = document.createElement("div");
    beam.className = "vl-card-fx-front__beam";

    ["tl", "tr", "bl", "br"].forEach((corner) => {
      const crystal = document.createElement("i");
      crystal.className = `vl-card-fx-front__crystal vl-card-fx-front__crystal--${corner}`;
      root.appendChild(crystal);
    });

    const particles = document.createElement("div");
    particles.className = "vl-card-fx-front__particles";
    const particleCount = window.innerWidth <= 520 ? 3 : 5;
    for (let i = 0; i < particleCount; i += 1) {
      particles.appendChild(createParticle(i + 20, true));
    }

    root.append(sweep, beam, particles);
    return root;
  }

  function collectParticles(state) {
    state.particles = Array.from(state.back.querySelectorAll(".vl-card-fx__particle"))
      .concat(Array.from(state.front.querySelectorAll(".vl-card-fx__particle")));
  }

  function applyParticlePalette(state, config) {
    const multicolor = config.type === "gradient" || config.type === "rainbow";
    const palette = config.type === "rainbow"
      ? ["#ff304f", "#ff8a2a", "#ffe45b", "#45e88a", "#38a8ff", "#7d5cff", "#ff3fc8"]
      : (config.palette.length ? config.palette : [config.primary]);

    state.particles.forEach((particle, index) => {
      if (!multicolor || palette.length < 2) {
        particle.style.removeProperty("--particle-color");
        return;
      }

      // Distribui as partículas por toda a paleta, inclusive em paletas grandes.
      const paletteIndex = state.particles.length > 1
        ? Math.round((index / (state.particles.length - 1)) * (palette.length - 1))
        : 0;
      particle.style.setProperty("--particle-color", palette[paletteIndex]);
    });
  }

  function applyStaticConfiguration(state, force) {
    if (!state.card) return;

    const signature = cardConfigSignature(state.card);
    if (!force && signature === state.lastSignature) return;

    const config = readCardConfiguration(state.card);
    state.config = config;
    state.lastSignature = signature;

    state.port.dataset.vfxColorType = config.type;
    state.port.dataset.vfxColorCount = String(config.palette.length);
    state.port.dataset.vfxVersion = VERSION;

    setStyleProperty(state.port, "--vfx-color-speed", config.speed == null ? "" : `${config.speed}s`, state.cssCache, "speed");
    setStyleProperty(state.port, "--vfx-palette-gradient", config.gradient, state.cssCache, "gradient");
    setStyleProperty(state.port, "--vfx-palette-loop-gradient", config.loopGradient, state.cssCache, "loopGradient");

    applyParticlePalette(state, config);
    syncLiveColors(state, true);
  }

  function syncLiveColors(state, force) {
    if (!state.card || !state.card.isConnected) return;

    const style = getComputedStyle(state.card);
    const palette = state.config?.palette || readPalette(state.card);

    let primary = String(style.getPropertyValue("--card-color") || "").trim();
    if (!isCssColor(primary)) primary = palette[0] || "#ff84cf";

    let secondary = String(style.getPropertyValue("--card-color2") || "").trim();
    if (!isCssColor(secondary)) {
      secondary = palette[1] || `color-mix(in srgb, ${primary} 34%, #ffffff 66%)`;
    }

    let glow = String(style.getPropertyValue("--card-glow") || "").trim();
    if (!isCssColor(glow)) glow = primary;

    if (force || state.lastPrimary !== primary) {
      state.port.style.setProperty("--vfx-primary", primary);
      state.lastPrimary = primary;
    }

    if (force || state.lastSecondary !== secondary) {
      state.port.style.setProperty("--vfx-secondary", secondary);
      state.lastSecondary = secondary;
    }

    if (force || state.lastGlow !== glow) {
      state.port.style.setProperty("--vfx-glow", glow);
      state.lastGlow = glow;
    }
  }

  function syncSize(state, force) {
    if (!state.card?.isConnected || !state.scaleHost?.isConnected) return;

    // offsetWidth/offsetHeight retornam a geometria lógica antes dos transforms
    // responsivos do host, evitando aplicar o scale duas vezes no FX.
    const width = state.card.offsetWidth || 360;
    const height = state.card.offsetHeight || 520;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    if (force || state.lastWidth !== width) {
      state.scaleHost.style.setProperty("--vfx-card-width", `${width}px`);
      state.scaleHost.style.setProperty("--vfx-half-card-width", `${halfWidth}px`);
      state.scaleHost.style.setProperty("--vfx-card-center-x", `${halfWidth}px`);
      state.lastWidth = width;
    }

    if (force || state.lastHeight !== height) {
      state.scaleHost.style.setProperty("--vfx-card-height", `${height}px`);
      state.scaleHost.style.setProperty("--vfx-half-card-height", `${halfHeight}px`);
      state.scaleHost.style.setProperty("--vfx-card-center-y", `${halfHeight}px`);
      state.lastHeight = height;
    }
  }

  function setPaused(state, paused) {
    const next = Boolean(paused);
    if (state.paused === next) return;
    state.paused = next;
    state.port.classList.toggle("is-vfx-paused", next);
  }

  function scheduleSurge(state) {
    clearTimeout(state.surgeTimer);
    state.surgeTimer = 0;

    if (reducedMotionQuery.matches || !state.port.isConnected) return;

    const delay = 5200 + Math.random() * 4200;
    state.surgeTimer = window.setTimeout(() => {
      if (!state.port.isConnected) {
        destroy(state.port);
        return;
      }

      if (state.visible && !document.hidden && !reducedMotionQuery.matches) {
        state.port.classList.add("is-vfx-surging");
        clearTimeout(state.surgeEndTimer);
        state.surgeEndTimer = window.setTimeout(() => {
          state.port.classList.remove("is-vfx-surging");
        }, 980);
      }

      scheduleSurge(state);
    }, delay);
  }

  function bindPointer(state) {
    state.onPointerMove = (event) => {
      if (event.pointerType === "touch" || reducedMotionQuery.matches) return;
      const rect = state.port.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const nx = clamp((event.clientX - rect.left) / rect.width, 0, 1) - .5;
      const ny = clamp((event.clientY - rect.top) / rect.height, 0, 1) - .5;

      state.port.style.setProperty("--vfx-parallax-x", `${(nx * 7).toFixed(2)}px`);
      state.port.style.setProperty("--vfx-parallax-y", `${(ny * 5).toFixed(2)}px`);
    };

    state.onPointerLeave = () => {
      state.port.style.setProperty("--vfx-parallax-x", "0px");
      state.port.style.setProperty("--vfx-parallax-y", "0px");
    };

    state.port.addEventListener("pointermove", state.onPointerMove, { passive: true });
    state.port.addEventListener("pointerleave", state.onPointerLeave, { passive: true });
  }

  function bindVisibilityObserver(state) {
    if (!("IntersectionObserver" in window)) return;

    state.intersectionObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      state.visible = Boolean(entry?.isIntersecting);
      setPaused(state, !state.visible || document.hidden);
    }, {
      rootMargin: "100px 0px",
      threshold: .01
    });

    state.intersectionObserver.observe(state.port);
  }

  function bindCard(state, card) {
    if (!card || !(card instanceof Element)) return false;

    const scaleHost = card.closest(SCALE_SELECTOR) || card.parentElement || state.port;

    if (state.resizeObserver) {
      state.resizeObserver.disconnect();
      state.resizeObserver = null;
    }

    state.card = card;
    state.scaleHost = scaleHost;
    state.lastSignature = "";
    state.lastPrimary = "";
    state.lastSecondary = "";
    state.lastGlow = "";
    state.lastWidth = 0;
    state.lastHeight = 0;

    // Se o preview recriou a estrutura, move as mesmas camadas para o novo host.
    scaleHost.insertBefore(state.back, card);
    scaleHost.insertBefore(state.front, card.nextSibling);

    if ("ResizeObserver" in window) {
      state.resizeObserver = new ResizeObserver(() => syncSize(state, false));
      state.resizeObserver.observe(card);
    }

    state.port.dataset.vfxReady = "true";
    applyStaticConfiguration(state, true);
    syncSize(state, true);
    return true;
  }

  function createState(port) {
    const state = {
      port,
      card: null,
      scaleHost: null,
      back: createBackLayer(),
      front: createFrontLayer(),
      particles: [],
      config: null,
      cssCache: Object.create(null),
      visible: true,
      paused: false,
      lastSignature: "",
      lastPrimary: "",
      lastSecondary: "",
      lastGlow: "",
      lastWidth: 0,
      lastHeight: 0,
      resizeObserver: null,
      intersectionObserver: null,
      surgeTimer: 0,
      surgeEndTimer: 0,
      onPointerMove: null,
      onPointerLeave: null
    };

    collectParticles(state);
    bindPointer(state);
    bindVisibilityObserver(state);
    scheduleSurge(state);
    return state;
  }

  function mount(port) {
    if (!port || !(port instanceof Element) || !port.matches(PORT_SELECTOR)) return null;

    let state = instances.get(port);
    if (!state) {
      state = createState(port);
      instances.set(port, state);
    }

    const card = port.querySelector(CARD_SELECTOR);
    if (!card) return state;

    if (state.card !== card || state.scaleHost !== (card.closest(SCALE_SELECTOR) || card.parentElement || port)) {
      bindCard(state, card);
    } else {
      applyStaticConfiguration(state, false);
      syncSize(state, false);
      syncLiveColors(state, false);
    }

    ensureGlobalRaf();
    return state;
  }

  function cleanupHostVariables(host) {
    if (!host) return;
    [
      "--vfx-card-width",
      "--vfx-card-height",
      "--vfx-half-card-width",
      "--vfx-half-card-height",
      "--vfx-card-center-x",
      "--vfx-card-center-y"
    ].forEach((name) => host.style.removeProperty(name));
  }

  function destroy(port) {
    const state = instances.get(port);
    if (!state) return;

    clearTimeout(state.surgeTimer);
    clearTimeout(state.surgeEndTimer);
    state.resizeObserver?.disconnect();
    state.intersectionObserver?.disconnect();

    if (state.onPointerMove) state.port.removeEventListener("pointermove", state.onPointerMove);
    if (state.onPointerLeave) state.port.removeEventListener("pointerleave", state.onPointerLeave);

    state.back?.remove();
    state.front?.remove();
    cleanupHostVariables(state.scaleHost);

    state.port.classList.remove("is-vfx-paused", "is-vfx-surging");
    delete state.port.dataset.vfxReady;
    delete state.port.dataset.vfxColorType;
    delete state.port.dataset.vfxColorCount;
    delete state.port.dataset.vfxVersion;

    [
      "--vfx-primary",
      "--vfx-secondary",
      "--vfx-glow",
      "--vfx-color-speed",
      "--vfx-palette-gradient",
      "--vfx-palette-loop-gradient",
      "--vfx-parallax-x",
      "--vfx-parallax-y"
    ].forEach((name) => state.port.style.removeProperty(name));

    instances.delete(port);
  }

  function refresh(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const ports = [];

    if (scope.matches?.(PORT_SELECTOR)) ports.push(scope);
    scope.querySelectorAll?.(PORT_SELECTOR).forEach((port) => ports.push(port));

    ports.forEach((port) => mount(port));
    ensureGlobalRaf();
    return ports.length;
  }

  function tick() {
    globalRaf = 0;

    instances.forEach((state, port) => {
      if (!port.isConnected) {
        destroy(port);
        return;
      }

      const currentCard = port.querySelector(CARD_SELECTOR);
      if (!currentCard) return;

      if (state.card !== currentCard || !state.card?.isConnected) {
        bindCard(state, currentCard);
      }

      applyStaticConfiguration(state, false);

      if (state.visible && !document.hidden) {
        const type = state.config?.type || normalizeType(currentCard.dataset.cardColorType);

        // ROTATE/PULSE são calculados pelo velarion-card.js. O FX lê as variáveis
        // já resolvidas do card, portanto não mantém uma segunda timeline própria.
        if (type === "rotate" || type === "pulse") {
          syncLiveColors(state, false);
        }
      }
    });

    if (instances.size) globalRaf = window.requestAnimationFrame(tick);
  }

  function ensureGlobalRaf() {
    if (!globalRaf && instances.size) {
      globalRaf = window.requestAnimationFrame(tick);
    }
  }

  function debug(target) {
    const root = target && target.querySelectorAll ? target : document;
    const ports = [];
    if (root.matches?.(PORT_SELECTOR)) ports.push(root);
    root.querySelectorAll?.(PORT_SELECTOR).forEach((port) => ports.push(port));

    const rows = ports.map((port, index) => {
      const state = instances.get(port);
      const card = port.querySelector(CARD_SELECTOR);
      const config = card ? readCardConfiguration(card) : null;
      return {
        index,
        mounted: Boolean(state),
        playerId: card?.dataset?.playerId || "",
        slotId: card?.dataset?.characterSlotId || "",
        type: config?.type || "",
        speed: config?.speed || "",
        colors: config?.palette?.length || 0,
        firstColor: config?.palette?.[0] || "",
        lastColor: config?.palette?.length ? config.palette[config.palette.length - 1] : "",
        primary: config?.primary || "",
        fxReady: port.dataset.vfxReady || "false",
        unlimitedCcIdN: true,
        version: port.dataset.vfxVersion || VERSION
      };
    });

    try { console.table(rows); } catch (_) {}

    return {
      version: VERSION,
      unlimitedCcIdN: true,
      instanceCount: instances.size,
      ports: rows
    };
  }

  function onVisibilityChange() {
    instances.forEach((state) => {
      setPaused(state, document.hidden || !state.visible);
    });
  }

  function onReducedMotionChange() {
    instances.forEach((state) => {
      if (reducedMotionQuery.matches) {
        clearTimeout(state.surgeTimer);
        clearTimeout(state.surgeEndTimer);
        state.port.classList.remove("is-vfx-surging");
        state.port.style.setProperty("--vfx-parallax-x", "0px");
        state.port.style.setProperty("--vfx-parallax-y", "0px");
      } else {
        scheduleSurge(state);
      }
    });
    refresh(document);
  }

  function boot() {
    refresh(document);

    if ("MutationObserver" in window && document.documentElement) {
      globalObserver = new MutationObserver((mutations) => {
        let needsRefresh = false;

        for (const mutation of mutations) {
          if (mutation.type === "childList" && (mutation.addedNodes.length || mutation.removedNodes.length)) {
            needsRefresh = true;
            break;
          }

          if (mutation.type === "attributes") {
            const target = mutation.target;
            if (target instanceof Element && target.matches(CARD_SELECTOR)) {
              const port = target.closest(PORT_SELECTOR);
              if (port) mount(port);
            }
          }
        }

        if (needsRefresh) refresh(document);
      });

      globalObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-card-color-type", "data-card-color-speed", "data-card-color-palette"]
      });
    }
  }

  document.addEventListener("visibilitychange", onVisibilityChange, { passive: true });

  document.addEventListener("velarion:character-slot-applied", (event) => {
    const target = event?.target instanceof Element ? event.target : null;
    const port = target?.closest?.(PORT_SELECTOR) || target?.querySelector?.(PORT_SELECTOR);
    if (port) mount(port);
    else refresh(document);
  });

  if (reducedMotionQuery.addEventListener) {
    reducedMotionQuery.addEventListener("change", onReducedMotionChange);
  }

  window.VelarionCardFX = {
    version: VERSION,
    mount,
    refresh,
    destroy,
    debug,
    resync: refresh
  };

  window.dispatchEvent(new CustomEvent("velarion-card-fx-ready", {
    detail: { version: VERSION }
  }));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})(window, document);
