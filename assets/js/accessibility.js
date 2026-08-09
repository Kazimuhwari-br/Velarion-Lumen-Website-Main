/**
 * Acessibilidade (a11y) - Velarion Lumen
 * Suporte a screen readers, keyboard navigation, etc
 */

const VLAccessibility = (function() {
  /**
   * Setup keyboard navigation
   */
  function setupKeyboardNavigation() {
    // Escape key to close modals/menus
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const menuToggle = document.querySelector('[data-menu-toggle]');
        if (menuToggle && document.body.classList.contains('menu-open')) {
          menuToggle.click();
        }
      }
      
      // Tab navigation improvements
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-nav');
      }
    });
    
    // Remove keyboard-nav class on mouse
    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-nav');
    });
  }
  
  /**
   * Enhance focus management
   */
  function setupFocusManagement() {
    // Add visible focus style
    const style = document.createElement('style');
    style.textContent = `
      body.keyboard-nav a:focus,
      body.keyboard-nav button:focus,
      body.keyboard-nav input:focus,
      body.keyboard-nav textarea:focus,
      body.keyboard-nav select:focus {
        outline: 2px solid var(--cyan);
        outline-offset: 2px;
      }
      
      /* Remove default outline only when not keyboard navigating */
      a:focus,
      button:focus,
      input:focus,
      textarea:focus,
      select:focus {
        outline: none;
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * Add ARIA labels to interactive elements
   */
  function addAriaLabels() {
    // Menu toggle
    const menuToggle = document.querySelector('[data-menu-toggle]');
    if (menuToggle && !menuToggle.getAttribute('aria-label')) {
      menuToggle.setAttribute('aria-label', 'Abrir menu de navegação');
      menuToggle.setAttribute('aria-controls', 'site-nav');
    }
    
    // Navigation links
    document.querySelectorAll('[data-nav]').forEach(link => {
      if (!link.getAttribute('aria-label')) {
        const text = link.textContent.trim();
        link.setAttribute('aria-label', `Ir para ${text}`);
      }
    });
  }
  
  /**
   * Setup skip link for screen readers
   */
  function setupSkipLink() {
    if (document.querySelector('.skip-to-content')) return;
    
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-to-content';
    skipLink.textContent = 'Pular para conteúdo principal';
    skipLink.style.cssText = `
      position: absolute;
      left: -9999px;
      z-index: 999;
      padding: 8px 12px;
      background: var(--violet);
      color: white;
      text-decoration: none;
      border-radius: 4px;
    `;
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.left = '10px';
      skipLink.style.top = '10px';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.left = '-9999px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
  }
  
  /**
   * Add ARIA live regions for dynamic content
   */
  function setupLiveRegions() {
    if (document.querySelector('[aria-live="polite"]')) return;
    
    const live = document.createElement('div');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    live.id = 'a11y-live-region';
    live.style.cssText = 'position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;';
    document.body.appendChild(live);
  }
  
  /**
   * Announce changes to screen readers
   */
  function announce(message) {
    const live = document.getElementById('a11y-live-region');
    if (live) {
      live.textContent = message;
    }
  }
  
  /**
   * Setup color contrast checker
   */
  function checkContrast() {
    const elements = document.querySelectorAll('*');
    let issues = 0;
    
    elements.forEach(el => {
      if (el.offsetParent === null) return; // Skip hidden elements
      
      const styles = window.getComputedStyle(el);
      const bgColor = styles.backgroundColor;
      const color = styles.color;
      
      // Simple check: if both are light or both are dark, warn
      if ((bgColor.includes('rgb') && color.includes('rgb'))) {
        // Contrast ratio calculation would go here
        // For now, just log if both text and bg are nearly same value
      }
    });
    
    if (issues > 0) {
      console.warn(`Accessibility: Found ${issues} potential contrast issues`);
    }
  }
  
  /**
   * Improve form accessibility
   */
  function improveFormAccessibility() {
    document.querySelectorAll('input, textarea, select').forEach(input => {
      if (!input.id) {
        input.id = `input-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // If there's a preceding label, connect them
      const label = input.previousElementSibling;
      if (label && label.tagName === 'LABEL' && !label.getAttribute('for')) {
        label.setAttribute('for', input.id);
      }
    });
  }
  
  /**
   * Make cards keyboard accessible
   */
  function makeCardsAccessible() {
    document.querySelectorAll('.card, [role="button"]').forEach(card => {
      if (!card.hasAttribute('tabindex')) {
        card.setAttribute('tabindex', '0');
      }
      
      if (!card.hasAttribute('role') && !card.tagName === 'BUTTON' && !card.tagName === 'A') {
        card.setAttribute('role', 'button');
      }
      
      // Add Enter key support for card clicks
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });
  }
  
  /**
   * Test accessibility on page
   */
  function runAccessibilityAudit() {
    const issues = [];
    
    // Check for missing alt text
    document.querySelectorAll('img').forEach(img => {
      if (!img.alt && !img.getAttribute('aria-label')) {
        issues.push(`Image missing alt text: ${img.src}`);
      }
    });
    
    // Check for missing lang attribute
    if (!document.documentElement.lang) {
      issues.push('Missing lang attribute on <html>');
    }
    
    // Check for heading hierarchy
    let lastHeadingLevel = 0;
    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(heading => {
      const level = parseInt(heading.tagName[1]);
      if (level - lastHeadingLevel > 1 && lastHeadingLevel > 0) {
        issues.push(`Heading hierarchy broken: H${lastHeadingLevel} -> H${level}`);
      }
      lastHeadingLevel = level;
    });
    
    if (issues.length > 0) {
      console.warn('Accessibility Audit Issues:', issues);
    } else {
      console.log('✓ Accessibility audit passed');
    }
    
    return issues;
  }
  
  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupKeyboardNavigation();
      setupFocusManagement();
      addAriaLabels();
      setupSkipLink();
      setupLiveRegions();
      improveFormAccessibility();
      makeCardsAccessible();
      checkContrast();
    });
  } else {
    setupKeyboardNavigation();
    setupFocusManagement();
    addAriaLabels();
    setupSkipLink();
    setupLiveRegions();
    improveFormAccessibility();
    makeCardsAccessible();
    checkContrast();
  }
  
  return {
    init: setupKeyboardNavigation,
    announce: announce,
    audit: runAccessibilityAudit
  };
})();

// Auto-run audit in dev mode
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.addEventListener('load', () => {
    setTimeout(() => VLAccessibility.audit(), 500);
  });
}
