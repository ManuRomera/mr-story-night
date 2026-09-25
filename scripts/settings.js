import { GENRES, SYSTEM_ID, THEMES } from "./constants.js";
export function registerSettings() {
  game.settings.register(SYSTEM_ID, "activeStory", { scope: "world", config: false, type: Object, default: null });
  game.settings.register(SYSTEM_ID, "storyArchive", { scope: "world", config: false, type: Object, default: [] });
  game.settings.register(SYSTEM_ID, "customContent", { scope: "world", config: false, type: Object, default: { prompts: [], complications: [] } });
  game.settings.register(SYSTEM_ID, "safetyState", { scope: "world", config: false, type: Object, default: { lines: [], veils: [], paused: false, signals: [] } });
  const choices = Object.fromEntries(THEMES.map(value => [value, `MR.Theme.${value}`]));
  game.settings.register(SYSTEM_ID, "theme", { name: "MR.Settings.Theme", scope: "world", config: true, type: String, choices, default: "neutral", onChange: applyPreferences });
  game.settings.register(SYSTEM_ID, "uiScale", { name: "MR.Settings.Scale", scope: "client", config: true, type: Number, range: { min: .8, max: 1.3, step: .05 }, default: 1, onChange: applyPreferences });
  game.settings.register(SYSTEM_ID, "fontScale", { name: "MR.Settings.FontScale", scope: "client", config: true, type: Number, range: { min: .9, max: 1.35, step: .05 }, default: 1, onChange: applyPreferences });
  for (const key of ["highContrast", "reducedMotion", "dyslexiaFont", "compactMode", "instantTooltips"]) game.settings.register(SYSTEM_ID, key, { name: `MR.Settings.${key}`, scope: "client", config: true, type: Boolean, default: key === "instantTooltips", onChange: applyPreferences });
  game.settings.register(SYSTEM_ID, "defaultGenre", { name: "MR.Settings.DefaultGenre", scope: "world", config: true, type: String, choices: Object.fromEntries(GENRES.map(v => [v, `MR.Genre.${v}`])), default: "mystery" });
  game.settings.register(SYSTEM_ID, "audioEnabled", { name: "MR.Settings.AudioEnabled", scope: "client", config: true, type: Boolean, default: true });
  game.settings.register(SYSTEM_ID, "audioVolume", { name: "MR.Settings.AudioVolume", scope: "client", config: true, type: Number, range: { min: 0, max: 1, step: .05 }, default: .3 });
}
export function applyPreferences() {
  const root = document.documentElement, get = key => game.settings.get(SYSTEM_ID, key);
  root.dataset.mrTheme = get("theme"); root.style.setProperty("--mr-ui-scale", get("uiScale")); root.style.setProperty("--mr-font-scale", get("fontScale"));
  for (const key of ["highContrast", "reducedMotion", "dyslexiaFont", "compactMode", "instantTooltips"]) root.classList.toggle(`mr-${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`, get(key));
}
