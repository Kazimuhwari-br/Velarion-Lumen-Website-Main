/* ======================================================================
   Velarion Rankings — World Championship presentation module v7
   ----------------------------------------------------------------------
   - main.js continua intacto.
   - o módulo reorganiza o HTML do ranking e controla Global / Nível / XP.
   - para Nível e XP, lê os mesmos perfis públicos usados pelo main.js e
     recalcula a classificação sem depender do ranking Global já renderizado.
   - mantém data-player-id/href para preservar a abertura de perfis.
   ====================================================================== */
(function () {
  "use strict";

  var ROOT_ID = "rankingsList";
  var READY_CLASS = "vl-rankings-world-ready";
  var PLAYER_DATA_URL = "https://kazimuhwaribedrock-default-rtdb.firebaseio.com/profilePlayers.json";
  var EXTENSIONS_DATA_URL = "https://kazimuhwaribedrock-extensions-default-rtdb.firebaseio.com/information_panel.json";
  var observer = null;
  var timer = 0;
  var busy = false;
  var activeCategory = "global";
  var rankingDataPromise = null;
  var visibleCompetitors = 10;
  var COMPETITORS_STEP = 10;
  var FALLBACK_AVATAR = "";
  var FALLBACK_BANNER = "";

  var TROPHY_CATEGORIES = {
    global: {
      label: "Global",
      heading: "Top Global",
      kicker: "WORLD CHAMPION",
      ribbon: "WORLD LEADER",
      board: "RANKING GLOBAL",
      image: "../assets/img/rankings/Trophytop1_global.png",
      alt: "Troféu Top Global #01",
      totalLabel: "Pontuação Global",
      trophySubtitle: "Melhor pontuação global",
      columnLabel: "PONTUAÇÃO"
    },
    nivel: {
      label: "Nível",
      heading: "Top Nível",
      kicker: "LEVEL CHAMPION",
      ribbon: "LEVEL LEADER",
      board: "RANKING NÍVEL",
      image: "../assets/img/rankings/Trophytop1_nivel.png",
      alt: "Troféu Top Nível #01",
      totalLabel: "Nível Máximo",
      trophySubtitle: "Maior nível da comunidade",
      columnLabel: "NÍVEL"
    },
    xp: {
      label: "XP",
      heading: "Top XP",
      kicker: "XP CHAMPION",
      ribbon: "XP LEADER",
      board: "RANKING XP",
      image: "../assets/img/rankings/Trophytop1_xp.png",
      alt: "Troféu Top XP #01",
      totalLabel: "XP Total",
      trophySubtitle: "Maior XP acumulado",
      columnLabel: "XP"
    }
  };

  function isRankingsPage() {
    var body = document.body;
    return !!body && (body.dataset.page === "rankings" || body.dataset.vlDataPage === "rankings");
  }

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cleanValue(value) {
    if (value == null || typeof value === "object") return "";
    var text = String(value).trim();
    return text === "[object Object]" ? "" : text;
  }

  function stripMinecraftCodes(value) {
    return String(value == null ? "" : value)
      .replace(/§[0-9A-FK-OR]/gi, "")
      .replace(/&[0-9A-FK-OR]/gi, "")
      .trim();
  }

  function formatNumberBR(value) {
    return (Number(value) || 0).toLocaleString("pt-BR");
  }

  function normalizeTrophyCategory(value) {
    var raw = String(value || "global").trim().toLowerCase();
    raw = raw.normalize ? raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : raw;
    if (raw === "nivel" || raw === "level") return "nivel";
    if (raw === "xp") return "xp";
    return "global";
  }

  function normalizeProfiles(data) {
    if (!data || typeof data !== "object") return [];
    var list;
    if (Array.isArray(data)) {
      list = data.filter(Boolean).map(function (item, index) {
        var safe = item && typeof item === "object" ? item : { value: item };
        return Object.assign({ _id: safe._id || safe.id || safe.key || ("ID_" + index) }, safe);
      });
    } else {
      list = Object.keys(data).map(function (key) {
        return Object.assign({ _id: key }, data[key] || {});
      });
    }
    return list.filter(function (player) {
      if (!player || typeof player !== "object") return false;
      if (player.public_profile === false || (player.profile && player.profile.public_profile === false)) return false;
      var profile = player.profile || {};
      return !!(cleanValue(profile.display_nickname) || cleanValue(profile.display_username) || cleanValue(player._id));
    });
  }

  function getProgressionNumber(player, key) {
    var value = player && player.stats && player.stats.progression ? player.stats.progression[key] : 0;
    if (Array.isArray(value)) value = value[0];
    if (typeof value === "number" && isFinite(value)) return value;
    if (typeof value === "string") {
      var parsed = Number(value.replace(/[^0-9.-]/g, ""));
      if (isFinite(parsed)) return parsed;
    }
    return 0;
  }

  function getLevel(player) {
    var raw = player && player.stats && player.stats.progression ? player.stats.progression.level : 0;
    if (Array.isArray(raw)) raw = raw[0];
    if (typeof raw === "number" && isFinite(raw)) return Math.max(0, Math.floor(raw));
    if (typeof raw === "string") {
      var match = raw.match(/-?\d+(?:\.\d+)?/);
      if (match) return Math.max(0, Math.floor(Number(match[0]) || 0));
    }
    return 0;
  }

  function getXP(player) { return Math.max(0, getProgressionNumber(player, "xp")); }
  function getXPToNext(player) { return Math.max(0, getProgressionNumber(player, "xp_to_next")); }
  function getPoints(player) { return Math.max(0, Math.round(getProgressionNumber(player, "pts"))); }

  function getXPPercent(player) {
    var xp = getXP(player);
    var next = getXPToNext(player);
    if (!next) return 0;
    return Math.max(0, Math.min(100, (xp / next) * 100));
  }

  function getDisplayName(player) {
    return stripMinecraftCodes(cleanValue(player && player.profile && player.profile.display_nickname) || cleanValue(player && player.profile && player.profile.display_username) || "Jogador");
  }

  function getUsername(player) {
    return stripMinecraftCodes(cleanValue(player && player.profile && player.profile.display_username) || getDisplayName(player) || "?");
  }

  function getTitle(player) {
    return stripMinecraftCodes(cleanValue(player && player.profile && player.profile.title) || "Perfil sincronizado");
  }

  function isOnline(player) {
    return !!(player && player.status && player.status.online === true);
  }

  function normalizeUrl(value) {
    var raw = "";
    if (typeof value === "string") raw = value.trim();
    else if (value && typeof value === "object" && !Array.isArray(value)) raw = cleanValue(value.url || value.src || value.image || value.path || "");
    if (!raw) return "";
    raw = raw.replace(/^['"]+|['"]+$/g, "").replace(/\\\//g, "/").replace(/&amp;/g, "&");
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

  function getAvatar(player) {
    return normalizeUrl(player && player.theme && player.theme.card_embed && player.theme.card_embed.avatar_bottom_image) || FALLBACK_AVATAR || "";
  }

  function getBanner(player) {
    return normalizeUrl(player && player.theme && player.theme.card_embed && player.theme.card_embed.banner_bottom_image) || FALLBACK_BANNER || "";
  }

  function getCharacter(player) { return normalizeUrl(player && player.theme && player.theme.card_embed && player.theme.card_embed.character_image); }

  function extractFallbackFromOnError(node) {
    if (!node) return "";
    var code = node.getAttribute("onerror") || "";
    var match = code.match(/\bthis\.src\s*=\s*['"]([^'"]+)['"]/i);
    if (!match || !match[1]) return "";
    return normalizeUrl(match[1]) || match[1];
  }

  function captureMainFallbacks(root) {
    if (!root) return;

    var featureBg = root.querySelector(".vl-rank-feature-bg");
    var featureAvatar = root.querySelector(".vl-rank-feature-avatar img");
    var rowAvatar = root.querySelector(".vl-rank-row .vl-rank-avatar");

    var bannerFallback = extractFallbackFromOnError(featureBg);
    var avatarFallback = extractFallbackFromOnError(featureAvatar) || extractFallbackFromOnError(rowAvatar);

    if (bannerFallback) FALLBACK_BANNER = bannerFallback;
    if (avatarFallback) FALLBACK_AVATAR = avatarFallback;
  }

  function imageErrorHandler(fallbackUrl) {
    var fallback = String(fallbackUrl || "").trim();
    if (!fallback) return "this.remove()";
    var jsSafe = fallback.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return "this.onerror=function(){this.remove()};this.src='" + jsSafe + "'";
  }

  function getAccent(player) {
    var raw = player && player.theme && player.theme.card_embed ? player.theme.card_embed.card_color : "";
    if (typeof raw === "string" && /^#[0-9a-f]{6}$/i.test(raw.trim())) return raw.trim();
    if (raw && typeof raw === "object") {
      for (var i = 1; i <= 20; i += 1) {
        var color = cleanValue(raw["cc_id" + i]);
        if (/^#[0-9a-f]{6}$/i.test(color)) return color;
      }
    }
    return "#8b6cff";
  }

  function hexToRgba(hex, alpha) {
    var value = String(hex || "").replace("#", "");
    if (value.length === 3) value = value.split("").map(function (c) { return c + c; }).join("");
    var num = parseInt(value, 16);
    if (!isFinite(num)) return "rgba(139,108,255," + alpha + ")";
    return "rgba(" + ((num >> 16) & 255) + "," + ((num >> 8) & 255) + "," + (num & 255) + "," + alpha + ")";
  }

  function cleanProfileSlug(value) {
    return String(value || "").trim().replace(/^ID[_-]?/i, "");
  }

  function getSiteBasePath() {
    var path = window.location.pathname || "/";
    var pagesIndex = path.lastIndexOf("/pages/");
    if (pagesIndex >= 0) return path.slice(0, pagesIndex + 1);
    var usersIndex = path.lastIndexOf("/users/");
    if (usersIndex >= 0) return path.slice(0, usersIndex + 1);
    return path.replace(/[^/]*$/, "");
  }

  function makeProfileUrl(playerId) {
    var slug = encodeURIComponent(cleanProfileSlug(playerId));
    if (window.location.protocol !== "file:") return getSiteBasePath() + "users/" + slug + "/profile.html";
    return "../users/profile.html?id=" + slug;
  }

  function roleEntryId(player) {
    var raw = player && player.badges ? (player.badges.role != null ? player.badges.role : player.badges.roles) : null;
    if (Array.isArray(raw)) raw = raw[0];
    if (raw && typeof raw === "object") return cleanValue(raw.id || raw.value || raw.badge_id || raw.name || raw.label);
    return cleanValue(raw);
  }

  function getRoleLabel(player, extensions) {
    var id = roleEntryId(player);
    var source = extensions && (extensions.badges_roles || extensions.badges_role);
    var definition = id && source ? source[id] : null;
    var website = definition && definition.website && typeof definition.website === "object" ? definition.website : {};
    var fromDefinition = cleanValue((definition && (definition.label || definition.name || definition.title)) || website.label || website.name || website.title);
    var fromPlayer = cleanValue(player && player.rank && (player.rank.name || player.rank.role));
    return stripMinecraftCodes(fromDefinition || fromPlayer || "Membro");
  }

  function collectVerifiedId(raw, output) {
    if (raw === true || raw === 1 || raw === "true" || raw === "1") { output.push("verified_id_default"); return; }
    if (typeof raw === "string" || typeof raw === "number") { var v = cleanValue(raw); if (v) output.push(v); return; }
    if (Array.isArray(raw)) { raw.forEach(function (item) { collectVerifiedId(item, output); }); return; }
    if (raw && typeof raw === "object") collectVerifiedId(raw.id || raw.emblem || raw.value || raw.verified_id || raw.badge_id, output);
  }

  function buildVerifiedEmblem(player, extensions) {
    var ids = [];
    collectVerifiedId(player && player.profile && player.profile.emblem, ids);
    collectVerifiedId(player && player.profile && player.profile.verified, ids);
    collectVerifiedId(player && player.badges && player.badges.verified, ids);
    collectVerifiedId(player && player.badges && player.badges.verified_id, ids);
    collectVerifiedId(player && player.verified, ids);
    var id = ids.filter(Boolean)[0];
    if (!id || !extensions || !extensions.badges_verified) return "";
    var def = extensions.badges_verified[id];
    if (!def) return "";
    var website = def.website && typeof def.website === "object" ? def.website : {};
    var icon = normalizeUrl(website.icon || def.icon || website.emblem || def.emblem);
    if (!icon) return "";
    var label = cleanValue(def.label || website.label) || "Verificado";
    var glow = cleanValue(website.glow || def.glow || website.color || def.color) || "#ffffff";
    return '<span class="verified-emblem" title="' + escapeHtml(label) + '" aria-label="' + escapeHtml(label) + '" style="--verified-glow:' + escapeHtml(glow) + ';"><img src="' + escapeHtml(icon) + '" alt="' + escapeHtml(label) + '" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" draggable="false" onerror="this.closest(\'.verified-emblem\')?.remove()"></span>';
  }

  function renderCharacterMedia(source, displayName) {
    var media = String(source || "").trim();
    if (!media) return "";
    if (/^data:video\/webm(?:;|,)/i.test(media) || /\.webm(?:$|[?#])/i.test(media)) {
      return '<video class="vl-rank-feature-character vl-rank-feature-character--webm" data-media-type="video" src="' + escapeHtml(media) + '" autoplay loop muted playsinline preload="auto" aria-hidden="true" tabindex="-1" referrerpolicy="no-referrer" onerror="this.remove()"></video>';
    }
    return '<img class="vl-rank-feature-character" data-media-type="image" src="' + escapeHtml(media) + '" alt="Character de ' + escapeHtml(displayName) + '" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.remove()">';
  }

  function comparePlayers(a, b, category) {
    if (category === "nivel") {
      return getLevel(b) - getLevel(a) || getXP(b) - getXP(a) || getPoints(b) - getPoints(a) || getDisplayName(a).localeCompare(getDisplayName(b));
    }
    if (category === "xp") {
      return getXP(b) - getXP(a) || getLevel(b) - getLevel(a) || getPoints(b) - getPoints(a) || getDisplayName(a).localeCompare(getDisplayName(b));
    }
    return getPoints(b) - getPoints(a) || getLevel(b) - getLevel(a) || getXP(b) - getXP(a) || getDisplayName(a).localeCompare(getDisplayName(b));
  }

  function getRankedPlayers(players, category) {
    return players.slice().sort(function (a, b) { return comparePlayers(a, b, category); });
  }

  function metricText(player, category) {
    if (category === "nivel") return "Lv. " + formatNumberBR(getLevel(player));
    if (category === "xp") return formatNumberBR(getXP(player)) + " XP";
    return formatNumberBR(getPoints(player)) + " pts";
  }

  function loadRankingData() {
    if (rankingDataPromise) return rankingDataPromise;
    rankingDataPromise = Promise.all([
      fetch(PLAYER_DATA_URL, { cache: "default" }).then(function (response) {
        if (!response.ok) throw new Error("Falha ao carregar perfis: " + response.status);
        return response.json();
      }),
      fetch(EXTENSIONS_DATA_URL, { cache: "default" }).then(function (response) {
        return response.ok ? response.json() : {};
      }).catch(function () { return {}; })
    ]).then(function (results) {
      return { players: normalizeProfiles(results[0]), extensions: results[1] || {} };
    }).catch(function (error) {
      rankingDataPromise = null;
      console.error("[VelarionRankings] Falha ao carregar dados para troca de categoria.", error);
      throw error;
    });
    return rankingDataPromise;
  }

  function schedule() {
    if (busy) return;
    clearTimeout(timer);
    timer = setTimeout(enhance, 36);
  }

  function enhancePanelHeader() {
    var panel = document.querySelector(".vl-rankings-page");
    if (!panel) return;
    panel.classList.add("vl-rankings-page--world");
    panel.setAttribute("data-vl-world-ranking", "true");
    var head = panel.querySelector(".vl-ranking-panel-head, .block-head");
    if (!head) return;
    head.classList.add("vl-world-panel-head");
    var copy = head.querySelector(".vl-ranking-panel-copy") || head.firstElementChild;
    if (copy) {
      copy.classList.add("vl-world-panel-copy");
      var kicker = copy.querySelector(".section-kicker");
      var title = copy.querySelector("h2");
      var description = copy.querySelector("p");
      if (kicker) kicker.textContent = "Ranking Panel";
      if (title) title.textContent = "Global Championship";
      if (description) description.textContent = "Classificação mundial oficial dos aventureiros de Velarion Lumen.";
      var oldTags = copy.querySelector(".vl-world-panel-tags");
      if (oldTags) oldTags.remove();
    }
    var summary = head.querySelector(".vl-ranking-panel-summary, .data-metric-grid");
    if (summary) summary.classList.add("vl-world-panel-summary");
  }

  function decorateFeature(feature) {
    feature.classList.add("vl-world-feature");
    if (!feature.querySelector(".vl-world-rank-ribbon")) {
      feature.insertBefore(el("div", "vl-world-rank-ribbon", '<small>WORLD LEADER</small><strong>#01</strong>'), feature.firstChild);
    }
    var name = feature.querySelector(".vl-rank-feature-name");
    if (name && !name.querySelector(".vl-world-champion-caption")) name.appendChild(el("small", "vl-world-champion-caption", "GLOBAL CHAMPION • VELARION LUMEN"));
  }

  function decorateProfile(profile) {
    profile.classList.add("vl-world-profile");
    var kicker = profile.querySelector(".vl-rank-kicker");
    if (kicker) kicker.textContent = "Perfil Destaque";
  }

  function setTrophyVisual(trophy, category, animate) {
    if (!trophy) return;
    var key = normalizeTrophyCategory(category);
    var config = TROPHY_CATEGORIES[key];
    var select = trophy.querySelector(".vl-rank-trophy-head select");
    var headText = trophy.querySelector(".vl-rank-trophy-head > span");
    var kicker = trophy.querySelector(".vl-world-trophy-kicker");
    var image = trophy.querySelector(".vl-world-trophy-image");
    trophy.dataset.vlTrophyCategory = key;
    if (headText) headText.textContent = config.heading;
    if (kicker) kicker.textContent = config.kicker;
    if (select) {
      Array.prototype.slice.call(select.options || []).forEach(function (option) {
        var optionKey = normalizeTrophyCategory(option.value || option.textContent);
        option.value = optionKey;
        option.selected = optionKey === key;
      });
      select.setAttribute("aria-label", "Categoria do ranking: " + config.label);
    }
    if (image && image.getAttribute("src") !== config.image) {
      if (animate) image.classList.add("is-switching");
      setTimeout(function () {
        image.src = config.image;
        image.alt = config.alt;
        image.dataset.trophyCategory = key;
        requestAnimationFrame(function () { requestAnimationFrame(function () { image.classList.remove("is-switching"); }); });
      }, animate ? 90 : 0);
    }
  }

  function decorateTrophy(trophy) {
    trophy.classList.add("vl-world-trophy");
    var select = trophy.querySelector(".vl-rank-trophy-head select");
    if (select) Array.prototype.slice.call(select.options || []).forEach(function (option) { option.value = normalizeTrophyCategory(option.value || option.textContent); });
    var icon = trophy.querySelector(".vl-rank-trophy-icon");
    if (icon) {
      icon.classList.remove("vl-world-trophy-orb");
      icon.classList.add("vl-world-trophy-image-wrap");
      icon.innerHTML = '<img class="vl-world-trophy-image" src="../assets/img/rankings/Trophytop1_global.png" alt="Troféu Top Global #01" loading="eager" decoding="async" data-trophy-category="global">';
    }
    if (!trophy.querySelector(".vl-world-trophy-kicker")) {
      var label = el("small", "vl-world-trophy-kicker", "WORLD CHAMPION");
      if (icon) trophy.insertBefore(label, icon); else trophy.insertBefore(label, trophy.firstChild);
    }
    setTrophyVisual(trophy, "global", false);
    var button = trophy.querySelector("button");
    if (button) { button.textContent = "Ver Ranking Completo"; button.setAttribute("data-vl-scroll-ranking", "true"); }
  }

  function buildRankingRow(player, index, category, extensions) {
    var color = getAccent(player);
    var avatar = getAvatar(player);
    var name = getDisplayName(player);
    var username = getUsername(player);
    var level = getLevel(player);
    var xp = getXP(player);
    var xpNext = getXPToNext(player);
    var progress = getXPPercent(player);
    var role = getRoleLabel(player, extensions);
    var rank = index + 1;
    var profileUrl = makeProfileUrl(player._id);
    var emblem = buildVerifiedEmblem(player, extensions);
    var xpText = xpNext > 0 ? formatNumberBR(xp) + " / " + formatNumberBR(xpNext) + " XP" : formatNumberBR(xp) + " XP";
    return '<a class="vl-rank-row' + (rank === 1 ? ' vl-world-rank-first' : rank === 2 ? ' vl-world-rank-second' : rank === 3 ? ' vl-world-rank-third' : '') + '" data-player-id="' + escapeHtml(player._id) + '" data-rank-position="' + rank + '" href="' + escapeHtml(profileUrl) + '" aria-label="Abrir perfil de ' + escapeHtml(name) + '" style="--rank-accent:' + color + ';--rank-accent-soft:' + hexToRgba(color,.18) + ';--rank-accent-line:' + hexToRgba(color,.42) + '">' +
      '<div class="vl-rank-pos">' + String(rank).padStart(2, "0") + '</div>' +
      '<div class="vl-rank-user">' + (avatar ? '<img class="vl-rank-avatar" src="' + escapeHtml(avatar) + '" alt="Avatar de ' + escapeHtml(username) + '" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="' + escapeHtml(imageErrorHandler(FALLBACK_AVATAR)) + '">' : '') + '<div class="vl-rank-namebox"><strong>' + escapeHtml(name) + emblem + '</strong><span>@' + escapeHtml(username) + '</span></div></div>' +
      '<div class="vl-rank-level"><b>' + (level || "--") + '</b><span>Lv.</span></div>' +
      '<div class="vl-rank-progress"><i><em style="width:' + progress + '%"></em></i><span>' + escapeHtml(xpText) + '</span></div>' +
      '<div class="vl-rank-role">' + escapeHtml(role) + '</div>' +
      '<div class="vl-rank-score">' + escapeHtml(metricText(player, category)) + '</div>' +
      '<div class="vl-rank-medal">✦</div>' +
    '</a>';
  }

  function renderBoardData(board, ranked, category, extensions) {
    var config = TROPHY_CATEGORIES[category];
    var visible = Math.max(1, Math.min(visibleCompetitors, ranked.length));
    var rows = ranked.slice(0, visible).map(function (player, index) { return buildRankingRow(player, index, category, extensions); }).join("");
    var remaining = Math.max(0, ranked.length - visible);
    var nextAmount = Math.min(COMPETITORS_STEP, remaining);
    var moreButton = remaining > 0
      ? '<button class="vl-rank-more" type="button" data-vl-rank-more="true" aria-controls="vlWorldRankingRows" aria-label="Exibir mais ' + nextAmount + ' competidores">Exibir mais competidores<span class="vl-rank-more-count">+' + nextAmount + '</span></button>'
      : '';

    board.classList.add("vl-world-board");
    if (!board.id) board.id = "vlWorldRankingBoard";
    board.dataset.visibleCompetitors = String(visible);
    board.dataset.totalCompetitors = String(ranked.length);
    board.innerHTML = '<div class="vl-rank-board-head vl-world-board-head"><span><small>RANKING PANEL</small><strong>' + config.board + '</strong><em>Os melhores aventureiros do Velarion Lumen</em></span><div data-vl-world-actions="true"><button class="is-active" type="button" aria-pressed="true">◎ ' + escapeHtml(config.label) + '</button><button type="button" class="vl-world-season" disabled>Temporada Atual</button></div></div>' +
      '<div class="vl-world-column-head" aria-hidden="true"><span>POS.</span><span>AVENTUREIRO</span><span>NÍVEL</span><span>XP</span><span>FUNÇÃO</span><span>' + config.columnLabel + '</span><span></span></div>' +
      '<div class="vl-rank-rows" id="vlWorldRankingRows">' + rows + '</div>' +
      moreButton;
  }

  function decorateRows(board) {
    var rowsWrap = board.querySelector(".vl-rank-rows");
    if (!rowsWrap) return;
    Array.prototype.slice.call(rowsWrap.querySelectorAll(".vl-rank-row")).forEach(function (row, index) {
      var rank = index + 1;
      row.dataset.rankPosition = String(rank);
      row.classList.toggle("vl-world-rank-first", rank === 1);
      row.classList.toggle("vl-world-rank-second", rank === 2);
      row.classList.toggle("vl-world-rank-third", rank === 3);
      var pos = row.querySelector(".vl-rank-pos");
      if (pos) pos.textContent = String(rank).padStart(2, "0");
    });
    if (!board.querySelector(".vl-world-column-head")) {
      var columns = el("div", "vl-world-column-head", "<span>POS.</span><span>AVENTUREIRO</span><span>NÍVEL</span><span>XP</span><span>FUNÇÃO</span><span>PONTUAÇÃO</span><span></span>");
      columns.setAttribute("aria-hidden", "true");
      rowsWrap.parentNode.insertBefore(columns, rowsWrap);
    }
  }

  function decorateBoard(board) {
    board.classList.add("vl-world-board");
    if (!board.id) board.id = "vlWorldRankingBoard";
    var head = board.querySelector(".vl-rank-board-head");
    if (head) {
      head.classList.add("vl-world-board-head");
      var heading = head.querySelector(":scope > span");
      if (heading) heading.innerHTML = '<small>RANKING PANEL</small><strong>RANKING GLOBAL</strong><em>Os melhores aventureiros do Velarion Lumen</em>';
      var actions = head.querySelector(":scope > div");
      if (actions && actions.dataset.vlWorldActions !== "true") {
        actions.dataset.vlWorldActions = "true";
        actions.innerHTML = '<button class="is-active" type="button" aria-pressed="true">◎ Global</button><button type="button" class="vl-world-season" disabled>Temporada Atual</button>';
      }
    }
    decorateRows(board);
    var more = board.querySelector(".vl-rank-more");
    if (more) {
      more.textContent = "Exibir mais competidores";
      more.setAttribute("data-vl-rank-more", "true");
      more.setAttribute("aria-controls", "vlWorldRankingRows");
      var initialRows = board.querySelector(".vl-rank-rows");
      if (initialRows) initialRows.id = "vlWorldRankingRows";
    }
  }

  function updateChampion(root, player, category, extensions, animate) {
    var feature = root.querySelector(".vl-world-feature");
    var profile = root.querySelector(".vl-world-profile");
    var trophy = root.querySelector(".vl-world-trophy");
    if (!feature || !profile || !trophy || !player) return;

    var config = TROPHY_CATEGORIES[category];
    var name = getDisplayName(player);
    var username = getUsername(player);
    var title = getTitle(player);
    var avatar = getAvatar(player);
    var banner = getBanner(player);
    var character = getCharacter(player);
    var role = getRoleLabel(player, extensions);
    var level = getLevel(player);
    var xp = getXP(player);
    var xpNext = getXPToNext(player);
    var xpText = xpNext > 0 ? formatNumberBR(xp) + " / " + formatNumberBR(xpNext) + " XP" : formatNumberBR(xp) + " XP";
    var profileUrl = makeProfileUrl(player._id);
    var emblem = buildVerifiedEmblem(player, extensions);
    var color = getAccent(player);
    var online = isOnline(player);

    root.classList.add("is-category-switching");
    feature.dataset.playerId = player._id;
    feature.href = profileUrl;
    feature.setAttribute("aria-label", "Abrir perfil de " + name);
    feature.style.setProperty("--rank-accent", color);
    feature.style.setProperty("--rank-accent-soft", hexToRgba(color, .18));
    feature.style.setProperty("--rank-accent-line", hexToRgba(color, .42));
    feature.innerHTML = '<div class="vl-world-rank-ribbon"><small>' + config.ribbon + '</small><strong>#01</strong></div>' +
      (banner ? '<img class="vl-rank-feature-bg" src="' + escapeHtml(banner) + '" alt="Banner de ' + escapeHtml(name) + '" loading="eager" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="' + escapeHtml(imageErrorHandler(FALLBACK_BANNER)) + '">' : '') +
      renderCharacterMedia(character, name) +
      (avatar ? '<div class="vl-rank-feature-avatar"><img src="' + escapeHtml(avatar) + '" alt="Avatar de ' + escapeHtml(username) + '" loading="lazy" onerror="' + escapeHtml(imageErrorHandler(FALLBACK_AVATAR)) + '"></div>' : '') +
      '<div class="vl-rank-feature-name"><span>#01</span><strong>' + escapeHtml(name) + emblem + '</strong><small class="vl-world-champion-caption">' + config.kicker + ' • VELARION LUMEN</small></div>';

    profile.dataset.playerId = player._id;
    profile.href = profileUrl;
    profile.setAttribute("aria-label", "Abrir perfil de " + name);
    profile.innerHTML = '<span class="vl-rank-kicker">Perfil Destaque</span>' +
      '<div class="vl-rank-profile-title"><h3>' + escapeHtml(name) + '</h3><span>@' + escapeHtml(username) + '</span><b class="' + (online ? 'is-online' : 'is-offline') + '">' + (online ? 'Online' : 'Offline') + '</b></div>' +
      '<p>' + escapeHtml(title) + '</p>' +
      '<div class="vl-rank-tags"><span>' + escapeHtml(role) + '</span><span>' + escapeHtml(config.label) + '</span><span>VLS</span></div>' +
      '<div class="vl-rank-mini-stats"><div><small>Nível</small><strong>' + (level || "--") + '</strong></div><div><small>XP</small><strong>' + escapeHtml(xpText) + '</strong></div><div><small>Rank</small><strong>#01</strong></div></div>' +
      '<div class="vl-rank-total"><small>' + config.totalLabel + '</small><strong>' + escapeHtml(metricText(player, category)) + '</strong></div>';

    var trophyScore = trophy.querySelector(":scope > strong");
    var trophySubtitle = trophy.querySelector(":scope > span:not(.vl-world-trophy-kicker)");
    if (trophyScore) trophyScore.textContent = metricText(player, category);
    if (trophySubtitle) trophySubtitle.textContent = config.trophySubtitle;
    setTrophyVisual(trophy, category, animate);

    setTimeout(function () { root.classList.remove("is-category-switching"); }, animate ? 240 : 0);
  }

  function applyCategory(root, category, animate) {
    var key = normalizeTrophyCategory(category);
    var trophy = root.querySelector(".vl-world-trophy");
    activeCategory = key;
    root.dataset.vlRankingCategory = key;
    if (trophy) setTrophyVisual(trophy, key, animate);
    root.classList.add("is-ranking-loading");

    return loadRankingData().then(function (data) {
      if (activeCategory !== key) return;
      var ranked = getRankedPlayers(data.players, key);
      if (!ranked.length) return;
      updateChampion(root, ranked[0], key, data.extensions, animate);
      var board = root.querySelector(".vl-world-board");
      if (board) renderBoardData(board, ranked, key, data.extensions);
    }).catch(function () {
      /* Mantém o ranking já visível se a leitura externa falhar. */
    }).finally(function () {
      if (activeCategory === key) root.classList.remove("is-ranking-loading");
    });
  }

  function buildShell(root, hero, board) {
    captureMainFallbacks(root);
    var feature = hero.querySelector(".vl-rank-feature");
    var profile = hero.querySelector(".vl-rank-profile");
    var trophy = hero.querySelector(".vl-rank-trophy");
    if (!feature || !profile || !trophy) return false;
    decorateFeature(feature);
    decorateProfile(profile);
    decorateTrophy(trophy);
    decorateBoard(board);

    var shell = el("div", "vl-world-ranking-shell");
    shell.setAttribute("data-vl-world-shell", "true");
    shell.dataset.vlRankingCategory = "global";
    shell.dataset.vlFallbackMedia = (FALLBACK_BANNER || FALLBACK_AVATAR) ? "captured" : "none";
    var eventBar = el("div", "vl-world-event-bar", '<div class="vl-world-event-brand"><span>RANKING PANEL</span><strong>WORLD RANKING</strong></div><div class="vl-world-event-meta"><span>VELARION LUMEN GLOBAL STAGE</span><b><i></i> LIVE RANKING</b></div>');
    var stage = el("div", "vl-world-champion-stage");
    var visual = el("div", "vl-world-champion-visual");
    var championCard = el("div", "vl-world-champion-card");
    visual.appendChild(feature);
    championCard.appendChild(profile);
    championCard.appendChild(trophy);
    stage.appendChild(visual);
    stage.appendChild(championCard);
    shell.appendChild(eventBar);
    shell.appendChild(stage);
    shell.appendChild(board);
    hero.remove();
    root.innerHTML = "";
    root.appendChild(shell);
    return true;
  }

  function wireControls(root) {
    if (root.dataset.vlWorldControls === "true") return;
    root.dataset.vlWorldControls = "true";
    root.addEventListener("click", function (event) {
      var moreButton = event.target.closest("[data-vl-rank-more], .vl-rank-more");
      if (moreButton) {
        event.preventDefault();
        event.stopPropagation();
        if (moreButton.disabled) return;

        moreButton.disabled = true;
        moreButton.classList.add("is-loading");
        moreButton.setAttribute("aria-busy", "true");

        loadRankingData().then(function (data) {
          var ranked = getRankedPlayers(data.players, activeCategory);
          visibleCompetitors = Math.min(ranked.length, visibleCompetitors + COMPETITORS_STEP);
          var board = root.querySelector(".vl-world-board");
          if (board) renderBoardData(board, ranked, activeCategory, data.extensions);
        }).catch(function () {
          moreButton.disabled = false;
          moreButton.classList.remove("is-loading");
          moreButton.removeAttribute("aria-busy");
        });
        return;
      }

      var scrollButton = event.target.closest("[data-vl-scroll-ranking]");
      if (!scrollButton) return;
      event.preventDefault();
      event.stopPropagation();
      var board = root.querySelector(".vl-world-board");
      if (board) board.scrollIntoView({ behavior: "smooth", block: "start" });
    }, true);
    root.addEventListener("change", function (event) {
      var select = event.target.closest(".vl-world-trophy .vl-rank-trophy-head select");
      if (!select) return;
      event.preventDefault();
      event.stopPropagation();
      applyCategory(root, select.value, true);
    });
  }

  function enhance() {
    if (!isRankingsPage() || busy) return;
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    enhancePanelHeader();
    wireControls(root);
    if (root.querySelector(":scope > .vl-world-ranking-shell")) {
      document.documentElement.classList.add(READY_CLASS);
      document.body.classList.add(READY_CLASS);
      return;
    }
    var hero = root.querySelector(".vl-rank-hero");
    var board = root.querySelector(".vl-rank-board");
    if (!hero || !board) return;
    busy = true;
    try {
      if (observer) observer.disconnect();
      if (buildShell(root, hero, board)) {
        document.documentElement.classList.add(READY_CLASS);
        document.body.classList.add(READY_CLASS);
      }
    } finally {
      busy = false;
      if (observer) observer.observe(root, { childList: true, subtree: true });
    }
  }

  function init() {
    if (!isRankingsPage()) return;
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    enhance();
    /* Pré-carrega em segundo plano para a primeira troca ser imediata. */
    setTimeout(function () { loadRankingData().catch(function () {}); }, 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
