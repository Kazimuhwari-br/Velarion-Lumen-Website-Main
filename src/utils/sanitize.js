export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function cleanText(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'object') return fallback;
  const text = String(value).trim();
  return text && text !== '[object Object]' ? text : fallback;
}
