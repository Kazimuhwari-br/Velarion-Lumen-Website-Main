function wait(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }
function escapeHtml(value){ return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }
function cleanValue(value){ return String(value ?? '').trim(); }
function normalize(value){ return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function debounce(fn, delay = 180){ let timeoutId; return (...args) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => fn(...args), delay); }; }
function normalizeHexColor(value, fallback = '#5865F2'){ const raw = String(value || '').trim(); return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw) ? raw : fallback; }
function isValidUrl(value){ try { new URL(value); return true; } catch { return false; } }
function normalizePossibleUrl(value){ const raw = cleanValue(value); if (!raw) return ''; return isValidUrl(raw) ? raw : raw.replace(/^\/+/, ''); }
