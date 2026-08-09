/**
 * Sistema de Favoritos - Velarion Lumen
 * Salvar, gerenciar e sincronizar favoritos
 */

const VLFavorites = (function() {
  const STORAGE_KEY = 'vl-favorites';
  const favorites = new Set();
  
  function safeStorage() {
    try { return window.localStorage; } catch { return null; }
  }
  
  function load() {
    const storage = safeStorage();
    if (!storage) return;
    
    try {
      const data = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
      favorites.clear();
      data.forEach(id => favorites.add(id));
    } catch (e) {
      console.error('Failed to load favorites:', e);
    }
  }
  
  function save() {
    const storage = safeStorage();
    if (!storage) return;
    
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(Array.from(favorites)));
      dispatch('favorites-changed');
    } catch (e) {
      console.error('Failed to save favorites:', e);
    }
  }
  
  function dispatch(event, detail = {}) {
    window.dispatchEvent(new CustomEvent(event, { detail }));
  }
  
  // Public API
  return {
    init: () => load(),
    
    add: (id) => {
      if (!id) return false;
      const isNew = !favorites.has(id);
      favorites.add(id);
      if (isNew) save();
      dispatch('favorite-added', { id });
      return true;
    },
    
    remove: (id) => {
      const existed = favorites.has(id);
      favorites.delete(id);
      if (existed) save();
      dispatch('favorite-removed', { id });
      return existed;
    },
    
    toggle: (id) => {
      return favorites.has(id) ? VLFavorites.remove(id) : VLFavorites.add(id);
    },
    
    has: (id) => favorites.has(id),
    
    getAll: () => Array.from(favorites),
    
    count: () => favorites.size,
    
    clear: () => {
      favorites.clear();
      save();
      dispatch('favorites-cleared');
    },
    
    export: () => ({
      version: 1,
      exported: new Date().toISOString(),
      favorites: Array.from(favorites)
    }),
    
    import: (data) => {
      if (!data || !Array.isArray(data.favorites)) return false;
      favorites.clear();
      data.favorites.forEach(id => favorites.add(id));
      save();
      dispatch('favorites-imported');
      return true;
    },
    
    listen: (event, callback) => {
      window.addEventListener(event, (e) => callback(e.detail));
    }
  };
})();

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => VLFavorites.init());
} else {
  VLFavorites.init();
}
