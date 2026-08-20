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
    pick
  };
})(window);
