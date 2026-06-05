const THEME_STORAGE_KEY = 'vl-theme';
const AVAILABLE_THEMES = ['default','soft','fantasy','dark'];
function applyTheme(themeName = 'default'){ const theme = AVAILABLE_THEMES.includes(themeName) ? themeName : 'default'; document.documentElement.dataset.theme = theme; localStorage.setItem(THEME_STORAGE_KEY, theme); return theme; }
function getSavedTheme(){ return localStorage.getItem(THEME_STORAGE_KEY) || 'default'; }
function initTheme(){ applyTheme(getSavedTheme()); }
