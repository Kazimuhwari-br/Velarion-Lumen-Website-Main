/* ======================================================================
   Velarion Profile — Documento do Aventureiro renderer/runtime independente
   ====================================================================== */
(function(window, document) {
  "use strict";

  if (window.VelarionProfileDocument) return;

  const DEFAULT_AVATAR = "https://mc-heads.net/avatar/Steve/256";

  function core() {
    const api = window.VelarionProfileCore;
    if (!api) throw new Error("VelarionProfileDocument requer velarion-profile-core.js.");
    return api;
  }

  function getClanNameFallback(player) {
    const C = core();
    return C.stripMinecraftCodes(player?.clan?.name || player?.clan?.tag || player?.profile?.clan || "Sem clã");
  }

  function getClanRequestedId(player) {
    const C = core();
    const raw = player?.clan ?? player?.profile?.clan ?? player?.profile?.clan_id ?? player?.profile?.clanId;
    if (typeof raw === "string" || typeof raw === "number") return C.cleanValue(raw);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "";
    return C.cleanValue(raw.id || raw.clan_id || raw.clanId || raw.key || "");
  }

  function getClanPlayersSource(ctx) {
    const raw = ctx?.clanPlayers || ctx?.clansData || ctx?.clans || {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const nested = raw.clanPlayers;
    return nested && typeof nested === "object" && !Array.isArray(nested) ? nested : raw;
  }

  function resolveClanChipData(player, ctx) {
    const C = core();
    const source = getClanPlayersSource(ctx);
    const requestedId = C.stripMinecraftCodes(getClanRequestedId(player));
    if (!requestedId) return null;

    const aliases = Array.from(new Set([requestedId, requestedId.toUpperCase(), requestedId.toLowerCase()]));
    let resolvedId = aliases.find((key) => source?.[key]);
    if (!resolvedId) {
      const wanted = requestedId.toLowerCase();
      resolvedId = Object.keys(source || {}).find((key) => C.stripMinecraftCodes(C.cleanValue(key)).toLowerCase() === wanted);
    }

    const clan = resolvedId ? source?.[resolvedId] : null;
    if (!clan || typeof clan !== "object") return null;

    const cardEmbed = clan?.theme?.card_embed && typeof clan.theme.card_embed === "object" ? clan.theme.card_embed : {};
    const colorConfig = C.normalizeCardColorConfig(cardEmbed.card_color ?? clan.card_color ?? clan.color ?? clan.website?.color ?? "#c74b5d", "#c74b5d");
    const color = C.normalizeHexColor(colorConfig.primary || "#c74b5d", "#c74b5d");
    const explicitColor2 = C.cleanValue(cardEmbed.card_color2 ?? clan.card_color2 ?? clan.color2 ?? clan.website?.color2);
    const color2 = /^#[0-9a-f]{3,6}$/i.test(explicitColor2)
      ? C.normalizeHexColor(explicitColor2, color)
      : C.normalizeHexColor(colorConfig.colors?.[1] || color, color);
    const explicitGlow = C.cleanValue(cardEmbed.glow ?? clan.glow ?? clan.website?.glow);
    const glow = /^#[0-9a-f]{3,6}$/i.test(explicitGlow) ? C.normalizeHexColor(explicitGlow, color) : color;

    const shortName = C.stripMinecraftCodes(C.cleanValue(clan.sub ?? clan.name ?? clan.label ?? clan.website?.label ?? resolvedId)) || requestedId;
    const title = C.stripMinecraftCodes(C.cleanValue(clan?.profile?.title ?? clan?.title ?? clan?.name ?? clan?.label ?? shortName)) || shortName;
    const description = C.stripMinecraftCodes(C.cleanValue(clan?.profile?.bio ?? clan?.bio ?? clan?.profile?.subtitle ?? clan?.subtitle ?? "Informações do clã")) || "Informações do clã";

    return {
      id: C.cleanValue(resolvedId || requestedId),
      requestedId,
      name: shortName,
      title,
      description,
      icon: C.getMediaSource(cardEmbed.avatar_bottom_image ?? clan.avatar_bottom_image ?? clan.icon ?? clan.website?.icon ?? ""),
      emblem: C.getMediaSource(cardEmbed.avatar_bottom_image ?? clan.avatar_bottom_image ?? clan.emblem ?? clan.icon ?? clan.website?.emblem ?? clan.website?.icon ?? ""),
      color,
      color2,
      glow
    };
  }

  function buildClanInfoPopover(clan) {
    const C = core();
    if (!clan) return "";
    const label = C.cleanValue(clan.name || clan.id || "Clã");
    const title = C.cleanValue(clan.title || label);
    const description = C.cleanValue(clan.description || "Informações do clã");
    const id = C.cleanValue(clan.id || clan.requestedId || "");
    const emblem = C.cleanValue(clan.emblem || clan.icon || "");
    const color = C.normalizeHexColor(clan.color || "#c74b5d", "#c74b5d");
    const color2 = C.normalizeHexColor(clan.color2 || color, color);
    const glow = C.normalizeHexColor(clan.glow || color, color);

    return `
      <div class="vl-profile-verified-popover vl-profile-clan-popover" role="tooltip" aria-label="Informações do clã" style="--vpop-color:${C.escapeHtml(color)};--vpop-color2:${C.escapeHtml(color2)};--vpop-glow:${C.escapeHtml(glow)};">
        ${emblem ? `<div class="vl-profile-verified-popover__watermark" aria-hidden="true"><img src="${C.escapeHtml(emblem)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.parentElement.remove();"></div>` : ""}
        <div class="vl-profile-verified-popover__head">
          <div class="vl-profile-verified-popover__emblem" aria-hidden="true">
            ${emblem ? `<img src="${C.escapeHtml(emblem)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.remove();">` : `<span>◇</span>`}
          </div>
          <div class="vl-profile-verified-popover__title">
            <small>Informações do clã</small>
            <strong>${C.escapeHtml(title)}</strong>
            <span>${C.escapeHtml(description)}</span>
          </div>
        </div>
        <div class="vl-profile-verified-popover__meta">
          <div><small>Sigla</small><strong>${C.escapeHtml(label)}</strong></div>
          <div><small>ID do clã</small><strong>${C.escapeHtml(id || "—")}</strong></div>
        </div>
        ${id ? `<div class="vl-profile-verified-popover__id"><span>CLAN</span><code>${C.escapeHtml(id)}</code></div>` : ""}
        <i class="vl-profile-verified-popover__arrow" aria-hidden="true"></i>
      </div>`;
  }

  function getVerifiedState(player) {
    const value = player?.verified ?? player?.profile?.verified ?? player?.badges?.verified;
    return value === true || value === "true" || value === 1 || value === "1";
  }

  function fallbackVerifiedBadge(player) {
    return getVerifiedState(player)
      ? `<span class="vl-profile-verify">Verificado</span>`
      : `<span class="vl-profile-verify is-muted">Não verificado</span>`;
  }

  function collectVerifiedRefs(value, output, depth = 0) {
    const C = core();
    if (depth > 4 || value === null || value === undefined || value === false) return;
    if (typeof value === "string" || typeof value === "number") {
      const ref = C.cleanValue(value);
      if (ref && !/^(?:true|false|0|1)$/i.test(ref)) output.push(ref);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => collectVerifiedRefs(item, output, depth + 1));
      return;
    }
    if (typeof value === "object") {
      ["id", "badge_id", "verified_id", "verification_id", "type", "value"].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(value, key)) collectVerifiedRefs(value[key], output, depth + 1);
      });
    }
  }

  function stripHtmlText(value) {
    return core().cleanValue(String(value || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " "));
  }

  function resolveVerifiedBadgeData(player, ctx, renderedBadgeHtml) {
    const C = core();
    const source = ctx?.extensionsData?.badges_verified || {};
    if (!source || typeof source !== "object") return null;
    const refs = [];
    collectVerifiedRefs(player?.badges?.verified, refs);
    collectVerifiedRefs(player?.badges?.verification, refs);
    collectVerifiedRefs(player?.profile?.verified, refs);
    collectVerifiedRefs(player?.verified_badge, refs);
    collectVerifiedRefs(player?.verified_id, refs);
    collectVerifiedRefs(player?.verification_id, refs);
    collectVerifiedRefs(player?.verified, refs);
    const entries = Object.entries(source).filter(([, raw]) => raw && typeof raw === "object");
    const normalizedRefs = [...new Set(refs.map((ref) => C.cleanValue(ref).toLowerCase()).filter(Boolean))];
    let match = entries.find(([key, raw]) => {
      const id = C.cleanValue(raw.id || key).toLowerCase();
      return normalizedRefs.includes(C.cleanValue(key).toLowerCase()) || normalizedRefs.includes(id);
    });
    if (!match) {
      const renderedText = stripHtmlText(renderedBadgeHtml).toLowerCase();
      if (renderedText) {
        const candidates = entries.filter(([, raw]) => {
          const data = C.mergeBadge(raw);
          const labels = [data?.website?.badge_text, data?.website?.label, data?.label, data?.name, data?.verification_type, data?.category]
            .map((item) => C.cleanValue(item).toLowerCase()).filter(Boolean);
          return labels.some((label) => renderedText.includes(label));
        });
        candidates.sort((a, b) => Number(b[1]?.priority || 0) - Number(a[1]?.priority || 0));
        match = candidates[0];
      }
    }
    if (!match) return null;
    const [key, raw] = match;
    const data = C.mergeBadge(raw);
    if (!data || data.enabled === false || !C.badgeVisible(data, "profile")) return null;
    if (data.display?.show_tooltip === false) return null;
    return { key, raw, data };
  }

  function useVerifiedCompactIcon(player, ctx, renderedBadgeHtml) {
    const C = core();
    const html = String(renderedBadgeHtml || "");
    if (!html) return html;
    const resolved = resolveVerifiedBadgeData(player, ctx, renderedBadgeHtml);
    const icon = C.cleanValue(resolved?.raw?.website?.icon || "");
    if (!icon) return html;
    const safeIcon = C.escapeHtml(icon);
    if (/class=["'][^"']*card-verified-emblem[^"']*["']/i.test(html)) {
      return html.replace(
        /(<img\b(?=[^>]*class=["'][^"']*card-verified-emblem[^"']*["'])[^>]*\bsrc=["'])[^"']*(["'])/i,
        `$1${safeIcon}$2`
      );
    }
    return html.replace(/(<img\b[^>]*\bsrc=["'])[^"']*(["'])/i, `$1${safeIcon}$2`);
  }

  function buildVerifiedInfoPopover(player, ctx, renderedBadgeHtml) {
    const C = core();
    const resolved = resolveVerifiedBadgeData(player, ctx, renderedBadgeHtml);
    if (!resolved) return "";
    const { key, raw, data } = resolved;
    const website = raw.website && typeof raw.website === "object" ? raw.website : {};
    const label = C.cleanValue(website.label || website.badge_text || raw.label || data.label || "Verificado");
    const description = C.cleanValue(website.bio || raw.description || data.description || "Verificação pública do perfil.");
    const issuer = C.cleanValue(raw.issuer || "Velarion Lumen");
    const category = C.cleanValue(raw.category || raw.type || "verified");
    const verificationType = C.cleanValue(raw.verification_type || raw.type || category);
    const verificationTypeLabel = verificationType ? verificationType.charAt(0).toUpperCase() + verificationType.slice(1) : "Verificado";
    const trust = Number(raw.trust_level);
    const trustText = Number.isFinite(trust) ? `${Math.max(0, trust)}/5` : "—";
    const id = C.cleanValue(raw.id || key);
    const emblem = C.cleanValue(website.emblem || website.icon || "");
    const color = C.normalizeHexColor(website.color || data.color || "#48E7FF", "#48E7FF");
    const color2 = C.normalizeHexColor(website.color2 || data.color2 || color, color);
    const glow = C.normalizeHexColor(website.glow || data.glow || color2, color2);
    return `
      <div class="vl-profile-verified-popover" role="tooltip" aria-label="Informações da verificação" style="--vpop-color:${C.escapeHtml(color)};--vpop-color2:${C.escapeHtml(color2)};--vpop-glow:${C.escapeHtml(glow)};">
        ${emblem ? `<div class="vl-profile-verified-popover__watermark" aria-hidden="true"><img src="${C.escapeHtml(emblem)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.parentElement.remove();"></div>` : ""}
        <div class="vl-profile-verified-popover__head">
          <div class="vl-profile-verified-popover__emblem" aria-hidden="true">
            ${emblem ? `<img src="${C.escapeHtml(emblem)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.remove();">` : `<span>✦</span>`}
          </div>
          <div class="vl-profile-verified-popover__title">
            <small>Verificação oficial</small>
            <strong>${C.escapeHtml(label)}</strong>
            <span>${C.escapeHtml(description)}</span>
          </div>
        </div>
        <div class="vl-profile-verified-popover__meta">
          <div><small>Emitido por</small><strong>${C.escapeHtml(issuer)}</strong></div>
          <div><small>Confiança</small><strong>${C.escapeHtml(trustText)}</strong></div>
          <div class="vl-profile-verified-popover__meta--wide"><small>Tipo de verificação</small><strong>${C.escapeHtml(verificationTypeLabel)}</strong></div>
        </div>
        ${id ? `<div class="vl-profile-verified-popover__id"><span>ID</span><code>${C.escapeHtml(id)}</code></div>` : ""}
        <i class="vl-profile-verified-popover__arrow" aria-hidden="true"></i>
      </div>`;
  }

  function getOnlineLabel(player) {
    const C = core();
    const raw = C.firstRaw(player, ["presence.online", "db.online", "status.online", "online", "is_online"], "");
    if (raw === "") return "Status indefinido";
    return C.boolLike(raw, false) ? "Online" : "Offline";
  }

  function getOnlineToken(player) {
    const label = getOnlineLabel(player).toLowerCase();
    if (label === "online") return "online";
    if (label === "offline") return "offline";
    return "unknown";
  }

  function renderProfileFrameMedia(source) {
    const C = core();
    const media = C.getMediaSource(source);
    if (!media) return "";
    if (C.isWebMMedia(media)) {
      return `<video src="${C.escapeHtml(media)}" autoplay loop muted playsinline preload="auto" aria-hidden="true" tabindex="-1" referrerpolicy="no-referrer" style="display:block;width:100%;height:100%;object-fit:fill;background:transparent;pointer-events:none;" onerror="this.parentElement.remove();"></video>`;
    }
    return `<img src="${C.escapeHtml(media)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.parentElement.remove();">`;
  }

  function render(player, context) {
    const C = core();
    const ctx = context || {};
    const getAvatar = C.pick(ctx, "getAvatar", (value) => C.getImageFallback(value, "avatar") || ctx.DEFAULT_PLAYER_AVATAR || DEFAULT_AVATAR);
    const getDisplayName = C.pick(ctx, "getDisplayName", C.getDisplayNameFallback);
    const getUsername = C.pick(ctx, "getUsername", C.getUsernameFallback);
    const getCardTitle = C.pick(ctx, "getCardTitle", C.getCardTitleFallback);
    const getClanName = C.pick(ctx, "getPlayerClanName", getClanNameFallback);
    const buildVerifiedCardBadgeHtml = C.pick(ctx, "buildVerifiedCardBadgeHtml", fallbackVerifiedBadge);

    const verifiedBadgeSourceHtml = buildVerifiedCardBadgeHtml(player);
    const verifiedBadgeHtml = useVerifiedCompactIcon(player, ctx, verifiedBadgeSourceHtml);
    const verifiedInfoHtml = buildVerifiedInfoPopover(player, ctx, verifiedBadgeSourceHtml);
    const characterSlot = C.resolveCharacterSlot(player, ctx.characterSlotId || "id_1");
    const slotData = characterSlot.data || {};
    const cardColorConfig = C.normalizeCardColorConfig(
      Object.prototype.hasOwnProperty.call(slotData, "card_color") ? slotData.card_color : player?.theme?.card_embed?.card_color,
      player?.theme?.profile?.accent || "#8b6cff"
    );
    const primaryCardColor = cardColorConfig.primary;
    const avatar = getAvatar(player) || DEFAULT_AVATAR;
    const profileFrameImage = C.getMediaSource(
      Object.prototype.hasOwnProperty.call(slotData, "profile_frame_image")
        ? slotData.profile_frame_image
        : player?.theme?.card_embed?.profile_frame_image
    );
    const displayNamePlain = C.stripMinecraftCodes(getDisplayName(player)) || "Jogador";
    const username = getUsername(player) || displayNamePlain;
    const cardTitle = getCardTitle(player);
    const clanChip = resolveClanChipData(player, ctx);
    const clanName = clanChip?.name || getClanName(player) || "Sem clã";
    const clanIcon = clanChip?.icon || "";
    const clanInfoHtml = buildClanInfoPopover(clanChip);
    const country = C.getCountryDisplay(player);
    const playerId = C.formatProfileIdDisplay(player?._id || player?.id || player?.profile_id || player?.profile?.id || "ID");
    const documentAccent = C.normalizeHexColor(primaryCardColor || "#8b6cff");
    const documentBackground = C.normalizeHexColor(primaryCardColor || "#8b6cff");
    // Documento: preserva a identidade do card_color, mas clareia a paleta
    // para um acabamento pastel/luminoso menos carregado que o card oficial.
    const documentPastelPalette = (cardColorConfig.colors.length ? cardColorConfig.colors : [documentAccent])
      .map((color) => C.interpolateHexColor(C.normalizeHexColor(color, documentAccent), "#ffffff", 0.34));
    const documentPaletteGradient = C.buildPaletteGradient(documentPastelPalette, "135deg");
    const documentPaletteLoopGradient = C.buildPaletteLoopGradient(documentPastelPalette, "90deg");
    const characterSlotBackground = C.cleanValue(slotData.background_color || "");
    const onlineLabel = getOnlineLabel(player);
    const onlineToken = getOnlineToken(player);

    return `
      <div class="vl-profile-record-grid vl-profile-record-grid--document-only">
        <article
          class="vl-profile-record-main vl-profile-public-id-card"
          aria-label="Documento de identidade pública"
          data-vp-card-color-type="${C.escapeHtml(cardColorConfig.type || "none")}"
          data-vp-card-color-speed="${C.escapeHtml(cardColorConfig.speed || 10)}"
          data-vp-card-color-palette="${C.escapeHtml(cardColorConfig.colors.join(","))}"
          data-character-slot-id="${C.escapeHtml(characterSlot.id || "id_1")}"
          data-character-slot-count="${C.escapeHtml(characterSlot.ids.length || 1)}"
          style="--vp-character-slot-background:${C.escapeHtml(characterSlotBackground || "transparent")};--vp-document-accent:${C.escapeHtml(documentAccent)};--vp-document-color:${C.escapeHtml(documentBackground)};--vp-document-color-speed:${C.escapeHtml(cardColorConfig.speed || 10)}s;--vp-document-palette-gradient:${C.escapeHtml(documentPaletteGradient)};--vp-document-palette-loop-gradient:${C.escapeHtml(documentPaletteLoopGradient)};"
        >
          <div class="vl-profile-public-id-card__shine" aria-hidden="true"></div>
          ${profileFrameImage ? `
          <div class="vl-profile-public-id-card__frame-image" aria-hidden="true" data-media-type="${C.isWebMMedia(profileFrameImage) ? "video" : "image"}">
            ${renderProfileFrameMedia(profileFrameImage)}
          </div>` : ""}
          <div class="vl-profile-public-id-card__top">
            <span>Documento do aventureiro</span>
            <div class="vl-profile-public-id-card__identity-tags">
              ${clanName && clanName !== "Sem clã" ? `
              <div class="vl-profile-public-id-card__clan-tag" aria-label="Clã ${C.escapeHtml(clanName)}${clanInfoHtml ? ". Pressione para ver detalhes." : ""}" data-clan-id="${C.escapeHtml(clanChip?.requestedId || clanChip?.id || "")}" ${clanInfoHtml ? 'data-vl-info-popover="true" role="button" tabindex="0" aria-expanded="false"' : ""} style="--clan-tag-accent:${C.escapeHtml(clanChip?.color || "#c74b5d")};--clan-tag-accent-2:${C.escapeHtml(clanChip?.color2 || clanChip?.color || "#d98a96")};--clan-tag-glow:${C.escapeHtml(clanChip?.glow || clanChip?.color || "#c74b5d")};">
                <span class="vl-profile-public-id-card__clan-chip"><strong>${C.escapeHtml(clanName)}</strong></span>
                ${clanIcon
                  ? `<img class="vl-profile-public-id-card__clan-icon" src="${C.escapeHtml(clanIcon)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.remove();">`
                  : `<i aria-hidden="true"></i>`}
                ${clanInfoHtml}
              </div>` : ""}
              <div class="vl-profile-public-id-card__verified-tag" aria-label="Verificação do aventureiro${verifiedInfoHtml ? ". Pressione para ver detalhes." : ""}" ${verifiedInfoHtml ? 'data-has-verified-info="true" data-vl-info-popover="true" role="button" tabindex="0" aria-expanded="false"' : ""}>
                ${verifiedBadgeHtml}
                ${verifiedInfoHtml}
              </div>
            </div>
            <em data-status="${C.escapeHtml(onlineToken)}"><i></i>${C.escapeHtml(onlineLabel)}</em>
          </div>

          <div class="vl-profile-public-id-card__body">
            <div class="vl-profile-public-id-card__photo">
              <img src="${C.escapeHtml(avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.remove();">
            </div>
            <div class="vl-profile-public-id-card__data">
              <small>Identidade pública</small>
              <strong>${C.escapeHtml(username)}</strong>
              <span>${C.escapeHtml(displayNamePlain)}</span>
              <div class="vl-profile-public-id-card__chips" aria-label="Dados rápidos do documento">
                <em>${C.escapeHtml(playerId)}</em>
                <em class="vl-profile-country-chip" aria-label="País: ${C.escapeHtml(country.name)}">
                  ${country.flagUrl ? `<img class="vl-profile-country-chip__flag" src="${C.escapeHtml(country.flagUrl)}" alt="" aria-hidden="true" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove();">` : ""}
                  <span class="vl-profile-country-chip__name">${C.escapeHtml(country.name)}</span>
                </em>
              </div>
            </div>
          </div>

          <div class="vl-profile-public-id-card__footer">
            <span>Registro público</span>
            <i></i>
            <b>${C.escapeHtml(cardTitle || "Sem título definido")}</b>
          </div>
        </article>
      </div>`;
  }

  function applyDocumentRuntimeColor(card, color) {
    const C = core();
    if (!card || !C.isValidCardHex(color)) return;
    card.style.setProperty("--vp-document-accent", color);
    card.style.setProperty("--vp-document-color", color);
  }

  function getDocumentRuntimePalette(card) {
    const C = core();
    return String(card?.dataset?.vpCardColorPalette || "")
      .split(",")
      .map((value) => value.trim())
      .filter(C.isValidCardHex);
  }

  const profileDocumentColorRuntime = {
    cards: new Set(),
    raf: 0,
    startedAt: typeof performance !== "undefined" ? performance.now() : Date.now()
  };

  function updateProfileDocumentColors(now) {
    const C = core();
    let active = false;
    const currentNow = Number.isFinite(now) ? now : (typeof performance !== "undefined" ? performance.now() : Date.now());

    profileDocumentColorRuntime.cards.forEach((documentCard) => {
      if (!documentCard || !documentCard.isConnected) {
        profileDocumentColorRuntime.cards.delete(documentCard);
        return;
      }

      const type = C.normalizeCardColorType(documentCard.dataset.vpCardColorType);
      const colors = getDocumentRuntimePalette(documentCard);
      if (colors.length < 2 || !["rotate", "pulse"].includes(type)) return;
      active = true;

      /* Dentro da página completa, acompanha exatamente a carta oficial. */
      const stage = documentCard.closest(".vl-profile-stage");
      const officialCard = stage?.querySelector?.(".vl-card[data-card-color-type]");
      if (officialCard) {
        const liveColor = getComputedStyle(officialCard).getPropertyValue("--card-color").trim();
        if (C.isValidCardHex(liveColor)) {
          applyDocumentRuntimeColor(documentCard, liveColor);
          return;
        }
      }

      /* Fora do profile, executa a mesma lógica de rotate/pulse do velarion-card. */
      const speed = C.normalizeCardColorSpeed(documentCard.dataset.vpCardColorSpeed, 10);
      const elapsedSeconds = (currentNow - profileDocumentColorRuntime.startedAt) / 1000;
      const cycle = ((elapsedSeconds % speed) / speed) * colors.length;
      const baseIndex = Math.floor(cycle) % colors.length;
      const nextIndex = (baseIndex + 1) % colors.length;
      const localProgress = cycle - Math.floor(cycle);

      if (type === "rotate") {
        const lastIndex = Number(documentCard.dataset.vpCardColorRuntimeIndex ?? -1);
        if (lastIndex !== baseIndex) {
          documentCard.dataset.vpCardColorRuntimeIndex = String(baseIndex);
          applyDocumentRuntimeColor(documentCard, colors[baseIndex]);
        }
        return;
      }

      const eased = localProgress * localProgress * (3 - 2 * localProgress);
      applyDocumentRuntimeColor(documentCard, C.interpolateHexColor(colors[baseIndex], colors[nextIndex], eased));
    });

    if (active || profileDocumentColorRuntime.cards.size) {
      profileDocumentColorRuntime.raf = requestAnimationFrame(updateProfileDocumentColors);
    } else {
      profileDocumentColorRuntime.raf = 0;
    }
  }

  function setupProfileDocumentColorEffects(root) {
    const C = core();
    const scope = root || document;
    scope.querySelectorAll?.(".vl-profile-public-id-card[data-vp-card-color-type]").forEach((documentCard) => {
      const colors = getDocumentRuntimePalette(documentCard);
      if (colors.length) applyDocumentRuntimeColor(documentCard, colors[0]);
      const type = C.normalizeCardColorType(documentCard.dataset.vpCardColorType);
      if (colors.length > 1 && ["rotate", "pulse"].includes(type)) profileDocumentColorRuntime.cards.add(documentCard);
    });

    if (profileDocumentColorRuntime.cards.size && !profileDocumentColorRuntime.raf) {
      profileDocumentColorRuntime.startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
      profileDocumentColorRuntime.raf = requestAnimationFrame(updateProfileDocumentColors);
    }
  }

  function ensureVerifiedPopoverEvents() {
    if (window.__vlVerifiedPopoverEventsInstalled) return;
    window.__vlVerifiedPopoverEventsInstalled = true;

    let floatingPopover = null;
    let activeTag = null;

    const positionFloatingPopover = () => {
      if (!floatingPopover || !activeTag || !document.body.contains(activeTag)) return;

      /*
       * O wrapper .vl-profile-public-id-card__verified-tag ocupa uma célula
       * maior do grid. Para posicionar o popover, ancore na parte que o
       * usuário realmente enxerga/clica (o chip), não no wrapper inteiro.
       */
      const anchor = activeTag.querySelector('.card-verified-chip, .vl-profile-verify, .vl-profile-public-id-card__clan-chip') || activeTag;
      const trigger = anchor.getBoundingClientRect();
      const panel = floatingPopover.getBoundingClientRect();
      const margin = 14;
      const edge = 12;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const compact = viewportWidth <= 560;

      /*
       * O popover pertence visualmente à coluna de conteúdo do perfil.
       * Usamos essa coluna como limite horizontal para impedir que o painel
       * atravesse para cima da carta oficial à esquerda.
       */
      const contentHost = activeTag.closest('.vl-profile-content') || activeTag.closest('.vl-profile-layout');
      const hostRect = contentHost?.getBoundingClientRect?.();
      const safeLeft = compact ? edge : Math.max(edge, (hostRect?.left ?? edge) + 8);
      const safeRight = compact
        ? viewportWidth - edge
        : Math.min(viewportWidth - edge, (hostRect?.right ?? (viewportWidth - edge)) - 8);

      const roomBelow = viewportHeight - trigger.bottom;
      const roomAbove = trigger.top;
      const roomLeft = trigger.left - safeLeft;
      const roomRight = safeRight - trigger.right;
      let placement = compact ? 'bottom' : 'left';
      let top;
      let left;

      if (compact) {
        /* Em telas pequenas, mantém a leitura confortável abaixo do selo. */
        left = (viewportWidth - panel.width) / 2;
        if (roomBelow >= panel.height + margin + edge || roomBelow >= roomAbove) {
          placement = 'bottom';
          top = trigger.bottom + margin;
        } else {
          placement = 'top';
          top = trigger.top - panel.height - margin;
        }
      } else if (roomLeft >= panel.width + margin) {
        /* Preferência escolhida: abre à esquerda do selo. */
        placement = 'left';
        left = trigger.left - panel.width - margin;
        top = trigger.top + (trigger.height - panel.height) / 2;
      } else if (roomRight >= panel.width + margin) {
        /* Fallback raro: só usa a direita se realmente não couber à esquerda. */
        placement = 'right';
        left = trigger.right + margin;
        top = trigger.top + (trigger.height - panel.height) / 2;
      } else {
        /* Último fallback: abaixo/acima, ainda preso à coluna do perfil. */
        left = trigger.right - panel.width;
        if (roomBelow >= panel.height + margin + edge || roomBelow >= roomAbove) {
          placement = 'bottom';
          top = trigger.bottom + margin;
        } else {
          placement = 'top';
          top = trigger.top - panel.height - margin;
        }
      }

      /* Mantém o popover dentro da coluna de conteúdo e da viewport. */
      const maxLeft = Math.max(safeLeft, safeRight - panel.width);
      left = Math.max(safeLeft, Math.min(left, maxLeft));
      top = Math.max(edge, Math.min(top, viewportHeight - panel.height - edge));

      /*
       * Mantém a seta apontando para o centro real do selo mesmo quando o
       * painel precisar ser limitado verticalmente pela viewport.
       */
      if (placement === 'left' || placement === 'right') {
        const arrowY = Math.max(18, Math.min(panel.height - 18, (trigger.top + trigger.height / 2) - top));
        floatingPopover.style.setProperty('--vpop-arrow-y', `${Math.round(arrowY)}px`);
      } else {
        floatingPopover.style.removeProperty('--vpop-arrow-y');
      }

      floatingPopover.dataset.placement = placement;
      floatingPopover.style.left = `${Math.round(left)}px`;
      floatingPopover.style.top = `${Math.round(top)}px`;
    };

    const POPOVER_TRANSITION_MS = 190;

    const closePopover = (restoreFocus = false, immediate = false) => {
      const panel = floatingPopover;
      const tag = activeTag;

      if (tag) {
        tag.classList.remove('is-open');
        tag.setAttribute('aria-expanded', 'false');
        tag.removeAttribute('aria-controls');
      }

      /*
       * O painel precisa permanecer no DOM durante o fechamento para que
       * opacity/transform consigam animar. Ao trocar diretamente de um selo
       * para outro, usamos immediate=true para não deixar dois popovers vivos.
       */
      if (panel) {
        panel.classList.remove('is-visible');
        panel.classList.add('is-closing');

        const finish = () => {
          panel.remove();
          if (floatingPopover === panel) floatingPopover = null;
        };

        if (immediate || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
          finish();
        } else {
          let finished = false;
          const done = () => {
            if (finished) return;
            finished = true;
            panel.removeEventListener('transitionend', onTransitionEnd);
            finish();
          };
          const onTransitionEnd = (event) => {
            if (event.target === panel && (event.propertyName === 'opacity' || event.propertyName === 'transform')) done();
          };
          panel.addEventListener('transitionend', onTransitionEnd);
          window.setTimeout(done, POPOVER_TRANSITION_MS + 80);
        }
      }

      if (restoreFocus && tag?.focus) tag.focus();
      if (activeTag === tag) activeTag = null;
    };

    const openPopover = (tag) => {
      if (!tag) return;
      const template = tag.querySelector('.vl-profile-verified-popover');
      if (!template) return;

      if (activeTag === tag) {
        closePopover();
        return;
      }

      closePopover(false, true);
      activeTag = tag;
      activeTag.classList.add('is-open');
      activeTag.setAttribute('aria-expanded', 'true');

      floatingPopover = template.cloneNode(true);
      floatingPopover.classList.add('vl-profile-verified-popover--floating');
      floatingPopover.removeAttribute('role');
      floatingPopover.setAttribute('role', 'dialog');
      floatingPopover.setAttribute('aria-modal', 'false');
      floatingPopover.id = `vl-verified-popover-${Date.now()}`;
      activeTag.setAttribute('aria-controls', floatingPopover.id);
      document.body.appendChild(floatingPopover);

      /*
       * O browser pode agrupar a inserção no DOM e a adição de .is-visible
       * no mesmo frame. Nesse caso, não existe um estado inicial pintado e
       * a transition não dispara. Primeiro posicionamos e forçamos um layout;
       * só no frame seguinte liberamos o estado visível.
       */
      positionFloatingPopover();
      void floatingPopover.offsetWidth;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!floatingPopover) return;
          floatingPopover.classList.add('is-visible');
        });
      });
    };

    document.addEventListener('click', (event) => {
      const tag = event.target.closest?.('[data-vl-info-popover="true"]');
      if (tag) {
        event.preventDefault();
        event.stopPropagation();
        openPopover(tag);
        return;
      }

      if (floatingPopover?.contains(event.target)) return;
      closePopover();
    });

    document.addEventListener('keydown', (event) => {
      const tag = event.target.closest?.('[data-vl-info-popover="true"]');
      if (event.key === 'Escape') {
        if (floatingPopover) {
          event.preventDefault();
          closePopover(true);
        }
        return;
      }
      if (!tag || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      openPopover(tag);
    });

    window.addEventListener('resize', () => {
      if (floatingPopover) positionFloatingPopover();
    }, { passive: true });

    window.addEventListener('scroll', () => {
      if (floatingPopover) positionFloatingPopover();
    }, { passive: true, capture: true });
  }


  function hydrate(root) {
    ensureVerifiedPopoverEvents();
    setupProfileDocumentColorEffects(root || document);
  }

  window.VelarionProfileDocument = {
    render,
    hydrate,
    refresh: hydrate
  };
})(window, document);
