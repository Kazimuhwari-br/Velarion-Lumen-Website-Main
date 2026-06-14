(function() {
  "use strict";

  const DEFAULT_AVATAR = "https://mc-heads.net/avatar/Steve/256";
  const DEFAULT_BANNER = "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1200&q=80";
  const DEFAULT_CHARACTER = "";

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

  function getClanNameFallback(player) {
    return stripMinecraftCodes(player?.clan?.name || player?.clan?.tag || player?.profile?.clan || "Sem clã");
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

  function render(player, ctx) {
    const h = makeHelpers(ctx || {});
    const color = h.normalizeHexColor(player?.theme?.card_embed?.card_color || player?.theme?.profile?.accent || "#8b6cff");
    const avatar = h.getAvatar(player) || getFallbackMedia(ctx, "avatar", DEFAULT_AVATAR);
    const banner = h.getBanner(player) || getFallbackMedia(ctx, "banner", DEFAULT_BANNER);
    const character = h.getCharacter(player) || getFallbackMedia(ctx, "character", DEFAULT_CHARACTER);
    const characterFallback = h.hasBanner(player) ? "" : ((ctx && ctx.DEFAULT_PLAYER_CHARACTER) || DEFAULT_CHARACTER);
    const displayNamePlain = h.stripMinecraftCodes(h.getDisplayName(player)) || "Jogador";
    const username = h.getUsername(player);
    const titleHtml = h.buildTitleHtml(player);
    const cardTitle = h.getCardTitle(player);
    const clanName = h.getClanName(player) || "Sem clã";
    const desc = getBio(player);
    const country = getCountry(player);
    const level = getPlayerLevel(player);
    const tier = getTierName(player);
    const characterPixelClass = h.isProbablyPixelArt(character) ? "pixelated" : "";
    const playerId = player?._id || player?.id || "ID";
    const orderHeader = getSectionOrder(ctx, "header", 10);
    const orderOverview = getSectionOrder(ctx, "overview", 20);
    const orderProgression = getSectionOrder(ctx, "progression", 30);
    const orderSystems = getSectionOrder(ctx, "systems", 40);
    const orderClanTitle = getSectionOrder(ctx, "clan_title", 50);
    const orderBadges = getSectionOrder(ctx, "badges", 60);
    const rarityInfoHtml = buildRarityVisualCard(player, ctx || {});
    const moderationStatusHtml = buildStatusVisualCard(player, ctx || {});
    const extraSystemsHtml = `
              <section class="vl-profile-duo vl-profile-duo--systems" style="order:${orderSystems}">
                <div class="vl-profile-panel vl-profile-panel--rarity"><div class="vl-profile-section-head"><span>Raridade</span><i></i></div>${rarityInfoHtml}</div>
                <div class="vl-profile-panel vl-profile-panel--status"><div class="vl-profile-section-head"><span>Status público</span><i></i></div>${moderationStatusHtml}</div>
              </section>`;

    return `
      <div class="detail-stage vl-profile-stage" style="--vp-accent:${color};">
        <div class="vl-profile-orbit" aria-hidden="true"></div>
        <div class="vl-profile-layout">
          <aside class="vl-profile-identity">
            <article class="detail-card vl-profile-card" aria-label="${h.escapeHtml(displayNamePlain)}" style="--accent:${color};--vp-accent:${color};">
              <div class="vl-profile-art">
                <img class="vl-profile-banner" src="${h.escapeHtml(banner)}" alt="${h.escapeHtml(displayNamePlain)}" loading="eager" referrerpolicy="no-referrer" crossorigin="anonymous" draggable="false" onerror="this.onerror=null; this.src='${h.escapeHtml((ctx && ctx.DEFAULT_PLAYER_BANNER) || DEFAULT_BANNER)}'">
                <div class="vl-profile-character-wrap ${characterPixelClass}">
                  ${character || characterFallback ? `<img class="vl-profile-character" src="${h.escapeHtml(character || characterFallback)}" alt="${h.escapeHtml(displayNamePlain)}" loading="eager" referrerpolicy="no-referrer" crossorigin="anonymous" draggable="false" onerror="this.onerror=null; this.style.display='none'">` : ""}
                </div>
              </div>

              <div class="vl-profile-card-top">
                ${h.buildLevelChipHtml(player)}
                <div class="vl-profile-clan-pill"><span>${h.escapeHtml(clanName)}</span></div>
              </div>

              <div class="vl-profile-card-bottom">
                ${h.buildUsernameLine(player, "detail")}
                <h2 class="vl-profile-name">${titleHtml}</h2>
                <div class="vl-profile-titleline">${h.escapeHtml(cardTitle)}</div>
                <div class="vl-profile-card-line" aria-hidden="true"><i></i></div>
              </div>
            </article>

            <section class="vl-profile-bio-panel">
              <div class="vl-profile-section-head"><span>Sobre</span><i>✦</i></div>
              <p>${h.minecraftToHtml(desc)}</p>
            </section>
          </aside>

          <section class="vl-profile-content" aria-label="Informações completas do perfil">
            <header class="vl-profile-header-panel" style="order:${orderHeader}">
              <div class="vl-profile-avatar-wrap">
                <img src="${h.escapeHtml(avatar)}" alt="Avatar de ${h.escapeHtml(displayNamePlain)}" loading="eager" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.onerror=null; this.src='${h.escapeHtml((ctx && ctx.DEFAULT_PLAYER_AVATAR) || DEFAULT_AVATAR)}'">
              </div>
              <div class="vl-profile-heading">
                <span class="vl-profile-kicker">Arquivo do Perfil</span>
                <h1>Informações completas</h1>
                <p>${h.escapeHtml(displayNamePlain)} • ${h.escapeHtml(playerId)}</p>
              </div>
              <div class="vl-profile-verified-slot">${h.buildVerifiedCardBadgeHtml(player)}</div>
            </header>

            <section class="vl-profile-panel vl-profile-panel--overview" style="order:${orderOverview}">
              <div class="vl-profile-section-head"><span>Identidade</span><i></i></div>
              <div class="vl-profile-info-grid vl-profile-clanlike-grid">
                ${buildClanVisualCard({
                  className: "vl-profile-clanlike-card--user",
                  label: "Usuário",
                  value: username,
                  note: "Identificação pública",
                  iconText: getInitials(username, "US"),
                  image: avatar,
                  color: "#d85a4d"
                })}
                ${buildClanVisualCard({
                  className: "vl-profile-clanlike-card--country",
                  label: "País",
                  value: country,
                  note: "Origem exibida",
                  iconText: getInitials(country, "BR"),
                  color: "#d85a4d"
                })}
                ${buildClanVisualCard({
                  className: "vl-profile-clanlike-card--tier",
                  label: "Nível atual",
                  value: tier,
                  note: "Classificação do perfil",
                  iconText: "NA",
                  color: "#d85a4d"
                })}
                ${buildClanVisualCard({
                  className: "vl-profile-clanlike-card--level",
                  label: "Nível",
                  value: String(level || 0),
                  note: "Nível atual",
                  iconText: "LV",
                  color: "#d85a4d"
                })}
              </div>
            </section>

            <section class="vl-profile-panel vl-profile-panel--tier" style="order:${orderProgression}">
              <div class="vl-profile-section-head"><span>Progressão</span><i></i></div>
              ${h.buildLevelInfoEmblemHtml(player)}
              ${h.buildRankTitleMarkHtml(player, "vl-profile-rank-mark")}
            </section>

            ${extraSystemsHtml}

            <section class="vl-profile-duo" style="order:${orderClanTitle}">
              <div class="vl-profile-panel vl-profile-panel--clan">
                <div class="vl-profile-section-head"><span>Clã</span><i></i></div>
                ${h.buildClanInfoCardHtml(player)}
              </div>
              <div class="vl-profile-panel vl-profile-panel--title">
                <div class="vl-profile-section-head"><span>Título</span><i></i></div>
                ${buildClanVisualCard({
                  className: "vl-profile-clanlike-card--title",
                  label: "Título",
                  value: cardTitle,
                  note: "Título exibido no perfil",
                  iconText: "TT",
                  color: "#d85a4d"
                })}
              </div>
            </section>

            <section class="vl-profile-panel vl-profile-panel--badges" style="order:${orderBadges}">
              <div class="vl-profile-section-head"><span>Distintivos & conquistas</span><i></i></div>
              <div class="vl-profile-badges-grid">
                <div class="vl-profile-badge-block">
                  <small>Cargo</small>
                  ${h.buildRoleInfoEmblemHtml(player)}
                </div>
                <div class="vl-profile-badge-block">
                  <small>Rank</small>
                  ${h.buildRankInfoEmblemHtml(player)}
                </div>
                <div class="vl-profile-badge-block vl-profile-badge-block--wide">
                  <small>Conquistas</small>
                  ${h.buildAchievementsGalleryHtml(player)}
                </div>
              </div>
            </section>
          </section>
        </div>
      </div>`;
  }

  window.VelarionProfile = {
    render
  };
})();
