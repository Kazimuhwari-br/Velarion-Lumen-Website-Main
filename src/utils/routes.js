import { APP_CONFIG } from '../config/app.config.js';

export function getBasePath() {
  const path = window.location.pathname;
  const base = APP_CONFIG.githubPagesBasePath;
  return path === base || path.startsWith(`${base}/`) ? base : '';
}

export function makeUrl(path = '/') {
  const base = getBasePath();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function makeProfileUrl(playerId) {
  return makeUrl(`/users/?id=${encodeURIComponent(playerId || '')}`);
}

export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}
