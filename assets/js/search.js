/**
 * Sistema de Busca Avançada - Velarion Lumen
 * Busca com filtros, ordenação e cache
 */

const VLSearch = (function() {
  let searchCache = {};
  let filters = {
    type: null,
    level: null,
    status: null,
    region: null,
    sort: 'relevance'
  };
  
  /**
   * Normalize search query (remove accents, lowercase, trim)
   */
  function normalizeQuery(query) {
    return (query || '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
  
  /**
   * Check if item matches filter
   */
  function matchesFilters(item, currentFilters) {
    if (currentFilters.type && item.type !== currentFilters.type) return false;
    if (currentFilters.level && item.level !== currentFilters.level) return false;
    if (currentFilters.status && item.status !== currentFilters.status) return false;
    if (currentFilters.region && item.region !== currentFilters.region) return false;
    return true;
  }
  
  /**
   * Calculate relevance score
   */
  function scoreRelevance(item, query) {
    const normalized = normalizeQuery(item.name || item.title || '');
    const queryNorm = normalizeQuery(query);
    
    if (normalized === queryNorm) return 1000; // Exact match
    if (normalized.startsWith(queryNorm)) return 500; // Starts with
    if (normalized.includes(queryNorm)) return 300; // Contains
    return 0;
  }
  
  /**
   * Sort results
   */
  function sortResults(results, sortBy) {
    const copy = [...results];
    
    switch(sortBy) {
      case 'name':
        return copy.sort((a, b) => 
          (a.name || a.title || '').localeCompare(b.name || b.title || '')
        );
      
      case 'level':
        return copy.sort((a, b) => (b.level || 0) - (a.level || 0));
      
      case 'date':
        return copy.sort((a, b) => 
          new Date(b.date || 0) - new Date(a.date || 0)
        );
      
      case 'relevance':
      default:
        return copy; // Already sorted by relevance
    }
  }
  
  // Public API
  return {
    /**
     * Search items
     */
    search: (items, query, opts = {}) => {
      const q = query?.trim() || '';
      const currentFilters = { ...filters, ...opts.filters };
      
      // Early exit if empty query
      if (!q && !opts.filters) {
        return items
          .filter(item => matchesFilters(item, currentFilters))
          .sort((a, b) => {
            switch(currentFilters.sort) {
              case 'name':
                return (a.name || '').localeCompare(b.name || '');
              case 'level':
                return (b.level || 0) - (a.level || 0);
              default:
                return 0;
            }
          });
      }
      
      // Filter and score
      const scored = items
        .filter(item => matchesFilters(item, currentFilters))
        .map(item => ({
          ...item,
          _score: scoreRelevance(item, q)
        }))
        .filter(item => item._score > 0 || !q)
        .sort((a, b) => b._score - a._score);
      
      // Apply secondary sort
      return sortResults(scored, currentFilters.sort);
    },
    
    /**
     * Set/update filters
     */
    setFilters: (newFilters) => {
      filters = { ...filters, ...newFilters };
    },
    
    /**
     * Get current filters
     */
    getFilters: () => ({ ...filters }),
    
    /**
     * Reset filters
     */
    resetFilters: () => {
      filters = {
        type: null,
        level: null,
        status: null,
        region: null,
        sort: 'relevance'
      };
    },
    
    /**
     * Debounced search (returns promise)
     */
    searchAsync: VL.debounce((items, query, opts) => {
      return Promise.resolve(VLSearch.search(items, query, opts));
    }, 300),
    
    /**
     * Fuzzy search (more lenient)
     */
    fuzzySearch: (items, query) => {
      const q = normalizeQuery(query);
      if (!q) return items;
      
      const letters = q.split('');
      
      return items.filter(item => {
        let letterIndex = 0;
        const itemName = normalizeQuery(item.name || item.title || '');
        
        for (let i = 0; i < itemName.length && letterIndex < letters.length; i++) {
          if (itemName[i] === letters[letterIndex]) letterIndex++;
        }
        
        return letterIndex === letters.length;
      });
    },
    
    /**
     * Get suggestions based on query
     */
    getSuggestions: (items, query, limit = 5) => {
      if (!query || query.length < 2) return [];
      
      const q = normalizeQuery(query);
      
      return items
        .filter(item => {
          const name = normalizeQuery(item.name || item.title || '');
          return name.includes(q);
        })
        .slice(0, limit)
        .map(item => ({
          text: item.name || item.title || '',
          value: item.id || item.name
        }));
    }
  };
})();
