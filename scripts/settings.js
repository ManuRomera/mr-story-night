import { DEFAULT_SAFETY, SYSTEM_ID } from "./constants.js";
import { DEFAULT_PORTAL, PortalConfig } from "./portal.js";

/** Colores de letra del modo lectura: claros pero sin llegar al blanco puro, que deslumbra sobre negro. */
export const READING_INKS = { soft: "#e2dfd8", cream: "#e8dcc3", pearl: "#cfd3d8", amber: "#e6c690", mint: "#bcd9c4", sky: "#bcd0e6" };

export function registerSettings({ onActive, onSafety, onLibrary, onStage, onPortal }) {
  const world = (key, data) => game.settings.register(SYSTEM_ID, key, { scope: "world", config: false, ...data });
  world("activeFellowship", { type: String, default: "", onChange: onActive });
  world("safety", { type: Object, default: { ...DEFAULT_SAFETY }, onChange: onSafety });
  world("quests", { type: Object, default: [], onChange: onLibrary });
  // Escenario: escena a pantalla completa con la sala del portal, y los efectos del portal.
  game.settings.register(SYSTEM_ID, "stageAuto", { name: "MR.Settings.StageAuto", hint: "MR.Settings.StageAutoHint", scope: "world", config: true, type: Boolean, default: true, onChange: onStage });
  game.settings.register(SYSTEM_ID, "portalFx", { name: "MR.Settings.PortalFx", hint: "MR.Settings.PortalFxHint", scope: "world", config: true, type: Boolean, default: true, onChange: onPortal });
  world("portalConfig", { type: Object, default: { ...DEFAULT_PORTAL }, onChange: onPortal });
  game.settings.registerMenu(SYSTEM_ID, "portalMenu", { name: "MR.Portal.Title", label: "MR.Portal.Open", hint: "MR.Portal.MenuHint", icon: "fa-solid fa-wand-magic-sparkles", type: PortalConfig, restricted: true });
  game.settings.register(SYSTEM_ID, "chatCards", { name: "MR.Settings.ChatCards", hint: "MR.Settings.ChatCardsHint", scope: "world", config: true, type: Boolean, default: true });
  const client = (key, data) => game.settings.register(SYSTEM_ID, key, { scope: "client", config: true, onChange: applyPreferences, ...data });
  client("phaseGuide", { name: "MR.Settings.PhaseGuide", hint: "MR.Settings.PhaseGuideHint", type: Boolean, default: true });
  client("sidePanel", { type: Boolean, default: true, config: false });
  client("autoOpen", { name: "MR.Settings.AutoOpen", hint: "MR.Settings.AutoOpenHint", type: Boolean, default: true });
  // Lectura cómoda: se cambia desde el botón de accesibilidad de cualquier ventana y vale para todas.
  const access = (key, data) => client(key, { config: false, ...data });
  access("readingMode", { type: Boolean, default: false });
  access("textScale", { type: Number, default: 1 });
  access("readingInk", { type: String, default: "soft" });
  access("plainFont", { type: Boolean, default: false });
  access("wideSpacing", { type: Boolean, default: false });
  access("reducedMotion", { type: Boolean, default: false });
}

export function applyPreferences() {
  const get = key => game.settings.get(SYSTEM_ID, key);
  const root = document.documentElement;
  root.style.setProperty("--mr-text-scale", get("textScale"));
  root.style.setProperty("--mr-read-ink", READING_INKS[get("readingInk")] ?? READING_INKS.soft);
  root.classList.toggle("mr-reading", get("readingMode"));
  root.classList.toggle("mr-plain-font", get("plainFont"));
  root.classList.toggle("mr-wide-spacing", get("wideSpacing"));
  root.classList.toggle("mr-reduced-motion", get("reducedMotion"));
}
