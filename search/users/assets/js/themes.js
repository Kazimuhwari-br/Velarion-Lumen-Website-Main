const THEMES = {
  default: "./assets/css/theme-default.css",
  soft: "./assets/css/theme-soft.css",
  fantasy: "./assets/css/theme-fantasy.css",
  dark: "./assets/css/theme-dark.css"
};

export function applyTheme(themeName = "default") {
  const href = THEMES[themeName] || THEMES.default;
  let link = document.getElementById("active-theme");

  if (!link) {
    link = document.createElement("link");
    link.id = "active-theme";
    link.rel = "stylesheet";
    document.head.prepend(link);
  }

  link.href = href;
  localStorage.setItem("vl-theme", themeName);
}

export function restoreTheme() {
  applyTheme(localStorage.getItem("vl-theme") || "default");
}
