import { SYSTEM_ID, TEMPLATES } from "./constants.js";
import { Stage, STAGE_THEMES, stageBackground } from "./stage.js";

/**
 * Efectos del portal (a partir de la macro «Portal FX» de Manu):
 * halo, partículas de la ambientación y una luz que late, recortados a la forma del arco.
 * El halo y las partículas se dibujan en cada cliente; la luz es un documento de la escena.
 * Funciona con PIXI 7 (Foundry v13) y PIXI 8 (v14), que dibujan de forma distinta.
 */
export const DEFAULT_PORTAL = Object.freeze({
  x: 43.7, y: 18.6, w: 12.6, h: 35.0, arch: true, animated: true,
  particles: true, glow: true, light: true, intensity: 65, speed: 50, density: 45, spill: 35
});
const LIGHT_FLAG = "portalLight";
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
const lerp = (a, b, t) => a + (b - a) * t;

/** Normaliza una configuración (valores fuera de rango, tipos de formulario). */
export function portalConfig(raw = {}) {
  const c = { ...DEFAULT_PORTAL, ...Object.fromEntries(Object.entries(raw ?? {}).filter(([, v]) => v !== undefined && v !== null)) };
  const bool = v => v === true || v === "true" || v === "on";
  return {
    x: clamp(c.x, 0, 100), y: clamp(c.y, 0, 100), w: clamp(c.w, 1, 100), h: clamp(c.h, 1, 100), arch: bool(c.arch), animated: bool(c.animated),
    particles: bool(c.particles), glow: bool(c.glow), light: bool(c.light),
    intensity: clamp(c.intensity, 0, 100), speed: clamp(c.speed, 0, 100), density: clamp(c.density, 0, 100), spill: clamp(c.spill, 0, 300)
  };
}

/** Rectángulo del portal en coordenadas de escena, a partir de porcentajes de la imagen. */
export function portalRect(cfg, d) {
  return { x: d.sceneX + d.sceneWidth * cfg.x / 100, y: d.sceneY + d.sceneHeight * cfg.y / 100, w: d.sceneWidth * cfg.w / 100, h: d.sceneHeight * cfg.h / 100 };
}

/* ---------- Dibujo compatible con PIXI 7 y 8 ---------- */
const V8 = () => Number(String(PIXI.VERSION ?? "7").split(".")[0]) >= 8;
function paint(g, shape, { fill, stroke }) {
  if (V8()) { shape(g); if (fill) g.fill(fill); if (stroke) g.stroke(stroke); return g; }
  if (stroke) g.lineStyle(stroke.width, stroke.color, stroke.alpha);
  if (fill) g.beginFill(fill.color, fill.alpha);
  shape(g);
  if (fill) g.endFill();
  return g;
}
const circle = (x, y, r) => g => (V8() ? g.circle(x, y, r) : g.drawCircle(x, y, r));
const ellipse = (x, y, rx, ry) => g => (V8() ? g.ellipse(x, y, rx, ry) : g.drawEllipse(x, y, rx, ry));
const rect = (x, y, w, h) => g => (V8() ? g.rect(x, y, w, h) : g.drawRect(x, y, w, h));
const line = (x1, y1, x2, y2) => g => { g.moveTo(x1, y1); g.lineTo(x2, y2); };
/** Arco de medio punto (o rectángulo redondeado si arch = false), ampliado m píxeles por cada lado. */
const archShape = (r, m, arch) => g => {
  const x = r.x - m, y = r.y - m, w = r.w + m * 2, h = r.h + m * 2;
  if (!arch) return V8() ? g.roundRect(x, y, w, h, Math.min(w, h) * 0.1) : g.drawRoundedRect(x, y, w, h, Math.min(w, h) * 0.1);
  const rad = w / 2;
  g.moveTo(x, y + h); g.lineTo(x, y + rad); g.arc(x + rad, y + rad, rad, Math.PI, 0); g.lineTo(x + w, y + h); g.lineTo(x, y + h);
  if (V8()) g.closePath(); else g.closePath?.();
};
const blur = (strength, quality) => (V8() ? new PIXI.BlurFilter({ strength, quality }) : new PIXI.BlurFilter(strength, quality));

function makeParticle(type, color, r, cfg) {
  const p = new PIXI.Graphics();
  let size = 1.5 + Math.random() * 3.5, alpha = 0.25 + Math.random() * 0.65;
  let vx = (Math.random() - 0.5) * 0.35, vy = -0.15 - Math.random() * 0.35;
  const speed = lerp(0.35, 2.4, cfg.speed / 100);
  p.x = r.x + Math.random() * r.w; p.y = r.y + Math.random() * r.h;
  switch (type) {
    case "rain": paint(p, rect(-0.7, -7, 1.4, 14), { fill: { color, alpha } }); vx = -0.35 - Math.random() * 0.3; vy = 2.3 + Math.random() * 2.2; break;
    case "embers": paint(p, circle(0, 0, 1.2 + Math.random() * 2.7), { fill: { color, alpha } }); vx = (Math.random() - 0.5) * 0.5; vy = -0.45 - Math.random() * 0.75; break;
    case "mist": paint(p, circle(0, 0, 12 + Math.random() * 28), { fill: { color, alpha: alpha * 0.08 } }); p.filters = [blur(8, 2)]; vx = (Math.random() - 0.5) * 0.2; vy = -0.04 - Math.random() * 0.08; break;
    case "orbital": case "void":
      paint(p, circle(0, 0, size), { fill: { color, alpha: type === "void" ? alpha * 0.4 : alpha } });
      Object.assign(p, { orbit: true, cx: r.x + r.w / 2, cy: r.y + r.h / 2, radius: (Math.random() * 0.45 + 0.1) * Math.min(r.w, r.h), angle: Math.random() * Math.PI * 2, spin: (type === "void" ? -1 : 1) * (0.002 + Math.random() * 0.006) * speed });
      break;
    case "energy": paint(p, circle(0, 0, 1.2 + Math.random() * 2.2), { fill: { color, alpha } }); vx = (Math.random() - 0.5) * 0.8; vy = (Math.random() - 0.5) * 0.8; break;
    case "glint":
      size = 1.5 + Math.random() * 2.5;
      paint(p, g => { line(-size * 3, 0, size * 3, 0)(g); line(0, -size * 3, 0, size * 3)(g); }, { stroke: { width: 1.2, color, alpha } });
      vx = (Math.random() - 0.5) * 0.05; vy = -0.02 - Math.random() * 0.05; break;
    case "ash": paint(p, circle(0, 0, 1 + Math.random() * 2.3), { fill: { color, alpha: alpha * 0.65 } }); vx = -0.15 + Math.random() * 0.35; vy = 0.1 + Math.random() * 0.3; break;
    case "dust": paint(p, circle(0, 0, 1 + Math.random() * 2), { fill: { color, alpha: alpha * 0.45 } }); vx = (Math.random() - 0.5) * 0.08; vy = -0.02 - Math.random() * 0.06; break;
    default: paint(p, circle(0, 0, size), { fill: { color, alpha } }); vx = (Math.random() - 0.5) * 0.2; vy = -0.12 - Math.random() * 0.28;
  }
  Object.assign(p, { vx: vx * speed, vy: vy * speed, life: 0.55 + Math.random() * 1.2, fade: 0.0025 + Math.random() * 0.004, twinkle: Math.random() * Math.PI * 2 });
  return p;
}

const saved = () => portalConfig(game.settings.get(SYSTEM_ID, "portalConfig"));
const enabled = () => game.settings.get(SYSTEM_ID, "portalFx");
/** Movimiento en este cliente: lo para el anfitrión para todos o cada jugador con «Reducir animaciones». */
const moving = cfg => cfg.animated && !game.settings.get(SYSTEM_ID, "reducedMotion") && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const Portal = {
  runtime: { container: null, ticker: null },

  clear() {
    const rt = this.runtime;
    try { if (rt.ticker) canvas.app.ticker.remove(rt.ticker); } catch { /* ya no hay lienzo */ }
    try { rt.container?.parent?.removeChild(rt.container); rt.container?.destroy({ children: true }); } catch { /* ya destruido */ }
    rt.container = null; rt.ticker = null;
  },

  /** Dibuja los efectos en este cliente. `outline` enseña el contorno mientras se ajusta. */
  render(cfg = saved(), { force = false, outline = false } = {}) {
    this.clear();
    if (!canvas?.ready || !Stage.isStage() || (!enabled() && !force)) return;
    const theme = STAGE_THEMES[Stage.theme(canvas.scene)] ?? STAGE_THEMES.base;
    const r = portalRect(cfg, canvas.dimensions);
    const container = new PIXI.Container();
    container.zIndex = 999999; container.eventMode = "none";
    canvas.stage.addChild(container);

    const mask = paint(new PIXI.Graphics(), archShape(r, cfg.spill, cfg.arch), { fill: { color: 0xffffff, alpha: 1 } });
    container.addChild(mask);
    const layer = new PIXI.Container();
    layer.mask = mask;
    container.addChild(layer);

    let glow = null;
    if (cfg.glow) {
      const margin = 10 + cfg.intensity * 0.2;
      glow = paint(new PIXI.Graphics(), archShape(r, margin, cfg.arch), { stroke: { width: Math.max(8, 10 + cfg.intensity * 0.2), color: theme.color, alpha: lerp(0.08, 0.32, cfg.intensity / 100) } });
      glow.filters = [blur(12 + cfg.intensity * 0.22, 4)];
      container.addChild(glow);
    }
    if (outline) container.addChild(paint(new PIXI.Graphics(), archShape(r, 0, cfg.arch), { stroke: { width: 3, color: 0xffffff, alpha: 0.9 } }));

    if (!moving(cfg)) { Object.assign(this.runtime, { container, ticker: null }); return; }
    const particles = [];
    const max = Math.round(12 + cfg.density * 0.7);
    const every = Math.max(2, Math.round(14 - cfg.density * 0.1));
    let frame = 0, time = 0;
    const ticker = arg => {
      const delta = typeof arg === "number" ? arg : (arg?.deltaTime ?? 1);
      time += delta; frame += delta;
      if (cfg.particles && frame >= every && particles.length < max) {
        frame = 0;
        for (let i = 0; i < (cfg.density > 70 ? 2 : 1) && particles.length < max; i++) {
          const p = makeParticle(theme.particle, theme.color, r, cfg);
          layer.addChild(p); particles.push(p);
        }
      }
      if (glow) glow.alpha = 0.72 + 0.2 * Math.sin(time * (0.012 + cfg.speed * 0.0001));
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.orbit) {
          p.angle += p.spin * delta * 60;
          const wobble = 1 + Math.sin(time * 0.02 + i) * 0.06;
          p.x = p.cx + Math.cos(p.angle) * p.radius * wobble; p.y = p.cy + Math.sin(p.angle) * p.radius * 0.72 * wobble;
        } else { p.x += p.vx * delta * 3; p.y += p.vy * delta * 3; }
        p.twinkle += 0.035 * delta;
        p.alpha = clamp((0.35 + 0.65 * Math.abs(Math.sin(p.twinkle))) * p.life, 0, 1);
        p.life -= p.fade * delta;
        const out = p.x < r.x - cfg.spill - 120 || p.x > r.x + r.w + cfg.spill + 120 || p.y < r.y - cfg.spill - 120 || p.y > r.y + r.h + cfg.spill + 120;
        if (p.life <= 0 || out) { p.destroy(); particles.splice(i, 1); }
      }
    };
    canvas.app.ticker.add(ticker);
    Object.assign(this.runtime, { container, ticker });
  },

  /** La luz del portal es un documento: la crea o ajusta el anfitrión y la ven todos. */
  async syncLight(cfg = saved()) {
    if (!game.user.isGM) return;
    const scene = Stage.scene();
    if (!scene) return;
    const existing = scene.lights.find(l => l.getFlag(SYSTEM_ID, LIGHT_FLAG));
    if (!enabled() || !cfg.light) { if (existing) await existing.delete(); return; }
    const theme = STAGE_THEMES[Stage.theme(scene)] ?? STAGE_THEMES.base;
    const d = scene.dimensions;
    const r = portalRect(cfg, d);
    const radius = Math.max(r.w, r.h) * 0.42;
    const data = {
      x: r.x + r.w / 2, y: r.y + r.h / 2, walls: false, vision: false, hidden: false,
      config: {
        dim: radius, bright: radius * 0.22, angle: 360, alpha: lerp(0.1, 0.42, cfg.intensity / 100), color: `#${theme.color.toString(16).padStart(6, "0")}`,
        coloration: 1, luminosity: 0.15, saturation: 0, contrast: 0.1, shadows: 0,
        animation: cfg.animated
          ? { type: "pulse", speed: Math.max(1, Math.round(1 + cfg.speed / 18)), intensity: Math.max(1, Math.round(1 + cfg.intensity / 20)), reverse: false }
          : { type: null }
      },
      flags: { [SYSTEM_ID]: { [LIGHT_FLAG]: true } }
    };
    if (existing) await existing.update(data);
    else await scene.createEmbeddedDocuments("AmbientLight", [data]);
  },

  refresh() { this.drawWorld(); this.render(); this.syncLight(); },

  /* ---------- El mundo dentro del portal ----------
   * El fondo del documento es siempre la sala base. La ambientación se pinta encima como una imagen
   * completa (fuera del portal es idéntica, así que solo se nota el portal y el cartel). Al cambiar,
   * el nuevo mundo se abre desde el centro del portal con un anillo de luz, sin redibujar el lienzo. */
  world: { container: null, sprite: null, theme: null, ticker: null, finish: null, token: 0 },

  _worldContainer() {
    const w = this.world;
    if (!w.container || w.container.destroyed || !w.container.parent) {
      w.container = new PIXI.Container();
      w.container.zIndex = 999990; w.container.eventMode = "none";
      canvas.stage.addChild(w.container);
      canvas.stage.sortableChildren = true;
    }
    return w.container;
  },

  async _sprite(theme) {
    const load = foundry.canvas?.loadTexture ?? globalThis.loadTexture;
    const texture = await load(stageBackground(theme));
    const d = canvas.dimensions;
    const sprite = new PIXI.Sprite(texture);
    Object.assign(sprite, { x: d.sceneX, y: d.sceneY, width: d.sceneWidth, height: d.sceneHeight });
    return sprite;
  },

  clearWorld() {
    const w = this.world;
    if (w.ticker) { try { canvas.app.ticker.remove(w.ticker); } catch { /* sin lienzo */ } }
    try { w.container?.parent?.removeChild(w.container); w.container?.destroy({ children: true }); } catch { /* ya destruido */ }
    Object.assign(w, { container: null, sprite: null, theme: null, ticker: null, finish: null });
  },

  /** Pinta la ambientación actual sin animar (al cargar la escena). */
  async drawWorld() {
    if (!canvas?.ready || !Stage.isStage()) return this.clearWorld();
    const theme = Stage.theme(canvas.scene);
    const token = ++this.world.token;
    const sprite = await this._sprite(theme);
    if (token !== this.world.token) return sprite.destroy();
    this.clearWorld();
    this._worldContainer().addChild(sprite);
    Object.assign(this.world, { sprite, theme });
  },

  /** Transición: el mundo nuevo aparece dentro del portal. */
  async transitionWorld(theme) {
    const w = this.world;
    if (!canvas?.ready || !Stage.isStage()) return;
    if (!w.sprite || w.sprite.destroyed) return this.drawWorld();
    if (w.theme === theme) return;
    const token = ++w.token;
    const next = await this._sprite(theme);
    // Si mientras cargaba se pidió otra ambientación, esta ya no sirve.
    if (token !== w.token) return next.destroy();
    w.finish?.();
    const container = this._worldContainer();
    const cfg = saved();
    const color = (STAGE_THEMES[theme] ?? STAGE_THEMES.base).color;
    const r = portalRect(cfg, canvas.dimensions);
    const oldSprite = w.sprite;
    // Capas: imagen anterior · imagen nueva que funde (cartel) · portal anterior · portal nuevo que se abre · anillo.
    next.alpha = 0;
    container.addChild(next);
    const oldPortal = new PIXI.Sprite(oldSprite.texture);
    Object.assign(oldPortal, { x: oldSprite.x, y: oldSprite.y, width: oldSprite.width, height: oldSprite.height });
    const clip = new PIXI.Container();
    const clipMask = paint(new PIXI.Graphics(), archShape(r, 2, cfg.arch), { fill: { color: 0xffffff, alpha: 1 } });
    clip.addChild(clipMask); clip.mask = clipMask;
    const newPortal = new PIXI.Sprite(next.texture);
    Object.assign(newPortal, { x: next.x, y: next.y, width: next.width, height: next.height });
    const hole = new PIXI.Graphics();
    newPortal.mask = hole;
    const ring = new PIXI.Graphics();
    ring.filters = [blur(10, 3)];
    clip.addChild(oldPortal, hole, newPortal, ring);
    container.addChild(clip);
    Object.assign(w, { sprite: next, theme });

    // Un iris con la forma del arco que se abre desde el centro hasta cubrirlo entero.
    const cx = r.x + r.w / 2, cy = r.y + r.h * 0.56;
    const rx = r.w * 0.75, ry = r.h * 0.66;
    const calm = !moving(cfg);
    const duration = calm ? 450 : 1800;
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    let elapsed = 0;
    const irisAt = (g, s, style) => { g.clear(); paint(g, ellipse(cx, cy, Math.max(0.1, rx * s), Math.max(0.1, ry * s)), style); };
    const finish = () => {
      if (w.ticker) canvas.app.ticker.remove(w.ticker);
      w.ticker = null; w.finish = null;
      next.alpha = 1;
      if (!clip.destroyed) clip.destroy({ children: true });
      if (!oldSprite.destroyed) oldSprite.destroy();
    };
    w.finish = finish;
    w.ticker = () => {
      elapsed += canvas.app.ticker.deltaMS;
      const t = Math.min(1, elapsed / duration);
      next.alpha = ease(Math.min(1, t * 1.4));
      if (calm) { oldPortal.alpha = 1 - t; irisAt(hole, 1, { fill: { color: 0xffffff, alpha: 1 } }); }
      else {
        const s = ease(t);
        irisAt(hole, s, { fill: { color: 0xffffff, alpha: 1 } });
        irisAt(ring, s, { stroke: { width: 5 + 12 * (1 - s), color, alpha: Math.min(1, 1.6 * (1 - s)) } });
      }
      if (t >= 1) finish();
    };
    canvas.app.ticker.add(w.ticker);
  },

  init() {
    Hooks.on("canvasReady", async () => { await this.drawWorld(); this.render(); });
    Hooks.on("canvasTearDown", () => { this.clear(); this.clearWorld(); });
    Hooks.on("updateScene", (scene, changes) => {
      if (!scene.getFlag(SYSTEM_ID, "stage")) return;
      if (!foundry.utils.hasProperty(changes, `flags.${SYSTEM_ID}.theme`)) return;
      if (scene.id === canvas.scene?.id) { this.transitionWorld(Stage.theme(scene)); this.render(); }
      this.syncLight();
    });
  }
};

/* ---------- Ventana para ajustar el portal ---------- */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class PortalConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "mr-portal-config", tag: "form", classes: ["mr-app", "mr-portal-app"],
    window: { title: "MR.Portal.Title", icon: "fa-solid fa-wand-magic-sparkles" },
    position: { width: 460, height: "auto" },
    form: { handler: PortalConfig.#onSubmit, submitOnChange: false, closeOnSubmit: true },
    actions: { resetZone: PortalConfig.#onResetZone }
  };
  static PARTS = { form: { template: `${TEMPLATES}/portal-config.hbs` } };

  #draft = null;

  async _prepareContext() {
    const cfg = this.#draft ?? saved();
    return { cfg, enabled: enabled(), onStage: Stage.isStage(), sliders: ["intensity", "speed", "density"].map(key => ({ key, value: cfg[key], label: game.i18n.localize(`MR.Portal.${key}`) })) };
  }

  /** Vista previa en vivo con el contorno del portal mientras se edita. */
  #preview() {
    const data = new foundry.applications.ux.FormDataExtended(this.element).object;
    this.#draft = portalConfig(data);
    for (const out of this.element.querySelectorAll("output[data-for]")) out.textContent = this.element.querySelector(`[name=${out.dataset.for}]`).value;
    Portal.render(this.#draft, { force: true, outline: true });
  }

  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this.element.addEventListener("input", () => this.#preview());
    this.element.addEventListener("change", () => this.#preview());
  }

  _onRender(context, options) {
    super._onRender(context, options);
    Portal.render(this.#draft ?? saved(), { force: true, outline: true });
  }

  _onClose(options) {
    super._onClose(options);
    this.#draft = null;
    Portal.render();
  }

  static async #onSubmit(event, form, formData) {
    const data = formData.object;
    await game.settings.set(SYSTEM_ID, "portalFx", Boolean(data.enabled));
    await game.settings.set(SYSTEM_ID, "portalConfig", portalConfig(data));
  }

  static #onResetZone() {
    for (const key of ["x", "y", "w", "h"]) this.element.querySelector(`[name=${key}]`).value = DEFAULT_PORTAL[key];
    this.element.querySelector("[name=arch]").checked = DEFAULT_PORTAL.arch;
    this.#preview();
  }
}
