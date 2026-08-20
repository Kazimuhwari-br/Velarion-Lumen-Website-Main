/* ======================================================================
   Velarion Profile — Documento do Aventureiro (runtime)
   ====================================================================== */
(function(window, document) {
  "use strict";

  if (window.VelarionProfileDocument) {
    window.VelarionProfileDocument.refresh?.(document);
    return;
  }

  function coreHelper(name) {
    return window.VelarionProfile?.helpers?.[name];
  }

  function isValidCardHex(value) {
    const helper = coreHelper("isValidCardHex");
    return typeof helper === "function" ? helper(value) : /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || "").trim());
  }

  function normalizeProfileCardColorType(value) {
    const helper = coreHelper("normalizeProfileCardColorType");
    if (typeof helper === "function") return helper(value);
    const raw = String(value || "").trim().toLowerCase();
    return ["none", "gradient", "rotate", "pulse", "rainbow"].includes(raw) ? raw : "none";
  }


  function applyDocumentRuntimeColor(card, color) {
    if (!card || !isValidCardHex(color)) return;
    card.style.setProperty("--vp-document-accent", color);
    card.style.setProperty("--vp-document-color", color);
  }

  const profileDocumentColorRuntime = {
    cards: new Set(),
    raf: 0
  };

  function updateProfileDocumentColors() {
    let active = false;

    profileDocumentColorRuntime.cards.forEach((documentCard) => {
      if (!documentCard || !documentCard.isConnected) {
        profileDocumentColorRuntime.cards.delete(documentCard);
        return;
      }

      const type = normalizeProfileCardColorType(documentCard.dataset.vpCardColorType);
      if (!["rotate", "pulse"].includes(type)) return;

      const stage = documentCard.closest(".vl-profile-stage") || document;
      const officialCard = stage.querySelector(".vl-card[data-card-color-type]");
      if (!officialCard) return;

      const liveColor = getComputedStyle(officialCard).getPropertyValue("--card-color").trim();
      if (isValidCardHex(liveColor)) {
        applyDocumentRuntimeColor(documentCard, liveColor);
        active = true;
      }
    });

    if (active || profileDocumentColorRuntime.cards.size) {
      profileDocumentColorRuntime.raf = requestAnimationFrame(updateProfileDocumentColors);
    } else {
      profileDocumentColorRuntime.raf = 0;
    }
  }

  function setupProfileDocumentColorEffects(root) {
    const scope = root || document;
    scope.querySelectorAll(".vl-profile-public-id-card[data-vp-card-color-type]").forEach((documentCard) => {
      const type = normalizeProfileCardColorType(documentCard.dataset.vpCardColorType);
      if (["rotate", "pulse"].includes(type)) {
        profileDocumentColorRuntime.cards.add(documentCard);
      }
    });

    if (profileDocumentColorRuntime.cards.size && !profileDocumentColorRuntime.raf) {
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

  function refresh(root) {
    ensureVerifiedPopoverEvents();
    setupProfileDocumentColorEffects(root || document);
  }

  window.VelarionProfileDocument = { refresh };
  refresh(document);
})(window, document);
