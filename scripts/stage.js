import { SYSTEM_ID } from "./constants.js";
import { genreOf } from "./generators.js";

/**
 * El escenario: una escena propia del sistema con la sala del portal de fondo.
 * Sin cuadrícula, sin visión ni niebla, ocupando toda la pantalla, y con el fondo
 * de la ambientación que se elige en el vestíbulo.
 */
const BG = key => `systems/${SYSTEM_ID}/assets/backgrounds/portal-${key}.webp`;
export const STAGE_SIZE = { width: 1672, height: 941 };

/** Fondo, color y tipo de partícula del portal de cada ambientación. «Propia» usa la sala base. */
export const STAGE_THEMES = Object.freeze({
  base: { color: 0x7e8aa0, particle: "void" },
  fantasy: { color: 0xffd777, particle: "spark" },
  scifi: { color: 0x70d8ff, particle: "energy" },
  horror: { color: 0xc7d0d8, particle: "mist" },
  cosmic: { color: 0x63ffe2, particle: "orbital" },
  gothic: { color: 0xb9c6dc, particle: "dust" },
  folk: { color: 0xff8f42, particle: "embers" },
  noir: { color: 0xe7edf2, particle: "rain" },
  western: { color: 0xe2ad67, particle: "dust" },
  heist: { color: 0xffd45e, particle: "glint" },
  postapoc: { color: 0xc59a72, particle: "ash" }
});
export const stageThemeOf = quest => {
  const g = quest ? genreOf(quest) : null;
  return g && STAGE_THEMES[g] ? g : "base";
};
export const stageBackground = key => BG(STAGE_THEMES[key] ? key : "base");

const setting = key => game.settings.get(SYSTEM_ID, key);

export const Stage = {
  scene() { return game.scenes?.find(s => s.getFlag(SYSTEM_ID, "stage")) ?? null; },
  theme(scene = this.scene()) { return scene?.getFlag(SYSTEM_ID, "theme") ?? "base"; },
  isStage(scene = canvas?.scene) { return Boolean(scene?.getFlag(SYSTEM_ID, "stage")); },

  /** Crea la escena si no existe (solo el anfitrión y con el escenario automático activado). */
  async ensure() {
    if (!game.user.isGM || !setting("stageAuto")) return null;
    const existing = this.scene();
    if (existing) return existing;
    const scene = await Scene.create({
      name: "MR · Story Night", navigation: true, navName: "Story Night",
      width: STAGE_SIZE.width, height: STAGE_SIZE.height, padding: 0, backgroundColor: "#000000",
      background: { src: BG("base") }, grid: { type: CONST.GRID_TYPES.GRIDLESS, alpha: 0 },
      tokenVision: false, fog: { exploration: false },
      environment: { darknessLevel: 0, globalLight: { enabled: true } },
      flags: { [SYSTEM_ID]: { stage: true, theme: "base" } }
    });
    await scene.activate();
    return scene;
  },

  /** Cambia el fondo del escenario a una ambientación (lo ven todos). */
  async setTheme(key) {
    if (!game.user.isGM || !setting("stageAuto")) return;
    const scene = this.scene();
    const theme = STAGE_THEMES[key] ? key : "base";
    if (!scene || this.theme(scene) === theme) return;
    await scene.update({ "background.src": BG(theme), [`flags.${SYSTEM_ID}.theme`]: theme });
  },

  /** Que la imagen cubra la pantalla entera, sin bordes, como un fondo a sangre. */
  coverScale() {
    const [w, h] = canvas.screenDimensions ?? [window.innerWidth, window.innerHeight];
    const d = canvas.dimensions;
    return Math.max(w / d.sceneWidth, h / d.sceneHeight);
  },
  fit({ animate = false } = {}) {
    if (!canvas?.ready || !this.isStage()) return;
    const d = canvas.dimensions;
    const view = { x: d.sceneX + d.sceneWidth / 2, y: d.sceneY + d.sceneHeight / 2, scale: this.coverScale() };
    return animate ? canvas.animatePan({ ...view, duration: 250 }) : canvas.pan(view);
  },

  init() {
    let timer = null;
    const refit = () => { clearTimeout(timer); timer = setTimeout(() => this.fit(), 120); };
    Hooks.on("canvasReady", () => this.fit());
    window.addEventListener("resize", refit);
    // Se puede acercar la vista, pero no alejarla hasta ver bordes negros.
    Hooks.on("canvasPan", (_canvas, view) => { if (this.isStage() && view.scale < this.coverScale() - 0.001) refit(); });
  }
};
