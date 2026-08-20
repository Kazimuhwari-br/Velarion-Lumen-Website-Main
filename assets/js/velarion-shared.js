/* ======================================================================
   Velarion Shared Utilities
   Módulo consolidado de funções utilitárias compartilhadas por todos os
   módulos do site. Substitui duplicações em main.js, profile-page.js,
   card.js, codex-card.js, profile-core.js e rankings.js.
   ====================================================================== */
(function(window) {
  "use strict";

  if (window.VelarionShared) return;

  // ===== String / Sanitização =====

  function cleanValue(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return "";
    const text = String(value).trim();
    return text === "[object Object]" ? "" : text;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function stripMinecraftCodes(text) {
    return String(text ?? "")
      .replace(/§[0-9a-fk-or]/gi, "")
      .replace(/&[0-9a-fk-or]/gi, "")
      .trim();
  }

  // ===== Minecraft Colors =====

  const mcColors = {
    "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA",
    "4": "#AA0000", "5": "#AA00AA", "6": "#FFAA00", "7": "#AAAAAA",
    "8": "#555555", "9": "#5555FF", "a": "#55FF55", "b": "#55FFFF",
    "c": "#FF5555", "d": "#FF55FF", "e": "#FFFF55", "f": "#FFFFFF",
    "g": "#DDD605", "h": "#E3E3E3", "i": "#CECACA", "j": "#443A3B",
    "m": "#971607", "n": "#B4684D", "p": "#DEB12D", "q": "#47A036",
    "s": "#2CBAA8", "t": "#21497B", "u": "#9A5CC6", "v": "#EB7114"
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

        if (code === "l") { bold = true; i += 1; continue; }
        if (code === "o") { italic = true; i += 1; continue; }
        if (code === "n") { underlined = true; i += 1; continue; }
        if (code === "m" && !mcColors["m"]) { strikethrough = true; i += 1; continue; }
        if (code === "k") { random = true; i += 1; continue; }

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

  // ===== Color Utilities =====

  function isValidHexColor(value) {
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value ?? "").trim());
  }

  function normalizeHexColor(hex, fallback = "#5865F2") {
    if (!hex) return fallback;
    let value = String(hex).trim();
    if (!value.startsWith("#")) value = "#" + value;
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
    if (/^#[0-9a-fA-F]{3}$/.test(value)) {
      const short = value.slice(1).split("").map(function(c) { return c + c; }).join("");
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

  function hexColorToRgb(value) {
    const raw = cleanValue(value).replace(/^#/, "");
    const hex = raw.length === 3 ? raw.split("").map(function(c) { return c + c; }).join("") : raw;
    if (!/^[0-9a-f]{6}$/i.test(hex)) return { r: 139, g: 108, b: 255 };
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }

  function rgbToHexColor(r, g, b) {
    const toHex = (channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0");
    return "#" + toHex(r) + toHex(g) + toHex(b);
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

  // ===== URL Utilities =====

  function normalizePossibleUrl(value) {
    let raw = cleanValue(value);
    if (!raw) return "";
    raw = raw
      .replace(/^['"]+|['"]+$/g, "")
      .replace(/\\\//g, "/")
      .replace(/&amp;/g, "&")
      .trim();
    if (!raw) return "";
    if (/^https?:\/\/(?:www\.)?github\.com\/.+\/blob\//i.test(raw)) {
      raw = raw.replace(/^https?:\/\/(?:www\.)?github\.com\//i, "https://raw.githubusercontent.com/").replace("/blob/", "/");
    }
    if (/^data:(?:image|video)\//i.test(raw)) return raw;
    try {
      var url = new URL(raw, window.location.href);
      return (url.protocol === "http:" || url.protocol === "https:") ? url.href : "";
    } catch (e) {
      return "";
    }
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

  // ===== Badge Utilities =====

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

  function isBadgeVisible(definition, area, fallback) {
    if (typeof area === "undefined") area = "profile";
    if (typeof fallback === "undefined") fallback = true;
    if (!definition || typeof definition !== "object") return false;
    if (!isBadgeEnabled(definition)) return false;
    const visibility = definition.visibility && typeof definition.visibility === "object" ? definition.visibility : {};
    if (visibility.public === false) return false;
    if (Object.prototype.hasOwnProperty.call(visibility, area)) return visibility[area] !== false;
    return fallback;
  }

  function getBadgeSortValue(definition, fallback) {
    if (typeof fallback === "undefined") fallback = 0;
    const priority = Number(definition?.priority ?? definition?.hierarchy?.level ?? fallback);
    return Number.isFinite(priority) ? priority : fallback;
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

  // ===== Country Flag =====

  function countryCodeToFlag(code) {
    if (!code) return "";
    const clean = String(code).trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(clean)) return "";
    const A = 0x1F1E6;
    return String.fromCodePoint(A + clean.charCodeAt(0) - 65, A + clean.charCodeAt(1) - 65);
  }

  function buildCountryFlagHtml(code) {
    if (!code) return "";
    const clean = String(code).trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(clean)) return "";
    const emoji = countryCodeToFlag(clean);
    const lower = clean.toLowerCase();
    return '<span class="country-flag" title="' + clean + '"><span class="country-flag-emoji">' + emoji + '</span><img class="country-flag-img" src="https://flagcdn.com/16x12/' + lower + '.png" alt="' + clean + '" loading="lazy" onerror="this.style.display=\'none\'" onload="const emojiEl=this.previousElementSibling;if(emojiEl) emojiEl.style.display=\'none\';"></span>';
  }

  // ===== Number / Formatting Utilities =====

  function toNumber(value, fallback) {
    if (typeof fallback === "undefined") fallback = 0;
    if (Array.isArray(value)) {
      for (const item of value) {
        const n = toNumber(item, NaN);
        if (Number.isFinite(n)) return n;
      }
      return fallback;
    }
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const match = value.replace(/,/g, ".").match(/-?\d+(?:\.\d+)?/);
      if (match) {
        const parsed = Number(match[0]);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    return fallback;
  }

  function formatCompactNumber(value, empty) {
    if (typeof empty === "undefined") empty = "0";
    if (value === null || value === undefined || value === "") return empty;
    const n = Number(value);
    if (!Number.isFinite(n)) return cleanValue(value) || empty;
    const abs = Math.abs(n);
    if (abs >= 1e9) return (n / 1e9).toFixed(abs >= 1e10 ? 0 : 1).replace(".0", "") + "B";
    if (abs >= 1e6) return (n / 1e6).toFixed(abs >= 1e7 ? 0 : 1).replace(".0", "") + "M";
    if (abs >= 1e3) return (n / 1e3).toFixed(abs >= 1e4 ? 0 : 1).replace(".0", "") + "K";
    return String(Math.floor(n));
  }

  function formatNumberBR(value) {
    return (Number(value) || 0).toLocaleString("pt-BR");
  }

  // ===== Data Access Utilities =====

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

  function firstRaw(obj, paths, fallback) {
    if (typeof fallback === "undefined") fallback = "";
    for (const path of paths || []) {
      const value = getNestedRaw(obj, path);
      if (value !== null && value !== undefined && value !== "") return value;
    }
    return fallback;
  }

  function boolLike(value, fallback) {
    if (typeof fallback === "undefined") fallback = false;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const text = cleanValue(value).toLowerCase();
    if (["true", "1", "yes", "online", "on", "sim", "s"].includes(text)) return true;
    if (["false", "0", "no", "offline", "off", "nao", "não", "n"].includes(text)) return false;
    return fallback;
  }

  // ===== Data Normalization =====

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
      return { _id: entry[0], ...entry[1] };
    });
  }

  // ===== Profile Helpers =====

  function getDisplayName(player) {
    const nickname = cleanValue(player?.profile?.display_nickname);
    const username = cleanValue(player?.profile?.display_username);
    return nickname || username || "Criando...";
  }

  function getUsername(player) {
    return cleanValue(player?.profile?.display_username) || stripMinecraftCodes(getDisplayName(player)) || "?";
  }

  function getCardTitle(player) {
    return cleanValue(player?.profile?.title) || "-";
  }

  function getLevelText(player) {
    return cleanValue(player?.stats?.progression?.level) || cleanValue(player?.card?.level) || "-";
  }

  function getPlayerLevel(player) {
    const raw = player?.stats?.progression?.level ?? player?.stats?.level ?? player?.level ?? player?.rank?.level ?? player?.profile?.level ?? 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function isPlayerOnline(player) {
    return player?.status?.online === true;
  }

  // ===== String Helpers =====

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

  function cleanProfileSlug(value) {
    return String(value || "").trim().replace(/^ID[_-]?/i, "");
  }

  function toDataToken(value, fallback) {
    if (typeof fallback === "undefined") fallback = "none";
    const token = cleanValue(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return token || fallback;
  }

  // ===== Card Color Config =====

  const CARD_COLOR_TYPES = new Set(["none", "gradient", "rotate", "pulse", "rainbow"]);

  function normalizeCardColorType(value) {
    const raw = cleanValue(value).toLowerCase();
    const aliases = { solid: "none", static: "none", grad: "gradient", cycle: "rotate", cycling: "rotate", smooth: "pulse", spectrum: "rainbow" };
    const normalized = aliases[raw] || raw || "none";
    return CARD_COLOR_TYPES.has(normalized) ? normalized : "none";
  }

  function normalizeCardColorSpeed(value, fallback) {
    if (typeof fallback === "undefined") fallback = 10;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(300, Math.max(0.25, parsed));
  }

  function normalizeCardColorConfig(value, fallbackColor) {
    if (typeof fallbackColor === "undefined") fallbackColor = "#8b6cff";
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
    const safeFallback = isValidHexColor(fallbackColor) ? cleanValue(fallbackColor) : "#8b6cff";
    if (typeof value === "string") {
      const color = isValidHexColor(value) ? cleanValue(value) : safeFallback;
      return { legacy: true, colors: [color], primary: color, type: "none", speed: 10 };
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { legacy: true, colors: [safeFallback], primary: safeFallback, type: "none", speed: 10 };
    }
    const indexedColors = Object.entries(value)
      .map(function(entry) {
        const match = /^cc_id(\d+)$/i.exec(String(entry[0]));
        if (!match || !isValidHexColor(entry[1])) return null;
        return { index: Number(match[1]), color: cleanValue(entry[1]) };
      })
      .filter(Boolean)
      .sort(function(a, b) { return a.index - b.index; });
    const colors = indexedColors.map(function(entry) { return entry.color; });
    if (!colors.length) {
      const fallbackCandidates = [value.color, value.default, value.primary, value.cc_color];
      const objectFallback = fallbackCandidates.find(isValidHexColor);
      colors.push(objectFallback ? cleanValue(objectFallback) : safeFallback);
    }
    return {
      legacy: false,
      colors: colors,
      primary: colors[0] || safeFallback,
      type: normalizeCardColorType(value.cc_type),
      speed: normalizeCardColorSpeed(value.cc_speed, 10)
    };
  }

  function buildPaletteGradient(colors, angle) {
    if (typeof angle === "undefined") angle = "135deg";
    const palette = Array.isArray(colors) && colors.length ? colors : ["#8b6cff"];
    if (palette.length === 1) return "linear-gradient(" + angle + ", " + palette[0] + ", " + palette[0] + ")";
    const maxIndex = palette.length - 1;
    const stops = palette.map(function(color, index) {
      const position = maxIndex > 0 ? (index / maxIndex) * 100 : 0;
      return color + " " + Number(position.toFixed(4)) + "%";
    });
    return "linear-gradient(" + angle + ", " + stops.join(", ") + ")";
  }

  function buildPaletteLoopGradient(colors, angle) {
    if (typeof angle === "undefined") angle = "90deg";
    const palette = Array.isArray(colors) && colors.length ? colors : ["#8b6cff"];
    const loop = palette.length > 1 ? palette.concat([palette[0]]) : [palette[0], palette[0]];
    const maxIndex = loop.length - 1;
    const stops = loop.map(function(color, index) {
      const position = maxIndex > 0 ? (index / maxIndex) * 100 : 0;
      return color + " " + Number(position.toFixed(4)) + "%";
    });
    return "linear-gradient(" + angle + ", " + stops.join(", ") + ")";
  }

  // ===== Export =====

  window.VelarionShared = {
    cleanValue,
    escapeHtml,
    stripMinecraftCodes,
    mcColors,
    GradientsColor,
    minecraftToHtml,
    gradientCodesToCss,
    colorArrayToGradient,
    isValidHexColor,
    normalizeHexColor,
    hexToRgba,
    hexColorToRgb,
    rgbToHexColor,
    interpolateHexColor,
    normalizePossibleUrl,
    isValidUrl,
    getMediaUrl,
    getMediaSource,
    isWebMMedia,
    mergeBadgeRecord,
    isBadgeEnabled,
    isBadgeVisible,
    getBadgeSortValue,
    normalizeBadgeEntries,
    countryCodeToFlag,
    buildCountryFlagHtml,
    toNumber,
    formatCompactNumber,
    formatNumberBR,
    getByPath,
    getNestedRaw,
    firstRaw,
    boolLike,
    normalize,
    getDisplayName,
    getUsername,
    getCardTitle,
    getLevelText,
    getPlayerLevel,
    isPlayerOnline,
    isProbablyPixelArt,
    getTitleSizeClass,
    cleanProfileSlug,
    toDataToken,
    normalizeCardColorType,
    normalizeCardColorSpeed,
    normalizeCardColorConfig,
    buildPaletteGradient,
    buildPaletteLoopGradient
  };
})(window);
