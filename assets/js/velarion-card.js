/* ======================================================================
   Velarion Lumen - Official Profile Card Renderer
   Extraído de Velarion_Lumen_Card_Preview.html e adaptado para produção.
   Não contém dados de preview; recebe os objetos oficiais do site:
   clanPlayers, profilePlayers, badges_raritys, badges_avatarlocks,
   badges_levelranks e badges_verified.
   ====================================================================== */
(function(window, document) {
  "use strict";

  const PREVIEW_MODE = false;

  function getCurrentScriptUrl() {
    const script = document.currentScript || document.querySelector('script[src*="velarion-card.js"]');
    return script && script.src ? script.src : window.location.href;
  }

  function resolveAsset(path) {
    try {
      return new URL(path, getCurrentScriptUrl()).href;
    } catch (error) {
      return path;
    }
  }

  const LOCKED_AVATAR_PLACEHOLDER_IMAGE = resolveAsset("../img/card/avatar_locked.png");

  let badges_verified = {};
  let badges_levelranks = {};
  let badges_avatarlocks = {};
  let badges_raritys = {};
  let badges_fallbacks = {};
  let server_panel = {};
  let nickname_colors = {};
  let clanPlayers = {};
  let profilePlayers = {};

  function asObject(value) {
    return value && typeof value === "object" ? value : {};
  }

  function setData(data) {
    const source = asObject(data);
    const extensions = asObject(source.extensionsData || source.extensions || source.information_panel);

    badges_verified = asObject(source.badges_verified || extensions.badges_verified || badges_verified);
    badges_levelranks = asObject(source.badges_levelranks || extensions.badges_levelranks || badges_levelranks);
    badges_avatarlocks = asObject(source.badges_avatarlocks || extensions.badges_avatarlocks || badges_avatarlocks);
    badges_raritys = asObject(
      source.badges_raritys ||
      source.badges_rarities ||
      extensions.badges_raritys ||
      extensions.badges_rarities ||
      badges_raritys
    );
    badges_fallbacks = asObject(source.badges_fallbacks || extensions.badges_fallbacks || badges_fallbacks);
    server_panel = asObject(source.server_panel || extensions.server_panel || server_panel);
    nickname_colors = asObject(
      source.nickname_colors ||
      source.nicknameColors ||
      server_panel.nickname_colors ||
      server_panel.nicknameColors ||
      extensions.nickname_colors ||
      extensions.nicknameColors ||
      nickname_colors
    );
    clanPlayers = asObject(source.clanPlayers || source.clansData || source.clans || clanPlayers);
    profilePlayers = asObject(source.profilePlayers || source.playersData || profilePlayers);
  }

    function escapeHTML(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function isValidHexColor(value) {
      return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value ?? "").trim());
    }

    function getCleanText(value) {
      return String(value ?? "").trim();
    }

    function toBoolean(value, fallback = false) {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value !== 0;
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "y", "on", "sim", "s"].includes(normalized)) return true;
        if (["false", "0", "no", "n", "off", "nao", "não"].includes(normalized)) return false;
      }
      return fallback;
    }

    function getBooleanByKeys(source, keys, fallback = true) {
      const object = source && typeof source === "object" ? source : {};

      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(object, key)) {
          return toBoolean(object[key], fallback);
        }
      }

      return fallback;
    }


    function getFallbackEntry(kind) {
      const entry = badges_fallbacks?.[kind];
      return entry && typeof entry === "object" ? entry : {};
    }

    function getFallbackDefaultId(kind, fallback = "") {
      const defaults = badges_fallbacks?.defaults && typeof badges_fallbacks.defaults === "object" ? badges_fallbacks.defaults : {};
      const legacy = badges_fallbacks?.profile?.website && typeof badges_fallbacks.profile.website === "object" ? badges_fallbacks.profile.website : {};
      const entry = getFallbackEntry(kind);
      const website = entry?.website && typeof entry.website === "object" ? entry.website : {};
      const candidates = [
        defaults[`${kind}_id`], defaults[kind], legacy[`${kind}_id`], legacy[kind],
        entry.fallback_id, entry.default_id, entry.id, website.fallback_id, website.default_id, website.id, fallback
      ];
      for (const value of candidates) {
        const clean = getCleanText(value);
        if (clean) return clean;
      }
      return "";
    }

    function getFallbackRecord(kind) {
      const entry = getFallbackEntry(kind);
      return entry && Object.keys(entry).length ? entry : null;
    }

    function getFallbackMedia(kind, key = "default") {
      const entry = getFallbackEntry(kind);
      const website = entry?.website && typeof entry.website === "object" ? entry.website : {};
      const value = website[key] || website.default || website.undefined || website.missing || badges_fallbacks?.defaults?.[kind];
      return getCleanText(value);
    }

    function getNicknameFallbackColor() {
      const defaults = badges_fallbacks?.defaults && typeof badges_fallbacks.defaults === "object" ? badges_fallbacks.defaults : {};
      const candidates = [
        defaults.nickname_color,
        defaults.nicknameColor,
        defaults.display_name_color,
        defaults.displayNameColor,
        defaults.name_color,
        badges_fallbacks?.nickname_color,
        badges_fallbacks?.nicknameColor
      ];

      for (const value of candidates) {
        const clean = getCleanText(value);
        if (clean) return clean;
      }

      return "#FFFFFF";
    }


    function isVisibleFor(definition, area = "card", fallback = true) {
      if (!definition || typeof definition !== "object") return false;
      if (definition.enabled === false) return false;
      const visibility = definition.visibility && typeof definition.visibility === "object" ? definition.visibility : {};
      if (visibility.public === false) return false;
      if (Object.prototype.hasOwnProperty.call(visibility, area)) return visibility[area] !== false;
      return fallback;
    }

    function getBadgeWebsite(definition) {
      return definition && typeof definition.website === "object" ? definition.website : {};
    }


    function toDataToken(value, fallback = "none") {
      const token = getCleanText(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

      return token || fallback;
    }

    function getRarityKeyFromId(id) {
      return toDataToken(getCleanText(id).replace(/^raritys?_id_/i, ""), "none");
    }

    function getRarityEvolution(value, fallback = "normal") {
      const allowed = new Set(["none", "normal", "rare", "elite", "summon", "mythic", "legendary", "divine", "exclusive", "event", "unique"]);
      const evolution = toDataToken(value, fallback);
      return allowed.has(evolution) ? evolution : fallback;
    }

    function getNumber(value, fallback = 0) {
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    }

    function clampNumber(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function formatLevelDisplay(value) {
      const number = Math.max(0, Math.floor(getNumber(value, 0)));
      return String(number);
    }

    function escapeCSSURL(value) {
      return String(value ?? "")
        .replaceAll("\\", "\\\\")
        .replaceAll('"', '\\"')
        .replaceAll("\n", "")
        .replaceAll("\r", "");
    }

    function formatPercent(value) {
      return String(Number(value.toFixed(2))).replace(/\.0$/, "");
    }

    function getStarFills(percent) {
      const normalized = clampNumber(getNumber(percent, 0), 0, 100);
      const stars = normalized / 20;

      return Array.from({ length: 5 }, (_, index) => {
        return clampNumber(stars - index, 0, 1) * 100;
      });
    }

    function renderStars(kdRatioPercent) {
      const normalized = clampNumber(getNumber(kdRatioPercent, 0), 0, 100);
      const label = `KD Ratio ${formatPercent(normalized)}%`;
      const starsHTML = getStarFills(normalized)
        .map((fill) => {
          return `<span class="vl-card__star" style="--star-fill: ${fill.toFixed(2)}%" aria-hidden="true">★</span>`;
        })
        .join("");

      return `
        <div class="vl-card__stars" title="${escapeHTML(label)}" aria-label="${escapeHTML(label)}">
          ${starsHTML}
        </div>
      `;
    }

    function findLevelRank(level, levelRanks) {
      const playerLevel = getNumber(level, 0);

      const ranks = Object.entries(levelRanks ?? {})
        .map(([id, data]) => {
          const website = data?.website ?? {};
          const min = getNumber(data?.min ?? website.min, 0);
          const rawMax = data?.max ?? website.max;
          const max = rawMax === null || rawMax === undefined || rawMax === "" ? Infinity : getNumber(rawMax, Infinity);

          return {
            id,
            ...data,
            min,
            max
          };
        })
        .filter((rank) => playerLevel >= rank.min && playerLevel <= rank.max)
        .sort((a, b) => b.min - a.min);

      if (ranks[0]) return ranks[0];
      const fallbackId = getFallbackDefaultId("levelrank", "levelranks_id_unranked");
      const fallbackRank = fallbackId && levelRanks?.[fallbackId] ? levelRanks[fallbackId] : getFallbackRecord("levelrank");
      return fallbackRank ? { id: fallbackId, ...fallbackRank, min: getNumber(fallbackRank.min ?? fallbackRank.website?.min, 0), max: getNumber(fallbackRank.max ?? fallbackRank.website?.max, 0) } : null;
    }

    function renderEmblem(emblemId, badgesVerified) {
      const id = getCleanText(emblemId);

      if (!id) return "";

      const record = badgesVerified?.[id];
      const badge = getBadgeWebsite(record);

      if (!record || !isVisibleFor(record, "card", true)) {
        console.warn("Emblema não encontrado ou oculto:", id);
        return "";
      }

      const icon = badge.icon || record.icon || badge.emblem || record.emblem || "";
      const fullEmblem = badge.emblem || record.emblem || icon;
      const label = badge.label || record.label || "Emblema";
      const color = isValidHexColor(badge.color || record.color) ? (badge.color || record.color) : "#3b9dff";

      if (!icon) return "";

      return `
        <span
          class="vl-card__emblem"
          title="${escapeHTML(label)}"
          aria-label="${escapeHTML(label)}"
          style="--emblem-color: ${escapeHTML(color)}"
          data-emblem-id="${escapeHTML(id)}"
          data-emblem-full="${escapeHTML(fullEmblem)}"
        >
          <img src="${escapeHTML(icon)}" alt="" loading="lazy">
        </span>
      `;
    }

    function renderRankIcon(rank) {
      const icon = rank?.website?.icon || rank?.icon || "";

      if (!icon) return "";

      return `<img class="vl-card__rank-icon" src="${escapeHTML(icon)}" alt="" loading="lazy" aria-hidden="true">`;
    }


    function findRarityBadge(rarityConfig, rarityBadges) {
      const config = rarityConfig ?? {};
      const id = getCleanText(typeof config === "string" ? config : (config.id ?? config.rarity_id ?? config.value)) || getFallbackDefaultId("rarity", "raritys_id_n");
      const enabled = Boolean(id);

      if (!id || !enabled) {
        return {
          id,
          requestedId: id,
          enabled: false,
          label: "",
          key: "none",
          evolution: "none",
          color: "#ffffff",
          color2: "#fff6dc",
          glow: "#ffffff",
          shortLabel: "SUMMON",
          stars: "★★★★★"
        };
      }

      const idAliases = [
        id,
        id.replace(/^rarity_id_/, "raritys_id_"),
        id.replace(/^raritys_id_/, "rarity_id_")
      ];

      const resolvedId = idAliases.find((alias) => rarityBadges?.[alias]);
      const rarity = resolvedId ? rarityBadges?.[resolvedId] : getFallbackRecord("rarity");

      if (!rarity || !isVisibleFor(rarity, "card", true)) {
        console.warn("Raridade não encontrada:", id);
        return {
          id,
          requestedId: id,
          enabled: false,
          label: "",
          key: "none",
          evolution: "none",
          color: "#ffffff",
          color2: "#fff6dc",
          glow: "#ffffff",
          shortLabel: "SUMMON",
          stars: "★★★★★"
        };
      }

      const website = rarity.website ?? {};
      const color = isValidHexColor(website.color || rarity.color) ? (website.color || rarity.color) : "#ffffff";
      const color2 = isValidHexColor(website.color2 || rarity.color2) ? (website.color2 || rarity.color2) : "color-mix(in srgb, #ffffff 26%, #fff6dc 74%)";
      const glow = isValidHexColor(website.glow || rarity.glow) ? (website.glow || rarity.glow) : color;
      const key = getRarityKeyFromId(resolvedId || id);
      const frame = rarity.card_effects?.frame || website.evolution || rarity.evolution;
      const evolution = getRarityEvolution(frame, key === "ssr" ? "summon" : "normal");
      const intensity = clampNumber(getNumber(rarity.card_effects?.intensity ?? website.intensity ?? rarity.intensity, 0.65), 0, 1.25);

      return {
        id: resolvedId,
        requestedId: id,
        enabled,
        label: getCleanText(rarity.label || rarity.name || website.badge_text) || "RARITY",
        key,
        evolution,
        color,
        color2,
        glow,
        shortLabel: getCleanText(website.short_label ?? website.shortLabel ?? website.badge_text) || "SUMMON",
        stars: getCleanText(website.stars) || (rarity.stars_count ? "★".repeat(clampNumber(getNumber(rarity.stars_count, 5), 1, 5)) : "★★★★★"),
        intensity,
        cardEffects: rarity.card_effects || {},
        profileEffects: rarity.profile_effects || {},
        priority: getNumber(rarity.priority, 0),
        order: getNumber(rarity.order, 0)
      };
    }

    function findAvatarLockBadge(lockConfig, avatarLockBadges) {
      const fallbackAvatarLockId = getFallbackDefaultId("avatarlock", getFallbackDefaultId("status", "warns_id_undefined"));
      const config = lockConfig ?? fallbackAvatarLockId;
      const rawId = getCleanText(
        typeof config === "string"
          ? config
          : (config.id ?? config.avatar_lock_id ?? config.warn_id ?? config.warns_id ?? config.locked_avatar_id)
      );
      const id = rawId || fallbackAvatarLockId;

      const idAliases = Array.from(new Set([
        id,
        id.replace(/^warn_id_/, "warns_id_"),
        id.replace(/^warns_id_/, "warn_id_"),
        id.replace(/^avatar_lock_id_/, "warns_id_"),
        id.replace(/^avatarlocks_id_/, "warns_id_"),
        id.replace(/^warns_id_/, "avatar_lock_id_"),
        id.replace(/^warns_id_/, "avatarlocks_id_")
      ]));

      let resolvedId = idAliases.find((alias) => avatarLockBadges?.[alias]);
      let badge = resolvedId ? avatarLockBadges?.[resolvedId] : null;

      if (!badge) {
        console.warn("Motivo de avatar bloqueado não encontrado:", id);
        resolvedId = fallbackAvatarLockId;
        badge = avatarLockBadges?.[resolvedId] ?? getFallbackRecord("avatarlock") ?? {
          label: "Bloqueado",
          website: {
            color: "#D9A871",
            color2: "#FFF0C4",
            glow: "#FFD27A",
            icon: "",
            description: "Personagem bloqueado."
          }
        };
      }

      const website = badge.website ?? {};
      const publicInfo = badge.public && typeof badge.public === "object" ? badge.public : {};
      const canReveal = isVisibleFor(badge, "card", true);
      const color = isValidHexColor(website.color || badge.color) ? (website.color || badge.color) : "#D9A871";
      const color2 = isValidHexColor(website.color2 || badge.color2) ? (website.color2 || badge.color2) : "#FFF0C4";
      const glow = isValidHexColor(website.glow || badge.glow) ? (website.glow || badge.glow) : color;
      const label = canReveal
        ? (getCleanText(badge.label ?? website.label) || "Bloqueado")
        : (getCleanText(publicInfo.safe_label) || "Perfil indisponível");
      const safeDescription = canReveal
        ? (getCleanText(website.description ?? badge.description) || `Personagem bloqueado: ${label}.`)
        : (getCleanText(publicInfo.safe_description) || "Este perfil não está disponível publicamente.");

      return {
        id: resolvedId,
        requestedId: id,
        key: toDataToken(String(resolvedId || id).replace(/^warns?_id_/i, ""), "locked"),
        label,
        color,
        color2,
        glow,
        icon: getCleanText(website.icon ?? badge.icon),
        description: safeDescription,
        severity: getNumber(badge.severity, 0),
        riskLevel: getCleanText(badge.moderation?.risk_level || badge.status) || "none"
      };
    }



    function findClanPlayer(clanId, clanDataSource) {
      const requestedId = getCleanText(clanId);

      if (!requestedId) {
        return {
          enabled: false,
          id: "",
          requestedId: "",
          key: "none",
          name: "",
          color: "#F54927",
          color2: "#FFD7CF",
          glow: "#F54927",
          icon: ""
        };
      }

      const idAliases = Array.from(new Set([
        requestedId,
        requestedId.toUpperCase(),
        requestedId.toLowerCase()
      ]));

      const resolvedId = idAliases.find((alias) => clanDataSource?.[alias]);
      const clan = resolvedId ? clanDataSource?.[resolvedId] : null;

      if (!clan) {
        console.warn("Clã não encontrado:", requestedId);
        return {
          enabled: false,
          id: requestedId,
          requestedId,
          key: toDataToken(requestedId, "clan"),
          name: requestedId,
          color: "#F54927",
          color2: "#FFD7CF",
          glow: "#F54927",
          icon: ""
        };
      }

      const cardEmbed = clan.theme?.card_embed ?? {};
      const rawColor = cardEmbed.card_color ?? clan.card_color ?? clan.color ?? clan.website?.color;
      const color = isValidHexColor(rawColor) ? getCleanText(rawColor) : "#F54927";
      const color2 = isValidHexColor(cardEmbed.card_color2 ?? clan.card_color2 ?? clan.color2 ?? clan.website?.color2)
        ? getCleanText(cardEmbed.card_color2 ?? clan.card_color2 ?? clan.color2 ?? clan.website?.color2)
        : `color-mix(in srgb, ${color} 32%, #ffffff 68%)`;
      const glow = isValidHexColor(cardEmbed.glow ?? clan.glow ?? clan.website?.glow)
        ? getCleanText(cardEmbed.glow ?? clan.glow ?? clan.website?.glow)
        : color;

      return {
        enabled: true,
        id: resolvedId,
        requestedId,
        key: toDataToken(resolvedId || requestedId, "clan"),
        name: getCleanText(clan.sub ?? clan.name ?? clan.label ?? clan.website?.label ?? resolvedId) || resolvedId,
        color,
        color2,
        glow,
        icon: getCleanText(cardEmbed.avatar_bottom_image ?? clan.avatar_bottom_image ?? clan.icon ?? clan.website?.icon)
      };
    }

    function renderClanBadge(profile) {
      if (!profile.cardEnabled || !profile.showClan || !profile.clan?.enabled) return "";

      const clan = profile.clan;
      const clanName = getCleanText(clan.name || clan.id || "CLAN");
      const iconHTML = clan.icon
        ? `<img class="vl-card__clan-icon" src="${escapeHTML(clan.icon)}" alt="" loading="lazy">`
        : "";

      return `
        <div
          class="vl-card__clan-badge"
          aria-label="Clã ${escapeHTML(clanName)}"
          title="Clã ${escapeHTML(clanName)}"
          data-clan-id="${escapeHTML(clan.requestedId || clan.id || "")}"
        >
          ${iconHTML}
          <span class="vl-card__clan-name">${escapeHTML(clanName)}</span>
        </div>
      `;
    }


    function renderRarityMark(rarity) {
      if (!rarity?.enabled) return "";

      const label = getCleanText(rarity.label);
      const stars = getCleanText(rarity.stars) || "★★★★★";

      return `
        <div
          class="vl-card__rarity-mark"
          title="Raridade ${escapeHTML(label)}"
          aria-label="Raridade ${escapeHTML(label)}"
          data-rarity-id="${escapeHTML(rarity.requestedId || rarity.id)}"
        >
          <strong class="vl-card__rarity-label" data-fit-line data-fit-max="48" data-fit-min="30">${escapeHTML(label)}</strong>
          <span class="vl-card__rarity-stars" aria-hidden="true">${escapeHTML(stars)}</span>
        </div>
      `;
    }



    function renderLevelRankChip(profile) {
      const levelHTML = profile.showLevel
        ? `
          <div class="vl-card__rank-level" aria-hidden="true">
            <span class="vl-card__rank-level-label">Lv.</span>
            <strong class="vl-card__rank-level-number">${escapeHTML(profile.levelCode)}</strong>
          </div>
        `
        : "";

      const badgeHTML = profile.showLevelBadges
        ? `
          ${renderRankIcon(profile.levelRank)}
          <div class="vl-card__rank-name" data-fit-line data-fit-max="12" data-fit-min="9">
            ${escapeHTML(profile.rankName)}
          </div>
        `
        : "";

      if (!levelHTML && !badgeHTML) return "";

      const classes = ["vl-card__rank"];
      if (levelHTML && !badgeHTML) classes.push("vl-card__rank--level-only");
      if (!levelHTML && badgeHTML) classes.push("vl-card__rank--badge-only");

      const aria = [
        levelHTML ? `Nível ${profile.levelCode}` : "",
        badgeHTML ? profile.rankName : ""
      ].filter(Boolean).join(" • ");

      return `
        <div class="${classes.join(" ")}" aria-label="${escapeHTML(aria)}">
          ${levelHTML}
          ${badgeHTML}
        </div>
      `;
    }


    function createSecurityBarcodeBars(value, count = 24) {
      const seed = String(value || "VL-000");

      return Array.from({ length: count }, (_, index) => {
        const charCode = seed.charCodeAt(index % seed.length) || 48;
        const width = 1 + ((charCode + index) % 3);
        const height = 6 + ((charCode * (index + 3)) % 6);
        const opacity = 0.46 + (((charCode + index) % 5) * 0.07);

        return `<span style="--bar-w: ${width}; --bar-h: ${height}; opacity: ${opacity.toFixed(2)}"></span>`;
      }).join("");
    }

    function renderSecurityBarcode(profile) {
      if (!profile.cardEnabled || !profile.showBarcode) return "";

      const seed = profile.profileCode || profile.index || "#000";

      return `
        <span class="vl-card__security-barcode" aria-hidden="true" title="Código visual ${escapeHTML(seed)}">
          <span class="vl-card__security-barcode-bars">
            ${createSecurityBarcodeBars(seed)}
          </span>
        </span>
      `;
    }

    function renderSecurityOverlay(profile) {
      if (!profile.cardEnabled) return "";

      const linesHTML = profile.showLines
        ? `
          <div class="vl-card__security-art-lines" aria-hidden="true">
            <span class="vl-card__security-art-line vl-card__security-art-line--one"></span>
            <span class="vl-card__security-art-line vl-card__security-art-line--two"></span>
            <span class="vl-card__security-art-line vl-card__security-art-line--three"></span>
          </div>
        `
        : "";

      const clanHTML = renderClanBadge(profile);

      return `${linesHTML}${clanHTML}`;
    }

    function renderSecretBanner(profile) {
      if (!profile.cardEnabled || profile.showBanner) return "";
      return `<div class="vl-card__secret-banner" aria-hidden="true" title="Banner oculto"></div>`;
    }

    function renderLockedAvatarOverlay(profile) {
      if (!profile.cardEnabled || profile.showAvatar) return "";

      const lock = profile.avatarLock ?? {};
      const label = getCleanText(lock.label) || "Bloqueado";
      const description = getCleanText(lock.description) || `Personagem bloqueado: ${label}.`;
      const iconHTML = lock.icon
        ? `<img class="vl-card__locked-avatar-icon" src="${escapeHTML(lock.icon)}" alt="" loading="lazy">`
        : "";
      const badgeClass = iconHTML
        ? "vl-card__locked-avatar-badge vl-card__locked-avatar-badge--icon"
        : "vl-card__locked-avatar-badge";

      return `
        <div
          class="vl-card__locked-avatar-overlay"
          aria-hidden="true"
          title="${escapeHTML(description)}"
          data-avatar-lock-id="${escapeHTML(lock.requestedId || lock.id || "warns_id_undefined")}"
        >
          <span class="vl-card__locked-avatar-question" title="${escapeHTML(description)}">
            <img
              class="vl-card__locked-avatar-question-image"
              src="${escapeHTML(LOCKED_AVATAR_PLACEHOLDER_IMAGE)}"
              alt=""
              loading="lazy"
            >
          </span>
          <span
            class="${badgeClass}"
            title="${escapeHTML(description)}"
            data-avatar-lock-id="${escapeHTML(lock.requestedId || lock.id || "warns_id_undefined")}" 
          >${iconHTML}<span>${escapeHTML(label)}</span></span>
        </div>
      `;
    }

    function renderSecretAvatar(profile) {
      if (!profile.cardEnabled || profile.showAvatar) return "";
      return `<div class="vl-card__secret-avatar" aria-hidden="true" title="Avatar oculto"></div>`;
    }

    function getSecretClass(isVisible) {
      return isVisible ? "" : " vl-card__secret-text";
    }


    // ===== Cores dos apelidos: compatível com o sistema antigo =====
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
      blue_color1: ["§1", "§9", "§t", "§3", "§s", "§b", "§3", "§9", "§1"],
      ocean_color1: ["§1", "§3", "§b", "§s", "§b", "§3", "§1"],
      sky_color1: ["§9", "§b", "§f", "§b", "§9"],
      yellow_color1: ["§6", "§p", "§g", "§e", "§g", "§p", "§6"],
      gold_color1: ["§6", "§g", "§p", "§h", "§p", "§g", "§6"],
      sun_color1: ["§f", "§e", "§g", "§p", "§6", "§v", "§n"],
      black_color1: ["§0", "§8", "§7", "§f", "§7", "§8", "§0"],
      shadow_color1: ["§0", "§j", "§8", "§7", "§8", "§j", "§0"],
      gray_color1: ["§8", "§7", "§f", "§7", "§8"],
      red_color1: ["§4", "§m", "§c", "§m", "§4"],
      fire_color1: ["§4", "§c", "§6", "§e", "§6", "§c", "§4"],
      green_color1: ["§2", "§a", "§q", "§a", "§2"],
      nature_color1: ["§2", "§a", "§f", "§a", "§2"],
      purple_color1: ["§5", "§d", "§u", "§d", "§5"],
      mystic_color1: ["§5", "§u", "§f", "§u", "§5"],
      white_color1: ["§f", "§h", "§i", "§h", "§f"],
      metal_color1: ["§8", "§i", "§h", "§f", "§h", "§i", "§8"],
      rainbow_color1: ["§4", "§6", "§e", "§a", "§b", "§9", "§5"],
      soft_rainbow_color1: ["§c", "§6", "§e", "§a", "§b", "§d"],
      kazin_color1: ["§s", "§3", "§t", "§5", "§d", "§u", "§n", "§v", "§p", "§6", "§g", "§e", "§b"]
    };

    function stripMinecraftCodes(text) {
      return String(text ?? "").replace(/§./g, "");
    }

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
        return currentColor ? "color:" + currentColor + ";" : "";
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

        const safeChar = escapeHTML(random ? obfuscateChar() : char);
        result += '<span class="' + buildClass() + '" style="' + buildStyle() + '">' + safeChar + '</span>';
      }

      return result;
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


    function normalizeNicknameColorItems(source) {
      if (!source || typeof source !== "object") return {};
      const direct = source.items && typeof source.items === "object" ? source.items : source;
      return direct && typeof direct === "object" ? direct : {};
    }

    function buildNicknameColorLookupKeys(colorName) {
        const raw = getCleanText(colorName).toLowerCase();
        if (!raw) return [];
        const keys = [];
        function add(value) {
            const key = getCleanText(value).toLowerCase().replace(/[\s-]+/g, "_");
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

      const source = nickname_colors && Object.keys(nickname_colors).length
        ? nickname_colors
        : (server_panel.nickname_colors || server_panel.nicknameColors || server_panel.items || server_panel);

      const items = normalizeNicknameColorItems(source);
      if (!items || !Object.keys(items).length) return null;

      for (const key of keys) {
        if (items[key]) return items[key];
      }
      return null;
    }

    function colorArrayToGradient(colors) {
      if (!Array.isArray(colors)) return "";
      const resolved = colors.map(function(item) {
        const raw = getCleanText(item);
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

      const type = getCleanText(record.type).toLowerCase();
      const cssValue = getCleanText(record.css_value || record.css || record.value || record.gradient || record.color);

      if (type === "gradient" || /^linear-gradient/i.test(cssValue)) {
        const gradientValue = cssValue || colorArrayToGradient(record.colors || record.gradient_colors || record.minecraft_codes);
        return gradientValue ? { type: "gradient", gradient: gradientValue } : null;
      }

      if (type === "solid" || cssValue) {
        const solidValue = cssValue || mcColors[getCleanText(record.minecraft_key).toLowerCase()] || "";
        return solidValue ? { type: "solid", color: solidValue } : null;
      }

      if (Array.isArray(record.colors) || Array.isArray(record.minecraft_codes)) {
        const gradientValue = colorArrayToGradient(record.colors || record.minecraft_codes);
        return gradientValue ? { type: "gradient", gradient: gradientValue } : null;
      }

      const minecraftKey = getCleanText(record.minecraft_key).toLowerCase();
      if (minecraftKey && mcColors[minecraftKey]) {
        return { type: "solid", color: mcColors[minecraftKey] };
      }

      return null;
    }


    function getColorNameConfig(colorName) {
      const name = getCleanText(colorName).toLowerCase();
      const serverPanelColor = name ? getServerPanelNicknameColorConfig(name) : null;

      if (serverPanelColor) return serverPanelColor;

      return {
        type: "solid",
        color: getNicknameFallbackColor(),
        isFallback: true
      };
    }

    function getNicknameRenderData(data, rawName) {
      const safeRawName = getCleanText(rawName);
      const plainName = stripMinecraftCodes(safeRawName) || "Sem nome";
      const colorConfig = getColorNameConfig(data?.theme?.color_name_id);

      if (colorConfig && colorConfig.type === "gradient" && colorConfig.gradient) {
        return {
          text: plainName,
          html: escapeHTML(plainName),
          className: " vl-card__name--gradient",
          style: "--display-name-gradient:" + colorConfig.gradient + ";"
        };
      }

      if (colorConfig && colorConfig.type === "solid" && colorConfig.color) {
        return {
          text: plainName,
          html: escapeHTML(plainName),
          className: " vl-card__name--solid",
          style: "--display-name-color:" + colorConfig.color + ";"
        };
      }

      return {
        text: plainName,
        html: minecraftToHtml(safeRawName || plainName),
        className: " vl-card__name--minecraft",
        style: ""
      };
    }


    function normalizeCardProfile(id, data, position) {
      const profile = data.profile ?? {};
      const status = data.status ?? {};
      const cardEmbed = data.theme?.card_embed ?? {};
      const securityOverlay = cardEmbed.security_overlay ?? {};

      const cardEnabled = getBooleanByKeys(cardEmbed, ["enabled"], true);

      const showClan = getBooleanByKeys(securityOverlay, ["show_clan"], true);
      const showLines = getBooleanByKeys(securityOverlay, ["show_lines"], true);
      const showBarcode = getBooleanByKeys(securityOverlay, ["show_barcode"], true);
      const showLevel = getBooleanByKeys(securityOverlay, ["show_level"], true);
      const showLevelBadges = getBooleanByKeys(securityOverlay, ["show_level_badges"], true);
      const showStatus = getBooleanByKeys(securityOverlay, ["show_status"], true);
      const showRarity = getBooleanByKeys(securityOverlay, ["show_rarity"], true);
      const showRatio = getBooleanByKeys(securityOverlay, ["show_ratio"], true);
      const showNickname = getBooleanByKeys(securityOverlay, ["show_nickname"], true);
      const showUsername = getBooleanByKeys(securityOverlay, ["show_username"], true);
      const showTitle = getBooleanByKeys(securityOverlay, ["show_title"], true);
      const showAvatar = getBooleanByKeys(securityOverlay, ["show_avatar"], true);
      const showBanner = getBooleanByKeys(securityOverlay, ["show_banner"], true);
      const avatarLockConfig = securityOverlay.avatar_lock
        ?? securityOverlay.avatar_lock_id
        ?? securityOverlay.locked_avatar_id
        ?? securityOverlay.avatar_warn_id
        ?? securityOverlay.warn_id
        ?? securityOverlay.warns_id
        ?? "warns_id_paid";
      const avatarLock = showAvatar ? null : findAvatarLockBadge(avatarLockConfig, badges_avatarlocks);
      const clan = findClanPlayer(data.clan?.id ?? data.clan_id ?? profile.clan_id, clanPlayers);

      const rawNickname = getCleanText(profile.display_nickname);
      const rawUsername = getCleanText(profile.display_username);
      const nicknameSource = rawNickname || rawUsername || "Sem nome";
      const nicknameRender = showNickname
        ? getNicknameRenderData(data, nicknameSource)
        : { text: "???", html: "???", className: "", style: "" };

      const displayNickname = nicknameRender.text || "Sem nome";
      const displayNicknameHTML = nicknameRender.html || escapeHTML(displayNickname);
      const displayUsername = showUsername ? stripMinecraftCodes(rawUsername || rawNickname || "unknown") : "";
      const displayTitle = showTitle ? stripMinecraftCodes(profile.title || "") : "???";

      const level = getNumber(data.stats?.progression?.level ?? data.progression?.level, 0);
      const kdRatio = clampNumber(getNumber(data.stats?.combat?.kd_ratio ?? data.combat?.kd_ratio, 0), 0, 100);
      const levelRank = findLevelRank(level, badges_levelranks);
      const levelRankWebsite = levelRank?.website ?? {};
      const baseRarity = findRarityBadge(data.stats?.rarity, badges_raritys);
      const rarityEnabled = cardEnabled && showRarity && Boolean(baseRarity?.enabled);
      const rarity = {
        ...baseRarity,
        enabled: rarityEnabled
      };

      // A moldura/efeitos da carta usam a cor definida no tema do jogador.
      // Caminho esperado: data.theme.card_embed.card_color
      const rawCardColor = getCleanText(cardEmbed.card_color);
      const cardColor = isValidHexColor(rawCardColor)
        ? rawCardColor
        : (isValidHexColor(levelRankWebsite.color) ? levelRankWebsite.color : "#ff84cf");

      return {
        id,
        index: String(position).padStart(3, "0"),
        levelCode: formatLevelDisplay(level),
        profileCode: `#${String(position).padStart(3, "0")}`,

        level,
        kdRatio,
        levelRank,
        rankName: levelRank?.label || "Não classificado",
        rankColor: isValidHexColor(levelRankWebsite.color) ? levelRankWebsite.color : "#ff84cf",
        rankColor2: isValidHexColor(levelRankWebsite.color2) ? levelRankWebsite.color2 : "#ffd3f0",
        rankGlow: isValidHexColor(levelRankWebsite.glow) ? levelRankWebsite.glow : "#ff84cf",

        rarity,
        rarityEnabled,
        rarityKey: rarityEnabled ? (rarity.key || "none") : "none",
        rarityEvolution: rarityEnabled ? (rarity.evolution || "normal") : "none",
        rarityColor: rarity.color || "#ffffff",
        rarityColor2: rarity.color2 || "#fff6dc",
        rarityGlow: rarity.glow || "#ffffff",
        rarityIntensity: rarity.intensity || 0,
        rarityCardEffects: rarity.cardEffects || {},
        evolutionColor: rarityEnabled ? (rarity.color || cardColor) : cardColor,
        evolutionColor2: rarityEnabled ? (rarity.color2 || `color-mix(in srgb, ${cardColor} 34%, #ffffff 66%)`) : `color-mix(in srgb, ${cardColor} 34%, #ffffff 66%)`,
        evolutionGlow: rarityEnabled ? (rarity.glow || cardColor) : cardColor,

        cardColor,
        cardColor2: `color-mix(in srgb, ${cardColor} 34%, #ffffff 66%)`,
        cardGlow: cardColor,
        cardStrong: `color-mix(in srgb, ${cardColor} 82%, #ffffff 18%)`,
        cardLight: `color-mix(in srgb, ${cardColor} 22%, #ffffff 78%)`,

        publicProfile: data.public_profile !== false,
        schemaVersion: data.schema_version ?? 1,

        displayNickname,
        displayNicknameHTML,
        nicknameClassName: nicknameRender.className || "",
        nicknameStyle: nicknameRender.style || "",
        displayUsername,
        emblem: profile.emblem || "",
        title: displayTitle,

        online: Boolean(status.online),

        cardEnabled,
        characterImage: cardEnabled ? (cardEmbed.character_image || getFallbackMedia("character", data?.profile?.gender || "default") || "") : "",
        bannerBottomImage: cardEnabled && showBanner ? (cardEmbed.banner_bottom_image || getFallbackMedia("banner") || "") : "",
        bannerFrameImage: cardEnabled && showBanner ? (cardEmbed.banner_frame_image || "") : "",
        avatarLock,
        clan,

        showNickname,
        showUsername,
        showTitle,
        showAvatar,
        showBanner,
        showClan,
        showLines,
        showBarcode,
        showLevel,
        showLevelBadges,
        showStatus,
        showRarity,
        showRatio
      };
    }

    function createProfileCard(profile) {
      if (!profile.publicProfile && !PREVIEW_MODE) {
        return "";
      }

      const status = profile.online ? "online" : "offline";
      const statusText = profile.online ? "ONLINE" : "OFFLINE";
      const rankChipHTML = renderLevelRankChip(profile);
      const statusHTML = profile.showStatus
        ? `
          <div class="vl-card__status">
            <span class="vl-card__dot"></span>
            <span>${statusText}</span>
          </div>
        `
        : "";
      const topClassNames = ["vl-card__top"];
      if (!rankChipHTML && statusHTML) topClassNames.push("vl-card__top--status-only");
      if (rankChipHTML && !statusHTML) topClassNames.push("vl-card__top--rank-only");
      const topHTML = rankChipHTML || statusHTML
        ? `
          <header class="${topClassNames.join(" ")}">
            ${rankChipHTML}
            ${statusHTML}
          </header>
        `
        : "";

      const bannerArtHTML = profile.bannerBottomImage
        ? `<img class="vl-card__art-bg" src="${escapeHTML(profile.bannerBottomImage)}" alt="" loading="eager">`
        : renderSecretBanner(profile);

      const characterHTML = profile.showAvatar
        ? (
          profile.characterImage
            ? `<img class="vl-card__character" src="${escapeHTML(profile.characterImage)}" alt="" loading="eager">`
            : ""
        )
        : `
          ${profile.characterImage
            ? `<img class="vl-card__character vl-card__character--locked" src="${escapeHTML(profile.characterImage)}" alt="" loading="eager">`
            : renderSecretAvatar(profile)
          }
          ${renderLockedAvatarOverlay(profile)}
        `;

      const rarityHTML = renderRarityMark(profile.rarity);
      const starsHTML = profile.showRatio ? renderStars(profile.kdRatio) : "";
      const nicknameSecretClass = getSecretClass(profile.showNickname);
      const titleSecretClass = getSecretClass(profile.showTitle);
      const usernameHTML = profile.showUsername
        ? `
          <div class="vl-card__user">
            <span class="vl-card__username-text" data-fit-line data-fit-max="16" data-fit-min="13">${escapeHTML(profile.displayUsername)}</span>
          </div>
        `
        : `<div class="vl-card__user vl-card__user--hidden" aria-hidden="true"></div>`;

      return `
        <article
          class="vl-card"
          data-player-id="${escapeHTML(profile.id)}"
          data-summon-no="${escapeHTML(profile.profileCode)}"
          data-idle="true"
          tabindex="0"
          aria-label="${escapeHTML(profile.displayNickname)}"
          data-status="${status}"
          data-card-embed-enabled="${profile.cardEnabled ? "true" : "false"}"
          data-theme-enabled="${profile.cardEnabled ? "true" : "false"}"
          data-rarity-enabled="${profile.rarityEnabled ? "true" : "false"}"
          data-rarity="${escapeHTML(profile.rarityKey)}"
          data-evolution="${escapeHTML(profile.rarityEvolution)}"
          data-rarity-particles="${profile.rarityCardEffects?.particles === false ? "false" : "true"}"
          data-rarity-aura="${profile.rarityCardEffects?.aura === false ? "false" : "true"}"
          data-rarity-summon-ring="${profile.rarityCardEffects?.summon_ring === false ? "false" : "true"}"
          data-rarity-shine="${profile.rarityCardEffects?.shine === false ? "false" : "true"}"
          data-show-clan="${profile.showClan ? "true" : "false"}"
          data-clan="${escapeHTML(profile.clan?.key || "none")}"
          data-clan-id="${escapeHTML(profile.clan?.requestedId || profile.clan?.id || "")}"
          data-security-lines="${profile.showLines ? "true" : "false"}"
          data-security-barcode="${profile.showBarcode ? "true" : "false"}"
          data-show-level="${profile.showLevel ? "true" : "false"}"
          data-show-level-badges="${profile.showLevelBadges ? "true" : "false"}"
          data-show-status="${profile.showStatus ? "true" : "false"}"
          data-show-rarity="${profile.showRarity ? "true" : "false"}"
          data-show-ratio="${profile.showRatio ? "true" : "false"}"
          data-show-nickname="${profile.showNickname ? "true" : "false"}"
          data-show-username="${profile.showUsername ? "true" : "false"}"
          data-show-title="${profile.showTitle ? "true" : "false"}"
          data-show-avatar="${profile.showAvatar ? "true" : "false"}"
          data-avatar-lock="${escapeHTML(profile.avatarLock?.key || "locked")}"
          data-avatar-lock-id="${escapeHTML(profile.avatarLock?.requestedId || profile.avatarLock?.id || "warns_id_paid")}"
          data-show-banner="${profile.showBanner ? "true" : "false"}"
          style="
            --card-color: ${escapeHTML(profile.cardColor)};
            --card-color2: ${escapeHTML(profile.cardColor2)};
            --card-glow: ${escapeHTML(profile.cardGlow)};
            --accent: ${escapeHTML(profile.cardColor)};
            --accent-strong: ${escapeHTML(profile.cardStrong)};
            --accent-light: ${escapeHTML(profile.cardLight)};

            /* Mantém compatibilidade com as classes antigas do frame gacha.
               Agora esses efeitos seguem show_rarity=true e stats.rarity.id. */
            --rank-color: ${escapeHTML(profile.evolutionColor)};
            --rank-color2: ${escapeHTML(profile.evolutionColor2)};
            --rank-glow: ${escapeHTML(profile.evolutionGlow)};

            /* Variáveis exclusivas do chip de nível/rank.
               Mantém o mesmo critério visual do arquivo: theme.card_embed.card_color. */
            --chip-rank-color: ${escapeHTML(profile.cardColor)};
            --chip-rank-color2: ${escapeHTML(profile.cardColor2)};
            --chip-rank-glow: ${escapeHTML(profile.cardGlow)};
            --chip-rank-light: ${escapeHTML(profile.cardLight)};

            /* Variáveis exclusivas do selo de Gacha/Invocação e evolução visual.
               Caminho dos dados: stats.rarity.id -> badges_raritys[id].website.evolution. */
            --rarity-color: ${escapeHTML(profile.rarityColor)};
            --rarity-color2: ${escapeHTML(profile.rarityColor2)};
            --rarity-glow: ${escapeHTML(profile.rarityGlow)};
            --rarity-intensity: ${escapeHTML(profile.rarityIntensity || 0)};

            /* Variáveis do motivo do avatar bloqueado.
               Caminho: theme.card_embed.security_overlay.avatar_lock_id -> badges_avatarlocks[id]. */
            --avatar-lock-color: ${escapeHTML(profile.avatarLock?.color || profile.cardColor)};
            --avatar-lock-color2: ${escapeHTML(profile.avatarLock?.color2 || profile.cardColor2)};
            --avatar-lock-glow: ${escapeHTML(profile.avatarLock?.glow || profile.cardGlow)};

            /* Variáveis do chip de clã.
               Caminho: .clan.id -> clanPlayers[id].theme.card_embed. */
            --clan-color: ${escapeHTML(profile.clan?.color || profile.cardColor)};
            --clan-color2: ${escapeHTML(profile.clan?.color2 || profile.cardColor2)};
            --clan-glow: ${escapeHTML(profile.clan?.glow || profile.cardGlow)};
          "
        >
          <div class="vl-card__summon-aura" aria-hidden="true"></div>
          <div class="vl-card__arcane-ring" aria-hidden="true"></div>

          <section class="vl-card__shell">
            <div class="vl-card__art">
              ${bannerArtHTML}
              ${characterHTML}
              ${renderSecurityOverlay(profile)}
            </div>

            ${topHTML}

            ${rarityHTML}

            <section class="vl-card__info">
              <div class="vl-card__info-content">
                ${usernameHTML}

                <div class="vl-card__name-line">
                  <h1 class="vl-card__name${nicknameSecretClass}${profile.nicknameClassName || ""}" style="${profile.nicknameStyle || ""}" data-fit-line data-fit-max="42" data-fit-min="28" data-fit-hard-min="26" data-fit-type="nickname">${profile.displayNicknameHTML}</h1>
                  ${renderEmblem(profile.emblem, badges_verified)}
                </div>

                <div class="vl-card__title${titleSecretClass}">${escapeHTML(profile.title)}</div>

                <div class="vl-card__divider"></div>

                <div class="vl-card__bottom">
                  ${starsHTML}

                  <div class="vl-card__code-slot">
                    ${renderSecurityBarcode(profile)}
                    <div class="vl-card__code">${escapeHTML(profile.profileCode)}</div>
                  </div>
                </div>
              </div>
            </section>

            <div class="vl-card__inner-circuit" aria-hidden="true"></div>
            <div class="vl-card__inner-border" aria-hidden="true"></div>
            <div class="vl-card__border" aria-hidden="true"></div>
            <div class="vl-card__edge-glow" aria-hidden="true"></div>
            <div class="vl-card__frame-sheen" aria-hidden="true"></div>
          </section>

          <div class="vl-card__outer-top-line" aria-hidden="true"></div>
          <div class="vl-card__outer-frame-lines" aria-hidden="true"></div>
          <div class="vl-card__micro-lines" aria-hidden="true"></div>

          <div class="vl-card__side-rail vl-card__side-rail--left" aria-hidden="true"></div>
          <div class="vl-card__side-rail vl-card__side-rail--right" aria-hidden="true"></div>

          <div class="vl-card__crest vl-card__crest--top" aria-hidden="true"><span></span></div>
          <div class="vl-card__crest vl-card__crest--bottom" aria-hidden="true"><span></span></div>

          <div class="vl-card__corner-crystal vl-card__corner-crystal--tl" aria-hidden="true"></div>
          <div class="vl-card__corner-crystal vl-card__corner-crystal--tr" aria-hidden="true"></div>
          <div class="vl-card__corner-crystal vl-card__corner-crystal--bl" aria-hidden="true"></div>
          <div class="vl-card__corner-crystal vl-card__corner-crystal--br" aria-hidden="true"></div>

          <div class="vl-card__gem" aria-hidden="true"></div>

          <div class="vl-card__sparkles" aria-hidden="true">
            <span style="--x: 17%; --y: 12%; --s: 5px; --t: 3.2s; --d: -.2s"></span>
            <span style="--x: 78%; --y: 10%; --s: 4px; --t: 2.8s; --d: -.9s"></span>
            <span style="--x: 90%; --y: 30%; --s: 3px; --t: 3.6s; --d: -1.4s"></span>
            <span style="--x: 7%; --y: 39%; --s: 3px; --t: 3.1s; --d: -.5s"></span>
            <span style="--x: 92%; --y: 63%; --s: 5px; --t: 3.8s; --d: -2s"></span>
            <span style="--x: 10%; --y: 78%; --s: 4px; --t: 3.3s; --d: -1.1s"></span>
            <span style="--x: 51%; --y: 2%; --s: 6px; --t: 4s; --d: -1.8s"></span>
            <span style="--x: 49%; --y: 95%; --s: 5px; --t: 3.5s; --d: -.7s"></span>
            <span style="--x: 83%; --y: 84%; --s: 3px; --t: 2.9s; --d: -1.5s"></span>
            <span style="--x: 23%; --y: 92%; --s: 3px; --t: 3.7s; --d: -2.4s"></span>
          </div>
        </article>
      `;
    }

    function getFitLimit(element) {
      const type = element.dataset.fitType || "";
      if (type !== "nickname") {
        return Math.max(0, element.clientWidth - 2);
      }

      const line = element.closest(".vl-card__name-line");
      if (!line) return Math.max(0, element.clientWidth - 2);

      let limit = line.clientWidth;
      const emblem = line.querySelector(".vl-card__emblem");
      if (emblem && getComputedStyle(emblem).display !== "none") {
        limit -= emblem.getBoundingClientRect().width + 12;
      }
      return Math.max(0, limit - 8);
    }

    function measureFitWidth(element) {
      const clone = element.cloneNode(true);
      clone.removeAttribute("id");
      clone.style.position = "absolute";
      clone.style.left = "-99999px";
      clone.style.top = "-99999px";
      clone.style.width = "max-content";
      clone.style.maxWidth = "none";
      clone.style.minWidth = "0";
      clone.style.paddingRight = "0";
      clone.style.whiteSpace = "nowrap";
      clone.style.overflow = "visible";
      clone.style.textOverflow = "clip";
      clone.style.transform = "none";
      clone.style.visibility = "hidden";
      clone.style.pointerEvents = "none";
      document.body.appendChild(clone);
      const width = clone.getBoundingClientRect().width;
      clone.remove();
      return width;
    }

    function fitNicknameText(element) {
      const max = Number(element.dataset.fitMax || 42);
      const min = Number(element.dataset.fitMin || 28);
      const hardMin = Number(element.dataset.fitHardMin || min);
      const limit = getFitLimit(element);
      if (!limit) return;

      element.style.fontSize = `${max}px`;
      element.style.letterSpacing = "";
      element.style.transform = "";
      element.style.transformOrigin = "left center";
      element.style.textOverflow = "clip";
      element.style.overflow = "visible";

      let naturalWidth = measureFitWidth(element);
      if (naturalWidth <= limit) return;

      let low = hardMin;
      let high = max;
      let best = hardMin;

      for (let i = 0; i < 12; i += 1) {
        const mid = (low + high) / 2;
        element.style.fontSize = `${mid}px`;
        naturalWidth = measureFitWidth(element);
        if (naturalWidth <= limit) {
          best = mid;
          low = mid;
        } else {
          high = mid;
        }
      }

      element.style.fontSize = `${Math.max(hardMin, Math.min(max, best)).toFixed(2)}px`;
      naturalWidth = measureFitWidth(element);

      /* Se o apelido ainda for grande demais, mantém altura legível e comprime
         horizontalmente o texto completo. Assim não aparece reticência e nomes
         curtos continuam grandes. */
      if (naturalWidth > limit) {
        const ratio = Math.max(0.62, Math.min(1, (limit - 2) / naturalWidth));
        element.style.transform = `scaleX(${ratio})`;
      }
    }

    function fitLineText(element) {
      if ((element.dataset.fitType || "") === "nickname") {
        fitNicknameText(element);
        return;
      }

      const max = Number(element.dataset.fitMax || 54);
      const min = Number(element.dataset.fitMin || 16);
      const hardMin = Number(element.dataset.fitHardMin || Math.min(min, 13));

      element.style.fontSize = `${max}px`;
      element.style.letterSpacing = "";
      element.style.transform = "";
      element.style.transformOrigin = "";
      element.style.textOverflow = "clip";

      let size = max;
      const limit = getFitLimit(element);
      if (!limit) return;

      while (element.scrollWidth > limit && size > hardMin) {
        size = Math.max(hardMin, size - 0.5);
        element.style.fontSize = `${size}px`;
      }

      if (element.scrollWidth > limit) {
        const ratio = Math.max(0.58, Math.min(1, limit / element.scrollWidth));
        element.style.transformOrigin = "left center";
        element.style.transform = `scaleX(${ratio})`;
      }
    }

    function fitAllCardTexts() {
      document.querySelectorAll("[data-fit-line]").forEach(fitLineText);
    }


  function renderPlayerCard(player, index, dataContext) {
    if (dataContext) setData(dataContext);
    const data = asObject(player);
    const id = String(data._id || data.id || data.profile_id || data.profile?.id || `ID_${Number(index || 0)}`);
    const normalized = normalizeCardProfile(id, data, Number(index || 0) + 1);
    const cardHTML = createProfileCard(normalized);
    if (!cardHTML) return "";
    return `<div class="vl-card-slot" data-vl-card-slot><div class="vl-card-scale" data-vl-card-scale>${cardHTML}</div></div>`;
  }

  function hydrate(root) {
    const scope = root || document;
    requestAnimationFrame(() => {
      fitAllCardTexts();
      requestAnimationFrame(fitAllCardTexts);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fitAllCardTexts).catch(function(){});
    }

    scope.querySelectorAll(".vl-card img").forEach((img) => {
      if (img.dataset.vlCardImgBound === "true") return;
      img.dataset.vlCardImgBound = "true";
      img.addEventListener("load", fitAllCardTexts);
      img.addEventListener("error", () => {
        console.warn("[VelarionCard] Imagem não carregou:", img.src);
      });
    });
  }

  window.VelarionLumenCard = {
    setData,
    renderPlayerCard,
    normalizeCardProfile,
    createProfileCard,
    hydrate,
    fitAllCardTexts
  };
})(window, document);
