/* Velarion Profile Stats — Dados Públicos/Rarity/Combate autônomos. */
(function(window){
  "use strict";
  if (window.VelarionProfileStats) return;
  function core(){ const api=window.VelarionProfileCore; if(!api) throw new Error("VelarionProfileStats requer velarion-profile-core.js."); return api; }
  function getRarityId(player){ const C=core(); const raw=player?.stats?.rarity; if(typeof raw==="string"||typeof raw==="number") return C.cleanValue(raw); if(raw&&typeof raw==="object") return C.cleanValue(raw.id||raw.rarity_id||raw.value); return C.cleanValue(player?.badges?.rarity_id||player?.badges?.rarity||player?.rarity_id); }
  function cleanValue(value){ const C=core(); if(value===null||value===undefined||value===false) return ""; if(typeof value!=="string"&&typeof value!=="number") return ""; return C.stripMinecraftCodes(C.cleanValue(value)); }
  function fallbackText(...values){ for(const v of values){ const t=cleanValue(v); if(t) return t; } return ""; }
  function safeColor(value,fallback){ const raw=String(value||"").trim(); return /^#[0-9a-f]{3,8}$/i.test(raw)?raw:fallback; }
  function normalizeLabel(value){ const C=core(); const raw=C.cleanValue(value); if(!raw) return "—"; return raw.replace(/^raritys?_id_/i,"").replace(/^rarity_id_/i,"").replace(/[_-]+/g," ").trim().toUpperCase()||"—"; }
  function safeGradient(value,fallback){ const raw=String(value||"").trim(); if(!raw||!/^(?:linear|radial|conic)-gradient\(/i.test(raw)||/[;{}<>]/.test(raw)) return fallback; return raw; }
  function resolveRarityVisualData(data,stats){
    const website=data?.website&&typeof data.website==="object"?data.website:{}; const effects=data?.profile_effects&&typeof data.profile_effects==="object"?data.profile_effects:{};
    const color=safeColor(website.color,"#D9A7FF"), color2=safeColor(website.color2,"#FFF1FF"), glow=safeColor(website.glow,color);
    const n=Number(website.intensity??effects.intensity??0.72), intensity=Number.isFinite(n)?Math.max(0,Math.min(1,n)):0.72;
    const fallback=`linear-gradient(135deg, ${color} 0%, ${color2} 58%, ${glow} 100%)`;
    const badge=normalizeLabel(stats?.id||data?.id||"—");
    return {color,color2,glow,gradient:safeGradient(website.gradient,fallback),intensity,badgeText:fallbackText(website.badge_text,data?.label,badge)||badge,shortLabel:fallbackText(website.short_label,data?.tier,data?.name,"Rarity")||"Rarity",aura:website.aura!==false&&effects.background_aura!==false,shimmer:website.shimmer===true,particles:website.particles===true,panel:effects.rarity_panel!==false};
  }
  function render(player,context){
    const C=core(), ctx=context||{}, extensions=ctx.extensionsData||{}, source=extensions.badges_raritys||extensions.badges_rarities||{}, rarityId=getRarityId(player), esc=(v)=>C.escapeHtml(String(v??""));
    const aliases=rarityId?[rarityId,rarityId.replace(/^rarity_id_/i,"raritys_id_"),rarityId.replace(/^raritys_id_/i,"rarity_id_")]:[];
    const key=aliases.find(k=>source?.[k])||"", data=C.mergeBadge(key?source[key]:null)||{};
    const stats=player?.stats&&typeof player.stats==="object"?player.stats:{}, combat=stats?.combat&&typeof stats.combat==="object"?stats.combat:{}, rarityStats=stats?.rarity&&typeof stats.rarity==="object"?stats.rarity:{}, visual=resolveRarityVisualData(data,rarityStats);
    const asNumber=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f;};
    const integer=(v)=>new Intl.NumberFormat("pt-BR",{maximumFractionDigits:0}).format(Math.max(0,Math.round(asNumber(v,0))));
    const ratio=(v)=>{const n=asNumber(v,0);return Number.isInteger(n)?String(n):n.toFixed(2).replace(/0+$/,"").replace(/\.$/,"");};
    return `<aside class="vl-public-secondary vl-public-secondary--compact vl-public-quickstats vl-public-quickstats--rebuild" aria-label="Dados públicos do jogador">
      <div class="vl-public-quickstats__frame-corner vl-public-quickstats__frame-corner--tl" aria-hidden="true"></div>
      <div class="vl-public-quickstats__frame-corner vl-public-quickstats__frame-corner--br" aria-hidden="true"></div>
      <div class="vl-public-secondary__topline vl-public-quickstats__header"><span>Dados públicos</span><small>Resumo</small></div>
      <section class="vl-public-quickstats__rarity vl-public-quickstats__rarity--hero${visual.aura?" has-rarity-aura":""}${visual.shimmer?" has-rarity-shimmer":""}${visual.particles?" has-rarity-particles":""}" aria-label="Rarity" data-rarity-panel="${visual.panel?"1":"0"}" style="--rarity-color:${esc(visual.color)};--rarity-color-2:${esc(visual.color2)};--rarity-glow:${esc(visual.glow)};--rarity-gradient:${esc(visual.gradient)};--rarity-intensity:${esc(visual.intensity)};">
        <span class="vl-public-quickstats__rarity-mark vl-public-quickstats__rarity-mark--hero" aria-hidden="true"><i></i></span>
        <div class="vl-public-quickstats__rarity-copy vl-public-quickstats__rarity-copy--hero"><strong>${esc(visual.badgeText)}</strong><small>${esc(visual.shortLabel)}</small></div>
      </section>
      <div class="vl-public-quickstats__divider"></div>
      <section class="vl-public-quickstats__combat vl-public-quickstats__combat--hero" aria-label="Estatísticas de combate">
        <div class="vl-public-quickstats__combat-title"><span class="vl-public-quickstats__combat-icon" aria-hidden="true">⚔</span><strong>Combate</strong></div>
        <div class="vl-public-quickstats__combat-grid vl-public-quickstats__combat-grid--hero">
          <span><small>Kills</small><strong>${esc(integer(combat.kills))}</strong></span><span><small>Deaths</small><strong>${esc(integer(combat.deaths))}</strong></span><span><small>Assists</small><strong>${esc(integer(combat.assists))}</strong></span><span><small>K/D</small><strong>${esc(ratio(combat.kd_ratio))}</strong></span>
        </div>
      </section>
    </aside>`;
  }
  window.VelarionProfileStats={render};
})(window);
