/**
 * Sistema de Temas - Velarion Lumen
 * Suporte a dark/light mode e temas customizáveis
 */

const VLTheme = (function() {
  const STORAGE_KEY = 'vl-theme';
  const THEME_CLASS = 'theme';
  
  const THEMES = {
    dark: {
      name: 'Escuro (Padrão)',
      colors: {
        '--bg': '#070914',
        '--bg-2': '#0d1024',
        '--panel': 'rgba(17,22,46,.74)',
        '--panel-2': 'rgba(24,31,62,.68)',
        '--line': 'rgba(170,183,255,.18)',
        '--line-strong': 'rgba(142,111,255,.38)',
        '--text': '#eef2ff',
        '--muted': '#a8b1d6',
        '--soft': '#737da8',
        '--violet': '#8f6bff',
        '--cyan': '#5ee6ff',
        '--gold': '#ffd071',
        '--pink': '#ff6bd6',
        '--green': '#7dffbf',
        '--danger': '#ff6b91'
      }
    },
    
    light: {
      name: 'Claro',
      colors: {
        '--bg': '#f5f7fb',
        '--bg-2': '#e9ecf3',
        '--panel': 'rgba(255,255,255,.9)',
        '--panel-2': 'rgba(240,244,252,.95)',
        '--line': 'rgba(0,0,0,.08)',
        '--line-strong': 'rgba(143,107,255,.25)',
        '--text': '#1a1a2e',
        '--muted': '#6b7280',
        '--soft': '#9ca3af',
        '--violet': '#7c3aed',
        '--cyan': '#0891b2',
        '--gold': '#d97706',
        '--pink': '#ec4899',
        '--green': '#10b981',
        '--danger': '#ef4444'
      }
    },
    
    ocean: {
      name: 'Oceano',
      colors: {
        '--bg': '#0a1428',
        '--bg-2': '#0d1b2a',
        '--panel': 'rgba(13,27,42,.75)',
        '--panel-2': 'rgba(25,44,70,.7)',
        '--line': 'rgba(101,194,255,.2)',
        '--line-strong': 'rgba(101,194,255,.4)',
        '--text': '#e8f4f8',
        '--muted': '#a1bfcc',
        '--soft': '#7a9aaa',
        '--violet': '#5b7c9a',
        '--cyan': '#65c2ff',
        '--gold': '#ffc857',
        '--pink': '#ff6b9d',
        '--green': '#4ecdc4',
        '--danger': '#ff5e5b'
      }
    },
    
    forest: {
      name: 'Floresta',
      colors: {
        '--bg': '#0f1419',
        '--bg-2': '#1a2428',
        '--panel': 'rgba(26,36,40,.76)',
        '--panel-2': 'rgba(40,57,60,.72)',
        '--line': 'rgba(76,175,80,.18)',
        '--line-strong': 'rgba(76,175,80,.35)',
        '--text': '#e8f5e9',
        '--muted': '#a5d6a7',
        '--soft': '#81c784',
        '--violet': '#66bb6a',
        '--cyan': '#4db6ac',
        '--gold': '#ffb74d',
        '--pink': '#ff80ab',
        '--green': '#69f0ae',
        '--danger': '#ff6e6e'
      }
    }
  };
  
  function applyTheme(themeName) {
    const theme = THEMES[themeName];
    if (!theme) return false;
    
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    root.setAttribute('data-theme', themeName);
    document.documentElement.classList.remove(...Object.keys(THEMES));
    document.documentElement.classList.add(themeName);
    
    try {
      localStorage.setItem(STORAGE_KEY, themeName);
    } catch (e) {}
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: themeName } }));
    
    return true;
  }
  
  function loadSavedTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && THEMES[saved]) {
        applyTheme(saved);
        return saved;
      }
    } catch (e) {}
    return null;
  }
  
  function detectSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }
  
  function initializeTheme() {
    const saved = loadSavedTheme();
    if (!saved) {
      const system = detectSystemPreference();
      applyTheme(system);
    }
    
    // Listen for system changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(STORAGE_KEY)) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }
  
  // Public API
  return {
    init: initializeTheme,
    set: applyTheme,
    get: () => document.documentElement.getAttribute('data-theme') || 'dark',
    list: () => Object.entries(THEMES).map(([key, val]) => ({ id: key, name: val.name })),
    toggle: (themeName) => applyTheme(themeName || (VLTheme.get() === 'dark' ? 'light' : 'dark')),
    listen: (callback) => {
      window.addEventListener('theme-changed', (e) => callback(e.detail.theme));
    }
  };
})();

// Auto-initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => VLTheme.init());
} else {
  VLTheme.init();
}
