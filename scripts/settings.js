import { DEFAULT_SAFETY, SYSTEM_ID } from "./constants.js";

export function registerSettings({ onStory, onSafety, onLibrary }) {
  const world = (key, def, onChange) => game.settings.register(SYSTEM_ID, key, { scope: "world", config: false, type: Object, default: def, onChange });
  world("story", null, onStory);
  world("safety", { ...DEFAULT_SAFETY }, onSafety);
  world("quests", [], onLibrary);
  world("archive", [], onLibrary);
  const client = (key, data) => game.settings.register(SYSTEM_ID, key, { scope: "client", config: true, onChange: applyPreferences, ...data });
  client("autoOpen", { name: "MR.Settings.AutoOpen", hint: "MR.Settings.AutoOpenHint", type: Boolean, default: true });
  client("textScale", { name: "MR.Settings.TextScale", type: Number, range: { min: 0.9, max: 1.4, step: 0.05 }, default: 1 });
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
