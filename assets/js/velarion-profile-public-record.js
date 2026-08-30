/* Velarion Profile — Registro Público: somente composição/layout. */
(function(window, document){
  "use strict";
  if (window.VelarionProfilePublicRecord) return;
  function core(){ const api=window.VelarionProfileCore; if(!api) throw new Error("VelarionProfilePublicRecord requer velarion-profile-core.js."); return api; }
  function requireComponent(name,api){ if(!api||typeof api.render!=="function") throw new Error(`VelarionProfilePublicRecord requer ${name}.js.`); return api; }
  function resolveFallbackMediaValue(ctx,kind,value,fallbackKey="default"){
    const C=core(), raw=C.getMediaSource(value);
    if(!raw) return C.getMediaSource(C.getFallbackMedia(ctx,kind,"",fallbackKey));
    const match=/^fallbacks_id_(.+)$/i.exec(C.cleanValue(raw));
    if(!match) return raw;
    return C.getMediaSource(C.getFallbackMedia(ctx,kind,"",match[1]))||C.getMediaSource(C.getFallbackMedia(ctx,kind,"",fallbackKey));
  }
  function render(player, context){
    const C=core(), ctx=context||{}, esc=(v)=>C.escapeHtml(String(v??""));
    const username=requireComponent("velarion-profile-username",window.VelarionProfileUsername);
    const stats=requireComponent("velarion-profile-stats",window.VelarionProfileStats);
    const cargo=requireComponent("velarion-profile-cargo",window.VelarionProfileCargo);
    const rank=requireComponent("velarion-profile-rank",window.VelarionProfileRank);
    const characterSlot=C.resolveCharacterSlot(player,ctx.characterSlotId||"id_1"), slotData=characterSlot.data||{};
    const characterMediaRaw=Object.prototype.hasOwnProperty.call(slotData,"character_image")?slotData.character_image:player?.theme?.card_embed?.character_image;
    const fallbackKey=C.cleanValue(player?.profile?.gender)||C.cleanValue(player?.gender)||"default", fallback=C.getMediaSource(C.getFallbackMedia(ctx,"character","",fallbackKey)), characterImage=resolveFallbackMediaValue(ctx,"character",characterMediaRaw,fallbackKey)||fallback;
    const characterIsWebM=C.isWebMMedia(characterImage), fallbackIsWebM=C.isWebMMedia(fallback), characterSlotBackground=C.cleanValue(slotData.background_color||"");
    const rawCardColor=Object.prototype.hasOwnProperty.call(slotData,"card_color")?slotData.card_color:player?.theme?.card_embed?.card_color;
    const config=C.normalizeCardColorConfig(rawCardColor,"#8b6cff"), cardColor=config.primary||"#8b6cff", cardColor2=`color-mix(in srgb, ${cardColor} 34%, #ffffff 66%)`;
    const palette=C.buildPaletteGradient(config.colors,"135deg"), loop=C.buildPaletteLoopGradient(config.colors,"90deg");
    const pastelize=(colors,angle="135deg",isLoop=false)=>{const list=(Array.isArray(colors)&&colors.length?colors:[cardColor]).filter(Boolean).map(c=>`color-mix(in srgb, ${c} 44%, #ffffff 56%)`);if(!list.length)list.push(`color-mix(in srgb, ${cardColor} 44%, #ffffff 56%)`);if(isLoop&&list.length>1)list.push(list[0]);return `linear-gradient(${angle}, ${list.join(", ")})`;};
    return `<div class="vl-public-stars-only ${characterImage?"has-character":"no-character"}" data-character-slot-id="${esc(characterSlot.id||"id_1")}" data-character-slot-count="${esc(characterSlot.ids.length||1)}" data-card-color-type="${esc(config.type||"none")}" data-card-color-speed="${esc(config.speed||10)}" data-card-color-palette="${esc((config.colors||[cardColor]).join(","))}" style="--vl-public-character-slot-background:${esc(characterSlotBackground||"transparent")};--vp-accent:${esc(cardColor)};--vp-accent2:${esc(cardColor2)};--vp-glow:${esc(cardColor)};--vp-card-color-speed:${esc(config.speed||10)}s;--vp-card-palette-gradient:${esc(palette)};--vp-card-palette-loop-gradient:${esc(loop)};--vp-card-pastel-gradient:${esc(pastelize(config.colors,"135deg",false))};--vp-card-pastel-loop-gradient:${esc(pastelize(config.colors,"90deg",true))};">
      <div class="vl-public-stars-only__left-zone">
        <div class="vl-public-stars-only__visual" aria-hidden="true"><div class="vl-public-stars-only__effects"><span class="vl-public-stars-only__ring vl-public-stars-only__ring--one"></span><span class="vl-public-stars-only__ring vl-public-stars-only__ring--two"></span><span class="vl-public-stars-only__diamond vl-public-stars-only__diamond--one"></span><span class="vl-public-stars-only__diamond vl-public-stars-only__diamond--two"></span><span class="vl-public-stars-only__diamond vl-public-stars-only__diamond--three"></span></div>${characterImage?`<div class="vl-public-stars-only__character ${characterIsWebM?"is-webm":"is-image"}">${characterIsWebM?`<video src="${esc(characterImage)}" autoplay loop muted playsinline preload="auto" tabindex="-1" data-vl-character-fallback="${esc(fallback)}" data-vl-character-fallback-webm="${fallbackIsWebM?"1":"0"}" onerror="window.VelarionProfilePublicRecord?.applyCharacterMediaFallback?.(this)"></video>`:`<img src="${esc(characterImage)}" alt="" loading="eager" decoding="async" data-vl-character-fallback="${esc(fallback)}" data-vl-character-fallback-webm="${fallbackIsWebM?"1":"0"}" onerror="window.VelarionProfilePublicRecord?.applyCharacterMediaFallback?.(this)">`}</div>`:""}</div>
        <div class="vl-public-info-stack vl-public-info-stack--document">${username.render(player,ctx)}${stats.render(player,ctx)}</div>
      </div>
      <div class="vl-public-stars-only__right-zone"><div class="vl-public-systems-switcher" data-vl-public-systems-switcher data-subpage-index="0" data-sub-direction="none"><button class="vl-public-systems-switcher__nav vl-public-systems-switcher__nav--next" type="button" data-vl-public-subnav="1" aria-label="Avançar"><span aria-hidden="true">›</span></button><div class="vl-public-systems-switcher__viewport"><article class="vl-public-systems-switcher__page is-active" data-vl-public-subpage data-vl-public-subpage-label="Cargo" aria-hidden="false"><div class="vl-public-systems-switcher__content">${cargo.render(player,ctx)}</div></article><article class="vl-public-systems-switcher__page" data-vl-public-subpage data-vl-public-subpage-label="Rank" aria-hidden="true" inert><div class="vl-public-systems-switcher__content">${rank.render(player,ctx)}</div></article></div></div></div>
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

  const publicCardColorRuntime = {
    nodes: new Set(),
    raf: 0,
    startedAt: performance.now()
  };

  function getPublicRuntimePalette(node) {
    const C = core();
    return String(node?.dataset?.cardColorPalette || "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => C.isValidHexColor(value));
  }

  function applyDynamicPublicColor(node, color) {
    const C = core();
    if (!node || !C.isValidHexColor(color)) return;
    node.style.setProperty("--vp-accent", color);
    node.style.setProperty("--vp-glow", color);
    node.style.setProperty("--vp-accent2", `color-mix(in srgb, ${color} 34%, #ffffff 66%)`);
  }

  function updateAnimatedPublicColors(now) {
    const C = core();
    let active = false;

    publicCardColorRuntime.nodes.forEach((node) => {
      if (!node || !node.isConnected) {
        publicCardColorRuntime.nodes.delete(node);
        return;
      }

      const type = C.normalizeCardColorType(node.dataset.cardColorType);
      const colors = getPublicRuntimePalette(node);
      if (colors.length < 2 || !["rotate", "pulse"].includes(type)) return;

      active = true;
      const speed = C.normalizeCardColorSpeed(node.dataset.cardColorSpeed, 10);
      const elapsedSeconds = (now - publicCardColorRuntime.startedAt) / 1000;
      const cycle = ((elapsedSeconds % speed) / speed) * colors.length;
      const baseIndex = Math.floor(cycle) % colors.length;
      const nextIndex = (baseIndex + 1) % colors.length;
      const localProgress = cycle - Math.floor(cycle);

      if (type === "rotate") {
        const lastIndex = Number(node.dataset.publicCardColorRuntimeIndex ?? -1);
        if (lastIndex !== baseIndex) {
          node.dataset.publicCardColorRuntimeIndex = String(baseIndex);
          applyDynamicPublicColor(node, colors[baseIndex]);
        }
        return;
      }

      const eased = localProgress * localProgress * (3 - 2 * localProgress);
      applyDynamicPublicColor(node, C.interpolateHexColor(colors[baseIndex], colors[nextIndex], eased));
    });

    if (active || publicCardColorRuntime.nodes.size) {
      publicCardColorRuntime.raf = requestAnimationFrame(updateAnimatedPublicColors);
    } else {
      publicCardColorRuntime.raf = 0;
    }
  }

  function setupPublicCardColorEffects(root) {
    const C = core();
    const scope = root || document;
    scope.querySelectorAll?.('.vl-public-stars-only[data-card-color-type]').forEach((node) => {
      if (node.dataset.vlPublicCardColorBound === "true") return;
      node.dataset.vlPublicCardColorBound = "true";

      const colors = getPublicRuntimePalette(node);
      const type = C.normalizeCardColorType(node.dataset.cardColorType);
      if (colors.length) applyDynamicPublicColor(node, colors[0]);
      if (colors.length > 1 && ["rotate", "pulse"].includes(type)) {
        publicCardColorRuntime.nodes.add(node);
      }
    });

    if (publicCardColorRuntime.nodes.size && !publicCardColorRuntime.raf) {
      publicCardColorRuntime.startedAt = performance.now();
      publicCardColorRuntime.raf = requestAnimationFrame(updateAnimatedPublicColors);
    }
  }

  function hydrate(root) {
    ensurePublicSystemsSubNavigation();
    const scope = root || document;
    scope.querySelectorAll?.('[data-vl-fallback-pending="1"]').forEach(applyCharacterMediaFallback);
    setupPublicCardColorEffects(scope);
  }

  window.VelarionProfilePublicRecord = {
    render,
    hydrate,
    refresh: hydrate,
    applyCharacterMediaFallback,
    setSubPage: setPublicSystemsSubPage
  };
})(window, document);
