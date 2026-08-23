/* ======================================================================
   Velarion Lumen — Standalone Profile Page
   Rota pública: /users/{ID}/profile.html
   Fallback interno para file://: /users/profile.html?id={ID}
   ====================================================================== */
(function(window, document) {
  "use strict";

  const S = window.VelarionShared || {};

  const PLAYER_DATA_URL = "https://kazimuhwaribedrock-default-rtdb.firebaseio.com/profilePlayers.json";
  const BADGES_PLAYER_DATA_URL = "https://kazimuhwaribedrock-badges-default-rtdb.firebaseio.com/badgesPlayers.json";
  const EXTENSIONS_BASE_URL = "https://kazimuhwaribedrock-extensions-default-rtdb.firebaseio.com";
  const EXTENSIONS_DATA_URL = EXTENSIONS_BASE_URL + "/information_panel.json";
  const SERVER_PANEL_DATA_URL = EXTENSIONS_BASE_URL + "/server_panel.json";
  const WEBSITE_PANEL_DATA_URL = EXTENSIONS_BASE_URL + "/website_panel.json";
  const CLANS_DATA_URL = "https://kazimuhwaribedrock-clans-default-rtdb.firebaseio.com/clanPlayers.json";

  let extensionsData = null;
  let websitePanelData = null;
  let clansData = {};
  let profilePlayersDataSource = {};
  let badgesPlayersDataSource = {};

  let DEFAULT_PLAYER_AVATAR = null;
  let DEFAULT_PLAYER_CHARACTER = null;
  let DEFAULT_PLAYER_BANNER = null;

  function cleanProfileSlug(value) {
    return String(value || "").trim().replace(/^ID[_-]?/i, "");
  }


  function applyBadgesPlayerAchievements(playersJson, badgesPlayersJson) {
    const players = playersJson && typeof playersJson === "object" ? playersJson : {};
    const badgesPlayers = badgesPlayersJson && typeof badgesPlayersJson === "object" ? badgesPlayersJson : {};

    Object.keys(players).forEach(function(playerId) {
      const player = players[playerId];
      if (!player || typeof player !== "object") return;

      const sourceRecord = badgesPlayers[playerId];
      const sourceAchievements = sourceRecord?.badges?.achievements;
      const currentBadges = player.badges && typeof player.badges === "object" ? player.badges : {};
      const nextBadges = { ...currentBadges };

      // achievements não pertence mais ao profilePlayers: remova qualquer cópia antiga.
      delete nextBadges.achievements;

      if (typeof sourceAchievements !== "undefined" && sourceAchievements !== null) {
        nextBadges.achievements = sourceAchievements;
      }

      player.badges = nextBadges;
      // Compatibilidade antiga também não deve competir com a nova fonte.
      if (Object.prototype.hasOwnProperty.call(player, "achievements")) delete player.achievements;
    });

    return players;
  }

  const escapeHtml = S.escapeHtml;
  const cleanValue = S.cleanValue;
  const normalizePossibleUrl = S.normalizePossibleUrl;
  const isValidUrl = S.isValidUrl;
  const getMediaUrl = S.getMediaUrl;
  const mergeBadgeRecord = S.mergeBadgeRecord;
  const isBadgeEnabled = S.isBadgeEnabled;
  const isBadgeVisible = S.isBadgeVisible;
  const getBadgeSortValue = S.getBadgeSortValue;
  const normalizeHexColor = S.normalizeHexColor;
  const hexToRgba = S.hexToRgba;
  const countryCodeToFlag = S.countryCodeToFlag;
  const buildCountryFlagHtml = S.buildCountryFlagHtml;
  const normalize = S.normalize;
  const mcColors = S.mcColors;
  const GradientsColor = S.GradientsColor;
  const stripMinecraftCodes = S.stripMinecraftCodes;
  const minecraftToHtml = S.minecraftToHtml;
  const gradientCodesToCss = S.gradientCodesToCss;
  const colorArrayToGradient = S.colorArrayToGradient;
  const getDisplayName = S.getDisplayName;
  const getUsername = S.getUsername;
  const getCardTitle = S.getCardTitle;
  const getLevelText = S.getLevelText;
  const normalizeBadgeEntries = S.normalizeBadgeEntries;
  const isPlayerOnline = S.isPlayerOnline;
  const isProbablyPixelArt = S.isProbablyPixelArt;



	function getBadgesFallbacks() {
		const primary = extensionsData?.badges_fallbacks;
		const nested = extensionsData?.information_panel?.badges_fallbacks;
		if (primary && typeof primary === "object") return primary;
		if (nested && typeof nested === "object") return nested;
		return {};
	}

	function getNicknameFallbackColor() {
		const fallbacks = getBadgesFallbacks();
		const defaults = fallbacks?.defaults && typeof fallbacks.defaults === "object" ? fallbacks.defaults : {};
		const candidates = [
			defaults.nickname_color,
			defaults.nicknameColor,
			defaults.display_name_color,
			defaults.displayNameColor,
			defaults.name_color,
			fallbacks.nickname_color,
			fallbacks.nicknameColor
		];

		for (const value of candidates) {
			const clean = cleanValue(value);
			if (clean) return clean;
		}

		return "#FFFFFF";
	}

	function getFallbackEntry(kind) {
		const fallbacks = getBadgesFallbacks();
		const entry = fallbacks?.[kind];
		return entry && typeof entry === "object" ? entry : {};
	}

	function getFallbackDefaultId(kind, fallback = "") {
		const fallbacks = getBadgesFallbacks();
		const defaults = fallbacks?.defaults && typeof fallbacks.defaults === "object" ? fallbacks.defaults : {};
		const legacy = fallbacks?.profile?.website && typeof fallbacks.profile.website === "object" ? fallbacks.profile.website : {};
		const entry = getFallbackEntry(kind);
		const website = entry?.website && typeof entry.website === "object" ? entry.website : {};
		const candidates = [
			defaults[`${kind}_id`],
			defaults[kind],
			legacy[`${kind}_id`],
			legacy[kind],
			entry.fallback_id,
			entry.default_id,
			entry.id,
			website.fallback_id,
			website.default_id,
			website.id,
			fallback
		];
		for (const value of candidates) {
			const clean = cleanValue(value);
			if (clean) return clean;
		}
		return "";
	}

	function getFallbackBadgeRecord(kind) {
		const entry = getFallbackEntry(kind);
		if (!entry || !Object.keys(entry).length) return null;
		return entry;
	}

	function getProfileSectionOrder(name, fallback) {
		const value = getBadgesFallbacks()?.positions?.profile?.[name];
		const number = Number(value);
		return Number.isFinite(number) ? number : fallback;
	}

	function getAvatar(player) {
		const avatar = getMediaUrl(player?.theme?.card_embed?.avatar_bottom_image);
		if (avatar) return avatar;

		return DEFAULT_PLAYER_AVATAR;
	}

	function getCharacter(player) {
		return getMediaUrl(player?.theme?.card_embed?.character_image);
	}

	function hasBanner(player) {
		return !!getMediaUrl(player?.theme?.card_embed?.banner_bottom_image);
	}

	function getBanner(player) {
		const banner = getMediaUrl(player?.theme?.card_embed?.banner_bottom_image);
		if (banner) return banner;

		return DEFAULT_PLAYER_BANNER;
	}


	// ===== JavaScript: Ranks de level via extensionsData.badges_levelranks =====
	// Sem tabela local: os tiers oficiais precisam vir do EXTENSIONS_DATA_URL.
	let CARD_LEVEL_RANKS = [];


	function readExtensionFallback(kind, fallbackValue, key = "undefined") {
		const entry = getFallbackEntry(kind);
		const website = entry?.website || {};
		const defaults = getBadgesFallbacks()?.defaults || {};
		const value = website[key] || website.default || website.fallback || website.undefined || website.missing || defaults[kind];
		const url = getMediaUrl(value);
		return url || fallbackValue;
	}

	function makeSvgDataUri(label, bg1, bg2) {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect width="512" height="512" rx="64" fill="url(#g)"/><circle cx="256" cy="220" r="94" fill="rgba(255,255,255,.18)"/><path d="M116 430c28-86 98-132 140-132s112 46 140 132" fill="rgba(255,255,255,.16)"/><text x="256" y="286" text-anchor="middle" font-size="112" font-family="Arial" fill="white" font-weight="800">${label}</text></svg>`;
		return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
	}
	function applyExtensionFallbacks() {
		DEFAULT_PLAYER_AVATAR = readExtensionFallback("avatar", makeSvgDataUri("龍", "#2a1d55", "#0a6f8f"));
		DEFAULT_PLAYER_CHARACTER = readExtensionFallback("character", makeSvgDataUri("VL", "#25113f", "#14294f"));
		DEFAULT_PLAYER_BANNER = readExtensionFallback("banner", makeSvgDataUri("", "#120a25", "#062535"));
	}

	function normalizeCardLevelRank(rank, id) {
		if (!rank || typeof rank !== "object") return null;

		const website = rank.website && typeof rank.website === "object" ? rank.website : {};
		const min = Number(rank.min ?? website.min ?? rank.progression?.level_min);
		const rawMax = rank.max ?? website.max ?? rank.progression?.level_max;
		const max = rawMax == null || rawMax === "" ? null : Number(rawMax);

		if (!Number.isFinite(min)) return null;
		if (max !== null && !Number.isFinite(max)) return null;

		const label = cleanValue(rank.label || website.label || website.title_text || rank.name) || cleanValue(id).replace(/^levelranks_id_/, "") || "Tier";
		const order = Number(rank.order ?? website.order ?? min);
		const priority = Number(rank.priority ?? website.priority ?? order);

		return {
			id,
			min,
			max,
			label,
			description: cleanValue(rank.description || website.description) || `Level rank ${label}.`,
			category: cleanValue(rank.category || website.category || rank.stage) || "levelrank",
			order: Number.isFinite(order) ? order : min,
			priority: Number.isFinite(priority) ? priority : min,
			enabled: rank.enabled !== false,
			series: cleanValue(rank.series),
			stage: cleanValue(rank.stage),
			previous: cleanValue(rank.previous || rank.progression?.previous_id),
			next: cleanValue(rank.next || rank.progression?.next_id),
			progression: rank.progression && typeof rank.progression === "object" ? rank.progression : {},
			profile: rank.profile && typeof rank.profile === "object" ? rank.profile : {},
			visibility: rank.visibility && typeof rank.visibility === "object" ? rank.visibility : {},
			color: cleanValue(website.color || rank.color) || "#5865F2",
			color2: cleanValue(website.color2 || rank.color2 || website.color || rank.color) || "#7a8cff",
			glow: cleanValue(website.glow || rank.glow || website.color || rank.color) || "#5865F2",
			gradient: cleanValue(website.gradient || rank.gradient),
			shimmer: Boolean(website.shimmer ?? rank.shimmer),
			particles: Boolean(website.particles ?? rank.particles),
			aura: Boolean(website.aura ?? rank.aura),
			intensity: Number.isFinite(Number(website.intensity ?? rank.intensity)) ? Number(website.intensity ?? rank.intensity) : 0,
			icon: cleanValue(website.icon || rank.icon),
			title: cleanValue(website.title || rank.title),
			banner: cleanValue(website.banner || rank.banner || website.gradient),
			checkerOpacity: Number.isFinite(Number(website.checkerOpacity ?? rank.checkerOpacity))
				? Number(website.checkerOpacity ?? rank.checkerOpacity)
				: 0.12
		};
	}

	function getFirebaseCardLevelRanks() {
		const source = extensionsData?.badges_levelranks;
		if (!source || typeof source !== "object") return null;

		const ranks = Object.entries(source)
			.map(function(entry) {
				return normalizeCardLevelRank(entry[1], entry[0]);
			})
			.filter(Boolean)
			.sort(function(a, b) {
				return (a.order ?? a.min) - (b.order ?? b.min);
			});

		return ranks.length ? ranks : null;
	}

	function applyExtensionLevelRanks() {
		CARD_LEVEL_RANKS = getFirebaseCardLevelRanks() || [];
	}

	function applyExtensionDataConfig() {
		applyExtensionFallbacks();
		applyExtensionLevelRanks();
	}

	function getPlayerLevelNumber(player) {
		const raw = player?.stats?.progression?.level;

		if (Array.isArray(raw)) {
			for (const value of raw) {
				if (typeof value === "number" && Number.isFinite(value)) {
					return Math.max(0, Math.floor(value));
				}

				if (typeof value === "string") {
					const match = value.match(/-?\d+(?:\.\d+)?/);
					if (match) {
						const parsed = Number(match[0]);
						if (Number.isFinite(parsed)) {
							return Math.max(0, Math.floor(parsed));
						}
					}
				}
			}
			return 0;
		}

		if (typeof raw === "number" && Number.isFinite(raw)) {
			return Math.max(0, Math.floor(raw));
		}

		if (typeof raw === "string") {
			const match = raw.match(/-?\d+(?:\.\d+)?/);
			if (match) {
				const parsed = Number(match[0]);
				if (Number.isFinite(parsed)) {
					return Math.max(0, Math.floor(parsed));
				}
			}
		}

		return 0;
	}

	function getCardRankData(player) {
		const level = getPlayerLevelNumber(player);
		const ranks = Array.isArray(CARD_LEVEL_RANKS) ? CARD_LEVEL_RANKS : [];

		return ranks.find(function(rank) {
			if (!rank || typeof rank !== "object") return false;
			const minMatch = typeof rank.min === "number" ? level >= rank.min : true;
			const maxMatch = typeof rank.max === "number" ? level <= rank.max : true;
			return minMatch && maxMatch;
		}) || {
			id: "levelranks_missing",
			min: 0,
			max: null,
			color: "#5865F2",
			color2: "#7a8cff",
			glow: "#5865F2",
			shimmer: false,
			particles: false,
			label: "Tier",
			icon: "",
			title: "",
			banner: "",
			checkerOpacity: 0.12,
			description: "Tier não encontrado.",
			category: "missing",
			order: 0,
			priority: 0,
			previous: "",
			next: "",
			progression: {},
			profile: {},
			visibility: {}
		};
	}

	function getRankImage(player) {
		const rankData = getCardRankData(player);
		const url = normalizePossibleUrl(rankData?.icon);
		return isValidUrl(url) ? url : "";
	}

	function getRankTitleImage(player) {
		const rankData = getCardRankData(player);
		const url = normalizePossibleUrl(rankData?.title);
		return isValidUrl(url) ? url : "";
	}

	function buildRankTitleMarkHtml(player, className = "") {
		const rankData = getCardRankData(player);
		const titleImage = getRankTitleImage(player);
		const label = rankData?.label || "Tier";
		const classes = ["rank-title-mark", className].filter(Boolean).join(" ");

		return `
			<div
				class="${classes}"
				style="
					--rank-color: ${rankData.color};
					--rank-color-2: ${rankData.color2 || rankData.color};
					--rank-glow: ${rankData.glow || rankData.color};
				"
				aria-hidden="true"
			>
				${titleImage ? `<img src="${escapeHtml(titleImage)}" alt="${escapeHtml(label)}" loading="lazy" onerror="this.remove(); const fallback=this.nextElementSibling; if(fallback) fallback.hidden=false;">` : ""}
				<span class="rank-title-fallback" ${titleImage ? "hidden" : ""}>${escapeHtml(label)}</span>
			</div>
		`;
	}




	function normalizeServerPanelData(data) {
		if (!data || typeof data !== "object") return {};
		if (data.server_panel && typeof data.server_panel === "object") return data.server_panel;
		return data;
	}

	function attachServerPanelData(extensions, serverPanelJson) {
		const base = extensions && typeof extensions === "object" ? extensions : {};
		const currentPanel = base.server_panel && typeof base.server_panel === "object" ? base.server_panel : {};
		const nextPanel = normalizeServerPanelData(serverPanelJson);
		base.server_panel = Object.assign({}, currentPanel, nextPanel);
		return base;
	}

	function normalizeNicknameColorItems(source) {
		if (!source || typeof source !== "object") return {};
		const direct = source.items && typeof source.items === "object" ? source.items : source;
		return direct && typeof direct === "object" ? direct : {};
	}

	function buildNicknameColorLookupKeys(colorName) {
		const raw = cleanValue(colorName).toLowerCase();
		if (!raw) return [];
		const keys = [];
		function add(value) {
			const key = cleanValue(value).toLowerCase().replace(/[\s-]+/g, "_");
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

		const serverPanel = extensionsData?.server_panel && typeof extensionsData.server_panel === "object" ? extensionsData.server_panel : {};
		const nicknameColors = serverPanel.nickname_colors || serverPanel.nicknameColors || extensionsData?.nickname_colors || extensionsData?.nicknameColors || serverPanel.items || serverPanel;
		const items = normalizeNicknameColorItems(nicknameColors);
		if (!items || !Object.keys(items).length) return null;

		for (const key of keys) {
			if (items[key]) return items[key];
		}
		return null;
	}


	function getServerPanelNicknameColorConfig(colorName) {
		const record = getServerPanelNicknameColorRecord(colorName);
		if (!record || typeof record !== "object") return null;
		if (record.enabled === false || record.visible === false) return null;

		const type = cleanValue(record.type).toLowerCase();
		const cssValue = cleanValue(record.css_value || record.css || record.value || record.gradient || record.color);

		if (type === "gradient" || /^linear-gradient/i.test(cssValue)) {
			const gradientValue = cssValue || colorArrayToGradient(record.colors || record.gradient_colors || record.minecraft_codes);
			return gradientValue ? { type: "gradient", gradient: gradientValue } : null;
		}

		if (type === "solid" || cssValue) {
			const solidValue = cssValue || mcColors[cleanValue(record.minecraft_key).toLowerCase()] || "";
			return solidValue ? { type: "solid", color: solidValue } : null;
		}

		if (Array.isArray(record.colors) || Array.isArray(record.minecraft_codes)) {
			const gradientValue = colorArrayToGradient(record.colors || record.minecraft_codes);
			return gradientValue ? { type: "gradient", gradient: gradientValue } : null;
		}

		const minecraftKey = cleanValue(record.minecraft_key).toLowerCase();
		if (minecraftKey && mcColors[minecraftKey]) {
			return { type: "solid", color: mcColors[minecraftKey] };
		}

		return null;
	}


	function getColorNameConfig(colorName) {
		const name = cleanValue(colorName).toLowerCase();
		const serverPanelColor = name ? getServerPanelNicknameColorConfig(name) : null;

		if (serverPanelColor) return serverPanelColor;

		return {
			type: "solid",
			color: getNicknameFallbackColor(),
			isFallback: true
		};
	}



	function getDisplayNameColor(player) {
		const raw = player?.theme?.color_name_id || "";
		const clean = cleanValue(raw).toLowerCase();
		const colorConfig = getColorNameConfig(clean);

		if (colorConfig && colorConfig.type === "gradient" && colorConfig.gradient) {
			return {
				type: "gradient",
				value: colorConfig.gradient
			};
		}

		return {
			type: "solid",
			value: colorConfig?.color || getNicknameFallbackColor()
		};
	}


	function getPlayerRankBadgeEntries(player) {
		const entries = normalizeBadgeEntries(player?.badges?.rank ?? player?.badges?.ranks ?? player?.rank?.badge_id);
		if (entries.length) return entries;
		const fallbackId = getFallbackDefaultId("rank", "rank_id_member");
		return fallbackId ? [{ id: fallbackId, fallback: true }] : [];
	}

	function getRankBadgeDefinition(rankId) {
		const raw = extensionsData?.badges_ranks?.[rankId] || extensionsData?.badges_rank?.[rankId] || null;
		const merged = mergeBadgeRecord(raw || getFallbackBadgeRecord("rank"));
		return merged && isBadgeVisible(merged, "profile", true) ? merged : null;
	}

	function getPlayerRoleBadgeEntries(player) {
		const entries = normalizeBadgeEntries(player?.badges?.role ?? player?.badges?.roles ?? player?.role?.badge_id);
		if (entries.length) return entries;
		const fallbackId = getFallbackDefaultId("role", "role_id_member");
		return fallbackId ? [{ id: fallbackId, fallback: true }] : [];
	}

	function getRoleBadgeDefinition(roleId) {
		const raw = extensionsData?.badges_roles?.[roleId] || extensionsData?.badges_role?.[roleId] || null;
		const merged = mergeBadgeRecord(raw || getFallbackBadgeRecord("role"));
		return merged && isBadgeVisible(merged, "profile", true) ? merged : null;
	}

	function getPrimaryRoleLabel(player, fallback) {
		const roleEntry = getPlayerRoleBadgeEntries(player)[0] || null;
		const roleData = roleEntry ? getRoleBadgeDefinition(roleEntry.id) : null;
		const fromData = cleanValue(roleData?.label || roleData?.name || roleData?.title);
		const fromEntry = cleanValue(roleEntry?.label || roleEntry?.name || roleEntry?.title);
		const fromPlayer = cleanValue(player?.rank?.name || player?.rank?.role || player?.clan?.rank);
		return stripMinecraftCodes(fromData || fromEntry || fromPlayer || fallback || "Membro");
	}


	function getPlayerAchievementBadgeEntries(player) {
		const entries = normalizeBadgeEntries(player?.badges?.achievements);
		if (entries.length) return entries;
		const fallbackId = getFallbackDefaultId("achievement", "achievements_id_none");
		return fallbackId ? [{ id: fallbackId, fallback: true }] : [];
	}

	function getAchievementBadgeDefinition(achievementId) {
		const raw = extensionsData?.badges_achievements?.[achievementId] || null;
		const merged = mergeBadgeRecord(raw || getFallbackBadgeRecord("achievement"));
		return merged && isBadgeVisible(merged, "profile", true) ? merged : null;
	}



	// ===== JavaScript: Builders de HTML reutilizáveis =====
	function buildTitleHtml(player) {
		const rawName = getDisplayName(player);
		const colorName = cleanValue(player?.theme?.color_name_id);
		const colorConfig = getColorNameConfig(colorName);

		if (colorConfig && colorConfig.type === "gradient" && colorConfig.gradient) {
			return "<span class=\"title-text title-gradient\" style=\"--title-gradient: " + colorConfig.gradient + ";\">" + escapeHtml(stripMinecraftCodes(rawName)) + "</span>";
		}

		if (colorConfig && colorConfig.type === "solid" && colorConfig.color) {
			return "<span class=\"title-text title-solid\" style=\"--title-solid-color: " + colorConfig.color + ";\">" + escapeHtml(stripMinecraftCodes(rawName)) + "</span>";
		}

		return "<span class=\"title-text\">" + minecraftToHtml(rawName) + "</span>";
	}

	function buildLevelChipHtml(player) {
		const rankData = getCardRankData(player);
		const levelImage = getRankImage(player);

		const extraClasses = [
			"card-chip",
			"card-rank-chip",
			rankData.shimmer ? "is-shimmer" : "",
			rankData.particles ? "is-particles" : ""
		].filter(Boolean).join(" ");

		return `
			<div
				class="${extraClasses}"
				style="
					--rank-color: ${rankData.color};
					--rank-color-2: ${rankData.color2 || rankData.color};
					--rank-glow: ${rankData.glow || rankData.color};
					--rank-banner: ${rankData.banner || "linear-gradient(135deg, color-mix(in srgb, " + (rankData.color || "#5865F2") + " 26%, rgba(255,255,255,.08)), rgba(8,12,24,.82))"};
					--rank-checker-opacity: ${typeof rankData.checkerOpacity === "number" ? rankData.checkerOpacity : 0.12};
				"
			>
				${levelImage ? `<img class="card-chip-icon" src="${escapeHtml(levelImage)}" alt="${escapeHtml(rankData.label)}" loading="lazy" onerror="this.remove()">` : ""}
				<span class="card-chip-text">${escapeHtml(rankData.label)}</span>
				<span class="card-chip-shine"></span>
				<span class="card-chip-particles"></span>
			</div>
		`;
	}
	
	function buildLevelInfoEmblemHtml(player) {
		const rankData = getCardRankData(player);
		const emblemImage = getRankImage(player);
		const levelText = getLevelText(player);
		const levelNumber = getPlayerLevelNumber(player);
		const hasMax = typeof rankData.max === "number";
		const rangeText = !hasMax
			? rankData.min + "+"
			: rankData.min === rankData.max
				? String(rankData.min)
				: rankData.min + "/" + rankData.max;

		const finalMax = (Array.isArray(CARD_LEVEL_RANKS) ? CARD_LEVEL_RANKS : [])
			.reduce(function(max, rank) {
				return typeof rank?.max === "number" ? Math.max(max, rank.max) : max;
			}, hasMax ? rankData.max : Math.max(levelNumber, 1));

		const tierProgressPercent = !hasMax || rankData.max <= 0
			? 100
			: (levelNumber / rankData.max) * 100;

		const safeProgress = Math.max(0, Math.min(100, tierProgressPercent));
		const generalPercent = finalMax <= 0 ? 100 : Math.max(0, Math.min(100, (levelNumber / finalMax) * 100));

		function getGeneralTier(percent) {
			if (percent >= 90) return "EX";
			if (percent >= 82) return "SSS";
			if (percent >= 74) return "SS";
			if (percent >= 66) return "S";
			if (percent >= 55) return "A";
			if (percent >= 44) return "B";
			if (percent >= 33) return "C";
			if (percent >= 22) return "D";
			if (percent >= 11) return "E";
			return "F";
		}

		const generalTier = getGeneralTier(generalPercent);
		const shownGeneralPercent = Math.round(generalPercent);
		const tierSubtitle = cleanValue(rankData.profile?.subtitle || rankData.profile?.lore || rankData.description);
		const tierMaterial = cleanValue(rankData.profile?.material || rankData.stage || rankData.category);
		const nextId = cleanValue(rankData.next || rankData.progression?.next_id);
		const nextRank = nextId ? (CARD_LEVEL_RANKS || []).find(function(rank) { return rank.id === nextId; }) : null;
		const nextText = nextRank?.label || (hasMax ? "Próximo tier" : "Tier máximo");

		return `
			<div
				class="level-info-wrap level-info-wrap-modern"
				style="
					--rank-color: ${rankData.color};
					--rank-color-2: ${rankData.color2 || rankData.color};
					--rank-glow: ${rankData.glow || rankData.color};
					--rank-banner: ${rankData.banner || "linear-gradient(135deg, color-mix(in srgb, " + (rankData.color || "#5865F2") + " 18%, rgba(255,255,255,.04)), rgba(8,12,24,.92))"};
					--rank-checker-opacity: ${typeof rankData.checkerOpacity === "number" ? rankData.checkerOpacity : 0.10};
					--tier-progress: ${Math.round(safeProgress)}%;
				"
			>
				<div
					class="level-info-emblem level-info-tier-card"
					tabindex="0"
					aria-label="Tier ${escapeHtml(rankData.label)}, nível ${escapeHtml(levelText)}, progresso ${Math.round(safeProgress)}%"
				>
					<div class="level-info-lv-box">
						<div class="level-info-lv-main">
							${emblemImage ? `<img class="level-info-emblem-icon" src="${escapeHtml(emblemImage)}" alt="${escapeHtml(rankData.label)}" loading="lazy" onerror="this.remove()">` : ""}
							<span class="level-info-emblem-value"><span class="level-info-tooltip-subtitle">Lv.</span> ${escapeHtml(levelText)}</span>
						</div>
					</div>

					<div class="level-info-main-text">
						<div class="level-info-tier-name"><span>Tier:</span> ${escapeHtml(rankData.label)}</div>
						<div class="level-info-tier-line">
							<span class="level-info-mini-progress" style="--mini-tier-progress:${Math.round(safeProgress)}%;" aria-hidden="true"><span style="width:${Math.round(safeProgress)}%;"></span></span>
							<span class="level-info-tier-percent">${Math.round(safeProgress)}%</span>
						</div>
					</div>

					${buildRankTitleMarkHtml(player, "detail-tier-title level-info-tier-image")}
				</div>

				<div class="level-info-progress-row level-info-progress-general" style="--tier-progress: ${shownGeneralPercent}%">
					<span class="level-info-progress-label">Tier ${escapeHtml(generalTier)}</span>
					<span class="level-info-progress-track" aria-hidden="true"><span style="width:${shownGeneralPercent}%"></span></span>
					<span class="level-info-progress-value">${shownGeneralPercent}%</span>
				</div>
				<div class="level-info-meta">
					${tierSubtitle ? `<span>${escapeHtml(tierSubtitle)}</span>` : ""}
					<span>Próximo: ${escapeHtml(nextText)}</span>
					${tierMaterial ? `<span>${escapeHtml(tierMaterial)}</span>` : ""}
				</div>
			</div>
		`;
	}

	function buildRoleInfoEmblemHtml(player) {
		function fallbackText(...values) {
			for (const value of values) {
				if (value === undefined || value === null) continue;
				const text = String(value).trim();
				if (text !== "") return text;
			}
			return "-";
		}

		function safeDate(value) {
			if (!value) return "-";
			const date = new Date(value);
			if (Number.isNaN(date.getTime())) return "-";
			return date.toLocaleString("pt-BR");
		}

		function stripRoleId(value) {
			return fallbackText(String(value || "").replace(/^role_id_/i, ""), value, "-");
		}

		const roleEntries = getPlayerRoleBadgeEntries(player);
		const roleEntry = roleEntries[0] || null;
		const roleData = roleEntry ? getRoleBadgeDefinition(roleEntry.id) : null;
		const label = fallbackText(roleData?.label, stripRoleId(roleEntry?.id), roleEntry?.id, "-");
		const icon = normalizePossibleUrl(roleData?.icon || "");
		const color = fallbackText(roleData?.color, "#d6a900");
		const color2 = fallbackText(roleData?.color2, roleData?.color, "#ffe27a");
		const glow = fallbackText(roleData?.glow, roleData?.color, "#ffd34d");
		const description = fallbackText(roleData?.description, roleData?.category, "Cargo do perfil.");
		const group = fallbackText(roleData?.hierarchy?.group, roleData?.category, "role");
		const date = safeDate(roleEntry?.unlocked_at);
		const id = fallbackText(roleEntry?.id, "-");

		return `
			<article class="vl-distinctive-card vl-distinctive-card--role" style="--badge-accent:${escapeHtml(color)};--badge-accent-2:${escapeHtml(color2)};--badge-glow:${escapeHtml(glow)};">
				<header class="vl-distinctive-card__header">
					<span class="vl-distinctive-card__header-icon" aria-hidden="true">◆</span>
					<strong>Cargo</strong>
				</header>
				<div class="vl-distinctive-card__body">
					<div class="vl-distinctive-emblem" aria-label="Cargo ${escapeHtml(label)}">
						<div class="vl-distinctive-emblem__media">
							${icon ? `<img src="${escapeHtml(icon)}" alt="" loading="lazy" onerror="this.remove()">` : `<span class="vl-distinctive-emblem__fallback" aria-hidden="true">◆</span>`}
						</div>
						<strong>${escapeHtml(label)}</strong>
					</div>
					<div class="vl-distinctive-details">
						<div class="vl-distinctive-identity">
							<small>Role</small>
							<strong>${escapeHtml(label)}</strong>
							<span>Cargo principal</span>
						</div>
						<div class="vl-distinctive-fields">
							<div><small>Grupo</small><strong>${escapeHtml(group)}</strong></div>
							<div><small>Descrição</small><strong>${escapeHtml(description)}</strong></div>
							<div><small>ID</small><strong>${escapeHtml(id)}</strong></div>
							<div><small>Data</small><strong>${escapeHtml(date)}</strong></div>
						</div>
					</div>
				</div>
			</article>
		`;
	}

	function buildRankInfoEmblemHtml(player) {
		function fallbackText(...values) {
			for (const value of values) {
				if (value === undefined || value === null) continue;
				const text = String(value).trim();
				if (text !== "") return text;
			}
			return "-";
		}

		function safeDate(value) {
			if (!value) return "-";
			const date = new Date(value);
			if (Number.isNaN(date.getTime())) return "-";
			return date.toLocaleString("pt-BR");
		}

		function stripRankId(value) {
			return fallbackText(String(value || "").replace(/^rank_id_/i, ""), value, "-");
		}

		const rankEntries = getPlayerRankBadgeEntries(player);
		const rankEntry = rankEntries[0] || null;
		const rankData = rankEntry ? getRankBadgeDefinition(rankEntry.id) : null;
		const label = fallbackText(rankData?.label, stripRankId(rankEntry?.id), rankEntry?.id, "-");
		const icon = normalizePossibleUrl(rankData?.icon || "");
		const color = fallbackText(rankData?.color, "#e83b78");
		const color2 = fallbackText(rankData?.color2, rankData?.color, "#ff82ad");
		const glow = fallbackText(rankData?.glow, rankData?.color, "#ff4f91");
		const description = fallbackText(rankData?.description, rankData?.category, "Rank do perfil.");
		const group = fallbackText(rankData?.hierarchy?.group, rankData?.category, "rank");
		const date = safeDate(rankEntry?.unlocked_at);
		const id = fallbackText(rankEntry?.id, "-");

		return `
			<article class="vl-distinctive-card vl-distinctive-card--rank" style="--badge-accent:${escapeHtml(color)};--badge-accent-2:${escapeHtml(color2)};--badge-glow:${escapeHtml(glow)};">
				<header class="vl-distinctive-card__header">
					<span class="vl-distinctive-card__header-icon" aria-hidden="true">♛</span>
					<strong>Rank</strong>
				</header>
				<div class="vl-distinctive-card__body">
					<div class="vl-distinctive-emblem" aria-label="Rank ${escapeHtml(label)}">
						<div class="vl-distinctive-emblem__media">
							${icon ? `<img src="${escapeHtml(icon)}" alt="" loading="lazy" onerror="this.remove()">` : `<span class="vl-distinctive-emblem__fallback" aria-hidden="true">♛</span>`}
						</div>
						<strong>${escapeHtml(label)}</strong>
					</div>
					<div class="vl-distinctive-details">
						<div class="vl-distinctive-identity">
							<small>Rank</small>
							<strong>${escapeHtml(label)}</strong>
							<span>Cargo secundário</span>
						</div>
						<div class="vl-distinctive-fields">
							<div><small>Grupo</small><strong>${escapeHtml(group)}</strong></div>
							<div><small>Descrição</small><strong>${escapeHtml(description)}</strong></div>
							<div><small>ID</small><strong>${escapeHtml(id)}</strong></div>
							<div><small>Data</small><strong>${escapeHtml(date)}</strong></div>
						</div>
					</div>
				</div>
			</article>
		`;
	}

	function buildAchievementsGalleryHtml(player) {
		function fallbackText(...values) {
			for (const value of values) {
				if (value === undefined || value === null) continue;
				const text = String(value).trim();
				if (text !== "") return text;
			}
			return "-";
		}

		function safeDate(value) {
			if (!value) return "-";
			const date = new Date(value);
			if (Number.isNaN(date.getTime())) return "-";
			return date.toLocaleString("pt-BR");
		}

		function stripAchievementId(value) {
			return fallbackText(String(value || "").replace(/^achievements?_id_/i, ""), value, "-");
		}

		const achievementEntries = getPlayerAchievementBadgeEntries(player);
		if (!achievementEntries.length) {
			return `<div class="vl-achievements-empty">Nenhuma conquista pública.</div>`;
		}

		const items = achievementEntries.map(function(entry, index) {
			const data = getAchievementBadgeDefinition(entry.id) || {};
			return {
				id: fallbackText(entry.id, "-"),
				label: fallbackText(data.label, stripAchievementId(entry.id), entry.id, "Sem conquista"),
				image: normalizePossibleUrl(data.preview_image || data.image || data.icon || ""),
				banner: normalizePossibleUrl(data.banner || data.background || ""),
				title: normalizePossibleUrl(data.title || ""),
				color: fallbackText(data.color, "#8f63ff"),
				color2: fallbackText(data.color2, data.color, "#bd95ff"),
				glow: fallbackText(data.glow, data.color, "#9c6cff"),
				category: fallbackText(data.category, "achievement"),
				points: Number.isFinite(Number(data.points)) ? Number(data.points) : 0,
				description: fallbackText(data.description, data.unlock?.condition, "Conquista do perfil."),
				date: safeDate(entry.unlocked_at),
				index
			};
		});

		const first = items[0];
		const thumbs = items.map(function(item, index) {
			return `
				<button type="button" class="achievement-gallery-thumb ${index === 0 ? "is-active" : ""}" data-achievement-thumb
					data-id="${escapeHtml(item.id)}" data-label="${escapeHtml(item.label)}" data-banner="${escapeHtml(item.banner)}"
					data-background="${escapeHtml(item.banner)}" data-image="${escapeHtml(item.image)}" data-title="${escapeHtml(item.title)}"
					data-color="${escapeHtml(item.color)}" data-color2="${escapeHtml(item.color2)}" data-glow="${escapeHtml(item.glow)}"
					data-category="${escapeHtml(item.category)}" data-points="${escapeHtml(item.points)}"
					data-description="${escapeHtml(item.description)}" data-date="${escapeHtml(item.date)}" aria-label="${escapeHtml(item.label)}">
					${item.image ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" onerror="this.remove()">` : `<span aria-hidden="true">✦</span>`}
				</button>`;
		}).join("");

		return `
			<section class="vl-achievements-card" data-achievement-gallery style="--achievement-color:${escapeHtml(first.color)};--achievement-color-2:${escapeHtml(first.color2)};--achievement-glow:${escapeHtml(first.glow)};">
				<header class="vl-achievements-card__header">
					<div><span aria-hidden="true">◆</span><strong>Conquistas</strong></div>
					<span class="vl-achievements-card__total">${items.length} ${items.length === 1 ? "total" : "totais"}</span>
				</header>
				<div class="achievement-gallery-main ${first.banner ? "" : "is-empty"}" data-achievement-main>
					${first.banner ? `<img data-achievement-banner data-achievement-background src="${escapeHtml(first.banner)}" alt="${escapeHtml(first.label)}">` : `<div class="achievement-gallery-main-fallback">Sem imagem</div>`}
					${first.title ? `<div class="achievement-main-title"><img data-achievement-title src="${escapeHtml(first.title)}" alt="${escapeHtml(first.label)}"></div>` : ""}
				</div>
				<div class="vl-achievement-summary">
					<div class="vl-achievement-summary__icon">${first.image ? `<img src="${escapeHtml(first.image)}" alt="" loading="lazy" onerror="this.remove()">` : `<span aria-hidden="true">✦</span>`}</div>
					<div class="vl-achievement-summary__content">
						<div class="vl-achievement-summary__title-row">
							<strong data-achievement-name>${escapeHtml(first.label)}</strong>
							<span class="vl-achievement-summary__count">${items.length} total</span>
						</div>
						<div class="vl-achievement-summary__meta-row">
							<span data-achievement-date>${escapeHtml(first.date)}</span>
							<span data-achievement-meta>${escapeHtml(first.category)} · ${escapeHtml(first.points)} pts</span>
						</div>
						<p data-achievement-description>${escapeHtml(first.description)}</p>
						<span data-achievement-id hidden>${escapeHtml(first.id)}</span>
					</div>
				</div>
				<div class="achievement-gallery-list" aria-label="Lista de conquistas">${thumbs}</div>
			</section>
		`;
	}

	function getRarityBadgeDefinition(rarityId) {
		const id = cleanValue(rarityId) || getFallbackDefaultId("rarity", "raritys_id_n");
		if (!id) return null;
		const source = extensionsData?.badges_raritys || extensionsData?.badges_rarities || {};
		const aliases = Array.from(new Set([
			id,
			id.replace(/^rarity_id_/i, "raritys_id_"),
			id.replace(/^raritys_id_/i, "rarity_id_")
		]));
		const key = aliases.find(function(alias) { return source?.[alias]; });
		const merged = mergeBadgeRecord(key ? source[key] : getFallbackBadgeRecord("rarity"));
		if (!merged || !isBadgeVisible(merged, "profile", true)) return null;
		return { ...merged, id: key || id };
	}

	function getPlayerRarityId(player) {
		const raw = player?.stats?.rarity;
		if (typeof raw === "string" || typeof raw === "number") return cleanValue(raw) || getFallbackDefaultId("rarity", "raritys_id_n");
		if (raw && typeof raw === "object") return cleanValue(raw.id || raw.rarity_id || raw.value) || getFallbackDefaultId("rarity", "raritys_id_n");
		return cleanValue(player?.rarity_id || player?.badges?.rarity_id || player?.badges?.rarity) || getFallbackDefaultId("rarity", "raritys_id_n");
	}

	function buildRarityInfoHtml(player) {
		const rarityId = getPlayerRarityId(player);
		const data = getRarityBadgeDefinition(rarityId);
		if (!data) return "";

		const label = cleanValue(data.label || data.name || data.website?.short_label) || rarityId;
		const shortLabel = cleanValue(data.website?.short_label || data.website?.badge_text || data.short_label || data.label) || label;
		const stars = cleanValue(data.website?.stars || data.stars) || (Number(data.stars_count || data.website?.stars_count) ? "★".repeat(Math.max(1, Math.min(5, Number(data.stars_count || data.website?.stars_count)))) : "");
		const category = cleanValue(data.category || data.tier || "rarity");
		const evolution = cleanValue(data.website?.evolution || data.card_effects?.frame || data.evolution || "normal");
		const color = cleanValue(data.color || "#f7d58a");
		const color2 = cleanValue(data.color2 || color);
		const glow = cleanValue(data.glow || color);
		const description = cleanValue(data.description || `Raridade ${label}.`);
		const intensity = Number.isFinite(Number(data.card_effects?.intensity ?? data.intensity)) ? Number(data.card_effects?.intensity ?? data.intensity) : 0.5;

		return `
			<div
				class="vl-profile-rarity-card"
				style="--rarity-color:${escapeHtml(color)};--rarity-color-2:${escapeHtml(color2)};--rarity-glow:${escapeHtml(glow)};--rarity-intensity:${escapeHtml(intensity)};"
			>
				<div class="vl-profile-rarity-mark"><strong>${escapeHtml(shortLabel)}</strong><span>${escapeHtml(stars)}</span></div>
				<div class="vl-profile-rarity-text">
					<small>${escapeHtml(category)} • ${escapeHtml(evolution)}</small>
					<strong>${escapeHtml(label)}</strong>
					<p>${escapeHtml(description)}</p>
				</div>
			</div>
		`;
	}

	function getStatusBadgeDefinition(statusId) {
		const id = cleanValue(statusId) || getFallbackDefaultId("status", getFallbackDefaultId("avatarlock", "warns_id_undefined"));
		if (!id) return null;
		const source = extensionsData?.badges_avatarlocks || extensionsData?.badges_warns || extensionsData?.badges_moderation_status || {};
		const aliases = Array.from(new Set([
			id,
			id.replace(/^warn_id_/i, "warns_id_"),
			id.replace(/^warns_id_/i, "warn_id_"),
			id.replace(/^avatar_lock_id_/i, "warns_id_"),
			id.replace(/^avatarlocks_id_/i, "warns_id_")
		]));
		const key = aliases.find(function(alias) { return source?.[alias]; });
		const merged = mergeBadgeRecord(key ? source[key] : (getFallbackBadgeRecord("status") || getFallbackBadgeRecord("avatarlock")));
		return merged ? { ...merged, id: key || id } : null;
	}

	function getPlayerPublicStatusId(player) {
		return cleanValue(
			player?.moderation?.status_id ||
			player?.moderation?.warn_status_id ||
			player?.status?.warn_id ||
			player?.status?.status_id ||
			player?.theme?.card_embed?.security_overlay?.avatar_lock_id ||
			player?.theme?.card_embed?.security_overlay?.warns_id ||
			getFallbackDefaultId("status", getFallbackDefaultId("avatarlock", "warns_id_undefined"))
		);
	}

	function buildModerationStatusHtml(player) {
		const statusId = getPlayerPublicStatusId(player);
		if (!statusId) return "";
		const data = getStatusBadgeDefinition(statusId);
		if (!data) return "";

		const publicInfo = data.public && typeof data.public === "object" ? data.public : {};
		const publicAllowed = publicInfo.show_on_profile !== false && isBadgeVisible(data, "profile", true);
		if (!publicAllowed) return "";

		const color = cleanValue(data.color || "#ffffff");
		const color2 = cleanValue(data.color2 || color);
		const glow = cleanValue(data.glow || color);
		const label = cleanValue(publicInfo.safe_label || data.label || "Status");
		const description = cleanValue(publicInfo.safe_description || data.description || "Status público do perfil.");
		const risk = cleanValue(data.moderation?.risk_level || data.status || "none");

		return `
			<div class="vl-profile-status-card" style="--status-color:${escapeHtml(color)};--status-color-2:${escapeHtml(color2)};--status-glow:${escapeHtml(glow)};">
				<strong>${escapeHtml(label)}</strong>
				<span>${escapeHtml(risk)}</span>
				<p>${escapeHtml(description)}</p>
			</div>
		`;
	}

	function getPlayerVerifiedEmblemId(player) {
		function collect(raw, output) {
			if (raw === true || raw === 1 || raw === "true" || raw === "1") {
				output.push("verified_id_default");
				return;
			}
			if (typeof raw === "string" || typeof raw === "number") {
				const value = cleanValue(raw);
				if (value) output.push(value);
				return;
			}
			if (Array.isArray(raw)) {
				raw.forEach(function(item) { collect(item, output); });
				return;
			}
			if (raw && typeof raw === "object") {
				collect(raw.id || raw.emblem || raw.value || raw.verified_id || raw.badge_id, output);
			}
		}

		const ids = [];
		collect(player?.profile?.emblem, ids);
		collect(player?.profile?.verified, ids);
		collect(player?.badges?.verified, ids);
		collect(player?.badges?.verified_id, ids);
		collect(player?.verified, ids);

		const unique = Array.from(new Set(ids.filter(Boolean)));
		if (!unique.length) {
			const fallbackVerified = getFallbackDefaultId("verified", "verified_id_none");
			return fallbackVerified || "";
		}

		unique.sort(function(a, b) {
			const da = getVerifiedEmblemDefinition(a);
			const db = getVerifiedEmblemDefinition(b);
			return getBadgeSortValue(db, 0) - getBadgeSortValue(da, 0);
		});

		return unique[0] || "";
	}

	function getVerifiedEmblemDefinition(emblemId) {
		if (!emblemId) return null;

		const source = extensionsData?.badges_verified;
		const direct = source && typeof source === "object" ? source[emblemId] : null;
		const merged = mergeBadgeRecord(direct || getFallbackBadgeRecord("verified"));
		return merged && isBadgeVisible(merged, "profile", true) ? merged : null;
	}


	function buildVerifiedEmblemHtml(player) {
		const emblemId = getPlayerVerifiedEmblemId(player);
		const emblemData = getVerifiedEmblemDefinition(emblemId);
		const icon = getMediaUrl(emblemData?.icon);

		if (!icon) return "";

		const label = cleanValue(emblemData?.label) || "Verificado";
		const glow = cleanValue(emblemData?.glow || emblemData?.color) || "#ffffff";

		return `
			<span
				class="verified-emblem"
				title="${escapeHtml(label)}"
				aria-label="${escapeHtml(label)}"
				style="--verified-glow: ${escapeHtml(glow)};"
			>
				<img
					src="${escapeHtml(icon)}"
					alt="${escapeHtml(label)}"
					loading="lazy"
					referrerpolicy="no-referrer"
					crossorigin="anonymous"
					draggable="false"
					onerror="this.closest('.verified-emblem')?.remove()"
				>
			</span>
		`;
	}


	function getShortVerifiedLabel(label, emblemId) {
		const raw = cleanValue(label);
		const id = cleanValue(emblemId).toUpperCase();
		if (/^EA$/i.test(id) || /EARLY\s*ACCESS/i.test(raw)) return "EA";
		if (/VERIFIC/i.test(raw) || /VERIFIED/i.test(raw)) return "✓";
		const words = raw.split(/\s+/).filter(Boolean);
		if (words.length >= 2) return words.slice(0, 2).map(function(word) { return word.charAt(0); }).join("").toUpperCase();
		return (raw || id || "VIP").slice(0, 3).toUpperCase();
	}

	function buildVerifiedCardBadgeHtml(player) {
		const emblemId = getPlayerVerifiedEmblemId(player);
		const emblemData = getVerifiedEmblemDefinition(emblemId);
		const icon = getMediaUrl(emblemData?.emblem || emblemData?.icon || emblemData?.image);
		if (!icon) return `<div class="card-verified-chip-empty" aria-hidden="true"></div>`;

		const label = cleanValue(emblemData?.website?.badge_text || emblemData?.display?.badge_text || emblemData?.label) || "Badge Verified";
		const shortLabel = getShortVerifiedLabel(label, emblemId);
		const color = normalizeHexColor(emblemData?.color || emblemData?.glow || "#a855f7", "#a855f7");

		return `
			<div
				class="card-verified-chip"
				aria-label="${escapeHtml(label)}"
				data-short-label="${escapeHtml(shortLabel)}"
				data-label="${escapeHtml(label)}"
				style="--verified-card-color: ${escapeHtml(color)};"
			>
				<span class="card-verified-label">${escapeHtml(label)}</span>
				<img
					class="card-verified-emblem"
					src="${escapeHtml(icon)}"
					alt="${escapeHtml(label)}"
					loading="lazy"
					referrerpolicy="no-referrer"
					crossorigin="anonymous"
					draggable="false"
					onerror="this.closest('.card-verified-chip')?.remove()"
				>
			</div>
		`;
	}

	function getPlayerClanName(player) {
		const raw = player?.clan || player?.profile?.clan || player?.profile?.clan_name || player?.profile?.clanName;

		function pickClanText(input) {
			if (input == null) return "";
			if (typeof input === "string" || typeof input === "number") return cleanValue(input);
			if (Array.isArray(input)) {
				for (const item of input) {
					const found = pickClanText(item);
					if (found) return found;
				}
				return "";
			}
			if (typeof input === "object") {
				const keys = ["id", "name", "sub", "clanName", "clan_name", "title"];
				for (const key of keys) {
					const found = pickClanText(input[key]);
					if (found) return found;
				}
			}
			return "";
		}

		const cleaned = stripMinecraftCodes(cleanValue(pickClanText(raw)));
		if (cleaned && cleaned !== "-" && !/^\[object object\]$/i.test(cleaned)) return cleaned;

		const found = findClanForPlayer(player);
		return found?.name || "";
	}

	function playerMatchesClanEntry(player, entry) {
		const candidates = [
			cleanProfileSlug(player?._id || ""),
			cleanProfileSlug(player?.id || ""),
			cleanProfileSlug(player?.xuid || ""),
			cleanProfileSlug(player?.profile?.display_username || ""),
			cleanProfileSlug(player?.profile?.display_nickname || ""),
			cleanProfileSlug(player?.profile?.username || ""),
			cleanProfileSlug(player?.username || "")
		].map(function(v) { return String(v || "").toLowerCase(); }).filter(Boolean);

		function check(value) {
			if (value == null) return false;
			if (typeof value === "string" || typeof value === "number") {
				const raw = cleanProfileSlug(value).toLowerCase();
				return raw && candidates.includes(raw);
			}
			if (Array.isArray(value)) return value.some(check);
			if (typeof value === "object") {
				if (check(value.id || value.playerId || value.player_id || value.xuid || value.username || value.name || value.sub)) return true;
				return Object.values(value).some(check);
			}
			return false;
		}

		return check(entry);
	}

	function findClanForPlayer(player) {
		const source = clansData || {};
		for (const clanName of Object.keys(source)) {
			const clan = source[clanName];
			if (!clan || typeof clan !== "object") continue;
			if (clan.by && playerMatchesClanEntry(player, clan.by)) return { name: clanName, data: clan };
			const players = clan.players || clan.members || clan.clanPlayers || {};
			if (playerMatchesClanEntry(player, players)) return { name: clanName, data: clan };
		}
		return null;
	}

	function normalizeClans(data) {
		const source = data?.clanPlayers || data || {};
		return source && typeof source === "object" ? source : {};
	}

	function getClanDefinition(clanName) {
		const wanted = stripMinecraftCodes(cleanValue(clanName));
		if (!wanted || wanted === "-") return null;
		if (clansData?.[wanted]) return clansData[wanted];
		const lower = wanted.toLowerCase();
		const key = Object.keys(clansData || {}).find(function(item) {
			return stripMinecraftCodes(cleanValue(item)).toLowerCase() === lower;
		});
		return key ? clansData[key] : null;
	}

	function buildClanInfoCardHtml(player) {
		const clanName = getPlayerClanName(player);
		const clan = getClanDefinition(clanName);

		if (!clanName || !clan) {
			const fallbackClan = extensionsData?.information_panel?.badges_fallbacks?.clan || extensionsData?.badges_fallbacks?.clan || {};
			const fallbackWebsite = fallbackClan?.website || {};
			const fallbackTitle = stripMinecraftCodes(cleanValue(fallbackClan?.label || fallbackWebsite?.title || fallbackWebsite?.label || "SEM CLÃ")) || "SEM CLÃ";
			const fallbackColor = normalizeHexColor(fallbackWebsite?.color || player?.theme?.card_embed?.card_color || "#a855f7", "#a855f7");

			return `
				<div class="clan-info-card clan-info-card-premium clan-info-card-tech is-empty clan-empty-compact" style="--clan-color: ${escapeHtml(fallbackColor)};">
					<div class="clan-empty-center">
						<div class="clan-info-title">${escapeHtml(fallbackTitle)}</div>
					</div>
				</div>
			`;
		}

		const label = stripMinecraftCodes(cleanValue(clan?.sub || clanName)) || clanName;
		const title = stripMinecraftCodes(cleanValue(clan?.profile?.title || clan?.title || clanName)) || clanName;
		const subtitle = stripMinecraftCodes(cleanValue(clan?.profile?.bio || clan?.bio || clan?.profile?.subtitle || clan?.subtitle || "Informações do clã")) || "Informações do clã";
		const color = normalizeHexColor(
			clan?.theme?.card_embed?.card_color ||
			clan?.theme?.card_embed?.background_color ||
			player?.theme?.card_embed?.card_color ||
			"#a855f7",
			"#a855f7"
		);

		const mainIcon = getMediaUrl(clan?.theme?.card_embed?.avatar_bottom_image) || getMediaUrl(clan?.rank?.icon_image) || getMediaUrl(clan?.icon || clan?.emblem || clan?.image);
		const watermarkIcon = getMediaUrl(clan?.theme?.card_embed?.avatar_bottom_image) || mainIcon;
		const codepoint = cleanValue(clan?.rank?.icon_codepoint || clan?.icon_codepoint);
		const fallbackIcon = codepoint || "♛";
		const iconHtml = mainIcon ? `
			<img
				src="${escapeHtml(mainIcon)}"
				alt=""
				loading="lazy"
				referrerpolicy="no-referrer"
				crossorigin="anonymous"
				draggable="false"
				onerror="this.replaceWith(Object.assign(document.createElement('span'), {className: 'clan-info-emblem-fallback', textContent: '${escapeHtml(fallbackIcon)}'}))"
			>
		` : `<span class="clan-info-emblem-fallback">${escapeHtml(fallbackIcon)}</span>`;

		return `
			<div class="clan-info-card clan-info-card-premium clan-info-card-tech" style="--clan-color: ${escapeHtml(color)};">
				<div class="clan-info-label">${escapeHtml(label)}</div>
				<div class="clan-info-emblem" aria-hidden="true">${iconHtml}</div>
				<div class="clan-info-text">
					<div class="clan-info-title">${escapeHtml(title)}</div>
					<div class="clan-info-subtitle">${escapeHtml(subtitle)}</div>
				</div>
				<div class="clan-info-watermark" aria-hidden="true">
					${watermarkIcon ? `<img src="${escapeHtml(watermarkIcon)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" draggable="false">` : `<span>${escapeHtml(fallbackIcon)}</span>`}
				</div>
			</div>
		`;
	}

	function buildUsernameLine(player, classPrefix) {
		const username = getUsername(player);
		const flagHtml = buildCountryFlagHtml(player?.country?.code);
		const verifiedEmblemHtml = buildVerifiedEmblemHtml(player);

		return `
			<div class="${classPrefix}-username-line">
				<span class="username-with-emblem">
					<span class="${classPrefix}-username">${escapeHtml(username)}</span>
					${verifiedEmblemHtml}
				</span>
			</div>
		`;
	}

	function setupAchievementGalleries(root = document) {
		const galleries = root.querySelectorAll("[data-achievement-gallery]");

		galleries.forEach(function(gallery) {
			if (gallery.dataset.galleryBound === "true") {
				return;
			}

			gallery.dataset.galleryBound = "true";

			const main = gallery.querySelector("[data-achievement-main]");
			const name = gallery.querySelector("[data-achievement-name]");
			const id = gallery.querySelector("[data-achievement-id]");
			const date = gallery.querySelector("[data-achievement-date]");
			const meta = gallery.querySelector("[data-achievement-meta]");
			const description = gallery.querySelector("[data-achievement-description]");
			const thumbs = Array.from(gallery.querySelectorAll("[data-achievement-thumb]"));

			if (!main || !name || !date || !thumbs.length) {
				return;
			}

			function renderMainAchievement(banner, title, icon, label) {
				main.innerHTML = "";

				if (banner) {
					main.classList.remove("is-empty");
					const bannerImg = document.createElement("img");
					bannerImg.setAttribute("data-achievement-banner", "");
					bannerImg.src = banner;
					bannerImg.alt = label;
					bannerImg.loading = "lazy";
					bannerImg.onerror = function() {
						main.classList.add("is-empty");
						bannerImg.remove();
						if (!main.querySelector(".achievement-gallery-main-fallback")) {
							main.insertAdjacentHTML("afterbegin", '<div class="achievement-gallery-main-fallback">Sem imagem</div>');
						}
					};
					main.appendChild(bannerImg);
				} else {
					main.classList.add("is-empty");
					main.insertAdjacentHTML("afterbegin", '<div class="achievement-gallery-main-fallback">Sem imagem</div>');
				}

				if (title) {
					const titleBox = document.createElement("div");
					titleBox.className = "achievement-main-title";
					const titleImg = document.createElement("img");
					titleImg.setAttribute("data-achievement-title", "");
					titleImg.src = title;
					titleImg.alt = label;
					titleImg.loading = "lazy";
					titleImg.onerror = function() { titleBox.remove(); };
					titleBox.appendChild(titleImg);
					main.appendChild(titleBox);
				} else if (icon) {
					const iconBox = document.createElement("div");
					iconBox.className = "achievement-main-icon";
					const iconImg = document.createElement("img");
					iconImg.src = icon;
					iconImg.alt = label;
					iconImg.loading = "lazy";
					iconImg.onerror = function() { iconBox.remove(); };
					iconBox.appendChild(iconImg);
					main.appendChild(iconBox);
				}
			}

			function setActiveThumb(button) {
				if (!button) return;

				thumbs.forEach(function(item) {
					item.classList.remove("is-active");
					item.setAttribute("aria-pressed", "false");
				});

				button.classList.add("is-active");
				button.setAttribute("aria-pressed", "true");

				const icon = button.dataset.image || "";
				const banner = button.dataset.banner || button.dataset.background || "";
				const title = button.dataset.title || "";
				const label = button.dataset.label || "-";
				const achievementId = button.dataset.id || "-";
				const achievementDate = button.dataset.date || "-";
				const color = button.dataset.color || "#7c5cff";
				const color2 = button.dataset.color2 || color;
				const glow = button.dataset.glow || color;

				gallery.style.setProperty("--achievement-color", color);
				gallery.style.setProperty("--achievement-color-2", color2);
				gallery.style.setProperty("--achievement-glow", glow);

				name.textContent = label;
				if (id) id.textContent = achievementId;
				date.textContent = achievementDate;
				if (meta) meta.textContent = `${button.dataset.category || "achievement"} · ${button.dataset.points || "0"} pts`;
				if (description) description.textContent = button.dataset.description || "-";

				renderMainAchievement(banner, title, icon, label);
			}

			thumbs.forEach(function(button) {
				button.addEventListener("click", function(event) {
					event.preventDefault();
					event.stopPropagation();
					setActiveThumb(button);
				});

				button.addEventListener("mouseenter", function() {
					setActiveThumb(button);
				});

				button.addEventListener("focus", function() {
					setActiveThumb(button);
				});

				button.addEventListener("keydown", function(event) {
					const currentIndex = thumbs.indexOf(button);

					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						setActiveThumb(button);
						return;
					}

					if (event.key === "ArrowRight") {
						event.preventDefault();
						const next = thumbs[currentIndex + 1] || thumbs[0];
						next.focus();
						setActiveThumb(next);
					}

					if (event.key === "ArrowLeft") {
						event.preventDefault();
						const prev = thumbs[currentIndex - 1] || thumbs[thumbs.length - 1];
						prev.focus();
						setActiveThumb(prev);
					}
				});
			});

			setActiveThumb(thumbs[0]);
		});
	}





  async function fetchJsonSafe(url) {
    if (!url) return null;
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status + " - " + response.statusText);
      return await response.json();
    } catch (error) {
      console.warn("[VelarionProfilePage] Falha ao carregar dados:", url, error);
      return null;
    }
  }

  function getRouteSlug() {
    try {
      const query = new URLSearchParams(window.location.search);
      const queryId = cleanValue(query.get("id") || query.get("profile") || "");
      if (queryId) return decodeURIComponent(queryId);
    } catch (error) {}

    try {
      const path = decodeURIComponent(window.location.pathname || "");
      const match = path.match(/\/users\/([^/]+)\/profile\.html$/i);
      if (match) return match[1];
    } catch (error) {}

    const hash = String(window.location.hash || "").trim();
    const hashMatch = hash.match(/^#(?:profile|perfil)-(.+)$/i);
    return hashMatch ? decodeURIComponent(hashMatch[1]) : "";
  }

  function findPlayerBySlug(players, slug) {
    const wanted = cleanProfileSlug(slug).toLowerCase();
    if (!wanted) return null;

    return (players || []).find(function(player) {
      const rawId = String(player?._id || player?.id || player?.profile_id || player?.profile?.id || "");
      const cleanId = cleanProfileSlug(rawId);
      const username = cleanProfileSlug(player?.profile?.display_username || "");
      return rawId.toLowerCase() === wanted ||
        cleanId.toLowerCase() === wanted ||
        username.toLowerCase() === wanted;
    }) || null;
  }

  function getProjectBasePath() {
    const path = window.location.pathname || "/";
    const usersIndex = path.lastIndexOf("/users/");
    if (usersIndex >= 0) return path.slice(0, usersIndex + 1);
    return path.replace(/[^/]*$/, "");
  }

  function exposePrettyProfileUrl(player) {
    if (!player || window.location.protocol === "file:") return;

    const slug = cleanProfileSlug(player._id || player.id || getRouteSlug());
    if (!slug) return;

    const base = getProjectBasePath();
    const prettyPath = base + "users/" + encodeURIComponent(slug) + "/profile.html";
    const current = window.location.pathname.replace(/\/$/, "");
    const target = prettyPath.replace(/\/$/, "");

    if (current !== target || window.location.search || window.location.hash) {
      try { window.history.replaceState(null, "", prettyPath); } catch (error) {}
    }
  }

  function getProfileRenderContext() {
    return {
      escapeHtml,
      minecraftToHtml,
      stripMinecraftCodes,
      cleanValue,
      normalizeHexColor,
      getAvatar,
      getBanner,
      getCharacter,
      hasBanner,
      getDisplayName,
      getUsername,
      getCardTitle,
      getPlayerClanName,
      isProbablyPixelArt,
      buildTitleHtml,
      buildLevelChipHtml,
      buildUsernameLine,
      buildVerifiedCardBadgeHtml,
      buildCountryFlagHtml,
      buildLevelInfoEmblemHtml,
      buildRankTitleMarkHtml,
      buildClanInfoCardHtml,
      buildRoleInfoEmblemHtml,
      buildRankInfoEmblemHtml,
      buildAchievementsGalleryHtml,
      buildRarityInfoHtml,
      buildModerationStatusHtml,
      getProfileSectionOrder,
      DEFAULT_PLAYER_AVATAR,
      DEFAULT_PLAYER_BANNER,
      DEFAULT_PLAYER_CHARACTER,
      extensionsData,
      websitePanel: websitePanelData || undefined,
      website_panel: websitePanelData || undefined,
      clanPlayers: clansData || {},
      clansData: clansData || {},
      profilePlayers: profilePlayersDataSource || {}
    };
  }

  function setPageState(state, title, message) {
    const root = document.getElementById("profileRoot");
    if (!root) return;
    root.dataset.state = state || "loading";
    if (state === "ready") return;

    root.innerHTML = `
      <section class="vl-profile-page-state" role="status" aria-live="polite">
        <span>${state === "error" ? "!" : "✦"}</span>
        <strong>${escapeHtml(title || "Abrindo perfil...")}</strong>
        <p>${escapeHtml(message || "Sincronizando o registro público do aventureiro.")}</p>
      </section>
    `;
  }

  function updatePageMetadata(player) {
    const display = stripMinecraftCodes(getDisplayName(player)) || getUsername(player) || "Aventureiro";
    document.title = display + " | Velarion Lumen";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Perfil público de " + display + " no Velarion Lumen.");
  }

  function renderProfile(player) {
    const root = document.getElementById("profileRoot");
    if (!root) return;

    if (!window.VelarionLumenCard || typeof window.VelarionLumenCard.renderPlayerCard !== "function") {
      throw new Error("VelarionLumenCard não foi carregado antes do perfil.");
    }
    if (!window.VelarionProfile || typeof window.VelarionProfile.render !== "function") {
      throw new Error("VelarionProfile não foi carregado.");
    }

    root.innerHTML = window.VelarionProfile.render(player, getProfileRenderContext());
    root.dataset.state = "ready";

    if (typeof window.VelarionLumenCard.hydrate === "function") {
      window.VelarionLumenCard.hydrate(root);
    }
    if (window.VelarionCardFX && typeof window.VelarionCardFX.refresh === "function") {
      window.VelarionCardFX.refresh(root);
    }
    if (typeof window.VelarionProfile.refreshComponents === "function") {
      window.VelarionProfile.refreshComponents(root).catch((error) => {
        console.warn("[VelarionProfilePage] Falha ao hidratar módulos do perfil.", error);
      });
    }

    setupAchievementGalleries(root);
    updatePageMetadata(player);
    exposePrettyProfileUrl(player);
  }

  async function bootProfilePage() {
    const slug = getRouteSlug();
    if (!slug) {
      setPageState("error", "Perfil não informado", "Use uma rota como /users/1/profile.html.");
      return;
    }

    setPageState("loading", "Abrindo registro", "Buscando o aventureiro " + slug + " no Codex.");

    try {
      const [playersJson, badgesPlayersJson, extensionsJson, serverPanelJson, websitePanelJson, clansJson] = await Promise.all([
        fetchJsonSafe(PLAYER_DATA_URL),
        fetchJsonSafe(BADGES_PLAYER_DATA_URL),
        fetchJsonSafe(EXTENSIONS_DATA_URL),
        fetchJsonSafe(SERVER_PANEL_DATA_URL),
        fetchJsonSafe(WEBSITE_PANEL_DATA_URL),
        fetchJsonSafe(CLANS_DATA_URL)
      ]);

      if (!playersJson) throw new Error("Não foi possível carregar profilePlayers.");

      extensionsData = attachServerPanelData(extensionsJson || {}, serverPanelJson || {});
      websitePanelData = websitePanelJson && typeof websitePanelJson === "object" ? websitePanelJson : null;
      clansData = normalizeClans(clansJson || {});
      badgesPlayersDataSource = badgesPlayersJson && typeof badgesPlayersJson === "object" ? badgesPlayersJson : {};
      profilePlayersDataSource = applyBadgesPlayerAchievements(playersJson || {}, badgesPlayersDataSource);
      applyExtensionDataConfig();

      const players = normalize(profilePlayersDataSource).filter(function(player) {
        if (!player || typeof player !== "object") return false;
        if (player.public_profile === false) return false;
        if (player.profile && player.profile.public_profile === false) return false;
        return true;
      });

      const player = findPlayerBySlug(players, slug);
      if (!player) {
        setPageState("error", "Aventureiro não encontrado", "Nenhum perfil público corresponde a " + slug + ".");
        return;
      }

      if (window.VelarionProfile?.componentsReady) {
        await window.VelarionProfile.componentsReady;
      }
      renderProfile(player);
    } catch (error) {
      console.error("[VelarionProfilePage]", error);
      setPageState("error", "Falha ao abrir o perfil", error?.message || "Não foi possível carregar este registro agora.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootProfilePage, { once: true });
  } else {
    bootProfilePage();
  }
})(window, document);
