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
    const extensions = ctx?.extensionsData || {};
    const source = extensions.badges_raritys || extensions.badges_rarities || {};
    const rarityId = getRarityId(player);
    let data = null;

    if (rarityId) {
      const aliases = [
        rarityId,
        rarityId.replace(/^rarity_id_/i, "raritys_id_"),
        rarityId.replace(/^raritys_id_/i, "rarity_id_")
      ];
      const key = aliases.find((item) => source && source[item]);
      data = mergeBadge(key ? source[key] : null);
      if (data && !badgeVisible(data, "profile")) data = null;
    }

    const rarity = cleanValue(
      data?.label ||
      data?.name ||
      data?.website?.short_label ||
      data?.website?.badge_text ||
      rarityId?.replace(/^raritys?_id_/i, "") ||
      "SSR"
    ).toUpperCase();

    const category = cleanValue(data?.category || data?.tier || "Card rarity");
    const description = cleanValue(
      data?.description ||
      (rarityId ? "Raridade extremamente rara concedida por invocações de alto nível." : "Nenhuma raridade pública definida.")
    );
    const starsRaw = cleanValue(data?.website?.stars || data?.stars || "★★★★★");
    const stars = starsRaw || "★★★★★";
    const starCount = Math.max(0, (stars.match(/★/g) || []).length) || 5;
    const color = normalizeHexColor(data?.color || "#F7D58A");
    const color2 = normalizeHexColor(data?.color2 || "#FFF0C4");
    const glow = normalizeHexColor(data?.glow || "#FFD27A");

    const esc = (value) => escapeHtml(String(value ?? ""));

    return `
      <section class="vl-profile-panel vl-profile-panel--systems-v2 vl-profile-panel--summon-v8" style="order:${Number(orderSystems) || 40}">
        <div class="vl-profile-section-head"><span>Sistemas públicos</span><i></i></div>

        <section class="vl-rarity-v8" data-rarity="${esc(rarity)}" style="--rv8-accent:${esc(color)};--rv8-accent2:${esc(color2)};--rv8-glow:${esc(glow)};">
          <header class="vl-rarity-v8__head">
            <div class="vl-rarity-v8__label">
              <span>Raridade de invocação</span>
              <strong>${esc(rarity)}</strong>
            </div>
            <div class="vl-rarity-v8__summary">
              <span>${esc(stars)}</span>
              <em>Summon rarity tier</em>
            </div>
          </header>

          <div class="vl-rarity-v8__scene">
            <div class="vl-rarity-v8__sky"></div>
            <div class="vl-rarity-v8__streaks"></div>
            <div class="vl-rarity-v8__halo vl-rarity-v8__halo--a"></div>
            <div class="vl-rarity-v8__halo vl-rarity-v8__halo--b"></div>
            <div class="vl-rarity-v8__halo vl-rarity-v8__halo--c"></div>

            <div class="vl-rarity-v8__sidecopy">
              <small>${esc(category)}</small>
              <strong>${esc(rarity)}</strong>
              <p>${esc(description)}</p>
            </div>

            <div class="vl-rarity-v8__core" aria-label="Invocação ${esc(rarity)}">
              <div class="vl-rarity-v8__seal"><i></i><i></i><i></i></div>
              <div class="vl-rarity-v8__crystal">
                <span class="vl-rarity-v8__crystal-top"></span>
                <b>✦</b>
                <strong>${esc(rarity)}</strong>
                <em>SUMMON</em>
              </div>
              <div class="vl-rarity-v8__flare"></div>
            </div>

            <div class="vl-rarity-v8__stats">
              <div><small>Classe</small><strong>${esc(rarity)}</strong></div>
              <div><small>Estrelas</small><strong>${starCount}</strong></div>
              <div><small>Sistema</small><strong>Gacha</strong></div>
            </div>

            <div class="vl-rarity-v8__sparks" aria-hidden="true">
              <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
            </div>
          </div>

          <div class="vl-rarity-v8__tiers" aria-label="Escala de raridade">
            <div data-tier="N" class="${rarity === "N" ? "is-active" : ""}"><span>N</span><small>Normal</small></div>
            <div data-tier="R" class="${rarity === "R" ? "is-active" : ""}"><span>R</span><small>Rare</small></div>
            <div data-tier="SR" class="${rarity === "SR" ? "is-active" : ""}"><span>SR</span><small>Super Rare</small></div>
            <div data-tier="SSR" class="${rarity === "SSR" ? "is-active" : ""}"><span>SSR</span><small>Super Super Rare</small></div>
            <div data-tier="UR" class="${rarity === "UR" ? "is-active" : ""}"><span>UR</span><small>Ultra Rare</small></div>
          </div>

          <footer class="vl-rarity-v8__foot">
            <span>✦ Sistema de invocação Gacha</span>
            <span>Raridade atual: <b>${esc(rarity)}</b></span>
          </footer>
        </section>
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
    return `
      <div class="vl-profile-metric" data-metric="${escapeHtml(cleanValue(token || label).toLowerCase())}">
        <small>${escapeHtml(label)}</small>
        <strong>${escapeHtml(value)}</strong>
        ${note ? `<span>${escapeHtml(note)}</span>` : ""}
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

  function getFallbackMedia(ctx, kind, fallback) {
    const fallbacks = getFallbacks(ctx);
    const entry = fallbacks?.[kind];
    const website = entry?.website && typeof entry.website === "object" ? entry.website : {};
    const value = website.default || website.undefined || website.missing || fallbacks?.defaults?.[kind];
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
    const orderProgression = getSectionOrder(ctx, "progression", 30);
    const orderSystems = getSectionOrder(ctx, "systems", 40);
    const orderClanTitle = getSectionOrder(ctx, "clan_title", 50);
    const orderBadges = getSectionOrder(ctx, "badges", 60);

    scheduleProfileDocumentColorEffects();

    return `
      <div class="detail-stage vl-profile-stage" style="--vp-accent:${color};">
        <div class="vl-profile-orbit" aria-hidden="true"></div>
        <div class="vl-profile-layout">
          <aside class="vl-profile-identity vl-profile-identity--official-card">
            ${renderOfficialProfileCard(player, ctx || {}, displayNamePlain)}
          </aside>

          <section class="vl-profile-content vl-profile-content--dossier" aria-label="Informações completas do perfil">
            <section class="vl-profile-panel vl-profile-panel--overview vl-profile-panel--record" style="order:${orderOverview}">
              <div class="vl-profile-section-head"><span>Registro principal</span><i></i></div>
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

              <div class="vl-profile-metrics-row" aria-label="Resumo rápido">
                ${buildMetricChip("Nível", String(level || 0), "Nível atual", "level")}
                ${buildMetricChip("XP", xp, "Experiência", "xp")}
                ${buildMetricChip("Pontos", points, "Pontuação", "points")}
                ${buildMetricChip("Status", onlineLabel, "Presença", onlineToken)}
              </div>
            </section>

            <section class="vl-profile-panel vl-profile-panel--tier vl-profile-panel--progress-v2" style="order:${orderProgression}">
              <div class="vl-profile-section-head"><span>Progressão</span><i></i></div>
              ${h.buildLevelInfoEmblemHtml(player)}
              ${h.buildRankTitleMarkHtml(player, "vl-profile-rank-mark")}
            </section>

            ${buildRarityV8Section(player, ctx || {}, orderSystems)}

            <section class="vl-profile-duo vl-profile-duo--records vl-profile-duo--records-single" style="order:${orderClanTitle}">
              <div class="vl-profile-panel vl-profile-panel--clan">
                <div class="vl-profile-section-head"><span>Clã</span><i></i></div>
                ${h.buildClanInfoCardHtml(player)}
              </div>
            </section>

            <section class="vl-profile-panel vl-profile-panel--badges vl-profile-panel--badges-v3" style="order:${orderBadges}">
              <div class="vl-profile-section-head"><span>Distintivos & conquistas</span><i></i></div>
              <div class="vl-distinctives-grid">
                ${h.buildRoleInfoEmblemHtml(player)}
                ${h.buildRankInfoEmblemHtml(player)}
              </div>
              <div class="vl-achievements-zone">
                ${h.buildAchievementsGalleryHtml(player)}
              </div>
            </section>
          </section>
        </div>
      </div>`;
  }

  window.VelarionProfile = {
    render,
    setupProfileDocumentColorEffects
  };
})();
