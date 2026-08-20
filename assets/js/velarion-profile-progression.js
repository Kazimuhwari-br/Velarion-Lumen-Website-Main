/* ======================================================================
   Velarion Profile — Progression / Level / Tier renderer
   ====================================================================== */
(function(window) {
  "use strict";

  if (window.VelarionProfileProgression) return;

  function core() {
    const api = window.VelarionProfileCore;
    if (!api) throw new Error("VelarionProfileProgression requer velarion-profile-core.js.");
    return api;
  }

  function getTierProgressPercent(player) {
    const C = core();
    const raw = C.firstRaw(player, [
      "stats.progression.percent",
      "stats.progression.percentage",
      "stats.progression.progress_percent",
      "stats.progression.progress",
      "progression.percent",
      "progression.percentage",
      "progression.progress_percent",
      "progression.progress",
      "rank.progress_percent",
      "rank.progress",
      "tier.progress_percent",
      "tier.progress"
    ], 100);

    let value = Number(raw);
    if (!Number.isFinite(value)) value = 100;
    if (value >= 0 && value <= 1) value *= 100;
    return Math.max(0, Math.min(100, value));
  }

  function getLevelRankSource(ctx) {
    const extensions = ctx?.extensionsData || {};
    const nested = extensions?.information_panel && typeof extensions.information_panel === "object"
      ? extensions.information_panel
      : {};
    const source = extensions.badges_levelranks || nested.badges_levelranks || {};
    return source && typeof source === "object" && !Array.isArray(source) ? source : {};
  }

  function resolveLevelRank(player, ctx) {
    const C = core();
    const source = getLevelRankSource(ctx);
    const level = C.getPlayerLevel(player);
    const raw = player?.badges?.levelrank_id
      ?? player?.badges?.levelrank
      ?? player?.badges?.rank_id
      ?? player?.rank?.levelrank_id
      ?? player?.rank?.id
      ?? player?.profile?.levelrank_id
      ?? "";

    const rawObject = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
    const requestedId = C.cleanValue(
      rawObject?.id || rawObject?.levelrank_id || rawObject?.key ||
      (typeof raw === "string" || typeof raw === "number" ? raw : "")
    );

    let key = requestedId && Object.prototype.hasOwnProperty.call(source, requestedId) ? requestedId : "";
    if (!key && requestedId) {
      const wanted = requestedId.toLowerCase();
      key = Object.keys(source).find((candidate) => C.cleanValue(candidate).toLowerCase() === wanted) || "";
    }

    if (!key) {
      const entries = Object.entries(source).filter(([, rank]) => rank && typeof rank === "object" && rank.enabled !== false);
      const match = entries.find(([, rank]) => {
        const minRaw = rank?.progression?.level_min ?? rank?.min;
        const maxRaw = rank?.progression?.level_max ?? rank?.max;
        const min = Number(minRaw);
        const max = Number(maxRaw);
        if (!Number.isFinite(min)) return false;
        if (!Number.isFinite(max)) return level >= min;
        return level >= min && level <= max;
      });
      key = match?.[0] || "";
    }

    const rank = key ? source[key] : (rawObject || null);
    if (!rank || typeof rank !== "object") return null;
    return { key: key || C.cleanValue(rank.id), rank };
  }

  function getPlayerMaxLevel(player) {
    const C = core();
    const raw = C.firstRaw(player, [
      "stats.progression.max_level",
      "stats.progression.maxLevel",
      "stats.max_level",
      "stats.maxLevel",
      "progression.max_level",
      "progression.maxLevel",
      "profile.max_level",
      "profile.maxLevel",
      "max_level",
      "maxLevel"
    ], 0);
    const value = Number(raw);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  function getPlayerLevelProgressPercent(player) {
    const C = core();
    const level = C.getPlayerLevel(player);
    const maxLevel = getPlayerMaxLevel(player);
    if (maxLevel > 0) return Math.max(0, Math.min(100, (level / maxLevel) * 100));
    return getTierProgressPercent(player);
  }

  function render(player, context) {
    const C = core();
    const ctx = context || {};
    const level = C.getPlayerLevel(player);
    const resolved = resolveLevelRank(player, ctx);
    const rank = resolved?.rank || null;
    const website = rank?.website && typeof rank.website === "object" ? rank.website : {};

    const rawFallbackTier = C.getTierName(player);
    const fallbackTier = rawFallbackTier && rawFallbackTier !== "[object Object]" ? rawFallbackTier : "Novice";
    const tier = C.cleanValue(rank?.label || website.title_text || website.label || fallbackTier) || "Novice";

    const percent = getPlayerLevelProgressPercent(player);
    const percentRounded = Math.round(percent * 10) / 10;
    const percentLabel = `${percentRounded}`.replace(/\.0$/, "") + "%";

    const color = C.normalizeHexColor(website.color || "#f4df9a");
    const color2 = C.normalizeHexColor(website.color2 || color, color);
    const glow = C.normalizeHexColor(website.glow || color, color);
    const icon = C.getMediaSource(website.icon || website.title || "");
    const banner = C.cleanValue(website.banner || website.gradient || "");
    const style = [
      `--vl-lt-color:${C.escapeHtml(color)}`,
      `--vl-lt-color2:${C.escapeHtml(color2)}`,
      `--vl-lt-glow:${C.escapeHtml(glow)}`,
      banner ? `--vl-lt-banner:${C.escapeHtml(banner)}` : ""
    ].filter(Boolean).join(";");

    return `
      <div class="vl-profile-record-progression vl-profile-panel--progress-v2" aria-label="Nível, tier e progresso">
        <div class="vl-profile-level-tier-rebuilt" data-levelrank-id="${C.escapeHtml(resolved?.key || "")}" data-player-max-level="${C.escapeHtml(getPlayerMaxLevel(player) || "")}" style="${style}" aria-label="Nível ${C.escapeHtml(level)}, tier ${C.escapeHtml(tier)}, progresso ${C.escapeHtml(percentLabel)}">
          <div class="vl-profile-level-tier-rebuilt__top">
            <div class="vl-profile-level-tier-rebuilt__level">
              <span class="vl-profile-level-tier-rebuilt__crystal" aria-hidden="true">
                ${icon ? `<img src="${C.escapeHtml(icon)}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.remove();">` : `<i></i>`}
              </span>
              <span>Lv.</span>
              <strong>${C.escapeHtml(level || 0)}</strong>
            </div>
            <div class="vl-profile-level-tier-rebuilt__tier">
              <span>Tier:</span>
              <strong>${C.escapeHtml(tier)}</strong>
            </div>
          </div>
          <div class="vl-profile-level-tier-rebuilt__progress">
            <div class="vl-profile-level-tier-rebuilt__track" aria-hidden="true"><i style="width:${C.escapeHtml(percent)}%"></i></div>
            <strong>${C.escapeHtml(percentLabel)}</strong>
          </div>
        </div>
      </div>`;
  }

  window.VelarionProfileProgression = {
    render
  };
})(window);
