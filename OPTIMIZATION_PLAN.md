# Plano de Otimização — Velarion Lumen Website

## Diagnóstico Geral

O projeto possui ~4500 linhas em main.js (monolito), ~2000 linhas em velarion-profile-page.js com massiva duplicação, 2064 linhas em style.css com 5 PATCH versions do boot loader, e 12 páginas HTML com ~87 linhas de boilerplate idênticas. Sem sistema de build, sem minificação, sem bundling.

---

## FASE 1: Extração de Shared Utilities (Crítico — elimina ~3000 linhas duplicadas)

**Objetivo:** Consolidar funções utilitárias duplicadas em 5-7 arquivos em um único módulo.

### 1.1 Criar `velarion-shared.js`
Extrair para um módulo compartilhado todas as funções que estão duplicadas em main.js, velarion-profile-page.js, velarion-card.js, velarion-codex-card.js, velarion-profile-core.js, velarion-rankings.js:

| Função | Atualmente duplicada em |
|--------|------------------------|
| `escapeHtml()` | main.js, profile-page.js, card.js, codex-card.js, profile-core.js, rankings.js |
| `cleanValue()` | main.js, profile-page.js, card.js, codex-card.js, profile-core.js, rankings.js |
| `stripMinecraftCodes()` | main.js, profile-page.js, card.js, codex-card.js, profile-core.js, rankings.js |
| `minecraftToHtml()` | main.js, profile-page.js, card.js, codex-card.js, profile-core.js |
| `normalizeHexColor()` / `hexToRgba()` | main.js, profile-page.js, card.js, codex-card.js, profile-core.js |
| `mcColors` map + `GradientsColor` | main.js, profile-page.js, card.js, codex-card.js |
| `getMediaUrl()` / `normalizePossibleUrl()` | main.js, profile-page.js, card.js, codex-card.js |
| Badge system (mergeBadgeRecord, isBadgeEnabled, etc.) | main.js, profile-page.js |
| Player data accessors (getDisplayName, getUsername, etc.) | main.js, profile-page.js |
| Color resolution chain (server panel, nickname color) | main.js, profile-page.js |
| HTML builders (buildTitleHtml, buildLevelChipHtml, etc.) | main.js, profile-page.js |
| Country flag utilities | main.js, profile-page.js |
| `countryCodeToFlag()` | main.js, profile-page.js |

**Estrutura proposta:**
```js
// velarion-shared.js — window.VelarionShared
window.VelarionShared = (function() {
  return {
    escapeHtml, cleanValue, stripMinecraftCodes, minecraftToHtml,
    mcColors, GradientsColor, normalizeHexColor, hexToRgba,
    getMediaUrl, normalizePossibleUrl, mergeBadgeRecord,
    isBadgeEnabled, isBadgeVisible, getBadgeSortValue,
    getDisplayName, getUsername, getCardTitle, getLevelText,
    buildTitleHtml, buildLevelChipHtml, buildCountryFlagHtml,
    countryCodeToFlag, normalize, getFallbacks, ...
  };
})();
```

### 1.2 Atualizar velarion-profile-core.js
Fazer `VelarionProfileCore` importar de `VelarionShared` em vez de reimplementar. Manter apenas funções exclusivas do profile.

### 1.3 Remover duplicações de main.js
Substituir todas as funções utilitárias em main.js por delegações a `VelarionShared.*`.

### 1.4 Remover duplicações de velarion-profile-page.js
Este arquivo contém ~1000+ linhas que são cópias idênticas de main.js. Após extrair para shared, reduzir para apenas lógica exclusiva da página de perfil.

### 1.5 Atualizar velarion-card.js, velarion-codex-card.js, velarion-rankings.js
Cada um reimplementa escapeHtml, cleanValue, minecraftToHtml, etc. Substituir por `VelarionShared.*`.

**Esperado:** Redução de ~3000-4000 linhas duplicadas.

---

## FASE 2: Sistema de Templates HTML (elimina ~1000 linhas HTML duplicadas)

**Objetivo:** Extrair boilerplate HTML repetido em 12 páginas.

### 2.1 Criar `components/header.html` + `components/footer.html`
Extrair o header/nav (~25 linhas) e footer (~8 linhas) que são idênticos em todas as 12 páginas.

### 2.2 Criar `components/boot-loader.html`
O bloco `<div id="summonBoot">` (~27 linhas) é copiado idêntico em 12 páginas.

### 2.3 Criar `components/maintenance-check.js`
O IIFE de maintenance redirect (~27 linhas) está em 12 páginas. Mover para um arquivo JS independente.

### 2.4 Extrair inline styles do codex
`aventureiros.html` e `habitantes.html` compartilham ~210 linhas de CSS inline idênticas → criar `velarion-codex-page.css`.

### 2.5 Padronizar version strings
Unificar os cache-busting strings para um único valor de versão consistente.

**Nota:** Como não há sistema de build (sem SSG), as páginas continuam estáticas mas com menos duplicação. Considere adicionar um build script simples com sed/includes se o projeto crescer.

**Esperado:** ~1000 linhas HTML eliminadas, CSS inline movido para arquivo externo.

---

## FASE 3: Limpeza de CSS (elimina redundâncias e reduz especificidade)

**Objetivo:** Resolver as "CSS specificity wars" e remover código morto.

### 3.1 Remover PATCH V3-V7 do boot loader em style.css
Há 5 blocos de PATCH versions (V3, V4, V5, V6, V7) que se sobrescrevem com `!important`. Manter apenas a versão final (V7) e remover as anteriores.

### 3.2 Consolidar estilos duplicados do card
`style.css` define estilos de card DUAS vezes (uma versão básica e uma com clip-path). Remover a versão não utilizada.

### 3.3 Remover duplicações entre style.css e responsive.css
Ambos definem breakpoints e regras responsivas. Consolidar em um único arquivo de responsivo.

### 3.4 Reduzir uso de !important
`responsive.css` usa `!important` em quase todas as declarações (~100+ vezes). Remover e usar especificidade adequada.

### 3.5 Limpar overrides desnecessários de profile detail view
`style.css` tem ~200 linhas de `!important` para `.vl-profile-detail`. Integrar corretamente na cascata.

### 3.6 Consolidar velarion-profile.css
Avaliar se velarion-profile.css (carregado em TODAS as páginas) deveria ser carregado apenas nas páginas que usam profiles.

**Esperado:** Redução de ~400-600 linhas CSS, eliminação de conflitos de especificidade.

---

## FASE 4: Modularização de main.js (reduz monolito de 4500 para ~800 linhas)

**Objetivo:** Dividir main.js em módulos focados.

### 4.1 Extrair `vl-boot.js` (boot loader logic)
Toda a lógica do boot loader (background rotation, progress bar, cleanup, event handlers) → ~200 linhas.

### 4.2 Extrair `vl-data-loader.js` (Firebase data)
Toda a lógica de fetch/processamento de dados Firebase (fetchPlayers, fetchNpcs, fetchClans, fetchExtensions) → ~300 linhas.

### 4.3 Extrair `vl-card-renderer.js` (card rendering + 3D effects)
createCard, createListCard, attach3DEffect, update3DCard, reset3DCard, attachListGlow → ~400 linhas.

### 4.4 Extrair `vl-detail-view.js` (detail view overlay)
createDetailView, createLegacyDetailView, animateOpenDetail, animateCloseDetail, body scroll lock → ~300 linhas.

### 4.5 Extrair `vl-pagination.js` (pagination)
renderPaginationActions, getVisiblePageNumbers → ~100 linhas.

### 4.6 Extrair `vl-search-filter.js` (search integration)
applySearch e integração com VLSearch → ~50 linhas.

### 4.7 Manter main.js como orchestrator
main.js fica como ponto de entrada que orquestra: init → boot → data load → render.

**Nota:** Sem sistema de módulos ES6 (o projeto usa scripts defer), criar módulos via IIFE + globals. Prioridade: manter compatibilidade com o sistema atual de `<script defer>`.

**Esperado:** main.js reduzido de ~4500 para ~800-1000 linhas, código organizado por responsabilidade.

---

## FASE 5: Otimizações de Performance

### 5.1 Lazy loading de CSS não essencial
`velarion-profile.css` (carregado em todas as páginas) deveria ser carregado apenas quando necessário.

### 5.2 Remover scripts não utilizados
Verificar se todos os 8 scripts head-loaded (utils, theme, favorites, toast, search, performance, accessibility) são realmente usados em cada página. Em pages/ que só carregam main.js, remover imports desnecessários.

### 5.3 Compressão de imagens
Verificar tamanho das imagens em assets/img/ e otimizar (WebP, lazy loading).

### 5.4 DNS prefetch para Firebase
Adicionar `<link rel="dns-prefetch" href="https://kazimuhwaribedrock-default-rtdb.firebaseio.com">` no head de todas as páginas que usam Firebase.

### 5.5 Consolidar CSS files
Combinar small CSS files (velarion-profile.css + velarion-codex-card.css + velarion-rankings.css) em um bundle se não houver conflito.

---

## Ordem de Execução Recomendada

1. **FASE 1** (Shared Utilities) — Maior impacto, elimina a raiz da duplicação
2. **FASE 3** (CSS Cleanup) — Corrige os conflitos de especificidade que causam bugs visuais
3. **FASE 2** (HTML Templates) — Reduz duplicação HTML e melhora manutenção
4. **FASE 4** (JS Modularization) — Melhora organização do código
5. **FASE 5** (Performance) — Otimizações de carregamento

---

## Métricas de Sucesso

| Métrica | Antes | Meta |
|---------|-------|------|
| Linhas duplicadas (JS) | ~4000+ | <200 |
| Linhas duplicadas (HTML) | ~1000+ | <100 |
| main.js tamanho | ~4500 linhas | <1000 linhas |
| CSS !important usage | ~150+ | <20 |
| Boot loader PATCH versions | 5 (V3-V7) | 1 |
| Arquivos CSS do card duplicados | 2 | 1 |
| Scripts carregados por página | 8-10 | 3-5 (lazy load) |
| Version strings inconsistentes | 3 valores | 1 valor |
