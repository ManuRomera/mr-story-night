import { reduce, activeMain } from "../scripts/engine.js";
import { readFileSync } from "node:fs";

/** Simula una partida real con el motor y devuelve una instantánea de cada momento. */
export function simulate(lang = "es") {
  const quests = JSON.parse(readFileSync(new URL(`../data/quests-${lang}.json`, import.meta.url)));
  let n = 0, rolls = [];
  const ctx = (userId = "gm") => ({ userId, isGM: userId === "gm", now: 1_700_000_000_000 + n * 60000, id: () => `id${++n}`, rng: () => (rolls.length ? rolls.shift() : 0.1) });
  let s = null;
  const run = (op, args = {}, user = "gm") => (s = reduce(s, op, args, ctx(user)));
  const snaps = {};
  const quest = quests[0];
  run("start", { quest, seats: [{ name: "Manu", userId: "gm" }, { name: "Lucía", userId: "lucia" }, { name: "Pablo", userId: "pablo" }, { name: "Irene", userId: "irene" }] });
  snaps.setupEmpty = s;
  run("setField", { path: "setup.answers.0", value: "Un rayo, dicen; pero el molinero culpa a los forasteros." });
  run("setField", { path: "setup.answers.1", value: "El abad teme que el invierno también los alcance a ellos." });
  run("setField", { path: "setup.difficulties.0", value: quest.difficulties[0] });
  run("setField", { path: "setup.difficulties.1", value: quest.difficulties[2] });
  snaps.setup = s;
  run("setupDone");
  const cast = [
    ["Aldara", "Guía de montaña retirada", "Recuperar el respeto que perdí", "Que Tobías admita que la avalancha no fue culpa mía", "Brun", "Mulero del pueblo"],
    ["Tobías", "Hija del molinero", "Salvar a mi familia del hambre", "Que Ester me cuente qué sabe del incendio", "Maese Oriol", "Herrero viudo"],
    ["Ester", "Novicio fugado del monasterio", "Averiguar qué fue de quien cruzó el paso y no volvió", "Que Nuño me deje volver a casa conmigo", "La Roja", "Contrabandista"],
    ["Nuño", "Soldado licenciado", "Demostrar que no soy un cobarde", "Que Aldara me enseñe el camino viejo", "Sor Inés", "Monja cocinera"]
  ];
  snaps.charactersEmpty = s;
  s.seats.forEach((seat, i) => {
    const main = activeMain(s, seat.id);
    const minor = s.characters.find(c => c.seatId === seat.id && c.role === "minor");
    const [name, concept, desire, want, mName, mConcept] = cast[i];
    for (const [k, v] of Object.entries({ name, concept, desire, want })) run("setField", { path: `characters.${main.id}.${k}`, value: v }, seat.userId);
    run("setField", { path: `characters.${minor.id}.name`, value: mName }, seat.userId);
    run("setField", { path: `characters.${minor.id}.concept`, value: mConcept }, seat.userId);
    if (i < 2) run("setReady", { seatId: seat.id, ready: true }, seat.userId);
  });
  snaps.characters = s;
  s.seats.slice(2).forEach(seat => run("setReady", { seatId: seat.id, ready: true }, seat.userId));
  run("charactersDone");
  snaps.chooseEmpty = s;
  const [a, b, c, d] = s.seats;
  run("setPicker", { seatId: b.id }, "lucia");
  run("setField", { path: "challenge.title", value: quest.challenges[0].title }, "lucia");
  run("setField", { path: "challenge.why", value: quest.challenges[0].text + " Y el consejo no se fía de Aldara." }, "lucia");
  run("setField", { path: "challenge.timescale", value: "days" }, "lucia");
  run("setField", { path: "challenge.leadCharId", value: activeMain(s, a.id).id }, "lucia");
  snaps.choose = s;
  run("startScenes", {}, "lucia");
  run("setField", { path: "scene.who", value: "Aldara, Tobías y el consejo" }, "gm");
  run("setField", { path: "scene.where", value: "La sala del concejo, con el granero aún humeando fuera" }, "gm");
  run("setField", { path: "scene.situation", value: "Aldara pide las mulas; el alcalde exige que alguien responda por ellas." }, "gm");
  run("endScene");
  run("setField", { path: "scene.who", value: "Tobías y Maese Oriol" }, "lucia");
  run("setField", { path: "scene.where", value: "La herrería, de madrugada" }, "lucia");
  run("setField", { path: "scene.situation", value: "Tobías intenta que el herrero le fíe herraduras para las mulas." }, "lucia");
  run("addConsequence", { text: "Oriol acepta, pero se queda con el anillo de la madre de Tobías." }, "pablo");
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
  run("resolveLoss", { charId: activeMain(s, d.id).id, fate: "left", note: "Nuño se queda en el pueblo: no soporta mirar a Aldara." });
  snaps.outcome = s;
  run("nextChallenge");
  // Desafío 2
  run("setPicker", { seatId: c.id }, "pablo");
  run("setField", { path: "challenge.title", value: quest.challenges[2].title }, "pablo");
  run("setField", { path: "challenge.timescale", value: "hours" }, "pablo");
  run("setField", { path: "challenge.leadCharId", value: activeMain(s, b.id).id }, "pablo");
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
  run("setField", { path: "challenge.leadCharId", value: activeMain(s, c.id).id }, "irene");
  run("startScenes", {}, "irene");
  for (let i = 0; i < 4; i++) run("endScene");
  s.seats.forEach(seat => run("submitStones", { seatId: seat.id, discontent: 0, verdict: "white" }, seat.userId));
  snaps.finalStones = s;
  rolls = [0.0, 0.0];
  run("draw");
  run("nextChallenge");
  const epi = ["Aldara volvió a guiar caravanas; nadie volvió a mencionar la avalancha.", "Tobías reconstruyó el granero con sus propias manos.", "Ester regresó al monasterio, esta vez por la puerta principal.", "Sor Inés cocinó para el pueblo todo aquel invierno."];
  s.seats.forEach((seat, i) => run("setField", { path: `epilogues.${seat.id}`, value: epi[i] }, seat.userId));
  snaps.epilogue = s;
  run("finish");
  snaps.complete = s;
  return { snaps, quests };
}
