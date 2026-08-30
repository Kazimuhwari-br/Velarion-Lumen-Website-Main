/* Velarion Profile Username — componente autônomo. */
(function(window){
  "use strict";
  if (window.VelarionProfileUsername) return;
  function core(){ const api=window.VelarionProfileCore; if(!api) throw new Error("VelarionProfileUsername requer velarion-profile-core.js."); return api; }
  function formatDateTime(value){
    const C=core(); const raw=C.cleanValue(value); if(!raw) return "—";
    const date=new Date(raw); if(Number.isNaN(date.getTime())) return raw;
    try { return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(date); }
    catch(_){ return raw; }
  }
  function render(player){
    const C=core(); const esc=(v)=>C.escapeHtml(String(v??""));
    const username=C.cleanValue(player?.profile?.display_username)||C.cleanValue(player?.display_username)||C.cleanValue(player?.id)||"—";
    const registeredAt=player?.stats?.timestamps?.account_created_at;
    return `<section class="vl-adventurer-document" aria-label="Documento público do jogador">
      <div class="vl-adventurer-document__top">
        <span class="vl-adventurer-document__sigil" aria-hidden="true"><i></i></span>
        <div class="vl-adventurer-document__title vl-adventurer-document__title--username"><small>Username</small><strong>${esc(username)}</strong></div>
      </div>
      <div class="vl-adventurer-document__divider" aria-hidden="true"></div>
      <div class="vl-adventurer-document__rows vl-adventurer-document__rows--single">
        <div class="vl-adventurer-document__row vl-adventurer-document__row--registration">
          <span class="vl-adventurer-document__row-icon" aria-hidden="true">◷</span>
          <div><small>Registro</small><strong>${esc(formatDateTime(registeredAt))}</strong></div>
        </div>
      </div>
    </section>`;
  }
  window.VelarionProfileUsername={render};
})(window);
