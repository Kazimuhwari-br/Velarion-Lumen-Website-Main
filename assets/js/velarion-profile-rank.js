/* Velarion Profile Rank — componente autônomo. */
(function(window){
  "use strict";
  if (window.VelarionProfileRank) return;
  const TYPE="rank";
  function core(){ const api=window.VelarionProfileCore; if(!api) throw new Error("VelarionProfileRank requer velarion-profile-core.js."); return api; }
  function clean(value){ const C=core(); if(value===null||value===undefined||value===false) return ""; if(typeof value!=="string"&&typeof value!=="number") return ""; return C.stripMinecraftCodes(C.cleanValue(value)); }
  function fallback(...values){ for(const v of values){const t=clean(v);if(t)return t;} return ""; }
  function normalize(raw){ const C=core(), out=[],seen=new Set(); const push=(id,data)=>{const cleanId=C.cleanValue(id);if(!cleanId||seen.has(cleanId))return;seen.add(cleanId);out.push(data&&typeof data==="object"&&!Array.isArray(data)?Object.assign({},data,{id:cleanId}):{id:cleanId});}; const visit=(v)=>{if(v===null||v===undefined||v===false)return;if(typeof v==="string"||typeof v==="number"){push(v,null);return;}if(Array.isArray(v)){v.forEach(visit);return;}if(typeof v!=="object")return;const id=v.id||v.badge_id||v.role_id||v.rank_id||v.value;if(id){push(id,v);return;}Object.entries(v).forEach(([k,c])=>{if(/^(?:role|rank)_id_/i.test(k))push(k,c);else if(c&&typeof c==="object"&&!Array.isArray(c)){const ci=c.id||c.badge_id||c.role_id||c.rank_id;if(ci)push(ci,c);}});};visit(raw);return out; }
  function entries(player){ return TYPE==="role"?normalize(player?.badges?.role??player?.badges?.roles??player?.role?.badge_id??player?.role):normalize(player?.badges?.rank??player?.badges?.ranks??player?.rank?.badge_id); }
  function definition(id,extensions){ const C=core(), cleanId=C.cleanValue(id); if(!cleanId)return null; const source=TYPE==="role"?(extensions?.badges_roles||extensions?.badges_role||{}):(extensions?.badges_ranks||extensions?.badges_rank||{}); const direct=source&&typeof source==="object"?source[cleanId]:null; return direct&&typeof direct==="object"?(C.mergeBadge(direct)||direct):null; }
  function color(value,fallbackColor){const raw=String(value||"").trim();return /^#[0-9a-f]{3,8}$/i.test(raw)?raw:fallbackColor;}
  function date(value){const raw=clean(value);if(!raw)return "—";const d=new Date(raw);if(Number.isNaN(d.getTime()))return raw;try{return d.toLocaleString("pt-BR");}catch(_){return raw;}}
  function resolve(player,extensions){
    const isRole=TYPE==="role", entry=entries(player)[0]||null, def=entry?definition(entry.id,extensions):null, website=def?.website&&typeof def.website==="object"?def.website:{}, hierarchy=def?.hierarchy&&typeof def.hierarchy==="object"?def.hierarchy:{};
    const rawId=fallback(entry?.id,def?.id), human=rawId?rawId.replace(isRole?/^role_id_/i:/^rank_id_/i,"").replace(/[_-]+/g," "):"";
    const legacy=isRole?fallback(typeof player?.badges?.role==="string"?player.badges.role:"",typeof player?.rank?.role==="string"?player.rank.role:"",typeof player?.clan?.rank==="string"?player.clan.rank:""):fallback(typeof player?.badges?.rank==="string"?player.badges.rank:"",typeof player?.rank?.name==="string"?player.rank.name:"");
    const title=fallback(def?.label,def?.name,def?.title,website?.label,website?.title,entry?.label,entry?.name,entry?.title,human,legacy,isRole?"Sem cargo":"Sem rank");
    const group=fallback(hierarchy?.group,def?.category,def?.group,website?.group,isRole?"role":"rank")||(isRole?"role":"rank");
    const description=fallback(def?.description,def?.desc,website?.description,website?.desc,entry?.description,entry?.desc,isRole?"Cargo do perfil.":"Rank do perfil.");
    const image=fallback(def?.image,def?.icon,def?.emblem,website?.image,website?.icon,website?.emblem,entry?.image,entry?.icon,entry?.emblem);
    const primary=color(fallback(def?.color,website?.color,def?.primary_color,website?.primary_color),isRole?"#d71920":"#f5c542");
    const secondary=color(fallback(def?.color2,website?.color2,def?.secondary_color,website?.secondary_color,def?.color,website?.color),isRole?"#f36565":"#ffe28a");
    const highlight=color(fallback(def?.glow,website?.glow,def?.highlight_color,website?.highlight_color,def?.color2,website?.color2),isRole?"#ffd3d3":"#fff3bf");
    return {title,id:rawId||"—",group,description,date:date(entry?.unlocked_at??entry?.assigned_at??entry?.created_at??def?.unlocked_at??def?.assigned_at??def?.created_at),image,primary,secondary,highlight};
  }
  function render(player,context){
    const C=core(), esc=(v)=>C.escapeHtml(String(v??"")), isRole=TYPE==="role", data=resolve(player,context?.extensionsData||{}), section=isRole?"Cargo":"Rank", eyebrow=isRole?"Função atual":"Classificação atual", sigil=isRole?"✦":"◆";
    const facts=isRole?[["Grupo",data.group,"⌂"],["Descrição",data.description,"▤"],["ID",data.id,"⌘"],["Data",data.date,"◷"]]:[["Classe",data.group,"◇"],["Descrição",data.description,"▤"],["ID",data.id,"⌘"],["Data",data.date,"◷"]];
    return `<section class="vl-system-zero vl-system-zero--${isRole?"role":"rank"}" style="--sz-primary:${esc(data.primary)};--sz-secondary:${esc(data.secondary)};--sz-highlight:${esc(data.highlight)}" aria-label="${esc(section)}: ${esc(data.title)}">
      <div class="vl-system-zero__grid" aria-hidden="true"></div><div class="vl-system-zero__beam" aria-hidden="true"></div>
      <header class="vl-system-zero__header"><div class="vl-system-zero__brand"><div><small>Sistema</small><strong>${esc(section)}</strong></div></div><span class="vl-system-zero__header-chevron" aria-hidden="true">⌃</span></header>
      <div class="vl-system-zero__hero"><div class="vl-system-zero__seal-wrap" aria-hidden="true"><span class="vl-system-zero__orbit vl-system-zero__orbit--a"></span><span class="vl-system-zero__orbit vl-system-zero__orbit--b"></span><span class="vl-system-zero__orbit vl-system-zero__orbit--c"></span><div class="vl-system-zero__seal">${data.image?`<img src="${esc(data.image)}" alt="" loading="eager" decoding="async">`:`<span>${sigil}</span>`}</div></div><div class="vl-system-zero__identity"><small>${esc(eyebrow)}</small><strong>${esc(data.title)}</strong><span>${esc(isRole?"Cargo principal":"Rank atual")}</span></div></div>
      <div class="vl-system-zero__facts">${facts.map(([label,value,icon])=>`<div class="vl-system-zero__fact"><span class="vl-system-zero__fact-icon" aria-hidden="true">${icon}</span><div><small>${esc(label)}</small><strong>${esc(value||"—")}</strong></div></div>`).join("")}</div>
      <footer class="vl-system-zero__footer" aria-hidden="true"><span></span><b>${isRole?"AUTHORITY NODE":"PROGRESSION NODE"}</b><span></span></footer>
    </section>`;
  }
  window.VelarionProfileRank={render};
})(window);
