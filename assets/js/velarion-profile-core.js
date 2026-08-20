/* ======================================================================
   Velarion Profile Core — helpers compartilhados e independentes
   ====================================================================== */
(function(window) {
  "use strict";

  if (window.VelarionProfileCore) return;

  const CARD_COLOR_TYPES = new Set(["none", "gradient", "rotate", "pulse", "rainbow"]);

  function cleanValue(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function stripMinecraftCodes(value) {
    return cleanValue(value).replace(/§[0-9a-fk-or]/gi, "");
  }

  function minecraftToHtml(value) {
    return escapeHtml(stripMinecraftCodes(value)).replace(/\n/g, "<br>");
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

  function isValidCardHex(value) {
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(cleanValue(value));
  }

  function normalizeHexColor(value, fallback = "#8b6cff") {
    const text = cleanValue(value);
    if (/^#[0-9a-f]{6}$/i.test(text)) return text;
    if (/^[0-9a-f]{6}$/i.test(text)) return "#" + text;
    if (/^#[0-9a-f]{3}$/i.test(text)) {
      return "#" + text.slice(1).split("").map((c) => c + c).join("");
    }
    return isValidCardHex(fallback) ? cleanValue(fallback) : "#8b6cff";
  }

  function normalizeCardColorType(value) {
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
    return CARD_COLOR_TYPES.has(normalized) ? normalized : "none";
  }

  function normalizeCardColorSpeed(value, fallback = 10) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(300, Math.max(0.25, parsed));
  }

  function normalizeCardColorConfig(value, fallbackColor = "#8b6cff") {
    const officialNormalizer = window.VelarionLumenCard?.normalizeCardColorConfig;
    if (typeof officialNormalizer === "function") {
      const normalized = officialNormalizer(value, fallbackColor);
      if (normalized && Array.isArray(normalized.colors) && normalized.colors.length) {
        return {
          legacy: Boolean(normalized.legacy),
          colors: normalized.colors.slice(),
          primary: normalized.primary,
          type: normalizeCardColorType(normalized.type),
          speed: normalizeCardColorSpeed(normalized.speed, 10)
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
      type: normalizeCardColorType(value.cc_type),
      speed: normalizeCardColorSpeed(value.cc_speed, 10)
    };
  }

  function buildPaletteGradient(colors, angle = "135deg") {
    const palette = Array.isArray(colors) && colors.length ? colors : ["#8b6cff"];
    if (palette.length === 1) return `linear-gradient(${angle}, ${palette[0]}, ${palette[0]})`;
    const maxIndex = palette.length - 1;
    const stops = palette.map((color, index) => {
      const position = maxIndex > 0 ? (index / maxIndex) * 100 : 0;
      return `${color} ${Number(position.toFixed(4))}%`;
    });
    return `linear-gradient(${angle}, ${stops.join(", ")})`;
  }

  function buildPaletteLoopGradient(colors, angle = "90deg") {
    const palette = Array.isArray(colors) && colors.length ? colors : ["#8b6cff"];
    const loop = palette.length > 1 ? [...palette, palette[0]] : [palette[0], palette[0]];
    const maxIndex = loop.length - 1;
    const stops = loop.map((color, index) => {
      const position = maxIndex > 0 ? (index / maxIndex) * 100 : 0;
      return `${color} ${Number(position.toFixed(4))}%`;
    });
    return `linear-gradient(${angle}, ${stops.join(", ")})`;
  }

  function hexColorToRgb(value) {
    const raw = cleanValue(value).replace(/^#/, "");
    const hex = raw.length === 3 ? raw.split("").map((char) => char + char).join("") : raw;
    if (!/^[0-9a-f]{6}$/i.test(hex)) return { r: 139, g: 108, b: 255 };
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }

  function rgbToHexColor(r, g, b) {
    const toHex = (channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function interpolateHexColor(a, b, amount) {
    const ca = hexColorToRgb(a);
    const cb = hexColorToRgb(b);
    const t = Math.min(1, Math.max(0, Number(amount) || 0));
    return rgbToHexColor(
      ca.r + (cb.r - ca.r) * t,
      ca.g + (cb.g - ca.g) * t,
      ca.b + (cb.b - ca.b) * t
    );
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

  function getByPath(obj, paths) {
    for (const path of paths || []) {
      const parts = String(path).split(".");
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

  function getPlayerLevel(player) {
    const raw = player?.stats?.progression?.level ?? player?.stats?.level ?? player?.level ?? player?.rank?.level ?? player?.profile?.level ?? 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function getTierName(player) {
    return stripMinecraftCodes(player?.badges?.levelrank || player?.badges?.rank || player?.rank?.name || player?.rank?.title || "Novice");
  }

  function getCountryFlagFromCode(code) {
    const clean = cleanValue(code).toUpperCase();
    if (!/^[A-Z]{2}$/.test(clean)) return "";
    return String.fromCodePoint(...clean.split("").map((char) => 127397 + char.charCodeAt(0)));
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
