/* ======================================================================
   Velarion Card FX — efeitos externos para o card oficial no perfil

   Regras:
   - NÃO altera o HTML interno de .vl-card;
   - monta somente em .vl-profile-card-port;
   - pausa quando sai da viewport;
   - respeita prefers-reduced-motion;
   - acompanha em tempo real a cor visual do card;
   - v4: mantém a geometria v3; a flutuação exclusiva do profile é controlada pelo CSS.
   ====================================================================== */
(function() {
  "use strict";

  const PORT_SELECTOR = '.vl-profile-card-port[data-official-card-port="true"]';
  const instances = new WeakMap();
  const reducedMotionQuery = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener: null };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function validCssColor(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (/^#[0-9a-f]{3,8}$/i.test(text)) return text;
    if (/^(?:rgb|hsl)a?\(/i.test(text)) return text;
    return "";
  }

  function paletteFromCard(card) {
    const raw = String(card?.dataset?.cardColorPalette || "").trim();
    if (!raw) return [];
    return raw
      .split(",")
      .map((value) => validCssColor(value))
      .filter(Boolean);
  }

  function parseHex(hex) {
    hex = String(hex || "").replace("#", "").trim();
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    if (hex.length < 6) return null;
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }

  function colorMixFixed(color, pct) {
    var c = parseHex(color);
    if (!c) return "transparent";
    var a = (pct / 100).toFixed(2);
    return "rgba(" + c.r + "," + c.g + "," + c.b + "," + a + ")";
  }

  function readLiveColors(card) {
    if (!card) return ["#ff6b8b", "#8b6cff"];

    var palette = paletteFromCard(card);
    if (palette.length >= 2) return [palette[0], palette[1]];

    var style = getComputedStyle(card);
    var color =
      validCssColor(style.getPropertyValue("--card-color")) ||
      validCssColor(style.getPropertyValue("--vl-card-color")) ||
      (palette[0]) ||
      "#ff6b8b";

    var color2 =
      validCssColor(style.getPropertyValue("--card-color2")) ||
      validCssColor(style.getPropertyValue("--card-color-2")) ||
      validCssColor(style.getPropertyValue("--vl-card-color-2")) ||
      (palette[1]) ||
      (palette[0]) ||
      "#8b6cff";

    return [color, color2];
  }

  function syncColors(state) {
    var colors = readLiveColors(state.card);
    var color = colors[0];
    var color2 = colors[1];

    if (state.lastColor !== color) {
      state.port.style.setProperty("--vfx-color", color);
      var pcts = [7,10,14,18,19,23,24,27,30,34,40,42,46,70,72];
      for (var i = 0; i < pcts.length; i++) {
        state.port.style.setProperty("--vfx-color-" + pcts[i], colorMixFixed(color, pcts[i]));
      }
      state.lastColor = color;
    }
    if (state.lastColor2 !== color2) {
      state.port.style.setProperty("--vfx-color-2", color2);
      var pcts2 = [11,14,20,29,70,72];
      for (var j = 0; j < pcts2.length; j++) {
        state.port.style.setProperty("--vfx-color-2-" + pcts2[j], colorMixFixed(color2, pcts2[j]));
      }
      state.lastColor2 = color2;
    }
  }

  function syncSize(state) {
    if (!state.card?.isConnected || !state.port?.isConnected) return;

    /*
      O FX vive dentro do MESMO .vl-card-scale do card. Portanto ele deve usar
      a geometria lógica do card (360x520, ou o tamanho real do elemento), e
      NÃO getBoundingClientRect(), que já contém o zoom/scale dos ancestrais.

      Assim card e FX recebem exatamente a mesma cadeia de transformações:
      .vl-card-scale -> stage/profile zoom -> viewport/F11.
      Isso evita aplicar o zoom duas vezes no FX.
    */
    const width = state.card.offsetWidth || 360;
    const height = state.card.offsetHeight || 520;
    const centerX = width / 2;
    const centerY = height / 2;

    if (state.lastWidth !== width) {
      state.scaleHost.style.setProperty("--vfx-card-width", `${width}px`);
      state.scaleHost.style.setProperty("--vfx-half-card-width", `${centerX}px`);
      state.lastWidth = width;
    }
    if (state.lastHeight !== height) {
      state.scaleHost.style.setProperty("--vfx-card-height", `${height}px`);
      state.scaleHost.style.setProperty("--vfx-half-card-height", `${centerY}px`);
      state.lastHeight = height;
    }
    if (state.lastCenterX !== centerX) {
      state.scaleHost.style.setProperty("--vfx-card-center-x", `${centerX}px`);
      state.lastCenterX = centerX;
    }
    if (state.lastCenterY !== centerY) {
      state.scaleHost.style.setProperty("--vfx-card-center-y", `${centerY}px`);
      state.lastCenterY = centerY;
    }
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
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    particle.dataset.shape = shape;
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
    particle.style.setProperty("--particle-color", index % 3 === 0 ? "var(--vfx-color-2)" : "var(--vfx-color)");

    return particle;
  }

  function createBackLayer() {
    const root = document.createElement("div");
    root.className = "vl-card-fx";
    root.setAttribute("aria-hidden", "true");

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

    const particleCount = window.innerWidth <= 520 ? 5 : 10;
    for (let i = 0; i < particleCount; i += 1) {
      particles.appendChild(createParticle(i, false));
    }

    root.append(aura, orbitA, orbitB, edge, floor, particles);
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
    const particleCount = window.innerWidth <= 520 ? 2 : 4;
    for (let i = 0; i < particleCount; i += 1) {
      particles.appendChild(createParticle(i + 20, true));
    }

    root.append(sweep, beam, particles);
    return root;
  }

  function setPaused(state, paused) {
    state.paused = Boolean(paused);
    state.port.classList.toggle("is-vfx-paused", state.paused);
  }

  function scheduleSurge(state) {
    clearTimeout(state.surgeTimer);
    if (reducedMotionQuery.matches) return;

    const delay = 5200 + Math.random() * 4200;
    state.surgeTimer = window.setTimeout(() => {
      if (!state.port.isConnected) return destroy(state.port);

      if (state.visible && !document.hidden) {
        state.port.classList.add("is-vfx-surging");
        clearTimeout(state.surgeEndTimer);
        state.surgeEndTimer = window.setTimeout(() => {
          state.port.classList.remove("is-vfx-surging");
        }, 980);
      }

      scheduleSurge(state);
    }, delay);
  }

  function scheduleColorSync(state) {
    clearTimeout(state.colorTimer);

    const tick = () => {
      if (!state.port.isConnected) return destroy(state.port);
      if (state.visible && !document.hidden) syncColors(state);
      state.colorTimer = window.setTimeout(tick, 250);
    };

    state.colorTimer = window.setTimeout(tick, 250);
  }

  function setupPointer(state) {
    if (reducedMotionQuery.matches) return;

    state.onPointerMove = (event) => {
      if (event.pointerType === "touch") return;
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

  function setupObservers(state) {
    if ("ResizeObserver" in window) {
      state.resizeObserver = new ResizeObserver(() => syncSize(state));
      state.resizeObserver.observe(state.card);
    }

    if ("IntersectionObserver" in window) {
      state.intersectionObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        state.visible = Boolean(entry?.isIntersecting);
        setPaused(state, !state.visible || document.hidden);
      }, { rootMargin: "100px 0px", threshold: .01 });
      state.intersectionObserver.observe(state.port);
    }
  }

  function mount(port) {
    if (!port || !(port instanceof Element)) return null;

    const existing = instances.get(port);
    if (existing) {
      syncSize(existing);
      syncColors(existing);
      return existing;
    }

    const card = port.querySelector(".vl-card");
    if (!card) return null;

    // Mesmo host transformado usado pelo card: mantém FX e card 1:1 em
    // janela, F11 e qualquer zoom responsivo, sem acoplar os arquivos.
    const scaleHost = card.closest(".vl-card-scale") || card.parentElement || port;
    const back = createBackLayer();
    const front = createFrontLayer();

    scaleHost.insertBefore(back, card);
    scaleHost.insertBefore(front, card.nextSibling);
    port.dataset.vfxReady = "true";

    const state = {
      port,
      scaleHost,
      card,
      back,
      front,
      visible: true,
      paused: false,
      lastColor: "",
      lastColor2: "",
      lastWidth: 0,
      lastHeight: 0,
      lastCenterX: null,
      lastCenterY: null,
      resizeObserver: null,
      intersectionObserver: null,
      surgeTimer: 0,
      surgeEndTimer: 0,
      colorTimer: 0,
      onPointerMove: null,
      onPointerLeave: null
    };

    instances.set(port, state);
    syncSize(state);
    syncColors(state);
    setupPointer(state);
    setupObservers(state);
    scheduleColorSync(state);
    scheduleSurge(state);
    setPaused(state, document.hidden);

    return state;
  }

  function destroy(port) {
    const state = instances.get(port);
    if (!state) return;

    clearTimeout(state.surgeTimer);
    clearTimeout(state.surgeEndTimer);
    clearTimeout(state.colorTimer);
    state.resizeObserver?.disconnect();
    state.intersectionObserver?.disconnect();

    if (state.onPointerMove) state.port.removeEventListener("pointermove", state.onPointerMove);
    if (state.onPointerLeave) state.port.removeEventListener("pointerleave", state.onPointerLeave);

    state.back?.remove();
    state.front?.remove();
    state.port.classList.remove("is-vfx-paused", "is-vfx-surging");
    delete state.port.dataset.vfxReady;
    state.scaleHost?.style.removeProperty("--vfx-card-width");
    state.scaleHost?.style.removeProperty("--vfx-card-height");
    state.scaleHost?.style.removeProperty("--vfx-half-card-width");
    state.scaleHost?.style.removeProperty("--vfx-half-card-height");
    state.scaleHost?.style.removeProperty("--vfx-card-center-x");
    state.scaleHost?.style.removeProperty("--vfx-card-center-y");
    state.port.style.removeProperty("--vfx-color");
    state.port.style.removeProperty("--vfx-color-2");
    var cleanupPcts = [7,10,14,18,19,23,24,27,30,34,40,42,46,70,72];
    for (var i = 0; i < cleanupPcts.length; i++) {
      state.port.style.removeProperty("--vfx-color-" + cleanupPcts[i]);
    }
    var cleanupPcts2 = [11,14,20,29,70,72];
    for (var j = 0; j < cleanupPcts2.length; j++) {
      state.port.style.removeProperty("--vfx-color-2-" + cleanupPcts2[j]);
    }
    state.port.style.removeProperty("--vfx-parallax-x");
    state.port.style.removeProperty("--vfx-parallax-y");

    instances.delete(port);
  }

  function refresh(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const ports = [];

    if (scope.matches?.(PORT_SELECTOR)) ports.push(scope);
    scope.querySelectorAll?.(PORT_SELECTOR).forEach((port) => ports.push(port));

    ports.forEach((port) => {
      const state = mount(port);
      if (state) {
        syncSize(state);
        syncColors(state);
      }
    });

    return ports.length;
  }

  function onVisibilityChange() {
    document.querySelectorAll(PORT_SELECTOR).forEach((port) => {
      const state = instances.get(port);
      if (!state) return;
      setPaused(state, document.hidden || !state.visible);
    });
  }

  function boot() {
    refresh(document);

    if ("MutationObserver" in window && document.documentElement) {
      var observer = new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var nodes = mutations[i].addedNodes;
          for (var j = 0; j < nodes.length; j++) {
            var node = nodes[j];
            if (node.nodeType !== 1) continue;
            if (node.matches && node.matches(PORT_SELECTOR)) {
              mount(node);
            }
            if (node.querySelectorAll) {
              var found = node.querySelectorAll(PORT_SELECTOR);
              for (var k = 0; k < found.length; k++) {
                mount(found[k]);
              }
            }
          }
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  document.addEventListener("visibilitychange", onVisibilityChange, { passive: true });

  // Quando o seletor de Character Slot for ligado ao HTML, o runtime do card
  // poderá emitir este evento para atualizar imediatamente aura/paleta/medidas.
  document.addEventListener("velarion:character-slot-applied", function(event) {
    const target = event?.target instanceof Element ? event.target : null;
    const port = target?.closest?.(PORT_SELECTOR) || target?.querySelector?.(PORT_SELECTOR);
    if (port) refresh(port);
    else refresh(document);
  });

  if (reducedMotionQuery.addEventListener) {
    reducedMotionQuery.addEventListener("change", () => refresh(document));
  }

  window.VelarionCardFX = {
    mount,
    refresh,
    destroy
  };

  window.dispatchEvent(new CustomEvent("velarion-card-fx-ready"));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
