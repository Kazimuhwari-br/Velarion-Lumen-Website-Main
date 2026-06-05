export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function debounce(fn, delay = 100) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function normalizeHexColor(value, fallback = "#5865F2") {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

export function hexToRgba(hex, alpha = 1) {
  const clean = normalizeHexColor(hex).replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function stripMinecraftCodes(value) {
  return String(value || "").replace(/§[0-9a-fk-or]/gi, "");
}

export function getDisplayName(player) {
  return stripMinecraftCodes(
    player?.profile?.display_name ||
    player?.account?.login ||
    player?._id ||
    "Jogador"
  );
}

export function getUsername(player) {
  return player?.account?.login ? `@${player.account.login}` : "@unknown";
}

export function getBanner(player) {
  return player?.profile?.banner || player?.profile?.avatar || "";
}

export function getCharacter(player) {
  return player?.profile?.character || player?.profile?.avatar || "";
}
