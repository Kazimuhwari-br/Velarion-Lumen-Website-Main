
/* ======================================================================
   LOCALIZAÇÃO DE TELA: 1024x768 com zoom de página em 67%
   ----------------------------------------------------------------------
   Objetivo: facilitar a vida de usuários em monitor 4:3 antigo.

   Como funciona:
   1) Detecta automaticamente quando a tela física é 1024x768 e o zoom
      aparente está perto de 67%.
   2) Também permite forçar manualmente pelo link:
      ?vlLayout=1024x768-67
   3) Para limpar a configuração salva:
      ?vlLayout=auto

   Também é possível usar no console:
      VelarionLayout.setPreset('1024x768-67')
      VelarionLayout.clearPreset()
   ====================================================================== */
(function(){
  var PRESET = '1024x768-67';
  var CLASS_NAME = 'vl-layout-1024x768-67';
  var STORAGE_KEY = 'vl-layout-preset';
  var resizeTimer = null;

  function safeStorageGet(){
    try { return window.localStorage ? localStorage.getItem(STORAGE_KEY) : ''; }
    catch(e){ return ''; }
  }
  function safeStorageSet(value){
    try {
      if(!window.localStorage) return;
      if(value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch(e){}
  }
  function getParam(){
    try { return new URLSearchParams(window.location.search).get('vlLayout') || ''; }
    catch(e){ return ''; }
  }
  function screenIs1024x768(){
    var w = Math.round(window.screen && window.screen.width ? window.screen.width : 0);
    var h = Math.round(window.screen && window.screen.height ? window.screen.height : 0);
    return (w === 1024 && h === 768) || (w === 768 && h === 1024);
  }
  function apparentZoom(){
    var sw = Math.max(1, Math.round(window.screen && window.screen.width ? window.screen.width : window.innerWidth));
    var iw = Math.max(1, Math.round(window.innerWidth || sw));
    return sw / iw;
  }
  function shouldAutoApply(){
    if(!screenIs1024x768()) return false;
    var z = apparentZoom();
    return z >= 0.60 && z <= 0.75;
  }
  function applyPreset(active){
    var root = document.documentElement;
    root.classList.toggle(CLASS_NAME, !!active);
    if(active) root.setAttribute('data-vl-layout', PRESET);
    else if(root.getAttribute('data-vl-layout') === PRESET) root.removeAttribute('data-vl-layout');

    if(document.body){
      document.body.classList.toggle(CLASS_NAME, !!active);
      if(active) document.body.setAttribute('data-vl-layout', PRESET);
      else if(document.body.getAttribute('data-vl-layout') === PRESET) document.body.removeAttribute('data-vl-layout');
    }
  }
  function resolveLayout(){
    var param = getParam().toLowerCase();
    if(param === PRESET || param === '1024x768-zoom67' || param === '1024-768-67'){
      safeStorageSet(PRESET);
      applyPreset(true);
      return;
    }
    if(param === 'auto' || param === 'default' || param === 'normal' || param === 'clear'){
      safeStorageSet('');
      applyPreset(false);
      return;
    }
    var saved = safeStorageGet();
    applyPreset(saved === PRESET || shouldAutoApply());
  }

  window.VelarionLayout = {
    preset: PRESET,
    setPreset: function(value){
      if(String(value || '').toLowerCase() === PRESET){
        safeStorageSet(PRESET);
        applyPreset(true);
      }
    },
    clearPreset: function(){
      safeStorageSet('');
      applyPreset(false);
    },
    getPreset: function(){
      return document.documentElement.classList.contains(CLASS_NAME) ? PRESET : 'auto';
    }
  };

  resolveLayout();
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', resolveLayout, { once:true });
  }
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resolveLayout, 120);
  });
})();

(function(){
  /*
   * LOADER INICIAL + CONFIGURAÇÃO GLOBAL
   * ------------------------------------------------
   * Controlado por assets/js/velarion.config.js.
   * - loading.backgroundCount define quantas imagens existem.
   * - loading.backgroundPathPattern aceita {number} ou {n}.
   * - maintenance.enabled redireciona para maintenance.html.
   */
  var DEFAULT_CONFIG = {
    loading: {
      enabled: true,
      showOncePerSession: true,
      backgroundCount: 10,
      backgroundPathPattern: "./assets/img/loading/background{number}.png",
      minDurationMs: 6500,
      maxDurationMs: 12000,
      version: "loader-clean-stop-v6",
      fallbackImage: "./assets/img/loading/fallback.png",
      texts: [
        "Abrindo os portões de Lumen",
        "A névoa da cidade desperta",
        "Ecos do Codex atravessam o véu",
        "Relíquias urbanas respondem ao chamado",
        "As luzes de Velarion se alinham",
        "O caminho dos aventureiros está sendo traçado"
      ],
      rotateDuringLoading: false,
      backgroundIntervalMs: 0,
      preloadNextBackground: false,
      waitForBackground: true,
      backgroundVisibleMinMs: 2200,
      backgroundWaitMaxMs: 4200,
      avoidImmediateRepeat: true,
      progressEnabled: true,
      destroyAfterClose: true
    },
    maintenance: {
      enabled: false,
      page: "maintenance.html",
      previewParam: "vlMaintenancePreview"
    }
  };

  var CONFIG = window.VELARION_CONFIG || window.VL_SITE_CONFIG || {};
  var LOADING_CONFIG = mergeConfig(DEFAULT_CONFIG.loading, CONFIG.loading || {});
  var MAINTENANCE_CONFIG = mergeConfig(DEFAULT_CONFIG.maintenance, CONFIG.maintenance || {});

  var BOOT_KEY = "vlBootShownOnce:" + String(LOADING_CONFIG.version || "default");
  var BOOT_BG_LAST_KEY = "vlBootLastBackground";
  var bootStart = Date.now();
  var bootMin = toNumber(LOADING_CONFIG.minDurationMs, DEFAULT_CONFIG.loading.minDurationMs);
  var bootMax = toNumber(LOADING_CONFIG.maxDurationMs, DEFAULT_CONFIG.loading.maxDurationMs);
  var bootBgInterval = toNumber(LOADING_CONFIG.backgroundIntervalMs, DEFAULT_CONFIG.loading.backgroundIntervalMs);
  var bootShouldRotateBg = LOADING_CONFIG.rotateDuringLoading === true && bootBgInterval >= 1800;
  var hideTimer = null;
  var bootBgTimer = null;
  var bootBgActiveLayer = 0;
  var bootBgCurrent = 0;
  var bootAssetBase = null;
  var rootBase = null;
  var bootBgReady = false;
  var bootBgReadyAt = window.__vlBootBgReadyAt || 0;
  var bootProgressRaf = 0;
  var bootClosedCleaned = false;

  function mergeConfig(base, extra){
    var out = {};
    Object.keys(base || {}).forEach(function(key){ out[key] = base[key]; });
    Object.keys(extra || {}).forEach(function(key){ out[key] = extra[key]; });
    return out;
  }

  function toNumber(value, fallback){
    var n = parseInt(value, 10);
    return isFinite(n) && n >= 0 ? n : fallback;
  }

  function getScriptSrc(){
    var script = document.currentScript || document.querySelector('script[src$="assets/js/main.js"],script[src$="../assets/js/main.js"],script[src*="/assets/js/main.js"]');
    return script ? script.getAttribute("src") || "" : "";
  }

  function getRootBase(){
    if(rootBase !== null) return rootBase;
    var src = getScriptSrc();
    if(src && /assets\/js\/main\.js(?:\?.*)?$/i.test(src)){
      rootBase = src.replace(/assets\/js\/main\.js(?:\?.*)?$/i, "");
      return rootBase;
    }
    rootBase = (location.pathname.indexOf("/pages/") !== -1) ? "../" : "";
    return rootBase;
  }

  function getBootAssetBase(){
    if(bootAssetBase) return bootAssetBase;
    bootAssetBase = getRootBase() + "assets/";
    return bootAssetBase;
  }

  function getMaintenanceUrl(){
    var page = String(MAINTENANCE_CONFIG.page || "maintenance.html");
    if(/^(?:https?:)?\/\//i.test(page) || page.charAt(0) === "/") return page;
    return getRootBase() + page.replace(/^\.\//, "").replace(/^\.\.\//, "");
  }

  function hasPreviewParam(){
    var param = String(MAINTENANCE_CONFIG.previewParam || "vlMaintenancePreview");
    if(!param) return false;
    try { return new URLSearchParams(location.search).get(param) === "1"; }
    catch(e){ return false; }
  }

  function isMaintenancePage(){
    if(document.documentElement && document.documentElement.getAttribute("data-vl-page") === "maintenance") return true;
    if(document.body && document.body.dataset && document.body.dataset.page === "maintenance") return true;
    return /(?:^|\/)maintenance\.html(?:$|[?#])/i.test(location.pathname + location.search);
  }

  function redirectToMaintenanceIfNeeded(){
    if(MAINTENANCE_CONFIG.enabled !== true) return false;
    if(isMaintenancePage() || hasPreviewParam()) return false;
    location.replace(getMaintenanceUrl());
    return true;
  }

  if(redirectToMaintenanceIfNeeded()) return;

  function lockBootScroll(){
    document.documentElement.classList.add("vl-boot-lock");
    if(document.body) document.body.classList.add("vl-boot-lock");
  }

  function unlockBootScroll(){
    document.documentElement.classList.remove("vl-boot-lock");
    if(document.body) document.body.classList.remove("vl-boot-lock");
  }

  function getBoot(){ return document.getElementById("summonBoot"); }

  function getBootBgCount(boot){
    var fromConfig = toNumber(LOADING_CONFIG.backgroundCount, DEFAULT_CONFIG.loading.backgroundCount);
    var fromHtml = boot && boot.dataset ? toNumber(boot.dataset.vlLoadingBackgrounds, fromConfig) : fromConfig;
    return Math.max(1, fromHtml || fromConfig || 1);
  }

  function resolveBootPath(path){
    var p = String(path || "img/loading/background{number}.png");
    var base = getBootAssetBase();
    if(/^(?:https?:)?\/\//i.test(p) || p.charAt(0) === "/") return p;
    p = p.replace(/^\.\//, "");
    if(/^\.\.\/assets\//i.test(p)) return base + p.replace(/^\.\.\/assets\//i, "");
    if(/^assets\//i.test(p)) return base + p.replace(/^assets\//i, "");
    return base + p;
  }

  function getBootBgUrl(index){
    var pattern = LOADING_CONFIG.backgroundPathPattern || "img/loading/background{number}.png";
    var path = String(pattern)
      .replace(/\{number\}/g, String(index))
      .replace(/\{n\}/g, String(index));
    return resolveBootPath(path);
  }

  function getBootFallbackUrl(){
    var fallback = String(LOADING_CONFIG.fallbackImage || "./assets/img/loading/fallback.png");
    return resolveBootPath(fallback);
  }

  function getBootTextPool(){
    var list = Array.isArray(LOADING_CONFIG.texts) ? LOADING_CONFIG.texts : [];
    return list.length ? list : [
      "Abrindo os portões de Lumen",
      "A névoa da cidade desperta",
      "Ecos do Codex atravessam o véu"
    ];
  }

  function pickBootText(){
    var list = getBootTextPool();
    return list[Math.floor(Math.random() * list.length)] || "Abrindo os portões de Lumen";
  }

  function getLastBootBg(){
    try { return parseInt(localStorage.getItem(BOOT_BG_LAST_KEY) || "0", 10) || 0; }
    catch(e){ return 0; }
  }

  function setLastBootBg(index){
    try { localStorage.setItem(BOOT_BG_LAST_KEY, String(index)); }
    catch(e){}
  }

  function pickBootBgIndex(avoid, boot){
    var count = getBootBgCount(boot);
    var index = Math.floor(Math.random() * count) + 1;
    if(LOADING_CONFIG.avoidImmediateRepeat !== false && count > 1 && index === avoid) index = (index % count) + 1;
    return index;
  }

  function markBootBgReady(layer){
    if(layer && layer.classList) layer.classList.add("is-ready");
    if(!bootBgReady){
      bootBgReady = true;
      bootBgReadyAt = Date.now();
      window.__vlBootBgReadyAt = bootBgReadyAt;
      document.documentElement.classList.add("vl-boot-bg-ready");
    }
  }

  function watchBootImageLayer(layer){
    if(!layer || !layer.tagName || String(layer.tagName).toLowerCase() !== "img") return;
    if(layer.dataset && layer.dataset.vlBootWatched !== "true"){
      layer.dataset.vlBootWatched = "true";
      layer.addEventListener("load", function(){ markBootBgReady(layer); });
    }
    try {
      if(layer.complete && layer.naturalWidth > 0){
        setTimeout(function(){ markBootBgReady(layer); }, 0);
      }
    } catch(e) {}
  }

  function preloadBootBg(index){
    if(LOADING_CONFIG.preloadNextBackground !== true) return;
    try {
      var img = new Image();
      img.decoding = "async";
      img.src = getBootBgUrl(index);
    } catch(e){}
  }

  function applyBootLayerImage(layer, url, index, fallback){
    if(!layer || !url) return;
    var safeUrl = String(url).replace(/"/g, "%22");

    // V4: usa <img src="..."> real além do background CSS.
    // Assim o loader não depende só de variável CSS para mostrar a arte.
    if(layer.tagName && String(layer.tagName).toLowerCase() === "img"){
      try {
        watchBootImageLayer(layer);
        if(layer.getAttribute("src") !== url){
          layer.classList.remove("is-ready");
          layer.setAttribute("src", url);
        } else if(layer.complete && layer.naturalWidth > 0){
          markBootBgReady(layer);
        }
      } catch(e) {}
    }

    layer.style.setProperty("--vl-boot-image", 'url("' + safeUrl + '")');
    layer.dataset.bgIndex = String(index);
    layer.dataset.fallback = fallback ? "true" : "false";
    layer.classList.toggle("is-fallback", !!fallback);
    layer.classList.remove("is-active");
    void layer.offsetWidth;
    layer.classList.add("is-active");
  }
  function paintBootBg(layer, index){
    if(!layer) return;
    var requestedUrl = getBootBgUrl(index);
    var firstUrl = getBootBgUrl(1);
    var fallbackUrl = getBootFallbackUrl();

    // Mantém a imagem inicial do HTML enquanto a imagem escolhida é preparada.
    // Isso evita trocar para fallback.png logo no início e atrasar o fade.
    if(layer.tagName && String(layer.tagName).toLowerCase() === "img"){
      watchBootImageLayer(layer);
      layer.dataset.bgIndex = String(index);
      layer.dataset.fallback = "false";
      layer.classList.remove("is-fallback");
      layer.classList.add("is-active");
      try { if(layer.complete && layer.naturalWidth > 0) markBootBgReady(layer); } catch(e) {}
    } else {
      applyBootLayerImage(layer, fallbackUrl, index, true);
    }

    function keepSameLayer(){
      return layer && layer.dataset && layer.dataset.bgIndex === String(index);
    }

    function applyFallback(){
      if(!keepSameLayer()) return;
      applyBootLayerImage(layer, fallbackUrl, index, true);
    }

    function tryFirstImage(){
      if(!keepSameLayer()) return;
      if(requestedUrl === firstUrl) return applyFallback();
      try {
        var first = new Image();
        first.decoding = "async";
        first.onload = function(){ if(keepSameLayer()) applyBootLayerImage(layer, firstUrl, 1, false); };
        first.onerror = applyFallback;
        first.src = firstUrl;
      } catch(e) { applyFallback(); }
    }

    try {
      var img = new Image();
      img.decoding = "async";
      img.onload = function(){ if(keepSameLayer()) applyBootLayerImage(layer, requestedUrl, index, false); };
      // Se background2.png, background3.png etc. não existirem, tenta background1.png antes do fallback.
      img.onerror = tryFirstImage;
      img.src = requestedUrl;
    } catch(e) {
      tryFirstImage();
    }
  }

  function rotateBootBg(boot){
    if(!boot || boot.dataset.closed === "true") return;
    var layers = [boot.querySelector("[data-vl-boot-bg-a]"), boot.querySelector("[data-vl-boot-bg-b]")];
    if(!layers[0] || !layers[1]) return;
    var next = pickBootBgIndex(bootBgCurrent || getLastBootBg(), boot);
    var nextLayer = layers[bootBgActiveLayer ? 0 : 1];
    var prevLayer = layers[bootBgActiveLayer ? 1 : 0];
    paintBootBg(nextLayer, next);
    if(prevLayer) prevLayer.classList.remove("is-active");
    bootBgActiveLayer = bootBgActiveLayer ? 0 : 1;
    bootBgCurrent = next;
    setLastBootBg(next);
    preloadBootBg(pickBootBgIndex(next, boot));
  }

  function initBootBackgrounds(boot){
    if(!boot) return;
    var firstLayer = boot.querySelector("[data-vl-boot-bg-a]");
    var secondLayer = boot.querySelector("[data-vl-boot-bg-b]");
    if(!firstLayer || !secondLayer) return;
    watchBootImageLayer(firstLayer);
    watchBootImageLayer(secondLayer);
    var first = pickBootBgIndex(getLastBootBg(), boot);
    bootBgActiveLayer = 0;
    bootBgCurrent = first;
    paintBootBg(firstLayer, first);
    secondLayer.classList.remove("is-active");
    setLastBootBg(first);
    preloadBootBg(pickBootBgIndex(first, boot));
    clearInterval(bootBgTimer);
    if(bootShouldRotateBg){
      bootBgTimer = setInterval(function(){ rotateBootBg(boot); }, bootBgInterval);
    }
  }

  function stopBootBackgrounds(){
    clearInterval(bootBgTimer);
    bootBgTimer = null;
  }

  function stopBootProgress(){
    if(bootProgressRaf){
      cancelAnimationFrame(bootProgressRaf);
      bootProgressRaf = 0;
    }
  }

  function startBootProgress(boot){
    if(!boot || LOADING_CONFIG.progressEnabled === false) return;
    var line = boot.querySelector(".vl-boot-line i");
    if(!line) return;
    boot.classList.add("is-running");
    stopBootProgress();

    function draw(){
      var currentBoot = getBoot();
      if(!currentBoot || currentBoot.dataset.closed === "true"){
        stopBootProgress();
        return;
      }

      var elapsed = Math.max(0, Date.now() - bootStart);
      var total = Math.max(bootMin || 1, 1800);
      var progress = Math.min(elapsed / total, 0.94);

      // Quando a imagem de fundo já apareceu, a barra avança um pouco mais,
      // mas só fecha quando vlHideBoot() autorizar pelo tempo mínimo.
      if(bootBgReady) progress = Math.max(progress, 0.72);

      var eased = 1 - Math.pow(1 - progress, 3);
      var pct = Math.max(2, Math.min(96, eased * 100));
      currentBoot.style.setProperty("--vl-boot-progress", pct.toFixed(2) + "%");
      line.style.transform = "scaleX(" + (pct / 100).toFixed(4) + ")";
      bootProgressRaf = requestAnimationFrame(draw);
    }

    draw();
  }

  function finishBootProgress(boot){
    if(!boot) return;
    boot.style.setProperty("--vl-boot-progress", "100%");
    var line = boot.querySelector(".vl-boot-line i");
    if(line) line.style.transform = "scaleX(1)";
  }

  function cleanupBootRuntime(boot){
    if(bootClosedCleaned) return;
    bootClosedCleaned = true;
    clearTimeout(hideTimer);
    hideTimer = null;
    stopBootProgress();
    stopBootBackgrounds();
    unlockBootScroll();
    document.documentElement.classList.remove("vl-boot-ready", "vl-boot-bg-ready");

    if(boot){
      boot.classList.add("is-cleaned");
      try {
        boot.querySelectorAll("img.vl-boot-bg").forEach(function(img){
          img.onload = null;
          img.onerror = null;
          img.removeAttribute("srcset");
          // Se ainda houver download pendente, remover o src ajuda o navegador a abortar.
          if(LOADING_CONFIG.destroyAfterClose !== false) img.removeAttribute("src");
        });
      } catch(e) {}
    }
  }

  function storageGet(){
    try { return sessionStorage.getItem(BOOT_KEY); } catch(e) { return null; }
  }

  function storageSet(){
    if(LOADING_CONFIG.showOncePerSession === false) return;
    try { sessionStorage.setItem(BOOT_KEY, "1"); } catch(e) {}
  }

  function alreadyShown(){
    return LOADING_CONFIG.showOncePerSession !== false && storageGet() === "1";
  }

  function removeBootImmediately(){
    var boot = getBoot();
    cleanupBootRuntime(boot);
    document.documentElement.classList.add("vl-skip-boot");
    if(boot && boot.parentNode) boot.parentNode.removeChild(boot);
  }

  window.vlBootSetText = function(text){
    if(alreadyShown()) return;
    var boot = getBoot();
    var target = boot ? boot.querySelector("[data-vl-loader-text]") : null;
    if(target && text) target.textContent = "— " + String(text).toUpperCase() + " —";
  };

  window.vlBootSetFantasyText = function(){
    window.vlBootSetText(pickBootText());
  };

  function getBootHideDelay(){
    var now = Date.now();
    var elapsed = now - bootStart;
    var delay = Math.max(0, bootMin - elapsed);

    if(LOADING_CONFIG.waitForBackground !== false){
      var visibleMin = toNumber(LOADING_CONFIG.backgroundVisibleMinMs, 2200);
      var waitMax = toNumber(LOADING_CONFIG.backgroundWaitMaxMs, 4200);

      if(!bootBgReady && elapsed < waitMax){
        delay = Math.max(delay, waitMax - elapsed);
      }
      if(bootBgReady && bootBgReadyAt){
        delay = Math.max(delay, visibleMin - (now - bootBgReadyAt));
      }
    }

    if(elapsed >= bootMax) return 0;
    return Math.max(0, Math.min(delay, bootMax - elapsed));
  }

  window.vlHideBoot = function(){
    var boot = getBoot();
    storageSet();
    if(!boot || boot.dataset.closed === "true") {
      cleanupBootRuntime(boot);
      return;
    }

    var delay = getBootHideDelay();
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function(){
      boot.dataset.closed = "true";
      boot.classList.add("is-hidden", "is-closing");
      document.documentElement.classList.add("vl-boot-done");
      finishBootProgress(boot);
      stopBootProgress();
      stopBootBackgrounds();

      setTimeout(function(){
        cleanupBootRuntime(boot);
        if(boot && boot.parentNode && LOADING_CONFIG.destroyAfterClose !== false) boot.remove();
      }, 760);
    }, delay);
  };

  function armBoot(){
    if(LOADING_CONFIG.enabled === false){
      removeBootImmediately();
      return;
    }

    if(alreadyShown()){
      removeBootImmediately();
      return;
    }

    var boot = getBoot();
    if(!boot) { storageSet(); unlockBootScroll(); return; }

    initBootBackgrounds(boot);
    lockBootScroll();
    document.documentElement.classList.add("vl-boot-ready");
    window.vlBootSetText(pickBootText());
    startBootProgress(boot);

    // Fecha no load em qualquer página. Nas páginas com Firebase, os dados ainda podem
    // chamar vlHideBoot() depois; a função é segura e não executa duas vezes.
    window.addEventListener("load", function(){ window.vlHideBoot(); }, { once:true });

    setTimeout(function(){
      var stillVisible = getBoot();
      if(stillVisible && stillVisible.dataset.closed !== "true") window.vlHideBoot();
    }, bootMax);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", armBoot, { once:true });
  else armBoot();
})();

(function(){
  function ready(fn){
    if(document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function(){
    var page = document.body.dataset.page || 'hub';
    document.querySelectorAll('[data-nav]').forEach(function(link){
      link.classList.toggle('is-active', link.dataset.nav === page);
    });

    var toggle = document.querySelector('[data-menu-toggle]');
    if(toggle){
      toggle.addEventListener('click', function(){
        var open = document.body.classList.toggle('menu-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }

    document.addEventListener('keydown', function(event){
      if(event.key === 'Escape'){
        document.body.classList.remove('menu-open');
        if(toggle) toggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.querySelectorAll('[data-local-search]').forEach(function(input){
      var root = input.closest('section') || document;
      var items = root.querySelectorAll('[data-search-item]');
      input.addEventListener('input', function(){
        var term = input.value.trim().toLowerCase();
        items.forEach(function(item){
          var text = (item.dataset.searchItem + ' ' + item.textContent).toLowerCase();
          item.classList.toggle('is-hidden-by-search', term && !text.includes(term));
        });
      });
    });

    document.querySelectorAll('[data-support-form]').forEach(function(form){
      form.addEventListener('submit', function(event){
        event.preventDefault();
        var data = new FormData(form);
        var subject = data.get('subject') || 'Sem assunto';
        alert('Ticket visual preparado: ' + subject + '\nConecte este formulário depois com o sistema de suporte da comunidade.');
      });
    });

    var revealItems = document.querySelectorAll('.reveal');
    if(!('IntersectionObserver' in window)){
      revealItems.forEach(function(el){el.classList.add('is-visible');});
      return;
    }
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:.12});
    revealItems.forEach(function(el){observer.observe(el);});
  });
})();


/* ===== Integração funcional: lógica antiga adaptada ao visual novo ===== */
(function(){
	if (!document.body || !document.body.dataset.vlDataPage) return;
/* ===== original script 1  ===== */
// ===== JavaScript: Configuração e estado global =====
	const VL_PLAYER_DATA_URL = "https://kazimuhwaribedrock-default-rtdb.firebaseio.com/profilePlayers.json";
	const VL_EXTENSIONS_BASE_URL = "https://kazimuhwaribedrock-extensions-default-rtdb.firebaseio.com";
	const VL_NPC_DATA_URL = "https://kazimuhwaribedrock-npcs-default-rtdb.firebaseio.com/profileNpcs";
	const EXTENSIONS_DATA_URL = VL_EXTENSIONS_BASE_URL + "/information_panel.json";
	const SERVER_PANEL_DATA_URL = VL_EXTENSIONS_BASE_URL + "/server_panel.json";
	const CLANS_DATA_URL = "https://kazimuhwaribedrock-clans-default-rtdb.firebaseio.com/clanPlayers.json";
	const VL_PAGE_KIND = document.body?.dataset?.vlDataPage || "";
	const VL_CUSTOM_DATA_URL = document.body?.dataset?.firebaseUrl || "";
	const VL_HABITANT_DATA_URLS = [
		VL_CUSTOM_DATA_URL,
		VL_NPC_DATA_URL + "/Inhabitants.json",
		VL_NPC_DATA_URL + "/Residents.json",
		VL_NPC_DATA_URL + "/Citizens.json",
		VL_NPC_DATA_URL + "/Allies.json",
		VL_NPC_DATA_URL + "/Guides.json",
		VL_NPC_DATA_URL + "/Merchants.json",
		VL_NPC_DATA_URL + "/Guardians.json",
		VL_NPC_DATA_URL + "/LocalPeople.json",
		VL_NPC_DATA_URL + "/FiguresOfTheWorld.json",
		VL_NPC_DATA_URL + "/Undefineds.json"
	].filter(Boolean);
	const DATA_URLS = VL_PAGE_KIND === "habitants" ? VL_HABITANT_DATA_URLS : [VL_CUSTOM_DATA_URL || VL_PLAYER_DATA_URL];
	const DATA_URL = DATA_URLS[0];
	let extensionsData = null;
	let clansData = {};
	
	let DEFAULT_PLAYER_AVATAR = null;
	let DEFAULT_PLAYER_CHARACTER = null;
	let DEFAULT_PLAYER_BANNER = null;

	let playersData = [];
	let profilePlayersDataSource = {};
	let filteredPlayers = [];
	let activePlayerId = null;
	let isTransitionRunning = false;
	let pageScrollBeforeDetail = 0;
	let isListMode = false;
	let currentPage = 1;
	let itemsPerPage = 10;



	// ===== Rotas separadas GitHub Pages =====
	const SITE_BASE_PATH = "";
	function getSiteBasePath() { return ""; }
	function cleanProfileSlug(value) {
		return String(value || "").trim().replace(/^ID[_-]?/i, "");
	}
	function makeProfileUrl(playerId) {
		return "#profile-" + encodeURIComponent(cleanProfileSlug(playerId));
	}
	function makeSearchUrl() {
		return (window.location.pathname || "");
	}
	function getProfileSlugFromPath() {
		const base = getSiteBasePath();
		let path = window.location.pathname || "/";
		if (base && path.startsWith(base)) path = path.slice(base.length) || "/";
		const match = path.match(/^\/users\/([^\/]+)\/profile\/?$/i);
		return match ? decodeURIComponent(match[1]) : "";
	}

	function getProfileSlugFromHash() {
		const hash = String(window.location.hash || "").trim();
		const match = hash.match(/^#(?:profile|perfil)-(.+)$/i);
		return match ? decodeURIComponent(match[1]) : "";
	}

	function getRequestedProfileSlug() {
		return getProfileSlugFromHash() || getProfileSlugFromPath();
	}
	function findPlayerBySlug(slug) {
		const wanted = cleanProfileSlug(slug).toLowerCase();
		return playersData.find(function(item) {
			const rawId = String(item._id || "");
			const cleanId = cleanProfileSlug(rawId);
			const username = cleanProfileSlug(item?.profile?.display_username || "");
			return rawId.toLowerCase() === wanted || cleanId.toLowerCase() === wanted || username.toLowerCase() === wanted;
		}) || null;
	}

	// ===== JavaScript: Helpers de animação / transição =====
	function wait(ms) {
		return new Promise(function(resolve) {
			setTimeout(resolve, ms);
		});
	}


	function hideSummonBoot() {
		if (window.vlHideBoot) {
			window.vlHideBoot();
			return;
		}
		const boot = document.getElementById("summonBoot");
		if (!boot) return;
		boot.classList.add("is-hidden");
		setTimeout(function() { boot.remove(); }, 720);
	}

	async function playSummonSequence(player) {
		const gate = document.getElementById("summonGate");
		if (!gate || !player) return;

		const color = normalizeHexColor(player?.theme?.card_embed?.card_color || "#75d7ff");
		const displayName = stripMinecraftCodes(getDisplayName(player));
		const userName = stripMinecraftCodes(getUsername(player));
		const avatar = getAvatar(player);
		const kicker = gate.querySelector("[data-summon-kicker]");
		const title = gate.querySelector("[data-summon-title]");
		const status = gate.querySelector("[data-summon-status]");
		const avatarBox = gate.querySelector("[data-summon-avatar]");

		gate.style.setProperty("--summon-accent", hexToRgba(color, 0.48));
		gate.dataset.phase = "scan";
		gate.setAttribute("aria-hidden", "false");
		gate.classList.remove("is-hidden");

		if (avatarBox) {
			avatarBox.innerHTML = `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(displayName)}" onerror="this.onerror=null; this.src='${escapeHtml(DEFAULT_PLAYER_AVATAR)}'">`;
		}
		if (kicker) kicker.textContent = userName || "???";
		if (title) title.textContent = displayName || "???";
		if (status) status.textContent = "Lendo dados, rank e badges...";
		await wait(520);

		if (kicker) kicker.textContent = userName || "???";
		if (status) status.textContent = "Sincronizando perfil do jogador...";
		gate.dataset.phase = "reveal";
		await wait(460);

		if (title) title.textContent = displayName || "???";
		if (status) status.textContent = "Perfil carregado. Abrindo arquivo...";
		await wait(560);

		gate.classList.add("is-hidden");
		gate.setAttribute("aria-hidden", "true");
		await wait(240);
	}

	function ensureScreenFade() {
		let fade = document.getElementById("screenFade");
		if (fade) return fade;

		fade = document.createElement("div");
		fade.id = "screenFade";
		fade.className = "screen-fade";
		document.body.appendChild(fade);
		return fade;
	}

	function createTransitionLayer() {
		const layer = document.createElement("div");
		layer.className = "transition-layer";
		document.body.appendChild(layer);
		return layer;
	}

	function makeComets(container, accentColor) {
		const burst = document.createElement("div");
		burst.className = "rare-burst";
		burst.style.setProperty("--accent", accentColor || "#8eb4ff");

		const cometCount = 12;

		for (let i = 0; i < cometCount; i += 1) {
			const comet = document.createElement("span");
			comet.className = "comet";

			const startX = Math.random() * 100;
			const startY = Math.random() * 100;
			const tx = (Math.random() * 220 + 110) * (Math.random() > 0.5 ? 1 : -1);
			const ty = (Math.random() * 180 + 60) * (Math.random() > 0.5 ? 1 : -1);
			const angle = Math.atan2(ty, tx) * 180 / Math.PI;
			const delay = (Math.random() * 0.35).toFixed(2) + "s";

			comet.style.left = startX + "%";
			comet.style.top = startY + "%";
			comet.style.setProperty("--tx", tx.toFixed(0) + "px");
			comet.style.setProperty("--ty", ty.toFixed(0) + "px");
			comet.style.setProperty("--angle", angle.toFixed(2) + "deg");
			comet.style.animationDelay = delay;
			burst.appendChild(comet);
		}

		container.appendChild(burst);
		return burst;
	}

	function buildTransitionFrontCard(sourceCard) {
		if (!sourceCard) return null;

		const frontCard = sourceCard.cloneNode(true);
		frontCard.classList.remove("card-selected-source", "card-faded");
		frontCard.style.visibility = "visible";
		frontCard.style.opacity = "1";
		frontCard.style.pointerEvents = "none";
		frontCard.style.transform = "none";
		frontCard.dataset.idle = "false";
		reset3DCard(frontCard);

		frontCard.querySelectorAll("img").forEach(function(img) {
			img.loading = "eager";
			img.decoding = "sync";
			img.fetchPriority = "high";
			img.style.opacity = "1";
			img.style.visibility = "visible";
		});

		const outline = frontCard.querySelector(".card-outline");
		if (outline) {
			outline.style.opacity = "1";
			outline.style.visibility = "visible";
		}

		const sideRail = frontCard.querySelector(".side-rail");
		if (sideRail) {
			sideRail.style.opacity = "1";
			sideRail.style.visibility = "visible";
		}

		return frontCard;
	}

	function getRectRelativeToViewport(element) {
		const rect = element.getBoundingClientRect();
		return {
			left: rect.left,
			top: rect.top,
			width: rect.width,
			height: rect.height
		};
	}

	function setCloneBox(clone, rect) {
		clone.style.left = rect.left + "px";
		clone.style.top = rect.top + "px";
		clone.style.width = rect.width + "px";
		clone.style.height = rect.height + "px";
	}

	function easeOutCubic(t) {
		return 1 - Math.pow(1 - t, 3);
	}

	function animateElementTo(clone, fromRect, toRect, duration) {
		return new Promise(function(resolve) {
			const total = duration || 1280;
			const start = performance.now();

			function frame(now) {
				const elapsed = now - start;
				const progress = Math.min(elapsed / total, 1);
				const eased = easeOutCubic(progress);
				const rect = lerpRect(fromRect, toRect, eased);
				const vanishStart = 0.42;
				const vanishProgress = progress <= vanishStart
					? 0
					: Math.min((progress - vanishStart) / (1 - vanishStart), 1);
				const opacity = 1 - vanishProgress;

				setCloneBox(clone, rect);

				const spinBoost = 1 + (1 - eased) * 0.022;
				clone.style.transform = "scale(" + spinBoost.toFixed(4) + ")";
				clone.style.opacity = opacity.toFixed(4);
				clone.style.filter = "drop-shadow(0 28px 70px rgba(0,0,0,.52)) blur(" + (vanishProgress * 6).toFixed(2) + "px)";

				if (progress < 1) {
					requestAnimationFrame(frame);
				} else {
					resolve();
				}
			}

			requestAnimationFrame(frame);
		});
	}

	function lerpRect(a, b, t) {
		return {
			left: a.left + (b.left - a.left) * t,
			top: a.top + (b.top - a.top) * t,
			width: a.width + (b.width - a.width) * t,
			height: a.height + (b.height - a.height) * t
		};
	}


	// ===== JavaScript: Sanitização / utilidades gerais =====
	function escapeHtml(value) {
		return String(value ?? "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

	function cleanValue(value) {
		if (value == null) return "";
		if (typeof value === "object") return "";
		const text = String(value).trim();
		return text === "[object Object]" ? "" : text;
	}

	function normalizePossibleUrl(value) {
		let raw = cleanValue(value);
		if (!raw) return "";

		raw = raw
			.replace(/^['"]+|['"]+$/g, "")
			.replace(/\\\//g, "/")
			.replace(/&amp;/g, "&")
			.trim();

		if (!raw) return "";

		if (/^https?:\/\/github\.com\/.+\/blob\/.+$/i.test(raw)) {
			raw = raw
				.replace("https://github.com/", "https://raw.githubusercontent.com/")
				.replace("/blob/", "/");
		}

		if (/^https?:\/\/www\.github\.com\/.+\/blob\/.+$/i.test(raw)) {
			raw = raw
				.replace("https://www.github.com/", "https://raw.githubusercontent.com/")
				.replace("/blob/", "/");
		}

		return raw;
	}

	function isValidUrl(value) {
		const raw = normalizePossibleUrl(value);
		if (!raw) return false;

		try {
			const url = new URL(raw);
			return url.protocol === "http:" || url.protocol === "https:";
		} catch {
			return false;
		}
	}

	function getMediaUrl(value) {
		const url = normalizePossibleUrl(value);
		return isValidUrl(url) ? url : "";
	}


	function mergeBadgeRecord(record) {
		if (!record || typeof record !== "object") return null;
		const website = record.website && typeof record.website === "object" ? record.website : {};
		return {
			...record,
			...website,
			website,
			label: cleanValue(record.label ?? website.label ?? record.name ?? website.name),
			description: cleanValue(record.description ?? website.description ?? website.bio ?? record.bio),
			color: cleanValue(website.color ?? record.color),
			color2: cleanValue(website.color2 ?? record.color2 ?? website.color ?? record.color),
			glow: cleanValue(website.glow ?? record.glow ?? website.color ?? record.color),
			icon: cleanValue(website.icon ?? record.icon),
			emblem: cleanValue(website.emblem ?? record.emblem ?? website.icon ?? record.icon),
			banner: cleanValue(website.banner ?? record.banner),
			title: cleanValue(website.title ?? record.title),
			gradient: cleanValue(website.gradient ?? record.gradient),
			particles: Boolean(website.particles ?? record.particles),
			shimmer: Boolean(website.shimmer ?? record.shimmer),
			aura: Boolean(website.aura ?? record.aura),
			intensity: Number.isFinite(Number(website.intensity ?? record.intensity)) ? Number(website.intensity ?? record.intensity) : 0
		};
	}

	function isBadgeEnabled(definition) {
		if (!definition || typeof definition !== "object") return false;
		return definition.enabled !== false;
	}

	function isBadgeVisible(definition, area = "profile", fallback = true) {
		if (!definition || typeof definition !== "object") return false;
		if (!isBadgeEnabled(definition)) return false;
		const visibility = definition.visibility && typeof definition.visibility === "object" ? definition.visibility : {};
		if (visibility.public === false) return false;
		if (Object.prototype.hasOwnProperty.call(visibility, area)) return visibility[area] !== false;
		return fallback;
	}

	function getBadgeSortValue(definition, fallback = 0) {
		const priority = Number(definition?.priority ?? definition?.hierarchy?.level ?? fallback);
		return Number.isFinite(priority) ? priority : fallback;
	}


	function getBadgesFallbacks() {
		const primary = extensionsData?.badges_fallbacks;
		const nested = extensionsData?.information_panel?.badges_fallbacks;
		if (primary && typeof primary === "object") return primary;
		if (nested && typeof nested === "object") return nested;
		return {};
	}

	function getNicknameFallbackColor() {
		const fallbacks = getBadgesFallbacks();
		const defaults = fallbacks?.defaults && typeof fallbacks.defaults === "object" ? fallbacks.defaults : {};
		const candidates = [
			defaults.nickname_color,
			defaults.nicknameColor,
			defaults.display_name_color,
			defaults.displayNameColor,
			defaults.name_color,
			fallbacks.nickname_color,
			fallbacks.nicknameColor
		];

		for (const value of candidates) {
			const clean = cleanValue(value);
			if (clean) return clean;
		}

		return "#FFFFFF";
	}

	function getFallbackEntry(kind) {
		const fallbacks = getBadgesFallbacks();
		const entry = fallbacks?.[kind];
		return entry && typeof entry === "object" ? entry : {};
	}

	function getFallbackDefaultId(kind, fallback = "") {
		const fallbacks = getBadgesFallbacks();
		const defaults = fallbacks?.defaults && typeof fallbacks.defaults === "object" ? fallbacks.defaults : {};
		const legacy = fallbacks?.profile?.website && typeof fallbacks.profile.website === "object" ? fallbacks.profile.website : {};
		const entry = getFallbackEntry(kind);
		const website = entry?.website && typeof entry.website === "object" ? entry.website : {};
		const candidates = [
			defaults[`${kind}_id`],
			defaults[kind],
			legacy[`${kind}_id`],
			legacy[kind],
			entry.fallback_id,
			entry.default_id,
			entry.id,
			website.fallback_id,
			website.default_id,
			website.id,
			fallback
		];
		for (const value of candidates) {
			const clean = cleanValue(value);
			if (clean) return clean;
		}
		return "";
	}

	function getFallbackBadgeRecord(kind) {
		const entry = getFallbackEntry(kind);
		if (!entry || !Object.keys(entry).length) return null;
		return entry;
	}

	function getProfileSectionOrder(name, fallback) {
		const value = getBadgesFallbacks()?.positions?.profile?.[name];
		const number = Number(value);
		return Number.isFinite(number) ? number : fallback;
	}

	function getAvatar(player) {
		const avatar = getMediaUrl(player?.theme?.card_embed?.avatar_bottom_image);
		if (avatar) return avatar;

		return DEFAULT_PLAYER_AVATAR;
	}

	function getCharacter(player) {
		return getMediaUrl(player?.theme?.card_embed?.character_image);
	}

	function hasBanner(player) {
		return !!getMediaUrl(player?.theme?.card_embed?.banner_bottom_image);
	}

	function getBanner(player) {
		const banner = getMediaUrl(player?.theme?.card_embed?.banner_bottom_image);
		if (banner) return banner;

		return DEFAULT_PLAYER_BANNER;
	}


	// ===== JavaScript: Ranks de level via extensionsData.badges_levelranks =====
	// Sem tabela local: os tiers oficiais precisam vir do EXTENSIONS_DATA_URL.
	let CARD_LEVEL_RANKS = [];


	function readExtensionFallback(kind, fallbackValue, key = "undefined") {
		const entry = getFallbackEntry(kind);
		const website = entry?.website || {};
		const defaults = getBadgesFallbacks()?.defaults || {};
		const value = website[key] || website.default || website.fallback || website.undefined || website.missing || defaults[kind];
		const url = getMediaUrl(value);
		return url || fallbackValue;
	}

	function makeSvgDataUri(label, bg1, bg2) {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect width="512" height="512" rx="64" fill="url(#g)"/><circle cx="256" cy="220" r="94" fill="rgba(255,255,255,.18)"/><path d="M116 430c28-86 98-132 140-132s112 46 140 132" fill="rgba(255,255,255,.16)"/><text x="256" y="286" text-anchor="middle" font-size="112" font-family="Arial" fill="white" font-weight="800">${label}</text></svg>`;
		return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
	}
	function applyExtensionFallbacks() {
		DEFAULT_PLAYER_AVATAR = readExtensionFallback("avatar", makeSvgDataUri("龍", "#2a1d55", "#0a6f8f"));
		DEFAULT_PLAYER_CHARACTER = readExtensionFallback("character", makeSvgDataUri("VL", "#25113f", "#14294f"));
		DEFAULT_PLAYER_BANNER = readExtensionFallback("banner", makeSvgDataUri("", "#120a25", "#062535"));
	}

	function normalizeCardLevelRank(rank, id) {
		if (!rank || typeof rank !== "object") return null;

		const website = rank.website && typeof rank.website === "object" ? rank.website : {};
		const min = Number(rank.min ?? website.min ?? rank.progression?.level_min);
		const rawMax = rank.max ?? website.max ?? rank.progression?.level_max;
		const max = rawMax == null || rawMax === "" ? null : Number(rawMax);

		if (!Number.isFinite(min)) return null;
		if (max !== null && !Number.isFinite(max)) return null;

		const label = cleanValue(rank.label || website.label || website.title_text || rank.name) || cleanValue(id).replace(/^levelranks_id_/, "") || "Tier";
		const order = Number(rank.order ?? website.order ?? min);
		const priority = Number(rank.priority ?? website.priority ?? order);

		return {
			id,
			min,
			max,
			label,
			description: cleanValue(rank.description || website.description) || `Level rank ${label}.`,
			category: cleanValue(rank.category || website.category || rank.stage) || "levelrank",
			order: Number.isFinite(order) ? order : min,
			priority: Number.isFinite(priority) ? priority : min,
			enabled: rank.enabled !== false,
			series: cleanValue(rank.series),
			stage: cleanValue(rank.stage),
			previous: cleanValue(rank.previous || rank.progression?.previous_id),
			next: cleanValue(rank.next || rank.progression?.next_id),
			progression: rank.progression && typeof rank.progression === "object" ? rank.progression : {},
			profile: rank.profile && typeof rank.profile === "object" ? rank.profile : {},
			visibility: rank.visibility && typeof rank.visibility === "object" ? rank.visibility : {},
			color: cleanValue(website.color || rank.color) || "#5865F2",
			color2: cleanValue(website.color2 || rank.color2 || website.color || rank.color) || "#7a8cff",
			glow: cleanValue(website.glow || rank.glow || website.color || rank.color) || "#5865F2",
			gradient: cleanValue(website.gradient || rank.gradient),
			shimmer: Boolean(website.shimmer ?? rank.shimmer),
			particles: Boolean(website.particles ?? rank.particles),
			aura: Boolean(website.aura ?? rank.aura),
			intensity: Number.isFinite(Number(website.intensity ?? rank.intensity)) ? Number(website.intensity ?? rank.intensity) : 0,
			icon: cleanValue(website.icon || rank.icon),
			title: cleanValue(website.title || rank.title),
			banner: cleanValue(website.banner || rank.banner || website.gradient),
			checkerOpacity: Number.isFinite(Number(website.checkerOpacity ?? rank.checkerOpacity))
				? Number(website.checkerOpacity ?? rank.checkerOpacity)
				: 0.12
		};
	}

	function getFirebaseCardLevelRanks() {
		const source = extensionsData?.badges_levelranks;
		if (!source || typeof source !== "object") return null;

		const ranks = Object.entries(source)
			.map(function(entry) {
				return normalizeCardLevelRank(entry[1], entry[0]);
			})
			.filter(Boolean)
			.sort(function(a, b) {
				return (a.order ?? a.min) - (b.order ?? b.min);
			});

		return ranks.length ? ranks : null;
	}

	function applyExtensionLevelRanks() {
		CARD_LEVEL_RANKS = getFirebaseCardLevelRanks() || [];
	}

	function applyExtensionDataConfig() {
		applyExtensionFallbacks();
		applyExtensionLevelRanks();
	}

	function getPlayerLevelNumber(player) {
		const raw = player?.stats?.progression?.level;

		if (Array.isArray(raw)) {
			for (const value of raw) {
				if (typeof value === "number" && Number.isFinite(value)) {
					return Math.max(0, Math.floor(value));
				}

				if (typeof value === "string") {
					const match = value.match(/-?\d+(?:\.\d+)?/);
					if (match) {
						const parsed = Number(match[0]);
						if (Number.isFinite(parsed)) {
							return Math.max(0, Math.floor(parsed));
						}
					}
				}
			}
			return 0;
		}

		if (typeof raw === "number" && Number.isFinite(raw)) {
			return Math.max(0, Math.floor(raw));
		}

		if (typeof raw === "string") {
			const match = raw.match(/-?\d+(?:\.\d+)?/);
			if (match) {
				const parsed = Number(match[0]);
				if (Number.isFinite(parsed)) {
					return Math.max(0, Math.floor(parsed));
				}
			}
		}

		return 0;
	}

	function getCardRankData(player) {
		const level = getPlayerLevelNumber(player);
		const ranks = Array.isArray(CARD_LEVEL_RANKS) ? CARD_LEVEL_RANKS : [];

		return ranks.find(function(rank) {
			if (!rank || typeof rank !== "object") return false;
			const minMatch = typeof rank.min === "number" ? level >= rank.min : true;
			const maxMatch = typeof rank.max === "number" ? level <= rank.max : true;
			return minMatch && maxMatch;
		}) || {
			id: "levelranks_missing",
			min: 0,
			max: null,
			color: "#5865F2",
			color2: "#7a8cff",
			glow: "#5865F2",
			shimmer: false,
			particles: false,
			label: "Tier",
			icon: "",
			title: "",
			banner: "",
			checkerOpacity: 0.12,
			description: "Tier não encontrado.",
			category: "missing",
			order: 0,
			priority: 0,
			previous: "",
			next: "",
			progression: {},
			profile: {},
			visibility: {}
		};
	}

	function getRankImage(player) {
		const rankData = getCardRankData(player);
		const url = normalizePossibleUrl(rankData?.icon);
		return isValidUrl(url) ? url : "";
	}

	function getRankTitleImage(player) {
		const rankData = getCardRankData(player);
		const url = normalizePossibleUrl(rankData?.title);
		return isValidUrl(url) ? url : "";
	}

	function buildRankTitleMarkHtml(player, className = "") {
		const rankData = getCardRankData(player);
		const titleImage = getRankTitleImage(player);
		const label = rankData?.label || "Tier";
		const classes = ["rank-title-mark", className].filter(Boolean).join(" ");

		return `
			<div
				class="${classes}"
				style="
					--rank-color: ${rankData.color};
					--rank-color-2: ${rankData.color2 || rankData.color};
					--rank-glow: ${rankData.glow || rankData.color};
				"
				aria-hidden="true"
			>
				${titleImage ? `<img src="${escapeHtml(titleImage)}" alt="${escapeHtml(label)}" loading="lazy" onerror="this.remove(); const fallback=this.nextElementSibling; if(fallback) fallback.hidden=false;">` : ""}
				<span class="rank-title-fallback" ${titleImage ? "hidden" : ""}>${escapeHtml(label)}</span>
			</div>
		`;
	}

	function normalizeHexColor(hex, fallback = "#5865F2") {
		if (!hex) return fallback;
		let value = String(hex).trim();

		if (!value.startsWith("#")) value = "#" + value;

		if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;

		if (/^#[0-9a-fA-F]{3}$/.test(value)) {
			const short = value.slice(1).split("").map(function(c) {
				return c + c;
			}).join("");
			return "#" + short;
		}

		return fallback;
	}

	function hexToRgba(hex, alpha = 1) {
		const safe = normalizeHexColor(hex);
		const raw = safe.replace("#", "");
		const n = parseInt(raw, 16);
		const r = (n >> 16) & 255;
		const g = (n >> 8) & 255;
		const b = n & 255;
		return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
	}

	function countryCodeToFlag(code) {
		if (!code) return "";
		const clean = String(code).trim().toUpperCase();
		if (!/^[A-Z]{2}$/.test(clean)) return "";

		const A = 0x1F1E6;
		return String.fromCodePoint(
			A + clean.charCodeAt(0) - 65,
			A + clean.charCodeAt(1) - 65
		);
	}

	function buildCountryFlagHtml(code) {
		if (!code) return "";

		const clean = String(code).trim().toUpperCase();
		if (!/^[A-Z]{2}$/.test(clean)) return "";

		const emoji = countryCodeToFlag(clean);
		const lower = clean.toLowerCase();

		return `
			<span class="country-flag" title="${clean}">
				<span class="country-flag-emoji">${emoji}</span>
				<img
					class="country-flag-img"
					src="https://flagcdn.com/16x12/${lower}.png"
					alt="${clean}"
					loading="lazy"
					onerror="this.style.display='none'"
					onload="const emojiEl=this.previousElementSibling;if(emojiEl) emojiEl.style.display='none';"
				>
			</span>
		`;
	}

	function normalize(data) {
		if (!data || typeof data !== "object") return [];
		if (Array.isArray(data)) {
			return data.filter(Boolean).map(function(item, index) {
				const safe = typeof item === "object" ? item : { value: item };
				return { _id: safe._id || safe.id || safe.key || ("ID_" + index), ...safe };
			});
		}
		return Object.entries(data).filter(function(entry) {
			return entry[1] && typeof entry[1] === "object";
		}).map(function(entry) {
			return {
				_id: entry[0],
				...entry[1]
			};
		});
	}


	// ===== JavaScript: Cores e gradientes estilo Minecraft =====
	const mcColors = {
		"0": "#000000",
		"1": "#0000AA",
		"2": "#00AA00",
		"3": "#00AAAA",
		"4": "#AA0000",
		"5": "#AA00AA",
		"6": "#FFAA00",
		"7": "#AAAAAA",
		"8": "#555555",
		"9": "#5555FF",
		"a": "#55FF55",
		"b": "#55FFFF",
		"c": "#FF5555",
		"d": "#FF55FF",
		"e": "#FFFF55",
		"f": "#FFFFFF",
		"g": "#DDD605",
		"h": "#E3E3E3",
		"i": "#CECACA",
		"j": "#443A3B",
		"m": "#971607",
		"n": "#B4684D",
		"p": "#DEB12D",
		"q": "#47A036",
		"s": "#2CBAA8",
		"t": "#21497B",
		"u": "#9A5CC6",
		"v": "#EB7114"
	};

	const GradientsColor = {
		blue_color1: ["§1","§9","§t","§3","§s","§b","§3","§9","§1"],
		ocean_color1: ["§1","§3","§b","§s","§b","§3","§1"],
		sky_color1: ["§9","§b","§f","§b","§9"],
		yellow_color1: ["§6","§p","§g","§e","§g","§p","§6"],
		gold_color1: ["§6","§g","§p","§h","§p","§g","§6"],
		sun_color1: ["§f","§e","§g","§p","§6","§v","§n"],
		black_color1: ["§0","§8","§7","§f","§7","§8","§0"],
		shadow_color1: ["§0","§j","§8","§7","§8","§j","§0"],
		gray_color1: ["§8","§7","§f","§7","§8"],
		red_color1: ["§4","§m","§c","§m","§4"],
		fire_color1: ["§4","§c","§6","§e","§6","§c","§4"],
		green_color1: ["§2","§a","§q","§a","§2"],
		nature_color1: ["§2","§a","§f","§a","§2"],
		purple_color1: ["§5","§d","§u","§d","§5"],
		mystic_color1: ["§5","§u","§f","§u","§5"],
		white_color1: ["§f","§h","§i","§h","§f"],
		metal_color1: ["§8","§i","§h","§f","§h","§i","§8"],
		rainbow_color1: ["§4","§6","§e","§a","§b","§9","§5"],
		soft_rainbow_color1: ["§c","§6","§e","§a","§b","§d"],
		kazin_color1: ["§s","§3","§t","§5","§d","§u","§n","§v","§p","§6","§g","§e","§b"]
	};

	function minecraftToHtml(text) {
		if (text == null) return "";

		const input = String(text);
		let result = "";
		let currentColor = null;
		let bold = false;
		let italic = false;
		let underlined = false;
		let strikethrough = false;
		let random = false;

		function buildStyle() {
			let style = "";
			if (currentColor) style += "color:" + currentColor + ";";
			return style;
		}

		function buildClass() {
			const classes = ["mc"];
			if (bold) classes.push("mc-bold");
			if (italic) classes.push("mc-italic");
			if (underlined) classes.push("mc-underlined");
			if (strikethrough) classes.push("mc-strikethrough");
			return classes.join(" ");
		}

		function obfuscateChar() {
			const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
			return pool[Math.floor(Math.random() * pool.length)];
		}

		for (let i = 0; i < input.length; i += 1) {
			const char = input[i];
			const next = input[i + 1];

			if (char === "§" && next) {
				const code = next.toLowerCase();

				if (mcColors[code]) {
					currentColor = mcColors[code];
					bold = false;
					italic = false;
					underlined = false;
					strikethrough = false;
					random = false;
					i += 1;
					continue;
				}

				if (code === "l") {
					bold = true;
					i += 1;
					continue;
				}

				if (code === "o") {
					italic = true;
					i += 1;
					continue;
				}

				if (code === "n") {
					underlined = true;
					i += 1;
					continue;
				}

				if (code === "m" && !mcColors["m"]) {
					strikethrough = true;
					i += 1;
					continue;
				}

				if (code === "k") {
					random = true;
					i += 1;
					continue;
				}

				if (code === "r") {
					currentColor = null;
					bold = false;
					italic = false;
					underlined = false;
					strikethrough = false;
					random = false;
					i += 1;
					continue;
				}
			}

			const safeChar = escapeHtml(random ? obfuscateChar() : char);
			result += "<span class=\"" + buildClass() + "\" style=\"" + buildStyle() + "\">" + safeChar + "</span>";
		}

		return result;
	}

	function stripMinecraftCodes(text) {
		return String(text ?? "").replace(/§./g, "");
	}

	function gradientCodesToCss(name, reverse) {
		const gradient = GradientsColor[name];
		if (!gradient || !gradient.length) return null;

		let colors = gradient.map(function(code) {
			const key = String(code).replace("§", "").toLowerCase();
			return mcColors[key] || null;
		}).filter(Boolean);

		if (!colors.length) return null;
		if (reverse) colors = colors.slice().reverse();

		return "linear-gradient(90deg, " + colors.join(", ") + ")";
	}


	function normalizeServerPanelData(data) {
		if (!data || typeof data !== "object") return {};
		if (data.server_panel && typeof data.server_panel === "object") return data.server_panel;
		return data;
	}

	function attachServerPanelData(extensions, serverPanelJson) {
		const base = extensions && typeof extensions === "object" ? extensions : {};
		const currentPanel = base.server_panel && typeof base.server_panel === "object" ? base.server_panel : {};
		const nextPanel = normalizeServerPanelData(serverPanelJson);
		base.server_panel = Object.assign({}, currentPanel, nextPanel);
		return base;
	}

	function normalizeNicknameColorItems(source) {
		if (!source || typeof source !== "object") return {};
		const direct = source.items && typeof source.items === "object" ? source.items : source;
		return direct && typeof direct === "object" ? direct : {};
	}

	function buildNicknameColorLookupKeys(colorName) {
		const raw = cleanValue(colorName).toLowerCase();
		if (!raw) return [];
		const keys = [];
		function add(value) {
			const key = cleanValue(value).toLowerCase().replace(/[\s-]+/g, "_");
			if (key && keys.indexOf(key) === -1) keys.push(key);
		}
		add(raw);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			if (/_reverse_color1$/.test(key) && key.indexOf("_gradient_reverse_color1") === -1) add(key.replace(/_reverse_color1$/, "_gradient_reverse_color1"));
			if (/_gradient_reverse_color1$/.test(key)) add(key.replace(/_gradient_reverse_color1$/, "_reverse_color1"));
			if (/_color1$/.test(key) && key.indexOf("_gradient_color1") === -1 && key.indexOf("_reverse_color1") === -1) add(key.replace(/_color1$/, "_gradient_color1"));
			if (/_gradient_color1$/.test(key)) add(key.replace(/_gradient_color1$/, "_color1"));
			if (key === "rainbow_soft_color1") add("soft_rainbow_color1");
			if (key === "soft_rainbow_color1") add("rainbow_soft_color1");
			if (key === "ametista") add("amethyst");
			if (key === "amethyst") add("ametista");
		}
		return keys;
	}

	function getServerPanelNicknameColorRecord(colorName) {
		const keys = buildNicknameColorLookupKeys(colorName);
		if (!keys.length) return null;

		const serverPanel = extensionsData?.server_panel && typeof extensionsData.server_panel === "object" ? extensionsData.server_panel : {};
		const nicknameColors = serverPanel.nickname_colors || serverPanel.nicknameColors || extensionsData?.nickname_colors || extensionsData?.nicknameColors || serverPanel.items || serverPanel;
		const items = normalizeNicknameColorItems(nicknameColors);
		if (!items || !Object.keys(items).length) return null;

		for (const key of keys) {
			if (items[key]) return items[key];
		}
		return null;
	}

	function colorArrayToGradient(colors) {
		if (!Array.isArray(colors)) return "";
		const resolved = colors.map(function(item) {
			const raw = cleanValue(item);
			if (!raw) return "";
			if (raw.charAt(0) === "§") {
				const key = raw.replace("§", "").toLowerCase();
				return mcColors[key] || "";
			}
			return raw;
		}).filter(Boolean);

		if (!resolved.length) return "";
		return "linear-gradient(90deg, " + resolved.join(", ") + ")";
	}

	function getServerPanelNicknameColorConfig(colorName) {
		const record = getServerPanelNicknameColorRecord(colorName);
		if (!record || typeof record !== "object") return null;
		if (record.enabled === false || record.visible === false) return null;

		const type = cleanValue(record.type).toLowerCase();
		const cssValue = cleanValue(record.css_value || record.css || record.value || record.gradient || record.color);

		if (type === "gradient" || /^linear-gradient/i.test(cssValue)) {
			const gradientValue = cssValue || colorArrayToGradient(record.colors || record.gradient_colors || record.minecraft_codes);
			return gradientValue ? { type: "gradient", gradient: gradientValue } : null;
		}

		if (type === "solid" || cssValue) {
			const solidValue = cssValue || mcColors[cleanValue(record.minecraft_key).toLowerCase()] || "";
			return solidValue ? { type: "solid", color: solidValue } : null;
		}

		if (Array.isArray(record.colors) || Array.isArray(record.minecraft_codes)) {
			const gradientValue = colorArrayToGradient(record.colors || record.minecraft_codes);
			return gradientValue ? { type: "gradient", gradient: gradientValue } : null;
		}

		const minecraftKey = cleanValue(record.minecraft_key).toLowerCase();
		if (minecraftKey && mcColors[minecraftKey]) {
			return { type: "solid", color: mcColors[minecraftKey] };
		}

		return null;
	}


	function getColorNameConfig(colorName) {
		const name = cleanValue(colorName).toLowerCase();
		const serverPanelColor = name ? getServerPanelNicknameColorConfig(name) : null;

		if (serverPanelColor) return serverPanelColor;

		return {
			type: "solid",
			color: getNicknameFallbackColor(),
			isFallback: true
		};
	}


	// ===== JavaScript: Leitura dos dados do jogador =====
	function getDisplayName(player) {
		const nickname = cleanValue(player?.profile?.display_nickname);
		const username = cleanValue(player?.profile?.display_username);
		return nickname || username || "Criando...";
	}

	function getDisplayNameColor(player) {
		const raw = player?.theme?.color_name_id || "";
		const clean = cleanValue(raw).toLowerCase();
		const colorConfig = getColorNameConfig(clean);

		if (colorConfig && colorConfig.type === "gradient" && colorConfig.gradient) {
			return {
				type: "gradient",
				value: colorConfig.gradient
			};
		}

		return {
			type: "solid",
			value: colorConfig?.color || getNicknameFallbackColor()
		};
	}

	function getUsername(player) {
		return cleanValue(player?.profile?.display_username) || stripMinecraftCodes(getDisplayName(player)) || "?";
	}

	function getCardTitle(player) {
		return cleanValue(player?.profile?.title) || "-";
	}

	function getLevelText(player) {
		return cleanValue(player?.stats?.progression?.level) ||
			cleanValue(player?.card?.level) ||
			"-";
	}

	function normalizeBadgeEntries(raw) {
		if (Array.isArray(raw)) {
			return raw.map(function(entry) {
				if (typeof entry === "string" || typeof entry === "number") return { id: String(entry).trim() };
				return entry && typeof entry === "object" && entry.id ? entry : null;
			}).filter(Boolean);
		}
		if (typeof raw === "string" || typeof raw === "number") return [{ id: String(raw).trim() }];
		if (raw && typeof raw === "object" && raw.id) return [raw];
		return [];
	}

	function getPlayerRankBadgeEntries(player) {
		const entries = normalizeBadgeEntries(player?.badges?.rank ?? player?.badges?.ranks ?? player?.rank?.badge_id);
		if (entries.length) return entries;
		const fallbackId = getFallbackDefaultId("rank", "rank_id_member");
		return fallbackId ? [{ id: fallbackId, fallback: true }] : [];
	}

	function getRankBadgeDefinition(rankId) {
		const raw = extensionsData?.badges_ranks?.[rankId] || extensionsData?.badges_rank?.[rankId] || null;
		const merged = mergeBadgeRecord(raw || getFallbackBadgeRecord("rank"));
		return merged && isBadgeVisible(merged, "profile", true) ? merged : null;
	}

	function getPlayerRoleBadgeEntries(player) {
		const entries = normalizeBadgeEntries(player?.badges?.role ?? player?.badges?.roles ?? player?.role?.badge_id);
		if (entries.length) return entries;
		const fallbackId = getFallbackDefaultId("role", "role_id_member");
		return fallbackId ? [{ id: fallbackId, fallback: true }] : [];
	}

	function getRoleBadgeDefinition(roleId) {
		const raw = extensionsData?.badges_roles?.[roleId] || extensionsData?.badges_role?.[roleId] || null;
		const merged = mergeBadgeRecord(raw || getFallbackBadgeRecord("role"));
		return merged && isBadgeVisible(merged, "profile", true) ? merged : null;
	}

	function getPrimaryRoleLabel(player, fallback) {
		const roleEntry = getPlayerRoleBadgeEntries(player)[0] || null;
		const roleData = roleEntry ? getRoleBadgeDefinition(roleEntry.id) : null;
		const fromData = cleanValue(roleData?.label || roleData?.name || roleData?.title);
		const fromEntry = cleanValue(roleEntry?.label || roleEntry?.name || roleEntry?.title);
		const fromPlayer = cleanValue(player?.rank?.name || player?.rank?.role || player?.clan?.rank);
		return stripMinecraftCodes(fromData || fromEntry || fromPlayer || fallback || "Membro");
	}

	function isPlayerOnline(player) {
		return player?.status?.online === true;
	}

	function getPlayerAchievementBadgeEntries(player) {
		const entries = normalizeBadgeEntries(player?.badges?.achievements ?? player?.achievements);
		if (entries.length) return entries;
		const fallbackId = getFallbackDefaultId("achievement", "achievements_id_none");
		return fallbackId ? [{ id: fallbackId, fallback: true }] : [];
	}

	function getAchievementBadgeDefinition(achievementId) {
		const raw = extensionsData?.badges_achievements?.[achievementId] || null;
		const merged = mergeBadgeRecord(raw || getFallbackBadgeRecord("achievement"));
		return merged && isBadgeVisible(merged, "profile", true) ? merged : null;
	}

	function isProbablyPixelArt(url) {
		const value = String(url || "").toLowerCase();
		return /minecraft|skin|pixel|bedrock|avatar|character/.test(value);
	}

	function getTitleSizeClass(player) {
		const name = stripMinecraftCodes(getDisplayName(player)).replace(/\s+/g, " ").trim();
		const len = name.length;

		if (len <= 10) return "size-lg";
		if (len <= 16) return "size-md";
		if (len <= 24) return "size-sm";
		return "size-xs";
	}


	// ===== JavaScript: Builders de HTML reutilizáveis =====
	function buildTitleHtml(player) {
		const rawName = getDisplayName(player);
		const colorName = cleanValue(player?.theme?.color_name_id);
		const colorConfig = getColorNameConfig(colorName);

		if (colorConfig && colorConfig.type === "gradient" && colorConfig.gradient) {
			return "<span class=\"title-text title-gradient\" style=\"--title-gradient: " + colorConfig.gradient + ";\">" + escapeHtml(stripMinecraftCodes(rawName)) + "</span>";
		}

		if (colorConfig && colorConfig.type === "solid" && colorConfig.color) {
			return "<span class=\"title-text title-solid\" style=\"--title-solid-color: " + colorConfig.color + ";\">" + escapeHtml(stripMinecraftCodes(rawName)) + "</span>";
		}

		return "<span class=\"title-text\">" + minecraftToHtml(rawName) + "</span>";
	}

	function buildLevelChipHtml(player) {
		const rankData = getCardRankData(player);
		const levelImage = getRankImage(player);

		const extraClasses = [
			"card-chip",
			"card-rank-chip",
			rankData.shimmer ? "is-shimmer" : "",
			rankData.particles ? "is-particles" : ""
		].filter(Boolean).join(" ");

		return `
			<div
				class="${extraClasses}"
				style="
					--rank-color: ${rankData.color};
					--rank-color-2: ${rankData.color2 || rankData.color};
					--rank-glow: ${rankData.glow || rankData.color};
					--rank-banner: ${rankData.banner || "linear-gradient(135deg, color-mix(in srgb, " + (rankData.color || "#5865F2") + " 26%, rgba(255,255,255,.08)), rgba(8,12,24,.82))"};
					--rank-checker-opacity: ${typeof rankData.checkerOpacity === "number" ? rankData.checkerOpacity : 0.12};
				"
			>
				${levelImage ? `<img class="card-chip-icon" src="${escapeHtml(levelImage)}" alt="${escapeHtml(rankData.label)}" loading="lazy" onerror="this.remove()">` : ""}
				<span class="card-chip-text">${escapeHtml(rankData.label)}</span>
				<span class="card-chip-shine"></span>
				<span class="card-chip-particles"></span>
			</div>
		`;
	}
	
	function buildLevelInfoEmblemHtml(player) {
		const rankData = getCardRankData(player);
		const emblemImage = getRankImage(player);
		const levelText = getLevelText(player);
		const levelNumber = getPlayerLevelNumber(player);
		const hasMax = typeof rankData.max === "number";
		const rangeText = !hasMax
			? rankData.min + "+"
			: rankData.min === rankData.max
				? String(rankData.min)
				: rankData.min + "/" + rankData.max;

		const finalMax = (Array.isArray(CARD_LEVEL_RANKS) ? CARD_LEVEL_RANKS : [])
			.reduce(function(max, rank) {
				return typeof rank?.max === "number" ? Math.max(max, rank.max) : max;
			}, hasMax ? rankData.max : Math.max(levelNumber, 1));

		const tierProgressPercent = !hasMax || rankData.max <= 0
			? 100
			: (levelNumber / rankData.max) * 100;

		const safeProgress = Math.max(0, Math.min(100, tierProgressPercent));
		const generalPercent = finalMax <= 0 ? 100 : Math.max(0, Math.min(100, (levelNumber / finalMax) * 100));

		function getGeneralTier(percent) {
			if (percent >= 90) return "EX";
			if (percent >= 82) return "SSS";
			if (percent >= 74) return "SS";
			if (percent >= 66) return "S";
			if (percent >= 55) return "A";
			if (percent >= 44) return "B";
			if (percent >= 33) return "C";
			if (percent >= 22) return "D";
			if (percent >= 11) return "E";
			return "F";
		}

		const generalTier = getGeneralTier(generalPercent);
		const shownGeneralPercent = Math.round(generalPercent);
		const tierSubtitle = cleanValue(rankData.profile?.subtitle || rankData.profile?.lore || rankData.description);
		const tierMaterial = cleanValue(rankData.profile?.material || rankData.stage || rankData.category);
		const nextId = cleanValue(rankData.next || rankData.progression?.next_id);
		const nextRank = nextId ? (CARD_LEVEL_RANKS || []).find(function(rank) { return rank.id === nextId; }) : null;
		const nextText = nextRank?.label || (hasMax ? "Próximo tier" : "Tier máximo");

		return `
			<div
				class="level-info-wrap level-info-wrap-modern"
				style="
					--rank-color: ${rankData.color};
					--rank-color-2: ${rankData.color2 || rankData.color};
					--rank-glow: ${rankData.glow || rankData.color};
					--rank-banner: ${rankData.banner || "linear-gradient(135deg, color-mix(in srgb, " + (rankData.color || "#5865F2") + " 18%, rgba(255,255,255,.04)), rgba(8,12,24,.92))"};
					--rank-checker-opacity: ${typeof rankData.checkerOpacity === "number" ? rankData.checkerOpacity : 0.10};
					--tier-progress: ${Math.round(safeProgress)}%;
				"
			>
				<div
					class="level-info-emblem level-info-tier-card"
					tabindex="0"
					aria-label="Tier ${escapeHtml(rankData.label)}, nível ${escapeHtml(levelText)}, progresso ${Math.round(safeProgress)}%"
				>
					<div class="level-info-lv-box">
						<div class="level-info-lv-main">
							${emblemImage ? `<img class="level-info-emblem-icon" src="${escapeHtml(emblemImage)}" alt="${escapeHtml(rankData.label)}" loading="lazy" onerror="this.remove()">` : ""}
							<span class="level-info-emblem-value"><span class="level-info-tooltip-subtitle">Lv.</span> ${escapeHtml(levelText)}</span>
						</div>
					</div>

					<div class="level-info-main-text">
						<div class="level-info-tier-name"><span>Tier:</span> ${escapeHtml(rankData.label)}</div>
						<div class="level-info-tier-line">
							<span class="level-info-mini-progress" style="--mini-tier-progress:${Math.round(safeProgress)}%;" aria-hidden="true"><span style="width:${Math.round(safeProgress)}%;"></span></span>
							<span class="level-info-tier-percent">${Math.round(safeProgress)}%</span>
						</div>
					</div>

					${buildRankTitleMarkHtml(player, "detail-tier-title level-info-tier-image")}
				</div>

				<div class="level-info-progress-row level-info-progress-general" style="--tier-progress: ${shownGeneralPercent}%">
					<span class="level-info-progress-label">Tier ${escapeHtml(generalTier)}</span>
					<span class="level-info-progress-track" aria-hidden="true"><span style="width:${shownGeneralPercent}%"></span></span>
					<span class="level-info-progress-value">${shownGeneralPercent}%</span>
				</div>
				<div class="level-info-meta">
					${tierSubtitle ? `<span>${escapeHtml(tierSubtitle)}</span>` : ""}
					<span>Próximo: ${escapeHtml(nextText)}</span>
					${tierMaterial ? `<span>${escapeHtml(tierMaterial)}</span>` : ""}
				</div>
			</div>
		`;
	}

	function buildRoleInfoEmblemHtml(player) {
		function fallbackText(...values) {
			for (const value of values) {
				if (value === undefined || value === null) continue;
				const text = String(value).trim();
				if (text !== "") return text;
			}
			return "-";
		}

		function safeDate(value) {
			if (!value) return "-";

			const date = new Date(value);
			if (Number.isNaN(date.getTime())) return "-";

			return date.toLocaleString("pt-BR");
		}

		function stripRoleId(value) {
			return fallbackText(
				String(value || "").replace(/^role_id_/i, ""),
				value,
				"-"
			);
		}

		const roleEntries = getPlayerRoleBadgeEntries(player);
		const roleEntry = roleEntries[0] || null;
		const roleData = roleEntry ? getRoleBadgeDefinition(roleEntry.id) : null;

		const labelRole = fallbackText(
			roleData?.label,
			stripRoleId(roleEntry?.id),
			roleEntry?.id,
			"-"
		);

		const emblemImageRole = normalizePossibleUrl(roleData?.icon || "");
		const unlockedAtRole = safeDate(roleEntry?.unlocked_at);

		const roleColor = fallbackText(roleData?.color, "#4f7cff");
		const roleColor2 = fallbackText(roleData?.color2, roleData?.color, "#4f7cff");
		const roleGlow = fallbackText(roleData?.glow, roleData?.color, "#4f7cff");
		const roleDescription = fallbackText(roleData?.description, roleData?.category, "Cargo do perfil.");
		const roleGroup = fallbackText(roleData?.hierarchy?.group, roleData?.category, "role");

		return `
			<div
				class="level-info-wrap"
				style="
					--rank-color: ${escapeHtml(roleColor)};
					--rank-color-2: ${escapeHtml(roleColor2)};
					--rank-glow: ${escapeHtml(roleGlow)};
				"
			>
				<div
					class="level-info-emblem"
					tabindex="0"
					aria-label="Role ${escapeHtml(labelRole)}"
				>
					${emblemImageRole ? `<img class="level-info-emblem-icon" src="${escapeHtml(emblemImageRole)}" alt="${escapeHtml(labelRole)}" loading="lazy" onerror="this.remove()">` : ""}

					<span class="level-info-emblem-value">
						${escapeHtml(labelRole)}
					</span>
				</div>

				<div class="level-info-tooltip" role="tooltip">
					<div class="level-info-tooltip-head">
						${emblemImageRole ? `
							<div class="level-info-tooltip-badge">
								<img src="${escapeHtml(emblemImageRole)}" alt="${escapeHtml(labelRole)}" loading="lazy" onerror="this.remove()">
							</div>
						` : ""}

						<div class="level-info-tooltip-texts">
							<div class="level-info-tooltip-title">
								<span class="level-info-tooltip-subtitle">Role:</span>
								${escapeHtml(labelRole)}
							</div>
							<div class="level-info-tooltip-subtitle">
								${roleData ? "Cargo principal" : "Role não encontrado no WebBaseExtensions"}
							</div>
						</div>
					</div>

					<div class="level-info-tooltip-row">
						<span class="level-info-tooltip-row-label">Grupo</span>
						<span class="level-info-tooltip-row-value">${escapeHtml(roleGroup)}</span>
					</div>

					<div class="level-info-tooltip-row">
						<span class="level-info-tooltip-row-label">Descrição</span>
						<span class="level-info-tooltip-row-value">${escapeHtml(roleDescription)}</span>
					</div>

					<div class="level-info-tooltip-row">
						<span class="level-info-tooltip-row-label">ID</span>
						<span class="level-info-tooltip-row-value">${escapeHtml(fallbackText(roleEntry?.id, "-"))}</span>
					</div>

					<div class="level-info-tooltip-row">
						<span class="level-info-tooltip-row-label">Data:</span>
						<span class="level-info-tooltip-row-value">${escapeHtml(unlockedAtRole)}</span>
					</div>
				</div>
			</div>
		`;
	}

	function buildRankInfoEmblemHtml(player) {
		function fallbackText(...values) {
			for (const value of values) {
				if (value === undefined || value === null) continue;
				const text = String(value).trim();
				if (text !== "") return text;
			}
			return "-";
		}

		function safeDate(value) {
			if (!value) return "-";

			const date = new Date(value);
			if (Number.isNaN(date.getTime())) return "-";

			return date.toLocaleString("pt-BR");
		}

		function stripRankId(value) {
			return fallbackText(
				String(value || "").replace(/^rank_id_/i, ""),
				value,
				"-"
			);
		}

		const rankEntries = getPlayerRankBadgeEntries(player);
		const rankEntry = rankEntries[0] || null;
		const rankData = rankEntry ? getRankBadgeDefinition(rankEntry.id) : null;

		const labelRank = fallbackText(
			rankData?.label,
			stripRankId(rankEntry?.id),
			rankEntry?.id,
			"-"
		);

		const emblemImageRank = normalizePossibleUrl(rankData?.icon || "");
		const unlockedAtRank = safeDate(rankEntry?.unlocked_at);

		const rankColor = fallbackText(rankData?.color, "#5865F2");
		const rankColor2 = fallbackText(rankData?.color2, rankData?.color, "#5865F2");
		const rankGlow = fallbackText(rankData?.glow, rankData?.color, "#5865F2");
		const rankDescription = fallbackText(rankData?.description, rankData?.category, "Rank do perfil.");
		const rankGroup = fallbackText(rankData?.hierarchy?.group, rankData?.category, "rank");

		return `
			<div
				class="level-info-wrap"
				style="
					--rank-color: ${escapeHtml(rankColor)};
					--rank-color-2: ${escapeHtml(rankColor2)};
					--rank-glow: ${escapeHtml(rankGlow)};
				"
			>
				<div
					class="level-info-emblem"
					tabindex="0"
					aria-label="Rank ${escapeHtml(labelRank)}"
				>
					${emblemImageRank ? `<img class="level-info-emblem-icon" src="${escapeHtml(emblemImageRank)}" alt="${escapeHtml(labelRank)}" loading="lazy" onerror="this.remove()">` : ""}

					<span class="level-info-emblem-value">
						${escapeHtml(labelRank)}
					</span>

					${rankData?.shimmer ? `<span class="level-info-emblem-shine"></span>` : ""}
					${rankData?.particles ? `<span class="level-info-emblem-particles"></span>` : ""}
				</div>

				<div class="level-info-tooltip" role="tooltip">
					<div class="level-info-tooltip-head">
						${emblemImageRank ? `
							<div class="level-info-tooltip-badge">
								<img src="${escapeHtml(emblemImageRank)}" alt="${escapeHtml(labelRank)}" loading="lazy" onerror="this.remove()">
							</div>
						` : ""}

						<div class="level-info-tooltip-texts">
							<div class="level-info-tooltip-title">
								<span class="level-info-tooltip-subtitle">Rank:</span>
								${escapeHtml(labelRank)}
							</div>
							<div class="level-info-tooltip-subtitle">
								${rankData ? "Cargo secundário" : "Rank não encontrado no WebBaseExtensions"}
							</div>
						</div>
					</div>

					<div class="level-info-tooltip-row">
						<span class="level-info-tooltip-row-label">Grupo</span>
						<span class="level-info-tooltip-row-value">${escapeHtml(rankGroup)}</span>
					</div>

					<div class="level-info-tooltip-row">
						<span class="level-info-tooltip-row-label">Descrição</span>
						<span class="level-info-tooltip-row-value">${escapeHtml(rankDescription)}</span>
					</div>

					<div class="level-info-tooltip-row">
						<span class="level-info-tooltip-row-label">ID</span>
						<span class="level-info-tooltip-row-value">${escapeHtml(fallbackText(rankEntry?.id, "-"))}</span>
					</div>

					<div class="level-info-tooltip-row">
						<span class="level-info-tooltip-row-label">Data:</span>
						<span class="level-info-tooltip-row-value">${escapeHtml(unlockedAtRank)}</span>
					</div>
				</div>
			</div>
		`;
	}

	function buildAchievementsGalleryHtml(player) {
		function fallbackText(...values) {
			for (const value of values) {
				if (value === undefined || value === null) continue;
				const text = String(value).trim();
				if (text !== "") return text;
			}
			return "-";
		}

		function safeDate(value) {
			if (!value) return "-";
			const date = new Date(value);
			if (Number.isNaN(date.getTime())) return "-";
			return date.toLocaleString("pt-BR");
		}

		function stripAchievementId(value) {
			return fallbackText(
				String(value || "").replace(/^achievements?_id_/i, ""),
				value,
				"-"
			);
		}

		const achievementEntries = getPlayerAchievementBadgeEntries(player);

		if (!achievementEntries.length) {
			return `<div class="info-value">-</div>`;
		}

		const achievementItems = achievementEntries.map(function(entry, index) {
			const data = getAchievementBadgeDefinition(entry.id) || {};

			const label = fallbackText(
				data.label,
				stripAchievementId(entry.id),
				entry.id,
				"Sem achievement"
			);

			const image = normalizePossibleUrl(
				data.preview_image ||
				data.image ||
				data.icon ||
				""
			);

			const banner = normalizePossibleUrl(
				data.banner ||
				data.background ||
				""
			);

			const title = normalizePossibleUrl(data.title || "");

			const color = fallbackText(data.color, "#7c5cff");
			const color2 = fallbackText(data.color2, data.color, "#7c5cff");
			const glow = fallbackText(data.glow, data.color, "#7c5cff");
			const category = fallbackText(data.category, "achievement");
			const points = Number.isFinite(Number(data.points)) ? Number(data.points) : 0;
			const description = fallbackText(data.description, data.unlock?.condition, "Conquista do perfil.");

			return {
				id: fallbackText(entry.id, "-"),
				label,
				image,
				banner,
				title,
				color,
				color2,
				glow,
				category,
				points,
				description,
				date: safeDate(entry.unlocked_at),
				index
			};
		});

		const firstItem = achievementItems[0];

		const thumbsHtml = achievementItems.map(function(item, index) {
			return `
				<button
					type="button"
					class="achievement-gallery-thumb ${index === 0 ? "is-active" : ""}"
					data-achievement-thumb
					data-id="${escapeHtml(item.id)}"
					data-label="${escapeHtml(item.label)}"
					data-banner="${escapeHtml(item.banner)}"
					data-background="${escapeHtml(item.banner)}"
					data-image="${escapeHtml(item.image)}"
					data-title="${escapeHtml(item.title)}"
					data-color="${escapeHtml(item.color)}"
					data-color2="${escapeHtml(item.color2)}"
					data-glow="${escapeHtml(item.glow)}"
					data-category="${escapeHtml(item.category)}"
					data-points="${escapeHtml(item.points)}"
					data-description="${escapeHtml(item.description)}"
					data-date="${escapeHtml(item.date)}"
				>
					${item.image
						? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.label)}" loading="lazy" onerror="this.remove()">`
						: `<span></span>`
					}
				</button>
			`;
		}).join("");

		return `
			<div
				class="achievements-info-wrap"
				data-achievement-gallery
				style="
					--achievement-color: ${escapeHtml(firstItem.color)};
					--achievement-color-2: ${escapeHtml(firstItem.color2)};
					--achievement-glow: ${escapeHtml(firstItem.glow)};
				"
			>
				<div class="achievement-gallery">
					<div
						class="achievement-gallery-main ${firstItem.banner ? "" : "is-empty"}"
						data-achievement-main
					>
						${firstItem.banner
							? `<img data-achievement-banner data-achievement-banner src="${escapeHtml(firstItem.banner)}" alt="${escapeHtml(firstItem.label)}">`
							: `<div class="achievement-gallery-main-fallback">Sem imagem</div>`
						}

						${firstItem.title
							? `
								<div class="achievement-main-title">
									<img
										data-achievement-title
										src="${escapeHtml(firstItem.title)}"
										alt="${escapeHtml(firstItem.label)}"
									>
								</div>
							`
							: ""
						}
					</div>

					<div class="achievement-gallery-bottom">
						<div class="achievement-gallery-name">
							<span data-achievement-name>${escapeHtml(firstItem.label)}</span>
							<span class="achievement-date" data-achievement-date>${escapeHtml(firstItem.date)}</span>
							<span class="achievement-meta" data-achievement-meta>${escapeHtml(firstItem.category)} • ${escapeHtml(firstItem.points)} pts</span>
							<span class="achievement-desc" data-achievement-description>${escapeHtml(firstItem.description)}</span>
							<span class="achievement-id" data-achievement-id hidden>${escapeHtml(firstItem.id)}</span>
						</div>
						<div class="achievement-gallery-count">
							${achievementItems.length} total
						</div>
					</div>

					<div class="achievement-gallery-list">
						${thumbsHtml}
					</div>
				</div>
			</div>
		`;
	}


	function getRarityBadgeDefinition(rarityId) {
		const id = cleanValue(rarityId) || getFallbackDefaultId("rarity", "raritys_id_n");
		if (!id) return null;
		const source = extensionsData?.badges_raritys || extensionsData?.badges_rarities || {};
		const aliases = Array.from(new Set([
			id,
			id.replace(/^rarity_id_/i, "raritys_id_"),
			id.replace(/^raritys_id_/i, "rarity_id_")
		]));
		const key = aliases.find(function(alias) { return source?.[alias]; });
		const merged = mergeBadgeRecord(key ? source[key] : getFallbackBadgeRecord("rarity"));
		if (!merged || !isBadgeVisible(merged, "profile", true)) return null;
		return { ...merged, id: key || id };
	}

	function getPlayerRarityId(player) {
		const raw = player?.stats?.rarity;
		if (typeof raw === "string" || typeof raw === "number") return cleanValue(raw) || getFallbackDefaultId("rarity", "raritys_id_n");
		if (raw && typeof raw === "object") return cleanValue(raw.id || raw.rarity_id || raw.value) || getFallbackDefaultId("rarity", "raritys_id_n");
		return cleanValue(player?.rarity_id || player?.badges?.rarity_id || player?.badges?.rarity) || getFallbackDefaultId("rarity", "raritys_id_n");
	}

	function buildRarityInfoHtml(player) {
		const rarityId = getPlayerRarityId(player);
		const data = getRarityBadgeDefinition(rarityId);
		if (!data) return "";

		const label = cleanValue(data.label || data.name || data.website?.short_label) || rarityId;
		const shortLabel = cleanValue(data.website?.short_label || data.website?.badge_text || data.short_label || data.label) || label;
		const stars = cleanValue(data.website?.stars || data.stars) || (Number(data.stars_count || data.website?.stars_count) ? "★".repeat(Math.max(1, Math.min(5, Number(data.stars_count || data.website?.stars_count)))) : "");
		const category = cleanValue(data.category || data.tier || "rarity");
		const evolution = cleanValue(data.website?.evolution || data.card_effects?.frame || data.evolution || "normal");
		const color = cleanValue(data.color || "#f7d58a");
		const color2 = cleanValue(data.color2 || color);
		const glow = cleanValue(data.glow || color);
		const description = cleanValue(data.description || `Raridade ${label}.`);
		const intensity = Number.isFinite(Number(data.card_effects?.intensity ?? data.intensity)) ? Number(data.card_effects?.intensity ?? data.intensity) : 0.5;

		return `
			<div
				class="vl-profile-rarity-card"
				style="--rarity-color:${escapeHtml(color)};--rarity-color-2:${escapeHtml(color2)};--rarity-glow:${escapeHtml(glow)};--rarity-intensity:${escapeHtml(intensity)};"
			>
				<div class="vl-profile-rarity-mark"><strong>${escapeHtml(shortLabel)}</strong><span>${escapeHtml(stars)}</span></div>
				<div class="vl-profile-rarity-text">
					<small>${escapeHtml(category)} • ${escapeHtml(evolution)}</small>
					<strong>${escapeHtml(label)}</strong>
					<p>${escapeHtml(description)}</p>
				</div>
			</div>
		`;
	}

	function getStatusBadgeDefinition(statusId) {
		const id = cleanValue(statusId) || getFallbackDefaultId("status", getFallbackDefaultId("avatarlock", "warns_id_undefined"));
		if (!id) return null;
		const source = extensionsData?.badges_avatarlocks || extensionsData?.badges_warns || extensionsData?.badges_moderation_status || {};
		const aliases = Array.from(new Set([
			id,
			id.replace(/^warn_id_/i, "warns_id_"),
			id.replace(/^warns_id_/i, "warn_id_"),
			id.replace(/^avatar_lock_id_/i, "warns_id_"),
			id.replace(/^avatarlocks_id_/i, "warns_id_")
		]));
		const key = aliases.find(function(alias) { return source?.[alias]; });
		const merged = mergeBadgeRecord(key ? source[key] : (getFallbackBadgeRecord("status") || getFallbackBadgeRecord("avatarlock")));
		return merged ? { ...merged, id: key || id } : null;
	}

	function getPlayerPublicStatusId(player) {
		return cleanValue(
			player?.moderation?.status_id ||
			player?.moderation?.warn_status_id ||
			player?.status?.warn_id ||
			player?.status?.status_id ||
			player?.theme?.card_embed?.security_overlay?.avatar_lock_id ||
			player?.theme?.card_embed?.security_overlay?.warns_id ||
			getFallbackDefaultId("status", getFallbackDefaultId("avatarlock", "warns_id_undefined"))
		);
	}

	function buildModerationStatusHtml(player) {
		const statusId = getPlayerPublicStatusId(player);
		if (!statusId) return "";
		const data = getStatusBadgeDefinition(statusId);
		if (!data) return "";

		const publicInfo = data.public && typeof data.public === "object" ? data.public : {};
		const publicAllowed = publicInfo.show_on_profile !== false && isBadgeVisible(data, "profile", true);
		if (!publicAllowed) return "";

		const color = cleanValue(data.color || "#ffffff");
		const color2 = cleanValue(data.color2 || color);
		const glow = cleanValue(data.glow || color);
		const label = cleanValue(publicInfo.safe_label || data.label || "Status");
		const description = cleanValue(publicInfo.safe_description || data.description || "Status público do perfil.");
		const risk = cleanValue(data.moderation?.risk_level || data.status || "none");

		return `
			<div class="vl-profile-status-card" style="--status-color:${escapeHtml(color)};--status-color-2:${escapeHtml(color2)};--status-glow:${escapeHtml(glow)};">
				<strong>${escapeHtml(label)}</strong>
				<span>${escapeHtml(risk)}</span>
				<p>${escapeHtml(description)}</p>
			</div>
		`;
	}

	function getPlayerVerifiedEmblemId(player) {
		function collect(raw, output) {
			if (raw === true || raw === 1 || raw === "true" || raw === "1") {
				output.push("verified_id_default");
				return;
			}
			if (typeof raw === "string" || typeof raw === "number") {
				const value = cleanValue(raw);
				if (value) output.push(value);
				return;
			}
			if (Array.isArray(raw)) {
				raw.forEach(function(item) { collect(item, output); });
				return;
			}
			if (raw && typeof raw === "object") {
				collect(raw.id || raw.emblem || raw.value || raw.verified_id || raw.badge_id, output);
			}
		}

		const ids = [];
		collect(player?.profile?.emblem, ids);
		collect(player?.profile?.verified, ids);
		collect(player?.badges?.verified, ids);
		collect(player?.badges?.verified_id, ids);
		collect(player?.verified, ids);

		const unique = Array.from(new Set(ids.filter(Boolean)));
		if (!unique.length) {
			const fallbackVerified = getFallbackDefaultId("verified", "verified_id_none");
			return fallbackVerified || "";
		}

		unique.sort(function(a, b) {
			const da = getVerifiedEmblemDefinition(a);
			const db = getVerifiedEmblemDefinition(b);
			return getBadgeSortValue(db, 0) - getBadgeSortValue(da, 0);
		});

		return unique[0] || "";
	}

	function getVerifiedEmblemDefinition(emblemId) {
		if (!emblemId) return null;

		const source = extensionsData?.badges_verified;
		const direct = source && typeof source === "object" ? source[emblemId] : null;
		const merged = mergeBadgeRecord(direct || getFallbackBadgeRecord("verified"));
		return merged && isBadgeVisible(merged, "profile", true) ? merged : null;
	}


	function buildVerifiedEmblemHtml(player) {
		const emblemId = getPlayerVerifiedEmblemId(player);
		const emblemData = getVerifiedEmblemDefinition(emblemId);
		const icon = getMediaUrl(emblemData?.icon);

		if (!icon) return "";

		const label = cleanValue(emblemData?.label) || "Verificado";
		const glow = cleanValue(emblemData?.glow || emblemData?.color) || "#ffffff";

		return `
			<span
				class="verified-emblem"
				title="${escapeHtml(label)}"
				aria-label="${escapeHtml(label)}"
				style="--verified-glow: ${escapeHtml(glow)};"
			>
				<img
					src="${escapeHtml(icon)}"
					alt="${escapeHtml(label)}"
					loading="lazy"
					referrerpolicy="no-referrer"
					crossorigin="anonymous"
					draggable="false"
					onerror="this.closest('.verified-emblem')?.remove()"
				>
			</span>
		`;
	}


	function getShortVerifiedLabel(label, emblemId) {
		const raw = cleanValue(label);
		const id = cleanValue(emblemId).toUpperCase();
		if (/^EA$/i.test(id) || /EARLY\s*ACCESS/i.test(raw)) return "EA";
		if (/VERIFIC/i.test(raw) || /VERIFIED/i.test(raw)) return "✓";
		const words = raw.split(/\s+/).filter(Boolean);
		if (words.length >= 2) return words.slice(0, 2).map(function(word) { return word.charAt(0); }).join("").toUpperCase();
		return (raw || id || "VIP").slice(0, 3).toUpperCase();
	}

	function buildVerifiedCardBadgeHtml(player) {
		const emblemId = getPlayerVerifiedEmblemId(player);
		const emblemData = getVerifiedEmblemDefinition(emblemId);
		const icon = getMediaUrl(emblemData?.emblem || emblemData?.icon || emblemData?.image);
		if (!icon) return `<div class="card-verified-chip-empty" aria-hidden="true"></div>`;

		const label = cleanValue(emblemData?.website?.badge_text || emblemData?.display?.badge_text || emblemData?.label) || "Badge Verified";
		const shortLabel = getShortVerifiedLabel(label, emblemId);
		const color = normalizeHexColor(emblemData?.color || emblemData?.glow || "#a855f7", "#a855f7");

		return `
			<div
				class="card-verified-chip"
				aria-label="${escapeHtml(label)}"
				data-short-label="${escapeHtml(shortLabel)}"
				data-label="${escapeHtml(label)}"
				style="--verified-card-color: ${escapeHtml(color)};"
			>
				<span class="card-verified-label">${escapeHtml(label)}</span>
				<img
					class="card-verified-emblem"
					src="${escapeHtml(icon)}"
					alt="${escapeHtml(label)}"
					loading="lazy"
					referrerpolicy="no-referrer"
					crossorigin="anonymous"
					draggable="false"
					onerror="this.closest('.card-verified-chip')?.remove()"
				>
			</div>
		`;
	}

	function getPlayerClanName(player) {
		const raw = player?.clan || player?.profile?.clan || player?.profile?.clan_name || player?.profile?.clanName;

		function pickClanText(input) {
			if (input == null) return "";
			if (typeof input === "string" || typeof input === "number") return cleanValue(input);
			if (Array.isArray(input)) {
				for (const item of input) {
					const found = pickClanText(item);
					if (found) return found;
				}
				return "";
			}
			if (typeof input === "object") {
				const keys = ["id", "name", "sub", "clanName", "clan_name", "title"];
				for (const key of keys) {
					const found = pickClanText(input[key]);
					if (found) return found;
				}
			}
			return "";
		}

		const cleaned = stripMinecraftCodes(cleanValue(pickClanText(raw)));
		if (cleaned && cleaned !== "-" && !/^\[object object\]$/i.test(cleaned)) return cleaned;

		const found = findClanForPlayer(player);
		return found?.name || "";
	}

	function playerMatchesClanEntry(player, entry) {
		const candidates = [
			cleanProfileSlug(player?._id || ""),
			cleanProfileSlug(player?.id || ""),
			cleanProfileSlug(player?.xuid || ""),
			cleanProfileSlug(player?.profile?.display_username || ""),
			cleanProfileSlug(player?.profile?.display_nickname || ""),
			cleanProfileSlug(player?.profile?.username || ""),
			cleanProfileSlug(player?.username || "")
		].map(function(v) { return String(v || "").toLowerCase(); }).filter(Boolean);

		function check(value) {
			if (value == null) return false;
			if (typeof value === "string" || typeof value === "number") {
				const raw = cleanProfileSlug(value).toLowerCase();
				return raw && candidates.includes(raw);
			}
			if (Array.isArray(value)) return value.some(check);
			if (typeof value === "object") {
				if (check(value.id || value.playerId || value.player_id || value.xuid || value.username || value.name || value.sub)) return true;
				return Object.values(value).some(check);
			}
			return false;
		}

		return check(entry);
	}

	function findClanForPlayer(player) {
		const source = clansData || {};
		for (const clanName of Object.keys(source)) {
			const clan = source[clanName];
			if (!clan || typeof clan !== "object") continue;
			if (clan.by && playerMatchesClanEntry(player, clan.by)) return { name: clanName, data: clan };
			const players = clan.players || clan.members || clan.clanPlayers || {};
			if (playerMatchesClanEntry(player, players)) return { name: clanName, data: clan };
		}
		return null;
	}

	function normalizeClans(data) {
		const source = data?.clanPlayers || data || {};
		return source && typeof source === "object" ? source : {};
	}

	function getClanDefinition(clanName) {
		const wanted = stripMinecraftCodes(cleanValue(clanName));
		if (!wanted || wanted === "-") return null;
		if (clansData?.[wanted]) return clansData[wanted];
		const lower = wanted.toLowerCase();
		const key = Object.keys(clansData || {}).find(function(item) {
			return stripMinecraftCodes(cleanValue(item)).toLowerCase() === lower;
		});
		return key ? clansData[key] : null;
	}

	function buildClanInfoCardHtml(player) {
		const clanName = getPlayerClanName(player);
		const clan = getClanDefinition(clanName);

		if (!clanName || !clan) {
			const fallbackClan = extensionsData?.information_panel?.badges_fallbacks?.clan || extensionsData?.badges_fallbacks?.clan || {};
			const fallbackWebsite = fallbackClan?.website || {};
			const fallbackTitle = stripMinecraftCodes(cleanValue(fallbackClan?.label || fallbackWebsite?.title || fallbackWebsite?.label || "SEM CLÃ")) || "SEM CLÃ";
			const fallbackColor = normalizeHexColor(fallbackWebsite?.color || player?.theme?.card_embed?.card_color || "#a855f7", "#a855f7");

			return `
				<div class="clan-info-card clan-info-card-premium clan-info-card-tech is-empty clan-empty-compact" style="--clan-color: ${escapeHtml(fallbackColor)};">
					<div class="clan-empty-center">
						<div class="clan-info-title">${escapeHtml(fallbackTitle)}</div>
					</div>
				</div>
			`;
		}

		const label = stripMinecraftCodes(cleanValue(clan?.sub || clanName)) || clanName;
		const title = stripMinecraftCodes(cleanValue(clan?.profile?.title || clan?.title || clanName)) || clanName;
		const subtitle = stripMinecraftCodes(cleanValue(clan?.profile?.bio || clan?.bio || clan?.profile?.subtitle || clan?.subtitle || "Informações do clã")) || "Informações do clã";
		const color = normalizeHexColor(
			clan?.theme?.card_embed?.card_color ||
			clan?.theme?.card_embed?.background_color ||
			player?.theme?.card_embed?.card_color ||
			"#a855f7",
			"#a855f7"
		);

		const mainIcon = getMediaUrl(clan?.theme?.card_embed?.avatar_bottom_image) || getMediaUrl(clan?.rank?.icon_image) || getMediaUrl(clan?.icon || clan?.emblem || clan?.image);
		const watermarkIcon = getMediaUrl(clan?.theme?.card_embed?.avatar_bottom_image) || mainIcon;
		const codepoint = cleanValue(clan?.rank?.icon_codepoint || clan?.icon_codepoint);
		const fallbackIcon = codepoint || "♛";
		const iconHtml = mainIcon ? `
			<img
				src="${escapeHtml(mainIcon)}"
				alt=""
				loading="lazy"
				referrerpolicy="no-referrer"
				crossorigin="anonymous"
				draggable="false"
				onerror="this.replaceWith(Object.assign(document.createElement('span'), {className: 'clan-info-emblem-fallback', textContent: '${escapeHtml(fallbackIcon)}'}))"
			>
		` : `<span class="clan-info-emblem-fallback">${escapeHtml(fallbackIcon)}</span>`;

		return `
			<div class="clan-info-card clan-info-card-premium clan-info-card-tech" style="--clan-color: ${escapeHtml(color)};">
				<div class="clan-info-label">${escapeHtml(label)}</div>
				<div class="clan-info-emblem" aria-hidden="true">${iconHtml}</div>
				<div class="clan-info-text">
					<div class="clan-info-title">${escapeHtml(title)}</div>
					<div class="clan-info-subtitle">${escapeHtml(subtitle)}</div>
				</div>
				<div class="clan-info-watermark" aria-hidden="true">
					${watermarkIcon ? `<img src="${escapeHtml(watermarkIcon)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" draggable="false">` : `<span>${escapeHtml(fallbackIcon)}</span>`}
				</div>
			</div>
		`;
	}

	function buildUsernameLine(player, classPrefix) {
		const username = getUsername(player);
		const flagHtml = buildCountryFlagHtml(player?.country?.code);
		const verifiedEmblemHtml = buildVerifiedEmblemHtml(player);

		return `
			<div class="${classPrefix}-username-line">
				<span class="username-with-emblem">
					<span class="${classPrefix}-username">${escapeHtml(username)}</span>
					${verifiedEmblemHtml}
				</span>
			</div>
		`;
	}


	function getListCountryText(player) {
		const name = cleanValue(player?.country?.name);
		const code = cleanValue(player?.country?.code);
		return stripMinecraftCodes(name || code || "Desconhecido");
	}

	function isPlayerOnlineForList(player) {
		return player?.status?.online === true || player?.status?.presence?.enabled === true;
	}

	function getListStatusText(player) {
		if (isPlayerOnlineForList(player)) return "Online";
		return "Offline";
	}

	function formatListSinceText(player) {
		const raw = cleanValue(player?.stats?.timestamps?.account_created_at || player?.created_at || player?.createdAt);
		if (!raw) return "Desde —";

		const date = new Date(raw);
		if (!Number.isNaN(date.getTime())) {
			return "Desde " + date.getFullYear();
		}

		const year = String(raw).match(/(19|20)\d{2}/);
		return year ? "Desde " + year[0] : "Desde —";
	}

	function buildListExtraInfoHtml(player) {
		const flagHtml = buildCountryFlagHtml(player?.country?.code);
		const countryText = escapeHtml(getListCountryText(player));
		const online = isPlayerOnlineForList(player);
		const statusText = escapeHtml(getListStatusText(player));
		const sinceText = escapeHtml(formatListSinceText(player));

		return `
			<div class="list-extra-row" aria-label="Informações rápidas do jogador">
				<span class="list-extra-pill list-country-pill" title="País">
					${flagHtml}
					<span>${countryText}</span>
				</span>
				<span class="list-extra-pill list-status-pill ${online ? 'is-online' : 'is-offline'}" title="Status">
					<span class="list-status-dot" aria-hidden="true"></span>
					<span>${statusText}</span>
				</span>
				<span class="list-extra-pill list-since-pill" title="Conta criada">
					<span class="list-extra-icon" aria-hidden="true">▣</span>
					<span>${sinceText}</span>
				</span>
			</div>
		`;
	}


	function buildListBadgesInlineHtml(player) {
		const flagHtml = buildCountryFlagHtml(player?.country?.code);
		const countryText = escapeHtml(getListCountryText(player));
		const online = isPlayerOnlineForList(player);
		const statusText = escapeHtml(getListStatusText(player));
		const clanName = escapeHtml(getPlayerClanName(player) || "No Clan");

		return `
			<div class="list-combat-badges" aria-label="País, status e clan do jogador">
				<span class="list-combat-pill list-country-pill" title="País">${flagHtml}<span>${countryText}</span></span>
				<span class="list-combat-pill list-status-pill ${online ? 'is-online' : 'is-offline'}" title="Status"><span class="list-status-dot" aria-hidden="true"></span><span>${statusText}</span></span>
				<span class="list-combat-pill list-clan-pill" title="Clan">${clanName}</span>
			</div>
		`;
	}

		function buildListTierProgressHtml(player) {
		const rankData = getCardRankData(player);
		const emblemImage = getRankImage(player);
		const levelNumber = getPlayerLevelNumber(player);
		const ranks = Array.isArray(CARD_LEVEL_RANKS) ? CARD_LEVEL_RANKS : [];
		const currentIndex = ranks.findIndex(function(rank) {
			if (!rank || typeof rank !== "object") return false;
			const minMatch = typeof rank.min === "number" ? levelNumber >= rank.min : true;
			const maxMatch = typeof rank.max === "number" ? levelNumber <= rank.max : true;
			return minMatch && maxMatch;
		});
		const nextRank = currentIndex >= 0 ? ranks[currentIndex + 1] : null;
		const hasMax = typeof rankData.max === "number";
		const rawProgress = !hasMax || rankData.max <= rankData.min
			? 100
			: ((levelNumber - rankData.min) / (rankData.max - rankData.min)) * 100;
		const safeProgress = Math.max(0, Math.min(100, rawProgress));
		const progressText = Math.round(safeProgress) + "%";
		const nextText = nextRank?.label ? `Próximo Rank: ${nextRank.label}` : "Rank máximo";

		return `
			<div
				class="list-tier-progress"
				style="
					--rank-color: ${rankData.color};
					--rank-color-2: ${rankData.color2 || rankData.color};
					--rank-glow: ${rankData.glow || rankData.color};
					--rank-banner: ${rankData.banner || "linear-gradient(135deg, color-mix(in srgb, " + (rankData.color || "#5865F2") + " 18%, rgba(255,255,255,.04)), rgba(8,12,24,.92))"};
					--rank-checker-opacity: ${typeof rankData.checkerOpacity === "number" ? rankData.checkerOpacity : 0.10};
				"
			>
				<div class="list-tier-main">
					<span class="list-tier-icon">${emblemImage ? `<img src="${escapeHtml(emblemImage)}" alt="${escapeHtml(rankData.label)}" loading="lazy" onerror="this.remove()">` : "◆"}</span>
					<span class="list-tier-name">${escapeHtml(rankData.label || "Tier")}</span>
					<div class="list-tier-bar" aria-hidden="true"><span style="width:${safeProgress}%"></span></div>
					<span class="list-tier-percent">${escapeHtml(progressText)}</span>
				</div>
				<div class="list-tier-next">${escapeHtml(nextText)}</div>
			</div>
		`;
	}


	// ===== JavaScript: Renderização dos cards e da view detalhada =====
	function createCard(player, index) {
		if (window.VelarionLumenCard && typeof window.VelarionLumenCard.renderPlayerCard === "function") {
			return window.VelarionLumenCard.renderPlayerCard(player, index, {
				extensionsData: extensionsData || {},
				badges_verified: extensionsData?.badges_verified || {},
				badges_levelranks: extensionsData?.badges_levelranks || {},
				badges_avatarlocks: extensionsData?.badges_avatarlocks || {},
				badges_raritys: extensionsData?.badges_raritys || extensionsData?.badges_rarities || {},
				server_panel: extensionsData?.server_panel || {},
				nickname_colors: extensionsData?.server_panel?.nickname_colors || {},
				clanPlayers: clansData || {},
				profilePlayers: profilePlayersDataSource || {}
			});
		}

		const displayName = escapeHtml(stripMinecraftCodes(getDisplayName(player)) || "Perfil");
		return `
			<article class="vl-card vl-card--missing-renderer" data-player-id="${escapeHtml(player?._id || "")}" tabindex="0" aria-label="${displayName}">
				<section class="vl-card__shell">
					<section class="vl-card__info">
						<div class="vl-card__info-content">
							<div class="vl-card__user"><span class="vl-card__username-text">Velarion Lumen</span></div>
							<h1 class="vl-card__name">${displayName}</h1>
							<div class="vl-card__title">Renderer do card não carregado.</div>
						</div>
					</section>
				</section>
			</article>
		`;
	}

	function createListCard(player) {
		const color = normalizeHexColor(player?.theme?.card_embed?.card_color || "#5865F2");
		const avatar = getAvatar(player);
		const character = getCharacter(player);
		const characterPixelClass = isProbablyPixelArt(character) ? "pixelated" : "";
		const displayName = escapeHtml(stripMinecraftCodes(getDisplayName(player)));
		const username = escapeHtml(stripMinecraftCodes(getUsername(player)));
		const cardTitle = escapeHtml(stripMinecraftCodes(getCardTitle(player)));
		const displayColor = getDisplayNameColor(player);
		const displayNameClass = displayColor.type === "gradient" ? "list-displayname gradient" : "list-displayname";
		const displayNameStyle = displayColor.type === "gradient"
			? `--display-gradient:${displayColor.value};`
			: `--display-color:${displayColor.value};`;

		return `
			<article
				class="card list-card-v3"
				data-player-id="${escapeHtml(player._id)}"
				data-list-card="true"
				data-idle="false"
				style="
					--accent: ${color};
					--accent-soft: ${hexToRgba(color, 0.12)};
					--accent-mid: ${hexToRgba(color, 0.18)};
					--list-accent-soft: ${hexToRgba(color, 0.10)};
					--list-accent-fade: ${hexToRgba(color, 0.07)};
					--list-accent-inner: ${hexToRgba(color, 0.05)};
					--list-accent-glow: ${hexToRgba(color, 0.09)};
					--list-accent-glow-hover: ${hexToRgba(color, 0.14)};
					--list-accent-border: ${hexToRgba(color, 0.34)};
					--list-accent-border-hover: ${hexToRgba(color, 0.48)};
					border-color: ${hexToRgba(color, 0.30)};
				"
				aria-label="${displayName}"
				tabindex="0"
			>
				<div class="list-svg-bg" aria-hidden="true"></div>
				<div class="list-circuit-bg" aria-hidden="true"></div>
				<svg class="list-card-frame" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 150" preserveAspectRatio="none" fill="none" aria-hidden="true">
					<path d="M24 1H372L402 11H880L910 1H1176Q1199 1 1199 24V126Q1199 149 1176 149H24Q1 149 1 126V24Q1 1 24 1Z" stroke="currentColor" stroke-opacity=".54" stroke-width="2"/>
					<path d="M40 28H210L230 18H370M828 132H1010L1030 122H1160" stroke="currentColor" stroke-opacity=".44" stroke-width="2"/>
					<path d="M1015 33H1128V117H1015" stroke="currentColor" stroke-opacity=".18" stroke-width="1.5"/>
					<path d="M1044 75H1090M1090 75L1106 60H1135M1090 75L1106 91H1135" stroke="currentColor" stroke-opacity=".34" stroke-width="2"/>
					<circle cx="1146" cy="60" r="4" fill="currentColor" fill-opacity=".54"/>
					<circle cx="1146" cy="91" r="4" fill="currentColor" fill-opacity=".34"/>
				</svg>

				<div class="list-group1">
					<div class="list-avatar">
						<img
							src="${escapeHtml(avatar)}"
							alt="Avatar de ${username}"
							loading="lazy"
							referrerpolicy="no-referrer"
							crossorigin="anonymous"
							draggable="false"
							onerror="this.onerror=null; this.src='${escapeHtml(DEFAULT_PLAYER_AVATAR)}'"
						>
						<svg class="avatar-frame-svg" viewBox="0 0 100 100" fill="none" aria-hidden="true">
							<rect x="6" y="6" width="88" height="88" rx="16" stroke="currentColor" stroke-opacity=".62" stroke-width="2"/>
							<path d="M6 34V20C6 12.3 12.3 6 20 6h14M66 6h14c7.7 0 14 6.3 14 14v14M94 66v14c0 7.7-6.3 14-14 14H66M34 94H20C12.3 94 6 87.7 6 80V66" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
						</svg>
					</div>

					<div class="list-info">
						<div class="list-name-inline-row">
							<div class="${displayNameClass}" style="${displayNameStyle}">
								<span class="list-displayname-text">${displayName}</span>
							</div>
							<span class="list-username list-username-inline">( @${username} )</span>
							${buildVerifiedEmblemHtml(player)}
						</div>

						<div class="list-title list-title-box">${cardTitle}</div>
						${buildListBadgesInlineHtml(player)}
					</div>
				</div>

				<div class="list-group2">
					<div class="list-character ${character ? characterPixelClass : 'is-empty'}">
						${character ? `
							<img
								class="list-character-main"
								src="${escapeHtml(character)}"
								alt="Character de ${displayName}"
								loading="lazy"
								referrerpolicy="no-referrer"
								crossorigin="anonymous"
								draggable="false"
								onerror="this.onerror=null; this.remove(); this.parentElement.classList.add('is-empty')"
							>
						` : ""}
					</div>
				</div>
			</article>
		`;
	}

	function createLegacyDetailView(player) {
		const color = normalizeHexColor(player?.theme?.card_embed?.card_color || "#5865F2");
		const avatar = getAvatar(player);
		const banner = getBanner(player);
		const character = getCharacter(player);
		const playerHasBanner = hasBanner(player);
		const characterFallback = playerHasBanner ? "" : DEFAULT_PLAYER_CHARACTER;
		const displayName = stripMinecraftCodes(getDisplayName(player));
		const username = getUsername(player);
		const titleHtml = buildTitleHtml(player);
		const cardTitle = getCardTitle(player);
		const rankName = stripMinecraftCodes(cleanValue(player?.badges?.rank)) || "-";
		const clanName = getPlayerClanName(player) || "-";
		const desc = cleanValue(player?.profile?.bio) || "Sem descrição.";
		const country = cleanValue(player?.country?.code) || "-";
		const characterPixelClass = isProbablyPixelArt(character) ? "pixelated" : "";

		return `
			<div class="detail-stage">
				<div class="detail-frame">

					<div class="detail-shell">
						<div class="detail-left-column" style="--accent: ${color};">
						<article
							class="detail-card"
							aria-label="${escapeHtml(displayName)}"
							style="--accent: ${color};"
						>
							<div class="detail-top">
								${buildLevelChipHtml(player)}
								<div class="card-chip">
									<span class="card-chip-text">${escapeHtml(clanName)}</span>
								</div>
							</div>

							<div class="side-rail"></div>

							<div class="detail-bg">
								<img
									src="${escapeHtml(banner)}"
									alt="${escapeHtml(displayName)}"
									loading="eager"
									referrerpolicy="no-referrer"
									crossorigin="anonymous"
									draggable="false"
									onerror="this.onerror=null; this.src='${escapeHtml(DEFAULT_PLAYER_BANNER)}'"
								>
							</div>

							<div class="detail-character-wrap ${characterPixelClass}">
								<img
									src="${escapeHtml(character || characterFallback)}"
									alt="${escapeHtml(displayName)}"
									loading="eager"
									referrerpolicy="no-referrer"
									crossorigin="anonymous"
									draggable="false"
									onerror="this.onerror=null; ${characterFallback ? `this.src='${escapeHtml(characterFallback)}'` : `this.style.display='none'`}"
								>
							</div>

							<div class="detail-bottom">
								${buildUsernameLine(player, "detail")}
								<h2 class="detail-title">${titleHtml}</h2>
								<div class="detail-subtitle">${escapeHtml(cardTitle)}</div>
							</div>
						</article>

						<section class="detail-outside-description" aria-label="Descrição do jogador">
							<h3 class="info-title">Descrição</h3>
							<div class="info-value">${minecraftToHtml(desc)}</div>
						</section>
						</div>

						<div class="detail-info">
							<section class="info-panel">
								<div class="info-header">
									<div class="info-profile-avatar">
										<img
											src="${escapeHtml(avatar)}"
											alt="Avatar de ${escapeHtml(displayName)}"
											loading="eager"
											referrerpolicy="no-referrer"
											crossorigin="anonymous"
											onerror="this.onerror=null; this.src='${escapeHtml(DEFAULT_PLAYER_AVATAR)}'"
										>
									</div>
									<h3 class="info-title">Informações</h3>
									<div class="info-verified-slot">${buildVerifiedCardBadgeHtml(player)}</div>
								</div>

								<div class="info-grid">
									<div class="info-item">
										<span class="info-label">Username</span>
										<div class="info-value">${escapeHtml(username)}</div>
									</div>

									<div class="info-item">
										<span class="info-label">País</span>
										<div class="info-value">${buildCountryFlagHtml(country)} ${escapeHtml(country)}</div>
									</div>

									<div class="info-item info-item-level">
										<span class="info-label">Tier</span>
										${buildLevelInfoEmblemHtml(player)}
										${buildRankTitleMarkHtml(player, "detail-level-title-overlay")}
									</div>

									<div class="info-item info-item-clan-premium">
										<span class="info-label">Clan</span>
										${buildClanInfoCardHtml(player)}
									</div>

									<div class="info-item info-item-player-title">
										<span class="info-label">Title</span>
										<div class="info-value">${escapeHtml(cardTitle)}</div>
									</div>
								</div>
							</section>

							<section class="info-panel">
								<div class="info-header">
									<div class="info-profile-avatar">
										<img
											src="https://cdn.jsdelivr.net/gh/Kazimuhwari-br/Velarion-Lumen-Bedrock-Server@main/assests/craftpix-net-737072-free-cyberpunk-artifact-game-512x512-icons/27.png"
											alt="Distintivos da Imagem"
											loading="eager"
											referrerpolicy="no-referrer"
											crossorigin="anonymous"
										>
									</div>
									<h3 class="info-title">Badges</h3>
								</div>

								<div class="badges-grid">
									<div class="badges-item info-item-rank">
										<span class="info-label">Role</span>
										${buildRoleInfoEmblemHtml(player)}
									</div>

									<div class="badges-item info-item-rank">
										<span class="info-label">Rank</span>
										${buildRankInfoEmblemHtml(player)}
									</div>

									<div class="badges-item badges-item-achievements">
										<span class="info-label">Achievements</span>
										${buildAchievementsGalleryHtml(player)}
									</div>
								</div>
							</section>

						</div>
					</div>
				</div>
			</div>
		`;
	}


	function getVelarionProfileRenderContext() {
		return {
			escapeHtml,
			minecraftToHtml,
			stripMinecraftCodes,
			cleanValue,
			normalizeHexColor,
			getAvatar,
			getBanner,
			getCharacter,
			hasBanner,
			getDisplayName,
			getUsername,
			getCardTitle,
			getPlayerClanName,
			isProbablyPixelArt,
			buildTitleHtml,
			buildLevelChipHtml,
			buildUsernameLine,
			buildVerifiedCardBadgeHtml,
			buildCountryFlagHtml,
			buildLevelInfoEmblemHtml,
			buildRankTitleMarkHtml,
			buildClanInfoCardHtml,
			buildRoleInfoEmblemHtml,
			buildRankInfoEmblemHtml,
			buildAchievementsGalleryHtml,
			buildRarityInfoHtml,
			buildModerationStatusHtml,
			getProfileSectionOrder,
			DEFAULT_PLAYER_AVATAR,
			DEFAULT_PLAYER_BANNER,
			DEFAULT_PLAYER_CHARACTER,
			extensionsData,
			clanPlayers: clansData || {},
			clansData: clansData || {},
			playersData
		};
	}

	function createDetailView(player) {
		if (window.VelarionProfile && typeof window.VelarionProfile.render === "function") {
			try {
				return window.VelarionProfile.render(player, getVelarionProfileRenderContext());
			} catch (e) {
				console.error("[VelarionProfile] Falha ao renderizar perfil separado; usando fallback.", e);
			}
		}
		return createLegacyDetailView(player);
	}


	// ===== JavaScript: Render principal / navegação / interação =====
	function updateViewToggleLabel() {
		const toggleBtn = document.getElementById("toggleView");
		if (!toggleBtn) return;
		toggleBtn.textContent = isListMode ? "Ver Cards" : "Ver Lista";
	}

	function render(list) {
		const players = document.getElementById("players");
		const paginationPanel = document.getElementById("paginationPanel");
		const paginationInfo = document.getElementById("paginationInfo");
		const paginationActions = document.getElementById("paginationActions");
		if (!players) return;

		players.classList.toggle("list-mode", isListMode);
		updateViewToggleLabel();

		const totalItems = Array.isArray(list) ? list.length : 0;
		const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
		currentPage = Math.min(Math.max(1, currentPage), totalPages);

		if (!totalItems) {
			players.innerHTML = "<div class=\"empty\">Nenhum jogador encontrado.</div>";
			if (paginationPanel) paginationPanel.hidden = true;
			return;
		}

		const startIndex = (currentPage - 1) * itemsPerPage;
		const pageItems = list.slice(startIndex, startIndex + itemsPerPage);

		players.innerHTML = pageItems.map(function(player, index) {
			return isListMode ? createListCard(player) : createCard(player, startIndex + index);
		}).join("");

		if (!isListMode && window.VelarionLumenCard && typeof window.VelarionLumenCard.hydrate === "function") {
			window.VelarionLumenCard.hydrate(players);
		}

		if (paginationPanel) paginationPanel.hidden = totalItems <= itemsPerPage && totalPages <= 1;
		if (paginationInfo) {
			const from = startIndex + 1;
			const to = Math.min(startIndex + pageItems.length, totalItems);
			paginationInfo.textContent = "Mostrando " + from + "-" + to + " de " + totalItems + " jogadores";
		}
		if (paginationActions) renderPaginationActions(totalPages);

		if (isListMode) {
			attachListGlow(players.querySelectorAll(".card"));
		} else {
			attach3DEffect(players.querySelectorAll(".vl-card[data-player-id]"));
		}
	}


	function getRankingNumberValue(player, paths, fallback) {
		for (const path of paths) {
			let value = player;
			for (const key of path.split(".")) value = value && value[key];
			if (Array.isArray(value)) value = value[0];
			if (typeof value === "number" && Number.isFinite(value)) return value;
			if (typeof value === "string") {
				const parsed = Number(value.replace(/[^0-9.-]/g, ""));
				if (Number.isFinite(parsed)) return parsed;
			}
		}
		return fallback;
	}

	function getProgressionNumber(player, key, fallback) {
		const value = player?.stats?.progression?.[key];
		if (typeof value === "number" && Number.isFinite(value)) return value;
		if (typeof value === "string") {
			const parsed = Number(value.replace(/[^0-9.-]/g, ""));
			if (Number.isFinite(parsed)) return parsed;
		}
		return fallback;
	}

	function getPlayerXP(player) {
		return getProgressionNumber(player, "xp", 0);
	}

	function getPlayerXPToNext(player) {
		return getProgressionNumber(player, "xp_to_next", 0);
	}

	function getPlayerGlobalPoints(player) {
		return getProgressionNumber(player, "pts", 0);
	}

	function getRankingScore(player) {
		// Ranking Global usa a pontuação real do Firebase:
		// profilePlayers[id].stats.progression.pts
		return Math.max(0, Math.round(getPlayerGlobalPoints(player)));
	}

	function getXPPercent(player) {
		const xp = getPlayerXP(player);
		const next = getPlayerXPToNext(player);
		if (!next || next <= 0) return 0;
		return Math.max(0, Math.min(100, (xp / next) * 100));
	}

	function formatNumberBR(value) {
		const n = Number(value) || 0;
		return n.toLocaleString("pt-BR");
	}

	function formatRankingPoints(value) {
		return formatNumberBR(value) + " pts";
	}

	function formatXPText(player) {
		const xp = getPlayerXP(player);
		const next = getPlayerXPToNext(player);
		return next > 0 ? `${formatNumberBR(xp)} / ${formatNumberBR(next)} XP` : `${formatNumberBR(xp)} XP`;
	}

	function buildRankingPlayerCard(player, index) {
		const color = normalizeHexColor(player?.theme?.card_embed?.card_color || "#8b6cff");
		const avatar = getAvatar(player);
		const banner = getBanner(player);
		const character = getCharacter(player);
		const displayName = escapeHtml(stripMinecraftCodes(getDisplayName(player)) || "Jogador");
		const username = escapeHtml(stripMinecraftCodes(getUsername(player)) || displayName);
		const title = escapeHtml(stripMinecraftCodes(getCardTitle(player)) || "Perfil sincronizado");
		const level = getPlayerLevelNumber(player) || 0;
		const score = getRankingScore(player);
		const rankNo = String(index + 1).padStart(2, "0");
		const progress = Math.max(0, Math.min(100, getXPPercent(player)));
		const xpText = escapeHtml(formatXPText(player));
		const role = escapeHtml(getPrimaryRoleLabel(player, "Global"));
		return `
			<article class="vl-rank-row" data-player-id="${escapeHtml(player._id)}" tabindex="0" style="--rank-accent:${color};--rank-accent-soft:${hexToRgba(color,.18)};--rank-accent-line:${hexToRgba(color,.42)}">
				<div class="vl-rank-pos">${rankNo}</div>
				<div class="vl-rank-user">
					<img class="vl-rank-avatar" src="${escapeHtml(avatar)}" alt="Avatar de ${username}" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.onerror=null; this.src='${escapeHtml(DEFAULT_PLAYER_AVATAR)}'">
					<div class="vl-rank-namebox"><strong>${displayName}${buildVerifiedEmblemHtml(player)}</strong><span>@${username}</span></div>
				</div>
				<div class="vl-rank-level"><b>${level || "--"}</b><span>Lv.</span></div>
				<div class="vl-rank-progress"><i><em style="width:${progress}%"></em></i><span>${xpText}</span></div>
				<div class="vl-rank-role">${role}</div>
				<div class="vl-rank-score">${formatRankingPoints(score)}</div>
				<div class="vl-rank-medal">✦</div>
			</article>
		`;
	}

	function renderRankingsPanel() {
		const rankingList = document.getElementById("rankingsList");
		if (!rankingList || !Array.isArray(playersData)) return;

		const ranked = playersData.slice().sort(function(a, b) {
			return getRankingScore(b) - getRankingScore(a);
		});
		if (!ranked.length) {
			rankingList.innerHTML = '<div class="empty">Nenhum jogador carregado.</div>';
			return;
		}

		const top = ranked[0];
		const top2 = ranked[1] || top;
		const top3 = ranked[2] || top;
		const topColor = normalizeHexColor(top?.theme?.card_embed?.card_color || "#8b6cff");
		const topAvatar = getAvatar(top);
		const topBanner = getBanner(top);
		const topCharacter = getCharacter(top);
		const topName = escapeHtml(stripMinecraftCodes(getDisplayName(top)) || "Jogador");
		const topUser = escapeHtml(stripMinecraftCodes(getUsername(top)) || topName);
		const topTitle = escapeHtml(stripMinecraftCodes(getCardTitle(top)) || "Melhor pontuação global");
		const topLevel = getPlayerLevelNumber(top) || 0;
		const topScore = getRankingScore(top);
		const topXPText = escapeHtml(formatXPText(top));
		const topRole = escapeHtml(getPrimaryRoleLabel(top, "Administrador"));
		const topOnline = isPlayerOnline(top);
		const topOnlineText = topOnline ? "Online" : "Offline";
		const rows = ranked.slice(0, 10).map(buildRankingPlayerCard).join("");

		rankingList.className = "vl-rankings-experience";
		rankingList.innerHTML = `
			<div class="vl-rank-hero" style="--rank-accent:${topColor};--rank-accent-soft:${hexToRgba(topColor,.18)};--rank-accent-line:${hexToRgba(topColor,.42)}">
				<section class="vl-rank-feature" data-player-id="${escapeHtml(top._id)}" tabindex="0">
					<img class="vl-rank-feature-bg" src="${escapeHtml(topBanner)}" alt="Banner de ${topName}" loading="eager" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.onerror=null; this.src='${escapeHtml(DEFAULT_PLAYER_BANNER)}'">
					${topCharacter ? `<img class="vl-rank-feature-character" src="${escapeHtml(topCharacter)}" alt="Character de ${topName}" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.remove()">` : ""}
					<div class="vl-rank-feature-avatar"><img src="${escapeHtml(topAvatar)}" alt="Avatar de ${topUser}" loading="lazy" onerror="this.onerror=null; this.src='${escapeHtml(DEFAULT_PLAYER_AVATAR)}'"></div>
					<div class="vl-rank-feature-name"><span>#01</span><strong>${topName}${buildVerifiedEmblemHtml(top)}</strong></div>
				</section>

				<section class="vl-rank-profile" data-player-id="${escapeHtml(top._id)}" tabindex="0">
					<span class="vl-rank-kicker">Perfil Destaque</span>
					<div class="vl-rank-profile-title"><h3>${topName}</h3><span>@${topUser}</span><b class="${topOnline ? 'is-online' : 'is-offline'}">${topOnlineText}</b></div>
					<p>${topTitle}</p>
					<div class="vl-rank-tags"><span>${topRole}</span><span>Global</span><span>VLS</span></div>
					<div class="vl-rank-mini-stats"><div><small>Nível</small><strong>${topLevel || "--"}</strong></div><div><small>XP</small><strong>${topXPText}</strong></div><div><small>Rank</small><strong>#01</strong></div></div>
					<div class="vl-rank-total"><small>Pontuação Global</small><strong>${formatRankingPoints(topScore)}</strong></div>
				</section>

				<section class="vl-rank-trophy">
					<div class="vl-rank-trophy-head"><span>Top Global</span><select aria-label="Categoria do ranking"><option>Global</option><option>Nível</option><option>XP</option></select></div>
					<div class="vl-rank-trophy-icon">✦</div>
					<strong>${formatRankingPoints(topScore)}</strong>
					<span>Melhor pontuação global</span>
					<button type="button">Ver Ranking Completo</button>
				</section>
			</div>

			<section class="vl-rank-board">
				<div class="vl-rank-board-head"><span>Ranking Geral</span><div><button class="is-active" type="button">Global</button><button type="button">Nível</button><button type="button">XP</button><button type="button">Conquistas</button></div></div>
				<div class="vl-rank-rows">${rows}</div>
				<button class="vl-rank-more" type="button">Carregar mais jogadores</button>
			</section>
		`;
	}

	function renderPaginationActions(totalPages) {
		const paginationActions = document.getElementById("paginationActions");
		if (!paginationActions) return;

		paginationActions.innerHTML = "";

		const prevBtn = createPageButton("‹", currentPage - 1, currentPage === 1, "Página anterior");
		paginationActions.appendChild(prevBtn);

		getVisiblePageNumbers(totalPages).forEach(function(page) {
			if (page === "...") {
				const dots = createPageButton("…", currentPage, true, "Mais páginas");
				dots.classList.add("page-ellipsis");
				paginationActions.appendChild(dots);
				return;
			}

			const pageBtn = createPageButton(String(page), page, false, "Ir para página " + page);
			pageBtn.classList.toggle("is-active", page === currentPage);
			pageBtn.setAttribute("aria-current", page === currentPage ? "page" : "false");
			paginationActions.appendChild(pageBtn);
		});

		const nextBtn = createPageButton("›", currentPage + 1, currentPage === totalPages, "Próxima página");
		paginationActions.appendChild(nextBtn);
	}

	function getVisiblePageNumbers(totalPages) {
		if (totalPages <= 7) {
			return Array.from({ length: totalPages }, function(_, index) { return index + 1; });
		}

		const pages = [1];
		const start = Math.max(2, currentPage - 1);
		const end = Math.min(totalPages - 1, currentPage + 1);

		if (start > 2) pages.push("...");
		for (let page = start; page <= end; page += 1) pages.push(page);
		if (end < totalPages - 1) pages.push("...");
		pages.push(totalPages);

		return pages;
	}

	function createPageButton(label, page, disabled, ariaLabel) {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "page-btn";
		btn.textContent = label;
		btn.disabled = !!disabled;
		btn.dataset.page = String(page);
		btn.setAttribute("aria-label", ariaLabel || label);
		return btn;
	}

	function attachListGlow(cards) {
		cards.forEach(function(cardEl) {
			cardEl.style.setProperty("--lx", "50%");
			cardEl.style.setProperty("--ly", "50%");

			cardEl.addEventListener("pointermove", function(e) {
				if (!isListMode) return;

				const rect = cardEl.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;

				cardEl.style.setProperty("--lx", x + "px");
				cardEl.style.setProperty("--ly", y + "px");
			});

			cardEl.addEventListener("pointerenter", function() {
				if (!isListMode) return;
				cardEl.classList.add("is-touching");
			});

			cardEl.addEventListener("pointerleave", function() {
				if (!isListMode) return;
				cardEl.classList.remove("is-touching");
				cardEl.style.setProperty("--lx", "50%");
				cardEl.style.setProperty("--ly", "50%");
			});

			cardEl.addEventListener("touchstart", function(ev) {
				if (!isListMode) return;

				const touch = ev.touches && ev.touches[0];
				if (!touch) return;

				const rect = cardEl.getBoundingClientRect();
				cardEl.style.setProperty("--lx", (touch.clientX - rect.left) + "px");
				cardEl.style.setProperty("--ly", (touch.clientY - rect.top) + "px");
				cardEl.classList.add("is-touching");
			}, { passive: true });

			cardEl.addEventListener("touchend", function() {
				if (!isListMode) return;
				cardEl.classList.remove("is-touching");
				cardEl.style.setProperty("--lx", "50%");
				cardEl.style.setProperty("--ly", "50%");
			});
		});
	}

	function showDetailInstant(player) {
		const gridView = document.getElementById("gridView");
		const detailView = document.getElementById("detailView");
		if (!gridView || !detailView) return;

		activePlayerId = player._id;
		lockBodyScroll();

		detailView.innerHTML = '<button id="backBtn" class="detail-close detail-back-btn" type="button" aria-label="Voltar para lista">← Voltar</button>' + createDetailView(player);
		detailView.classList.add("active");
		detailView.classList.remove("ready");
		detailView.scrollTop = 0;

		attach3DEffect(detailView.querySelectorAll(".detail-card"));
		setupAchievementGalleries(detailView);

		gridView.classList.add("hidden");

		requestAnimationFrame(function() {
			detailView.classList.add("ready");
		});
	}

	async function openDetail(playerId, sourceCard) {
		if (!playerId || isTransitionRunning) return;
		const player = playersData.find(function(item) { return String(item._id) === String(playerId); });
		if (!player) return;
		showDetailInstant(player);
		try { history.replaceState(null, "", makeProfileUrl(playerId)); } catch(e) {}
	}

	function closeDetail() {
		try { if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search); } catch(e) {}
		animateCloseDetail();
	}

	function lockBodyScroll() {
		pageScrollBeforeDetail = window.scrollY || window.pageYOffset || 0;

		document.documentElement.style.overflow = "hidden";
		document.body.dataset.scrollLocked = "true";
		document.body.style.position = "fixed";
		document.body.style.top = "-" + pageScrollBeforeDetail + "px";
		document.body.style.left = "0";
		document.body.style.right = "0";
		document.body.style.width = "100%";
		document.body.style.overflow = "hidden";
	}

	function unlockBodyScroll() {
		const top = document.body.style.top;

		document.documentElement.style.overflow = "";
		document.body.dataset.scrollLocked = "false";
		document.body.style.position = "";
		document.body.style.top = "";
		document.body.style.left = "";
		document.body.style.right = "";
		document.body.style.width = "";
		document.body.style.overflow = "";

		const restoreY = top ? Math.abs(parseInt(top, 10)) : pageScrollBeforeDetail;
		window.scrollTo({ top: restoreY || 0, behavior: "auto" });
	}


	async function animateOpenDetail(player, sourceCard, redirectUrl) {
		if (isTransitionRunning) return;
		isTransitionRunning = true;

		const gridView = document.getElementById("gridView");
		const detailView = document.getElementById("detailView");
		const players = document.getElementById("players");
		const fade = ensureScreenFade();

		if (!gridView || !detailView || !players || !sourceCard) {
			isTransitionRunning = false;
			return;
		}

		try {
			activePlayerId = player._id;

			const allCards = Array.from(players.querySelectorAll(".vl-card[data-player-id], .card[data-player-id]"));
			const sourceRect = getRectRelativeToViewport(sourceCard);
			const accentColor = normalizeHexColor(player?.theme?.card_embed?.card_color || "#5865F2");
			const transitionFrontCard = buildTransitionFrontCard(sourceCard);

			players.classList.add("transitioning");

			const layer = createTransitionLayer();
			const clone = document.createElement("div");
			const bannerCover = getBanner(player);

			clone.className = "transition-clone";
			clone.style.setProperty("--accent", accentColor);
			clone.style.setProperty("--pixel", hexToRgba(accentColor, 0.16));
			clone.style.setProperty("--pixel-strong", hexToRgba(accentColor, 0.42));
			clone.style.setProperty("--pixel-glow", hexToRgba(accentColor, 0.26));
			clone.style.setProperty("--back-cover", "url('" + bannerCover.replace(/'/g, "\'") + "')");

			clone.innerHTML = `
				<div class="transition-3d">
					<div class="transition-face front"></div>
					<div class="transition-face back"><div class="back-art"></div></div>
					<div class="transition-spine"></div>
				</div>
			`;

			const frontFace = clone.querySelector(".transition-face.front");
			if (frontFace && transitionFrontCard) {
				frontFace.appendChild(transitionFrontCard);
			}

			layer.appendChild(clone);
			setCloneBox(clone, sourceRect);
			makeComets(clone, accentColor);

			allCards.forEach(function(card) {
				if (card === sourceCard) {
					reset3DCard(card);
					card.classList.add("card-selected-source");
					card.style.visibility = "hidden";
				} else {
					card.classList.add("card-faded");
				}
			});

			await wait(70);

			clone.style.animation = "rareSpinIn 1.45s cubic-bezier(.16,1,.3,1) forwards";
			await wait(430);

			const nearRect = {
				left: sourceRect.left + Math.min(28, sourceRect.width * 0.12),
				top: sourceRect.top - Math.min(18, sourceRect.height * 0.05),
				width: sourceRect.width * 1.02,
				height: sourceRect.height * 1.02
			};

			fade.classList.add("active");
			await Promise.all([
				animateElementTo(clone, sourceRect, nearRect, 280),
				wait(280)
			]);
			await wait(80);

			if (redirectUrl) {
				clone.classList.add("is-opening-profile");
				await wait(180);
				window.location.href = redirectUrl;
				return;
			}

			lockBodyScroll();

			detailView.innerHTML = '<button id="backBtn" class="detail-close detail-back-btn" type="button" aria-label="Voltar para lista">← Voltar</button>' + createDetailView(player);
			detailView.classList.add("active");
			detailView.classList.remove("ready");
			detailView.scrollTop = 0;

			attach3DEffect(detailView.querySelectorAll(".detail-card"));
			setupAchievementGalleries(detailView);

			gridView.classList.add("hidden");

			await wait(40);

			detailView.classList.add("ready");
			detailView.scrollTop = 0;

			players.classList.remove("transitioning");
			allCards.forEach(function(card) {
				card.classList.remove("card-faded", "card-selected-source");
				card.style.visibility = "";
			});

			layer.remove();

			await wait(120);

			fade.classList.remove("active");
			await wait(260);
		} catch (error) {
			console.error("[animateOpenDetail]", error);

			const existingLayer = document.querySelector(".transition-layer");
			if (existingLayer) existingLayer.remove();

			document.getElementById("detailView").classList.remove("active", "ready");
			document.getElementById("detailView").innerHTML = "";

			document.getElementById("gridView").classList.remove("hidden");
			document.getElementById("players").classList.remove("transitioning");

			Array.from(document.querySelectorAll(".card-faded, .card-selected-source")).forEach(function(card) {
				card.classList.remove("card-faded", "card-selected-source");
			});

			fade.classList.remove("active");
			unlockBodyScroll();
			activePlayerId = null;
		}

		isTransitionRunning = false;
	}

	async function animateCloseDetail() {
		if (isTransitionRunning) return;
		isTransitionRunning = true;

		const fade = ensureScreenFade();
		const gridView = document.getElementById("gridView");
		const detailView = document.getElementById("detailView");

		try {
			fade.classList.add("active");
			await wait(260);

			detailView.classList.remove("ready", "active");
			detailView.innerHTML = "";

			gridView.classList.remove("hidden");
			unlockBodyScroll();
			activePlayerId = null;

			await wait(80);

			fade.classList.remove("active");
			await wait(200);
		} catch (e) {
			console.error("[animateCloseDetail]", e);

			detailView.classList.remove("ready", "active");
			detailView.innerHTML = "";
			gridView.classList.remove("hidden");
			fade.classList.remove("active");
			unlockBodyScroll();
			activePlayerId = null;
		}

		isTransitionRunning = false;
	}

	function isRenderableProfileRecord(player) {
		if (!player || typeof player !== "object") return false;
		if (player.public_profile === false) return false;
		if (player.profile && player.profile.public_profile === false) return false;

		const profile = player.profile || {};
		const hasIdentity = Boolean(cleanValue(profile.display_nickname) || cleanValue(profile.display_username) || cleanValue(player._id));
		return hasIdentity;
	}

	function applySearch(query) {
		const q = stripMinecraftCodes(query).toLowerCase().trim();

		filteredPlayers = playersData.filter(function(p) {
			const text = [
				stripMinecraftCodes(p?.profile?.display_nickname),
				stripMinecraftCodes(p?.profile?.display_username),
				stripMinecraftCodes(p?.profile?.bio),
				stripMinecraftCodes(p?.badges?.rank),
				stripMinecraftCodes(p?.clan?.id),
				stripMinecraftCodes(p?.badges?.role),
				stripMinecraftCodes(p?.country?.code),
				stripMinecraftCodes(p?.theme?.color_name_id),
				stripMinecraftCodes(p?.profile?.title)
			].join(" ").toLowerCase();

			return text.includes(q);
		});

		if (activePlayerId) {
			const stillExists = filteredPlayers.some(function(p) {
				return p._id === activePlayerId;
			});

			if (!stillExists) closeDetail();
		}

		currentPage = 1;
		render(filteredPlayers);
	}

	function debounce(fn, waitTime) {
		let timeout = null;
		return function() {
			const args = arguments;
			clearTimeout(timeout);
			timeout = setTimeout(function() {
				fn.apply(null, args);
			}, waitTime || 120);
		};
	}

	function reset3DCard(card) {
		if (card && card.closest && card.closest("#players.list-mode")) return;
		card.style.setProperty("--rx", "0deg");
		card.style.setProperty("--ry", "0deg");
		card.style.setProperty("--mx", "50%");
		card.style.setProperty("--my", "50%");
		card.style.setProperty("--bgx", "0px");
		card.style.setProperty("--bgy", "0px");
		card.style.setProperty("--charx", "0px");
		card.style.setProperty("--chary", "0px");
		card.style.setProperty("--charscale", card.classList.contains("detail-card") ? "1.15" : "1.02");
		card.style.setProperty("--lift", "0px");
		card.dataset.idle = "true";
	}

	function update3DCard(card, clientX, clientY) {
		if (!card) return;
		if (card.closest && card.closest("#players.list-mode")) return;

		const rect = card.getBoundingClientRect();
		if (!rect.width || !rect.height) return;

		const px = (clientX - rect.left) / rect.width;
		const py = (clientY - rect.top) / rect.height;
		const clampX = Math.max(0, Math.min(1, px));
		const clampY = Math.max(0, Math.min(1, py));
		const isDetail = card.classList.contains("detail-card");

		const rotateY = (clampX - 0.5) * (isDetail ? 10 : 8);
		const rotateX = (0.5 - clampY) * (isDetail ? 9 : 7);

		const bgX = (clampX - 0.5) * (isDetail ? -10 : -8);
		const bgY = (clampY - 0.5) * (isDetail ? -8 : -7);

		const charX = (clampX - 0.5) * (isDetail ? -12 : -10);
		const charY = (clampY - 0.5) * (isDetail ? -6 : -5);

		card.style.setProperty("--rx", rotateX.toFixed(2) + "deg");
		card.style.setProperty("--ry", rotateY.toFixed(2) + "deg");
		card.style.setProperty("--mx", (clampX * 100).toFixed(2) + "%");
		card.style.setProperty("--my", (clampY * 100).toFixed(2) + "%");
		card.style.setProperty("--bgx", bgX.toFixed(2) + "px");
		card.style.setProperty("--bgy", bgY.toFixed(2) + "px");
		card.style.setProperty("--charx", charX.toFixed(2) + "px");
		card.style.setProperty("--chary", charY.toFixed(2) + "px");
		card.style.setProperty("--charscale", isDetail ? "1.14" : "1.045");
		card.style.setProperty("--lift", "0px");
		card.dataset.idle = "false";
	}

	function attach3DEffect(cards) {
		(cards || []).forEach(function(card) {
			if (card && card.closest && card.closest("#players.list-mode")) return;
			if (card.dataset.effectBound === "true") return;
			card.dataset.effectBound = "true";
			reset3DCard(card);

			let hovering = false;
			let raf = 0;
			let lastX = 0;
			let lastY = 0;

			function requestUpdate(x, y) {
				lastX = x;
				lastY = y;
				if (raf) return;
				raf = requestAnimationFrame(function() {
					raf = 0;
					if (!hovering) return;
					update3DCard(card, lastX, lastY);
				});
			}

			card.addEventListener("pointerenter", function(event) {
				hovering = true;
				card.classList.add("is-touching");
				requestUpdate(event.clientX, event.clientY);
			});

			card.addEventListener("pointermove", function(event) {
				hovering = true;
				card.classList.add("is-touching");
				requestUpdate(event.clientX, event.clientY);
			});

			function leaveCard() {
				hovering = false;
				if (raf) {
					cancelAnimationFrame(raf);
					raf = 0;
				}
				card.classList.remove("is-touching");
				reset3DCard(card);
			}

			card.addEventListener("pointerleave", leaveCard);
			card.addEventListener("pointercancel", leaveCard);

			card.addEventListener("touchstart", function(event) {
				if (!event.touches || !event.touches[0]) return;
				const touch = event.touches[0];
				hovering = true;
				card.classList.add("is-touching");
				requestUpdate(touch.clientX, touch.clientY);
			}, { passive: true });

			card.addEventListener("touchmove", function(event) {
				if (!event.touches || !event.touches[0]) return;
				const touch = event.touches[0];
				requestUpdate(touch.clientX, touch.clientY);
			}, { passive: true });

			card.addEventListener("touchend", function() {
				setTimeout(leaveCard, 90);
			}, { passive: true });
		});
	}

	function setupAchievementGalleries(root = document) {
		const galleries = root.querySelectorAll("[data-achievement-gallery]");

		galleries.forEach(function(gallery) {
			if (gallery.dataset.galleryBound === "true") {
				return;
			}

			gallery.dataset.galleryBound = "true";

			const main = gallery.querySelector("[data-achievement-main]");
			const name = gallery.querySelector("[data-achievement-name]");
			const id = gallery.querySelector("[data-achievement-id]");
			const date = gallery.querySelector("[data-achievement-date]");
			const meta = gallery.querySelector("[data-achievement-meta]");
			const description = gallery.querySelector("[data-achievement-description]");
			const thumbs = Array.from(gallery.querySelectorAll("[data-achievement-thumb]"));

			if (!main || !name || !date || !thumbs.length) {
				return;
			}

			function renderMainAchievement(banner, title, icon, label) {
				main.innerHTML = "";

				if (banner) {
					main.classList.remove("is-empty");
					const bannerImg = document.createElement("img");
					bannerImg.setAttribute("data-achievement-banner", "");
					bannerImg.src = banner;
					bannerImg.alt = label;
					bannerImg.loading = "lazy";
					bannerImg.onerror = function() {
						main.classList.add("is-empty");
						bannerImg.remove();
						if (!main.querySelector(".achievement-gallery-main-fallback")) {
							main.insertAdjacentHTML("afterbegin", '<div class="achievement-gallery-main-fallback">Sem imagem</div>');
						}
					};
					main.appendChild(bannerImg);
				} else {
					main.classList.add("is-empty");
					main.insertAdjacentHTML("afterbegin", '<div class="achievement-gallery-main-fallback">Sem imagem</div>');
				}

				if (title) {
					const titleBox = document.createElement("div");
					titleBox.className = "achievement-main-title";
					const titleImg = document.createElement("img");
					titleImg.setAttribute("data-achievement-title", "");
					titleImg.src = title;
					titleImg.alt = label;
					titleImg.loading = "lazy";
					titleImg.onerror = function() { titleBox.remove(); };
					titleBox.appendChild(titleImg);
					main.appendChild(titleBox);
				} else if (icon) {
					const iconBox = document.createElement("div");
					iconBox.className = "achievement-main-icon";
					const iconImg = document.createElement("img");
					iconImg.src = icon;
					iconImg.alt = label;
					iconImg.loading = "lazy";
					iconImg.onerror = function() { iconBox.remove(); };
					iconBox.appendChild(iconImg);
					main.appendChild(iconBox);
				}
			}

			function setActiveThumb(button) {
				if (!button) return;

				thumbs.forEach(function(item) {
					item.classList.remove("is-active");
					item.setAttribute("aria-pressed", "false");
				});

				button.classList.add("is-active");
				button.setAttribute("aria-pressed", "true");

				const icon = button.dataset.image || "";
				const banner = button.dataset.banner || button.dataset.background || "";
				const title = button.dataset.title || "";
				const label = button.dataset.label || "-";
				const achievementId = button.dataset.id || "-";
				const achievementDate = button.dataset.date || "-";
				const color = button.dataset.color || "#7c5cff";
				const color2 = button.dataset.color2 || color;
				const glow = button.dataset.glow || color;

				gallery.style.setProperty("--achievement-color", color);
				gallery.style.setProperty("--achievement-color-2", color2);
				gallery.style.setProperty("--achievement-glow", glow);

				name.textContent = label;
				if (id) id.textContent = achievementId;
				date.textContent = achievementDate;

				renderMainAchievement(banner, title, icon, label);
			}

			thumbs.forEach(function(button) {
				button.addEventListener("click", function(event) {
					event.preventDefault();
					event.stopPropagation();
					setActiveThumb(button);
				});

				button.addEventListener("mouseenter", function() {
					setActiveThumb(button);
				});

				button.addEventListener("focus", function() {
					setActiveThumb(button);
				});

				button.addEventListener("keydown", function(event) {
					const currentIndex = thumbs.indexOf(button);

					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						setActiveThumb(button);
						return;
					}

					if (event.key === "ArrowRight") {
						event.preventDefault();
						const next = thumbs[currentIndex + 1] || thumbs[0];
						next.focus();
						setActiveThumb(next);
					}

					if (event.key === "ArrowLeft") {
						event.preventDefault();
						const prev = thumbs[currentIndex - 1] || thumbs[thumbs.length - 1];
						prev.focus();
						setActiveThumb(prev);
					}
				});
			});

			setActiveThumb(thumbs[0]);
		});
	}



	// ===== JavaScript: Carregamento dos dados =====
	async function fetchJsonSafe(url) {
		if (!url) return null;
		try {
			const res = await fetch(url, { cache: "no-store" });
			if (!res.ok) throw new Error("HTTP " + res.status + " - " + res.statusText);
			return await res.json();
		} catch (error) {
			console.warn("[Dados tentativa falhou]", url, error);
			return null;
		}
	}

	function hasUsefulData(data) {
		if (!data || typeof data !== "object") return false;
		if (Array.isArray(data)) return data.filter(Boolean).length > 0;
		return Object.keys(data).length > 0;
	}

	async function fetchFirstUsefulJson(urls) {
		for (const url of urls) {
			const json = await fetchJsonSafe(url);
			if (hasUsefulData(json)) return { json, url };
		}
		return { json: null, url: "" };
	}

	function setStatus(title, message) {
		document.querySelectorAll("[data-vl-firebase-status]").forEach(function(el){ el.textContent = title; });
		document.querySelectorAll("[data-vl-firebase-message]").forEach(function(el){ el.textContent = message || ""; });
		if (window.vlBootSetFantasyText) window.vlBootSetFantasyText();
	}

	function updateCounters() {
		const total = playersData.length;
		const online = playersData.filter(isPlayerOnline).length;
		const topScore = playersData.reduce(function(max, player){ return Math.max(max, getRankingScore(player)); }, 0);
		const topLevel = playersData.reduce(function(max, player){ return Math.max(max, getPlayerLevelNumber(player) || 0); }, 0);
		document.querySelectorAll("[data-vl-total-players]").forEach(function(el){ el.textContent = total ? formatNumberBR(total) : "0"; });
		document.querySelectorAll("[data-vl-visible-players]").forEach(function(el){ el.textContent = filteredPlayers.length ? formatNumberBR(filteredPlayers.length) : "0"; });
		document.querySelectorAll("[data-vl-online-players]").forEach(function(el){ el.textContent = formatNumberBR(online); });
		document.querySelectorAll("[data-vl-top-score]").forEach(function(el){ el.textContent = topScore ? formatNumberBR(topScore) : "0"; });
		document.querySelectorAll("[data-vl-top-level]").forEach(function(el){ el.textContent = topLevel ? "Lv. " + formatNumberBR(topLevel) : "--"; });
	}

	function renderHubPanel() {
		const root = document.querySelector("[data-vl-top-players]");
		if (!root) return;
		const ranked = playersData.slice().sort(function(a, b) { return getRankingScore(b) - getRankingScore(a); }).slice(0, 5);
		if (!ranked.length) {
			root.innerHTML = '<div><b>--</b><strong>Arquivo silencioso</strong><small>Nenhum registro foi encontrado neste caminho.</small></div>';
			return;
		}
		root.innerHTML = ranked.map(function(player, index) {
			const name = escapeHtml(stripMinecraftCodes(getDisplayName(player)) || getUsername(player) || "Jogador");
			const level = getPlayerLevelNumber(player) || 0;
			return `<div data-player-id="${escapeHtml(player._id)}" tabindex="0"><b>${index + 1}</b><strong>${name}</strong><small>${formatRankingPoints(getRankingScore(player))} • Lv. ${formatNumberBR(level)}</small></div>`;
		}).join("");
	}

	async function load() {
		const playersEl = document.getElementById("players");

		try {
			setStatus("Abrindo o Codex...", "Buscando registros do mundo de Velarion.");
			const dataResultPromise = fetchFirstUsefulJson(DATA_URLS);
			const extensionsPromise = fetchJsonSafe(EXTENSIONS_DATA_URL);
			const serverPanelPromise = fetchJsonSafe(SERVER_PANEL_DATA_URL);
			const clansPromise = VL_PAGE_KIND === "habitants" ? Promise.resolve({}) : fetchJsonSafe(CLANS_DATA_URL);
			const [dataResult, extensionsJson, serverPanelJson, clansJson] = await Promise.all([dataResultPromise, extensionsPromise, serverPanelPromise, clansPromise]);

			extensionsData = attachServerPanelData(extensionsJson || {}, serverPanelJson || {});
			clansData = normalizeClans(clansJson);
			applyExtensionDataConfig();
			profilePlayersDataSource = dataResult.json || {};
			playersData = normalize(dataResult.json).filter(isRenderableProfileRecord);
			filteredPlayers = playersData.slice();

			if (!playersData.length) {
				setStatus("Arquivo silencioso", "Nenhum eco foi encontrado para esta página.");
				if (playersEl) playersEl.innerHTML = `<div class="empty">Nenhum registro encontrado neste caminho do Codex.</div>`;
				updateCounters();
				renderHubPanel();
				hideSummonBoot();
				return;
			}

			setStatus("Codex desperto", "Os registros de Velarion foram alinhados.");
			if (playersEl) render(filteredPlayers);
			renderRankingsPanel();
			renderHubPanel();
			updateCounters();
			hideSummonBoot();

			const requestedSlug = getRequestedProfileSlug();
			const requestedPlayer = requestedSlug ? findPlayerBySlug(requestedSlug) : null;
			if (requestedPlayer && document.getElementById("detailView")) {
				showDetailInstant(requestedPlayer);
			}

		} catch (e) {
			console.error("[Dados erro]", e);
			setStatus("Falha no Codex", "Não foi possível abrir os registros agora.");
			if (playersEl) {
				playersEl.innerHTML = `<div class="empty">Falha ao abrir os registros do Codex.</div>`;
			}
			hideSummonBoot();
		}
	}


	// ===== JavaScript: Eventos da interface =====
	const searchInput = document.getElementById("search");
	if (searchInput) searchInput.addEventListener("input", debounce(function(e) {
		applySearch(e.target.value);
		updateCounters();
	}, 100));

	const toggleViewButton = document.getElementById("toggleView");
	if (toggleViewButton) toggleViewButton.addEventListener("click", function() {
		if (isTransitionRunning || activePlayerId) return;
		isListMode = !isListMode;
		currentPage = 1;
		render(filteredPlayers);
	});


	const paginationActionsRoot = document.getElementById("paginationActions");
	if (paginationActionsRoot) paginationActionsRoot.addEventListener("click", function(event) {
		const btn = event.target.closest(".page-btn[data-page]");
		if (!btn || btn.disabled || isTransitionRunning || activePlayerId) return;

		const nextPage = Number(btn.dataset.page);
		if (!Number.isFinite(nextPage) || nextPage === currentPage) return;

		currentPage = nextPage;
		render(filteredPlayers);
		document.getElementById("gridView")?.scrollIntoView({ behavior: "smooth", block: "start" });
	});

	const pageSizeRoot = document.getElementById("pageSizeSelect");
	if (pageSizeRoot) pageSizeRoot.addEventListener("change", function(event) {
		const selectedPageSize = Number(event.target.value);
		itemsPerPage = [8, 10, 15, 20].includes(selectedPageSize) ? selectedPageSize : 10;
		currentPage = 1;
		render(filteredPlayers);
		updateCounters();
	});

	const playersRoot = document.getElementById("players");
	if (playersRoot) playersRoot.addEventListener("click", function(event) {
		const card = event.target.closest(".vl-card[data-player-id], .card[data-player-id]");
		if (!card || isTransitionRunning) return;
		openDetail(card.dataset.playerId, card);
	});

	if (playersRoot) playersRoot.addEventListener("keydown", function(event) {
		if (event.key !== "Enter" && event.key !== " ") return;

		const card = event.target.closest(".vl-card[data-player-id], .card[data-player-id]");
		if (!card || isTransitionRunning) return;

		event.preventDefault();
		openDetail(card.dataset.playerId, card);
	});

	// Segurança extra para o card novo: captura cliques mesmo se alguma camada interna
	// ou wrapper visual impedir o listener normal do grid.
	document.addEventListener("click", function(event) {
		const card = event.target.closest("#players .vl-card[data-player-id], #players .card[data-player-id], #players [data-vl-card-slot] .vl-card[data-player-id]");
		if (!card || isTransitionRunning) return;
		const detailView = document.getElementById("detailView");
		if (detailView && detailView.classList.contains("active")) return;
		event.preventDefault();
		openDetail(card.dataset.playerId, card);
	}, true);

	const rankingsRoot = document.getElementById("rankingsList");
	if (rankingsRoot) {
		rankingsRoot.addEventListener("click", function(event) {
			const item = event.target.closest("[data-player-id]");
			if (!item || isTransitionRunning) return;
			openDetail(item.dataset.playerId, item);
		});
		rankingsRoot.addEventListener("keydown", function(event) {
			if (event.key !== "Enter" && event.key !== " ") return;
			const item = event.target.closest("[data-player-id]");
			if (!item || isTransitionRunning) return;
			event.preventDefault();
			openDetail(item.dataset.playerId, item);
		});
	}

	const hubTopRoot = document.querySelector("[data-vl-top-players]");
	if (hubTopRoot) {
		hubTopRoot.addEventListener("click", function(event) {
			const item = event.target.closest("[data-player-id]");
			if (!item || isTransitionRunning) return;
			openDetail(item.dataset.playerId, item);
		});
		hubTopRoot.addEventListener("keydown", function(event) {
			if (event.key !== "Enter" && event.key !== " ") return;
			const item = event.target.closest("[data-player-id]");
			if (!item || isTransitionRunning) return;
			event.preventDefault();
			openDetail(item.dataset.playerId, item);
		});
	}

	window.addEventListener("hashchange", function() {
		const slug = getProfileSlugFromHash();
		if (!slug) {
			if (activePlayerId && !isTransitionRunning) animateCloseDetail();
			return;
		}
		const player = findPlayerBySlug(slug);
		if (player && (!activePlayerId || String(activePlayerId) !== String(player._id))) showDetailInstant(player);
	});

	const detailRoot = document.getElementById("detailView");
	if (detailRoot) detailRoot.addEventListener("click", function(event) {
		if (event.target.id === "backBtn" && !isTransitionRunning) {
			closeDetail();
			try { history.replaceState(null, "", window.location.pathname); } catch(e) {}
		}
	});

	document.addEventListener("keydown", function(event) {
		if (event.key === "Escape" && activePlayerId && !isTransitionRunning) {
			closeDetail();
		}
	});

	document.addEventListener("click", function(event) {
		const thumb = event.target.closest("[data-achievement-thumb]");
		if (!thumb) return;

		const gallery = thumb.closest("[data-achievement-gallery]");
		if (!gallery) return;

		const main = gallery.querySelector("[data-achievement-main]");
		let bg = gallery.querySelector("[data-achievement-banner]") || gallery.querySelector("[data-achievement-background]");
		const titleWrap = gallery.querySelector("[data-achievement-main] .achievement-main-title");
		let titleImg = gallery.querySelector("[data-achievement-title]");
		const name = gallery.querySelector("[data-achievement-name]");
		const date = gallery.querySelector("[data-achievement-date]");

		const banner = thumb.dataset.banner || thumb.dataset.background || "";
		const title = thumb.dataset.title || "";
		const label = thumb.dataset.label || "-";
		const unlockedDate = thumb.dataset.date || "-";

		gallery.style.setProperty("--achievement-color", thumb.dataset.color || "#7c5cff");
		gallery.style.setProperty("--achievement-color-2", thumb.dataset.color2 || "#7c5cff");
		gallery.style.setProperty("--achievement-glow", thumb.dataset.glow || "#7c5cff");

		gallery.querySelectorAll("[data-achievement-thumb]").forEach(function(item) {
			item.classList.toggle("is-active", item === thumb);
		});

		if (banner) {
			main.classList.remove("is-empty");

			if (!bg) {
				bg = document.createElement("img");
				bg.setAttribute("data-achievement-banner", "");
				bg.setAttribute("data-achievement-background", "");
				main.prepend(bg);
			}

			bg.src = banner;
			bg.alt = label;

			const fallback = main.querySelector(".achievement-gallery-main-fallback");
			if (fallback) fallback.remove();
		} else {
			main.classList.add("is-empty");

			if (bg) bg.remove();

			if (!main.querySelector(".achievement-gallery-main-fallback")) {
				main.insertAdjacentHTML(
					"afterbegin",
					`<div class="achievement-gallery-main-fallback">Sem imagem</div>`
				);
			}
		}

		if (title) {
			if (!titleWrap) {
				main.insertAdjacentHTML(
					"beforeend",
					`
						<div class="achievement-main-title">
							<img data-achievement-title src="${escapeHtml(title)}" alt="${escapeHtml(label)}">
						</div>
					`
				);
				titleImg = main.querySelector("[data-achievement-title]");
			} else if (!titleImg) {
				titleWrap.innerHTML = `<img data-achievement-title src="${escapeHtml(title)}" alt="${escapeHtml(label)}">`;
				titleImg = titleWrap.querySelector("[data-achievement-title]");
			} else {
				titleImg.src = title;
				titleImg.alt = label;
			}
		} else if (titleWrap) {
			titleWrap.remove();
		}

		if (name) name.textContent = label;
		if (date) date.textContent = unlockedDate;
	});


	// ===== PERF V7: gradientes sem loop pesado =====
	// A versão anterior mantinha 2 requestAnimationFrame infinitos procurando
	// elementos no DOM a cada frame. Isso continuava rodando depois do loader
	// e podia deixar a página inteira pesada em navegador/PC antigo.
	(function setupLightweightNameGradients(){
		const perfConfig = (window.VELARION_CONFIG && window.VELARION_CONFIG.performance) || {};
		const enabled = perfConfig.animateNameGradients === true;

		if (perfConfig.lowPowerMode !== false) {
			document.documentElement.classList.add("vl-low-power");
		}


		function normalizeGradientElement(el) {
			if (!el || el.dataset.gradientForceReady === "true") return;
			el.dataset.gradientForceReady = "true";
			el.style.setProperty("display", el.classList.contains("list-displayname") ? "block" : "inline-block", "important");
			el.style.setProperty("background-size", "320% 100%", "important");
			el.style.setProperty("background-position", "50% 50%", "important");
			el.style.setProperty("background-clip", "text", "important");
			el.style.setProperty("-webkit-background-clip", "text", "important");
			el.style.setProperty("color", "transparent", "important");
			el.style.setProperty("-webkit-text-fill-color", "transparent", "important");
			el.style.setProperty("animation", "none", "important");
			el.style.removeProperty("will-change");
		}

		function normalizeTextElement(el) {
			if (!el || el.dataset.gradientTextReady === "true") return;
			el.dataset.gradientTextReady = "true";
			const parent = el.closest(".list-displayname.gradient");
			const gradient = parent ? parent.style.getPropertyValue("--display-gradient") : "";
			if (gradient) el.style.setProperty("background-image", gradient, "important");
			el.style.setProperty("background-size", "320% 100%", "important");
			el.style.setProperty("background-position", "50% 50%", "important");
			el.style.setProperty("-webkit-background-clip", "text", "important");
			el.style.setProperty("background-clip", "text", "important");
			el.style.setProperty("-webkit-text-fill-color", "transparent", "important");
			el.style.setProperty("color", "transparent", "important");
		}

		function applyStaticGradientFix() {
			document.querySelectorAll(".title-gradient, .list-displayname.gradient").forEach(normalizeGradientElement);
			document.querySelectorAll(".list-displayname.gradient .list-displayname-text").forEach(normalizeTextElement);
		}

		function ready(fn) {
			if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
			else fn();
		}

		if (!enabled) {
			ready(function(){
				applyStaticGradientFix();
				window.VelarionPerformance = Object.assign(window.VelarionPerformance || {}, {
					nameGradientMode: "static",
					applyStaticGradientFix: applyStaticGradientFix,
					check: function(){
						return {
							loaderDom: document.getElementById("summonBoot"),
							loaderRemoved: !document.getElementById("summonBoot"),
							lowPowerMode: document.documentElement.classList.contains("vl-low-power"),
							nameGradientMode: this.nameGradientMode || "unknown"
						};
					}
				});
			});
			return;
		}

		// Modo opcional: animação limitada e pausada quando a aba não está visível.
		let timer = 0;
		let pos = 0;
		const fps = Math.max(4, Math.min(18, Number(perfConfig.gradientAnimationFps || 10)));
		const interval = Math.round(1000 / fps);

		function tick() {
			if (document.hidden) return;
			pos = (pos + 4.5) % 320;
			document.querySelectorAll(".title-gradient, .list-displayname.gradient").forEach(function(el){
				normalizeGradientElement(el);
				el.style.setProperty("background-position", pos.toFixed(2) + "% 50%", "important");
			});
			document.querySelectorAll(".list-displayname.gradient .list-displayname-text").forEach(function(el){
				normalizeTextElement(el);
				el.style.setProperty("background-position", pos.toFixed(2) + "% 50%", "important");
			});
		}

		function start() {
			if (timer) return;
			applyStaticGradientFix();
			timer = window.setInterval(tick, interval);
		}

		function stop() {
			if (timer) window.clearInterval(timer);
			timer = 0;
		}

		ready(start);
		document.addEventListener("visibilitychange", function(){
			if (document.hidden) stop();
			else start();
		});

		window.VelarionPerformance = Object.assign(window.VelarionPerformance || {}, {
			nameGradientMode: "limited",
			stopNameGradients: stop,
			startNameGradients: start,
			applyStaticGradientFix: applyStaticGradientFix,
			check: function(){
				return {
					loaderDom: document.getElementById("summonBoot"),
					loaderRemoved: !document.getElementById("summonBoot"),
					lowPowerMode: document.documentElement.classList.contains("vl-low-power"),
					nameGradientMode: this.nameGradientMode || "unknown"
				};
			}
		});
	})();


	// Inicializa apenas nas páginas que realmente usam dados reais.
	if (document.body?.dataset?.vlDataPage) {
		load();
	}

	// ===== REDESIGN 2025: remover somente sidebars legadas, mantendo botão voltar do Perfil =====
	function removeLegacyChrome() {
		document.querySelectorAll('.archive-side-hud, .gacha-sidebar, .archive-sidebar, .category-sidebar').forEach(function(el) {
			el.remove();
		});
	}
	removeLegacyChrome();
	setTimeout(removeLegacyChrome, 900);

})();
