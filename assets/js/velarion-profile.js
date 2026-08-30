/* ======================================================================
   Velarion Profile Detail Renderer
   ====================================================================== */
(function() {
  "use strict";

  const DEFAULT_AVATAR = "https://mc-heads.net/avatar/Steve/256";
  const DEFAULT_BANNER = "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1200&q=80";
  const DEFAULT_CHARACTER = "";

  /* ======================================================================
     CARD FX LOADER — camada visual externa ao card oficial

     Estrutura esperada do projeto:
       assets/js/velarion-profile.js
       assets/js/velarion-card-fx.js
       assets/css/velarion-card-fx.css

     O card oficial (velarion-card.js / velarion-card.css) permanece intacto.
     ====================================================================== */
  const PROFILE_SCRIPT_URL = (() => {
    try {
      const current = document.currentScript;
      if (current && current.src) return new URL(current.src, location.href);

      /* Fallback para casos em que document.currentScript não esteja disponível. */
      const scripts = Array.from(document.scripts || []);
      const profileScript = scripts.reverse().find((script) => /(?:^|\/)velarion-profile(?:\.min)?\.js(?:[?#]|$)/i.test(script.src || ""));
      return profileScript?.src ? new URL(profileScript.src, location.href) : null;
    } catch (e) {
      return null;
    }
  })();

  function inheritProfileVersion(url) {
    if (!url || !PROFILE_SCRIPT_URL?.search) return url;
    try {
      const parsed = new URL(url, location.href);
      parsed.search = PROFILE_SCRIPT_URL.search;
      return parsed.href;
    } catch (e) {
      return url;
    }
  }

  function getProfileFxAssetUrl(type) {
    try {
      if (!PROFILE_SCRIPT_URL) {
        return type === "css"
          ? "../assets/css/velarion-card-fx.css"
          : "../assets/js/velarion-card-fx.js";
      }

      if (type === "js") {
        return inheritProfileVersion(new URL("velarion-card-fx.js", PROFILE_SCRIPT_URL).href);
      }

      /*
       * velarion-profile.js mora em assets/js, enquanto folhas de estilo
       * ficam em assets/css. Não trate o CSS como arquivo irmão do JS.
       */
      const scriptDir = new URL("./", PROFILE_SCRIPT_URL);
      const inJsDirectory = /\/js\/$/i.test(scriptDir.pathname);
      const cssUrl = inJsDirectory
        ? new URL("../css/velarion-card-fx.css", scriptDir)
        : new URL("velarion-card-fx.css", scriptDir);

      return inheritProfileVersion(cssUrl.href);
    } catch (e) {
      return type === "css" ? "../css/velarion-card-fx.css" : "velarion-card-fx.js";
    }
  }

  function ensureProfileCardFxAssets() {
    const cssId = "velarion-card-fx-css";
    const jsId = "velarion-card-fx-js";

    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = getProfileFxAssetUrl("css");
      link.addEventListener("error", () => {
        console.warn("[VelarionProfile] Não foi possível carregar velarion-card-fx.css em assets/css.");
      }, { once: true });
      document.head.appendChild(link);
    }

    if (window.VelarionCardFX) {
      return Promise.resolve(window.VelarionCardFX);
    }

    if (window.__velarionCardFxLoadPromise) {
      return window.__velarionCardFxLoadPromise;
    }

    window.__velarionCardFxLoadPromise = new Promise((resolve) => {
      let script = document.getElementById(jsId);

      const finish = () => resolve(window.VelarionCardFX || null);

      if (!script) {
        script = document.createElement("script");
        script.id = jsId;
        script.src = getProfileFxAssetUrl("js");
        script.async = true;
        script.addEventListener("load", finish, { once: true });
        script.addEventListener("error", () => {
          console.warn("[VelarionProfile] Não foi possível carregar velarion-card-fx.js em assets/js.");
          finish();
        }, { once: true });
        document.head.appendChild(script);
      } else {
        script.addEventListener("load", finish, { once: true });
        window.setTimeout(finish, 1200);
      }
    });

    return window.__velarionCardFxLoadPromise;
  }

  function scheduleProfileCardFx(root) {
    requestAnimationFrame(() => {
      ensureProfileCardFxAssets().then((fx) => {
        try {
          fx?.refresh?.(root || document);
        } catch (error) {
          console.warn("[VelarionProfile] Falha ao inicializar efeitos do card.", error);
        }
      });
    });
  }

  /* Carrega o módulo uma vez; ele observa cards que forem montados depois. */
  ensureProfileCardFxAssets();


  /* ======================================================================
     PROFILE COMPONENT MODULE LOADER

     Mantém velarion-profile.js como coordenador. Os CSS são inseridos logo
     após velarion-profile.css e herdam a query string do script principal.
     Os runtimes JS são carregados uma única vez e hidratam o DOM existente.
     ====================================================================== */
  const PROFILE_COMPONENT_ASSETS = [
    {
      key: "core",
      jsId: "velarion-profile-core-js",
      js: "velarion-profile-core.js",
      global: "VelarionProfileCore",
      jsOrder: 10
    },
    {
      key: "document",
      cssId: "velarion-profile-document-css",
      css: "velarion-profile-document.css",
      cssOrder: 20,
      jsId: "velarion-profile-document-js",
      js: "velarion-profile-document.js",
      global: "VelarionProfileDocument",
      jsOrder: 20
    },
    {
      key: "progression",
      cssId: "velarion-profile-progression-css",
      css: "velarion-profile-progression.css",
      cssOrder: 30,
      jsId: "velarion-profile-progression-js",
      js: "velarion-profile-progression.js",
      global: "VelarionProfileProgression",
      jsOrder: 30
    },
    {
      key: "username",
      cssId: "velarion-profile-username-css",
      css: "velarion-profile-username.css",
      cssOrder: 40,
      jsId: "velarion-profile-username-js",
      js: "velarion-profile-username.js",
      global: "VelarionProfileUsername",
      jsOrder: 40
    },
    {
      key: "stats",
      cssId: "velarion-profile-stats-css",
      css: "velarion-profile-stats.css",
      cssOrder: 50,
      jsId: "velarion-profile-stats-js",
      js: "velarion-profile-stats.js",
      global: "VelarionProfileStats",
      jsOrder: 50
    },
    {
      key: "cargo",
      cssId: "velarion-profile-cargo-css",
      css: "velarion-profile-cargo.css",
      cssOrder: 60,
      jsId: "velarion-profile-cargo-js",
      js: "velarion-profile-cargo.js",
      global: "VelarionProfileCargo",
      jsOrder: 60
    },
    {
      key: "rank",
      cssId: "velarion-profile-rank-css",
      css: "velarion-profile-rank.css",
      cssOrder: 70,
      jsId: "velarion-profile-rank-js",
      js: "velarion-profile-rank.js",
      global: "VelarionProfileRank",
      jsOrder: 70
    },
    {
      key: "public-record",
      cssId: "velarion-profile-public-record-css",
      css: "velarion-profile-public-record.css",
      cssOrder: 90,
      jsId: "velarion-profile-public-record-js",
      js: "velarion-profile-public-record.js",
      global: "VelarionProfilePublicRecord",
      jsOrder: 90
    }
  ];

  function getProfileComponentAssetUrl(fileName, type) {
    try {
      if (!PROFILE_SCRIPT_URL) {
        return type === "css" ? `../assets/css/${fileName}` : `../assets/js/${fileName}`;
      }

      const scriptDir = new URL("./", PROFILE_SCRIPT_URL);
      if (type === "js") return inheritProfileVersion(new URL(fileName, scriptDir).href);

      const inJsDirectory = /\/js\/$/i.test(scriptDir.pathname);
      const cssUrl = inJsDirectory
        ? new URL(`../css/${fileName}`, scriptDir)
        : new URL(fileName, scriptDir);
      return inheritProfileVersion(cssUrl.href);
    } catch (error) {
      return type === "css" ? `../assets/css/${fileName}` : `../assets/js/${fileName}`;
    }
  }

  function findProfileStylesheetAnchor() {
    const links = Array.from(document.querySelectorAll('link[rel~="stylesheet"][href]'));
    return links.find((link) => /(?:^|\/)velarion-profile(?:\.min)?\.css(?:[?#]|$)/i.test(link.href || "")) || null;
  }

  function ensureProfileComponentStyles() {
    let anchor = findProfileStylesheetAnchor();

    PROFILE_COMPONENT_ASSETS
      .filter((asset) => asset.css)
      .slice()
      .sort((a, b) => (a.cssOrder || 0) - (b.cssOrder || 0))
      .forEach((asset) => {
      let link = document.getElementById(asset.cssId);
      if (!link) {
        link = document.createElement("link");
        link.id = asset.cssId;
        link.rel = "stylesheet";
        link.href = getProfileComponentAssetUrl(asset.css, "css");
        link.addEventListener("error", () => {
          console.warn(`[VelarionProfile] Não foi possível carregar ${asset.css}.`);
        }, { once: true });

        if (anchor?.parentNode) anchor.parentNode.insertBefore(link, anchor.nextSibling);
        else document.head.appendChild(link);
      }
      anchor = link;
    });
  }

  function ensureProfileComponentScript(asset) {
    if (!asset?.js) return Promise.resolve(null);
    if (window[asset.global]) return Promise.resolve(window[asset.global]);

    const promiseKey = `__velarionProfileModule_${asset.key.replace(/[^a-z0-9]+/gi, "_")}`;
    if (window[promiseKey]) return window[promiseKey];

    window[promiseKey] = new Promise((resolve) => {
      let script = document.getElementById(asset.jsId);
      const finish = () => {
        const api = window[asset.global] || null;
        try { api?.refresh?.(document); } catch (error) {
          console.warn(`[VelarionProfile] Falha ao inicializar ${asset.js}.`, error);
        }
        resolve(api);
      };

      if (!script) {
        script = document.createElement("script");
        script.id = asset.jsId;
        script.src = getProfileComponentAssetUrl(asset.js, "js");
        script.async = false;
        script.addEventListener("load", finish, { once: true });
        script.addEventListener("error", () => {
          console.warn(`[VelarionProfile] Não foi possível carregar ${asset.js}.`);
          finish();
        }, { once: true });
        document.head.appendChild(script);
      } else {
        script.addEventListener("load", finish, { once: true });
        window.setTimeout(finish, 1200);
      }
    });

    return window[promiseKey];
  }

  let profileComponentsReadyPromise = null;

  function ensureProfileComponentAssets() {
    ensureProfileComponentStyles();
    if (!profileComponentsReadyPromise) {
      profileComponentsReadyPromise = PROFILE_COMPONENT_ASSETS
        .filter((asset) => asset.js)
        .slice()
        .sort((a, b) => (a.jsOrder || 0) - (b.jsOrder || 0))
        .reduce(
          (chain, asset) => chain.then(() => ensureProfileComponentScript(asset)),
          Promise.resolve()
        );
    }
    return profileComponentsReadyPromise;
  }

  function refreshProfileComponentModules(root) {
    const scope = root || document;
    return ensureProfileComponentAssets().then(() => {
      window.VelarionProfileDocument?.hydrate?.(scope);
      window.VelarionProfileProgression?.hydrate?.(scope);
      window.VelarionProfilePublicRecord?.hydrate?.(scope);
    });
  }

  function scheduleProfileComponentRefresh(root) {
    requestAnimationFrame(() => {
      refreshProfileComponentModules(root || document).catch((error) => {
        console.warn("[VelarionProfile] Falha ao atualizar módulos do perfil.", error);
      });
    });
  }

  function setupProfileDocumentColorEffects(root) {
    const runtime = window.VelarionProfileDocument;
    if (runtime && typeof runtime.refresh === "function") {
      runtime.refresh(root || document);
      return;
    }
    ensureProfileComponentAssets().then(() => window.VelarionProfileDocument?.refresh?.(root || document));
  }

  function profileCore() {
    const api = window.VelarionProfileCore;
    if (!api) throw new Error("VelarionProfileCore ainda não foi carregado.");
    return api;
  }

  function pick(ctx, name, fallback) { return profileCore().pick(ctx, name, fallback); }
  function escapeHtml(value) { return profileCore().escapeHtml(value); }
  function cleanValue(value) { return profileCore().cleanValue(value); }
  function getMediaSource(value) { return profileCore().getMediaSource(value); }
  function stripMinecraftCodes(value) { return profileCore().stripMinecraftCodes(value); }
  function minecraftToHtml(value) { return profileCore().minecraftToHtml(value); }
  function normalizeHexColor(value) { return profileCore().normalizeHexColor(value); }

  function getByPath(obj, paths) { return profileCore().getByPath(obj, paths); }
  function getDisplayNameFallback(player) { return profileCore().getDisplayNameFallback(player); }
  function getUsernameFallback(player) { return profileCore().getUsernameFallback(player); }
  function getCardTitleFallback(player) { return profileCore().getCardTitleFallback(player); }
  function getImageFallback(player, type) { return profileCore().getImageFallback(player, type); }
  function getPlayerLevel(player) { return profileCore().getPlayerLevel(player); }
  function getTierName(player) { return profileCore().getTierName(player); }

  function findAchievementDefinitionDeep(root, achievementId) {
    const wanted = cleanValue(achievementId);
    if (!wanted || !root || typeof root !== "object") return null;

    const visited = new WeakSet();
    const queue = [root];

    while (queue.length) {
      const current = queue.shift();
      if (!current || typeof current !== "object") continue;
      if (visited.has(current)) continue;
      visited.add(current);

      if (!Array.isArray(current)) {
        if (Object.prototype.hasOwnProperty.call(current, wanted)) {
          const direct = current[wanted];
          if (direct && typeof direct === "object") return direct;
        }

        const currentId = cleanValue(
          current.id ||
          current.achievement_id ||
          current.achievementId ||
          current.badge_id ||
          current.badgeId
        );
        if (currentId && currentId === wanted) return current;
      }

      const values = Array.isArray(current) ? current : Object.values(current);
      for (const value of values) {
        if (value && typeof value === "object") queue.push(value);
      }
    }

    return null;
  }

  function getAchievementEntries(player) {
    const raw = player?.badges?.achievements;
    if (!Array.isArray(raw)) return [];

    return raw
      .map((entry) => {
        if (typeof entry === "string" || typeof entry === "number") {
          return { id: cleanValue(entry), unlocked_at: "" };
        }
        if (!entry || typeof entry !== "object") return null;
        return {
          ...entry,
          id: cleanValue(
            entry.id ||
            entry.achievement_id ||
            entry.achievementId ||
            entry.badge_id ||
            entry.badgeId
          ),
          unlocked_at: cleanValue(
            entry.unlocked_at ||
            entry.unlockedAt ||
            entry.created_at ||
            entry.createdAt
          )
        };
      })
      .filter((entry) => entry?.id);
  }

  function getAchievementVisualData(entry, ctx) {
    const definition = findAchievementDefinitionDeep(ctx?.extensionsData || {}, entry.id) || {};
    const website = definition?.website && typeof definition.website === "object"
      ? definition.website
      : {};

    const color = normalizeHexColor(
      website.color ||
      definition.color ||
      "#7b8190"
    );
    const color2 = normalizeHexColor(
      website.color2 ||
      definition.color2 ||
      color
    );
    const glow = normalizeHexColor(
      website.glow ||
      definition.glow ||
      color
    );

    const label = cleanValue(
      website.label ||
      website.badge_text ||
      website.title_text ||
      definition.label ||
      definition.name ||
      entry.label ||
      entry.name ||
      entry.id
    );

    const description = cleanValue(
      website.description ||
      definition.description ||
      definition.profile?.lore ||
      entry.description ||
      ""
    );

    const icon = cleanValue(
      website.icon ||
      website.emblem ||
      definition.icon ||
      definition.emblem ||
      ""
    );

    const titleImage = cleanValue(
      website.title ||
      website.title_image ||
      website.titleImage ||
      ""
    );

    const banner = cleanValue(
      website.banner ||
      definition.banner ||
      ""
    );

    return {
      id: entry.id,
      label,
      description,
      icon,
      titleImage,
      banner,
      color,
      color2,
      glow,
      unlockedAt: entry.unlocked_at || ""
    };
  }

  function buildAchievementsMedalsHtml(player, ctx) {
    const entries = getAchievementEntries(player);
    const achievements = entries.map((entry) => getAchievementVisualData(entry, ctx));

    if (!achievements.length) {
      return `
        <section class="vl-achievements-card vl-achievements-card--source" data-achievement-count="0">
          <div class="vl-achievements-empty">Nenhuma conquista exibida.</div>
        </section>`;
    }

    const medals = achievements.map((item, index) => {
      const safeId = escapeHtml(item.id);
      const safeLabel = escapeHtml(item.label || item.id);
      const safeDescription = escapeHtml(item.description || "");
      const safeIcon = escapeHtml(item.icon || "");
      const safeTitle = escapeHtml(item.titleImage || "");
      const safeBanner = escapeHtml(item.banner || "");
      const safeUnlocked = escapeHtml(item.unlockedAt || "");
      const safeColor = escapeHtml(item.color);
      const safeColor2 = escapeHtml(item.color2);
      const safeGlow = escapeHtml(item.glow);

      return `
        <button
          class="achievement-gallery-thumb vl-achievement-medal-source"
          type="button"
          data-vl-achievement-id="${safeId}"
          data-vl-achievement-label="${safeLabel}"
          data-vl-achievement-description="${safeDescription}"
          data-vl-achievement-icon="${safeIcon}"
          data-vl-achievement-title="${safeTitle}"
          data-vl-achievement-banner="${safeBanner}"
          data-vl-achievement-unlocked="${safeUnlocked}"
          aria-label="${safeLabel}"
          aria-expanded="false"
          style="
            --vl-medal-color:${safeColor};
            --vl-medal-color-2:${safeColor2};
            --vl-medal-glow:${safeGlow};
            --achievement-color:${safeColor};
            --achievement-color-2:${safeColor2};
            --achievement-glow:${safeGlow};
          "
        >
          ${safeIcon
            ? `<img src="${safeIcon}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove();">`
            : `<span class="vl-achievement-medal-source__fallback" aria-hidden="true">✦</span>`
          }
        </button>`;
    }).join("");

    return `
      <section class="vl-achievements-card vl-achievements-card--source" data-achievement-count="${achievements.length}">
        <div class="achievement-gallery-list" aria-label="Medalhas de conquistas">
          ${medals}
        </div>

        <section class="vl-achievement-source-preview" aria-hidden="true">
          <button class="vl-achievement-preview-close" type="button" data-vl-achievement-close="1" aria-label="Fechar banner da conquista">
            <span aria-hidden="true">×</span>
          </button>
          <div class="vl-achievement-source-preview__banner"></div>
          <div class="vl-achievement-source-preview__body">
            <div class="vl-achievement-source-preview__icon"></div>
            <div class="vl-achievement-source-preview__copy">
              <strong></strong>
              <p></p>
              <small></small>
            </div>
          </div>
        </section>
      </section>`;
  }

  function buildMetricChip(label, value, note, token) {
    const metricToken = cleanValue(token || label).toLowerCase();
    const sigil = metricToken === "points" ? "✦" : metricToken === "xp" ? "XP" : "•";
    return `
      <div class="vl-profile-metric vl-profile-metric--featured" data-metric="${escapeHtml(metricToken)}">
        <div class="vl-profile-metric__copy">
          <small>${escapeHtml(label)}</small>
          <strong>${escapeHtml(value)}</strong>
          ${note ? `<span>${escapeHtml(note)}</span>` : ""}
        </div>
        <div class="vl-profile-metric__sigil" aria-hidden="true"><b>${escapeHtml(sigil)}</b></div>
      </div>`;
  }

  function makeHelpers(ctx) {
    return {
      escapeHtml: pick(ctx, "escapeHtml", escapeHtml),
      normalizeHexColor: pick(ctx, "normalizeHexColor", normalizeHexColor),
      stripMinecraftCodes: pick(ctx, "stripMinecraftCodes", stripMinecraftCodes),
      getDisplayName: pick(ctx, "getDisplayName", getDisplayNameFallback)
    };
  }

  const WEBSITE_PANEL_URL =
    "https://kazimuhwaribedrock-extensions-default-rtdb.firebaseio.com/website_panel.json";

  /* V20.43 — cópia local garantida do website_panel enviado pelo usuário.
     O Firebase continua podendo sobrescrever/atualizar os dados quando acessível,
     mas o perfil não depende de CORS/file:// para obter as cores corretas. */
  const WEBSITE_PANEL_EMBEDDED = {"social_fallback":{"custom":{"enabled":true,"type":"website_social","website":{"aura":true,"banner":"","bio":"Link personalizado","color":"#8B5CF6","color2":"#EC4899","emblem":"https://raw.githubusercontent.com/Kazimuhwari-br/Velarion-Lumen-Website-Main/refs/heads/main/assets/img/social/custom_icon.png","glow":"#A855F7","gradient":"linear-gradient(135deg, #7C3AED 0%, #8B5CF6 48%, #EC4899 100%)","icon":"","intensity":0.28,"label":"Personalizado","particles":true,"shimmer":true,"title":"Link personalizado"}},"default":{"enabled":true,"type":"website_social","website":{"aura":true,"banner":"","bio":"Link externo","color":"#6D7CFF","color2":"#9B8CFF","emblem":"https://raw.githubusercontent.com/Kazimuhwari-br/Velarion-Lumen-Website-Main/refs/heads/main/assets/img/social/default_icon.png","glow":"#7B86FF","gradient":"linear-gradient(135deg, #4F5FD7 0%, #6D7CFF 52%, #9B8CFF 100%)","icon":"","intensity":0.25,"label":"Website","particles":false,"shimmer":true,"title":"Link externo"}},"discord_invite":{"enabled":true,"type":"website_social","website":{"aura":true,"banner":"","bio":"Entre no servidor pelo Discord","color":"#5865F2","color2":"#7289DA","emblem":"https://raw.githubusercontent.com/Kazimuhwari-br/Velarion-Lumen-Website-Main/refs/heads/main/assets/img/social/discord_icon.png","glow":"#5865F2","gradient":"linear-gradient(135deg, #404EED 0%, #5865F2 55%, #7289DA 100%)","icon":"","intensity":0.3,"label":"Discord","particles":true,"shimmer":true,"title":"Convite do Discord"}},"twitch":{"enabled":true,"type":"website_social","website":{"aura":true,"banner":"","bio":"Acompanhe as transmissões ao vivo","color":"#9146FF","color2":"#C084FC","emblem":"https://raw.githubusercontent.com/Kazimuhwari-br/Velarion-Lumen-Website-Main/refs/heads/main/assets/img/social/twitch_icon.png","glow":"#A970FF","gradient":"linear-gradient(135deg, #6441A5 0%, #9146FF 55%, #C084FC 100%)","icon":"","intensity":0.32,"label":"Twitch","particles":true,"shimmer":true,"title":"Canal da Twitch"}},"twitter":{"enabled":true,"type":"website_social","website":{"aura":true,"banner":"","bio":"Acompanhe no X","color":"#FFFFFF","color2":"#8A8A8A","emblem":"https://raw.githubusercontent.com/Kazimuhwari-br/Velarion-Lumen-Website-Main/refs/heads/main/assets/img/social/x_icon.png","glow":"#FFFFFF","gradient":"linear-gradient(135deg, #080808 0%, #171717 55%, #3A3A3A 100%)","icon":"","intensity":0.24,"label":"X","particles":false,"shimmer":true,"title":"Perfil no X"}},"x":{"enabled":true,"type":"website_social","website":{"aura":true,"banner":"","bio":"Acompanhe no X","color":"#FFFFFF","color2":"#8A8A8A","emblem":"https://raw.githubusercontent.com/Kazimuhwari-br/Velarion-Lumen-Website-Main/refs/heads/main/assets/img/social/x_icon.png","glow":"#FFFFFF","gradient":"linear-gradient(135deg, #080808 0%, #171717 55%, #3A3A3A 100%)","icon":"","intensity":0.24,"label":"X","particles":false,"shimmer":true,"title":"Perfil no X"}},"xbox":{"enabled":true,"type":"website_social","website":{"aura":true,"banner":"","bio":"Perfil e atividades no Xbox","color":"#107C10","color2":"#52B043","emblem":"https://raw.githubusercontent.com/Kazimuhwari-br/Velarion-Lumen-Website-Main/refs/heads/main/assets/img/social/xbox_icon.png","glow":"#2ECC40","gradient":"linear-gradient(135deg, #075E0B 0%, #107C10 55%, #52B043 100%)","icon":"","intensity":0.28,"label":"Xbox","particles":true,"shimmer":false,"title":"Perfil do Xbox"}},"youtube":{"enabled":true,"type":"website_social","website":{"aura":true,"banner":"","bio":"Acompanhe os vídeos e conteúdos","color":"#FF0033","color2":"#FF5A5F","emblem":"https://raw.githubusercontent.com/Kazimuhwari-br/Velarion-Lumen-Website-Main/refs/heads/main/assets/img/social/youtube_icon.png","glow":"#FF0033","gradient":"linear-gradient(135deg, #B00020 0%, #FF0033 52%, #FF5A5F 100%)","icon":"","intensity":0.3,"label":"YouTube","particles":false,"shimmer":true,"title":"Canal do YouTube"}}}};

  let websitePanelCache = null;
  let websitePanelPromise = null;

  function getWebsitePanelFromContext(ctx) {
    const candidates = [
      ctx?.websitePanel,
      ctx?.website_panel,
      ctx?.extensionsData?.website_panel,
      ctx?.extensionsData?.websitePanel,
      window.VelarionWebsitePanel,
      window.website_panel,
      WEBSITE_PANEL_EMBEDDED
    ];

    return candidates.find((item) => item && typeof item === "object" && !Array.isArray(item)) || WEBSITE_PANEL_EMBEDDED;
  }

  function loadWebsitePanelJsonp() {
    return new Promise((resolve, reject) => {
      const callbackName =
        `__vlWebsitePanelJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const script = document.createElement("script");
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("website_panel JSONP timeout"));
      }, 8000);

      const cleanup = () => {
        window.clearTimeout(timeout);
        try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
        script.remove();
      };

      window[callbackName] = (data) => {
        cleanup();
        resolve(data && typeof data === "object" ? data : {});
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("website_panel JSONP load failed"));
      };

      script.async = true;
      script.src =
        `${WEBSITE_PANEL_URL}?callback=${encodeURIComponent(callbackName)}&v=${Date.now()}`;
      document.head.appendChild(script);
    });
  }

  function mergeSocialFallbackSources(...sources) {
    const merged = {};

    sources.forEach((source) => {
      if (!source || typeof source !== "object" || Array.isArray(source)) return;

      Object.entries(source).forEach(([key, definition]) => {
        if (!definition || typeof definition !== "object" || Array.isArray(definition)) return;

        const previous = merged[key] && typeof merged[key] === "object" ? merged[key] : {};
        const previousWebsite = previous.website && typeof previous.website === "object" ? previous.website : {};
        const nextWebsite = definition.website && typeof definition.website === "object" ? definition.website : {};

        merged[key] = {
          ...previous,
          ...definition,
          website: {
            ...previousWebsite,
            ...nextWebsite
          }
        };
      });
    });

    return merged;
  }

  async function loadWebsitePanel(ctx) {
    if (websitePanelPromise) return websitePanelPromise;

    const contextPanel = (() => {
      const candidates = [
        ctx?.websitePanel,
        ctx?.website_panel,
        ctx?.extensionsData?.website_panel,
        ctx?.extensionsData?.websitePanel,
        window.VelarionWebsitePanel,
        window.website_panel,
        websitePanelCache
      ];

      return candidates.find((item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        item !== WEBSITE_PANEL_EMBEDDED
      ) || {};
    })();

    const mergePanel = (remoteData) => {
      const remote =
        remoteData && typeof remoteData === "object" && !Array.isArray(remoteData)
          ? remoteData
          : {};

      return {
        ...WEBSITE_PANEL_EMBEDDED,
        ...contextPanel,
        ...remote,
        social_fallback: mergeSocialFallbackSources(
          WEBSITE_PANEL_EMBEDDED.social_fallback || {},
          contextPanel.social_fallback || {},
          remote.social_fallback || {}
        )
      };
    };

    websitePanelPromise = (async () => {
      try {
        const response = await fetch(`${WEBSITE_PANEL_URL}?v=${Date.now()}`, {
          method: "GET",
          mode: "cors",
          cache: "no-store",
          credentials: "omit",
          headers: { "Accept": "application/json" }
        });

        if (!response.ok) {
          throw new Error(`website_panel HTTP ${response.status}`);
        }

        const data = await response.json();
        websitePanelCache = mergePanel(data);
        return websitePanelCache;
      } catch (fetchError) {
        try {
          const data = await loadWebsitePanelJsonp();
          websitePanelCache = mergePanel(data);
          return websitePanelCache;
        } catch (jsonpError) {
          console.warn(
            "[VelarionProfile] website_panel remoto indisponível; usando dados locais.",
            { fetchError, jsonpError }
          );

          websitePanelCache = mergePanel({});
          return websitePanelCache;
        }
      } finally {
        websitePanelPromise = null;
      }
    })();

    return websitePanelPromise;
  }

  function normalizeSocialKey(value) {
    return cleanValue(value)
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-+/g, "_");
  }

  function socialKeyVariants(key) {
    const raw = normalizeSocialKey(key);
    const variants = new Set([raw]);

    variants.add(raw.replace(/_invite$/i, ""));
    variants.add(raw.replace(/_url$/i, ""));
    variants.add(raw.replace(/_link$/i, ""));
    variants.add(raw.replace(/^website_/, ""));

    if (raw === "twitter") variants.add("x");
    if (raw === "x") variants.add("twitter");
    if (raw === "discord_invite") variants.add("discord");
    if (raw === "youtube") variants.add("yt");
    if (raw === "twitch") variants.add("stream");

    return [...variants].filter(Boolean);
  }

  function getSocialFallbackRoot(panel) {
    const source =
      panel?.social_fallback ||
      panel?.socialFallback ||
      panel?.website?.social_fallback ||
      {};

    return source && typeof source === "object" && !Array.isArray(source)
      ? source
      : {};
  }

  function socialDefinitionAliases(entry, key) {
    const website = entry?.website && typeof entry.website === "object"
      ? entry.website
      : {};

    const values = [
      key,
      entry?.id,
      entry?.key,
      entry?.name,
      entry?.social,
      entry?.website_social,
      entry?.websiteSocial,
      website?.id,
      website?.key,
      website?.social,
      website?.website_social
    ];

    const arrays = [
      entry?.aliases,
      entry?.keys,
      entry?.social_keys,
      entry?.website_social_keys,
      website?.aliases,
      website?.keys
    ];

    arrays.forEach((list) => {
      if (Array.isArray(list)) values.push(...list);
    });

    return values.map(normalizeSocialKey).filter(Boolean);
  }

  function makeSocialFallbackIndex(root) {
    const index = new Map();

    Object.entries(root || {}).forEach(([definitionKey, definition]) => {
      if (!definition || typeof definition !== "object" || Array.isArray(definition)) return;

      socialDefinitionAliases(definition, definitionKey).forEach((alias) => {
        if (alias && !index.has(alias)) {
          index.set(alias, { key: definitionKey, data: definition });
        }
      });
    });

    return index;
  }

  function getSocialVisualDefinition(definition) {
    if (!definition || typeof definition !== "object" || Array.isArray(definition)) return {};

    const rootVisual = definition.visual && typeof definition.visual === "object" && !Array.isArray(definition.visual)
      ? definition.visual
      : {};
    const rootStyle = definition.style && typeof definition.style === "object" && !Array.isArray(definition.style)
      ? definition.style
      : {};
    const website = definition.website && typeof definition.website === "object" && !Array.isArray(definition.website)
      ? definition.website
      : {};

    /* V20.55 — social_fallback é livre por nome: campos visuais podem ficar
       diretamente na definição, em visual/style ou em website. website vence. */
    return {
      ...definition,
      ...rootVisual,
      ...rootStyle,
      ...website
    };
  }

  function resolveSocialFallback(panel, socialKey, socialValue) {
    const root = getSocialFallbackRoot(panel);
    const index = makeSocialFallbackIndex(root);
    const key = normalizeSocialKey(socialKey);

    const valueObject =
      socialValue && typeof socialValue === "object" && !Array.isArray(socialValue)
        ? socialValue
        : {};

    const explicitType = normalizeSocialKey(
      valueObject.type ||
      valueObject.social_type ||
      valueObject.website_social_type
    );

    /* V20.55 — sincronização genérica por NOME.
       Qualquer chave criada em profilePlayers.<id>.website_social recebe
       automaticamente o visual da chave homônima em website_panel.social_fallback,
       sem precisar cadastrar a rede no JavaScript. */
    if (key && index.has(key)) {
      const match = index.get(key);
      return { ...match, source: normalizeSocialKey(match.key) === key ? "name-sync" : "definition-alias" };
    }

    /* Variações continuam disponíveis para compatibilidade legada. */
    for (const variant of socialKeyVariants(key)) {
      if (!variant || variant === key || !index.has(variant)) continue;
      return { ...index.get(variant), source: "key-variant" };
    }

    /* Type explícito pode apontar para qualquer nome visual existente. */
    if (explicitType && explicitType !== "website_social" && index.has(explicitType)) {
      return { ...index.get(explicitType), source: "explicit-type" };
    }

    /* Fallback apenas quando realmente não houver definição com o mesmo nome. */
    if (index.has("default")) {
      return { ...index.get("default"), source: "default" };
    }

    return null;
  }

  function getWebsiteSocialEntries(player) {
    const source =
      player?.website_social && typeof player.website_social === "object" && !Array.isArray(player.website_social)
        ? player.website_social
        : {};

    return Object.entries(source)
      .map(([key, raw]) => {
        const valueObject =
          raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;

        const value = cleanValue(
          valueObject?.value ??
          valueObject?.url ??
          valueObject?.href ??
          valueObject?.username ??
          raw
        );

        if (!value) return null;

        return {
          key,
          raw,
          value,
          type: cleanValue(
            valueObject?.type ||
            valueObject?.social_type ||
            valueObject?.website_social_type
          )
        };
      })
      .filter(Boolean);
  }

  /* V20.54 — avatar social por jogador.
     website_social permanece intacto; o sincronizador privado grava apenas
     website_social_cache.<rede>.icon no próprio registro do jogador. */
  function getWebsiteSocialCacheRoot(player) {
    const source =
      player?.website_social_cache ||
      player?.websiteSocialCache ||
      {};

    return source && typeof source === "object" && !Array.isArray(source)
      ? source
      : {};
  }

  function resolveWebsiteSocialCacheEntry(player, ...candidateKeys) {
    const root = getWebsiteSocialCacheRoot(player);
    const variants = new Set();

    candidateKeys.forEach((candidateKey) => {
      socialKeyVariants(candidateKey).forEach((variant) => variants.add(variant));
      const normalized = normalizeSocialKey(candidateKey);
      if (normalized) variants.add(normalized);
    });

    for (const variant of variants) {
      const exact = root?.[variant];
      if (typeof exact === "string") return { key: variant, data: { icon: exact } };
      if (exact && typeof exact === "object" && !Array.isArray(exact)) {
        return { key: variant, data: exact };
      }
    }

    for (const [cacheKey, cacheValue] of Object.entries(root)) {
      if (!variants.has(normalizeSocialKey(cacheKey))) continue;
      if (typeof cacheValue === "string") return { key: cacheKey, data: { icon: cacheValue } };
      if (cacheValue && typeof cacheValue === "object" && !Array.isArray(cacheValue)) {
        return { key: cacheKey, data: cacheValue };
      }
    }

    return null;
  }

  function getWebsiteSocialCachedIcon(player, ...candidateKeys) {
    const resolved = resolveWebsiteSocialCacheEntry(player, ...candidateKeys);
    const data = resolved?.data || {};
    return cleanValue(
      data.icon ||
      data.avatar ||
      data.profile_image_url ||
      data.profile_image ||
      data.image ||
      ""
    );
  }

  function buildSocialHref(key, value) {
    const raw = cleanValue(value);
    if (!raw) return "";

    if (/^(?:https?:)?\/\//i.test(raw)) {
      return raw.startsWith("//") ? `https:${raw}` : raw;
    }

    const normalizedKey = normalizeSocialKey(key);

    if (normalizedKey === "discord_invite" || normalizedKey === "discord") {
      return `https://discord.gg/${encodeURIComponent(raw.replace(/^discord\.gg\//i, ""))}`;
    }
    if (normalizedKey === "twitch") {
      return `https://www.twitch.tv/${encodeURIComponent(raw.replace(/^@/, ""))}`;
    }
    if (normalizedKey === "twitter" || normalizedKey === "x") {
      return `https://x.com/${encodeURIComponent(raw.replace(/^@/, ""))}`;
    }
    if (normalizedKey === "youtube") {
      const name = raw.replace(/^@/, "");
      return `https://www.youtube.com/@${encodeURIComponent(name)}`;
    }

    return "";
  }

  function socialDefaultTitle(key) {
    const normalized = normalizeSocialKey(key);
    const labels = {
      custom: "Website",
      discord_invite: "Discord",
      discord: "Discord",
      twitch: "Twitch",
      twitter: "X / Twitter",
      x: "X",
      youtube: "YouTube"
    };

    return labels[normalized] ||
      String(key || "Social")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function buildWebsiteSocialCardsHtml(player, panel, h) {
    const entries = getWebsiteSocialEntries(player);
    const esc = h?.escapeHtml || escapeHtml;

    if (!entries.length) {
      return `
        <section class="vl-social-clan-empty">
          <span class="vl-social-clan-empty__mark" aria-hidden="true">◇</span>
          <div>
            <strong>Nenhuma conexão pública</strong>
            <small>Este aventureiro ainda não publicou links sociais.</small>
          </div>
        </section>`;
    }

    return `
      <div class="vl-social-clan-list">
        ${entries.map((entry) => {
          const resolved = resolveSocialFallback(panel, entry.key, entry.raw);
          const definition = resolved?.data || {};
          const website = getSocialVisualDefinition(definition);

          if (definition.enabled === false) return "";

          const color = normalizeHexColor(website.color || "#6D7CFF");
          const color2 = normalizeHexColor(website.color2 || color);
          const glow = normalizeHexColor(website.glow || color);
          const intensityRaw = Number(website.intensity);
          const intensity = Number.isFinite(intensityRaw)
            ? Math.max(0, Math.min(1, intensityRaw))
            : 0.25;

          const title = cleanValue(website.title || website.label) || socialDefaultTitle(entry.key);
          const label = cleanValue(website.label) || title;
          const bio = cleanValue(website.bio) || `Acesse ${label}.`;
          /* V20.54 — o avatar do jogador vem do cache privado no profilePlayers.
             website.icon continua sendo apenas fallback manual/global da rede.
             emblem e banner permanecem independentes. */
          const panelIcon = cleanValue(website.icon);
          const cachedIcon = getWebsiteSocialCachedIcon(player, entry.key, resolved?.key);
          const icon = cachedIcon || panelIcon;
          const iconSource = cachedIcon
            ? "website_social_cache"
            : panelIcon
              ? "website_panel"
              : "fallback";
          const iconFallback = cachedIcon && panelIcon && cachedIcon !== panelIcon
            ? panelIcon
            : "";
          const iconLetter = cleanValue(label).slice(0, 1).toUpperCase() || "•";
          const emblem = cleanValue(website.emblem);
          const banner = cleanValue(website.banner);
          const gradient = cleanValue(website.gradient);
          const href = buildSocialHref(entry.key, entry.value);
          const type = cleanValue(definition.type || entry.type || "website_social");

          const aura = website.aura === true;
          const particles = website.particles === true;
          const shimmer = website.shimmer === true;

          const customCssVars = (() => {
            const source = website.css_vars || website.cssVars || {};
            if (!source || typeof source !== "object" || Array.isArray(source)) return [];

            return Object.entries(source)
              .filter(([name, value]) => /^--vl-social-[a-z0-9_-]+$/i.test(String(name || "")) && value != null)
              .map(([name, value]) => `${String(name)}:${esc(cleanValue(value))}`)
              .filter((item) => !/:$/.test(item));
          })();

          const style = [
            `--vl-social-color:${esc(color)}`,
            `--vl-social-color-2:${esc(color2)}`,
            `--vl-social-glow:${esc(glow)}`,
            `--vl-social-intensity:${intensity}`,
            gradient ? `--vl-social-gradient:${esc(gradient)}` : "",
            ...customCssVars
          ].filter(Boolean).join(";");

          const customClasses = cleanValue(website.classes || website.class_name || website.className)
            .split(/\s+/)
            .map((item) => item.trim())
            .filter((item) => /^vl-social-[a-z0-9_-]+$/i.test(item));

          const classes = [
            "vl-social-clan-card",
            aura ? "has-aura" : "",
            particles ? "has-particles" : "",
            shimmer ? "has-shimmer" : "",
            ...customClasses
          ].filter(Boolean).join(" ");

          const inner = `
            ${banner ? `<img class="vl-social-clan-card__banner" data-social-media-role="banner" src="${esc(banner)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}
            <div class="vl-social-clan-card__overlay" aria-hidden="true"></div>

            ${aura ? `<span class="vl-social-clan-card__aura" aria-hidden="true"></span>` : ""}
            ${particles ? `
              <span class="vl-social-clan-card__particles" aria-hidden="true">
                <i></i><i></i><i></i><i></i><i></i>
              </span>` : ""}
            ${shimmer ? `<span class="vl-social-clan-card__shimmer" aria-hidden="true"></span>` : ""}

            <div class="vl-social-clan-card__left">
              <span class="vl-social-clan-card__tag">${esc(label)}</span>

              <span class="vl-social-clan-card__icon" data-social-icon-source="${esc(iconSource)}">
                <span class="vl-social-clan-card__icon-fallback" aria-hidden="true">${esc(iconLetter)}</span>
                ${icon
                  ? `<img data-social-media-role="icon" data-social-icon-source="${esc(iconSource)}"${iconFallback ? ` data-social-fallback-src="${esc(iconFallback)}"` : ""} src="${esc(icon)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="var p=this.parentElement,c=this.closest('.vl-social-clan-card'),f=this.dataset.socialFallbackSrc;if(f){this.dataset.socialFallbackSrc='';if(p)p.dataset.socialIconSource='website_panel';if(c){c.dataset.socialIconSource='website_panel';c.dataset.socialMediaSource='website_panel';}this.src=f;return;}if(p)p.dataset.socialIconSource='fallback';if(c){c.dataset.socialIconSource='fallback';c.dataset.socialMediaSource='fallback';c.dataset.socialHasIcon='0';}this.remove();">`
                  : ""
                }
              </span>
            </div>

            <div class="vl-social-clan-card__main">
              <strong>${esc(title)}</strong>
              <p>${esc(bio)}</p>
              <small>${esc(entry.value)}</small>
            </div>

            ${emblem
              ? `<img class="vl-social-clan-card__emblem" data-social-media-role="emblem" src="${esc(emblem)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="var c=this.closest('.vl-social-clan-card');if(c)c.setAttribute('data-social-has-emblem','0');this.remove();">`
              : `<span class="vl-social-clan-card__ghost-emblem" aria-hidden="true">${esc(label.slice(0, 1).toUpperCase())}</span>`
            }

            ${href ? `<span class="vl-social-clan-card__open" aria-hidden="true">↗</span>` : ""}
          `;

          if (href) {
            return `
              <a class="${classes}"
                 href="${esc(href)}"
                 target="_blank"
                 rel="noopener noreferrer"
                 data-social-key="${esc(entry.key)}"
                 data-social-type="${esc(type)}"
                 data-social-visual="${esc(resolved?.key || "default")}" data-social-media-source="${esc(cachedIcon ? "website_social_cache" : (icon || emblem || banner ? "website_panel" : "fallback"))}"
                 data-social-icon-source="${esc(iconSource)}"
                 data-social-has-icon="${icon ? "1" : "0"}"
                 data-social-has-emblem="${emblem ? "1" : "0"}"
                 data-social-has-banner="${banner ? "1" : "0"}"
                 style="${style}">
                ${inner}
              </a>`;
          }

          return `
            <article class="${classes}"
                     data-social-key="${esc(entry.key)}"
                     data-social-type="${esc(type)}"
                     data-social-visual="${esc(resolved?.key || "default")}" data-social-media-source="${esc(cachedIcon ? "website_social_cache" : (icon || emblem || banner ? "website_panel" : "fallback"))}"
                     data-social-icon-source="${esc(iconSource)}"
                 data-social-has-icon="${icon ? "1" : "0"}"
                 data-social-has-emblem="${emblem ? "1" : "0"}"
                 data-social-has-banner="${banner ? "1" : "0"}"
                     style="${style}">
              ${inner}
            </article>`;
        }).join("")}
      </div>`;
  }

  function buildWebsiteSocialPanelHtml(player, ctx, h) {
    const localPanel =
      getWebsitePanelFromContext(ctx) ||
      websitePanelCache ||
      WEBSITE_PANEL_EMBEDDED;
    const hasPanel = Boolean(
      localPanel && Object.keys(getSocialFallbackRoot(localPanel)).length
    );

    return `
      <section class="vl-profile-panel vl-profile-panel--social-links"
               data-vl-website-social-panel
               data-panel-state="${hasPanel ? "ready" : "loading"}">
        <header class="vl-social-links-heading">
          <div>
            <span class="vl-social-links-heading__eyebrow">03</span>
            <strong>Conexões públicas</strong>
            <small>Redes e vínculos externos do aventureiro</small>
          </div>
          <i aria-hidden="true"></i>
        </header>

        <div class="vl-social-links-content" data-vl-website-social-content>
          ${buildWebsiteSocialCardsHtml(player, localPanel, h)}
        </div>
      </section>`;
  }

  function hydrateWebsiteSocialPanel(player, ctx, h) {
    /* V20.45 — sempre atualiza website_panel pelo Firebase.
       A cópia embutida continua servindo apenas para o primeiro render/fallback. */
    setTimeout(async () => {
      const roots = document.querySelectorAll("[data-vl-website-social-panel]");
      if (!roots.length) return;

      const panel = await loadWebsitePanel(ctx);

      roots.forEach((root) => {
        const content = root.querySelector("[data-vl-website-social-content]");
        if (!content) return;

        content.innerHTML = buildWebsiteSocialCardsHtml(player, panel, h);
        root.dataset.panelState = "ready";
        root.dataset.panelSource = websitePanelCache === WEBSITE_PANEL_EMBEDDED
          ? "embedded"
          : "remote";
      });
    }, 0);
  }

  function getFallbacks(ctx) { return profileCore().getFallbacks(ctx); }

  function getSectionOrder(ctx, name, fallback) {
    const fromCtx = typeof ctx?.getProfileSectionOrder === "function" ? ctx.getProfileSectionOrder(name, fallback) : undefined;
    if (Number.isFinite(Number(fromCtx))) return Number(fromCtx);
    const value = getFallbacks(ctx)?.positions?.profile?.[name];
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function getFallbackMedia(ctx, kind, fallback, key = "default") {
    return profileCore().getFallbackMedia(ctx, kind, fallback, key);
  }

  function buildProfileCardContext(ctx) {
    ctx = ctx || {};
    const extensions = ctx.extensionsData || {};
    return {
      extensionsData: extensions,
      badges_verified: extensions.badges_verified || {},
      badges_levelranks: extensions.badges_levelranks || {},
      badges_avatarlocks: extensions.badges_avatarlocks || {},
      badges_raritys: extensions.badges_raritys || extensions.badges_rarities || {},
      server_panel: extensions.server_panel || {},
      nickname_colors: (extensions.server_panel && extensions.server_panel.nickname_colors) || {},
      clanPlayers: ctx.clanPlayers || ctx.clansData || {},
      profilePlayers: ctx.profilePlayers || {}
    };
  }

  const PROFILE_CHARACTER_SLOT_IDS = ["id_1", "id_2", "id_3", "id_4"];

  function getProfileCharacterSlotIds(player) {
    const core = window.VelarionProfileCore;
    if (core && typeof core.getCharacterSlotIds === "function") {
      const ids = core.getCharacterSlotIds(player);
      return PROFILE_CHARACTER_SLOT_IDS.filter((id) => Array.isArray(ids) && ids.includes(id));
    }
    const raw = player?.theme?.card_embed?.character_slots;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return ["id_1"];
    return PROFILE_CHARACTER_SLOT_IDS.filter((id) => {
      const value = raw[id];
      return Boolean(value && value !== false && typeof value === "object" && !Array.isArray(value));
    });
  }

  function normalizeProfileCharacterSlotId(value, player) {
    const requested = PROFILE_CHARACTER_SLOT_IDS.includes(String(value || "").trim()) ? String(value || "").trim() : "id_1";
    const ids = getProfileCharacterSlotIds(player);
    if (!ids.length) return "id_1";
    if (ids.includes(requested)) return requested;
    return ids.includes("id_1") ? "id_1" : ids[0];
  }

  function getProfileCharacterSlotName(player, id) {
    const core = window.VelarionProfileCore;
    if (core && typeof core.getCharacterSlotName === "function") {
      return core.getCharacterSlotName(player, id);
    }
    const fallbackNames = {
      id_1: "Personagem Principal",
      id_2: "Personagem Secundário",
      id_3: "Personagem Alternativo 1",
      id_4: "Personagem Alternativo 2"
    };
    const raw = player?.theme?.card_embed?.character_slots;
    const slot = raw && typeof raw === "object" && !Array.isArray(raw) ? raw[id] : null;
    const configured = slot && typeof slot === "object" && !Array.isArray(slot)
      ? String(slot.name_slot || "").trim()
      : (id === "id_1" ? String(player?.theme?.card_embed?.name_slot || "").trim() : "");
    return configured || fallbackNames[id] || id;
  }

  function renderProfileCharacterSlotSelector(player, ctx) {
    const ids = getProfileCharacterSlotIds(player);
    const active = normalizeProfileCharacterSlotId(ctx?.characterSlotId, player);
    const activeName = getProfileCharacterSlotName(player, active);
    const hasAlternatives = ids.length > 1;
    const buttons = hasAlternatives ? ids.map((id) => {
      const index = PROFILE_CHARACTER_SLOT_IDS.indexOf(id) + 1;
      const selected = id === active;
      const name = getProfileCharacterSlotName(player, id);
      return `<button class="vl-profile-character-slot${selected ? " is-active" : ""}" type="button" data-vl-character-slot="${id}" aria-pressed="${selected ? "true" : "false"}" aria-label="Exibir ${escapeHtml(name)}"><span>${String(index).padStart(2, "0")}</span><small title="${escapeHtml(name)}">${escapeHtml(name)}</small></button>`;
    }).join("") : "";
    return `<div class="vl-profile-character-slots${hasAlternatives ? " has-alternatives" : " is-single"}" data-vl-character-slots aria-label="Versões do personagem"><div class="vl-profile-character-slots__label"><span>VERSÃO DO PERSONAGEM</span><small>${escapeHtml(activeName)}</small></div>${hasAlternatives ? `<div class="vl-profile-character-slots__buttons">${buttons}</div>` : ""}</div>`;
  }

  function renderOfficialProfileCard(player, ctx, displayNamePlain) {
    const renderer = window.VelarionLumenCard; // renderer oficial externo; não duplicar aqui
    if (renderer && typeof renderer.renderPlayerCard === "function") {
      try {
        const html = renderer.renderPlayerCard(player, 0, buildProfileCardContext(ctx), { characterSlotId: ctx?.characterSlotId || "id_1" });
        if (html) {
          setTimeout(function() {
            const profileCardPort = document.querySelector(".vl-profile-card-port");
            try {
              if (renderer && typeof renderer.hydrate === "function") {
                renderer.hydrate(profileCardPort || document);
              }
            } catch (e) {}
            scheduleProfileCardFx(profileCardPort || document);
          }, 0);
          return `<div class="vl-profile-card-port" data-official-card-port="true" aria-label="Card visual de ${escapeHtml(displayNamePlain || "Perfil")}">${html}</div>`;
        }
      } catch (error) {
        console.warn("[VelarionProfile] Falha ao renderizar card oficial no perfil.", error);
      }
    }

    if (!renderer) {
      console.info(
        "[VelarionProfile] VelarionLumenCard ainda não disponível; o main.js tentará carregá-lo automaticamente."
      );
    }

    return "";
  }

  /* ======================================================================
     CARD COLOR PALETTE — espelho do velarion-card.js

     O Documento do aventureiro usa exatamente a mesma fonte visual da carta
     lateral: theme.card_embed.card_color.

     Compatibilidade:
     - legado: "card_color": "#8c6059"
     - atual:  "card_color": { "cc_id1": "#...", "cc_id2": "#...", ... }
     - tipos: none, gradient, rotate, pulse e rainbow
     ====================================================================== */

  let profileShowcaseNavigationReady = false;

  function setProfileShowcasePage(showcase, nextIndex, direction = 0) {
    if (!showcase) return;

    const pages = Array.from(showcase.querySelectorAll(":scope > .vl-profile-showcase__viewport > .vl-profile-showcase__page"));
    if (!pages.length) return;

    const total = pages.length;
    const normalized = ((Number(nextIndex) % total) + total) % total;
    const current = Number(showcase.dataset.pageIndex || 0);

    pages.forEach((page, index) => {
      const active = index === normalized;
      page.classList.toggle("is-active", active);
      page.setAttribute("aria-hidden", active ? "false" : "true");
      if (active) page.removeAttribute("inert");
      else page.setAttribute("inert", "");
    });

    showcase.dataset.pageIndex = String(normalized);
    showcase.dataset.direction = direction < 0 ? "prev" : direction > 0 ? "next" : "none";

    const currentPage = pages[normalized];
    const label = currentPage?.dataset.pageLabel || `Página ${normalized + 1}`;

    const counterText = `${String(normalized + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
    const counter = showcase.querySelector(".vl-profile-showcase__counter");
    if (counter) counter.textContent = counterText;
    const contextCounter = showcase.querySelector(".vl-profile-page-context__view-counter");
    if (contextCounter) contextCounter.textContent = counterText;

    const live = showcase.querySelector(".vl-profile-showcase__live");
    if (live) live.textContent = `${label}. Página ${normalized + 1} de ${total}.`;

    showcase.querySelectorAll("[data-vl-profile-page-index]").forEach((button) => {
      const buttonIndex = Number(button.dataset.vlProfilePageIndex || 0);
      const active = buttonIndex === normalized;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.tabIndex = active ? 0 : -1;
    });

    showcase.querySelectorAll("[data-vl-profile-nav]").forEach((button) => {
      const delta = Number(button.dataset.vlProfileNav || 0);
      const targetIndex = ((normalized + delta) % total + total) % total;
      const targetLabel = pages[targetIndex]?.dataset.pageLabel || `Página ${targetIndex + 1}`;
      button.setAttribute("aria-label", delta < 0 ? `Voltar para ${targetLabel}` : `Avançar para ${targetLabel}`);
      button.title = delta < 0 ? `Voltar: ${targetLabel}` : `Próximo: ${targetLabel}`;
    });

    if (current !== normalized) {
      requestAnimationFrame(() => {
        currentPage?.classList.remove("vl-profile-showcase__page--enter");
        void currentPage?.offsetWidth;
        currentPage?.classList.add("vl-profile-showcase__page--enter");
      });
    }
  }
  function ensureProfileShowcaseNavigation() {
    if (profileShowcaseNavigationReady) return;
    profileShowcaseNavigationReady = true;

    document.addEventListener("click", (event) => {
      const categoryButton = event.target.closest("[data-vl-profile-page-index]");
      if (categoryButton) {
        const showcase = categoryButton.closest("[data-vl-profile-showcase]");
        if (!showcase) return;

        const current = Number(showcase.dataset.pageIndex || 0);
        const targetIndex = Number(categoryButton.dataset.vlProfilePageIndex || 0);
        const direction = targetIndex < current ? -1 : targetIndex > current ? 1 : 0;

        event.preventDefault();
        setProfileShowcasePage(showcase, targetIndex, direction);
        return;
      }

      const button = event.target.closest("[data-vl-profile-nav]");
      if (!button) return;

      const showcase = button.closest("[data-vl-profile-showcase]");
      if (!showcase) return;

      const current = Number(showcase.dataset.pageIndex || 0);
      const delta = Number(button.dataset.vlProfileNav || 0);
      if (!delta) return;

      setProfileShowcasePage(showcase, current + delta, delta);
    });

    document.addEventListener("keydown", (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      const target = event.target;

      if (target?.matches?.("[data-vl-profile-page-index]")) {
        const showcase = target.closest("[data-vl-profile-showcase]");
        if (!showcase) return;
        event.preventDefault();

        const delta = event.key === "ArrowLeft" ? -1 : 1;
        const current = Number(showcase.dataset.pageIndex || 0);
        setProfileShowcasePage(showcase, current + delta, delta);

        requestAnimationFrame(() => {
          showcase.querySelector("[data-vl-profile-page-index].is-active")?.focus();
        });
        return;
      }
      if (target && /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;

      const showcase =
        target?.closest?.("[data-vl-profile-showcase]") ||
        document.querySelector("[data-vl-profile-showcase]");

      if (!showcase) return;

      event.preventDefault();
      const delta = event.key === "ArrowLeft" ? -1 : 1;
      const current = Number(showcase.dataset.pageIndex || 0);
      setProfileShowcasePage(showcase, current + delta, delta);
    });
  }

  let profileCharacterSlotNavigationReady = false;
  function ensureProfileCharacterSlotNavigation() {
    if (profileCharacterSlotNavigationReady) return;
    profileCharacterSlotNavigationReady = true;
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-vl-character-slot]");
      if (!button) return;
      event.preventDefault();
      const slotId = String(button.dataset.vlCharacterSlot || "id_1");
      document.dispatchEvent(new CustomEvent("velarion:character-slot-change", { detail: { characterSlotId: slotId } }));
    });
  }

  function render(player, ctx) {
    const context = ctx || {};
    const C = window.VelarionProfileCore;
    const documentRenderer = window.VelarionProfileDocument;
    const progressionRenderer = window.VelarionProfileProgression;
    const publicRecordRenderer = window.VelarionProfilePublicRecord;

    if (!C || !documentRenderer?.render || !progressionRenderer?.render || !publicRecordRenderer?.render) {
      throw new Error("VelarionProfile: módulos ainda não estão prontos. Aguarde VelarionProfile.componentsReady antes de chamar render().");
    }

    const h = makeHelpers(context);
    const cardColorConfig = C.normalizeCardColorConfig(
      player?.theme?.card_embed?.card_color,
      player?.theme?.profile?.accent || "#8b6cff"
    );
    const color = h.normalizeHexColor(cardColorConfig.primary || "#8b6cff");
    const displayNamePlain = h.stripMinecraftCodes(h.getDisplayName(player)) || "Jogador";
    const xp = C.formatCompactNumber(C.getPlayerXp(player), "0");
    const points = C.formatCompactNumber(C.getPlayerPoints(player), "0");
    const orderOverview = getSectionOrder(context, "overview", 20);
    const orderSystems = getSectionOrder(context, "systems", 40);
    const orderBadges = getSectionOrder(context, "badges", 60);

    const documentHtml = documentRenderer.render(player, context);
    const progressionHtml = progressionRenderer.render(player, context);
    const publicRecordHtml = publicRecordRenderer.render(player, context);
    const characterSlotIds = getProfileCharacterSlotIds(player);
    const hasCharacterSlotAlternatives = characterSlotIds.length > 1;
    const characterSlotSelectorHtml = renderProfileCharacterSlotSelector(player, context);

    scheduleProfileComponentRefresh();
    ensureProfileShowcaseNavigation();
    ensureProfileCharacterSlotNavigation();
    hydrateWebsiteSocialPanel(player, context, h);
    ensureAchievementMedalInteraction();
    prepareAchievementMedalCards();

    return `
      <div class="detail-stage vl-profile-stage" style="--vp-accent:${color};">
        <div class="vl-profile-orbit" aria-hidden="true"></div>
        <div class="vl-profile-showcase" data-vl-profile-showcase data-page-index="0" data-direction="none">
          <header class="vl-profile-page-context" aria-label="Contexto do perfil">
            <div class="vl-profile-page-context__copy">
              <span class="vl-profile-page-context__eyebrow">PERFIL DO JOGADOR</span>
              <strong class="vl-profile-page-context__name">${escapeHtml(displayNamePlain)}</strong>
              <small class="vl-profile-page-context__meta">${escapeHtml(String(player?.id || player?.player_id || player?.profile_id || "Perfil público"))} · Perfil público</small>
            </div>
            <div class="vl-profile-page-context__right">
              <div class="vl-profile-page-context__view" aria-hidden="true">
                <span>VIEW</span>
                <b class="vl-profile-page-context__view-counter">01 / 04</b>
              </div>
              <nav class="vl-luminous-categories" aria-label="Categorias do perfil">
            <div class="vl-luminous-categories__emblem" aria-hidden="true">
              <span></span>
            </div>

            <button class="vl-luminous-category is-active" type="button"
                    data-vl-profile-page-index="0" aria-selected="true">
              <span class="vl-luminous-category__number">01</span>
              <span class="vl-luminous-category__copy">
                <strong>Identidade</strong>
                <small>Perfil e progressão</small>
              </span>
            </button>

            <button class="vl-luminous-category" type="button"
                    data-vl-profile-page-index="1" aria-selected="false" tabindex="-1">
              <span class="vl-luminous-category__number">02</span>
              <span class="vl-luminous-category__copy">
                <strong>Registro Público</strong>
                <small>Dados e atividade</small>
              </span>
            </button>

            <button class="vl-luminous-category" type="button"
                    data-vl-profile-page-index="2" aria-selected="false" tabindex="-1">
              <span class="vl-luminous-category__number">03</span>
              <span class="vl-luminous-category__copy">
                <strong>Conexões</strong>
                <small>Redes e links</small>
              </span>
            </button>

            <button class="vl-luminous-category" type="button"
                    data-vl-profile-page-index="3" aria-selected="false" tabindex="-1">
              <span class="vl-luminous-category__number">04</span>
              <span class="vl-luminous-category__copy">
                <strong>Conquistas</strong>
                <small>Medalhas e feitos</small>
              </span>
            </button>

            <span class="vl-luminous-categories__ornament" aria-hidden="true"></span>
          </nav>
            </div>
          </header>

          <button class="vl-profile-showcase__nav vl-profile-showcase__nav--prev" type="button" data-vl-profile-nav="-1" aria-label="Página anterior">
            <span aria-hidden="true">‹</span>
          </button>



          <div class="vl-profile-showcase__viewport">
            <article class="vl-profile-showcase__page vl-profile-showcase__page--main is-active" data-page="main" data-page-label="Identidade" aria-hidden="false">
              <div class="vl-profile-layout">
                <aside class="vl-profile-identity vl-profile-identity--official-card${hasCharacterSlotAlternatives ? " has-character-slots" : " single-character-slot"}">
                  <div class="vl-profile-component-zone vl-profile-component-zone--card">
                    ${renderOfficialProfileCard(player, context, displayNamePlain)}
                  </div>
                  ${characterSlotSelectorHtml}
                </aside>

                <span class="vl-profile-layout-divider" aria-hidden="true"></span>

                <section class="vl-profile-content vl-profile-content--dossier" aria-label="Informações completas do perfil">
                  <section class="vl-profile-panel vl-profile-panel--overview vl-profile-panel--record" style="order:${orderOverview}">
                    <div class="vl-profile-section-head vl-profile-section-head--adventurer"><span>Perfil do Aventureiro</span><i></i></div>
                    <div class="vl-profile-record-stack">
                      ${documentHtml}
                      ${progressionHtml}
                      <div class="vl-profile-metrics-row vl-profile-metrics-row--record" aria-label="Experiência e pontuação">
                        ${buildMetricChip("XP", xp, "Experiência", "xp")}
                        ${buildMetricChip("Pontos", points, "Pontuação", "points")}
                      </div>
                    </div>
                  </section>
                </section>
              </div>
            </article>

            <article class="vl-profile-showcase__page vl-profile-showcase__page--systems vl-profile-showcase__page--systems-free" data-page="systems" data-page-label="Registro Público" aria-hidden="true" inert>
              ${publicRecordHtml}
            </article>

            <article class="vl-profile-showcase__page vl-profile-showcase__page--clan vl-profile-showcase__page--social" data-page="clan" data-page-label="Conexões" aria-hidden="true" inert>
              <section class="vl-profile-content vl-profile-content--dossier vl-profile-showcase__page-content" aria-label="Conexões públicas do perfil">
                ${buildWebsiteSocialPanelHtml(player, context, h)}
              </section>
            </article>

            <article class="vl-profile-showcase__page vl-profile-showcase__page--badges" data-page="badges" data-page-label="Conquistas" aria-hidden="true" inert>
              <section class="vl-profile-content vl-profile-content--dossier vl-profile-showcase__page-content" aria-label="Distintivos e conquistas">
                <section class="vl-profile-panel vl-profile-panel--badges vl-profile-panel--badges-v3 vl-profile-panel--achievements-only" style="order:${orderBadges}">
                  <div class="vl-profile-section-head vl-profile-section-head--achievements"><span>Conquistas</span><i></i></div>
                  <div class="vl-achievements-zone vl-achievements-zone--medals">
                    ${buildAchievementsMedalsHtml(player, context)}
                  </div>
                </section>
              </section>
            </article>
          </div>

          <button class="vl-profile-showcase__nav vl-profile-showcase__nav--next" type="button" data-vl-profile-nav="1" aria-label="Próxima página">
            <span aria-hidden="true">›</span>
          </button>

          <div class="vl-profile-showcase__meta" aria-hidden="true">
            <span class="vl-profile-showcase__counter">01 / 04</span>
          </div>
          <span class="vl-profile-showcase__live" aria-live="polite">Identidade. Página 1 de 4.</span>
        </div>
      </div>`;
  }

  let achievementMedalInteractionReady = false;

  function formatAchievementUnlockDate(value) {
    const raw = cleanValue(value);
    if (!raw) return "";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    } catch (_) {
      return raw;
    }
  }

  function openAchievementSourcePreview(medal) {
    const card = medal?.closest(".vl-achievements-card--source");
    const preview = card?.querySelector(".vl-achievement-source-preview");
    if (!card || !preview) return;

    card.querySelectorAll(".achievement-gallery-thumb").forEach((item) => {
      item.classList.toggle("is-medal-selected", item === medal);
      item.setAttribute("aria-expanded", item === medal ? "true" : "false");
    });

    const banner = cleanValue(medal.dataset.vlAchievementBanner);
    const icon = cleanValue(medal.dataset.vlAchievementIcon);
    const titleImage = cleanValue(medal.dataset.vlAchievementTitle);
    const label = cleanValue(medal.dataset.vlAchievementLabel) || "Conquista";
    const description = cleanValue(medal.dataset.vlAchievementDescription);
    const unlocked = formatAchievementUnlockDate(medal.dataset.vlAchievementUnlocked);

    preview.style.setProperty("--vl-preview-color", medal.style.getPropertyValue("--vl-medal-color") || "#7b8190");
    preview.style.setProperty("--vl-preview-color-2", medal.style.getPropertyValue("--vl-medal-color-2") || "#aeb4c0");
    preview.style.setProperty("--vl-preview-glow", medal.style.getPropertyValue("--vl-medal-glow") || "#7b8190");

    const bannerNode = preview.querySelector(".vl-achievement-source-preview__banner");
    const iconNode = preview.querySelector(".vl-achievement-source-preview__icon");
    const titleNode = preview.querySelector(".vl-achievement-source-preview__copy strong");
    const descNode = preview.querySelector(".vl-achievement-source-preview__copy p");
    const dateNode = preview.querySelector(".vl-achievement-source-preview__copy small");

    if (bannerNode) {
      bannerNode.innerHTML = banner
        ? `<img src="${escapeHtml(banner)}" alt="" loading="eager" referrerpolicy="no-referrer">`
        : "";
    }

    if (iconNode) {
      const source = titleImage || icon;
      iconNode.innerHTML = source
        ? `<img src="${escapeHtml(source)}" alt="" loading="eager" referrerpolicy="no-referrer">`
        : `<span aria-hidden="true">✦</span>`;
    }

    if (titleNode) titleNode.textContent = label;
    if (descNode) descNode.textContent = description || "Conquista registrada neste perfil.";
    if (dateNode) dateNode.textContent = unlocked ? `Desbloqueada em ${unlocked}` : "";

    preview.classList.add("is-open");
    preview.setAttribute("aria-hidden", "false");
  }

  function closeAchievementSourcePreview(card) {
    if (!card) return;
    const preview = card.querySelector(".vl-achievement-source-preview");
    if (preview) {
      preview.classList.remove("is-open");
      preview.setAttribute("aria-hidden", "true");
    }
    card.querySelectorAll(".achievement-gallery-thumb").forEach((item) => {
      item.classList.remove("is-medal-selected");
      item.setAttribute("aria-expanded", "false");
    });
  }

  function ensureAchievementMedalInteraction() {
    if (achievementMedalInteractionReady) return;
    achievementMedalInteractionReady = true;

    document.addEventListener("click", (event) => {
      const medal = event.target.closest(
        ".vl-profile-panel--achievements-only .vl-achievement-medal-source"
      );
      if (medal) {
        const card = medal.closest(".vl-achievements-card--source");
        const selected = medal.classList.contains("is-medal-selected");
        if (selected) closeAchievementSourcePreview(card);
        else openAchievementSourcePreview(medal);
        return;
      }

      const close = event.target.closest(
        ".vl-profile-panel--achievements-only [data-vl-achievement-close]"
      );
      if (close) {
        closeAchievementSourcePreview(close.closest(".vl-achievements-card--source"));
      }
    });
  }

  function prepareAchievementMedalCards() {
    // O HTML já nasce com as cores corretas vindas do registro da conquista.
    // Não existe mais probe, hover para descobrir cor, nem cor substituta global.
  }

  function applyCharacterMediaFallback(element) {
    const runtime = window.VelarionProfilePublicRecord;
    if (runtime && typeof runtime.applyCharacterMediaFallback === "function") {
      runtime.applyCharacterMediaFallback(element);
      return;
    }

    if (element?.dataset) element.dataset.vlFallbackPending = "1";
    ensureProfileComponentAssets().then(() => {
      window.VelarionProfilePublicRecord?.applyCharacterMediaFallback?.(element);
    });
  }


  window.VelarionProfile = {
    render,
    applyCharacterMediaFallback,
    setupProfileDocumentColorEffects,
    refreshComponents: refreshProfileComponentModules,
    ensureComponents: ensureProfileComponentAssets,
    helpers: {
      cleanValue: (...args) => profileCore().cleanValue(...args),
      isValidCardHex: (...args) => profileCore().isValidCardHex(...args),
      normalizeProfileCardColorType: (...args) => profileCore().normalizeCardColorType(...args)
    }
  };

  window.VelarionProfile.componentsReady = ensureProfileComponentAssets();
})();
