import { SYSTEM_ID, TEMPLATES } from "./constants.js";
import { READING_INKS } from "./settings.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const t = key => game.i18n.localize(key);
const get = key => game.settings.get(SYSTEM_ID, key);
const set = (key, value) => game.settings.set(SYSTEM_ID, key, value);
const DEFAULTS = { readingMode: false, textScale: 1, readingInk: "soft", plainFont: false, wideSpacing: false, reducedMotion: false };

/** Lectura cómoda: una sola ventana; lo que se cambia aquí se aplica al momento en todas las del sistema. */
export class AccessPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "mr-access", classes: ["mr-app", "mr-access-app"],
    window: { title: "MR.Access.Title", icon: "fa-solid fa-universal-access" },
    position: { width: 380, height: "auto" },
    actions: { toggle: AccessPanel.#onToggle, ink: AccessPanel.#onInk, reset: AccessPanel.#onReset }
  };
  static PARTS = { panel: { template: `${TEMPLATES}/access.hbs` } };

  static #instance = null;
  static open() { return (this.#instance ??= new AccessPanel()).render({ force: true }); }

  async _prepareContext() {
    const toggles = ["readingMode", "plainFont", "wideSpacing", "reducedMotion"];
    return {
      toggles: toggles.map(key => ({ key, on: get(key), label: t(`MR.Access.${key}`), hint: t(`MR.Access.${key}Hint`) })),
      scale: Math.round(get("textScale") * 100), reading: get("readingMode"),
      inks: Object.entries(READING_INKS).map(([key, color]) => ({ key, color, label: t(`MR.Access.Ink.${key}`), selected: get("readingInk") === key }))
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const range = this.element.querySelector("input[name=textScale]");
    const out = this.element.querySelector("[data-scale-out]");
    // Vista previa al arrastrar; se guarda al soltar.
    range?.addEventListener("input", () => { document.documentElement.style.setProperty("--mr-text-scale", range.value / 100); out.textContent = `${range.value} %`; });
    range?.addEventListener("change", () => set("textScale", Number(range.value) / 100));
  }

  static async #onToggle(event, target) { await set(target.dataset.key, !get(target.dataset.key)); this.render(); }
  static async #onInk(event, target) { await set("readingInk", target.dataset.key); this.render(); }
  static async #onReset() { for (const [key, value] of Object.entries(DEFAULTS)) await set(key, value); this.render(); }
}
