import test from "node:test";
import assert from "node:assert/strict";
import { reduce, RuleError, OUTCOMES, activeMain, currentChallenge, availablePickers, leftSeat } from "../scripts/engine.js";

const quest = { id: "q", title: "La prueba", genre: "fantasy", goal: "Cruzar el paso", questions: ["¿Por qué?", "¿Quién manda?"], challenges: ["Cruzar", "Resistir", "Llegar"], concepts: ["Guía"], desires: ["Volver"] };
const castFor = n => Array.from({ length: n }, (_, i) => [{ id: `m${i}`, seat: i, role: "main" }, { id: `n${i}`, seat: i, role: "minor" }]).flat();

/** Simula al anfitrión: los nombres viven en "actores" (un mapa), como en Foundry. */
function table() {
  let counter = 0; let rolls = [];
  const actors = {};
  const ctx = (userId = "gm", isGM = userId === "gm") => ({ userId, isGM, now: 1000 + counter, id: () => `id${++counter}`, rng: () => (rolls.length ? rolls.shift() : 0), describe: id => actors[id] });
  let state = null;
  return {
    actors,
    get state() { return state; },
    run(op, args, user) { state = reduce(state, op, args, ctx(user)); return state; },
    rolls(values) { rolls = [...values]; },
    throws(op, args, user, key) { assert.throws(() => reduce(state, op, args, ctx(user)), error => error instanceof RuleError && (!key || error.key === key)); }
  };
}

function setupToChallenges(t, seats = [{ name: "Ana", userId: "ana" }, { name: "Bea", userId: "bea" }, { name: "Carlos", userId: "carlos" }]) {
  t.run("start", { quest, seats, characters: castFor(seats.length) });
  t.run("setField", { path: "setup.answers.0", value: "Porque sí" }, "ana");
  t.run("setupDone", {}, "bea");
  for (const seat of t.state.seats) {
    const main = activeMain(t.state, seat.id);
    t.actors[main.id] = { name: `${seat.name}-main`, concept: "Guía" };
    const minor = t.state.characters.find(c => c.seatId === seat.id && c.role === "minor");
    t.actors[minor.id] = { name: `${seat.name}-minor`, concept: "Mulero" };
    t.run("setReady", { seatId: seat.id, ready: true }, seat.userId);
  }
  t.run("charactersDone", {}, "ana");
}

function playChallenge(t, pickerIndex, leadIndex, submissions, rolls) {
  const picker = t.state.seats[pickerIndex];
  t.run("setPicker", { seatId: picker.id }, picker.userId);
  t.run("setField", { path: "challenge.title", value: `Desafío ${pickerIndex}` }, picker.userId);
  t.run("setField", { path: "challenge.timescale", value: "days" }, picker.userId);
  t.run("setField", { path: "challenge.leadCharId", value: activeMain(t.state, t.state.seats[leadIndex].id).id }, picker.userId);
  t.run("startScenes", {}, picker.userId);
  for (let i = 0; i < t.state.seats.length; i++) t.run("endScene", {}, "ana");
  t.state.seats.forEach((seat, i) => t.run("submitStones", { seatId: seat.id, ...submissions[i] }, seat.userId));
  t.rolls(rolls);
  t.run("draw", {}, "bea");
  return currentChallenge(t.state);
}

test("una partida completa recorre preparación, tres desafíos y epílogo", () => {
  const t = table();
  setupToChallenges(t);
  assert.equal(t.state.phase, "challenge");
  assert.match(t.state.log.at(-1).data.names.join(), /Ana-main/);
  const c1 = playChallenge(t, 0, 1, Array(3).fill({ discontent: 0, verdict: "white" }), [0, 0]);
  assert.deepEqual(c1.pile, { white: 4, red: 1 });
  assert.equal(c1.outcome.key, "white-white");
  t.run("nextChallenge", {}, "carlos");
  const c2 = playChallenge(t, 1, 2, [{ discontent: 2, verdict: "red" }, { discontent: 1, verdict: "white" }, { discontent: 0, verdict: "red" }], [0.99, 0.99]);
  assert.deepEqual(c2.pile, { white: 2, red: 6 });
  assert.equal(c2.outcome.key, "red-red");
  t.throws("nextChallenge", {}, "ana", "MR.Error.LossPending");
  const victim = activeMain(t.state, t.state.seats[0].id);
  t.run("resolveLoss", { charId: victim.id, fate: "betrayed", note: "Vendió el mapa" }, "bea");
  assert.equal(t.state.log.at(-1).data.name, "Ana-main");
  const promoted = activeMain(t.state, t.state.seats[0].id);
  assert.equal(promoted.id, "n0");
  assert.ok(promoted.promoted);
  t.run("nextChallenge", {}, "ana");
  const c3 = playChallenge(t, 2, 0, Array(3).fill({ discontent: 0, verdict: "white" }), [0, 0]);
  assert.deepEqual(c3.pile, { white: 5, red: 2 });
  t.run("nextChallenge", {}, "ana");
  assert.equal(t.state.phase, "epilogue");
  assert.equal(t.state.result.success, true);
  t.run("setField", { path: `epilogues.${t.state.seats[1].id}`, value: "Volvió a casa" }, "bea");
  t.throws("setField", { path: `epilogues.${t.state.seats[1].id}`, value: "X" }, "ana", "MR.Error.NotYourSeat");
  t.run("finish", {}, "carlos");
  assert.equal(t.state.phase, "complete");
});

test("no se puede estar listo sin nombre y concepto en la ficha", () => {
  const t = table();
  t.run("start", { quest, seats: [{ name: "A", userId: "a" }, { name: "B", userId: "b" }], characters: castFor(2) });
  t.run("setupDone");
  t.throws("setReady", { seatId: t.state.seats[0].id, ready: true }, "a", "MR.Error.NeedMain");
  t.actors.m0 = { name: "Aldara", concept: "Guía" };
  t.run("setReady", { seatId: t.state.seats[0].id, ready: true }, "a");
  t.throws("setReady", { seatId: t.state.seats[1].id, ready: true }, "a", "MR.Error.NotYourSeat");
  t.throws("charactersDone", {}, "a", "MR.Error.NotAllReady");
  t.run("charactersDone", { force: true }, "gm");
});

test("las piedras suman según descontento y veredicto, y son de cada asiento", () => {
  const t = table(); setupToChallenges(t);
  const seat = t.state.seats[0];
  t.run("setPicker", { seatId: seat.id });
  t.run("setField", { path: "challenge.title", value: "X" });
  t.run("setField", { path: "challenge.timescale", value: "hours" });
  t.run("setField", { path: "challenge.leadCharId", value: activeMain(t.state, seat.id).id });
  t.run("startScenes");
  for (let i = 0; i < 3; i++) t.run("endScene");
  t.throws("submitStones", { seatId: seat.id, discontent: 3, verdict: "white" }, "ana", "MR.Error.BadStones");
  t.throws("submitStones", { seatId: seat.id, discontent: 0, verdict: "white" }, "bea", "MR.Error.NotYourSeat");
  t.run("submitStones", { seatId: seat.id, discontent: 2, verdict: "red" }, "ana");
  assert.deepEqual(currentChallenge(t.state).pile, { white: 1, red: 4 });
  t.throws("submitStones", { seatId: seat.id, discontent: 0, verdict: "white" }, "ana", "MR.Error.AlreadySubmitted");
  t.throws("draw", { force: true }, "ana", "MR.Error.StonesPending");
  t.run("draw", { force: true }, "gm");
  assert.equal(currentChallenge(t.state).draw.length, 2);
});

test("las escenas empiezan por quien lleva al protagonista y solo quien elige rellena el desafío", () => {
  const t = table(); setupToChallenges(t);
  const [a, b, c] = t.state.seats;
  t.throws("setField", { path: "challenge.title", value: "X" }, "ana", "MR.Error.NeedPicker");
  t.run("setPicker", { seatId: a.id }, "bea");
  t.throws("setField", { path: "challenge.title", value: "X" }, "bea", "MR.Error.PickerDecides");
  t.run("setField", { path: "challenge.title", value: "X" }, "ana");
  t.run("setField", { path: "challenge.timescale", value: "hours" }, "ana");
  t.run("setField", { path: "challenge.leadCharId", value: activeMain(t.state, c.id).id }, "ana");
  t.run("startScenes", {}, "ana");
  assert.deepEqual(currentChallenge(t.state).scenes.map(s => s.seatId), [c.id, a.id, b.id]);
  t.throws("setField", { path: "scene.where", value: "X" }, "ana", "MR.Error.EstablisherDecides");
  t.run("setField", { path: "scene.where", value: "El puente" }, "carlos");
});

test("nadie repite como elector hasta que todos han elegido", () => {
  const t = table(); setupToChallenges(t);
  playChallenge(t, 0, 0, Array(3).fill({ discontent: 0, verdict: "white" }), [0, 0]);
  t.run("nextChallenge");
  assert.ok(!availablePickers(t.state).includes(t.state.seats[0].id));
  t.throws("setPicker", { seatId: t.state.seats[0].id }, "ana", "MR.Error.AlreadyPicked");
});

test("el deseo apunta al asiento de la izquierda", () => {
  const t = table();
  t.run("start", { quest, seats: [{ name: "A" }, { name: "B" }, { name: "C" }], characters: castFor(3) });
  const [a, b, c] = t.state.seats;
  assert.equal(leftSeat(t.state, a.id).id, b.id);
  assert.equal(leftSeat(t.state, c.id).id, a.id);
});

test("si un asiento pierde a sus dos personajes puede adoptar o presentar a alguien nuevo", () => {
  const t = table(); setupToChallenges(t);
  const [a, b] = t.state.seats;
  const lose = charId => {
    const ch = currentChallenge(t.state);
    ch.stage = "outcome"; ch.outcome = { key: "white-red", ...OUTCOMES["white-red"] }; ch.loss = null;
    t.run("resolveLoss", { charId, fate: "died", note: "" });
  };
  lose(activeMain(t.state, a.id).id);
  lose(activeMain(t.state, a.id).id);
  assert.equal(activeMain(t.state, a.id), null);
  t.run("replaceMain", { seatId: a.id, mode: "adopt", charId: "n1" }, "ana");
  assert.equal(activeMain(t.state, a.id).id, "n1");
  assert.equal(activeMain(t.state, a.id).hasWant, false);
  t.throws("replaceMain", { seatId: a.id, mode: "new", charId: "x9" }, "ana", "MR.Error.SeatHasMain");
  lose("n1");
  t.run("replaceMain", { seatId: a.id, mode: "new", charId: "x9", name: "Nueva" }, "ana");
  assert.equal(activeMain(t.state, a.id).id, "x9");
});

test("la tabla de resultados cubre las cuatro combinaciones", () => {
  assert.deepEqual(Object.keys(OUTCOMES).sort(), ["red-red", "red-white", "white-red", "white-white"]);
  assert.equal(OUTCOMES["white-white"].loss, false);
  assert.equal(OUTCOMES["red-white"].success, true);
  assert.equal(OUTCOMES["white-red"].success, false);
});

test("empezar exige personajes para cada asiento y solo el anfitrión reemplaza una historia", () => {
  const t = table();
  t.throws("start", { quest, seats: [{ name: "A" }, { name: "B" }], characters: castFor(1) }, "gm", "MR.Error.NoCharacter");
  t.run("start", { quest, seats: [{ name: "A" }, { name: "B" }], characters: castFor(2) });
  t.throws("start", { quest, seats: [{ name: "A" }, { name: "B" }], characters: castFor(2) }, "ana", "MR.Error.HostOnly");
  t.throws("start", { quest, seats: [{ name: "A" }], characters: castFor(1) }, "gm", "MR.Error.FewSeats");
});
