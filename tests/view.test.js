import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildView } from "../scripts/view.js";
import { simulate } from "./fixtures.js";

for (const lang of ["es", "en"]) {
  const dict = JSON.parse(readFileSync(new URL(`../lang/${lang}.json`, import.meta.url)));
  const missing = new Set();
  const t = (key, data) => { if (!(key in dict)) missing.add(key); let s = dict[key] ?? key; for (const [k, v] of Object.entries(data ?? {})) s = s.replaceAll(`{${k}}`, v); return s; };
  const { snaps, quests } = simulate(lang);

  test(`[${lang}] cada momento de la partida genera una vista sin claves de traducción ausentes`, () => {
    for (const [name, state] of Object.entries(snaps)) {
      for (const tab of ["play", "chronicle", "quests", "safety", "archive"]) {
        for (const user of [{ id: "gm", isGM: true }, { id: "lucia", isGM: false }]) {
          const view = buildView({ state, user, t, tab, quests, archive: [snaps.complete], safety: { lines: ["x"], veils: [], paused: false }, local: { archiveId: tab === "archive" ? snaps.complete.id : null } });
          assert.ok(view.header, `${name}/${tab}`);
        }
      }
    }
    const lobby = buildView({ state: null, user: { id: "gm", isGM: true }, t, quests, users: [{ id: "gm", name: "Manu" }], local: { seats: [{ userId: "gm", name: "Manu" }] } });
    assert.ok(lobby.lobby);
    assert.deepEqual([...missing], []);
  });
}

test("la vista de piedras no muestra a un jugador los formularios de otros", () => {
  const { snaps, quests } = simulate("es");
  const t = k => k;
  const lucia = buildView({ state: snaps.stones, user: { id: "lucia", isGM: false }, t, quests });
  assert.equal(lucia.challenge.forms.length, 0, "Lucía ya echó sus piedras");
  const irene = buildView({ state: snaps.stones, user: { id: "irene", isGM: false }, t, quests });
  assert.equal(irene.challenge.forms.length, 1);
  const host = buildView({ state: snaps.stones, user: { id: "gm", isGM: true }, t, quests });
  assert.equal(host.challenge.forms.length, 1, "el anfitrión solo ve su asiento salvo que active 'en nombre de otros'");
});

test("el tercer desafío arrastra los resultados anteriores al cuenco", () => {
  const { snaps } = simulate("es");
  const c = snaps.finalStones.challenges.at(-1);
  // Base 1+1, más una roja (desafío I fallido) y una blanca (desafío II superado), más 4 blancas de los jugadores.
  assert.deepEqual(c.pile, { white: 1 + 1 + 4, red: 1 + 1 });
});
