import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildTableView, buildCharacterView, buildLobbyView, turnFor, questShortfalls } from "../scripts/view.js";
import { simulate } from "./fixtures.js";

for (const lang of ["es", "en"]) {
  const dict = JSON.parse(readFileSync(new URL(`../lang/${lang}.json`, import.meta.url)));
  const missing = new Set();
  const t = (key, data) => { if (!(key in dict)) missing.add(key); let s = dict[key] ?? key; for (const [k, v] of Object.entries(data ?? {})) s = s.replaceAll(`{${k}}`, v); return s; };
  const { snaps, quests, actors } = simulate(lang);

  test(`[${lang}] todas las vistas de todas las fases, sin traducciones ausentes`, () => {
    for (const [name, state] of Object.entries(snaps)) {
      for (const user of [{ id: "gm", isGM: true }, { id: "lucia", isGM: false }, { id: "irene", isGM: false }]) {
        for (const tab of ["play", "company", "chronicle", "safety", "guide"]) {
          const view = buildTableView({ state, actors, user, t, tab, safety: { lines: ["x"], veils: [], paused: false } });
          assert.ok(view.header, `${name}/${tab}`);
        }
        for (const id of Object.keys(actors)) buildCharacterView({ state, actorId: id, actor: actors[id], actors, user, t });
      }
    }
    for (const tab of ["new", "quests", "archive", "guide"]) buildLobbyView({ quests, users: [{ id: "gm", name: "Manu" }], t, user: { id: "gm", isGM: true }, local: { tab, seats: [{ userId: "gm", name: "Manu" }], editQuest: tab === "quests" ? quests[0] : null }, fellowships: [{ id: "f", name: "X", phase: "complete", result: { success: true } }] });
    buildTableView({ state: null, actors: {}, user: { id: "gm", isGM: true }, t });
    assert.deepEqual([...missing], []);
  });
}

test("cada jugador ve qué le toca", () => {
  const { snaps, actors } = simulate("es");
  const t = (k, d) => `${k}${d ? JSON.stringify(d) : ""}`;
  assert.match(turnFor(snaps.characters, actors, { userId: "irene" }, t).text, /MR.Turn.Characters/);
  assert.match(turnFor(snaps.characters, actors, { userId: "lucia" }, t).text, /WaitingReady.*Pablo/);
  assert.match(turnFor(snaps.choose, actors, { userId: "lucia" }, t).text, /YouPick/);
  assert.match(turnFor(snaps.scene, actors, { userId: "lucia" }, t).text, /YourScene/);
  assert.match(turnFor(snaps.scene, actors, { userId: "pablo" }, t).text, /MR.Turn.Scene/);
  assert.equal(turnFor(snaps.stones, actors, { userId: "irene" }, t).mine, true);
  assert.equal(turnFor(snaps.stones, actors, { userId: "lucia" }, t).mine, false);
});

test("la ficha personal ofrece piedras secretas solo a su dueño y solo al protagonista", () => {
  const { snaps, actors } = simulate("es");
  const t = k => k;
  const irene = buildCharacterView({ state: snaps.stones, actorId: "main3", actor: actors.main3, actors, user: { id: "irene", isGM: false }, t });
  assert.equal(irene.stones.forms.length, 1);
  const lucia = buildCharacterView({ state: snaps.stones, actorId: "main3", actor: actors.main3, actors, user: { id: "lucia", isGM: false }, t });
  assert.equal(lucia.stones, undefined);
  const minor = buildCharacterView({ state: snaps.stones, actorId: "minor3", actor: actors.minor3, actors, user: { id: "irene", isGM: false }, t });
  assert.equal(minor.stones, undefined);
  assert.equal(irene.wantTarget, "Tristán Valcárcel");
});

test("el tercer desafío arrastra los resultados anteriores al cuenco", () => {
  const { snaps } = simulate("es");
  assert.deepEqual(snaps.finalStones.challenges.at(-1).pile, { white: 1 + 1 + 4, red: 1 + 1 });
});

test("las piedras solo se muestran cuando todos han elegido, y cada fase tiene su ayuda", () => {
  const { snaps, actors } = simulate("es");
  const t = key => key;
  const view = state => buildTableView({ state, actors, user: { id: "gm", isGM: true }, t, tab: "play" });
  assert.equal(view(snaps.stones).challenge.reveal, null);
  assert.equal(view(snaps.finalStones).challenge.reveal.length, 4);
  for (const name of ["setup", "characters", "choose", "scene", "stones", "outcome", "epilogue"]) assert.ok(view(snaps[name]).phaseCard?.now, name);
});

test("el editor avisa de las listas que no llegan al mínimo, y las misiones incluidas cumplen", () => {
  const low = questShortfalls({ title: "X", questions: ["¿?"], difficulties: ["a", "b"], concepts: [], desires: [], wants: [], challenges: [{ title: "R" }] });
  assert.deepEqual(low.map(f => f.key), ["questions", "concepts", "desires", "wants", "challenges"]);
  for (const lang of ["es", "en"]) {
    const quests = JSON.parse(readFileSync(new URL(`../data/quests-${lang}.json`, import.meta.url)));
    for (const q of quests) assert.deepEqual(questShortfalls(q).filter(f => f.key !== "wants"), [], `${lang}/${q.title}`);
  }
});
