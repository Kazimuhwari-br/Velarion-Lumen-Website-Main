/* ======================================================================
   Velarion Profile Core — helpers compartilhados e independentes
   ====================================================================== */
(function(window) {
  "use strict";

  if (window.VelarionProfileCore) return;

  const S = window.VelarionShared || {};

  const {
    cleanValue, escapeHtml, stripMinecraftCodes, minecraftToHtml,
    getMediaSource, isWebMMedia,
    isValidHexColor, normalizeHexColor, hexColorToRgb, rgbToHexColor, interpolateHexColor,
    normalizeCardColorType, normalizeCardColorSpeed, normalizeCardColorConfig,
    buildPaletteGradient, buildPaletteLoopGradient,
    getByPath, getNestedRaw, firstRaw, boolLike,
    getPlayerLevel, formatCompactNumber,
    mergeBadgeRecord, isBadgeVisible, countryCodeToFlag
  } = S;

  const isValidCardHex = isValidHexColor;
  const mergeBadge = mergeBadgeRecord;
  const badgeVisible = isBadgeVisible;
  const getCountryFlagFromCode = countryCodeToFlag;


  // ===== Character Slots =====

  const CHARACTER_SLOT_IDS = ["id_1", "id_2", "id_3", "id_4"];

  function getCharacterSlots(player) {
    const cardEmbed = player?.theme?.card_embed;
    if (!cardEmbed || typeof cardEmbed !== "object" || Array.isArray(cardEmbed)) return {};

    const raw = cardEmbed.character_slots;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      // Compatibilidade com perfis antigos: o próprio card_embed funciona
      // como um slot virtual id_1 quando character_slots ainda não existe.
      return { id_1: cardEmbed };
    }

    const output = {};
    CHARACTER_SLOT_IDS.forEach((id) => {
      const value = raw[id];
      if (!value || value === false || typeof value !== "object" || Array.isArray(value)) return;
      output[id] = value;
    });
    return output;
  }

  function getCharacterSlotIds(player) {
    const slots = getCharacterSlots(player);
    return CHARACTER_SLOT_IDS.filter((id) => Boolean(slots[id]));
  }

  function resolveCharacterSlot(player, requestedId = "id_1") {
    const slots = getCharacterSlots(player);
    const ids = CHARACTER_SLOT_IDS.filter((id) => Boolean(slots[id]));
    if (!ids.length) return { id: "", data: null, ids: [] };

    const requested = CHARACTER_SLOT_IDS.includes(cleanValue(requestedId))
      ? cleanValue(requestedId)
      : "id_1";

    // id_1 é sempre o padrão. O primeiro slot válido só é usado como proteção
    // para dados malformados em que id_1 tenha sido removido/definido como false.
    const id = slots[requested] ? requested : (slots.id_1 ? "id_1" : ids[0]);
    return { id, data: slots[id], ids };
  }

  function getCharacterSlotValue(player, key, requestedId = "id_1", fallbackToCardEmbed = true) {
    const resolved = resolveCharacterSlot(player, requestedId);
    if (resolved.data && Object.prototype.hasOwnProperty.call(resolved.data, key)) {
      return resolved.data[key];
    }
    if (!fallbackToCardEmbed) return undefined;
    const cardEmbed = player?.theme?.card_embed;
    if (!cardEmbed || typeof cardEmbed !== "object" || Array.isArray(cardEmbed)) return undefined;
    return cardEmbed[key];
  }

  function getDisplayNameFallback(player) {
    return getByPath(player, [
      "profile.display_nickname", "profile.nickname", "account.nickname", "account.name",
      "account.login", "username", "name"
    ]) || "Jogador";
  }

  function getUsernameFallback(player) {
    return getByPath(player, ["profile.display_username", "account.login", "account.username", "username", "name"]) || getDisplayNameFallback(player);
  }

  function getCardTitleFallback(player) {
    return getByPath(player, ["profile.title", "profile.subtitle", "badges.title", "rank.title", "title"]) || "Sem título definido";
  }

  function getImageFallback(player, type) {
    const map = {
      avatar: ["theme.card_embed.avatar_bottom_image", "profile.avatar", "avatar", "theme.avatar", "images.avatar", "profile.avatar_url"],
      banner: ["theme.card_embed.banner_bottom_image", "profile.banner", "banner", "theme.banner", "images.banner", "profile.banner_url"],
      character: ["theme.card_embed.character_image", "profile.character", "character", "theme.character", "images.character", "profile.character_url"]
    };
    return getByPath(player, map[type] || []);
  }

  function getTierName(player) {
    return stripMinecraftCodes(player?.badges?.levelrank || player?.badges?.rank || player?.rank?.name || player?.rank?.title || "Novice");
  }

  function getCountryDisplay(player) {
    const code = cleanValue(player?.country?.code || player?.profile?.country_code || player?.profile?.countryCode || "").toUpperCase();
    const name = cleanValue(player?.country?.name || player?.profile?.country || code || "-");
    return {
      code,
      name: name || "-",
      flag: getCountryFlagFromCode(code),
      flagUrl: /^[A-Z]{2}$/.test(code) ? `https://flagcdn.com/w40/${code.toLowerCase()}.png` : ""
    };
  }

  function formatProfileIdDisplay(value) {
    const clean = cleanValue(value || "ID");
    const match = clean.match(/^(?:ID[_:\s-]*)?(\d+)$/i);
    if (match) return `ID: ${match[1]}`;
    if (/^\d+$/.test(clean)) return `ID: ${clean}`;
    return clean.replace(/^ID[_\s-]*/i, "ID: ");
  }

  function getPlayerXp(player) {
    return firstRaw(player, ["stats.progression.xp", "stats.progression.current_xp", "stats.xp", "progression.xp", "profile.xp", "xp"], 0);
  }

  function getPlayerPoints(player) {
    return firstRaw(player, ["stats.points", "stats.score", "profile.points", "economy.points", "points", "score"], 0);
  }

  function getFallbacks(ctx) {
    const source = ctx?.extensionsData?.badges_fallbacks || ctx?.extensionsData?.information_panel?.badges_fallbacks;
    return source && typeof source === "object" ? source : {};
  }

  function getFallbackMedia(ctx, kind, fallback, key = "default") {
    const fallbacks = getFallbacks(ctx);
    const entry = fallbacks?.[kind];
    const website = entry?.website && typeof entry.website === "object" ? entry.website : {};
    const requestedKey = cleanValue(key) || "default";
    const value = website[requestedKey] || website.default || website.undefined || website.missing || fallbacks?.defaults?.[kind];
    return cleanValue(value) || fallback;
  }

  function pick(ctx, name, fallback) {
    return ctx && typeof ctx[name] === "function" ? ctx[name] : fallback;
  }

  window.VelarionProfileCore = {
    cleanValue,
    escapeHtml,
    stripMinecraftCodes,
    minecraftToHtml,
    getMediaSource,
    isWebMMedia,
    isValidCardHex,
    normalizeHexColor,
    normalizeCardColorType,
    normalizeCardColorSpeed,
    normalizeCardColorConfig,
    buildPaletteGradient,
    buildPaletteLoopGradient,
    interpolateHexColor,
    mergeBadge,
    badgeVisible,
    getByPath,
    getNestedRaw,
    firstRaw,
    boolLike,
    getDisplayNameFallback,
    getUsernameFallback,
    getCardTitleFallback,
    getImageFallback,
    getPlayerLevel,
    getTierName,
    getCountryFlagFromCode,
    getCountryDisplay,
    formatProfileIdDisplay,
    formatCompactNumber,
    getPlayerXp,
    getPlayerPoints,
    getFallbacks,
    getFallbackMedia,
    CHARACTER_SLOT_IDS,
    getCharacterSlots,
    getCharacterSlotIds,
    resolveCharacterSlot,
    getCharacterSlotValue,
    pick
  };
})(window);
