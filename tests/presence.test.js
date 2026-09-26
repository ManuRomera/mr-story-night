import test from "node:test";
import assert from "node:assert/strict";

// Entorno mínimo de Foundry para el módulo de presencia.
const sent = [];
globalThis.game = { user: { id: "bea" }, socket: { on() {}, emit: (_channel, message) => sent.push(message) }, users: new Map([["ana", { name: "Ana" }]]) };
globalThis.Hooks = { on() {} };
globalThis.window = { addEventListener() {} };
globalThis.setInterval = () => 0;
const { Presence } = await import("../scripts/presence.js");

test("dos personas en el mismo campo: gana quien entró antes y el otro recibe el aviso", () => {
  const lost = [];
  Presence.init({ onChange() {}, onLost: (doc, field, user) => lost.push([doc, field, user.name]) });
  const realNow = Date.now;
  Date.now = () => 1000;
  Presence.claim("f1", "setup.goal");
  assert.equal(sent.at(-1).on, true);
  // Ana entró más tarde: sigo yo y le reenvío mi bloqueo para que ella lo suelte.
  Presence._receive({ docId: "f1", field: "setup.goal", on: true, userId: "ana", at: 2000 });
  assert.equal(Presence.holder("f1", "setup.goal"), null);
  assert.equal(sent.at(-1).at, 1000);
  // Ana entró antes que yo en otro campo: lo pierdo, me avisa y queda a su nombre.
  Presence.claim("f1", "setup.answers.0");
  Presence._receive({ docId: "f1", field: "setup.answers.0", on: true, userId: "ana", at: 500 });
  assert.deepEqual(lost, [["f1", "setup.answers.0", "Ana"]]);
  assert.equal(Presence.holder("f1", "setup.answers.0").name, "Ana");
  // Al soltarlo, queda libre; y un bloqueo sin renovar caduca.
  Presence._receive({ docId: "f1", field: "setup.answers.0", on: false, userId: "ana", at: 500 });
  assert.equal(Presence.holder("f1", "setup.answers.0"), null);
  Presence._receive({ docId: "f1", field: "setup.answers.1", on: true, userId: "ana", at: 900 });
  Date.now = () => 1000 + 91_000;
  assert.equal(Presence.holder("f1", "setup.answers.1"), null);
  Date.now = realNow;
});
