/* ===== original script 1  ===== */
// ===== JavaScript: Configuração e estado global =====
	const DATA_URL = "https://kazimuhwaribedrock-default-rtdb.firebaseio.com/profilePlayers.json";
	const EXTENSIONS_DATA_URL = "https://kazimuhwaribedrock-extensions-default-rtdb.firebaseio.com/information_panel.json";
	let extensionsData = null;
	
	let DEFAULT_PLAYER_AVATAR = null;
	let DEFAULT_PLAYER_CHARACTER = null;
	let DEFAULT_PLAYER_BANNER = null;

	let playersData = [];
	let filteredPlayers = [];
	let activePlayerId = null;
	let isTransitionRunning = false;
	let pageScrollBeforeDetail = 0;
	let isListMode = false;
	let currentPage = 1;
	let itemsPerPage = 10;



	// ===== Rotas separadas GitHub Pages =====
	const SITE_BASE_PATH = "/Velarion-Lumen-Website-Main";
	function getSiteBasePath() {
		const path = window.location.pathname || "/";
		const repo = "/Velarion-Lumen-Website-Main";
		return path.startsWith(repo + "/") || path === repo ? repo : "";
	}
	function cleanProfileSlug(value) {
		return String(value || "").trim().replace(/^ID[_-]?/i, "");
	}
	function makeProfileUrl(playerId) {
		return getSiteBasePath() + "/users/" + encodeURIComponent(cleanProfileSlug(playerId)) + "/profile";
	}
	function makeSearchUrl() {
		return getSiteBasePath() + "/search/users/";
	}
	function getProfileSlugFromPath() {
		const base = getSiteBasePath();
		let path = window.location.pathname || "/";
		if (base && path.startsWith(base)) path = path.slice(base.length) || "/";
		const match = path.match(/^\/users\/([^\/]+)\/profile\/?$/i);
		return match ? decodeURIComponent(match[1]) : "";
	}
	function findPlayerBySlug(slug) {
		const wanted = cleanProfileSlug(slug).toLowerCase();
		return playersData.find(function(item) {
			const rawId = String(item._id || "");
			const cleanId = cleanProfileSlug(rawId);
			const username = cleanProfileSlug(item?.profile?.display_username || "");
			return rawId.toLowerCase() === wanted || cleanId.toLowerCase() === wanted || username.toLowerCase() === wanted;
		}) || null;
	}

	// ===== JavaScript: Helpers de animação / transição =====
	function wait(ms) {
		return new Promise(function(resolve) {
			setTimeout(resolve, ms);
		});
	}


	function hideSummonBoot() {
		const boot = document.getElementById("summonBoot");
		if (!boot) return;
		boot.classList.add("is-hidden");
		setTimeout(function() { boot.remove(); }, 520);
	}

	async function playSummonSequence(player) {
		const gate = document.getElementById("summonGate");
		if (!gate || !player) return;

		const color = normalizeHexColor(player?.theme?.card_embed?.card_color || "#75d7ff");
		const displayName = stripMinecraftCodes(getDisplayName(player));
		const userName = stripMinecraftCodes(getUsername(player));
		const avatar = getAvatar(player);
		const kicker = gate.querySelector("[data-summon-kicker]");
		const title = gate.querySelector("[data-summon-title]");
		const status = gate.querySelector("[data-summon-status]");
		const avatarBox = gate.querySelector("[data-summon-avatar]");

		gate.style.setProperty("--summon-accent", hexToRgba(color, 0.48));
		gate.dataset.phase = "scan";
		gate.setAttribute("aria-hidden", "false");
		gate.classList.remove("is-hidden");

		if (avatarBox) {
			avatarBox.innerHTML = `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(displayName)}" onerror="this.onerror=null; this.src='${escapeHtml(DEFAULT_PLAYER_AVATAR)}'">`;
		}
		if (kicker) kicker.textContent = userName || "???";
		if (title) title.textContent = displayName || "???";
		if (status) status.textContent = "Lendo dados, rank e badges...";
		await wait(520);

		if (kicker) kicker.textContent = userName || "???";
		if (status) status.textContent = "Sincronizando perfil do jogador...";
		gate.dataset.phase = "reveal";
		await wait(460);

		if (title) title.textContent = displayName || "???";
		if (status) status.textContent = "Perfil carregado. Abrindo arquivo...";
		await wait(560);

		gate.classList.add("is-hidden");
		gate.setAttribute("aria-hidden", "true");
		await wait(240);
	}

	function ensureScreenFade() {
		let fade = document.getElementById("screenFade");
		if (fade) return fade;

		fade = document.createElement("div");
		fade.id = "screenFade";
		fade.className = "screen-fade";
		document.body.appendChild(fade);
		return fade;
	}

	function createTransitionLayer() {
		const layer = document.createElement("div");
		layer.className = "transition-layer";
		document.body.appendChild(layer);
		return layer;
	}

	function makeComets(container, accentColor) {
		const burst = document.createElement("div");
		burst.className = "rare-burst";
		burst.style.setProperty("--accent", accentColor || "#8eb4ff");

		const cometCount = 12;

		for (let i = 0; i < cometCount; i += 1) {
			const comet = document.createElement("span");
			comet.className = "comet";

			const startX = Math.random() * 100;
			const startY = Math.random() * 100;
			const tx = (Math.random() * 220 + 110) * (Math.random() > 0.5 ? 1 : -1);
			const ty = (Math.random() * 180 + 60) * (Math.random() > 0.5 ? 1 : -1);
			const angle = Math.atan2(ty, tx) * 180 / Math.PI;
			const delay = (Math.random() * 0.35).toFixed(2) + "s";

			comet.style.left = startX + "%";
			comet.style.top = startY + "%";
			comet.style.setProperty("--tx", tx.toFixed(0) + "px");
			comet.style.setProperty("--ty", ty.toFixed(0) + "px");
			comet.style.setProperty("--angle", angle.toFixed(2) + "deg");
			comet.style.animationDelay = delay;
			burst.appendChild(comet);
		}

		container.appendChild(burst);
		return burst;
	}

	function buildTransitionFrontCard(sourceCard) {
		if (!sourceCard) return null;

		const frontCard = sourceCard.cloneNode(true);
		frontCard.classList.remove("card-selected-source", "card-faded");
		frontCard.style.visibility = "visible";
		frontCard.style.opacity = "1";
		frontCard.style.pointerEvents = "none";
		frontCard.style.transform = "none";
		frontCard.dataset.idle = "false";
		reset3DCard(frontCard);

		frontCard.querySelectorAll("img").forEach(function(img) {
			img.loading = "eager";
			img.decoding = "sync";
			img.fetchPriority = "high";
			img.style.opacity = "1";
			img.style.visibility = "visible";
		});

		const outline = frontCard.querySelector(".card-outline");
		if (outline) {
			outline.style.opacity = "1";
			outline.style.visibility = "visible";
		}

		const sideRail = frontCard.querySelector(".side-rail");
		if (sideRail) {
			sideRail.style.opacity = "1";
			sideRail.style.visibility = "visible";
		}

		return frontCard;
	}

	function getRectRelativeToViewport(element) {
		const rect = element.getBoundingClientRect();
		return {
			left: rect.left,
			top: rect.top,
			width: rect.width,
			height: rect.height
		};
	}

	function setCloneBox(clone, rect) {
		clone.style.left = rect.left + "px";
		clone.style.top = rect.top + "px";
		clone.style.width = rect.width + "px";
		clone.style.height = rect.height + "px";
	}

	function easeOutCubic(t) {
		return 1 - Math.pow(1 - t, 3);
	}

	function animateElementTo(clone, fromRect, toRect, duration) {
		return new Promise(function(resolve) {
			const total = duration || 1280;
			const start = performance.now();

			function frame(now) {
				const elapsed = now - start;
				const progress = Math.min(elapsed / total, 1);
				const eased = easeOutCubic(progress);
				const rect = lerpRect(fromRect, toRect, eased);
				const vanishStart = 0.42;
				const vanishProgress = progress <= vanishStart
					? 0
					: Math.min((progress - vanishStart) / (1 - vanishStart), 1);
				const opacity = 1 - vanishProgress;

				setCloneBox(clone, rect);

				const spinBoost = 1 + (1 - eased) * 0.022;
				clone.style.transform = "scale(" + spinBoost.toFixed(4) + ")";
				clone.style.opacity = opacity.toFixed(4);
				clone.style.filter = "drop-shadow(0 28px 70px rgba(0,0,0,.52)) blur(" + (vanishProgress * 6).toFixed(2) + "px)";

				if (progress < 1) {
					requestAnimationFrame(frame);
				} else {
					resolve();
				}
			}

			requestAnimationFrame(frame);
		});
	}

	function lerpRect(a, b, t) {
		return {
			left: a.left + (b.left - a.left) * t,
			top: a.top + (b.top - a.top) * t,
			width: a.width + (b.width - a.width) * t,
			height: a.height + (b.height - a.height) * t
		};
	}


	// ===== JavaScript: Sanitização / utilidades gerais =====
	function escapeHtml(value) {
		return String(value ?? "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

	function cleanValue(value) {
		if (value == null) return "";
		return String(value).trim();
	}

	function normalizePossibleUrl(value) {
		let raw = cleanValue(value);
		if (!raw) return "";

		raw = raw
			.replace(/^['"]+|['"]+$/g, "")
			.replace(/\\\//g, "/")
			.replace(/&amp;/g, "&")
			.trim();

		if (!raw) return "";

		if (/^https?:\/\/github\.com\/.+\/blob\/.+$/i.test(raw)) {
			raw = raw
				.replace("https://github.com/", "https://raw.githubusercontent.com/")
				.replace("/blob/", "/");
		}

		if (/^https?:\/\/www\.github\.com\/.+\/blob\/.+$/i.test(raw)) {
			raw = raw
				.replace("https://www.github.com/", "https://raw.githubusercontent.com/")
				.replace("/blob/", "/");
		}

		return raw;
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
		const value = extensionsData?.badges_fallbacks?.[kind]?.website?.[key];
		const url = getMediaUrl(value);
		return url || fallbackValue;
	}

	function applyExtensionFallbacks() {
		DEFAULT_PLAYER_AVATAR = readExtensionFallback("avatar");
		DEFAULT_PLAYER_CHARACTER = readExtensionFallback("character");
		DEFAULT_PLAYER_BANNER = readExtensionFallback("banner");
	}

	function normalizeCardLevelRank(rank, id) {
		if (!rank || typeof rank !== "object") return null;

		const website = rank.website && typeof rank.website === "object" ? rank.website : {};
		const min = Number(rank.min ?? website.min);
		const rawMax = rank.max ?? website.max;
		const max = rawMax == null || rawMax === "" ? null : Number(rawMax);

		if (!Number.isFinite(min)) return null;
		if (max !== null && !Number.isFinite(max)) return null;

		const label = cleanValue(rank.label || website.label) || cleanValue(id).replace(/^levelranks_id_/, "") || "Tier";

		return {
			id,
			min,
			max,
			label,
			color: cleanValue(website.color || rank.color) || "#5865F2",
			color2: cleanValue(website.color2 || rank.color2 || website.color || rank.color) || "#7a8cff",
			glow: cleanValue(website.glow || rank.glow || website.color || rank.color) || "#5865F2",
			shimmer: Boolean(website.shimmer ?? rank.shimmer),
			particles: Boolean(website.particles ?? rank.particles),
			icon: cleanValue(website.icon || rank.icon),
			title: cleanValue(website.title || rank.title),
			banner: cleanValue(website.banner || rank.banner),
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
				return a.min - b.min;
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
			checkerOpacity: 0.12
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

	function normalizeHexColor(hex, fallback = "#5865F2") {
		if (!hex) return fallback;
		let value = String(hex).trim();

		if (!value.startsWith("#")) value = "#" + value;

		if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;

		if (/^#[0-9a-fA-F]{3}$/.test(value)) {
			const short = value.slice(1).split("").map(function(c) {
				return c + c;
			}).join("");
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

	function countryCodeToFlag(code) {
		if (!code) return "";
		const clean = String(code).trim().toUpperCase();
		if (!/^[A-Z]{2}$/.test(clean)) return "";

		const A = 0x1F1E6;
		return String.fromCodePoint(
			A + clean.charCodeAt(0) - 65,
			A + clean.charCodeAt(1) - 65
		);
	}

	function buildCountryFlagHtml(code) {
		if (!code) return "";

		const clean = String(code).trim().toUpperCase();
		if (!/^[A-Z]{2}$/.test(clean)) return "";

		const emoji = countryCodeToFlag(clean);
		const lower = clean.toLowerCase();

		return `
			<span class="country-flag" title="${clean}">
				<span class="country-flag-emoji">${emoji}</span>
				<img
					class="country-flag-img"
					src="https://flagcdn.com/16x12/${lower}.png"
					alt="${clean}"
					loading="lazy"
					onerror="this.style.display='none'"
					onload="const emojiEl=this.previousElementSibling;if(emojiEl) emojiEl.style.display='none';"
				>
			</span>
		`;
	}

	function normalize(data) {
		if (!data || typeof data !== "object") return [];
		return Object.entries(data).map(function(entry) {
			return {
				_id: entry[0],
				...entry[1]
			};
		});
	}


	// ===== JavaScript: Cores e gradientes estilo Minecraft =====
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

			const safeChar = escapeHtml(random ? obfuscateChar() : char);
			result += "<span class=\"" + buildClass() + "\" style=\"" + buildStyle() + "\">" + safeChar + "</span>";
		}

		return result;
	}

	function stripMinecraftCodes(text) {
		return String(text ?? "").replace(/§./g, "");
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

	function getColorNameConfig(colorName) {
		const name = cleanValue(colorName).toLowerCase();
		if (!name) return null;

		const singleMap = {
			colorvip: mcColors["b"],
			black: mcColors["0"],
			netherite: mcColors["j"],
			dark_gray: mcColors["8"],
			gray: mcColors["7"],
			iron: mcColors["i"],
			quartz: mcColors["h"],
			white: mcColors["f"],
			yellow: mcColors["e"],
			minecoin_gold: mcColors["g"],
			golden: mcColors["p"],
			gold: mcColors["6"],
			resin: mcColors["v"],
			copper: mcColors["n"],
			redstone: mcColors["m"],
			dark_red: mcColors["4"],
			red: mcColors["c"],
			light_purple: mcColors["d"],
			dark_purple: mcColors["5"],
			amethyst: mcColors["u"],
			blue: mcColors["9"],
			dark_blue: mcColors["1"],
			lapis: mcColors["t"],
			dark_aqua: mcColors["3"],
			diamond: mcColors["s"],
			aqua: mcColors["b"],
			green: mcColors["a"],
			dark_green: mcColors["2"],
			emerald: mcColors["q"]
		};

		if (singleMap[name]) {
			return { type: "solid", color: singleMap[name] };
		}

		const gradientAliases = {
			rainbow_color1: { key: "rainbow_color1", reverse: false },
			rainbow_soft_color1: { key: "soft_rainbow_color1", reverse: false },
			soft_rainbow_color1: { key: "soft_rainbow_color1", reverse: false },
			blue_gradient_color1: { key: "blue_color1", reverse: false },
			blue_gradient_reverse_color1: { key: "blue_color1", reverse: true },
			ocean_gradient_color1: { key: "ocean_color1", reverse: false },
			ocean_gradient_reverse_color1: { key: "ocean_color1", reverse: true },
			sky_gradient_color1: { key: "sky_color1", reverse: false },
			sky_gradient_reverse_color1: { key: "sky_color1", reverse: true },
			yellow_gradient_color1: { key: "yellow_color1", reverse: false },
			yellow_gradient_reverse_color1: { key: "yellow_color1", reverse: true },
			gold_gradient_color1: { key: "gold_color1", reverse: false },
			gold_gradient_reverse_color1: { key: "gold_color1", reverse: true },
			sun_gradient_color1: { key: "sun_color1", reverse: false },
			sun_gradient_reverse_color1: { key: "sun_color1", reverse: true },
			black_gradient_color1: { key: "black_color1", reverse: false },
			black_gradient_reverse_color1: { key: "black_color1", reverse: true },
			shadow_gradient_color1: { key: "shadow_color1", reverse: false },
			shadow_gradient_reverse_color1: { key: "shadow_color1", reverse: true },
			gray_gradient_color1: { key: "gray_color1", reverse: false },
			gray_gradient_reverse_color1: { key: "gray_color1", reverse: true },
			red_gradient_color1: { key: "red_color1", reverse: false },
			red_gradient_reverse_color1: { key: "red_color1", reverse: true },
			fire_gradient_color1: { key: "fire_color1", reverse: false },
			fire_gradient_reverse_color1: { key: "fire_color1", reverse: true },
			green_gradient_color1: { key: "green_color1", reverse: false },
			green_gradient_reverse_color1: { key: "green_color1", reverse: true },
			nature_gradient_color1: { key: "nature_color1", reverse: false },
			nature_gradient_reverse_color1: { key: "nature_color1", reverse: true },
			purple_gradient_color1: { key: "purple_color1", reverse: false },
			purple_gradient_reverse_color1: { key: "purple_color1", reverse: true },
			mystic_gradient_color1: { key: "mystic_color1", reverse: false },
			mystic_gradient_reverse_color1: { key: "mystic_color1", reverse: true },
			white_gradient_color1: { key: "white_color1", reverse: false },
			white_gradient_reverse_color1: { key: "white_color1", reverse: true },
			metal_gradient_color1: { key: "metal_color1", reverse: false },
			metal_gradient_reverse_color1: { key: "metal_color1", reverse: true },
			kazin_gradient_color1: { key: "kazin_color1", reverse: false },
			kazin_gradient_reverse_color1: { key: "kazin_color1", reverse: true },
			kazin_random_color1: { key: "kazin_color1", reverse: false }
		};

		const gradientConfig = gradientAliases[name];
		if (!gradientConfig) return null;

		const gradient = gradientCodesToCss(gradientConfig.key, gradientConfig.reverse);
		if (!gradient) return null;

		return { type: "gradient", gradient: gradient };
	}


	// ===== JavaScript: Leitura dos dados do jogador =====
	function getDisplayName(player) {
		const nickname = cleanValue(player?.profile?.display_nickname);
		const username = cleanValue(player?.profile?.display_username);
		return nickname || username || "Criando...";
	}

	function getDisplayNameColor(player) {
		const raw = player?.theme?.color_name_id || "";

		const clean = cleanValue(raw).toLowerCase();

		if (!clean) {
			return {
				type: "solid",
				value: "#dfffe0"
			};
		}

		const colorConfig = getColorNameConfig(clean);

		if (colorConfig) {
			if (colorConfig.type === "solid" && colorConfig.color) {
				return {
					type: "solid",
					value: colorConfig.color
				};
			}

			if (colorConfig.type === "gradient" && colorConfig.gradient) {
				return {
					type: "gradient",
					value: colorConfig.gradient
				};
			}
		}

		if (mcColors[clean] && typeof mcColors[clean] === "string") {
			return {
				type: "solid",
				value: mcColors[clean]
			};
		}

		return {
			type: "solid",
			value: "#dfffe0"
		};
	}

	function getUsername(player) {
		return cleanValue(player?.profile?.display_username) || stripMinecraftCodes(getDisplayName(player)) || "?";
	}

	function getCardTitle(player) {
		return cleanValue(player?.profile?.title) || "-";
	}

	function getLevelText(player) {
		return cleanValue(player?.stats?.progression?.level) ||
			cleanValue(player?.card?.level) ||
			"-";
	}

	function getPlayerRankBadgeEntries(player) {
		return Array.isArray(player?.badges?.rank) ? player.badges.rank.filter(function(entry) {
			return entry && typeof entry === "object" && entry.id;
		}) : [];
	}

	function getRankBadgeDefinition(rankId) {
		return extensionsData?.badges_ranks?.[rankId]?.website || null;
	}

	function getPlayerRoleBadgeEntries(player) {
		const role = player?.badges?.role;
		if (Array.isArray(role)) {
			return role.filter(function(entry) {
				return entry && typeof entry === "object" && entry.id;
			});
		}
		if (role && typeof role === "object" && role.id) return [role];
		if (typeof role === "string" && role.trim()) return [{ id: role.trim() }];
		return [];
	}

	function getRoleBadgeDefinition(roleId) {
		const raw = extensionsData?.badges_roles?.[roleId] || extensionsData?.badges_role?.[roleId] || null;
		if (!raw) return null;
		return raw.website && typeof raw.website === "object" ? raw.website : raw;
	}

	function getPrimaryRoleLabel(player, fallback) {
		const roleEntry = getPlayerRoleBadgeEntries(player)[0] || null;
		const roleData = roleEntry ? getRoleBadgeDefinition(roleEntry.id) : null;
		const fromData = cleanValue(roleData?.label || roleData?.name || roleData?.title);
		const fromEntry = cleanValue(roleEntry?.label || roleEntry?.name || roleEntry?.title);
		const fromPlayer = cleanValue(player?.rank?.name || player?.rank?.role || player?.clan?.rank);
		return stripMinecraftCodes(fromData || fromEntry || fromPlayer || fallback || "Membro");
	}

	function isPlayerOnline(player) {
		return player?.status?.online === true;
	}

	function getPlayerAchievementBadgeEntries(player) {
		return Array.isArray(player?.badges?.achievements)
			? player.badges.achievements.filter(function(entry) {
				return entry && typeof entry === "object" && entry.id;
			})
			: [];
	}

	function getAchievementBadgeDefinition(achievementId) {
		return extensionsData?.badges_achievements?.[achievementId]?.website || null;
	}

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

		const progressPercent = !hasMax || rankData.max <= rankData.min
			? 100
			: ((levelNumber - rankData.min) / (rankData.max - rankData.min)) * 100;

		const safeProgress = Math.max(0, Math.min(100, progressPercent));

		return `
			<div
				class="level-info-wrap"
				style="
					--rank-color: ${rankData.color};
					--rank-color-2: ${rankData.color2 || rankData.color};
					--rank-glow: ${rankData.glow || rankData.color};
					--rank-banner: ${rankData.banner || "linear-gradient(135deg, color-mix(in srgb, " + (rankData.color || "#5865F2") + " 18%, rgba(255,255,255,.04)), rgba(8,12,24,.92))"};
					--rank-checker-opacity: ${typeof rankData.checkerOpacity === "number" ? rankData.checkerOpacity : 0.10};
				"
			>
				<div
					class="level-info-emblem"
					tabindex="0"
					aria-label="Emblema ${escapeHtml(rankData.label)} com texto ${escapeHtml(levelText)}"
				>
					${emblemImage ? `<img class="level-info-emblem-icon" src="${escapeHtml(emblemImage)}" alt="${escapeHtml(rankData.label)}" loading="lazy" onerror="this.remove()">` : ""}
					<span class="level-info-emblem-value">
						<span class="level-info-tooltip-subtitle">Lv.</span>
						${escapeHtml(levelText)}
					</span>
				</div>

				<div class="level-info-tooltip" role="tooltip">
					<div class="level-info-tooltip-head">
						<div class="level-info-tooltip-badge">
							${emblemImage ? `<img src="${escapeHtml(emblemImage)}" alt="${escapeHtml(rankData.label)}" loading="lazy" onerror="this.remove()">` : ""}
						</div>

						<div class="level-info-tooltip-texts">
							
							<div class="level-info-tooltip-title">
								<span class="level-info-tooltip-subtitle">Tier:</span>
								${escapeHtml(rankData.label)}
							</div>
							<div class="level-info-tooltip-subtitle">Faixa: ${escapeHtml(rangeText)}</div>
						</div>
					</div>

					<div class="level-info-tooltip-progress">
						<div
							class="level-info-tooltip-progress-fill"
							style="width: ${safeProgress}%;"
						></div>
					</div>

					<div class="level-info-tooltip-row">
						<span class="level-info-tooltip-row-label">Progresso</span>
						<span class="level-info-tooltip-row-value">${Math.round(safeProgress)}%</span>
					</div>
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
			return fallbackText(
				String(value || "").replace(/^role_id_/i, ""),
				value,
				"-"
			);
		}

		const roleEntries = getPlayerRoleBadgeEntries(player);
		const roleEntry = roleEntries[0] || null;
		const roleData = roleEntry ? getRoleBadgeDefinition(roleEntry.id) : null;

		const labelRole = fallbackText(
			roleData?.label,
			stripRoleId(roleEntry?.id),
			roleEntry?.id,
			"-"
		);

		const emblemImageRole = normalizePossibleUrl(roleData?.icon || "");
		const unlockedAtRole = safeDate(roleEntry?.unlocked_at);

		const roleColor = fallbackText(roleData?.color, "#4f7cff");
		const roleColor2 = fallbackText(roleData?.color2, roleData?.color, "#4f7cff");
		const roleGlow = fallbackText(roleData?.glow, roleData?.color, "#4f7cff");

		return `
			<div
				class="level-info-wrap"
				style="
					--rank-color: ${escapeHtml(roleColor)};
					--rank-color-2: ${escapeHtml(roleColor2)};
					--rank-glow: ${escapeHtml(roleGlow)};
				"
			>
				<div
					class="level-info-emblem"
					tabindex="0"
					aria-label="Role ${escapeHtml(labelRole)}"
				>
					${emblemImageRole ? `<img class="level-info-emblem-icon" src="${escapeHtml(emblemImageRole)}" alt="${escapeHtml(labelRole)}" loading="lazy" onerror="this.remove()">` : ""}

					<span class="level-info-emblem-value">
						${escapeHtml(labelRole)}
					</span>
				</div>

				<div class="level-info-tooltip" role="tooltip">
					<div class="level-info-tooltip-head">
						${emblemImageRole ? `
							<div class="level-info-tooltip-badge">
								<img src="${escapeHtml(emblemImageRole)}" alt="${escapeHtml(labelRole)}" loading="lazy" onerror="this.remove()">
							</div>
						` : ""}

						<div class="level-info-tooltip-texts">
							<div class="level-info-tooltip-title">
								<span class="level-info-tooltip-subtitle">Role:</span>
								${escapeHtml(labelRole)}
							</div>
							<div class="level-info-tooltip-subtitle">
								${roleData ? "Cargo principal" : "Role não encontrado no WebBaseExtensions"}
							</div>
						</div>
					</div>

					<div class="level-info-tooltip-row">
						<span class="level-info-tooltip-row-label">ID</span>
						<span class="level-info-tooltip-row-value">${escapeHtml(fallbackText(roleEntry?.id, "-"))}</span>
					</div>

					<div class="level-info-tooltip-row">
						<span class="level-info-tooltip-row-label">Data:</span>
						<span class="level-info-tooltip-row-value">${escapeHtml(unlockedAtRole)}</span>
					</div>
				</div>
			</div>
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
			return fallbackText(
				String(value || "").replace(/^rank_id_/i, ""),
				value,
				"-"
			);
		}

		const rankEntries = getPlayerRankBadgeEntries(player);
		const rankEntry = rankEntries[0] || null;
		const rankData = rankEntry ? getRankBadgeDefinition(rankEntry.id) : null;

		const labelRank = fallbackText(
			rankData?.label,
			stripRankId(rankEntry?.id),
			rankEntry?.id,
			"-"
		);

		const emblemImageRank = normalizePossibleUrl(rankData?.icon || "");
		const unlockedAtRank = safeDate(rankEntry?.unlocked_at);

		const rankColor = fallbackText(rankData?.color, "#5865F2");
		const rankColor2 = fallbackText(rankData?.color2, rankData?.color, "#5865F2");
		const rankGlow = fallbackText(rankData?.glow, rankData?.color, "#5865F2");

		return `
			<div
				class="level-info-wrap"
				style="
					--rank-color: ${escapeHtml(rankColor)};
					--rank-color-2: ${escapeHtml(rankColor2)};
					--rank-glow: ${escapeHtml(rankGlow)};
				"
			>
				<div
					class="level-info-emblem"
					tabindex="0"
					aria-label="Rank ${escapeHtml(labelRank)}"
				>
					${emblemImageRank ? `<img class="level-info-emblem-icon" src="${escapeHtml(emblemImageRank)}" alt="${escapeHtml(labelRank)}" loading="lazy" onerror="this.remove()">` : ""}

					<span class="level-info-emblem-value">
						${escapeHtml(labelRank)}
					</span>

					${rankData?.shimmer ? `<span class="level-info-emblem-shine"></span>` : ""}
					${rankData?.particles ? `<span class="level-info-emblem-particles"></span>` : ""}
				</div>

				<div class="level-info-tooltip" role="tooltip">
					<div class="level-info-tooltip-head">
						${emblemImageRank ? `
							<div class="level-info-tooltip-badge">
								<img src="${escapeHtml(emblemImageRank)}" alt="${escapeHtml(labelRank)}" loading="lazy" onerror="this.remove()">
							</div>
						` : ""}

						<div class="level-info-tooltip-texts">
							<div class="level-info-tooltip-title">
								<span class="level-info-tooltip-subtitle">Rank:</span>
								${escapeHtml(labelRank)}
							</div>
							<div class="level-info-tooltip-subtitle">
								${rankData ? "Cargo secundário" : "Rank não encontrado no WebBaseExtensions"}
							</div>
						</div>
					</div>

					<div class="level-info-tooltip-row">
						<span class="level-info-tooltip-row-label">ID</span>
						<span class="level-info-tooltip-row-value">${escapeHtml(fallbackText(rankEntry?.id, "-"))}</span>
					</div>

					<div class="level-info-tooltip-row">
						<span class="level-info-tooltip-row-label">Data:</span>
						<span class="level-info-tooltip-row-value">${escapeHtml(unlockedAtRank)}</span>
					</div>
				</div>
			</div>
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
			return fallbackText(
				String(value || "").replace(/^achievements?_id_/i, ""),
				value,
				"-"
			);
		}

		const achievementEntries = getPlayerAchievementBadgeEntries(player);

		if (!achievementEntries.length) {
			return `<div class="info-value">-</div>`;
		}

		const achievementItems = achievementEntries.map(function(entry, index) {
			const data = getAchievementBadgeDefinition(entry.id) || {};

			const label = fallbackText(
				data.label,
				stripAchievementId(entry.id),
				entry.id,
				"Sem achievement"
			);

			const image = normalizePossibleUrl(
				data.preview_image ||
				data.image ||
				data.icon ||
				""
			);

			const banner = normalizePossibleUrl(
				data.banner ||
				data.background ||
				""
			);

			const title = normalizePossibleUrl(data.title || "");

			const color = fallbackText(data.color, "#7c5cff");
			const color2 = fallbackText(data.color2, data.color, "#7c5cff");
			const glow = fallbackText(data.glow, data.color, "#7c5cff");

			return {
				id: fallbackText(entry.id, "-"),
				label,
				image,
				banner,
				title,
				color,
				color2,
				glow,
				date: safeDate(entry.unlocked_at),
				index
			};
		});

		const firstItem = achievementItems[0];

		const thumbsHtml = achievementItems.map(function(item, index) {
			return `
				<button
					type="button"
					class="achievement-gallery-thumb ${index === 0 ? "is-active" : ""}"
					data-achievement-thumb
					data-id="${escapeHtml(item.id)}"
					data-label="${escapeHtml(item.label)}"
					data-banner="${escapeHtml(item.banner)}"
					data-background="${escapeHtml(item.banner)}"
					data-image="${escapeHtml(item.image)}"
					data-title="${escapeHtml(item.title)}"
					data-color="${escapeHtml(item.color)}"
					data-color2="${escapeHtml(item.color2)}"
					data-glow="${escapeHtml(item.glow)}"
					data-date="${escapeHtml(item.date)}"
				>
					${item.image
						? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.label)}" loading="lazy" onerror="this.remove()">`
						: `<span></span>`
					}
				</button>
			`;
		}).join("");

		return `
			<div
				class="achievements-info-wrap"
				data-achievement-gallery
				style="
					--achievement-color: ${escapeHtml(firstItem.color)};
					--achievement-color-2: ${escapeHtml(firstItem.color2)};
					--achievement-glow: ${escapeHtml(firstItem.glow)};
				"
			>
				<div class="achievement-gallery">
					<div
						class="achievement-gallery-main ${firstItem.banner ? "" : "is-empty"}"
						data-achievement-main
					>
						${firstItem.banner
							? `<img data-achievement-banner data-achievement-banner src="${escapeHtml(firstItem.banner)}" alt="${escapeHtml(firstItem.label)}">`
							: `<div class="achievement-gallery-main-fallback">Sem imagem</div>`
						}

						${firstItem.title
							? `
								<div class="achievement-main-title">
									<img
										data-achievement-title
										src="${escapeHtml(firstItem.title)}"
										alt="${escapeHtml(firstItem.label)}"
									>
								</div>
							`
							: ""
						}
					</div>

					<div class="achievement-gallery-bottom">
						<div class="achievement-gallery-name">
							<span data-achievement-name>${escapeHtml(firstItem.label)}</span>
							<span class="achievement-date" data-achievement-date>${escapeHtml(firstItem.date)}</span>
						</div>
						<div class="achievement-gallery-count">
							${achievementItems.length} total
						</div>
					</div>

					<div class="achievement-gallery-list">
						${thumbsHtml}
					</div>
				</div>
			</div>
		`;
	}

	function getPlayerVerifiedEmblemId(player) {
		const raw = player?.profile?.emblem;

		if (typeof raw === "string" || typeof raw === "number") {
			return cleanValue(raw);
		}

		if (Array.isArray(raw)) {
			for (const item of raw) {
				if (typeof item === "string" || typeof item === "number") {
					const value = cleanValue(item);
					if (value) return value;
				}

				if (item && typeof item === "object") {
					const value = cleanValue(item.id || item.emblem || item.value);
					if (value) return value;
				}
			}
		}

		if (raw && typeof raw === "object") {
			return cleanValue(raw.id || raw.emblem || raw.value);
		}

		return "";
	}

	function getVerifiedEmblemDefinition(emblemId) {
		if (!emblemId) return null;

		const source = extensionsData?.badges_verified;
		if (!source || typeof source !== "object") return null;

		const direct = source[emblemId];
		if (direct?.website && typeof direct.website === "object") return direct.website;
		if (direct && typeof direct === "object") return direct;

		return null;
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


	function getListCountryText(player) {
		const name = cleanValue(player?.country?.name);
		const code = cleanValue(player?.country?.code);
		return stripMinecraftCodes(name || code || "Desconhecido");
	}

	function isPlayerOnlineForList(player) {
		return player?.status?.online === true || player?.status?.presence?.enabled === true;
	}

	function getListStatusText(player) {
		if (isPlayerOnlineForList(player)) return "Online";
		return "Offline";
	}

	function formatListSinceText(player) {
		const raw = cleanValue(player?.stats?.timestamps?.account_created_at || player?.created_at || player?.createdAt);
		if (!raw) return "Desde —";

		const date = new Date(raw);
		if (!Number.isNaN(date.getTime())) {
			return "Desde " + date.getFullYear();
		}

		const year = String(raw).match(/(19|20)\d{2}/);
		return year ? "Desde " + year[0] : "Desde —";
	}

	function buildListExtraInfoHtml(player) {
		const flagHtml = buildCountryFlagHtml(player?.country?.code);
		const countryText = escapeHtml(getListCountryText(player));
		const online = isPlayerOnlineForList(player);
		const statusText = escapeHtml(getListStatusText(player));
		const sinceText = escapeHtml(formatListSinceText(player));

		return `
			<div class="list-extra-row" aria-label="Informações rápidas do jogador">
				<span class="list-extra-pill list-country-pill" title="País">
					${flagHtml}
					<span>${countryText}</span>
				</span>
				<span class="list-extra-pill list-status-pill ${online ? 'is-online' : 'is-offline'}" title="Status">
					<span class="list-status-dot" aria-hidden="true"></span>
					<span>${statusText}</span>
				</span>
				<span class="list-extra-pill list-since-pill" title="Conta criada">
					<span class="list-extra-icon" aria-hidden="true">▣</span>
					<span>${sinceText}</span>
				</span>
			</div>
		`;
	}


	function buildListBadgesInlineHtml(player) {
		const flagHtml = buildCountryFlagHtml(player?.country?.code);
		const countryText = escapeHtml(getListCountryText(player));
		const online = isPlayerOnlineForList(player);
		const statusText = escapeHtml(getListStatusText(player));
		const clanName = escapeHtml(stripMinecraftCodes(cleanValue(player?.clan?.id)) || "No Clan");

		return `
			<div class="list-combat-badges" aria-label="País, status e clan do jogador">
				<span class="list-combat-pill list-country-pill" title="País">${flagHtml}<span>${countryText}</span></span>
				<span class="list-combat-pill list-status-pill ${online ? 'is-online' : 'is-offline'}" title="Status"><span class="list-status-dot" aria-hidden="true"></span><span>${statusText}</span></span>
				<span class="list-combat-pill list-clan-pill" title="Clan">${clanName}</span>
			</div>
		`;
	}

		function buildListTierProgressHtml(player) {
		const rankData = getCardRankData(player);
		const emblemImage = getRankImage(player);
		const levelNumber = getPlayerLevelNumber(player);
		const ranks = Array.isArray(CARD_LEVEL_RANKS) ? CARD_LEVEL_RANKS : [];
		const currentIndex = ranks.findIndex(function(rank) {
			if (!rank || typeof rank !== "object") return false;
			const minMatch = typeof rank.min === "number" ? levelNumber >= rank.min : true;
			const maxMatch = typeof rank.max === "number" ? levelNumber <= rank.max : true;
			return minMatch && maxMatch;
		});
		const nextRank = currentIndex >= 0 ? ranks[currentIndex + 1] : null;
		const hasMax = typeof rankData.max === "number";
		const rawProgress = !hasMax || rankData.max <= rankData.min
			? 100
			: ((levelNumber - rankData.min) / (rankData.max - rankData.min)) * 100;
		const safeProgress = Math.max(0, Math.min(100, rawProgress));
		const progressText = Math.round(safeProgress) + "%";
		const nextText = nextRank?.label ? `Próximo Rank: ${nextRank.label}` : "Rank máximo";

		return `
			<div
				class="list-tier-progress"
				style="
					--rank-color: ${rankData.color};
					--rank-color-2: ${rankData.color2 || rankData.color};
					--rank-glow: ${rankData.glow || rankData.color};
					--rank-banner: ${rankData.banner || "linear-gradient(135deg, color-mix(in srgb, " + (rankData.color || "#5865F2") + " 18%, rgba(255,255,255,.04)), rgba(8,12,24,.92))"};
					--rank-checker-opacity: ${typeof rankData.checkerOpacity === "number" ? rankData.checkerOpacity : 0.10};
				"
			>
				<div class="list-tier-main">
					<span class="list-tier-icon">${emblemImage ? `<img src="${escapeHtml(emblemImage)}" alt="${escapeHtml(rankData.label)}" loading="lazy" onerror="this.remove()">` : "◆"}</span>
					<span class="list-tier-name">${escapeHtml(rankData.label || "Tier")}</span>
					<div class="list-tier-bar" aria-hidden="true"><span style="width:${safeProgress}%"></span></div>
					<span class="list-tier-percent">${escapeHtml(progressText)}</span>
				</div>
				<div class="list-tier-next">${escapeHtml(nextText)}</div>
			</div>
		`;
	}


	// ===== JavaScript: Renderização dos cards e da view detalhada =====
	function createCard(player, index) {
		const color = normalizeHexColor(player?.theme?.card_embed?.card_color || "#5865F2");
		const banner = getBanner(player);
		const character = getCharacter(player);
		const playerHasBanner = hasBanner(player);
		const characterFallback = playerHasBanner ? "" : DEFAULT_PLAYER_CHARACTER;
		const displayName = stripMinecraftCodes(getDisplayName(player));
		const titleHtml = buildTitleHtml(player);
		const cardTitle = getCardTitle(player);
		const clanName = stripMinecraftCodes(cleanValue(player?.clan?.id)) || "-";
		const characterPixelClass = isProbablyPixelArt(character) ? "pixelated" : "";
		const titleSizeClass = getTitleSizeClass(player);
		const summonNo = String((Number.isFinite(index) ? index : 0) + 1).padStart(3, "0");
		const online = isPlayerOnline(player);
		const statusLabel = online ? "Online" : "Offline";

		return `
			<article
				class="card"
				data-player-id="${escapeHtml(player._id)}"
				data-summon-no="#${escapeHtml(summonNo)}"
				data-idle="true"
				style="
					--accent: ${color};
					--accent-soft: ${hexToRgba(color, 0.18)};
					--accent-mid: ${hexToRgba(color, 0.28)};
					border-color: ${hexToRgba(color, 0.36)};
				"
				aria-label="${escapeHtml(displayName)}"
				tabindex="0"
			>
				<div class="card-bg">
					<img
						src="${escapeHtml(banner)}"
						alt="${escapeHtml(displayName)}"
						loading="lazy"
						referrerpolicy="no-referrer"
						crossorigin="anonymous"
						draggable="false"
						onerror="this.onerror=null; this.src='${escapeHtml(DEFAULT_PLAYER_BANNER)}'"
					>
				</div>

				<div class="card-visual">
					<div class="character-wrap ${characterPixelClass}">
						<img
							src="${escapeHtml(character || characterFallback)}"
							alt="${escapeHtml(displayName)}"
							loading="lazy"
							referrerpolicy="no-referrer"
							crossorigin="anonymous"
							draggable="false"
							onerror="this.onerror=null; ${characterFallback ? `this.src='${escapeHtml(characterFallback)}'` : `this.style.display='none'`}"
						>
					</div>
				</div>

				<div class="card-outline" data-summon-no="#${escapeHtml(summonNo)}"></div>
				<div class="side-rail"></div>

				<div class="card-top">
					${buildLevelChipHtml(player)}
					<div class="card-chip">
						<span class="card-chip-text">${escapeHtml(clanName)}</span>
					</div>
					<span class="card-status-chip ${online ? 'is-online' : 'is-offline'}"><i></i>${escapeHtml(statusLabel)}</span>
				</div>

				<div class="card-bottom" data-summon-no="${escapeHtml(summonNo)}">
					<span class="premium-rank-no">${escapeHtml(summonNo)}</span>
					${buildUsernameLine(player, "player")}
					<h2 class="title ${titleSizeClass}">${titleHtml}</h2>
					<div class="player-title">${escapeHtml(cardTitle)}</div>
					<div class="summon-stars" aria-hidden="true"><span class="summon-stars-icons">✦ ✦ ✦ ✦ ✦</span><span class="summon-stars-id">#${escapeHtml(summonNo)}</span></div>
				</div>
			</article>
		`;
	}

	function createListCard(player) {
		const color = normalizeHexColor(player?.theme?.card_embed?.card_color || "#5865F2");
		const avatar = getAvatar(player);
		const character = getCharacter(player);
		const characterPixelClass = isProbablyPixelArt(character) ? "pixelated" : "";
		const displayName = escapeHtml(stripMinecraftCodes(getDisplayName(player)));
		const username = escapeHtml(stripMinecraftCodes(getUsername(player)));
		const cardTitle = escapeHtml(stripMinecraftCodes(getCardTitle(player)));
		const displayColor = getDisplayNameColor(player);
		const displayNameClass = displayColor.type === "gradient" ? "list-displayname gradient" : "list-displayname";
		const displayNameStyle = displayColor.type === "gradient"
			? `--display-gradient:${displayColor.value};`
			: `--display-color:${displayColor.value};`;

		return `
			<article
				class="card list-card-v3"
				data-player-id="${escapeHtml(player._id)}"
				data-list-card="true"
				data-idle="false"
				style="
					--accent: ${color};
					--accent-soft: ${hexToRgba(color, 0.12)};
					--accent-mid: ${hexToRgba(color, 0.18)};
					--list-accent-soft: ${hexToRgba(color, 0.10)};
					--list-accent-fade: ${hexToRgba(color, 0.07)};
					--list-accent-inner: ${hexToRgba(color, 0.05)};
					--list-accent-glow: ${hexToRgba(color, 0.09)};
					--list-accent-glow-hover: ${hexToRgba(color, 0.14)};
					--list-accent-border: ${hexToRgba(color, 0.34)};
					--list-accent-border-hover: ${hexToRgba(color, 0.48)};
					border-color: ${hexToRgba(color, 0.30)};
				"
				aria-label="${displayName}"
				tabindex="0"
			>
				<div class="list-svg-bg" aria-hidden="true"></div>
				<div class="list-circuit-bg" aria-hidden="true"></div>
				<svg class="list-card-frame" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 150" preserveAspectRatio="none" fill="none" aria-hidden="true">
					<path d="M24 1H372L402 11H880L910 1H1176Q1199 1 1199 24V126Q1199 149 1176 149H24Q1 149 1 126V24Q1 1 24 1Z" stroke="currentColor" stroke-opacity=".54" stroke-width="2"/>
					<path d="M40 28H210L230 18H370M828 132H1010L1030 122H1160" stroke="currentColor" stroke-opacity=".44" stroke-width="2"/>
					<path d="M1015 33H1128V117H1015" stroke="currentColor" stroke-opacity=".18" stroke-width="1.5"/>
					<path d="M1044 75H1090M1090 75L1106 60H1135M1090 75L1106 91H1135" stroke="currentColor" stroke-opacity=".34" stroke-width="2"/>
					<circle cx="1146" cy="60" r="4" fill="currentColor" fill-opacity=".54"/>
					<circle cx="1146" cy="91" r="4" fill="currentColor" fill-opacity=".34"/>
				</svg>

				<div class="list-group1">
					<div class="list-avatar">
						<img
							src="${escapeHtml(avatar)}"
							alt="Avatar de ${username}"
							loading="lazy"
							referrerpolicy="no-referrer"
							crossorigin="anonymous"
							draggable="false"
							onerror="this.onerror=null; this.src='${escapeHtml(DEFAULT_PLAYER_AVATAR)}'"
						>
						<svg class="avatar-frame-svg" viewBox="0 0 100 100" fill="none" aria-hidden="true">
							<rect x="6" y="6" width="88" height="88" rx="16" stroke="currentColor" stroke-opacity=".62" stroke-width="2"/>
							<path d="M6 34V20C6 12.3 12.3 6 20 6h14M66 6h14c7.7 0 14 6.3 14 14v14M94 66v14c0 7.7-6.3 14-14 14H66M34 94H20C12.3 94 6 87.7 6 80V66" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
						</svg>
					</div>

					<div class="list-info">
						<div class="list-name-inline-row">
							<div class="${displayNameClass}" style="${displayNameStyle}">
								<span class="list-displayname-text">${displayName}</span>
							</div>
							<span class="list-username list-username-inline">( @${username} )</span>
							${buildVerifiedEmblemHtml(player)}
						</div>

						<div class="list-title list-title-box">${cardTitle}</div>
						${buildListBadgesInlineHtml(player)}
					</div>
				</div>

				<div class="list-group2">
					<div class="list-character ${character ? characterPixelClass : 'is-empty'}">
						${character ? `
							<img
								class="list-character-main"
								src="${escapeHtml(character)}"
								alt="Character de ${displayName}"
								loading="lazy"
								referrerpolicy="no-referrer"
								crossorigin="anonymous"
								draggable="false"
								onerror="this.onerror=null; this.remove(); this.parentElement.classList.add('is-empty')"
							>
						` : ""}
					</div>
				</div>
			</article>
		`;
	}

	function createDetailView(player) {
		const color = normalizeHexColor(player?.theme?.card_embed?.card_color || "#5865F2");
		const avatar = getAvatar(player);
		const banner = getBanner(player);
		const character = getCharacter(player);
		const playerHasBanner = hasBanner(player);
		const characterFallback = playerHasBanner ? "" : DEFAULT_PLAYER_CHARACTER;
		const displayName = stripMinecraftCodes(getDisplayName(player));
		const username = getUsername(player);
		const titleHtml = buildTitleHtml(player);
		const cardTitle = getCardTitle(player);
		const rankName = stripMinecraftCodes(cleanValue(player?.badges?.rank)) || "-";
		const clanName = stripMinecraftCodes(cleanValue(player?.clan?.id)) || "-";
		const desc = cleanValue(player?.profile?.bio) || "Sem descrição.";
		const country = cleanValue(player?.country?.code) || "-";
		const characterPixelClass = isProbablyPixelArt(character) ? "pixelated" : "";

		return `
			<div class="detail-stage">
				<div class="detail-frame">

					<div class="detail-shell">
						<div class="detail-left-column" style="--accent: ${color};">
						<article
							class="detail-card"
							aria-label="${escapeHtml(displayName)}"
							style="--accent: ${color};"
						>
							<div class="detail-top">
								${buildLevelChipHtml(player)}
								<div class="card-chip">
									<span class="card-chip-text">${escapeHtml(clanName)}</span>
								</div>
							</div>

							<div class="side-rail"></div>

							<div class="detail-bg">
								<img
									src="${escapeHtml(banner)}"
									alt="${escapeHtml(displayName)}"
									loading="eager"
									referrerpolicy="no-referrer"
									crossorigin="anonymous"
									draggable="false"
									onerror="this.onerror=null; this.src='${escapeHtml(DEFAULT_PLAYER_BANNER)}'"
								>
							</div>

							<div class="detail-character-wrap ${characterPixelClass}">
								<img
									src="${escapeHtml(character || characterFallback)}"
									alt="${escapeHtml(displayName)}"
									loading="eager"
									referrerpolicy="no-referrer"
									crossorigin="anonymous"
									draggable="false"
									onerror="this.onerror=null; ${characterFallback ? `this.src='${escapeHtml(characterFallback)}'` : `this.style.display='none'`}"
								>
							</div>

							<div class="detail-bottom">
								${buildUsernameLine(player, "detail")}
								<h2 class="detail-title">${titleHtml}</h2>
								<div class="detail-subtitle">${escapeHtml(cardTitle)}</div>
							</div>
						</article>

						<section class="detail-outside-description" aria-label="Descrição do jogador">
							<h3 class="info-title">Descrição</h3>
							<div class="info-value">${minecraftToHtml(desc)}</div>
						</section>
						</div>

						<div class="detail-info">
							<section class="info-panel">
								<div class="info-header">
									<div class="info-profile-avatar">
										<img
											src="${escapeHtml(avatar)}"
											alt="Avatar de ${escapeHtml(displayName)}"
											loading="eager"
											referrerpolicy="no-referrer"
											crossorigin="anonymous"
											onerror="this.onerror=null; this.src='${escapeHtml(DEFAULT_PLAYER_AVATAR)}'"
										>
									</div>
									<h3 class="info-title">Informações</h3>
								</div>

								<div class="info-grid">
									<div class="info-item">
										<span class="info-label">Username</span>
										<div class="info-value">${escapeHtml(username)}</div>
									</div>

									<div class="info-item">
										<span class="info-label">País</span>
										<div class="info-value">${buildCountryFlagHtml(country)} ${escapeHtml(country)}</div>
									</div>

									<div class="info-item info-item-level">
										<span class="info-label">Tier</span>
										${buildLevelInfoEmblemHtml(player)}
										${buildRankTitleMarkHtml(player, "detail-level-title-overlay")}
									</div>

									<div class="info-item">
										<span class="info-label">Clan</span>
										<div class="info-value">${escapeHtml(clanName)}</div>
									</div>

									<div class="info-item">
										<span class="info-label">Title</span>
										<div class="info-value">${escapeHtml(cardTitle)}</div>
									</div>
								</div>
							</section>

							<section class="info-panel">
								<div class="info-header">
									<div class="info-profile-avatar">
										<img
											src="https://cdn.jsdelivr.net/gh/Kazimuhwari-br/Velarion-Lumen-Bedrock-Server@main/assests/craftpix-net-737072-free-cyberpunk-artifact-game-512x512-icons/27.png"
											alt="Distintivos da Imagem"
											loading="eager"
											referrerpolicy="no-referrer"
											crossorigin="anonymous"
										>
									</div>
									<h3 class="info-title">Badges</h3>
								</div>

								<div class="badges-grid">
									<div class="badges-item info-item-rank">
										<span class="info-label">Role</span>
										${buildRoleInfoEmblemHtml(player)}
									</div>

									<div class="badges-item info-item-rank">
										<span class="info-label">Rank</span>
										${buildRankInfoEmblemHtml(player)}
									</div>

									<div class="badges-item badges-item-achievements">
										<span class="info-label">Achievements</span>
										${buildAchievementsGalleryHtml(player)}
									</div>
								</div>
							</section>

						</div>
					</div>
				</div>
			</div>
		`;
	}


	// ===== JavaScript: Render principal / navegação / interação =====
	function updateViewToggleLabel() {
		const toggleBtn = document.getElementById("toggleView");
		if (!toggleBtn) return;
		toggleBtn.textContent = "Rankings";
	}

	function render(list) {
		const players = document.getElementById("players");
		const paginationPanel = document.getElementById("paginationPanel");
		const paginationInfo = document.getElementById("paginationInfo");
		const paginationActions = document.getElementById("paginationActions");
		if (!players) return;

		players.classList.toggle("list-mode", isListMode);
		updateViewToggleLabel();

		const totalItems = Array.isArray(list) ? list.length : 0;
		const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
		currentPage = Math.min(Math.max(1, currentPage), totalPages);

		if (!totalItems) {
			players.innerHTML = "<div class=\"empty\">Nenhum jogador encontrado.</div>";
			if (paginationPanel) paginationPanel.hidden = true;
			return;
		}

		const startIndex = (currentPage - 1) * itemsPerPage;
		const pageItems = list.slice(startIndex, startIndex + itemsPerPage);

		players.innerHTML = pageItems.map(function(player, index) {
			return isListMode ? createListCard(player) : createCard(player, startIndex + index);
		}).join("");

		if (paginationPanel) paginationPanel.hidden = totalItems <= itemsPerPage && totalPages <= 1;
		if (paginationInfo) {
			const from = startIndex + 1;
			const to = Math.min(startIndex + pageItems.length, totalItems);
			paginationInfo.textContent = "Mostrando " + from + "-" + to + " de " + totalItems + " jogadores";
		}
		if (paginationActions) renderPaginationActions(totalPages);

		if (isListMode) {
			attachListGlow(players.querySelectorAll(".card"));
		} else {
			attach3DEffect(players.querySelectorAll(".card"));
		}
	}


	function getRankingNumberValue(player, paths, fallback) {
		for (const path of paths) {
			let value = player;
			for (const key of path.split(".")) value = value && value[key];
			if (Array.isArray(value)) value = value[0];
			if (typeof value === "number" && Number.isFinite(value)) return value;
			if (typeof value === "string") {
				const parsed = Number(value.replace(/[^0-9.-]/g, ""));
				if (Number.isFinite(parsed)) return parsed;
			}
		}
		return fallback;
	}

	function getProgressionNumber(player, key, fallback) {
		const value = player?.stats?.progression?.[key];
		if (typeof value === "number" && Number.isFinite(value)) return value;
		if (typeof value === "string") {
			const parsed = Number(value.replace(/[^0-9.-]/g, ""));
			if (Number.isFinite(parsed)) return parsed;
		}
		return fallback;
	}

	function getPlayerXP(player) {
		return getProgressionNumber(player, "xp", 0);
	}

	function getPlayerXPToNext(player) {
		return getProgressionNumber(player, "xp_to_next", 0);
	}

	function getPlayerGlobalPoints(player) {
		return getProgressionNumber(player, "pts", 0);
	}

	function getRankingScore(player) {
		// Ranking Global usa a pontuação real do Firebase:
		// profilePlayers[id].stats.progression.pts
		return Math.max(0, Math.round(getPlayerGlobalPoints(player)));
	}

	function getXPPercent(player) {
		const xp = getPlayerXP(player);
		const next = getPlayerXPToNext(player);
		if (!next || next <= 0) return 0;
		return Math.max(0, Math.min(100, (xp / next) * 100));
	}

	function formatNumberBR(value) {
		const n = Number(value) || 0;
		return n.toLocaleString("pt-BR");
	}

	function formatRankingPoints(value) {
		return formatNumberBR(value) + " pts";
	}

	function formatXPText(player) {
		const xp = getPlayerXP(player);
		const next = getPlayerXPToNext(player);
		return next > 0 ? `${formatNumberBR(xp)} / ${formatNumberBR(next)} XP` : `${formatNumberBR(xp)} XP`;
	}

	function buildRankingPlayerCard(player, index) {
		const color = normalizeHexColor(player?.theme?.card_embed?.card_color || "#8b6cff");
		const avatar = getAvatar(player);
		const banner = getBanner(player);
		const character = getCharacter(player);
		const displayName = escapeHtml(stripMinecraftCodes(getDisplayName(player)) || "Jogador");
		const username = escapeHtml(stripMinecraftCodes(getUsername(player)) || displayName);
		const title = escapeHtml(stripMinecraftCodes(getCardTitle(player)) || "Perfil sincronizado");
		const level = getPlayerLevelNumber(player) || 0;
		const score = getRankingScore(player);
		const rankNo = String(index + 1).padStart(2, "0");
		const progress = Math.max(0, Math.min(100, getXPPercent(player)));
		const xpText = escapeHtml(formatXPText(player));
		const role = escapeHtml(getPrimaryRoleLabel(player, "Global"));
		return `
			<article class="vl-rank-row" data-player-id="${escapeHtml(player._id)}" tabindex="0" style="--rank-accent:${color};--rank-accent-soft:${hexToRgba(color,.18)};--rank-accent-line:${hexToRgba(color,.42)}">
				<div class="vl-rank-pos">${rankNo}</div>
				<div class="vl-rank-user">
					<img class="vl-rank-avatar" src="${escapeHtml(avatar)}" alt="Avatar de ${username}" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.onerror=null; this.src='${escapeHtml(DEFAULT_PLAYER_AVATAR)}'">
					<div class="vl-rank-namebox"><strong>${displayName}${buildVerifiedEmblemHtml(player)}</strong><span>@${username}</span></div>
				</div>
				<div class="vl-rank-level"><b>${level || "--"}</b><span>Lv.</span></div>
				<div class="vl-rank-progress"><i><em style="width:${progress}%"></em></i><span>${xpText}</span></div>
				<div class="vl-rank-role">${role}</div>
				<div class="vl-rank-score">${formatRankingPoints(score)}</div>
				<div class="vl-rank-medal">✦</div>
			</article>
		`;
	}

	function renderRankingsPanel() {
		const rankingList = document.getElementById("rankingsList");
		if (!rankingList || !Array.isArray(playersData)) return;

		const ranked = playersData.slice().sort(function(a, b) {
			return getRankingScore(b) - getRankingScore(a);
		});
		if (!ranked.length) {
			rankingList.innerHTML = '<div class="empty">Nenhum jogador carregado.</div>';
			return;
		}

		const top = ranked[0];
		const top2 = ranked[1] || top;
		const top3 = ranked[2] || top;
		const topColor = normalizeHexColor(top?.theme?.card_embed?.card_color || "#8b6cff");
		const topAvatar = getAvatar(top);
		const topBanner = getBanner(top);
		const topCharacter = getCharacter(top);
		const topName = escapeHtml(stripMinecraftCodes(getDisplayName(top)) || "Jogador");
		const topUser = escapeHtml(stripMinecraftCodes(getUsername(top)) || topName);
		const topTitle = escapeHtml(stripMinecraftCodes(getCardTitle(top)) || "Melhor pontuação global");
		const topLevel = getPlayerLevelNumber(top) || 0;
		const topScore = getRankingScore(top);
		const topXPText = escapeHtml(formatXPText(top));
		const topRole = escapeHtml(getPrimaryRoleLabel(top, "Administrador"));
		const topOnline = isPlayerOnline(top);
		const topOnlineText = topOnline ? "Online" : "Offline";
		const rows = ranked.slice(0, 10).map(buildRankingPlayerCard).join("");

		rankingList.className = "vl-rankings-experience";
		rankingList.innerHTML = `
			<div class="vl-rank-hero" style="--rank-accent:${topColor};--rank-accent-soft:${hexToRgba(topColor,.18)};--rank-accent-line:${hexToRgba(topColor,.42)}">
				<section class="vl-rank-feature" data-player-id="${escapeHtml(top._id)}" tabindex="0">
					<img class="vl-rank-feature-bg" src="${escapeHtml(topBanner)}" alt="Banner de ${topName}" loading="eager" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.onerror=null; this.src='${escapeHtml(DEFAULT_PLAYER_BANNER)}'">
					${topCharacter ? `<img class="vl-rank-feature-character" src="${escapeHtml(topCharacter)}" alt="Character de ${topName}" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.remove()">` : ""}
					<div class="vl-rank-feature-avatar"><img src="${escapeHtml(topAvatar)}" alt="Avatar de ${topUser}" loading="lazy" onerror="this.onerror=null; this.src='${escapeHtml(DEFAULT_PLAYER_AVATAR)}'"></div>
					<div class="vl-rank-feature-name"><span>#01</span><strong>${topName}${buildVerifiedEmblemHtml(top)}</strong></div>
				</section>

				<section class="vl-rank-profile" data-player-id="${escapeHtml(top._id)}" tabindex="0">
					<span class="vl-rank-kicker">Perfil Destaque</span>
					<div class="vl-rank-profile-title"><h3>${topName}</h3><span>@${topUser}</span><b class="${topOnline ? 'is-online' : 'is-offline'}">${topOnlineText}</b></div>
					<p>${topTitle}</p>
					<div class="vl-rank-tags"><span>${topRole}</span><span>Global</span><span>VLS</span></div>
					<div class="vl-rank-mini-stats"><div><small>Nível</small><strong>${topLevel || "--"}</strong></div><div><small>XP</small><strong>${topXPText}</strong></div><div><small>Rank</small><strong>#01</strong></div></div>
					<div class="vl-rank-total"><small>Pontuação Global</small><strong>${formatRankingPoints(topScore)}</strong></div>
				</section>

				<section class="vl-rank-trophy">
					<div class="vl-rank-trophy-head"><span>Top Global</span><select aria-label="Categoria do ranking"><option>Global</option><option>Nível</option><option>XP</option></select></div>
					<div class="vl-rank-trophy-icon">✦</div>
					<strong>${formatRankingPoints(topScore)}</strong>
					<span>Melhor pontuação global</span>
					<button type="button">Ver Ranking Completo</button>
				</section>
			</div>

			<section class="vl-rank-board">
				<div class="vl-rank-board-head"><span>Ranking Geral</span><div><button class="is-active" type="button">Global</button><button type="button">Nível</button><button type="button">XP</button><button type="button">Conquistas</button></div></div>
				<div class="vl-rank-rows">${rows}</div>
				<button class="vl-rank-more" type="button">Carregar mais jogadores</button>
			</section>
		`;
	}

	function renderPaginationActions(totalPages) {
		const paginationActions = document.getElementById("paginationActions");
		if (!paginationActions) return;

		paginationActions.innerHTML = "";

		const prevBtn = createPageButton("‹", currentPage - 1, currentPage === 1, "Página anterior");
		paginationActions.appendChild(prevBtn);

		getVisiblePageNumbers(totalPages).forEach(function(page) {
			if (page === "...") {
				const dots = createPageButton("…", currentPage, true, "Mais páginas");
				dots.classList.add("page-ellipsis");
				paginationActions.appendChild(dots);
				return;
			}

			const pageBtn = createPageButton(String(page), page, false, "Ir para página " + page);
			pageBtn.classList.toggle("is-active", page === currentPage);
			pageBtn.setAttribute("aria-current", page === currentPage ? "page" : "false");
			paginationActions.appendChild(pageBtn);
		});

		const nextBtn = createPageButton("›", currentPage + 1, currentPage === totalPages, "Próxima página");
		paginationActions.appendChild(nextBtn);
	}

	function getVisiblePageNumbers(totalPages) {
		if (totalPages <= 7) {
			return Array.from({ length: totalPages }, function(_, index) { return index + 1; });
		}

		const pages = [1];
		const start = Math.max(2, currentPage - 1);
		const end = Math.min(totalPages - 1, currentPage + 1);

		if (start > 2) pages.push("...");
		for (let page = start; page <= end; page += 1) pages.push(page);
		if (end < totalPages - 1) pages.push("...");
		pages.push(totalPages);

		return pages;
	}

	function createPageButton(label, page, disabled, ariaLabel) {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "page-btn";
		btn.textContent = label;
		btn.disabled = !!disabled;
		btn.dataset.page = String(page);
		btn.setAttribute("aria-label", ariaLabel || label);
		return btn;
	}

	function attachListGlow(cards) {
		cards.forEach(function(cardEl) {
			cardEl.style.setProperty("--lx", "50%");
			cardEl.style.setProperty("--ly", "50%");

			cardEl.addEventListener("pointermove", function(e) {
				if (!isListMode) return;

				const rect = cardEl.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;

				cardEl.style.setProperty("--lx", x + "px");
				cardEl.style.setProperty("--ly", y + "px");
			});

			cardEl.addEventListener("pointerenter", function() {
				if (!isListMode) return;
				cardEl.classList.add("is-touching");
			});

			cardEl.addEventListener("pointerleave", function() {
				if (!isListMode) return;
				cardEl.classList.remove("is-touching");
				cardEl.style.setProperty("--lx", "50%");
				cardEl.style.setProperty("--ly", "50%");
			});

			cardEl.addEventListener("touchstart", function(ev) {
				if (!isListMode) return;

				const touch = ev.touches && ev.touches[0];
				if (!touch) return;

				const rect = cardEl.getBoundingClientRect();
				cardEl.style.setProperty("--lx", (touch.clientX - rect.left) + "px");
				cardEl.style.setProperty("--ly", (touch.clientY - rect.top) + "px");
				cardEl.classList.add("is-touching");
			}, { passive: true });

			cardEl.addEventListener("touchend", function() {
				if (!isListMode) return;
				cardEl.classList.remove("is-touching");
				cardEl.style.setProperty("--lx", "50%");
				cardEl.style.setProperty("--ly", "50%");
			});
		});
	}

	function showDetailInstant(player) {
		const gridView = document.getElementById("gridView");
		const detailView = document.getElementById("detailView");
		if (!gridView || !detailView) return;

		activePlayerId = player._id;
		lockBodyScroll();

		detailView.innerHTML = createDetailView(player);
		detailView.classList.add("active");
		detailView.classList.remove("ready");
		detailView.scrollTop = 0;

		attach3DEffect(detailView.querySelectorAll(".detail-card"));
		setupAchievementGalleries(detailView);

		gridView.classList.add("hidden");

		requestAnimationFrame(function() {
			detailView.classList.add("ready");
		});
	}

	async function openDetail(playerId, sourceCard) {
		if (!playerId || isTransitionRunning) return;

		// Correção: o zoom/densidade visual de 67% quebrava a animação de abertura
		// que clonava o card e calculava coordenadas absolutas. Mantém a animação 3D
		// de hover dos Cards, mas abre o perfil de forma direta e estável.
		window.location.href = makeProfileUrl(playerId);
	}

	function closeDetail() {
		animateCloseDetail();
	}

	function lockBodyScroll() {
		pageScrollBeforeDetail = window.scrollY || window.pageYOffset || 0;

		document.documentElement.style.overflow = "hidden";
		document.body.dataset.scrollLocked = "true";
		document.body.style.position = "fixed";
		document.body.style.top = "-" + pageScrollBeforeDetail + "px";
		document.body.style.left = "0";
		document.body.style.right = "0";
		document.body.style.width = "100%";
		document.body.style.overflow = "hidden";
	}

	function unlockBodyScroll() {
		const top = document.body.style.top;

		document.documentElement.style.overflow = "";
		document.body.dataset.scrollLocked = "false";
		document.body.style.position = "";
		document.body.style.top = "";
		document.body.style.left = "";
		document.body.style.right = "";
		document.body.style.width = "";
		document.body.style.overflow = "";

		const restoreY = top ? Math.abs(parseInt(top, 10)) : pageScrollBeforeDetail;
		window.scrollTo({ top: restoreY || 0, behavior: "auto" });
	}


	async function animateOpenDetail(player, sourceCard, redirectUrl) {
		if (isTransitionRunning) return;
		isTransitionRunning = true;

		const gridView = document.getElementById("gridView");
		const detailView = document.getElementById("detailView");
		const players = document.getElementById("players");
		const fade = ensureScreenFade();

		if (!gridView || !detailView || !players || !sourceCard) {
			isTransitionRunning = false;
			return;
		}

		try {
			activePlayerId = player._id;

			const allCards = Array.from(players.querySelectorAll(".card[data-player-id]"));
			const sourceRect = getRectRelativeToViewport(sourceCard);
			const accentColor = normalizeHexColor(player?.theme?.card_embed?.card_color || "#5865F2");
			const transitionFrontCard = buildTransitionFrontCard(sourceCard);

			players.classList.add("transitioning");

			const layer = createTransitionLayer();
			const clone = document.createElement("div");
			const bannerCover = getBanner(player);

			clone.className = "transition-clone";
			clone.style.setProperty("--accent", accentColor);
			clone.style.setProperty("--pixel", hexToRgba(accentColor, 0.16));
			clone.style.setProperty("--pixel-strong", hexToRgba(accentColor, 0.42));
			clone.style.setProperty("--pixel-glow", hexToRgba(accentColor, 0.26));
			clone.style.setProperty("--back-cover", "url('" + bannerCover.replace(/'/g, "\'") + "')");

			clone.innerHTML = `
				<div class="transition-3d">
					<div class="transition-face front"></div>
					<div class="transition-face back"><div class="back-art"></div></div>
					<div class="transition-spine"></div>
				</div>
			`;

			const frontFace = clone.querySelector(".transition-face.front");
			if (frontFace && transitionFrontCard) {
				frontFace.appendChild(transitionFrontCard);
			}

			layer.appendChild(clone);
			setCloneBox(clone, sourceRect);
			makeComets(clone, accentColor);

			allCards.forEach(function(card) {
				if (card === sourceCard) {
					reset3DCard(card);
					card.classList.add("card-selected-source");
					card.style.visibility = "hidden";
				} else {
					card.classList.add("card-faded");
				}
			});

			await wait(70);

			clone.style.animation = "rareSpinIn 1.45s cubic-bezier(.16,1,.3,1) forwards";
			await wait(430);

			const nearRect = {
				left: sourceRect.left + Math.min(28, sourceRect.width * 0.12),
				top: sourceRect.top - Math.min(18, sourceRect.height * 0.05),
				width: sourceRect.width * 1.02,
				height: sourceRect.height * 1.02
			};

			fade.classList.add("active");
			await Promise.all([
				animateElementTo(clone, sourceRect, nearRect, 280),
				wait(280)
			]);
			await wait(80);

			if (redirectUrl) {
				clone.classList.add("is-opening-profile");
				await wait(180);
				window.location.href = redirectUrl;
				return;
			}

			lockBodyScroll();

			detailView.innerHTML = createDetailView(player);
			detailView.classList.add("active");
			detailView.classList.remove("ready");
			detailView.scrollTop = 0;

			attach3DEffect(detailView.querySelectorAll(".detail-card"));
			setupAchievementGalleries(detailView);

			gridView.classList.add("hidden");

			await wait(40);

			detailView.classList.add("ready");
			detailView.scrollTop = 0;

			players.classList.remove("transitioning");
			allCards.forEach(function(card) {
				card.classList.remove("card-faded", "card-selected-source");
				card.style.visibility = "";
			});

			layer.remove();

			await wait(120);

			fade.classList.remove("active");
			await wait(260);
		} catch (error) {
			console.error("[animateOpenDetail]", error);

			const existingLayer = document.querySelector(".transition-layer");
			if (existingLayer) existingLayer.remove();

			document.getElementById("detailView").classList.remove("active", "ready");
			document.getElementById("detailView").innerHTML = "";

			document.getElementById("gridView").classList.remove("hidden");
			document.getElementById("players").classList.remove("transitioning");

			Array.from(document.querySelectorAll(".card.card-faded, .card.card-selected-source")).forEach(function(card) {
				card.classList.remove("card-faded", "card-selected-source");
			});

			fade.classList.remove("active");
			unlockBodyScroll();
			activePlayerId = null;
		}

		isTransitionRunning = false;
	}

	async function animateCloseDetail() {
		if (isTransitionRunning) return;
		isTransitionRunning = true;

		const fade = ensureScreenFade();
		const gridView = document.getElementById("gridView");
		const detailView = document.getElementById("detailView");

		try {
			fade.classList.add("active");
			await wait(260);

			detailView.classList.remove("ready", "active");
			detailView.innerHTML = "";

			gridView.classList.remove("hidden");
			unlockBodyScroll();
			activePlayerId = null;

			await wait(80);

			fade.classList.remove("active");
			await wait(200);
		} catch (e) {
			console.error("[animateCloseDetail]", e);

			detailView.classList.remove("ready", "active");
			detailView.innerHTML = "";
			gridView.classList.remove("hidden");
			fade.classList.remove("active");
			unlockBodyScroll();
			activePlayerId = null;
		}

		isTransitionRunning = false;
	}

	function applySearch(query) {
		const q = stripMinecraftCodes(query).toLowerCase().trim();

		filteredPlayers = playersData.filter(function(p) {
			const text = [
				stripMinecraftCodes(p?.profile?.display_nickname),
				stripMinecraftCodes(p?.profile?.display_username),
				stripMinecraftCodes(p?.profile?.bio),
				stripMinecraftCodes(p?.badges?.rank),
				stripMinecraftCodes(p?.clan?.id),
				stripMinecraftCodes(p?.badges?.role),
				stripMinecraftCodes(p?.country?.code),
				stripMinecraftCodes(p?.theme?.color_name_id),
				stripMinecraftCodes(p?.profile?.title)
			].join(" ").toLowerCase();

			return text.includes(q);
		});

		if (activePlayerId) {
			const stillExists = filteredPlayers.some(function(p) {
				return p._id === activePlayerId;
			});

			if (!stillExists) closeDetail();
		}

		currentPage = 1;
		render(filteredPlayers);
	}

	function debounce(fn, waitTime) {
		let timeout = null;
		return function() {
			const args = arguments;
			clearTimeout(timeout);
			timeout = setTimeout(function() {
				fn.apply(null, args);
			}, waitTime || 120);
		};
	}

	function reset3DCard(card) {
		if (card && card.closest && card.closest("#players.list-mode")) return;
		card.style.setProperty("--rx", "0deg");
		card.style.setProperty("--ry", "0deg");
		card.style.setProperty("--mx", "50%");
		card.style.setProperty("--my", "50%");
		card.style.setProperty("--bgx", "0px");
		card.style.setProperty("--bgy", "0px");
		card.style.setProperty("--charx", "0px");
		card.style.setProperty("--chary", "0px");
		card.style.setProperty("--charscale", card.classList.contains("detail-card") ? "1.15" : "1.02");
		card.style.setProperty("--lift", "0px");
		card.dataset.idle = "true";
	}

	function update3DCard(card, clientX, clientY) {
		if (!card) return;
		if (card.closest && card.closest("#players.list-mode")) return;

		const rect = card.getBoundingClientRect();
		if (!rect.width || !rect.height) return;

		const px = (clientX - rect.left) / rect.width;
		const py = (clientY - rect.top) / rect.height;
		const clampX = Math.max(0, Math.min(1, px));
		const clampY = Math.max(0, Math.min(1, py));
		const isDetail = card.classList.contains("detail-card");

		const rotateY = (clampX - 0.5) * (isDetail ? 10 : 8);
		const rotateX = (0.5 - clampY) * (isDetail ? 9 : 7);

		const bgX = (clampX - 0.5) * (isDetail ? -10 : -8);
		const bgY = (clampY - 0.5) * (isDetail ? -8 : -7);

		const charX = (clampX - 0.5) * (isDetail ? -12 : -10);
		const charY = (clampY - 0.5) * (isDetail ? -6 : -5);

		card.style.setProperty("--rx", rotateX.toFixed(2) + "deg");
		card.style.setProperty("--ry", rotateY.toFixed(2) + "deg");
		card.style.setProperty("--mx", (clampX * 100).toFixed(2) + "%");
		card.style.setProperty("--my", (clampY * 100).toFixed(2) + "%");
		card.style.setProperty("--bgx", bgX.toFixed(2) + "px");
		card.style.setProperty("--bgy", bgY.toFixed(2) + "px");
		card.style.setProperty("--charx", charX.toFixed(2) + "px");
		card.style.setProperty("--chary", charY.toFixed(2) + "px");
		card.style.setProperty("--charscale", isDetail ? "1.14" : "1.045");
		card.style.setProperty("--lift", "0px");
		card.dataset.idle = "false";
	}

	function attach3DEffect(cards) {
		(cards || []).forEach(function(card) {
			if (card && card.closest && card.closest("#players.list-mode")) return;
			if (card.dataset.effectBound === "true") return;
			card.dataset.effectBound = "true";
			reset3DCard(card);

			let hovering = false;
			let raf = 0;
			let lastX = 0;
			let lastY = 0;

			function requestUpdate(x, y) {
				lastX = x;
				lastY = y;
				if (raf) return;
				raf = requestAnimationFrame(function() {
					raf = 0;
					if (!hovering) return;
					update3DCard(card, lastX, lastY);
				});
			}

			card.addEventListener("pointerenter", function(event) {
				hovering = true;
				card.classList.add("is-touching");
				requestUpdate(event.clientX, event.clientY);
			});

			card.addEventListener("pointermove", function(event) {
				hovering = true;
				card.classList.add("is-touching");
				requestUpdate(event.clientX, event.clientY);
			});

			function leaveCard() {
				hovering = false;
				if (raf) {
					cancelAnimationFrame(raf);
					raf = 0;
				}
				card.classList.remove("is-touching");
				reset3DCard(card);
			}

			card.addEventListener("pointerleave", leaveCard);
			card.addEventListener("pointercancel", leaveCard);

			card.addEventListener("touchstart", function(event) {
				if (!event.touches || !event.touches[0]) return;
				const touch = event.touches[0];
				hovering = true;
				card.classList.add("is-touching");
				requestUpdate(touch.clientX, touch.clientY);
			}, { passive: true });

			card.addEventListener("touchmove", function(event) {
				if (!event.touches || !event.touches[0]) return;
				const touch = event.touches[0];
				requestUpdate(touch.clientX, touch.clientY);
			}, { passive: true });

			card.addEventListener("touchend", function() {
				setTimeout(leaveCard, 90);
			}, { passive: true });
		});
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
			const thumbs = Array.from(gallery.querySelectorAll("[data-achievement-thumb]"));

			if (!main || !name || !id || !date || !thumbs.length) {
				return;
			}

			function renderMainImage(image, label) {
				if (image) {
					main.classList.remove("is-empty");
					main.innerHTML = `
						<img
							src="${escapeHtml(image)}"
							alt="${escapeHtml(label)}"
							loading="lazy"
							onerror="this.parentElement.classList.add('is-empty'); this.parentElement.textContent='Sem imagem'; this.remove()"
						>
					`;
				} else {
					main.classList.add("is-empty");
					main.textContent = "Sem imagem";
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

				const image = button.dataset.image || "";
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
				id.textContent = achievementId;
				date.textContent = achievementDate;

				renderMainImage(image, label);
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


	// ===== JavaScript: Carregamento dos dados =====
	async function load() {
		const playersEl = document.getElementById("players");

		try {
			const [playersRes, extensionsRes] = await Promise.all([
				fetch(DATA_URL, { cache: "no-store" }),
				fetch(EXTENSIONS_DATA_URL, { cache: "no-store" })
			]);

			if (!playersRes.ok) {
				throw new Error("Players HTTP " + playersRes.status + " - " + playersRes.statusText);
			}

			if (!extensionsRes.ok) {
				throw new Error("Extensions HTTP " + extensionsRes.status + " - " + extensionsRes.statusText);
			}

			const playersJson = await playersRes.json();
			const extensionsJson = await extensionsRes.json();

			console.log("[Firebase Players OK]", playersJson);
			console.log("[Firebase Extensions OK]", extensionsJson);

			extensionsData = extensionsJson || {};
			applyExtensionDataConfig();
			playersData = normalize(playersJson);
			filteredPlayers = playersData.slice();

			render(filteredPlayers);
			renderRankingsPanel();
			hideSummonBoot();

		} catch (e) {
			console.error("[Firebase erro]", e);
			if (playersEl) {
				playersEl.innerHTML = `<div class="empty">Erro ao carregar Firebase: ${String(e.message || e)}</div>`;
			}
			hideSummonBoot();
		}
	}


	// ===== JavaScript: Eventos da interface =====
	document.getElementById("search").addEventListener("input", debounce(function(e) {
		applySearch(e.target.value);
	}, 100));

	document.getElementById("toggleView").addEventListener("click", function() {
		if (isTransitionRunning || activePlayerId) return;
		/* A antiga Lista foi transferida para o painel Rankings.
		   Mantém Cards 3D como visual principal e preserva animação. */
		isListMode = false;
		renderRankingsPanel();
		var rankingTab = document.querySelector('[data-tab="rankings"]');
		if (rankingTab) rankingTab.click();
	});


	document.getElementById("paginationActions").addEventListener("click", function(event) {
		const btn = event.target.closest(".page-btn[data-page]");
		if (!btn || btn.disabled || isTransitionRunning || activePlayerId) return;

		const nextPage = Number(btn.dataset.page);
		if (!Number.isFinite(nextPage) || nextPage === currentPage) return;

		currentPage = nextPage;
		render(filteredPlayers);
		document.getElementById("gridView")?.scrollIntoView({ behavior: "smooth", block: "start" });
	});

	document.getElementById("pageSizeSelect").addEventListener("change", function(event) {
		const selectedPageSize = Number(event.target.value);
		itemsPerPage = [10, 15, 20].includes(selectedPageSize) ? selectedPageSize : 10;
		currentPage = 1;
		render(filteredPlayers);
	});

	document.getElementById("players").addEventListener("click", function(event) {
		const card = event.target.closest(".card[data-player-id]");
		if (!card || isTransitionRunning) return;
		openDetail(card.dataset.playerId, card);
	});

	document.getElementById("players").addEventListener("keydown", function(event) {
		if (event.key !== "Enter" && event.key !== " ") return;

		const card = event.target.closest(".card[data-player-id]");
		if (!card || isTransitionRunning) return;

		event.preventDefault();
		openDetail(card.dataset.playerId, card);
	});

	const rankingsRoot = document.getElementById("rankingsList");
	if (rankingsRoot) {
		rankingsRoot.addEventListener("click", function(event) {
			const item = event.target.closest("[data-player-id]");
			if (!item || isTransitionRunning) return;
			openDetail(item.dataset.playerId, item);
		});
		rankingsRoot.addEventListener("keydown", function(event) {
			if (event.key !== "Enter" && event.key !== " ") return;
			const item = event.target.closest("[data-player-id]");
			if (!item || isTransitionRunning) return;
			event.preventDefault();
			openDetail(item.dataset.playerId, item);
		});
	}

	document.getElementById("detailView").addEventListener("click", function(event) {
		if (event.target.id === "backBtn" && !isTransitionRunning) {
			closeDetail();
		}
	});

	document.addEventListener("keydown", function(event) {
		if (event.key === "Escape" && activePlayerId && !isTransitionRunning) {
			closeDetail();
		}
	});

	document.addEventListener("click", function(event) {
		const thumb = event.target.closest("[data-achievement-thumb]");
		if (!thumb) return;

		const gallery = thumb.closest("[data-achievement-gallery]");
		if (!gallery) return;

		const main = gallery.querySelector("[data-achievement-main]");
		let bg = gallery.querySelector("[data-achievement-banner]") || gallery.querySelector("[data-achievement-background]");
		const titleWrap = gallery.querySelector("[data-achievement-main] .achievement-main-title");
		let titleImg = gallery.querySelector("[data-achievement-title]");
		const name = gallery.querySelector("[data-achievement-name]");
		const date = gallery.querySelector("[data-achievement-date]");

		const banner = thumb.dataset.banner || thumb.dataset.background || "";
		const title = thumb.dataset.title || "";
		const label = thumb.dataset.label || "-";
		const unlockedDate = thumb.dataset.date || "-";

		gallery.style.setProperty("--achievement-color", thumb.dataset.color || "#7c5cff");
		gallery.style.setProperty("--achievement-color-2", thumb.dataset.color2 || "#7c5cff");
		gallery.style.setProperty("--achievement-glow", thumb.dataset.glow || "#7c5cff");

		gallery.querySelectorAll("[data-achievement-thumb]").forEach(function(item) {
			item.classList.toggle("is-active", item === thumb);
		});

		if (banner) {
			main.classList.remove("is-empty");

			if (!bg) {
				bg = document.createElement("img");
				bg.setAttribute("data-achievement-banner", "");
				bg.setAttribute("data-achievement-background", "");
				main.prepend(bg);
			}

			bg.src = banner;
			bg.alt = label;

			const fallback = main.querySelector(".achievement-gallery-main-fallback");
			if (fallback) fallback.remove();
		} else {
			main.classList.add("is-empty");

			if (bg) bg.remove();

			if (!main.querySelector(".achievement-gallery-main-fallback")) {
				main.insertAdjacentHTML(
					"afterbegin",
					`<div class="achievement-gallery-main-fallback">Sem imagem</div>`
				);
			}
		}

		if (title) {
			if (!titleWrap) {
				main.insertAdjacentHTML(
					"beforeend",
					`
						<div class="achievement-main-title">
							<img data-achievement-title src="${escapeHtml(title)}" alt="${escapeHtml(label)}">
						</div>
					`
				);
				titleImg = main.querySelector("[data-achievement-title]");
			} else if (!titleImg) {
				titleWrap.innerHTML = `<img data-achievement-title src="${escapeHtml(title)}" alt="${escapeHtml(label)}">`;
				titleImg = titleWrap.querySelector("[data-achievement-title]");
			} else {
				titleImg.src = title;
				titleImg.alt = label;
			}
		} else if (titleWrap) {
			titleWrap.remove();
		}

		if (name) name.textContent = label;
		if (date) date.textContent = unlockedDate;
	});


	// ===== FIX DEFINITIVO: animação real dos gradientes dos nomes =====
	// Mantém o sistema original de cores, mas movimenta o background via JS
	// para evitar que o tema Snow White ou regras CSS posteriores deixem a cor parada.
	(function forcePlayerGradientAnimation(){
		let rafId = null;
		let last = 0;
		let pos = 0;

		function normalizeGradientElement(el) {
			if (!el || el.dataset.gradientForceReady === "true") return;

			el.dataset.gradientForceReady = "true";
			el.style.setProperty("display", el.classList.contains("list-displayname") ? "block" : "inline-block", "important");
			el.style.setProperty("background-size", "320% 100%", "important");
			el.style.setProperty("background-position", "0% 50%", "important");
			el.style.setProperty("background-clip", "text", "important");
			el.style.setProperty("-webkit-background-clip", "text", "important");
			el.style.setProperty("color", "transparent", "important");
			el.style.setProperty("-webkit-text-fill-color", "transparent", "important");
			el.style.setProperty("animation", "none", "important");
			el.style.setProperty("will-change", "background-position", "important");
		}

		function tick(now) {
			if (!last) last = now;
			const delta = Math.min(48, now - last);
			last = now;

			// velocidade parecida com a original, mas visível mesmo em gradientes longos
			pos = (pos + delta * 0.018) % 320;

			document.querySelectorAll(".title-gradient, .list-displayname.gradient").forEach(function(el){
				normalizeGradientElement(el);
				el.style.setProperty("background-position", pos.toFixed(2) + "% 50%", "important");
			});

			rafId = requestAnimationFrame(tick);
		}

		function start() {
			if (rafId) return;
			rafId = requestAnimationFrame(tick);
		}

		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", start, { once: true });
		} else {
			start();
		}
	})();

	(function () {
		let pos = 0;

		function tick() {
			pos = (pos + 0.65) % 320;

			document
				.querySelectorAll(".list-displayname.gradient .list-displayname-text")
				.forEach(function (el) {
					const parent = el.closest(".list-displayname.gradient");
					if (!parent) return;

					const gradient = parent.style.getPropertyValue("--display-gradient");
					if (gradient) {
						el.style.setProperty("background-image", gradient, "important");
					}

					el.style.setProperty("background-size", "320% 100%", "important");
					el.style.setProperty("background-position", pos + "% 50%", "important");
					el.style.setProperty("-webkit-background-clip", "text", "important");
					el.style.setProperty("background-clip", "text", "important");
					el.style.setProperty("-webkit-text-fill-color", "transparent", "important");
					el.style.setProperty("color", "transparent", "important");
				});

			requestAnimationFrame(tick);
		}

		requestAnimationFrame(tick);
	})();


	// Esta página é somente a busca/lista.
	load();

	// ===== REDESIGN 2025: remover somente sidebars legadas, mantendo botão voltar do Perfil =====
	function removeLegacyChrome() {
		document.querySelectorAll('.archive-side-hud, .gacha-sidebar, .archive-sidebar, .category-sidebar').forEach(function(el) {
			el.remove();
		});
	}
	removeLegacyChrome();
	setTimeout(removeLegacyChrome, 900);
