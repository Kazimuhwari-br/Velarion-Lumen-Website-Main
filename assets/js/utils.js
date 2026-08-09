/**
 * Utilidades Globais - Velarion Lumen
 * Funções reutilizáveis para o site inteiro
 */

const VL = {
  // DOM Helpers
  query: (sel, parent = document) => parent.querySelector(sel),
  queryAll: (sel, parent = document) => Array.from(parent.querySelectorAll(sel)),
  
  // Event Delegation
  on: (el, evt, sel, fn) => {
    el?.addEventListener(evt, (e) => {
      if (e.target?.closest(sel)) fn(e);
    });
  },
  once: (el, evt, fn) => el?.addEventListener(evt, fn, { once: true }),
  
  // Class Manipulation
  addClass: (el, cls) => el?.classList.add(cls),
  removeClass: (el, cls) => el?.classList.remove(cls),
  toggleClass: (el, cls, force) => el?.classList.toggle(cls, force),
  hasClass: (el, cls) => el?.classList.contains(cls),
  
  // Attributes
  attr: (el, key, val) => val !== undefined ? (el?.setAttribute(key, val), el) : el?.getAttribute(key),
  removeAttr: (el, key) => (el?.removeAttribute(key), el),
  data: (el, key, val) => val !== undefined ? (el?.dataset[key] = val, el) : el?.dataset[key],
  
  // Storage (safe)
  storage: {
    get: (key) => {
      try { return localStorage?.getItem(key); } catch (e) { return null; }
    },
    set: (key, val) => {
      try { localStorage?.setItem(key, val); return true; } catch (e) { return false; }
    },
    remove: (key) => {
      try { localStorage?.removeItem(key); return true; } catch (e) { return false; }
    }
  },
  
  // URL Params
  getParam: (name) => new URLSearchParams(location.search).get(name),
  hasParam: (name) => new URLSearchParams(location.search).has(name),
  
  // Debounce/Throttle
  debounce: (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },
  throttle: (fn, limit) => {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  // Animations
  fadeIn: (el, duration = 300) => {
    el.style.opacity = '0';
    el.style.display = 'block';
    requestAnimationFrame(() => {
      el.style.transition = `opacity ${duration}ms ease`;
      el.style.opacity = '1';
    });
  },
  fadeOut: (el, duration = 300) => {
    el.style.transition = `opacity ${duration}ms ease`;
    el.style.opacity = '0';
    setTimeout(() => el.style.display = 'none', duration);
  },
  
  // AJAX Helper
  fetch: async (url, options = {}) => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('Fetch error:', e);
      return null;
    }
  },
  
  // Scroll
  scrollTo: (el, smooth = true) => {
    el?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
  },
  
  // Intersection Observer (lazy load)
  observe: (selector, fn, options = {}) => {
    if (!window.IntersectionObserver) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => e.isIntersecting && fn(e));
    }, { threshold: 0.1, ...options });
    VL.queryAll(selector).forEach(el => observer.observe(el));
    return observer;
  }
};

// Export for modern modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VL;
}
