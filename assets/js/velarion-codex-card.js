/* ======================================================================
   Velarion Lumen - Codex Roster Renderer
   Nome do arquivo: velarion-codex-card.js
   Uso: aventureiros.html e habitantes.html

   Ideia desta versão:
   - Não renderiza carta vertical.
   - Renderiza uma lista premium de jogadores em formato "registro / dossier".
   - Mantém compatibilidade com o main.js existente usando .vl-card[data-player-id].
   - Não depende do velarion-card.js antigo e não altera arquivos antigos.
   ====================================================================== */
(function(window, document) {
  "use strict";

  const DEFAULT_ACCENT = "#67d7ff";
  const DEFAULT_ACCENT_2 = "#b58cff";
  const DEFAULT_BG = "linear-gradient(135deg, rgba(18,26,48,.92), rgba(7,10,22,.98))";

  const mcColors = {
    "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA",
    "4": "#AA0000", "5": "#AA00AA", "6": "#FFAA00", "7": "#AAAAAA",
    "8": "#555555", "9": "#5555FF", "a": "#55FF55", "b": "#55FFFF",
    "c": "#FF5555", "d": "#FF55FF", "e": "#FFFF55", "f": "#FFFFFF",
    "g": "#DDD605", "h": "#E3E3E3", "i": "#CECACA", "j": "#443A3B",
    "m": "#971607", "n": "#B4684D", "p": "#DEB12D", "q": "#47A036",
    "s": "#2CBAA8", "t": "#21497B", "u": "#9A5CC6", "v": "#EB7114"
  };

  const mcGradients = {
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

  let badgesVerified = {};
  let badgesLevelRanks = {};
  let badgesAvatarLocks = {};
  let badgesRaritys = {};
  let badgesFallbacks = {};
  let serverPanel = {};
  let nicknameColors = {};
  let clanPlayers = {};
  let profilePlayers = {};

  function getCurrentScriptUrl() {
    const script = document.currentScript || document.querySelector('script[src*="velarion-codex-card.js"]');
    return script && script.src ? script.src : window.location.href;
  }

  function resolveAsset(path) {
    try { return new URL(path, getCurrentScriptUrl()).href; }
    catch (error) { return path; }
  }

  function asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function cleanText(value) {
    if (value == null) return "";
    if (typeof value === "object") return "";
    return String(value).trim();
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function stripMinecraftCodes(value) {
    return String(value ?? "").replace(/§[0-9a-fk-orv]/gi, "").trim();
  }

  function minecraftToHtml(value) {
    const input = String(value ?? "");
    let result = "";
    let currentColor = "";
    let bold = false;
    let italic = false;
    let underline = false;
    let strike = false;

    function className() {
      const classes = ["vlc-mc"];
      if (bold) classes.push("vlc-mc--bold");
      if (italic) classes.push("vlc-mc--italic");
      if (underline) classes.push("vlc-mc--underline");
      if (strike) classes.push("vlc-mc--strike");
      return classes.join(" ");
    }

    function openSpan() {
      const style = currentColor ? ` style="color:${escapeHTML(currentColor)}"` : "";
      return `<span class="${className()}"${style}>`;
    }

    let spanOpen = false;
    for (let index = 0; index < input.length; index += 1) {
      const char = input[index];
      const next = input[index + 1];
      if (char === "§" && next) {
        const code = next.toLowerCase();
        if (spanOpen) { result += "</span>"; spanOpen = false; }

        if (mcColors[code]) {
          currentColor = mcColors[code];
          bold = false;
          italic = false;
          underline = false;
          strike = false;
          spanOpen = true;
          result += openSpan();
        } else if (code === "l") {
          bold = true; spanOpen = true; result += openSpan();
        } else if (code === "o") {
          italic = true; spanOpen = true; result += openSpan();
        } else if (code === "n") {
          underline = true; spanOpen = true; result += openSpan();
        } else if (code === "m") {
          strike = true; spanOpen = true; result += openSpan();
        } else if (code === "r") {
          currentColor = ""; bold = false; italic = false; underline = false; strike = false;
        }

        index += 1;
        continue;
      }

      if (!spanOpen && (currentColor || bold || italic || underline || strike)) {
        spanOpen = true;
        result += openSpan();
      }
      result += escapeHTML(char);
    }

    if (spanOpen) result += "</span>";
    return result || escapeHTML(stripMinecraftCodes(input));
  }

  function toNumber(value, fallback = 0) {
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

  function compactNumber(value) {
    const number = Math.max(0, Math.floor(toNumber(value, 0)));
    if (number >= 1000000000) return (number / 1000000000).toFixed(number >= 10000000000 ? 0 : 1).replace(".", ",") + "B";
    if (number >= 1000000) return (number / 1000000).toFixed(number >= 10000000 ? 0 : 1).replace(".", ",") + "M";
    if (number >= 1000) return (number / 1000).toFixed(number >= 10000 ? 0 : 1).replace(".", ",") + "K";
    return String(number);
  }

  function formatNumberBR(value) {
    const number = Math.max(0, Math.floor(toNumber(value, 0)));
    try { return number.toLocaleString("pt-BR"); }
    catch (error) { return String(number); }
  }

  function normalizeHexColor(value, fallback = DEFAULT_ACCENT) {
    let raw = cleanText(value);
    if (!raw) return fallback;
    if (!raw.startsWith("#")) raw = "#" + raw;
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
    if (/^#[0-9a-f]{3}$/i.test(raw)) return "#" + raw.slice(1).split("").map((char) => char + char).join("");
    return fallback;
  }

  function hexToRgb(hex) {
    const color = normalizeHexColor(hex, DEFAULT_ACCENT).replace("#", "");
    return {
      r: parseInt(color.slice(0, 2), 16),
      g: parseInt(color.slice(2, 4), 16),
      b: parseInt(color.slice(4, 6), 16)
    };
  }

  function hexToRgba(hex, alpha) {
    const rgb = hexToRgb(hex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  function cssRgbTriplet(hex) {
    const rgb = hexToRgb(hex);
    return `${rgb.r} ${rgb.g} ${rgb.b}`;
  }

  function toToken(value, fallback = "none") {
    const token = cleanText(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return token || fallback;
  }

  function getNested(source, paths, fallback = "") {
    const list = Array.isArray(paths) ? paths : [paths];
    for (const path of list) {
      if (!path) continue;
      const parts = Array.isArray(path) ? path : String(path).split(".");
      let value = source;
      let ok = true;
      for (const key of parts) {
        if (value == null || typeof value !== "object" || !(key in value)) {
          ok = false;
          break;
        }
        value = value[key];
      }
      if (ok && value !== undefined && value !== null) {
        if (typeof value === "object") return value;
        if (cleanText(value) !== "") return value;
      }
    }
    return fallback;
  }

  function normalizePossibleUrl(value) {
    let raw = cleanText(value)
      .replace(/^['"]+|['"]+$/g, "")
      .replace(/\\\//g, "/")
      .replace(/&amp;/g, "&");

    if (!raw) return "";

    if (/^https?:\/\/(?:www\.)?github\.com\/.+\/blob\/.+$/i.test(raw)) {
      raw = raw
        .replace(/^https?:\/\/(?:www\.)?github\.com\//i, "https://raw.githubusercontent.com/")
        .replace("/blob/", "/");
    }

    return raw;
  }

  function getMediaUrl(value) {
    const raw = normalizePossibleUrl(value);
    if (!raw) return "";
    if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
    if (/^(\.\/|\.\.\/|\/|assets\/|img\/|images\/)/i.test(raw)) {
      try { return new URL(raw, getCurrentScriptUrl()).href; }
      catch (error) { return raw; }
    }
    return "";
  }

  function safeCssUrl(value) {
    const url = getMediaUrl(value);
    if (!url) return "none";
    return `url("${String(url).replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/[\n\r]/g, "")}")`;
  }

  function makeSvgDataUri(label, bg1, bg2) {
    const safeLabel = escapeHTML(String(label || "VL").slice(0, 3));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient><radialGradient id="r" cx="34%" cy="22%" r="80%"><stop stop-color="rgba(255,255,255,.35)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><rect width="512" height="512" rx="128" fill="url(#g)"/><rect width="512" height="512" rx="128" fill="url(#r)"/><circle cx="256" cy="220" r="98" fill="rgba(255,255,255,.16)"/><path d="M96 430c34-86 104-132 160-132s126 46 160 132" fill="rgba(255,255,255,.15)"/><text x="256" y="288" text-anchor="middle" font-size="112" font-family="Arial, sans-serif" fill="white" font-weight="900">${safeLabel}</text></svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  const FALLBACK_AVATAR = makeSvgDataUri("龍", "#17234c", "#136f8f");
  const FALLBACK_BANNER = makeSvgDataUri("", "#10162e", "#143c55");
  const LOCKED_AVATAR_PLACEHOLDER_IMAGE = resolveAsset("../img/card/avatar_locked.png");

  function countryCodeToFlag(code) {
    const clean = cleanText(code).toUpperCase();
    if (!/^[A-Z]{2}$/.test(clean)) return "";
    const base = 0x1F1E6;
    return String.fromCodePoint(base + clean.charCodeAt(0) - 65, base + clean.charCodeAt(1) - 65);
  }

  function readVisibility(source, keys, fallback = true) {
    const object = asObject(source);
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        const value = object[key];
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return value !== 0;
        const raw = cleanText(value).toLowerCase();
        if (["true", "1", "yes", "sim", "on"].includes(raw)) return true;
        if (["false", "0", "no", "nao", "não", "off"].includes(raw)) return false;
      }
    }
    return fallback;
  }

  function setData(data) {
    const source = asObject(data);
    const extensions = asObject(source.extensionsData || source.extensions || source.information_panel);
    const panel = asObject(source.server_panel || extensions.server_panel || serverPanel);

    badgesVerified = asObject(source.badges_verified || extensions.badges_verified || badgesVerified);
    badgesLevelRanks = asObject(source.badges_levelranks || extensions.badges_levelranks || badgesLevelRanks);
    badgesAvatarLocks = asObject(source.badges_avatarlocks || extensions.badges_avatarlocks || badgesAvatarLocks);
    badgesRaritys = asObject(
      source.badges_raritys ||
      source.badges_rarities ||
      extensions.badges_raritys ||
      extensions.badges_rarities ||
      badgesRaritys
    );
    badgesFallbacks = asObject(source.badges_fallbacks || extensions.badges_fallbacks || extensions.information_panel?.badges_fallbacks || badgesFallbacks);
    serverPanel = panel;
    nicknameColors = asObject(
      source.nickname_colors ||
      source.nicknameColors ||
      panel.nickname_colors ||
      panel.nicknameColors ||
      extensions.nickname_colors ||
      extensions.nicknameColors ||
      nicknameColors
    );
    clanPlayers = asObject(source.clanPlayers || source.clansData || source.clans || clanPlayers);
    profilePlayers = asObject(source.profilePlayers || source.playersData || profilePlayers);
  }

  function getFallbackMedia(kind, key = "default") {
    const root = asObject(badgesFallbacks);
    const entry = asObject(root[kind]);
    const website = asObject(entry.website);
    const defaults = asObject(root.defaults);
    return getMediaUrl(website[key] || website.default || website.undefined || website.missing || defaults[kind] || "");
  }

  function getNicknameFallbackColor() {
    const defaults = asObject(badgesFallbacks.defaults);
    return normalizeHexColor(
      defaults.nickname_color || defaults.nicknameColor || defaults.display_name_color || defaults.name_color || "#ffffff",
      "#ffffff"
    );
  }

  function normalizeNicknameColorItems(source) {
    const object = asObject(source);
    return asObject(object.items || object);
  }

  function buildNicknameColorLookupKeys(colorName) {
    const raw = cleanText(colorName).toLowerCase();
    if (!raw) return [];

    const keys = [];
    function add(value) {
      const key = cleanText(value).toLowerCase().replace(/[\s-]+/g, "_");
      if (key && !keys.includes(key)) keys.push(key);
    }

    add(raw);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      if (/_reverse_color1$/.test(key) && !/_gradient_reverse_color1$/.test(key)) add(key.replace(/_reverse_color1$/, "_gradient_reverse_color1"));
      if (/_gradient_reverse_color1$/.test(key)) add(key.replace(/_gradient_reverse_color1$/, "_reverse_color1"));
      if (/_color1$/.test(key) && !/_gradient_color1$/.test(key) && !/_reverse_color1$/.test(key)) add(key.replace(/_color1$/, "_gradient_color1"));
      if (/_gradient_color1$/.test(key)) add(key.replace(/_gradient_color1$/, "_color1"));
      if (key === "rainbow_soft_color1") add("soft_rainbow_color1");
      if (key === "soft_rainbow_color1") add("rainbow_soft_color1");
      if (key === "ametista") add("amethyst");
      if (key === "amethyst") add("ametista");
    }

    return keys;
  }

  function colorsToGradient(colors) {
    if (!Array.isArray(colors)) return "";
    const resolved = colors.map((item) => {
      const raw = cleanText(item);
      if (!raw) return "";
      if (raw.startsWith("§")) return mcColors[raw.replace("§", "").toLowerCase()] || "";
      return raw;
    }).filter(Boolean);
    return resolved.length ? `linear-gradient(90deg, ${resolved.join(", ")})` : "";
  }

  function minecraftGradientToCss(name) {
    const key = cleanText(name).toLowerCase();
    if (!key || !mcGradients[key]) return "";
    return colorsToGradient(mcGradients[key]);
  }

  function getNicknameColorRecord(colorName) {
    const items = normalizeNicknameColorItems(nicknameColors || serverPanel.nickname_colors || serverPanel.nicknameColors || serverPanel);
    const keys = buildNicknameColorLookupKeys(colorName);
    for (const key of keys) {
      if (items[key]) return items[key];
    }
    return null;
  }

  function getNicknameRender(player, plainName) {
    const colorName = getNested(player, ["theme.color_name_id", "theme.colorNameId", "profile.color_name_id"], "");
    const record = getNicknameColorRecord(colorName);
    const safeText = stripMinecraftCodes(plainName) || "Sem nome";

    if (record && typeof record === "object") {
      const website = asObject(record.website);
      const type = cleanText(record.type || website.type).toLowerCase();
      const gradient = cleanText(record.gradient || website.gradient || record.css_gradient || website.css_gradient || record.css_value || website.css_value);
      const color = normalizeHexColor(record.color || website.color || record.color1 || website.color1 || "", "");
      const gradientFromColors = colorsToGradient(record.colors || record.gradient_colors || record.minecraft_codes || website.colors || website.minecraft_codes);

      if ((type === "gradient" || gradient || gradientFromColors) && (gradient || gradientFromColors)) {
        return {
          html: escapeHTML(safeText),
          className: " vlc-roster-name--gradient",
          style: `--vlc-name-gradient:${escapeHTML(gradient || gradientFromColors)};`
        };
      }

      if (color) {
        return {
          html: escapeHTML(safeText),
          className: "",
          style: `--vlc-name-color:${escapeHTML(color)};`
        };
      }
    }

    const localGradient = minecraftGradientToCss(colorName);
    if (localGradient) {
      return {
        html: escapeHTML(safeText),
        className: " vlc-roster-name--gradient",
        style: `--vlc-name-gradient:${escapeHTML(localGradient)};`
      };
    }

    return {
      html: minecraftToHtml(plainName || safeText),
      className: "",
      style: `--vlc-name-color:${escapeHTML(getNicknameFallbackColor())};`
    };
  }

  function getLevel(player) {
    return Math.max(0, Math.floor(toNumber(getNested(player, [
      "stats.progression.level",
      "progression.level",
      "card.level",
      "level"
    ], 0), 0)));
  }

  function getProgression(player, key, fallback = 0) {
    return toNumber(getNested(player, [
      `stats.progression.${key}`,
      `progression.${key}`,
      key
    ], fallback), fallback);
  }

  function findLevelRank(level) {
    const ranks = Object.entries(badgesLevelRanks || {})
      .map(([id, data]) => {
        const rank = asObject(data);
        const website = asObject(rank.website);
        const min = toNumber(rank.min ?? website.min ?? rank.progression?.level_min, 0);
        const rawMax = rank.max ?? website.max ?? rank.progression?.level_max;
        const max = rawMax === null || rawMax === undefined || rawMax === "" ? Infinity : toNumber(rawMax, Infinity);
        return {
          id,
          min,
          max,
          label: stripMinecraftCodes(cleanText(rank.label || website.label || website.title_text || rank.name || id.replace(/^levelranks?_id_/i, ""))) || "Rank",
          icon: getMediaUrl(website.icon || rank.icon || website.emblem || rank.emblem),
          color: normalizeHexColor(website.color || rank.color || DEFAULT_ACCENT, DEFAULT_ACCENT),
          color2: normalizeHexColor(website.color2 || rank.color2 || website.color || rank.color || DEFAULT_ACCENT_2, DEFAULT_ACCENT_2),
          glow: normalizeHexColor(website.glow || rank.glow || website.color || rank.color || DEFAULT_ACCENT, DEFAULT_ACCENT),
          enabled: rank.enabled !== false
        };
      })
      .filter((rank) => rank.enabled && level >= rank.min && level <= rank.max)
      .sort((a, b) => b.min - a.min);

    return ranks[0] || {
      id: "levelranks_id_unranked",
      min: 0,
      max: Infinity,
      label: "Novice",
      icon: "",
      color: DEFAULT_ACCENT,
      color2: DEFAULT_ACCENT_2,
      glow: DEFAULT_ACCENT
    };
  }

  function getRarity(player) {
    const raw = getNested(player, ["stats.rarity", "rarity", "badges.rarity"], "");
    const id = typeof raw === "object" ? cleanText(raw.id || raw.rarity_id || raw.value) : cleanText(raw);
    const fallbackId = cleanText(badgesFallbacks?.defaults?.rarity_id || badgesFallbacks?.defaults?.rarity || "raritys_id_n");
    const finalId = id || fallbackId;
    const record = asObject(badgesRaritys[finalId]);
    const website = asObject(record.website);
    const evolution = asObject(website.evolution || record.evolution);
    const label = stripMinecraftCodes(cleanText(website.label || record.label || website.title || record.name || finalId.replace(/^raritys?_id_/i, ""))) || "Normal";
    const color = normalizeHexColor(evolution.color || website.color || record.color || DEFAULT_ACCENT_2, DEFAULT_ACCENT_2);
    const color2 = normalizeHexColor(evolution.color2 || website.color2 || record.color2 || color, color);
    const glow = normalizeHexColor(evolution.glow || website.glow || record.glow || color, color);
    return {
      id: finalId || "none",
      label,
      color,
      color2,
      glow,
      token: toToken(evolution.type || evolution.name || label || finalId, "normal"),
      enabled: Boolean(finalId && record.enabled !== false)
    };
  }

  function getAvatarLock(player) {
    const overlay = asObject(getNested(player, ["theme.card_embed.security_overlay", "security_overlay"], {}));
    const raw = overlay.avatar_lock || overlay.avatar_lock_id || overlay.locked_avatar_id || overlay.warn_id || overlay.warns_id || "warns_id_paid";
    const id = typeof raw === "object" ? cleanText(raw.id || raw.value) : cleanText(raw);
    const record = asObject(badgesAvatarLocks[id]);
    const website = asObject(record.website);
    return {
      id,
      label: stripMinecraftCodes(cleanText(website.label || record.label || "Avatar privado")),
      icon: getMediaUrl(website.icon || record.icon),
      color: normalizeHexColor(website.color || record.color || DEFAULT_ACCENT_2, DEFAULT_ACCENT_2)
    };
  }

  function getClanRaw(player) {
    return player.clan ?? player.profile?.clan ?? player.profile?.clan_name ?? player.profile?.clanName ?? player.clan_id ?? player.profile?.clan_id ?? "";
  }

  function pickClanText(input) {
    if (input == null) return "";
    if (typeof input === "string" || typeof input === "number") return cleanText(input);
    if (Array.isArray(input)) {
      for (const item of input) {
        const found = pickClanText(item);
        if (found) return found;
      }
      return "";
    }
    if (typeof input === "object") {
      for (const key of ["id", "name", "sub", "clanName", "clan_name", "title", "label", "tag"]) {
        const found = pickClanText(input[key]);
        if (found) return found;
      }
    }
    return "";
  }

  function getClanDefinition(idOrName) {
    const wanted = stripMinecraftCodes(cleanText(idOrName));
    if (!wanted || wanted === "-") return null;
    if (clanPlayers[wanted]) return { key: wanted, data: clanPlayers[wanted] };
    const lower = wanted.toLowerCase();
    const key = Object.keys(clanPlayers || {}).find((item) => {
      const clan = asObject(clanPlayers[item]);
      const names = [item, clan.name, clan.title, clan.label, clan.id, clan.tag].map((value) => stripMinecraftCodes(cleanText(value)).toLowerCase());
      return names.includes(lower);
    });
    return key ? { key, data: clanPlayers[key] } : null;
  }

  function getClan(player, accent) {
    const picked = pickClanText(getClanRaw(player));
    const definition = getClanDefinition(picked);
    const data = asObject(definition?.data);
    const theme = asObject(data.theme);
    const embed = asObject(theme.card_embed || data.card_embed || data.website);
    const displayName = stripMinecraftCodes(cleanText(data.name || data.title || data.label || picked)) || "Sem clã";
    return {
      id: definition?.key || picked || "none",
      label: displayName,
      short: stripMinecraftCodes(cleanText(data.short || data.tag || displayName)).slice(0, 4).toUpperCase() || "—",
      icon: getMediaUrl(embed.icon || theme.icon || data.icon || data.emblem),
      color: normalizeHexColor(embed.card_color || embed.color || theme.color || accent, accent),
      color2: normalizeHexColor(embed.card_color2 || embed.color2 || theme.color2 || accent, accent)
    };
  }

  function getVerified(player) {
    const id = cleanText(player.emblem || player.verified_id || player.badges?.verified || player.badges?.emblem || player.profile?.verified_id);
    if (!id) return null;
    const record = asObject(badgesVerified[id]);
    const website = asObject(record.website);
    const icon = getMediaUrl(website.icon || record.icon || website.emblem || record.emblem);
    if (!icon) return null;
    return {
      id,
      label: stripMinecraftCodes(cleanText(website.label || record.label || "Verificado")),
      icon,
      color: normalizeHexColor(website.color || record.color || "#54dcff", "#54dcff")
    };
  }

  function getDisplayName(player) {
    return cleanText(
      player.profile?.display_nickname ||
      player.profile?.display_name ||
      player.profile?.nickname ||
      player.display_nickname ||
      player.displayName ||
      player.name ||
      player.profile?.display_username ||
      player.profile?.username ||
      player.username ||
      "Sem nome"
    );
  }

  function getUsername(player) {
    return stripMinecraftCodes(cleanText(
      player.profile?.display_username ||
      player.profile?.username ||
      player.username ||
      player.gamertag ||
      player.name ||
      getDisplayName(player) ||
      "unknown"
    ));
  }

  function getTitle(player) {
    return stripMinecraftCodes(cleanText(
      player.profile?.title ||
      player.title ||
      player.card?.title ||
      player.profile?.subtitle ||
      "Sem título"
    ));
  }

  function getBio(player) {
    return stripMinecraftCodes(cleanText(
      player.profile?.bio ||
      player.profile?.description ||
      player.description ||
      player.lore ||
      "Registro do Codex sem descrição pública."
    ));
  }

  function getOnline(player) {
    return player.status?.online === true || player.status?.presence?.enabled === true || player.online === true;
  }

  function getCountry(player) {
    const code = stripMinecraftCodes(cleanText(player.country?.code || player.country || player.profile?.country || ""));
    const name = stripMinecraftCodes(cleanText(player.country?.name || player.country_name || ""));
    return {
      code: code ? code.toUpperCase() : "--",
      label: name || (code ? code.toUpperCase() : "Sem país"),
      flag: countryCodeToFlag(code)
    };
  }

  function getMedia(player) {
    const cardEmbed = asObject(getNested(player, ["theme.card_embed", "card_embed"], {}));
    const profile = asObject(player.profile);
    const avatar = getMediaUrl(
      cardEmbed.avatar_bottom_image ||
      cardEmbed.avatar ||
      profile.avatar ||
      profile.avatar_url ||
      player.avatar ||
      player.avatar_url ||
      getFallbackMedia("avatar") ||
      FALLBACK_AVATAR
    );
    const banner = getMediaUrl(
      cardEmbed.banner_bottom_image ||
      cardEmbed.banner ||
      profile.banner ||
      player.banner ||
      getFallbackMedia("banner") ||
      FALLBACK_BANNER
    );
    return { avatar: avatar || FALLBACK_AVATAR, banner: banner || FALLBACK_BANNER };
  }

  function getSecurityVisibility(player) {
    const embed = asObject(getNested(player, ["theme.card_embed", "card_embed"], {}));
    const overlay = asObject(embed.security_overlay || player.security_overlay);
    return {
      showNickname: readVisibility(overlay, ["show_nickname"], true),
      showUsername: readVisibility(overlay, ["show_username"], true),
      showTitle: readVisibility(overlay, ["show_title"], true),
      showAvatar: readVisibility(overlay, ["show_avatar"], true),
      showBanner: readVisibility(overlay, ["show_banner"], true),
      showClan: readVisibility(overlay, ["show_clan"], true),
      showStatus: readVisibility(overlay, ["show_status"], true),
      showRarity: readVisibility(overlay, ["show_rarity"], true),
      showLevel: readVisibility(overlay, ["show_level"], true)
    };
  }

  function getProgressPercent(player) {
    const xp = getProgression(player, "xp", 0);
    const toNext = getProgression(player, "xp_to_next", 0) || getProgression(player, "next_xp", 0);
    if (!toNext || toNext <= 0) return 100;
    return Math.max(0, Math.min(100, (xp / toNext) * 100));
  }

  function normalizeProfile(player, index) {
    const data = asObject(player);
    const id = cleanText(data._id || data.id || data.profile_id || data.profile?.id || `ID_${Number(index || 0)}`);
    const position = Number(index || 0) + 1;
    const publicProfile = data.public_profile !== false && data.profile?.public_profile !== false && data.privacy?.public_profile !== false;
    const embed = asObject(getNested(data, ["theme.card_embed", "card_embed"], {}));
    const visibility = getSecurityVisibility(data);
    const media = getMedia(data);
    const level = getLevel(data);
    const rank = findLevelRank(level);
    const rarity = getRarity(data);
    const themeColor = normalizeHexColor(embed.card_color || embed.color || data.theme?.color || rank.color || DEFAULT_ACCENT, rank.color || DEFAULT_ACCENT);
    const themeColor2 = normalizeHexColor(embed.card_color2 || embed.color2 || rank.color2 || rarity.color2 || DEFAULT_ACCENT_2, rank.color2 || DEFAULT_ACCENT_2);
    const clan = getClan(data, themeColor);
    const verified = getVerified(data);
    const country = getCountry(data);
    const displayName = visibility.showNickname ? getDisplayName(data) : "Perfil oculto";
    const username = visibility.showUsername ? getUsername(data) : "privado";
    const nicknameRender = getNicknameRender(data, displayName);
    const xp = getProgression(data, "xp", 0);
    const points = getProgression(data, "pts", 0) || getProgression(data, "points", 0) || xp;
    const progress = getProgressPercent(data);
    const pageKind = document.body?.dataset?.vlDataPage === "habitants" ? "habitants" : "players";

    return {
      id,
      position,
      publicProfile,
      pageKind,
      codePrefix: pageKind === "habitants" ? "HBT" : "AVT",
      status: getOnline(data) ? "online" : "offline",
      statusText: getOnline(data) ? "ONLINE" : "OFFLINE",
      displayName: stripMinecraftCodes(displayName) || "Sem nome",
      displayNameHTML: nicknameRender.html,
      displayNameClass: nicknameRender.className,
      displayNameStyle: nicknameRender.style,
      username: stripMinecraftCodes(username) || "unknown",
      title: visibility.showTitle ? getTitle(data) : "Título privado",
      bio: getBio(data),
      level,
      xp,
      points,
      progress,
      rank,
      rarity,
      clan,
      verified,
      country,
      media,
      avatarLock: getAvatarLock(data),
      showAvatar: visibility.showAvatar,
      showBanner: visibility.showBanner,
      showClan: visibility.showClan,
      showStatus: visibility.showStatus,
      showRarity: visibility.showRarity,
      showLevel: visibility.showLevel,
      accent: themeColor,
      accent2: themeColor2,
      bg: cleanText(embed.card_background || embed.background || "") || DEFAULT_BG
    };
  }

  function renderImage(url, className, alt, fallback = FALLBACK_AVATAR) {
    const source = getMediaUrl(url) || fallback;
    const fallbackAttr = fallback ? ` data-fallback-src="${escapeHTML(fallback)}"` : "";
    return `<img class="${className}" src="${escapeHTML(source)}" alt="${escapeHTML(alt || "")}" loading="lazy" decoding="async" draggable="false" referrerpolicy="no-referrer" crossorigin="anonymous"${fallbackAttr}>`;
  }

  function renderVerified(profile) {
    if (!profile.verified) return "";
    return `
      <span class="vlc-roster-verified" title="${escapeHTML(profile.verified.label)}" aria-label="${escapeHTML(profile.verified.label)}" style="--vlc-verified:${escapeHTML(profile.verified.color)}">
        <img src="${escapeHTML(profile.verified.icon)}" alt="" loading="lazy" decoding="async">
      </span>
    `;
  }

  function renderAvatar(profile) {
    if (profile.showAvatar && profile.media.avatar) {
      return renderImage(profile.media.avatar, "vlc-roster-avatar-img", `Avatar de ${profile.displayName}`, FALLBACK_AVATAR);
    }

    const icon = profile.avatarLock.icon
      ? `<img src="${escapeHTML(profile.avatarLock.icon)}" alt="" loading="lazy" decoding="async">`
      : `<img src="${escapeHTML(LOCKED_AVATAR_PLACEHOLDER_IMAGE)}" alt="" loading="lazy" decoding="async">`;

    return `
      <div class="vlc-roster-avatar-lock" title="${escapeHTML(profile.avatarLock.label)}" style="--vlc-lock:${escapeHTML(profile.avatarLock.color)}">
        ${icon}
      </div>
    `;
  }

  function renderRankIcon(profile) {
    if (profile.rank.icon) {
      return `<img src="${escapeHTML(profile.rank.icon)}" alt="" loading="lazy" decoding="async">`;
    }
    return `<span>${escapeHTML(String(profile.rank.label || "R").slice(0, 1).toUpperCase())}</span>`;
  }

  function renderClanChip(profile) {
    if (!profile.showClan || !profile.clan || profile.clan.id === "none") {
      return `<span class="vlc-roster-chip vlc-roster-chip--muted"><i>◇</i><b>Sem clã</b></span>`;
    }
    const icon = profile.clan.icon
      ? `<img src="${escapeHTML(profile.clan.icon)}" alt="" loading="lazy" decoding="async">`
      : `<i>${escapeHTML(profile.clan.short || "CL")}</i>`;
    return `
      <span class="vlc-roster-chip vlc-roster-chip--clan" style="--vlc-clan:${escapeHTML(profile.clan.color)}" title="${escapeHTML(profile.clan.label)}">
        ${icon}<b>${escapeHTML(profile.clan.label)}</b>
      </span>
    `;
  }

  function createProfileRoster(profile) {
    if (!profile || !profile.publicProfile) return "";

    const rarityLabel = profile.showRarity && profile.rarity.enabled ? profile.rarity.label : "Normal";
    const countryText = profile.country.flag ? `${profile.country.flag} ${profile.country.code}` : profile.country.code;
    const levelText = profile.showLevel ? compactNumber(profile.level) : "--";
    const progress = Math.round(profile.progress || 0);
    const code = `${profile.codePrefix}-${String(profile.position).padStart(3, "0")}`;
    const bannerImage = profile.showBanner ? safeCssUrl(profile.media.banner) : "none";
    const statusClass = profile.status === "online" ? "is-online" : "is-offline";

    return `
      <article
        class="vl-card vlc-roster-entry ${statusClass}"
        data-player-id="${escapeHTML(profile.id)}"
        data-vlc-roster="true"
        data-rarity="${escapeHTML(profile.rarity.token)}"
        tabindex="0"
        aria-label="Abrir perfil de ${escapeHTML(profile.displayName)}"
        style="
          --vlc-accent:${escapeHTML(profile.accent)};
          --vlc-accent-rgb:${escapeHTML(cssRgbTriplet(profile.accent))};
          --vlc-accent2:${escapeHTML(profile.accent2)};
          --vlc-accent-soft:${escapeHTML(hexToRgba(profile.accent, .16))};
          --vlc-rank:${escapeHTML(profile.rank.color)};
          --vlc-rank2:${escapeHTML(profile.rank.color2)};
          --vlc-rarity:${escapeHTML(profile.rarity.color)};
          --vlc-rarity2:${escapeHTML(profile.rarity.color2)};
          --vlc-rarity-glow:${escapeHTML(profile.rarity.glow)};
          --vlc-progress:${progress}%;
          --vlc-banner-image:${escapeHTML(bannerImage)};
          --vlc-bg:${escapeHTML(profile.bg)};
          ${profile.displayNameStyle}
        "
      >
        <div class="vlc-roster-backdrop" aria-hidden="true"></div>
        <div class="vlc-roster-code" aria-hidden="true">
          <span>${escapeHTML(code)}</span>
          <b>${profile.pageKind === "habitants" ? "HABITANTE" : "AVENTUREIRO"}</b>
        </div>

        <div class="vlc-roster-avatar" aria-hidden="true">
          ${renderAvatar(profile)}
          <span class="vlc-roster-presence" title="${escapeHTML(profile.statusText)}"></span>
        </div>

        <div class="vlc-roster-core">
          <div class="vlc-roster-topline">
            <span class="vlc-roster-status ${statusClass}"><i></i>${escapeHTML(profile.statusText)}</span>
            <span class="vlc-roster-chip" title="País"><i>${escapeHTML(countryText)}</i><b>${escapeHTML(profile.country.label)}</b></span>
            ${renderClanChip(profile)}
            <span class="vlc-roster-chip vlc-roster-chip--rarity" title="Raridade"><i>◆</i><b>${escapeHTML(rarityLabel)}</b></span>
          </div>

          <div class="vlc-roster-identity">
            <h3 class="vlc-roster-name${profile.displayNameClass}">${profile.displayNameHTML}${renderVerified(profile)}</h3>
            <span class="vlc-roster-user">@${escapeHTML(profile.username)}</span>
          </div>

          <div class="vlc-roster-title" title="${escapeHTML(profile.title)}">${escapeHTML(profile.title)}</div>
          <p class="vlc-roster-bio">${escapeHTML(profile.bio)}</p>

          <div class="vlc-roster-progress" title="Progresso de XP: ${progress}%">
            <span></span>
          </div>
        </div>

        <aside class="vlc-roster-side" aria-label="Resumo do jogador">
          <div class="vlc-roster-rank" style="--vlc-rank:${escapeHTML(profile.rank.color)};--vlc-rank2:${escapeHTML(profile.rank.color2)}">
            <i>${renderRankIcon(profile)}</i>
            <div><span>Rank</span><b>${escapeHTML(profile.rank.label)}</b></div>
          </div>

          <div class="vlc-roster-metrics">
            <div><span>LV</span><b>${escapeHTML(levelText)}</b></div>
            <div><span>XP</span><b>${escapeHTML(compactNumber(profile.xp))}</b></div>
            <div><span>PTS</span><b>${escapeHTML(compactNumber(profile.points))}</b></div>
          </div>

          <div class="vlc-roster-open" aria-hidden="true"><span>Abrir</span><b>›</b></div>
        </aside>
      </article>
    `;
  }

  function renderPlayerCard(player, index, context) {
    setData(context || {});
    const profile = normalizeProfile(player, index);
    return createProfileRoster(profile);
  }

  function hydrate(root) {
    const scope = root || document;
    document.body?.classList.add("vl-codex-roster-mode", "vl-codex-card-only");
    const players = document.getElementById("players");
    if (players) {
      players.classList.remove("list-mode");
      players.classList.add("vlc-roster-list");
    }

    scope.querySelectorAll(".vlc-roster-entry:not([data-vlc-hydrated])").forEach((entry) => {
      entry.dataset.vlcHydrated = "true";

      entry.querySelectorAll("img").forEach((img) => {
        img.addEventListener("error", function() {
          const fallback = this.getAttribute("data-fallback-src") || FALLBACK_AVATAR;
          if (this.src !== fallback) this.src = fallback;
        }, { once: true });
      });

      entry.addEventListener("pointermove", function(event) {
        const rect = entry.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100;
        const y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100;
        entry.style.setProperty("--vlc-mx", x.toFixed(2) + "%");
        entry.style.setProperty("--vlc-my", y.toFixed(2) + "%");
      }, { passive: true });

      entry.addEventListener("pointerleave", function() {
        entry.style.removeProperty("--vlc-mx");
        entry.style.removeProperty("--vlc-my");
      }, { passive: true });
    });
  }

  function boot() {
    document.body?.classList.add("vl-codex-roster-mode", "vl-codex-card-only");
    const toggle = document.getElementById("toggleView");
    if (toggle) toggle.hidden = true;
    const players = document.getElementById("players");
    if (players) {
      players.classList.remove("list-mode");
      players.classList.add("vlc-roster-list");
    }
    hydrate(document);
  }

  window.VelarionLumenCard = {
    version: "codex-roster-v2",
    setData,
    renderPlayerCard,
    hydrate
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})(window, document);
