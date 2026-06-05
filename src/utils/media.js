import { cleanText } from './sanitize.js';

export function normalizeUrl(value) {
  let raw = cleanText(value);
  if (!raw) return '';

  raw = raw
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&')
    .trim();

  if (/^https?:\/\/(www\.)?github\.com\/.+\/blob\/.+$/i.test(raw)) {
    raw = raw
      .replace('https://www.github.com/', 'https://raw.githubusercontent.com/')
      .replace('https://github.com/', 'https://raw.githubusercontent.com/')
      .replace('/blob/', '/');
  }

  return raw;
}

export function getMediaUrl(value, fallback = '') {
  const raw = normalizeUrl(value);
  if (!raw) return fallback;

  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? raw : fallback;
  } catch {
    return fallback;
  }
}
