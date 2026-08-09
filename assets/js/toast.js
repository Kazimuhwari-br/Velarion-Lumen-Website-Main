/**
 * Sistema de Notificações Toast - Velarion Lumen
 * Exibir mensagens não-intrusivas ao usuário
 */

const VLToast = (function() {
  const CONTAINER_ID = 'vl-toast-container';
  let container = null;
  
  function getContainer() {
    if (!container) {
      container = document.getElementById(CONTAINER_ID);
      if (!container) {
        container = document.createElement('div');
        container.id = CONTAINER_ID;
        container.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 400px;
          pointer-events: none;
        `;
        document.body.appendChild(container);
      }
    }
    return container;
  }
  
  function createToast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `vl-toast vl-toast-${type}`;
    toast.style.cssText = `
      padding: 16px 20px;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 12px;
      pointer-events: auto;
      animation: toastSlideIn 0.3s ease;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      border: 1px solid;
    `;
    
    const typeStyles = {
      success: {
        bg: 'rgba(125, 255, 191, 0.15)',
        border: 'rgba(125, 255, 191, 0.3)',
        color: '#7dffbf',
        icon: '✓'
      },
      error: {
        bg: 'rgba(255, 107, 145, 0.15)',
        border: 'rgba(255, 107, 145, 0.3)',
        color: '#ff6bd6',
        icon: '✕'
      },
      warning: {
        bg: 'rgba(255, 208, 113, 0.15)',
        border: 'rgba(255, 208, 113, 0.3)',
        color: '#ffd071',
        icon: '⚠'
      },
      info: {
        bg: 'rgba(94, 230, 255, 0.15)',
        border: 'rgba(94, 230, 255, 0.3)',
        color: '#5ee6ff',
        icon: 'ℹ'
      }
    };
    
    const style = typeStyles[type] || typeStyles.info;
    
    toast.style.background = style.bg;
    toast.style.borderColor = style.border;
    toast.style.color = style.color;
    
    toast.innerHTML = `
      <span style="font-weight: 900; font-size: 1.2em; min-width: 20px; text-align: center;">${style.icon}</span>
      <span style="flex: 1; line-height: 1.4;">${message}</span>
      <button style="
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        opacity: 0.7;
        font-size: 1.2em;
        padding: 0;
        padding-left: 8px;
        transition: opacity 0.2s;
      ">×</button>
    `;
    
    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('mouseover', () => closeBtn.style.opacity = '1');
    closeBtn.addEventListener('mouseout', () => closeBtn.style.opacity = '0.7');
    closeBtn.addEventListener('click', () => toast.remove());
    
    return toast;
  }
  
  if (!document.querySelector('style#vl-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'vl-toast-styles';
    style.textContent = `
      @keyframes toastSlideIn {
        from {
          opacity: 0;
          transform: translateX(400px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes toastSlideOut {
        to {
          opacity: 0;
          transform: translateX(400px);
        }
      }
      
      @media (max-width: 640px) {
        #vl-toast-container {
          left: 10px !important;
          right: 10px !important;
          max-width: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  return {
    show: (message, type = 'info', duration = 4000) => {
      const container = getContainer();
      const toast = createToast(message, type, duration);
      container.appendChild(toast);
      
      if (duration > 0) {
        setTimeout(() => {
          toast.style.animation = 'toastSlideOut 0.3s ease forwards';
          setTimeout(() => toast.remove(), 300);
        }, duration);
      }
      
      return toast;
    },
    
    success: (message, duration = 4000) => VLToast.show(message, 'success', duration),
    error: (message, duration = 5000) => VLToast.show(message, 'error', duration),
    warning: (message, duration = 4000) => VLToast.show(message, 'warning', duration),
    info: (message, duration = 4000) => VLToast.show(message, 'info', duration),
    
    clear: () => {
      const container = getContainer();
      container.innerHTML = '';
    }
  };
})();
