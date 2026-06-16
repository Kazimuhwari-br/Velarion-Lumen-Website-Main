/* ======================================================================
   Velarion Profile Card Bridge
   Cópia isolada do renderer oficial velarion-card.js.
   Não usa window.VelarionLumenCard para não quebrar o codex/lista.
   ====================================================================== */
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
        console.warn("[VelarionProfileCard] Imagem não carregou:", img.src);
      });
    });
  }

  window.VelarionProfileCard = {
    setData,
    renderPlayerCard,
    normalizeCardProfile,
    createProfileCard,
    hydrate,
    fitAllCardTexts
  };
})(window, document);


/* ======================================================================
   Velarion Profile Detail Renderer
   ====================================================================== */
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

  function getCountryFlagFromCode(code) {
    const clean = cleanValue(code).toUpperCase();
    if (!/^[A-Z]{2}$/.test(clean)) return "";
    return String.fromCodePoint(...clean.split("").map((char) => 127397 + char.charCodeAt(0)));
  }

  function getCountryDisplay(player) {
    const code = cleanValue(player?.country?.code || player?.profile?.country_code || player?.profile?.countryCode || "").toUpperCase();
    const name = cleanValue(player?.country?.name || player?.profile?.country || code || "-");
    const flag = getCountryFlagFromCode(code);
    if (flag && name) return `${flag}: ${name}`;
    if (flag) return flag;
    return name || "-";
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
    const renderer = window.VelarionProfileCard;
    if (renderer && typeof renderer.renderPlayerCard === "function") {
      try {
        const html = renderer.renderPlayerCard(player, 0, buildProfileCardContext(ctx));
        if (html) {
          setTimeout(function() {
            try {
              if (renderer && typeof renderer.hydrate === "function") {
                renderer.hydrate(document.querySelector(".vl-profile-card-port") || document);
              }
            } catch (e) {}
          }, 0);
          return `<div class="vl-profile-card-port" aria-label="Card visual de ${escapeHtml(displayNamePlain || "Perfil")}">${html}</div>`;
        }
      } catch (error) {
        console.warn("[VelarionProfile] Falha ao renderizar card oficial no perfil.", error);
      }
    }
    return "";
  }

  function render(player, ctx) {
    const h = makeHelpers(ctx || {});
    const color = h.normalizeHexColor(player?.theme?.card_embed?.card_color || player?.theme?.profile?.accent || "#8b6cff");
    const avatar = h.getAvatar(player) || getFallbackMedia(ctx, "avatar", DEFAULT_AVATAR);
    const displayNamePlain = h.stripMinecraftCodes(h.getDisplayName(player)) || "Jogador";
    const displayNameHtml = h.buildTitleHtml(player) || h.escapeHtml(displayNamePlain);
    const username = h.getUsername(player) || displayNamePlain;
    const cardTitle = h.getCardTitle(player);
    const clanName = h.getClanName(player) || "Sem clã";
    const country = getCountryDisplay(player);
    const level = getPlayerLevel(player);
    const tier = getTierName(player);
    const playerId = formatProfileIdDisplay(player?._id || player?.id || player?.profile_id || player?.profile?.id || "ID");
    const documentAccent = h.normalizeHexColor(player?.theme?.card_embed?.card_color || player?.theme?.card_embed?.background_color || color);
    const documentBackground = h.normalizeHexColor(player?.theme?.card_embed?.background_color || player?.theme?.card_embed?.card_color || "#73685d");
    const xp = formatCompactNumber(getPlayerXp(player), "0");
    const points = formatCompactNumber(getPlayerPoints(player), "0");
    const onlineLabel = getOnlineLabel(player);
    const onlineToken = getOnlineToken(player);
    const orderOverview = getSectionOrder(ctx, "overview", 20);
    const orderProgression = getSectionOrder(ctx, "progression", 30);
    const orderSystems = getSectionOrder(ctx, "systems", 40);
    const orderClanTitle = getSectionOrder(ctx, "clan_title", 50);
    const orderBadges = getSectionOrder(ctx, "badges", 60);
    const rarityInfoHtml = buildRarityVisualCard(player, ctx || {});
    const moderationStatusHtml = buildStatusVisualCard(player, ctx || {});

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
                <article class="vl-profile-record-main vl-profile-public-id-card" aria-label="Documento de identidade pública" style="--vp-document-accent:${h.escapeHtml(documentAccent)};--vp-document-color:${h.escapeHtml(documentBackground)};">
                  <div class="vl-profile-public-id-card__shine" aria-hidden="true"></div>
                  <div class="vl-profile-public-id-card__top">
                    <span>Documento do aventureiro</span>
                    <div class="vl-profile-public-id-card__verified-tag" aria-label="Verificação do aventureiro">
                      ${h.buildVerifiedCardBadgeHtml(player)}
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
                        <em>${h.escapeHtml(country)}</em>
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

            <section class="vl-profile-panel vl-profile-panel--systems-v2" style="order:${orderSystems}">
              <div class="vl-profile-section-head"><span>Sistemas públicos</span><i></i></div>
              <div class="vl-profile-system-grid">
                <div class="vl-profile-system-block vl-profile-system-block--rarity">
                  <small>Raridade</small>
                  ${rarityInfoHtml || `<div class="vl-profile-empty-state">Nenhuma raridade pública.</div>`}
                </div>
                <div class="vl-profile-system-block vl-profile-system-block--status">
                  <small>Status público</small>
                  ${moderationStatusHtml || `<div class="vl-profile-empty-state">Nenhum registro público.</div>`}
                </div>
              </div>
            </section>

            <section class="vl-profile-duo vl-profile-duo--records vl-profile-duo--records-single" style="order:${orderClanTitle}">
              <div class="vl-profile-panel vl-profile-panel--clan">
                <div class="vl-profile-section-head"><span>Clã</span><i></i></div>
                ${h.buildClanInfoCardHtml(player)}
              </div>
            </section>

            <section class="vl-profile-panel vl-profile-panel--badges vl-profile-panel--badges-v2" style="order:${orderBadges}">
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