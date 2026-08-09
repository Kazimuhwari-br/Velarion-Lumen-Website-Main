/**
 * Otimizações de Performance - Velarion Lumen
 * Lazy loading, prefetch, caching, etc
 */

const VLPerformance = (function() {
  const lazyLoadObserver = {};
  const prefetchQueue = [];
  let isPrefetching = false;
  
  /**
   * Setup lazy loading for images
   */
  function setupLazyImages() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            if (img.dataset.srcset) {
              img.srcset = img.dataset.srcset;
              img.removeAttribute('data-srcset');
            }
            observer.unobserve(img);
          }
        });
      }, { rootMargin: '50px' });
      
      document.querySelectorAll('img[data-src], img[data-srcset]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }
  
  /**
   * Setup lazy loading for iframes
   */
  function setupLazyIframes() {
    if ('IntersectionObserver' in window) {
      const iframeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const iframe = entry.target;
            if (iframe.dataset.src) {
              iframe.src = iframe.dataset.src;
              iframe.removeAttribute('data-src');
            }
            observer.unobserve(iframe);
          }
        });
      }, { rootMargin: '100px' });
      
      document.querySelectorAll('iframe[data-src]').forEach(iframe => {
        iframeObserver.observe(iframe);
      });
    }
  }
  
  /**
   * Prefetch next page
   */
  function prefetchPage(url) {
    if (!('link' in document)) return;
    
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    link.as = 'document';
    document.head.appendChild(link);
  }
  
  /**
   * DNS prefetch
   */
  function dnsPrefetch(domain) {
    if (!('link' in document)) return;
    
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
  }
  
  /**
   * Preconnect to domain
   */
  function preconnect(domain) {
    if (!('link' in document)) return;
    
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;
    document.head.appendChild(link);
  }
  
  /**
   * Report performance metrics
   */
  function reportMetrics() {
    if ('PerformanceObserver' in window) {
      try {
        // Core Web Vitals
        const po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            console.log('Performance:', entry.name, entry.value);
          }
        });
        
        po.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      } catch (e) {
        console.error('Performance reporting error:', e);
      }
    }
  }
  
  /**
   * Memory usage info
   */
  function getMemoryInfo() {
    if ('memory' in performance) {
      return {
        used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
        percentage: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(2) + '%'
      };
    }
    return null;
  }
  
  /**
   * Request idle callback with fallback
   */
  function scheduleIdle(callback) {
    if ('requestIdleCallback' in window) {
      return requestIdleCallback(callback);
    }
    return setTimeout(callback, 1);
  }
  
  /**
   * Network info
   */
  function getNetworkInfo() {
    if ('connection' in navigator) {
      const conn = navigator.connection;
      return {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink + ' Mbps',
        rtt: conn.rtt + ' ms',
        saveData: conn.saveData
      };
    }
    return null;
  }
  
  // Setup on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupLazyImages();
      setupLazyIframes();
    });
  } else {
    setupLazyImages();
    setupLazyIframes();
  }
  
  return {
    init: () => {
      setupLazyImages();
      setupLazyIframes();
      reportMetrics();
    },
    
    lazyLoad: {
      images: setupLazyImages,
      iframes: setupLazyIframes
    },
    
    prefetch: {
      page: prefetchPage,
      dns: dnsPrefetch,
      preconnect: preconnect
    },
    
    memory: getMemoryInfo,
    network: getNetworkInfo,
    scheduleIdle: scheduleIdle,
    
    /**
     * Measure function execution time
     */
    measure: async (name, fn) => {
      const start = performance.now();
      const result = await fn();
      const duration = performance.now() - start;
      console.log(`${name}: ${duration.toFixed(2)}ms`);
      return result;
    },
    
    /**
     * Throttle function calls
     */
    throttle: (fn, limit) => {
      let inThrottle;
      return (...args) => {
        if (!inThrottle) {
          fn(...args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    }
  };
})();

// Auto-initialize on ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => VLPerformance.init());
} else {
  VLPerformance.init();
}
