import test from "node:test";
import assert from "node:assert/strict";
import { reduce, RuleError, OUTCOMES, activeMain, currentChallenge, availablePickers, leftSeat } from "../scripts/engine.js";

const quest = { id: "q", title: "La prueba", goal: "Cruzar el paso", questions: ["¿Por qué?", "¿Quién manda?"], challenges: ["Cruzar", "Resistir", "Llegar"], concepts: ["Guía"], desires: ["Volver"] };

function makeCtx({ userId = "gm", isGM = true, rolls = [] } = {}) {
  let n = 0; const queue = [...rolls];
  return { userId, isGM, now: 1000, id: () => `id${++n}`, rng: () => (queue.length ? queue.shift() : 0) };
}
/** Contexto compartido que simula al anfitrión aplicando operaciones de distintos usuarios. */
function table() {
  let counter = 0; let rolls = [];
  const ctx = (userId = "gm", isGM = userId === "gm") => ({ userId, isGM, now: 1000 + counter, id: () => `id${++counter}`, rng: () => (rolls.length ? rolls.shift() : 0) });
  let state = null;
  return {
    get state() { return state; },
    run(op, args, user) { state = reduce(state, op, args, ctx(user)); return state; },
    rolls(values) { rolls = [...values]; },
    throws(op, args, user, key) { assert.throws(() => reduce(state, op, args, ctx(user)), error => error instanceof RuleError && (!key || error.key === key)); }
  };
}

function setupToChallenges(t, seats = [{ name: "Ana", userId: "ana" }, { name: "Bea", userId: "bea" }, { name: "Carlos", userId: "carlos" }]) {
  t.run("start", { quest, seats });
  t.run("setField", { path: "setup.answers.0", value: "Porque sí" }, "ana");
  t.run("setupDone", {}, "bea");
  for (const seat of t.state.seats) {
    const main = activeMain(t.state, seat.id);
    t.run("setField", { path: `characters.${main.id}.name`, value: `${seat.name}-main` }, seat.userId);
    t.run("setField", { path: `characters.${main.id}.concept`, value: "Guía" }, seat.userId);
    const minor = t.state.characters.find(c => c.seatId === seat.id && c.role === "minor");
    t.run("setField", { path: `characters.${minor.id}.name`, value: `${seat.name}-minor` }, seat.userId);
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
  const c1 = playChallenge(t, 0, 1, [{ discontent: 0, verdict: "white" }, { discontent: 0, verdict: "white" }, { discontent: 0, verdict: "white" }], [0, 0]);
  assert.deepEqual(c1.pile, { white: 4, red: 1 });
  assert.equal(c1.outcome.key, "white-white");
  t.run("nextChallenge", {}, "carlos");
  const c2 = playChallenge(t, 1, 2, [{ discontent: 2, verdict: "red" }, { discontent: 1, verdict: "white" }, { discontent: 0, verdict: "red" }], [0.99, 0.99]);
  assert.deepEqual(c2.pile, { white: 2, red: 1 + 2 + 1 + 1 + 1 });
  assert.equal(c2.outcome.key, "red-red");
  assert.ok(c2.outcome.betrayal);
  t.throws("nextChallenge", {}, "ana", "MR.Error.LossPending");
  const victim = activeMain(t.state, t.state.seats[0].id);
  t.run("resolveLoss", { charId: victim.id, fate: "betrayed", note: "Vendió el mapa" }, "bea");
  const promoted = activeMain(t.state, t.state.seats[0].id);
  assert.equal(promoted.name, "Ana-minor");
  assert.ok(promoted.promoted);
  t.run("nextChallenge", {}, "ana");
  // Tercer desafío: arrastra un éxito (blanca) y un fracaso (roja).
  const c3 = playChallenge(t, 2, 0, [{ discontent: 0, verdict: "white" }, { discontent: 0, verdict: "white" }, { discontent: 0, verdict: "white" }], [0, 0]);
  assert.deepEqual(c3.pile, { white: 1 + 1 + 3, red: 1 + 1 });
  t.run("nextChallenge", {}, "ana");
  assert.equal(t.state.phase, "epilogue");
  assert.equal(t.state.result.success, true);
  t.run("setField", { path: `epilogues.${t.state.seats[1].id}`, value: "Volvió a casa" }, "bea");
  t.run("finish", {}, "carlos");
  assert.equal(t.state.phase, "complete");
  assert.ok(t.state.log.length > 10);
});

test("las piedras suman según descontento y veredicto", () => {
  const t = table(); setupToChallenges(t);
  const seat = t.state.seats[0];
  t.run("setPicker", { seatId: seat.id });
  t.run("setField", { path: "challenge.title", value: "X" });
  t.run("setField", { path: "challenge.timescale", value: "hours" });
  t.run("setField", { path: "challenge.leadCharId", value: activeMain(t.state, seat.id).id });
  t.run("startScenes");
  t.throws("submitStones", { seatId: seat.id, discontent: 0, verdict: "white" }, "gm", "MR.Error.WrongPhase");
  for (let i = 0; i < 3; i++) t.run("endScene");
  t.throws("submitStones", { seatId: seat.id, discontent: 3, verdict: "white" }, "ana", "MR.Error.BadStones");
  t.throws("submitStones", { seatId: seat.id, discontent: 0, verdict: "white" }, "bea", "MR.Error.NotYourSeat");
  t.run("submitStones", { seatId: seat.id, discontent: 2, verdict: "red" }, "ana");
  assert.deepEqual(currentChallenge(t.state).pile, { white: 1, red: 4 });
  t.throws("submitStones", { seatId: seat.id, discontent: 0, verdict: "white" }, "ana", "MR.Error.AlreadySubmitted");
  t.throws("draw", {}, "ana", "MR.Error.StonesPending");
  t.throws("draw", { force: true }, "ana", "MR.Error.StonesPending");
  t.run("draw", { force: true }, "gm");
  assert.equal(currentChallenge(t.state).draw.length, 2);
});

test("las escenas empiezan por quien lleva al protagonista y siguen en orden", () => {
  const t = table(); setupToChallenges(t);
  const [a, b, c] = t.state.seats;
  t.run("setPicker", { seatId: a.id });
  t.run("setField", { path: "challenge.title", value: "X" });
  t.run("setField", { path: "challenge.timescale", value: "hours" });
  t.run("setField", { path: "challenge.leadCharId", value: activeMain(t.state, c.id).id });
  t.throws("startScenes", {}, "bea", "MR.Error.PickerDecides");
  t.run("startScenes", {}, "ana");
  assert.deepEqual(currentChallenge(t.state).scenes.map(s => s.seatId), [c.id, a.id, b.id]);
});

test("nadie repite como elector hasta que todos han elegido", () => {
  const t = table(); setupToChallenges(t);
  playChallenge(t, 0, 0, Array(3).fill({ discontent: 0, verdict: "white" }), [0, 0]);
  t.run("nextChallenge");
  assert.ok(!availablePickers(t.state).includes(t.state.seats[0].id));
  t.throws("setPicker", { seatId: t.state.seats[0].id }, "ana", "MR.Error.AlreadyPicked");
});

test("cada jugador solo edita sus personajes; el deseo apunta a la izquierda", () => {
  const t = table();
  t.run("start", { quest, seats: [{ name: "Ana", userId: "ana" }, { name: "Bea", userId: "bea" }, { name: "Mesa", userId: null }] });
  t.run("setupDone");
  const [a, b, c] = t.state.seats;
  const main = activeMain(t.state, a.id);
  t.throws("setField", { path: `characters.${main.id}.name`, value: "X" }, "bea", "MR.Error.NotYourSeat");
  t.run("setField", { path: `characters.${activeMain(t.state, c.id).id}.name`, value: "Libre" }, "bea");
  assert.equal(leftSeat(t.state, a.id).id, b.id);
  assert.equal(leftSeat(t.state, c.id).id, a.id);
  const minor = t.state.characters.find(x => x.seatId === a.id && x.role === "minor");
  t.throws("setField", { path: `characters.${minor.id}.want`, value: "X" }, "ana", "MR.Error.NoWant");
  t.throws("setField", { path: "log.0.kind", value: "X" }, "gm", "MR.Error.BadField");
});

test("si un asiento pierde a sus dos personajes puede adoptar o crear uno nuevo", () => {
  const t = table(); setupToChallenges(t);
  const [a, b] = t.state.seats;
  const lose = (charId) => {
    const ch = currentChallenge(t.state);
    ch.stage = "outcome"; ch.outcome = { key: "white-red", ...OUTCOMES["white-red"] }; ch.loss = null;
    t.run("resolveLoss", { charId, fate: "died", note: "" });
  };
  lose(activeMain(t.state, a.id).id);
  lose(activeMain(t.state, a.id).id);
  assert.equal(activeMain(t.state, a.id), null);
  const bMinor = t.state.characters.find(x => x.seatId === b.id && x.role === "minor");
  t.run("replaceMain", { seatId: a.id, mode: "adopt", charId: bMinor.id }, "ana");
  assert.equal(activeMain(t.state, a.id).id, bMinor.id);
  assert.equal(activeMain(t.state, a.id).hasWant, false);
  t.throws("replaceMain", { seatId: a.id, mode: "new", name: "Z" }, "ana", "MR.Error.SeatHasMain");
});

test("la tabla de resultados cubre las cuatro combinaciones", () => {
  assert.deepEqual(Object.keys(OUTCOMES).sort(), ["red-red", "red-white", "white-red", "white-white"]);
  assert.equal(OUTCOMES["white-white"].loss, false);
  assert.equal(OUTCOMES["red-white"].success, true);
  assert.equal(OUTCOMES["white-red"].success, false);
});

test("solo el anfitrión puede reemplazar una historia en curso", () => {
  const t = table(); t.run("start", { quest, seats: [{ name: "A" }, { name: "B" }] });
  t.throws("start", { quest, seats: [{ name: "A" }, { name: "B" }] }, "ana", "MR.Error.HostOnly");
  t.throws("start", { quest, seats: [{ name: "A" }] }, "gm", "MR.Error.FewSeats");
});
