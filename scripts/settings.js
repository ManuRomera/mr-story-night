import { DEFAULT_SAFETY, SYSTEM_ID } from "./constants.js";

export function registerSettings({ onActive, onSafety, onLibrary }) {
  const world = (key, data) => game.settings.register(SYSTEM_ID, key, { scope: "world", config: false, ...data });
  world("activeFellowship", { type: String, default: "", onChange: onActive });
  world("safety", { type: Object, default: { ...DEFAULT_SAFETY }, onChange: onSafety });
  world("quests", { type: Object, default: [], onChange: onLibrary });
  game.settings.register(SYSTEM_ID, "chatCards", { name: "MR.Settings.ChatCards", hint: "MR.Settings.ChatCardsHint", scope: "world", config: true, type: Boolean, default: true });
  const client = (key, data) => game.settings.register(SYSTEM_ID, key, { scope: "client", config: true, onChange: applyPreferences, ...data });
  client("autoOpen", { name: "MR.Settings.AutoOpen", hint: "MR.Settings.AutoOpenHint", type: Boolean, default: true });
  client("textScale", { name: "MR.Settings.TextScale", type: Number, range: { min: 0.85, max: 1.4, step: 0.05 }, default: 1 });
  client("highContrast", { name: "MR.Settings.HighContrast", type: Boolean, default: false });
  client("reducedMotion", { name: "MR.Settings.ReducedMotion", hint: "MR.Settings.ReducedMotionHint", type: Boolean, default: false });
}

export function applyPreferences() {
  const get = key => game.settings.get(SYSTEM_ID, key);
  const root = document.documentElement;
  root.style.setProperty("--mr-text-scale", get("textScale"));
  root.classList.toggle("mr-high-contrast", get("highContrast"));
  root.classList.toggle("mr-reduced-motion", get("reducedMotion"));
}
