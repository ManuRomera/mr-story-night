import { reduce, activeMain } from "../scripts/engine.js";
import { readFileSync } from "node:fs";

/**
 * Simula una partida completa con el motor: los personajes son "actores" en un mapa,
 * como en Foundry, y cada jugador rellena el suyo.
 */
export function simulate(lang = "es", questId = "valcarcel") {
  const quests = JSON.parse(readFileSync(new URL(`../data/quests-${lang}.json`, import.meta.url)));
  const quest = quests.find(q => q.id === questId) ?? quests[0];
  const actors = {};
  let n = 0, rolls = [];
  const ctx = (userId = "gm") => ({ userId, isGM: userId === "gm", now: 1_790_000_000_000 + n * 60000, id: () => `id${++n}`, rng: () => (rolls.length ? rolls.shift() : 0.1), describe: id => actors[id] });
  let s = null;
  const run = (op, args = {}, user = "gm") => (s = reduce(s, op, args, ctx(user)));
  const snaps = {};
  const seats = [{ name: "Manu", userId: "gm" }, { name: "Lucía", userId: "lucia" }, { name: "Pablo", userId: "pablo" }, { name: "Irene", userId: "irene" }];
  const characters = seats.flatMap((_, i) => [{ id: `main${i}`, seat: i, role: "main" }, { id: `minor${i}`, seat: i, role: "minor" }]);
  for (const c of characters) actors[c.id] = { name: "", concept: "" };
  run("start", { quest, seats, characters, title: quest.title });
  snaps.setup = s;
  run("setField", { path: "setup.answers.0", value: "La emparedó viva por celos; la carta que lo prueba sigue en la capilla." });
  run("setField", { path: "setup.answers.1", value: "Que nadie se marche hasta que se lean las nueve cláusulas." });
  run("setField", { path: "setup.difficulties.0", value: quest.difficulties[0] });
  run("setField", { path: "setup.difficulties.1", value: quest.difficulties[3] });
  snaps.setupFilled = s;
  run("setupDone");
  snaps.charactersEmpty = s;
  const cast = [
    ["Tristán Valcárcel", "Heredero que cumple treinta", "Que el heredero viva", "Que Leonor admita que me quiere muerto para heredar", "Honorio Osorio", "Capellán del pazo"],
    ["Leonor de Lemos", "Hermana mayor que debió heredar", "Quedarme con el pazo", "Que Adelaida me devuelva las cartas de mi madre", "Remedios", "Ama de llaves"],
    ["Adelaida Montenegro", "Viuda joven de don Honorio", "Saber quién era mi verdadero padre", "Que Sebastián confiese qué vio en el ala este", "Plácido Luján", "Notario"],
    ["Sebastián Altamira", "Médico de la familia", "Que la verdad salga a la luz", "Que Tristán me deje examinarlo", "Carlota", "Niña que ve a la difunta"]
  ];
  s.seats.forEach((seat, i) => {
    const [name, concept, desire, want, mName, mConcept] = cast[i];
    if (i < 3) Object.assign(actors[`main${i}`], { name, concept, desire, want, detail: "Huele a lirios", pronouns: i % 2 ? "ella" : "él" });
    if (i < 3) Object.assign(actors[`minor${i}`], { name: mName, concept: mConcept });
    if (i < 2) run("setReady", { seatId: seat.id, ready: true }, seat.userId);
  });
  snaps.characters = s;
  Object.assign(actors.main3, { name: cast[3][0], concept: cast[3][1], desire: cast[3][2], want: cast[3][3] });
  Object.assign(actors.minor3, { name: cast[3][4], concept: cast[3][5] });
  s.seats.slice(2).forEach(seat => run("setReady", { seatId: seat.id, ready: true }, seat.userId));
  run("charactersDone");
  snaps.chooseEmpty = s;
  const [a, b, c, d] = s.seats;
  run("setPicker", { seatId: b.id }, "lucia");
  run("setField", { path: "challenge.title", value: quest.challenges[0].title }, "lucia");
  run("setField", { path: "challenge.why", value: quest.challenges[0].text }, "lucia");
  run("setField", { path: "challenge.timescale", value: "hours" }, "lucia");
  run("setField", { path: "challenge.leadCharId", value: "main0" }, "lucia");
  snaps.choose = s;
  run("startScenes", {}, "lucia");
  run("setField", { path: "scene.who", value: "Tristán, Leonor y el notario" }, "gm");
  run("setField", { path: "scene.where", value: "La galería de retratos, a la luz de las velas" }, "gm");
  run("setField", { path: "scene.situation", value: "La primera cláusula obliga a Tristán a dormir en el ala este." }, "gm");
  run("endScene");
  run("setField", { path: "scene.where", value: "La cripta familiar" }, "lucia");
  run("setField", { path: "scene.situation", value: "Leonor baja sola a comprobar el nicho vacío." }, "lucia");
  run("addConsequence", { text: "La vela se apaga y alguien cierra la verja desde fuera." }, "pablo");
  snaps.scene = s;
  run("endScene"); run("endScene"); run("endScene");
  run("submitStones", { seatId: b.id, discontent: 1, verdict: "white" }, "lucia");
  run("submitStones", { seatId: c.id, discontent: 0, verdict: "white" }, "pablo");
  snaps.stones = s;
  run("submitStones", { seatId: a.id, discontent: 0, verdict: "white" }, "gm");
  run("submitStones", { seatId: d.id, discontent: 2, verdict: "red" }, "irene");
  rolls = [0.0, 0.99];
  run("draw");
  snaps.outcomeLoss = s;
  run("resolveLoss", { charId: "main3", fate: "left", note: "Sebastián abandona el pazo en plena noche, sin despedirse." });
  snaps.outcome = s;
  run("nextChallenge");
  run("setPicker", { seatId: c.id }, "pablo");
  run("setField", { path: "challenge.title", value: quest.challenges[1].title }, "pablo");
  run("setField", { path: "challenge.timescale", value: "hours" }, "pablo");
  run("setField", { path: "challenge.leadCharId", value: "main1" }, "pablo");
  run("startScenes", {}, "pablo");
  for (let i = 0; i < 4; i++) run("endScene");
  s.seats.forEach(seat => run("submitStones", { seatId: seat.id, discontent: 0, verdict: "white" }, seat.userId));
  rolls = [0.0, 0.0];
  run("draw");
  run("nextChallenge");
  snaps.finalChoose = s;
  run("setPicker", { seatId: d.id }, "irene");
  run("setField", { path: "challenge.title", value: quest.challenges[7].title }, "irene");
  run("setField", { path: "challenge.timescale", value: "hours" }, "irene");
  run("setField", { path: "challenge.leadCharId", value: "main2" }, "irene");
  run("startScenes", {}, "irene");
  for (let i = 0; i < 4; i++) run("endScene");
  s.seats.forEach(seat => run("submitStones", { seatId: seat.id, discontent: 0, verdict: "white" }, seat.userId));
  snaps.finalStones = s;
  rolls = [0.0, 0.0];
  run("draw");
  run("nextChallenge");
  const epi = ["Tristán cumplió treinta y uno. Nunca volvió a entrar en el ala este.", "Leonor vendió el pazo a los tres meses.", "Adelaida encontró el nombre de su padre en el retrato.", "Carlota sigue viendo a la difunta, pero ya no llora."];
  s.seats.forEach((seat, i) => run("setField", { path: `epilogues.${seat.id}`, value: epi[i] }, seat.userId));
  snaps.epilogue = s;
  run("finish");
  snaps.complete = s;
  return { snaps, quests, actors };
}
