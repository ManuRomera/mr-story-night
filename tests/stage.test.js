import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

globalThis.foundry = { applications: { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: Base => Base } } };
const { STAGE_THEMES, stageThemeOf, stageBackground, STAGE_SIZE } = await import("../scripts/stage.js");
const { portalConfig, portalRect, DEFAULT_PORTAL } = await import("../scripts/portal.js");
const { GENRES } = await import("../scripts/generators.js");

test("cada género tiene su fondo; «Propia» y sin misión usan la sala base", () => {
  for (const g of GENRES) {
    const key = stageThemeOf({ genre: g });
    assert.equal(key, g === "custom" ? "base" : g);
    const file = new URL(`../${stageBackground(key).replace("systems/mr-story-night/", "")}`, import.meta.url);
    assert.ok(existsSync(file), `falta ${file.pathname}`);
  }
  assert.equal(stageThemeOf(null), "base");
  assert.equal(stageThemeOf({ theme: "cyberpunk" }), "scifi");
  assert.ok(STAGE_THEMES.base);
});

test("la zona del portal se calcula sobre la imagen y la configuración se sanea", () => {
  const d = { sceneX: 0, sceneY: 0, sceneWidth: STAGE_SIZE.width, sceneHeight: STAGE_SIZE.height };
  const r = portalRect(portalConfig(), d);
  // El hueco del arco en las imágenes está en torno a x 730–941 px, y 175–504 px.
  assert.ok(Math.abs(r.x - 730) < 4 && Math.abs(r.x + r.w - 941) < 4, `x ${r.x}–${r.x + r.w}`);
  assert.ok(Math.abs(r.y - 175) < 4 && Math.abs(r.y + r.h - 504) < 4, `y ${r.y}–${r.y + r.h}`);
  const c = portalConfig({ x: "150", w: 0, intensity: -5, particles: "on", glow: undefined, arch: false });
  assert.deepEqual([c.x, c.w, c.intensity, c.particles, c.glow, c.arch], [100, 1, 0, true, DEFAULT_PORTAL.glow, false]);
});
