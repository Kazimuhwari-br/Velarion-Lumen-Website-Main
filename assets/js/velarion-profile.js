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

  function pick(ctx, name, fallback) {
    return ctx && typeof ctx[name] === "function" ? ctx[name] : fallback;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cleanValue(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function getMediaSource(value) {
    if (typeof value === "string") return cleanValue(value);
    if (!value || typeof value !== "object" || Array.isArray(value)) return "";
    return cleanValue(value.url || value.src || value.image || value.path || "");
  }

  function isWebMMedia(value) {
    const source = getMediaSource(value);
    if (!source) return false;
    return /^data:video\/webm(?:;|,)/i.test(source) || /\.webm(?:$|[?#])/i.test(source);
  }

  function renderProfileFrameMedia(source) {
    const media = getMediaSource(source);
    if (!media) return "";

    if (isWebMMedia(media)) {
      return `<video src="${escapeHtml(media)}" autoplay loop muted playsinline preload="auto" aria-hidden="true" tabindex="-1" referrerpolicy="no-referrer" style="display:block;width:100%;height:100%;object-fit:fill;background:transparent;pointer-events:none;" onerror="this.parentElement.remove();"></video>`;
    }

    return `<img src="${escapeHtml(media)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.parentElement.remove();">`;
  }

  function stripMinecraftCodes(value) {
    return cleanValue(value).replace(/§[0-9a-fk-or]/gi, "");
  }

  function minecraftToHtml(value) {
    return escapeHtml(stripMinecraftCodes(value)).replace(/\n/g, "<br>");
  }

  function normalizeHexColor(value) {
    const text = cleanValue(value);
    if (/^#[0-9a-f]{6}$/i.test(text)) return text;
    if (/^[0-9a-f]{6}$/i.test(text)) return "#" + text;
    if (/^#[0-9a-f]{3}$/i.test(text)) {
      return "#" + text.slice(1).split("").map((c) => c + c).join("");
    }
    return "#8b6cff";
  }

  function mergeBadge(record) {
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
      glow: cleanValue(website.glow ?? record.glow ?? website.color ?? record.color)
    };
  }

  function badgeVisible(record, area) {
    if (!record || record.enabled === false) return false;
    const visibility = record.visibility && typeof record.visibility === "object" ? record.visibility : {};
    if (visibility.public === false) return false;
    if (Object.prototype.hasOwnProperty.call(visibility, area)) return visibility[area] !== false;
    return true;
  }

  function getRarityId(player) {
    const raw = player?.stats?.rarity;
    if (typeof raw === "string" || typeof raw === "number") return cleanValue(raw);
    if (raw && typeof raw === "object") return cleanValue(raw.id || raw.rarity_id || raw.value);
    return cleanValue(player?.badges?.rarity_id || player?.badges?.rarity || player?.rarity_id);
  }

  function getStatusId(player) {
    return cleanValue(
      player?.moderation?.status_id ||
      player?.moderation?.warn_status_id ||
      player?.status?.warn_id ||
      player?.status?.status_id ||
      player?.theme?.card_embed?.security_overlay?.avatar_lock_id ||
      player?.theme?.card_embed?.security_overlay?.warns_id ||
      ""
    );
  }

  function getByPath(obj, paths) {
    for (const path of paths) {
      const parts = path.split(".");
      let cur = obj;
      for (const part of parts) {
        if (!cur || typeof cur !== "object") { cur = undefined; break; }
        cur = cur[part];
      }
      const text = cleanValue(cur);
      if (text) return text;
    }
    return "";
  }

  function getDisplayNameFallback(player) {
    return getByPath(player, [
      "profile.display_nickname",
      "profile.nickname",
      "account.nickname",
      "account.name",
      "account.login",
      "username",
      "name"
    ]) || "Jogador";
  }

  function getUsernameFallback(player) {
    return getByPath(player, [
      "profile.display_username",
      "account.login",
      "account.username",
      "username",
      "name"
    ]) || getDisplayNameFallback(player);
  }

  function getCardTitleFallback(player) {
    return getByPath(player, [
      "profile.title",
      "profile.subtitle",
      "badges.title",
      "rank.title",
      "title"
    ]) || "Sem título definido";
  }

  function getImageFallback(player, type) {
    const map = {
      avatar: ["theme.card_embed.avatar_bottom_image", "profile.avatar", "avatar", "theme.avatar", "images.avatar", "profile.avatar_url"],
      banner: ["theme.card_embed.banner_bottom_image", "profile.banner", "banner", "theme.banner", "images.banner", "profile.banner_url"],
      character: ["theme.card_embed.character_image", "profile.character", "character", "theme.character", "images.character", "profile.character_url"]
    };
    return getByPath(player, map[type] || []);
  }

  function getPlayerLevel(player) {
    const raw = player?.stats?.progression?.level ?? player?.stats?.level ?? player?.level ?? player?.rank?.level ?? player?.profile?.level ?? 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function getTierName(player) {
    return stripMinecraftCodes(player?.badges?.levelrank || player?.badges?.rank || player?.rank?.name || player?.rank?.title || "Novice");
  }

  function getCountry(player) {
    return cleanValue(player?.country?.name || player?.country?.code || player?.profile?.country || "-");
  }

  function getCountryFlagFromCode(code) {
    const clean = cleanValue(code).toUpperCase();
    if (!/^[A-Z]{2}$/.test(clean)) return "";
    return String.fromCodePoint(...clean.split("").map((char) => 127397 + char.charCodeAt(0)));
  }

  function getCountryDisplay(player) {
    const code = cleanValue(player?.country?.code || player?.profile?.country_code || player?.profile?.countryCode || "").toUpperCase();
    const name = cleanValue(player?.country?.name || player?.profile?.country || code || "-");
    const flag = getCountryFlagFromCode(code);
    const flagUrl = /^[A-Z]{2}$/.test(code)
      ? `https://flagcdn.com/w40/${code.toLowerCase()}.png`
      : "";
    return {
      code,
      name: name || "-",
      flag,
      flagUrl
    };
  }

  function formatProfileIdDisplay(value) {
    const clean = cleanValue(value || "ID");
    const match = clean.match(/^(?:ID[_:\s-]*)?(\d+)$/i);
    if (match) return `ID: ${match[1]}`;
    if (/^\d+$/.test(clean)) return `ID: ${clean}`;
    return clean.replace(/^ID[_\s-]*/i, "ID: ");
  }

  function getClanNameFallback(player) {
    return stripMinecraftCodes(player?.clan?.name || player?.clan?.tag || player?.profile?.clan || "Sem clã");
  }

  function getClanRequestedId(player) {
    const raw = player?.clan ?? player?.profile?.clan ?? player?.profile?.clan_id ?? player?.profile?.clanId;
    if (typeof raw === "string" || typeof raw === "number") return cleanValue(raw);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "";
    return cleanValue(raw.id || raw.clan_id || raw.clanId || raw.key || "");
  }

  function getClanPlayersSource(ctx) {
    const raw = ctx?.clanPlayers || ctx?.clansData || ctx?.clans || {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const nested = raw.clanPlayers;
    return nested && typeof nested === "object" && !Array.isArray(nested) ? nested : raw;
  }

  function resolveClanChipData(player, ctx) {
    const source = getClanPlayersSource(ctx);
    const requestedId = stripMinecraftCodes(getClanRequestedId(player));
    if (!requestedId) return null;

    const aliases = Array.from(new Set([requestedId, requestedId.toUpperCase(), requestedId.toLowerCase()]));
    let resolvedId = aliases.find((key) => source?.[key]);

    if (!resolvedId) {
      const wanted = requestedId.toLowerCase();
      resolvedId = Object.keys(source || {}).find((key) => stripMinecraftCodes(cleanValue(key)).toLowerCase() === wanted);
    }

    const clan = resolvedId ? source?.[resolvedId] : null;
    if (!clan || typeof clan !== "object") return null;

    const cardEmbed = clan?.theme?.card_embed && typeof clan.theme.card_embed === "object" ? clan.theme.card_embed : {};
    const colorConfig = normalizeProfileCardColorConfig(
      cardEmbed.card_color ?? clan.card_color ?? clan.color ?? clan.website?.color ?? "#c74b5d",
      "#c74b5d"
    );
    const color = normalizeHexColor(colorConfig.primary || "#c74b5d");
    const explicitColor2 = cleanValue(cardEmbed.card_color2 ?? clan.card_color2 ?? clan.color2 ?? clan.website?.color2);
    const color2 = /^#[0-9a-f]{3,6}$/i.test(explicitColor2)
      ? normalizeHexColor(explicitColor2)
      : normalizeHexColor(colorConfig.colors?.[1] || color);
    const explicitGlow = cleanValue(cardEmbed.glow ?? clan.glow ?? clan.website?.glow);
    const glow = /^#[0-9a-f]{3,6}$/i.test(explicitGlow) ? normalizeHexColor(explicitGlow) : color;

    const shortName = stripMinecraftCodes(cleanValue(clan.sub ?? clan.name ?? clan.label ?? clan.website?.label ?? resolvedId)) || requestedId;
    const title = stripMinecraftCodes(cleanValue(clan?.profile?.title ?? clan?.title ?? clan?.name ?? clan?.label ?? shortName)) || shortName;
    const description = stripMinecraftCodes(cleanValue(clan?.profile?.bio ?? clan?.bio ?? clan?.profile?.subtitle ?? clan?.subtitle ?? "Informações do clã")) || "Informações do clã";

    return {
      id: cleanValue(resolvedId || requestedId),
      requestedId,
      name: shortName,
      title,
      description,
      icon: getMediaSource(cardEmbed.avatar_bottom_image ?? clan.avatar_bottom_image ?? clan.icon ?? clan.website?.icon ?? ""),
      emblem: getMediaSource(cardEmbed.avatar_bottom_image ?? clan.avatar_bottom_image ?? clan.emblem ?? clan.icon ?? clan.website?.emblem ?? clan.website?.icon ?? ""),
      color,
      color2,
      glow
    };
  }

  function buildClanInfoPopover(clan, h) {
    if (!clan) return "";
    const label = cleanValue(clan.name || clan.id || "Clã");
    const title = cleanValue(clan.title || label);
    const description = cleanValue(clan.description || "Informações do clã");
    const id = cleanValue(clan.id || clan.requestedId || "");
    const emblem = cleanValue(clan.emblem || clan.icon || "");
    const color = normalizeHexColor(clan.color || "#c74b5d");
    const color2 = normalizeHexColor(clan.color2 || color);
    const glow = normalizeHexColor(clan.glow || color);

    return `
      <div class="vl-profile-verified-popover vl-profile-clan-popover" role="tooltip" aria-label="Informações do clã" style="--vpop-color:${h.escapeHtml(color)};--vpop-color2:${h.escapeHtml(color2)};--vpop-glow:${h.escapeHtml(glow)};">
        ${emblem ? `<div class="vl-profile-verified-popover__watermark" aria-hidden="true"><img src="${h.escapeHtml(emblem)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.parentElement.remove();"></div>` : ""}
        <div class="vl-profile-verified-popover__head">
          <div class="vl-profile-verified-popover__emblem" aria-hidden="true">
            ${emblem ? `<img src="${h.escapeHtml(emblem)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.remove();">` : `<span>◇</span>`}
          </div>
          <div class="vl-profile-verified-popover__title">
            <small>Informações do clã</small>
            <strong>${h.escapeHtml(title)}</strong>
            <span>${h.escapeHtml(description)}</span>
          </div>
        </div>
        <div class="vl-profile-verified-popover__meta">
          <div><small>Sigla</small><strong>${h.escapeHtml(label)}</strong></div>
          <div><small>ID do clã</small><strong>${h.escapeHtml(id || "—")}</strong></div>
        </div>
        ${id ? `<div class="vl-profile-verified-popover__id"><span>CLAN</span><code>${h.escapeHtml(id)}</code></div>` : ""}
        <i class="vl-profile-verified-popover__arrow" aria-hidden="true"></i>
      </div>`;
  }

  function getBio(player) {
    return cleanValue(player?.profile?.bio || player?.bio || player?.description || "Sem descrição.");
  }

  function getRoleLabel(player) {
    return stripMinecraftCodes(player?.badges?.role || player?.rank?.role || player?.clan?.rank || player?.role || "Sem cargo");
  }

  function getRankLabel(player) {
    return stripMinecraftCodes(player?.badges?.rank || player?.rank?.name || player?.rank?.role || "Sem rank");
  }

  function getVerifiedState(player) {
    const value = player?.verified ?? player?.profile?.verified ?? player?.badges?.verified;
    return value === true || value === "true" || value === 1 || value === "1";
  }

  function fallbackLevelChip(player, h) {
    const level = getPlayerLevel(player);
    return `<div class="vl-profile-mini-level"><b>Lv.</b><strong>${escapeHtml(level || 0)}</strong></div>`;
  }

  function fallbackUsernameLine(player) {
    const username = getUsernameFallback(player);
    return `<div class="vl-profile-userline"><span>${escapeHtml(username)}</span></div>`;
  }

  function fallbackVerifiedBadge(player) {
    if (!getVerifiedState(player)) return `<span class="vl-profile-verify is-muted">Não verificado</span>`;
    return `<span class="vl-profile-verify">Verificado</span>`;
  }

  function fallbackCountry(code) {
    return escapeHtml(code || "-");
  }

  function fallbackLevelInfo(player, h) {
    const level = getPlayerLevel(player);
    const tier = getTierName(player);
    return `
      <div class="vl-profile-tier-card">
        <div class="vl-profile-tier-medal"><span>NV.</span><strong>${escapeHtml(level || 0)}</strong></div>
        <div class="vl-profile-tier-main">
          <strong>Tier: ${escapeHtml(tier)}</strong>
          <div class="vl-profile-progress"><i style="width:100%"></i></div>
          <small>Progresso atual</small>
        </div>
        <b class="vl-profile-percent">100%</b>
      </div>`;
  }

  function fallbackClan(player) {
    return `<div class="vl-profile-feature-card"><strong>${escapeHtml(getClanNameFallback(player))}</strong><span>Clã atual</span></div>`;
  }

  function fallbackRole(player) {
    return `<div class="vl-profile-badge-card"><strong>${escapeHtml(getRoleLabel(player))}</strong><span>Cargo principal</span></div>`;
  }

  function fallbackRank(player) {
    return `<div class="vl-profile-badge-card"><strong>${escapeHtml(getRankLabel(player))}</strong><span>Rank atual</span></div>`;
  }


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
          <header class="vl-achievements-card__header">
            <div class="vl-achievements-header-help" tabindex="0" aria-describedby="vl-achievements-tooltip">
              <span aria-hidden="true">◆</span>
              <strong>Conquistas</strong>
              <span id="vl-achievements-tooltip" class="vl-achievements-header-tooltip" role="tooltip">
                Conquistas especiais desbloqueadas e registradas neste perfil.
              </span>
            </div>
            <span class="vl-achievements-card__total">0 totais</span>
          </header>
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
        <header class="vl-achievements-card__header">
          <div class="vl-achievements-header-help" tabindex="0" aria-describedby="vl-achievements-tooltip">
            <span aria-hidden="true">◆</span>
            <strong>Conquistas</strong>
            <span id="vl-achievements-tooltip" class="vl-achievements-header-tooltip" role="tooltip">
              Conquistas especiais desbloqueadas e registradas neste perfil.
            </span>
          </div>
          <span class="vl-achievements-card__total">${achievements.length} ${achievements.length === 1 ? "total" : "totais"}</span>
        </header>

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

  function fallbackAchievements() {
    return `<div class="vl-profile-empty-achievements">Nenhuma conquista exibida.</div>`;
  }

  function fallbackRarity(player, ctx) {
    const extensions = ctx?.extensionsData || {};
    const source = extensions.badges_raritys || extensions.badges_rarities || {};
    const rarityId = getRarityId(player);
    if (!rarityId) return "";
    const aliases = [rarityId, rarityId.replace(/^rarity_id_/i, "raritys_id_"), rarityId.replace(/^raritys_id_/i, "rarity_id_")];
    const key = aliases.find((item) => source && source[item]);
    const data = mergeBadge(key ? source[key] : null);
    if (!data || !badgeVisible(data, "profile")) return "";
    const shortLabel = cleanValue(data.website?.short_label || data.website?.badge_text || data.short_label || data.label) || "RARITY";
    const label = cleanValue(data.label || data.name || shortLabel) || rarityId;
    const stars = cleanValue(data.website?.stars || data.stars) || "";
    const category = cleanValue(data.category || data.tier || "rarity");
    const evolution = cleanValue(data.website?.evolution || data.card_effects?.frame || data.evolution || "normal");
    const color = normalizeHexColor(data.color || "#f7d58a");
    const color2 = normalizeHexColor(data.color2 || color);
    const glow = normalizeHexColor(data.glow || color);
    const description = cleanValue(data.description || `Raridade ${label}.`);
    const intensity = Number.isFinite(Number(data.card_effects?.intensity ?? data.intensity)) ? Number(data.card_effects?.intensity ?? data.intensity) : .65;
    return `
      <div class="vl-profile-rarity-card" style="--rarity-color:${escapeHtml(color)};--rarity-color-2:${escapeHtml(color2)};--rarity-glow:${escapeHtml(glow)};--rarity-intensity:${escapeHtml(intensity)};">
        <div class="vl-profile-rarity-mark"><strong>${escapeHtml(shortLabel)}</strong><span>${escapeHtml(stars)}</span></div>
        <div class="vl-profile-rarity-text"><small>${escapeHtml(category)} • ${escapeHtml(evolution)}</small><strong>${escapeHtml(label)}</strong><p>${escapeHtml(description)}</p></div>
      </div>`;
  }

  function fallbackModerationStatus(player, ctx) {
    const extensions = ctx?.extensionsData || {};
    const source = extensions.badges_avatarlocks || extensions.badges_warns || extensions.badges_moderation_status || {};
    const statusId = getStatusId(player);
    if (!statusId) return "";
    const aliases = [statusId, statusId.replace(/^warn_id_/i, "warns_id_"), statusId.replace(/^warns_id_/i, "warn_id_"), statusId.replace(/^avatar_lock_id_/i, "warns_id_")];
    const key = aliases.find((item) => source && source[item]);
    const data = mergeBadge(key ? source[key] : null);
    if (!data) return "";
    const publicInfo = data.public && typeof data.public === "object" ? data.public : {};
    if (publicInfo.show_on_profile === false || !badgeVisible(data, "profile")) return "";
    const color = normalizeHexColor(data.color || "#ffffff");
    const color2 = normalizeHexColor(data.color2 || color);
    const glow = normalizeHexColor(data.glow || color);
    const label = cleanValue(publicInfo.safe_label || data.label || "Status");
    const description = cleanValue(publicInfo.safe_description || data.description || "Status público do perfil.");
    const risk = cleanValue(data.moderation?.risk_level || data.status || "none");
    return `<div class="vl-profile-status-card" style="--status-color:${escapeHtml(color)};--status-color-2:${escapeHtml(color2)};--status-glow:${escapeHtml(glow)};"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(risk)}</span><p>${escapeHtml(description)}</p></div>`;
  }

  function getInitials(value, fallback) {
    const text = stripMinecraftCodes(value || "").replace(/[^\p{L}\p{N}\s_-]+/gu, " ").trim();
    if (!text) return fallback || "VL";
    const parts = text.split(/\s+|_+|-+/).filter(Boolean);
    const picked = parts.length > 1 ? parts.slice(0, 2).map((part) => part[0]) : [text[0], text[1] || ""];
    return picked.join("").toUpperCase().slice(0, 3) || fallback || "VL";
  }

  function buildClanVisualCard(options) {
    const iconText = cleanValue(options.iconText || "VL").slice(0, 4).toUpperCase();
    const label = cleanValue(options.label || "");
    const value = cleanValue(options.value || "");
    const note = cleanValue(options.note || "");
    const meta = cleanValue(options.meta || "");
    const color = normalizeHexColor(options.color || "#d85a4d");
    const color2 = normalizeHexColor(options.color2 || color);
    const glow = normalizeHexColor(options.glow || color);
    const className = cleanValue(options.className || "");
    const image = cleanValue(options.image || "");

    return `
      <div class="vl-profile-clanlike-card ${escapeHtml(className)}" style="--vl-card-color:${escapeHtml(color)};--vl-card-color-2:${escapeHtml(color2)};--vl-card-glow:${escapeHtml(glow)};">
        <div class="vl-profile-clanlike-icon" aria-hidden="true">
          ${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.onerror=null; this.style.display='none'; this.parentElement.dataset.fallback='${escapeHtml(iconText)}';">` : `<b>${escapeHtml(iconText)}</b>`}
        </div>
        <div class="vl-profile-clanlike-copy">
          <small>${escapeHtml(label)}</small>
          <strong>${escapeHtml(value || "—")}</strong>
          ${note ? `<span>${escapeHtml(note)}</span>` : ""}
          ${meta ? `<em>${escapeHtml(meta)}</em>` : ""}
        </div>
      </div>`;
  }

  function buildRarityVisualCard(player, ctx) {
    const extensions = ctx?.extensionsData || {};
    const source = extensions.badges_raritys || extensions.badges_rarities || {};
    const rarityId = getRarityId(player);
    let data = null;

    if (rarityId) {
      const aliases = [rarityId, rarityId.replace(/^rarity_id_/i, "raritys_id_"), rarityId.replace(/^raritys_id_/i, "rarity_id_")];
      const key = aliases.find((item) => source && source[item]);
      data = mergeBadge(key ? source[key] : null);
      if (data && !badgeVisible(data, "profile")) data = null;
    }

    const shortLabel = cleanValue(data?.website?.short_label || data?.website?.badge_text || data?.short_label || data?.label || rarityId || "RAR");
    const label = cleanValue(data?.label || data?.name || shortLabel || "Sem raridade");
    const stars = cleanValue(data?.website?.stars || data?.stars || "");
    const category = cleanValue(data?.category || data?.tier || "Raridade");
    const color = normalizeHexColor(data?.color || "#d85a4d");
    const color2 = normalizeHexColor(data?.color2 || color);
    const glow = normalizeHexColor(data?.glow || color);
    const description = cleanValue(data?.description || (rarityId ? "Raridade pública do perfil." : "Nenhuma raridade pública definida."));

    return buildClanVisualCard({
      className: "vl-profile-clanlike-card--rarity",
      label: category,
      value: label,
      note: description,
      meta: stars,
      iconText: shortLabel,
      color,
      color2,
      glow
    });
  }

  
  function buildRarityV8Section(player, ctx, orderSystems) {
    const h = makeHelpers(ctx || {});

    /*
     * V20.1 — SISTEMAS PÚBLICOS
     * Página visual do jogador:
     * - sem raridade / summon / categoria / descrição;
     * - personagem + efeitos à esquerda;
     * - estrelas conquistadas em bloco compacto à direita, acima do personagem.
     */

    const extensions = ctx?.extensionsData || {};
    const source = extensions.badges_raritys || extensions.badges_rarities || {};
    const rarityId = getRarityId(player);
    const esc = (value) => escapeHtml(String(value ?? ""));

    const aliases = rarityId ? [
      rarityId,
      rarityId.replace(/^rarity_id_/i, "raritys_id_"),
      rarityId.replace(/^raritys_id_/i, "rarity_id_")
    ] : [];

    const rarityKey = aliases.find((key) => source?.[key]) || "";
    const rarityData = mergeBadge(rarityKey ? source[rarityKey] : null) || {};

    /*
     * As estrelas continuam vindo dos mesmos dados públicos já usados antes.
     * A raridade deixa de ser exibida; ela só é consultada para obter stars/max_stars.
     */
    const starsValue =
      rarityData.website?.stars ??
      rarityData.stars ??
      rarityData.profile?.stars ??
      "";

    let stars = 0;
    let maxStars = Number(
      rarityData.website?.max_stars ??
      rarityData.max_stars ??
      rarityData.profile?.max_stars ??
      0
    );

    if (
      typeof starsValue === "number" ||
      /^\d+(?:\.\d+)?$/.test(String(starsValue).trim())
    ) {
      stars = Math.max(0, Math.round(Number(starsValue)));
    } else {
      stars = Math.max(0, (cleanValue(starsValue).match(/★/g) || []).length);
    }

    if (!Number.isFinite(maxStars) || maxStars <= 0) maxStars = stars;
    if (maxStars < stars) maxStars = stars;

    /*
     * V20.16 — dados secundários públicos do jogador.
     * Usa somente:
     * - stats
     * - stats.rarity
     * - stats.social
     * - website_social
     */
    const stats = player?.stats && typeof player.stats === "object" ? player.stats : {};
    const combat = stats?.combat && typeof stats.combat === "object" ? stats.combat : {};
    const rarityStats = stats?.rarity && typeof stats.rarity === "object" ? stats.rarity : {};

    const publicInfoNickname =
      cleanValue(player?.profile?.display_nickname) ||
      cleanValue(player?.profile?.display_username) ||
      cleanValue(player?.display_nickname) ||
      cleanValue(player?.display_username) ||
      cleanValue(player?.id) ||
      "Jogador";

    const publicInfoUsername =
      cleanValue(player?.profile?.display_username) ||
      cleanValue(player?.display_username) ||
      cleanValue(player?.id) ||
      "—";

    const publicInfoId =
      cleanValue(player?.id) ||
      cleanValue(player?._id) ||
      cleanValue(player?.profile_id) ||
      "—";

    const publicInfoRegisteredAt =
      cleanValue(stats?.timestamps?.account_created_at);

    const formatDocumentDateTime = (value) => {
      const raw = cleanValue(value);
      if (!raw) return "—";
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return raw;

      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(date);
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
      const raw = cleanValue(value);
      if (!raw) return "—";
      return raw
        .replace(/^raritys?_id_/i, "")
        .replace(/^rarity_id_/i, "")
        .replace(/[_-]+/g, " ")
        .trim()
        .toUpperCase() || "—";
    };

    /*
     * Mesma origem real do velarion-card.
     * Suporta string e objeto { url, src, image, path }.
     */
    const getProfileMediaSource = (value) => {
      if (typeof value === "string") return cleanValue(value);
      if (!value || typeof value !== "object" || Array.isArray(value)) return "";
      return cleanValue(value.url || value.src || value.image || value.path || "");
    };

    const characterMediaRaw = player?.theme?.card_embed?.character_image;
    const configuredCharacterImage = getProfileMediaSource(characterMediaRaw);

    /*
     * Mesma política do velarion-card:
     * character_image -> fallback por gênero -> default/undefined/missing.
     */
    const characterFallbackKey =
      cleanValue(player?.profile?.gender) ||
      cleanValue(player?.gender) ||
      "default";

    const fallbackCharacterImage = getProfileMediaSource(
      getFallbackMedia(ctx, "character", "", characterFallbackKey)
    );

    const characterImage = configuredCharacterImage || fallbackCharacterImage;

    const characterIsWebM = Boolean(
      characterImage &&
      (
        /^data:video\/webm(?:;|,)/i.test(characterImage) ||
        /\.webm(?:$|[?#])/i.test(characterImage)
      )
    );

    const fallbackCharacterIsWebM = Boolean(
      fallbackCharacterImage &&
      (
        /^data:video\/webm(?:;|,)/i.test(fallbackCharacterImage) ||
        /\.webm(?:$|[?#])/i.test(fallbackCharacterImage)
      )
    );

    return `
      <section class="vl-profile-panel vl-profile-panel--systems-v2 vl-profile-panel--systems-stars-only"
               style="order:${Number(orderSystems) || 40}">
        <div class="vl-profile-section-head vl-profile-section-head--public"><span>Registro Público</span><i></i></div>

        <div class="vl-public-stars-only ${characterImage ? "has-character" : "no-character"}">

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
                         onerror="window.VelarionProfile?.applyCharacterMediaFallback?.(this)"
                       ></video>`
                    : `<img
                         src="${esc(characterImage)}"
                         alt=""
                         loading="eager"
                         decoding="async"
                         data-vl-character-fallback="${esc(fallbackCharacterImage)}"
                         data-vl-character-fallback-webm="${fallbackCharacterIsWebM ? "1" : "0"}"
                         onerror="window.VelarionProfile?.applyCharacterMediaFallback?.(this)"
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
                <span class="vl-public-quickstats__rarity-mark vl-public-quickstats__rarity-mark--hero" aria-hidden="true">
                  <i></i>
                </span>

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
            <div class="vl-public-systems-switcher"
                 data-vl-public-systems-switcher
                 data-subpage-index="0"
                 data-sub-direction="none">

              <button class="vl-public-systems-switcher__nav vl-public-systems-switcher__nav--next"
                      type="button"
                      data-vl-public-subnav="1"
                      aria-label="Avançar para Rank">
                <span aria-hidden="true">›</span>
              </button>

              <div class="vl-public-systems-switcher__viewport">
                <article class="vl-public-systems-switcher__page is-active"
                         data-vl-public-subpage
                         data-vl-public-subpage-label="Cargo"
                         aria-hidden="false">
                  <div class="vl-public-systems-switcher__content">
                    ${h.buildRoleInfoEmblemHtml(player)}
                  </div>
                </article>

                <article class="vl-public-systems-switcher__page"
                         data-vl-public-subpage
                         data-vl-public-subpage-label="Rank"
                         aria-hidden="true"
                         inert>
                  <div class="vl-public-systems-switcher__content">
                    ${h.buildRankInfoEmblemHtml(player)}
                  </div>
                </article>
              </div>
            </div>
          </div>

        </div>
      </section>
    `;
  }

function buildStatusVisualCard(player, ctx) {
    const extensions = ctx?.extensionsData || {};
    const source = extensions.badges_avatarlocks || extensions.badges_warns || extensions.badges_moderation_status || {};
    const statusId = getStatusId(player);
    let data = null;

    if (statusId) {
      const aliases = [statusId, statusId.replace(/^warn_id_/i, "warns_id_"), statusId.replace(/^warns_id_/i, "warn_id_"), statusId.replace(/^avatar_lock_id_/i, "warns_id_")];
      const key = aliases.find((item) => source && source[item]);
      data = mergeBadge(key ? source[key] : null);
      const publicInfo = data?.public && typeof data.public === "object" ? data.public : {};
      if (data && (publicInfo.show_on_profile === false || !badgeVisible(data, "profile"))) data = null;
    }

    const publicInfo = data?.public && typeof data.public === "object" ? data.public : {};
    const label = cleanValue(publicInfo.safe_label || data?.label || (statusId ? "Status público" : "Nenhum registro"));
    const description = cleanValue(publicInfo.safe_description || data?.description || (statusId ? "Status público do perfil." : "Nenhum registro público."));
    const risk = cleanValue(data?.moderation?.risk_level || data?.status || (statusId ? "STATUS" : "NONE"));
    const color = normalizeHexColor(data?.color || "#d85a4d");
    const color2 = normalizeHexColor(data?.color2 || color);
    const glow = normalizeHexColor(data?.glow || color);

    return buildClanVisualCard({
      className: "vl-profile-clanlike-card--status",
      label: "Status público",
      value: label,
      note: description,
      meta: risk,
      iconText: statusId ? getInitials(label, "ST") : "NR",
      color,
      color2,
      glow
    });
  }


  function getNestedRaw(obj, path) {
    const parts = String(path || "").split(".").filter(Boolean);
    let cur = obj;
    for (const part of parts) {
      if (!cur || typeof cur !== "object") return undefined;
      cur = cur[part];
    }
    return cur;
  }

  function firstRaw(obj, paths, fallback = "") {
    for (const path of paths || []) {
      const value = getNestedRaw(obj, path);
      if (value !== null && value !== undefined && value !== "") return value;
    }
    return fallback;
  }

  function boolLike(value, fallback = false) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const text = cleanValue(value).toLowerCase();
    if (["true", "1", "yes", "online", "on", "sim", "s"].includes(text)) return true;
    if (["false", "0", "no", "offline", "off", "nao", "não", "n"].includes(text)) return false;
    return fallback;
  }

  function formatCompactNumber(value, empty = "0") {
    if (value === null || value === undefined || value === "") return empty;
    const n = Number(value);
    if (!Number.isFinite(n)) return cleanValue(value) || empty;
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1).replace(".0", "") + "B";
    if (abs >= 1_000_000) return (n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(".0", "") + "M";
    if (abs >= 1_000) return (n / 1_000).toFixed(abs >= 10_000 ? 0 : 1).replace(".0", "") + "K";
    return String(Math.floor(n));
  }

  function getPlayerXp(player) {
    return firstRaw(player, [
      "stats.progression.xp",
      "stats.progression.current_xp",
      "stats.xp",
      "progression.xp",
      "profile.xp",
      "xp"
    ], 0);
  }

  function getPlayerPoints(player) {
    return firstRaw(player, [
      "stats.points",
      "stats.score",
      "profile.points",
      "economy.points",
      "points",
      "score"
    ], 0);
  }

  function getTierProgressPercent(player) {
    const raw = firstRaw(player, [
      "stats.progression.percent",
      "stats.progression.percentage",
      "stats.progression.progress_percent",
      "stats.progression.progress",
      "progression.percent",
      "progression.percentage",
      "progression.progress_percent",
      "progression.progress",
      "rank.progress_percent",
      "rank.progress",
      "tier.progress_percent",
      "tier.progress"
    ], 100);

    let value = Number(raw);
    if (!Number.isFinite(value)) value = 100;
    if (value >= 0 && value <= 1) value *= 100;
    return Math.max(0, Math.min(100, value));
  }

  function getLevelRankSource(ctx) {
    const extensions = ctx?.extensionsData || {};
    const nested = extensions?.information_panel && typeof extensions.information_panel === "object"
      ? extensions.information_panel
      : {};
    const source = extensions.badges_levelranks || nested.badges_levelranks || {};
    return source && typeof source === "object" && !Array.isArray(source) ? source : {};
  }

  function resolveLevelRank(player, ctx) {
    const source = getLevelRankSource(ctx);
    const level = getPlayerLevel(player);
    const raw = player?.badges?.levelrank_id
      ?? player?.badges?.levelrank
      ?? player?.badges?.rank_id
      ?? player?.rank?.levelrank_id
      ?? player?.rank?.id
      ?? player?.profile?.levelrank_id
      ?? "";

    const rawObject = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
    const requestedId = cleanValue(
      rawObject?.id || rawObject?.levelrank_id || rawObject?.key ||
      (typeof raw === "string" || typeof raw === "number" ? raw : "")
    );

    let key = requestedId && Object.prototype.hasOwnProperty.call(source, requestedId) ? requestedId : "";
    if (!key && requestedId) {
      const wanted = requestedId.toLowerCase();
      key = Object.keys(source).find((candidate) => cleanValue(candidate).toLowerCase() === wanted) || "";
    }

    if (!key) {
      const entries = Object.entries(source).filter(([, rank]) => rank && typeof rank === "object" && rank.enabled !== false);
      const match = entries.find(([, rank]) => {
        const minRaw = rank?.progression?.level_min ?? rank?.min;
        const maxRaw = rank?.progression?.level_max ?? rank?.max;
        const min = Number(minRaw);
        const max = Number(maxRaw);
        if (!Number.isFinite(min)) return false;
        if (!Number.isFinite(max)) return level >= min;
        return level >= min && level <= max;
      });
      key = match?.[0] || "";
    }

    const rank = key ? source[key] : (rawObject || null);
    if (!rank || typeof rank !== "object") return null;
    return { key: key || cleanValue(rank.id), rank };
  }

  function getPlayerMaxLevel(player) {
    const raw = firstRaw(player, [
      "stats.progression.max_level",
      "stats.progression.maxLevel",
      "stats.max_level",
      "stats.maxLevel",
      "progression.max_level",
      "progression.maxLevel",
      "profile.max_level",
      "profile.maxLevel",
      "max_level",
      "maxLevel"
    ], 0);

    const value = Number(raw);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  function getPlayerLevelProgressPercent(player) {
    const level = getPlayerLevel(player);
    const maxLevel = getPlayerMaxLevel(player);

    /*
     * A porcentagem pertence aos dados do jogador.
     * As insígnias/levelranks fornecem somente identidade visual e nome do Tier.
     * NÃO usar rank.min / rank.max / progression.level_min / level_max para a barra.
     */
    if (maxLevel > 0) {
      return Math.max(0, Math.min(100, (level / maxLevel) * 100));
    }

    /* Compatibilidade: se max_level ainda não chegou no objeto do jogador,
       aceita somente uma porcentagem explícita também vinda do jogador. */
    return getTierProgressPercent(player);
  }

  function buildProfileLevelTier(player, h, ctx) {
    const level = getPlayerLevel(player);
    const resolved = resolveLevelRank(player, ctx || {});
    const rank = resolved?.rank || null;
    const website = rank?.website && typeof rank.website === "object" ? rank.website : {};

    const rawFallbackTier = getTierName(player);
    const fallbackTier = rawFallbackTier && rawFallbackTier !== "[object Object]" ? rawFallbackTier : "Novice";
    const tier = cleanValue(rank?.label || website.title_text || website.label || fallbackTier) || "Novice";

    const percent = getPlayerLevelProgressPercent(player);
    const percentRounded = Math.round(percent * 10) / 10;
    const percentLabel = `${percentRounded}`.replace(/\.0$/, "") + "%";

    const color = normalizeHexColor(website.color || "#f4df9a");
    const color2 = normalizeHexColor(website.color2 || color);
    const glow = normalizeHexColor(website.glow || color);
    const icon = getMediaSource(website.icon || website.title || "");
    const banner = cleanValue(website.banner || website.gradient || "");
    const style = [
      `--vl-lt-color:${h.escapeHtml(color)}`,
      `--vl-lt-color2:${h.escapeHtml(color2)}`,
      `--vl-lt-glow:${h.escapeHtml(glow)}`,
      banner ? `--vl-lt-banner:${h.escapeHtml(banner)}` : ""
    ].filter(Boolean).join(";");

    return `
      <div class="vl-profile-level-tier-rebuilt" data-levelrank-id="${h.escapeHtml(resolved?.key || "")}" data-player-max-level="${h.escapeHtml(getPlayerMaxLevel(player) || "")}" style="${style}" aria-label="Nível ${h.escapeHtml(level)}, tier ${h.escapeHtml(tier)}, progresso ${h.escapeHtml(percentLabel)}">
        <div class="vl-profile-level-tier-rebuilt__top">
          <div class="vl-profile-level-tier-rebuilt__level">
            <span class="vl-profile-level-tier-rebuilt__crystal" aria-hidden="true">
              ${icon ? `<img src="${h.escapeHtml(icon)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.remove();">` : `<i></i>`}
            </span>
            <span>Lv.</span>
            <strong>${h.escapeHtml(level || 0)}</strong>
          </div>
          <div class="vl-profile-level-tier-rebuilt__tier">
            <span>Tier:</span>
            <strong>${h.escapeHtml(tier)}</strong>
          </div>
        </div>
        <div class="vl-profile-level-tier-rebuilt__progress">
          <div class="vl-profile-level-tier-rebuilt__track" aria-hidden="true"><i style="width:${h.escapeHtml(percent)}%"></i></div>
          <strong>${h.escapeHtml(percentLabel)}</strong>
        </div>
      </div>`;
  }

  function getOnlineLabel(player) {
    const raw = firstRaw(player, [
      "presence.online",
      "db.online",
      "status.online",
      "online",
      "is_online"
    ], "");
    if (raw === "") return "Status indefinido";
    return boolLike(raw, false) ? "Online" : "Offline";
  }

  function getOnlineToken(player) {
    const label = getOnlineLabel(player).toLowerCase();
    if (label === "online") return "online";
    if (label === "offline") return "offline";
    return "unknown";
  }

  function buildInfoTile(options = {}) {
    const className = cleanValue(options.className);
    const label = cleanValue(options.label || "Campo");
    const value = cleanValue(options.value || "—");
    const note = cleanValue(options.note || "");
    const meta = cleanValue(options.meta || "");
    const iconText = cleanValue(options.iconText || getInitials(value, "VL")).slice(0, 4).toUpperCase();
    const image = cleanValue(options.image || "");
    const color = normalizeHexColor(options.color || "#7de7ff");
    const tone = cleanValue(options.tone || "neutral");
    const imageHtml = image
      ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.remove(); this.parentElement.setAttribute('data-fallback','${escapeHtml(iconText)}')">`
      : "";

    return `
      <article class="vl-profile-info-tile ${escapeHtml(className)}" data-tone="${escapeHtml(tone)}" style="--tile-color:${escapeHtml(color)};">
        <div class="vl-profile-info-tile__icon" ${image ? "" : `data-fallback="${escapeHtml(iconText)}"`}>
          ${imageHtml}<b>${escapeHtml(iconText)}</b>
        </div>
        <div class="vl-profile-info-tile__text">
          <small>${escapeHtml(label)}</small>
          <strong>${escapeHtml(value)}</strong>
          ${note ? `<span>${escapeHtml(note)}</span>` : ""}
          ${meta ? `<em>${escapeHtml(meta)}</em>` : ""}
        </div>
      </article>`;
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

  function collectVerifiedRefs(value, output, depth = 0) {
    if (depth > 4 || value === null || value === undefined || value === false) return;
    if (typeof value === "string" || typeof value === "number") {
      const ref = cleanValue(value);
      if (ref && !/^(?:true|false|0|1)$/i.test(ref)) output.push(ref);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => collectVerifiedRefs(item, output, depth + 1));
      return;
    }
    if (typeof value === "object") {
      ["id", "badge_id", "verified_id", "verification_id", "type", "value"].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(value, key)) collectVerifiedRefs(value[key], output, depth + 1);
      });
    }
  }

  function stripHtmlText(value) {
    return cleanValue(String(value || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " "));
  }

  function resolveVerifiedBadgeData(player, ctx, renderedBadgeHtml) {
    const source = ctx?.extensionsData?.badges_verified || {};
    if (!source || typeof source !== "object") return null;
    const refs = [];
    collectVerifiedRefs(player?.badges?.verified, refs);
    collectVerifiedRefs(player?.badges?.verification, refs);
    collectVerifiedRefs(player?.profile?.verified, refs);
    collectVerifiedRefs(player?.verified_badge, refs);
    collectVerifiedRefs(player?.verified_id, refs);
    collectVerifiedRefs(player?.verification_id, refs);
    collectVerifiedRefs(player?.verified, refs);
    const entries = Object.entries(source).filter(([, raw]) => raw && typeof raw === "object");
    const normalizedRefs = [...new Set(refs.map((ref) => cleanValue(ref).toLowerCase()).filter(Boolean))];
    let match = entries.find(([key, raw]) => {
      const id = cleanValue(raw.id || key).toLowerCase();
      return normalizedRefs.includes(cleanValue(key).toLowerCase()) || normalizedRefs.includes(id);
    });
    if (!match) {
      const renderedText = stripHtmlText(renderedBadgeHtml).toLowerCase();
      if (renderedText) {
        const candidates = entries.filter(([, raw]) => {
          const data = mergeBadge(raw);
          const labels = [data?.website?.badge_text, data?.website?.label, data?.label, data?.name, data?.verification_type, data?.category]
            .map((item) => cleanValue(item).toLowerCase()).filter(Boolean);
          return labels.some((label) => renderedText.includes(label));
        });
        candidates.sort((a, b) => Number(b[1]?.priority || 0) - Number(a[1]?.priority || 0));
        match = candidates[0];
      }
    }
    if (!match) return null;
    const [key, raw] = match;
    const data = mergeBadge(raw);
    if (!data || data.enabled === false || !badgeVisible(data, "profile")) return null;
    if (data.display?.show_tooltip === false) return null;
    return { key, raw, data };
  }

  function useVerifiedCompactIcon(player, ctx, renderedBadgeHtml, h) {
    const html = String(renderedBadgeHtml || "");
    if (!html) return html;
    const resolved = resolveVerifiedBadgeData(player, ctx, renderedBadgeHtml);
    const icon = cleanValue(resolved?.raw?.website?.icon || "");
    if (!icon) return html;
    const safeIcon = h.escapeHtml(icon);

    // O selo compacto usa website.icon. O website.emblem permanece reservado
    // ao popover (emblema principal + marca-d'água).
    if (/class=["'][^"']*card-verified-emblem[^"']*["']/i.test(html)) {
      return html.replace(
        /(<img\b(?=[^>]*class=["'][^"']*card-verified-emblem[^"']*["'])[^>]*\bsrc=["'])[^"']*(["'])/i,
        `$1${safeIcon}$2`
      );
    }
    return html.replace(/(<img\b[^>]*\bsrc=["'])[^"']*(["'])/i, `$1${safeIcon}$2`);
  }

  function buildVerifiedInfoPopover(player, ctx, renderedBadgeHtml, h) {
    const resolved = resolveVerifiedBadgeData(player, ctx, renderedBadgeHtml);
    if (!resolved) return "";
    const { key, raw, data } = resolved;
    const website = raw.website && typeof raw.website === "object" ? raw.website : {};
    const label = cleanValue(website.label || website.badge_text || raw.label || data.label || "Verificado");
    const description = cleanValue(website.bio || raw.description || data.description || "Verificação pública do perfil.");
    const issuer = cleanValue(raw.issuer || "Velarion Lumen");
    const category = cleanValue(raw.category || raw.type || "verified");
    const verificationType = cleanValue(raw.verification_type || raw.type || category);
    const verificationTypeLabel = verificationType
      ? verificationType.charAt(0).toUpperCase() + verificationType.slice(1)
      : "Verificado";
    const trust = Number(raw.trust_level);
    const trustText = Number.isFinite(trust) ? `${Math.max(0, trust)}/5` : "—";
    const id = cleanValue(raw.id || key);
    const emblem = cleanValue(website.emblem || website.icon || "");
    const color = normalizeHexColor(website.color || data.color || "#48E7FF");
    const color2 = normalizeHexColor(website.color2 || data.color2 || color);
    const glow = normalizeHexColor(website.glow || data.glow || color2);
    return `
      <div class="vl-profile-verified-popover" role="tooltip" aria-label="Informações da verificação" style="--vpop-color:${h.escapeHtml(color)};--vpop-color2:${h.escapeHtml(color2)};--vpop-glow:${h.escapeHtml(glow)};">
        ${emblem ? `<div class="vl-profile-verified-popover__watermark" aria-hidden="true"><img src="${h.escapeHtml(emblem)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.parentElement.remove();"></div>` : ""}
        <div class="vl-profile-verified-popover__head">
          <div class="vl-profile-verified-popover__emblem" aria-hidden="true">
            ${emblem ? `<img src="${h.escapeHtml(emblem)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.remove();">` : `<span>✦</span>`}
          </div>
          <div class="vl-profile-verified-popover__title">
            <small>Verificação oficial</small>
            <strong>${h.escapeHtml(label)}</strong>
            <span>${h.escapeHtml(description)}</span>
          </div>
        </div>
        <div class="vl-profile-verified-popover__meta">
          <div><small>Emitido por</small><strong>${h.escapeHtml(issuer)}</strong></div>
          <div><small>Confiança</small><strong>${h.escapeHtml(trustText)}</strong></div>
          <div class="vl-profile-verified-popover__meta--wide"><small>Tipo de verificação</small><strong>${h.escapeHtml(verificationTypeLabel)}</strong></div>
        </div>
        ${id ? `<div class="vl-profile-verified-popover__id"><span>ID</span><code>${h.escapeHtml(id)}</code></div>` : ""}
        <i class="vl-profile-verified-popover__arrow" aria-hidden="true"></i>
      </div>`;
  }

  function ensureVerifiedPopoverEvents() {
    if (window.__vlVerifiedPopoverEventsInstalled) return;
    window.__vlVerifiedPopoverEventsInstalled = true;

    let floatingPopover = null;
    let activeTag = null;

    const positionFloatingPopover = () => {
      if (!floatingPopover || !activeTag || !document.body.contains(activeTag)) return;

      /*
       * O wrapper .vl-profile-public-id-card__verified-tag ocupa uma célula
       * maior do grid. Para posicionar o popover, ancore na parte que o
       * usuário realmente enxerga/clica (o chip), não no wrapper inteiro.
       */
      const anchor = activeTag.querySelector('.card-verified-chip, .vl-profile-verify, .vl-profile-public-id-card__clan-chip') || activeTag;
      const trigger = anchor.getBoundingClientRect();
      const panel = floatingPopover.getBoundingClientRect();
      const margin = 14;
      const edge = 12;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const compact = viewportWidth <= 560;

      /*
       * O popover pertence visualmente à coluna de conteúdo do perfil.
       * Usamos essa coluna como limite horizontal para impedir que o painel
       * atravesse para cima da carta oficial à esquerda.
       */
      const contentHost = activeTag.closest('.vl-profile-content') || activeTag.closest('.vl-profile-layout');
      const hostRect = contentHost?.getBoundingClientRect?.();
      const safeLeft = compact ? edge : Math.max(edge, (hostRect?.left ?? edge) + 8);
      const safeRight = compact
        ? viewportWidth - edge
        : Math.min(viewportWidth - edge, (hostRect?.right ?? (viewportWidth - edge)) - 8);

      const roomBelow = viewportHeight - trigger.bottom;
      const roomAbove = trigger.top;
      const roomLeft = trigger.left - safeLeft;
      const roomRight = safeRight - trigger.right;
      let placement = compact ? 'bottom' : 'left';
      let top;
      let left;

      if (compact) {
        /* Em telas pequenas, mantém a leitura confortável abaixo do selo. */
        left = (viewportWidth - panel.width) / 2;
        if (roomBelow >= panel.height + margin + edge || roomBelow >= roomAbove) {
          placement = 'bottom';
          top = trigger.bottom + margin;
        } else {
          placement = 'top';
          top = trigger.top - panel.height - margin;
        }
      } else if (roomLeft >= panel.width + margin) {
        /* Preferência escolhida: abre à esquerda do selo. */
        placement = 'left';
        left = trigger.left - panel.width - margin;
        top = trigger.top + (trigger.height - panel.height) / 2;
      } else if (roomRight >= panel.width + margin) {
        /* Fallback raro: só usa a direita se realmente não couber à esquerda. */
        placement = 'right';
        left = trigger.right + margin;
        top = trigger.top + (trigger.height - panel.height) / 2;
      } else {
        /* Último fallback: abaixo/acima, ainda preso à coluna do perfil. */
        left = trigger.right - panel.width;
        if (roomBelow >= panel.height + margin + edge || roomBelow >= roomAbove) {
          placement = 'bottom';
          top = trigger.bottom + margin;
        } else {
          placement = 'top';
          top = trigger.top - panel.height - margin;
        }
      }

      /* Mantém o popover dentro da coluna de conteúdo e da viewport. */
      const maxLeft = Math.max(safeLeft, safeRight - panel.width);
      left = Math.max(safeLeft, Math.min(left, maxLeft));
      top = Math.max(edge, Math.min(top, viewportHeight - panel.height - edge));

      /*
       * Mantém a seta apontando para o centro real do selo mesmo quando o
       * painel precisar ser limitado verticalmente pela viewport.
       */
      if (placement === 'left' || placement === 'right') {
        const arrowY = Math.max(18, Math.min(panel.height - 18, (trigger.top + trigger.height / 2) - top));
        floatingPopover.style.setProperty('--vpop-arrow-y', `${Math.round(arrowY)}px`);
      } else {
        floatingPopover.style.removeProperty('--vpop-arrow-y');
      }

      floatingPopover.dataset.placement = placement;
      floatingPopover.style.left = `${Math.round(left)}px`;
      floatingPopover.style.top = `${Math.round(top)}px`;
    };

    const POPOVER_TRANSITION_MS = 190;

    const closePopover = (restoreFocus = false, immediate = false) => {
      const panel = floatingPopover;
      const tag = activeTag;

      if (tag) {
        tag.classList.remove('is-open');
        tag.setAttribute('aria-expanded', 'false');
        tag.removeAttribute('aria-controls');
      }

      /*
       * O painel precisa permanecer no DOM durante o fechamento para que
       * opacity/transform consigam animar. Ao trocar diretamente de um selo
       * para outro, usamos immediate=true para não deixar dois popovers vivos.
       */
      if (panel) {
        panel.classList.remove('is-visible');
        panel.classList.add('is-closing');

        const finish = () => {
          panel.remove();
          if (floatingPopover === panel) floatingPopover = null;
        };

        if (immediate || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
          finish();
        } else {
          let finished = false;
          const done = () => {
            if (finished) return;
            finished = true;
            panel.removeEventListener('transitionend', onTransitionEnd);
            finish();
          };
          const onTransitionEnd = (event) => {
            if (event.target === panel && (event.propertyName === 'opacity' || event.propertyName === 'transform')) done();
          };
          panel.addEventListener('transitionend', onTransitionEnd);
          window.setTimeout(done, POPOVER_TRANSITION_MS + 80);
        }
      }

      if (restoreFocus && tag?.focus) tag.focus();
      if (activeTag === tag) activeTag = null;
    };

    const openPopover = (tag) => {
      if (!tag) return;
      const template = tag.querySelector('.vl-profile-verified-popover');
      if (!template) return;

      if (activeTag === tag) {
        closePopover();
        return;
      }

      closePopover(false, true);
      activeTag = tag;
      activeTag.classList.add('is-open');
      activeTag.setAttribute('aria-expanded', 'true');

      floatingPopover = template.cloneNode(true);
      floatingPopover.classList.add('vl-profile-verified-popover--floating');
      floatingPopover.removeAttribute('role');
      floatingPopover.setAttribute('role', 'dialog');
      floatingPopover.setAttribute('aria-modal', 'false');
      floatingPopover.id = `vl-verified-popover-${Date.now()}`;
      activeTag.setAttribute('aria-controls', floatingPopover.id);
      document.body.appendChild(floatingPopover);

      /*
       * O browser pode agrupar a inserção no DOM e a adição de .is-visible
       * no mesmo frame. Nesse caso, não existe um estado inicial pintado e
       * a transition não dispara. Primeiro posicionamos e forçamos um layout;
       * só no frame seguinte liberamos o estado visível.
       */
      positionFloatingPopover();
      void floatingPopover.offsetWidth;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!floatingPopover) return;
          floatingPopover.classList.add('is-visible');
        });
      });
    };

    document.addEventListener('click', (event) => {
      const tag = event.target.closest?.('[data-vl-info-popover="true"]');
      if (tag) {
        event.preventDefault();
        event.stopPropagation();
        openPopover(tag);
        return;
      }

      if (floatingPopover?.contains(event.target)) return;
      closePopover();
    });

    document.addEventListener('keydown', (event) => {
      const tag = event.target.closest?.('[data-vl-info-popover="true"]');
      if (event.key === 'Escape') {
        if (floatingPopover) {
          event.preventDefault();
          closePopover(true);
        }
        return;
      }
      if (!tag || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      openPopover(tag);
    });

    window.addEventListener('resize', () => {
      if (floatingPopover) positionFloatingPopover();
    }, { passive: true });

    window.addEventListener('scroll', () => {
      if (floatingPopover) positionFloatingPopover();
    }, { passive: true, capture: true });
  }

  function makeHelpers(ctx) {
    const h = {
      escapeHtml: pick(ctx, "escapeHtml", escapeHtml),
      minecraftToHtml: pick(ctx, "minecraftToHtml", minecraftToHtml),
      stripMinecraftCodes: pick(ctx, "stripMinecraftCodes", stripMinecraftCodes),
      cleanValue: pick(ctx, "cleanValue", cleanValue),
      normalizeHexColor: pick(ctx, "normalizeHexColor", normalizeHexColor),
      getAvatar: pick(ctx, "getAvatar", (player) => getImageFallback(player, "avatar") || ctx?.DEFAULT_PLAYER_AVATAR || DEFAULT_AVATAR),
      getBanner: pick(ctx, "getBanner", (player) => getImageFallback(player, "banner") || ctx?.DEFAULT_PLAYER_BANNER || DEFAULT_BANNER),
      getCharacter: pick(ctx, "getCharacter", (player) => getImageFallback(player, "character") || ctx?.DEFAULT_PLAYER_CHARACTER || DEFAULT_CHARACTER),
      hasBanner: pick(ctx, "hasBanner", (player) => !!getImageFallback(player, "banner")),
      getDisplayName: pick(ctx, "getDisplayName", getDisplayNameFallback),
      getUsername: pick(ctx, "getUsername", getUsernameFallback),
      getCardTitle: pick(ctx, "getCardTitle", getCardTitleFallback),
      getClanName: pick(ctx, "getPlayerClanName", getClanNameFallback),
      isProbablyPixelArt: pick(ctx, "isProbablyPixelArt", () => false),
      buildTitleHtml: pick(ctx, "buildTitleHtml", (player) => minecraftToHtml(getDisplayNameFallback(player))),
      buildLevelChipHtml: pick(ctx, "buildLevelChipHtml", fallbackLevelChip),
      buildUsernameLine: pick(ctx, "buildUsernameLine", fallbackUsernameLine),
      buildVerifiedCardBadgeHtml: pick(ctx, "buildVerifiedCardBadgeHtml", fallbackVerifiedBadge),
      buildCountryFlagHtml: pick(ctx, "buildCountryFlagHtml", fallbackCountry),
      buildLevelInfoEmblemHtml: pick(ctx, "buildLevelInfoEmblemHtml", fallbackLevelInfo),
      buildRankTitleMarkHtml: pick(ctx, "buildRankTitleMarkHtml", () => ""),
      buildClanInfoCardHtml: pick(ctx, "buildClanInfoCardHtml", fallbackClan),
      buildRoleInfoEmblemHtml: pick(ctx, "buildRoleInfoEmblemHtml", fallbackRole),
      buildRankInfoEmblemHtml: pick(ctx, "buildRankInfoEmblemHtml", fallbackRank),
      buildAchievementsGalleryHtml: pick(ctx, "buildAchievementsGalleryHtml", fallbackAchievements),
      buildRarityInfoHtml: pick(ctx, "buildRarityInfoHtml", (player) => fallbackRarity(player, ctx)),
      buildModerationStatusHtml: pick(ctx, "buildModerationStatusHtml", (player) => fallbackModerationStatus(player, ctx))
    };
    return h;
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

  function resolveSocialFallback(panel, socialKey, socialValue) {
    const root = getSocialFallbackRoot(panel);
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

    /* 1. Correspondência literal pelo nome do objeto. */
    if (key && root[key] && typeof root[key] === "object") {
      return { key, data: root[key], source: "exact-key" };
    }

    /* 2. Variações normalizadas e aliases conhecidos (ex.: X/Twitter, *_url, *_link). */
    for (const variant of socialKeyVariants(key)) {
      if (variant !== key && root[variant] && typeof root[variant] === "object") {
        return { key: variant, data: root[variant], source: "key-variant" };
      }
    }

    /* 3. Aliases declarados dentro da própria definição.
       Isso permite adicionar novas redes no website_panel sem alterar o renderer. */
    for (const [definitionKey, definition] of Object.entries(root)) {
      if (!definition || typeof definition !== "object" || Array.isArray(definition)) continue;
      if (socialDefinitionAliases(definition, definitionKey).includes(key)) {
        return { key: definitionKey, data: definition, source: "definition-alias" };
      }
    }

    /* 4. Type explícito só substitui a chave quando nomeia um visual concreto. */
    if (
      explicitType &&
      explicitType !== "website_social" &&
      root[explicitType] &&
      typeof root[explicitType] === "object"
    ) {
      return { key: explicitType, data: root[explicitType], source: "explicit-type" };
    }

    /* 5. Também permite type=x/twitter com compatibilidade cruzada. */
    if (explicitType === "x" && root.twitter && typeof root.twitter === "object") {
      return { key: "twitter", data: root.twitter, source: "type-x-twitter-alias" };
    }

    if (explicitType === "twitter" && root.x && typeof root.x === "object") {
      return { key: "x", data: root.x, source: "type-twitter-x-alias" };
    }

    /* 6. Fallback apenas quando realmente não houver definição. */
    if (root.default && typeof root.default === "object") {
      return { key: "default", data: root.default, source: "default" };
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
          const website =
            definition?.website && typeof definition.website === "object"
              ? definition.website
              : {};

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
          /* V20.51 — cada mídia lê SOMENTE o próprio campo.
             Nunca reutilizar icon como emblem/banner, nem qualquer outra combinação. */
          const icon = cleanValue(website.icon);
          const emblem = cleanValue(website.emblem);
          const banner = cleanValue(website.banner);
          const gradient = cleanValue(website.gradient);
          const href = buildSocialHref(entry.key, entry.value);
          const type = cleanValue(definition.type || entry.type || "website_social");

          const aura = website.aura === true;
          const particles = website.particles === true;
          const shimmer = website.shimmer === true;

          const style = [
            `--vl-social-color:${esc(color)}`,
            `--vl-social-color-2:${esc(color2)}`,
            `--vl-social-glow:${esc(glow)}`,
            `--vl-social-intensity:${intensity}`,
            gradient ? `--vl-social-gradient:${esc(gradient)}` : ""
          ].filter(Boolean).join(";");

          const classes = [
            "vl-social-clan-card",
            aura ? "has-aura" : "",
            particles ? "has-particles" : "",
            shimmer ? "has-shimmer" : ""
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

              <span class="vl-social-clan-card__icon">
                ${icon
                  ? `<img data-social-media-role="icon" src="${esc(icon)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
                  : `<span aria-hidden="true">${esc(label.slice(0, 1).toUpperCase())}</span>`
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
                 data-social-visual="${esc(resolved?.key || "default")}" data-social-media-source="${esc(icon || emblem || banner ? "website_panel" : "fallback")}"
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
                     data-social-visual="${esc(resolved?.key || "default")}" data-social-media-source="${esc(icon || emblem || banner ? "website_panel" : "fallback")}"
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

  function getFallbacks(ctx) {
    const source = ctx?.extensionsData?.badges_fallbacks || ctx?.extensionsData?.information_panel?.badges_fallbacks;
    return source && typeof source === "object" ? source : {};
  }

  function getSectionOrder(ctx, name, fallback) {
    const fromCtx = typeof ctx?.getProfileSectionOrder === "function" ? ctx.getProfileSectionOrder(name, fallback) : undefined;
    if (Number.isFinite(Number(fromCtx))) return Number(fromCtx);
    const value = getFallbacks(ctx)?.positions?.profile?.[name];
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function getFallbackMedia(ctx, kind, fallback, key = "default") {
    const fallbacks = getFallbacks(ctx);
    const entry = fallbacks?.[kind];
    const website = entry?.website && typeof entry.website === "object" ? entry.website : {};
    const requestedKey = cleanValue(key) || "default";

    const value =
      website[requestedKey] ||
      website.default ||
      website.undefined ||
      website.missing ||
      fallbacks?.defaults?.[kind];

    return cleanValue(value) || fallback;
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

  function renderOfficialProfileCard(player, ctx, displayNamePlain) {
    const renderer = window.VelarionLumenCard; // renderer oficial externo; não duplicar aqui
    if (renderer && typeof renderer.renderPlayerCard === "function") {
      try {
        const html = renderer.renderPlayerCard(player, 0, buildProfileCardContext(ctx));
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

  const PROFILE_CARD_COLOR_TYPES = new Set(["none", "gradient", "rotate", "pulse", "rainbow"]);

  function isValidCardHex(value) {
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(cleanValue(value));
  }

  function normalizeProfileCardColorType(value) {
    const raw = cleanValue(value).toLowerCase();
    const aliases = {
      solid: "none",
      static: "none",
      grad: "gradient",
      cycle: "rotate",
      cycling: "rotate",
      smooth: "pulse",
      spectrum: "rainbow"
    };
    const normalized = aliases[raw] || raw || "none";
    return PROFILE_CARD_COLOR_TYPES.has(normalized) ? normalized : "none";
  }

  function normalizeProfileCardColorSpeed(value, fallback = 10) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(300, Math.max(0.25, parsed));
  }

  function normalizeProfileCardColorConfig(value, fallbackColor = "#8b6cff") {
    /* Se o renderer oficial já estiver disponível, usa o mesmo normalizador
       do velarion-card.js para eliminar qualquer divergência de interpretação. */
    const officialNormalizer = window.VelarionLumenCard?.normalizeCardColorConfig;
    if (typeof officialNormalizer === "function") {
      const normalized = officialNormalizer(value, fallbackColor);
      if (normalized && Array.isArray(normalized.colors) && normalized.colors.length) {
        return {
          legacy: Boolean(normalized.legacy),
          colors: normalized.colors.slice(),
          primary: normalized.primary,
          type: normalizeProfileCardColorType(normalized.type),
          speed: normalizeProfileCardColorSpeed(normalized.speed, 10)
        };
      }
    }

    const safeFallback = isValidCardHex(fallbackColor) ? cleanValue(fallbackColor) : "#8b6cff";

    if (typeof value === "string") {
      const color = isValidCardHex(value) ? cleanValue(value) : safeFallback;
      return { legacy: true, colors: [color], primary: color, type: "none", speed: 10 };
    }

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { legacy: true, colors: [safeFallback], primary: safeFallback, type: "none", speed: 10 };
    }

    const indexedColors = Object.entries(value)
      .map(([key, color]) => {
        const match = /^cc_id(\d+)$/i.exec(String(key));
        if (!match || !isValidCardHex(color)) return null;
        return { index: Number(match[1]), color: cleanValue(color) };
      })
      .filter(Boolean)
      .sort((a, b) => a.index - b.index);

    const colors = indexedColors.map((entry) => entry.color);

    if (!colors.length) {
      const fallbackCandidates = [value.color, value.default, value.primary, value.cc_color];
      const objectFallback = fallbackCandidates.find(isValidCardHex);
      colors.push(objectFallback ? cleanValue(objectFallback) : safeFallback);
    }

    return {
      legacy: false,
      colors,
      primary: colors[0] || safeFallback,
      type: normalizeProfileCardColorType(value.cc_type),
      speed: normalizeProfileCardColorSpeed(value.cc_speed, 10)
    };
  }

  function buildProfilePaletteGradient(colors, angle = "135deg") {
    const palette = Array.isArray(colors) && colors.length ? colors : ["#8b6cff"];
    if (palette.length === 1) return `linear-gradient(${angle}, ${palette[0]}, ${palette[0]})`;
    const maxIndex = palette.length - 1;
    const stops = palette.map((color, index) => {
      const position = maxIndex > 0 ? (index / maxIndex) * 100 : 0;
      return `${color} ${Number(position.toFixed(4))}%`;
    });
    return `linear-gradient(${angle}, ${stops.join(", ")})`;
  }

  function buildProfilePaletteLoopGradient(colors, angle = "90deg") {
    const palette = Array.isArray(colors) && colors.length ? colors : ["#8b6cff"];
    const loop = palette.length > 1 ? [...palette, palette[0]] : [palette[0], palette[0]];
    const maxIndex = loop.length - 1;
    const stops = loop.map((color, index) => {
      const position = maxIndex > 0 ? (index / maxIndex) * 100 : 0;
      return `${color} ${Number(position.toFixed(4))}%`;
    });
    return `linear-gradient(${angle}, ${stops.join(", ")})`;
  }

  function applyDocumentRuntimeColor(card, color) {
    if (!card || !isValidCardHex(color)) return;
    card.style.setProperty("--vp-document-accent", color);
    card.style.setProperty("--vp-document-color", color);
  }

  const profileDocumentColorRuntime = {
    cards: new Set(),
    raf: 0
  };

  function updateProfileDocumentColors() {
    let active = false;

    profileDocumentColorRuntime.cards.forEach((documentCard) => {
      if (!documentCard || !documentCard.isConnected) {
        profileDocumentColorRuntime.cards.delete(documentCard);
        return;
      }

      const type = normalizeProfileCardColorType(documentCard.dataset.vpCardColorType);
      if (!["rotate", "pulse"].includes(type)) return;

      const stage = documentCard.closest(".vl-profile-stage") || document;
      const officialCard = stage.querySelector(".vl-card[data-card-color-type]");
      if (!officialCard) return;

      const liveColor = getComputedStyle(officialCard).getPropertyValue("--card-color").trim();
      if (isValidCardHex(liveColor)) {
        applyDocumentRuntimeColor(documentCard, liveColor);
        active = true;
      }
    });

    if (active || profileDocumentColorRuntime.cards.size) {
      profileDocumentColorRuntime.raf = requestAnimationFrame(updateProfileDocumentColors);
    } else {
      profileDocumentColorRuntime.raf = 0;
    }
  }

  function setupProfileDocumentColorEffects(root) {
    const scope = root || document;
    scope.querySelectorAll(".vl-profile-public-id-card[data-vp-card-color-type]").forEach((documentCard) => {
      const type = normalizeProfileCardColorType(documentCard.dataset.vpCardColorType);
      if (["rotate", "pulse"].includes(type)) {
        profileDocumentColorRuntime.cards.add(documentCard);
      }
    });

    if (profileDocumentColorRuntime.cards.size && !profileDocumentColorRuntime.raf) {
      profileDocumentColorRuntime.raf = requestAnimationFrame(updateProfileDocumentColors);
    }
  }

  function scheduleProfileDocumentColorEffects() {
    requestAnimationFrame(() => setupProfileDocumentColorEffects(document));
  }


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

    const counter = showcase.querySelector(".vl-profile-showcase__counter");
    if (counter) counter.textContent = `${String(normalized + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

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

  function render(player, ctx) {
    const h = makeHelpers(ctx || {});
    const verifiedBadgeSourceHtml = h.buildVerifiedCardBadgeHtml(player);
    const verifiedBadgeHtml = useVerifiedCompactIcon(player, ctx || {}, verifiedBadgeSourceHtml, h);
    const verifiedInfoHtml = buildVerifiedInfoPopover(player, ctx || {}, verifiedBadgeSourceHtml, h);
    ensureVerifiedPopoverEvents();
    const cardColorConfig = normalizeProfileCardColorConfig(
      player?.theme?.card_embed?.card_color,
      player?.theme?.profile?.accent || "#8b6cff"
    );
    const primaryCardColor = cardColorConfig.primary;
    const color = h.normalizeHexColor(primaryCardColor);
    const avatar = h.getAvatar(player) || getFallbackMedia(ctx, "avatar", DEFAULT_AVATAR);
    const profileFrameRaw = player?.theme?.card_embed?.profile_frame_image;
    const profileFrameImage = getMediaSource(profileFrameRaw);
    const displayNamePlain = h.stripMinecraftCodes(h.getDisplayName(player)) || "Jogador";
    const displayNameHtml = h.buildTitleHtml(player) || h.escapeHtml(displayNamePlain);
    const username = h.getUsername(player) || displayNamePlain;
    const cardTitle = h.getCardTitle(player);
    const clanChip = resolveClanChipData(player, ctx || {});
    const clanName = clanChip?.name || h.getClanName(player) || "Sem clã";
    const clanIcon = clanChip?.icon || "";
    const clanInfoHtml = buildClanInfoPopover(clanChip, h);
    const country = getCountryDisplay(player);
    const level = getPlayerLevel(player);
    const tier = getTierName(player);
    const playerId = formatProfileIdDisplay(player?._id || player?.id || player?.profile_id || player?.profile?.id || "ID");
    /* O Documento do aventureiro segue card_color, não background_color. */
    const documentAccent = h.normalizeHexColor(primaryCardColor || color);
    const documentBackground = h.normalizeHexColor(primaryCardColor || color);
    const documentPaletteGradient = buildProfilePaletteGradient(cardColorConfig.colors, "135deg");
    const documentPaletteLoopGradient = buildProfilePaletteLoopGradient(cardColorConfig.colors, "90deg");
    const xp = formatCompactNumber(getPlayerXp(player), "0");
    const points = formatCompactNumber(getPlayerPoints(player), "0");
    const onlineLabel = getOnlineLabel(player);
    const onlineToken = getOnlineToken(player);
    const orderOverview = getSectionOrder(ctx, "overview", 20);
    const orderSystems = getSectionOrder(ctx, "systems", 40);
    const orderClanTitle = getSectionOrder(ctx, "clan_title", 50);
    const orderBadges = getSectionOrder(ctx, "badges", 60);

    scheduleProfileDocumentColorEffects();
    ensureProfileShowcaseNavigation();
    hydrateWebsiteSocialPanel(player, ctx || {}, h);
    ensureAchievementMedalInteraction();
    prepareAchievementMedalCards();
    ensurePublicSystemsSubNavigation();

    return `
      <div class="detail-stage vl-profile-stage" style="--vp-accent:${color};">
        <div class="vl-profile-orbit" aria-hidden="true"></div>
        <div class="vl-profile-showcase" data-vl-profile-showcase data-page-index="0" data-direction="none">
          <button class="vl-profile-showcase__nav vl-profile-showcase__nav--prev" type="button" data-vl-profile-nav="-1" aria-label="Página anterior">
            <span aria-hidden="true">‹</span>
          </button>

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

          <div class="vl-profile-showcase__viewport">
            <article class="vl-profile-showcase__page vl-profile-showcase__page--main is-active" data-page="main" data-page-label="Identidade" aria-hidden="false">
              <div class="vl-profile-layout">
          <aside class="vl-profile-identity vl-profile-identity--official-card">
            ${renderOfficialProfileCard(player, ctx || {}, displayNamePlain)}
          </aside>

          <section class="vl-profile-content vl-profile-content--dossier" aria-label="Informações completas do perfil">
            <section class="vl-profile-panel vl-profile-panel--overview vl-profile-panel--record" style="order:${orderOverview}">
              <div class="vl-profile-section-head vl-profile-section-head--adventurer"><span>Perfil do Aventureiro</span><i></i></div>
              <div class="vl-profile-record-stack">
              <div class="vl-profile-record-grid vl-profile-record-grid--document-only">
                <article
                  class="vl-profile-record-main vl-profile-public-id-card"
                  aria-label="Documento de identidade pública"
                  data-vp-card-color-type="${h.escapeHtml(cardColorConfig.type || "none")}"
                  data-vp-card-color-speed="${h.escapeHtml(cardColorConfig.speed || 10)}"
                  data-vp-card-color-palette="${h.escapeHtml(cardColorConfig.colors.join(","))}"
                  style="--vp-document-accent:${h.escapeHtml(documentAccent)};--vp-document-color:${h.escapeHtml(documentBackground)};--vp-document-color-speed:${h.escapeHtml(cardColorConfig.speed || 10)}s;--vp-document-palette-gradient:${h.escapeHtml(documentPaletteGradient)};--vp-document-palette-loop-gradient:${h.escapeHtml(documentPaletteLoopGradient)};"
                >
                  <div class="vl-profile-public-id-card__shine" aria-hidden="true"></div>
                  ${profileFrameImage ? `
                  <div class="vl-profile-public-id-card__frame-image" aria-hidden="true" data-media-type="${isWebMMedia(profileFrameImage) ? "video" : "image"}">
                    ${renderProfileFrameMedia(profileFrameImage)}
                  </div>` : ""}
                  <div class="vl-profile-public-id-card__top">
                    <span>Documento do aventureiro</span>
                    <div class="vl-profile-public-id-card__identity-tags">
                      ${clanName && clanName !== "Sem clã" ? `
                      <div class="vl-profile-public-id-card__clan-tag" aria-label="Clã ${h.escapeHtml(clanName)}${clanInfoHtml ? ". Pressione para ver detalhes." : ""}" data-clan-id="${h.escapeHtml(clanChip?.requestedId || clanChip?.id || "")}" ${clanInfoHtml ? 'data-vl-info-popover="true" role="button" tabindex="0" aria-expanded="false"' : ''} style="--clan-tag-accent:${h.escapeHtml(clanChip?.color || "#c74b5d")};--clan-tag-accent-2:${h.escapeHtml(clanChip?.color2 || clanChip?.color || "#d98a96")};--clan-tag-glow:${h.escapeHtml(clanChip?.glow || clanChip?.color || "#c74b5d")};">
                        <span class="vl-profile-public-id-card__clan-chip"><strong>${h.escapeHtml(clanName)}</strong></span>
                        ${clanIcon
                          ? `<img class="vl-profile-public-id-card__clan-icon" src="${h.escapeHtml(clanIcon)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.remove();">`
                          : `<i aria-hidden="true"></i>`}
                        ${clanInfoHtml}
                      </div>` : ""}
                      <div class="vl-profile-public-id-card__verified-tag" aria-label="Verificação do aventureiro${verifiedInfoHtml ? ". Pressione para ver detalhes." : ""}" ${verifiedInfoHtml ? 'data-has-verified-info="true" data-vl-info-popover="true" role="button" tabindex="0" aria-expanded="false"' : ''}>
                        ${verifiedBadgeHtml}
                        ${verifiedInfoHtml}
                      </div>
                    </div>
                    <em data-status="${h.escapeHtml(onlineToken)}"><i></i>${h.escapeHtml(onlineLabel)}</em>
                  </div>

                  <div class="vl-profile-public-id-card__body">
                    <div class="vl-profile-public-id-card__photo">
                      <img src="${h.escapeHtml(avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.remove();">
                    </div>

                    <div class="vl-profile-public-id-card__data">
                      <small>Identidade pública</small>
                      <strong>${h.escapeHtml(username)}</strong>
                      <span>${h.escapeHtml(displayNamePlain)}</span>
                      <div class="vl-profile-public-id-card__chips" aria-label="Dados rápidos do documento">
                        <em>${h.escapeHtml(playerId)}</em>
                        <em class="vl-profile-country-chip" aria-label="País: ${h.escapeHtml(country.name)}">
                          ${country.flagUrl ? `<img class="vl-profile-country-chip__flag" src="${h.escapeHtml(country.flagUrl)}" alt="" aria-hidden="true" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove();">` : ""}
                          <span class="vl-profile-country-chip__name">${h.escapeHtml(country.name)}</span>
                        </em>
                      </div>
                    </div>

                  </div>

                  <div class="vl-profile-public-id-card__footer">
                    <span>Registro público</span>
                    <i></i>
                    <b>${h.escapeHtml(cardTitle || "Sem título definido")}</b>
                  </div>
                </article>

              </div>

              <div class="vl-profile-record-progression vl-profile-panel--progress-v2" aria-label="Nível, tier e progresso">
                ${buildProfileLevelTier(player, h, ctx || {})}
              </div>

              <div class="vl-profile-metrics-row vl-profile-metrics-row--record" aria-label="Experiência e pontuação">
                ${buildMetricChip("XP", xp, "Experiência", "xp")}
                ${buildMetricChip("Pontos", points, "Pontuação", "points")}
              </div>
              </div>
            </section>

                      </section>
              </div>
            </article>

            <article class="vl-profile-showcase__page vl-profile-showcase__page--systems" data-page="systems" data-page-label="Registro Público" aria-hidden="true" inert>
              <section class="vl-profile-content vl-profile-content--dossier vl-profile-showcase__page-content" aria-label="Registro Público">
                ${buildRarityV8Section(player, ctx || {}, orderSystems)}
              </section>
            </article>

            <article class="vl-profile-showcase__page vl-profile-showcase__page--clan vl-profile-showcase__page--social" data-page="clan" data-page-label="Conexões" aria-hidden="true" inert>
              <section class="vl-profile-content vl-profile-content--dossier vl-profile-showcase__page-content" aria-label="Conexões públicas do perfil">
                ${buildWebsiteSocialPanelHtml(player, ctx || {}, h)}
              </section>
            </article>

            <article class="vl-profile-showcase__page vl-profile-showcase__page--badges" data-page="badges" data-page-label="Conquistas" aria-hidden="true" inert>
              <section class="vl-profile-content vl-profile-content--dossier vl-profile-showcase__page-content" aria-label="Distintivos e conquistas">
                <section class="vl-profile-panel vl-profile-panel--badges vl-profile-panel--badges-v3 vl-profile-panel--achievements-only" style="order:${orderBadges}">
                  <div class="vl-profile-section-head vl-profile-section-head--achievements"><span>Conquistas</span><i></i></div>
                  <div class="vl-achievements-zone vl-achievements-zone--medals">
                    ${buildAchievementsMedalsHtml(player, ctx || {})}
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

  window.VelarionProfile = {
    render,
    applyCharacterMediaFallback,
    setupProfileDocumentColorEffects
  };
})();
