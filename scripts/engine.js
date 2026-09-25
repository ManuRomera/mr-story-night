/**
 * Motor de reglas de la mesa. Lógica pura: no depende de Foundry.
 * Cada operación recibe el estado actual y devuelve un estado nuevo;
 * quien llama aporta el contexto (usuario, reloj, azar, generador de ids).
 */

export const SCHEMA = 2;
export const CHALLENGE_COUNT = 3;
export const PHASES = ["setup", "characters", "challenge", "epilogue", "complete"];
export const STAGES = ["choose", "scenes", "stones", "outcome"];
export const FATES = ["died", "left", "expelled", "betrayed"];
export const TIMESCALES = ["minutes", "hours", "days", "weeks", "months", "years"];
export const DISCONTENT = [0, 1, 2];
export const MIN_SEATS = 2;
export const MAX_SEATS = 6;
export const MAX_TEXT = 4000;

/** Tabla de resultados: primera piedra, segunda piedra. Ajustable si tu edición difiere. */
export const OUTCOMES = Object.freeze({
  "white-white": { success: true, loss: false, betrayal: false },
  "red-white": { success: true, loss: true, betrayal: false },
  "white-red": { success: false, loss: true, betrayal: false },
  "red-red": { success: false, loss: true, betrayal: true }
});

export class RuleError extends Error {
  constructor(key) { super(key); this.name = "RuleError"; this.key = key; }
}
const fail = key => { throw new RuleError(key); };
const text = value => String(value ?? "").slice(0, MAX_TEXT);

/* ---------- Consultas ---------- */

export const currentChallenge = state => state?.challenges?.at(-1) ?? null;
export const seatById = (state, id) => state.seats.find(seat => seat.id === id) ?? null;
export const charById = (state, id) => state.characters.find(c => c.id === id) ?? null;
export const activeMain = (state, seatId) => state.characters.find(c => c.seatId === seatId && c.role === "main" && c.status === "active") ?? null;
export const activeMinor = (state, seatId) => state.characters.find(c => c.seatId === seatId && c.role === "minor" && c.status === "active") ?? null;
export const leftSeat = (state, seatId) => {
  const index = state.seats.findIndex(seat => seat.id === seatId);
  return state.seats[(index + 1) % state.seats.length];
};
export const canActFor = (state, seatId, ctx) => {
  if (ctx.isGM) return true;
  const seat = seatById(state, seatId);
  return Boolean(seat) && (seat.userId === null || seat.userId === ctx.userId);
};
/** Quien elige un desafío no puede haber elegido uno anterior (si todos ya eligieron, vuelve a abrirse). */
export const availablePickers = state => {
  const previous = new Set(state.challenges.slice(0, -1).map(c => c.pickerSeatId));
  const free = state.seats.filter(seat => !previous.has(seat.id));
  return (free.length ? free : state.seats).map(seat => seat.id);
};
export const results = state => state.challenges.filter(c => c.outcome).map(c => c.outcome.success);

/* ---------- Construcción ---------- */

function makeCharacter(ctx, seatId, role, extra = {}) {
  return { id: ctx.id(), seatId, role, concept: "", name: "", pronouns: "", desire: "", want: "", img: "", status: "active", fate: null, fateNote: "", lostIn: null, promoted: false, hasWant: role === "main", ...extra };
}

function makeChallenge(index) {
  return { index, stage: "choose", pickerSeatId: null, title: "", why: "", leadCharId: null, timescale: "", scenes: [], sceneIndex: 0, pile: null, submitted: [], draw: [], outcome: null, loss: null };
}

function log(state, ctx, kind, data = {}) {
  state.log.push({ id: ctx.id(), at: ctx.now, kind, data });
}

function sanitizeQuest(quest) {
  const list = value => (Array.isArray(value) ? value : []).map(v => typeof v === "string" ? text(v).trim() : v).filter(Boolean);
  if (!quest || typeof quest !== "object" || !String(quest.title ?? "").trim()) fail("MR.Error.NoQuest");
  return {
    id: text(quest.id), title: text(quest.title).trim(), tagline: text(quest.tagline), intro: text(quest.intro), goal: text(quest.goal),
    theme: text(quest.theme || "neutral"), questions: list(quest.questions), difficulties: list(quest.difficulties),
    concepts: list(quest.concepts), desires: list(quest.desires),
    challenges: list(quest.challenges).map(c => typeof c === "string" ? { title: c, text: "" } : { title: text(c.title), text: text(c.text) }).filter(c => c.title)
  };
}

/* ---------- Operaciones ---------- */

const OPS = {
  start(state, { quest, seats }, ctx) {
    if (state && state.phase !== "complete" && !ctx.isGM) fail("MR.Error.HostOnly");
    const cleanQuest = sanitizeQuest(quest);
    if (!Array.isArray(seats) || seats.length < MIN_SEATS) fail("MR.Error.FewSeats");
    if (seats.length > MAX_SEATS) fail("MR.Error.ManySeats");
    const cleanSeats = seats.map(seat => ({ id: ctx.id(), userId: seat.userId ?? null, name: text(seat.name).trim() || "?", ready: false }));
    const next = {
      schema: SCHEMA, id: ctx.id(), createdAt: ctx.now, updatedAt: ctx.now, phase: "setup", result: null,
      quest: cleanQuest, seats: cleanSeats,
      setup: { goal: cleanQuest.goal, answers: cleanQuest.questions.map(() => ""), difficulties: ["", ""] },
      characters: cleanSeats.flatMap(seat => [makeCharacter(ctx, seat.id, "main"), makeCharacter(ctx, seat.id, "minor")]),
      challenges: [], epilogues: {}, log: []
    };
    log(next, ctx, "start", { quest: cleanQuest.title });
    return next;
  },

  setField(state, { path, value }, ctx) {
    requireStory(state);
    if (state.phase === "complete") fail("MR.Error.StoryClosed");
    const parts = String(path ?? "").split(".");
    const [root, key, field] = parts;
    const v = text(value);
    if (root === "setup") {
      if (state.phase !== "setup") fail("MR.Error.WrongPhase");
      if (key === "goal" && parts.length === 2) { state.setup.goal = v; return state; }
      const index = Number(field);
      if (key === "answers" && Number.isInteger(index) && index >= 0 && index < state.setup.answers.length) { state.setup.answers[index] = v; return state; }
      if (key === "difficulties" && (index === 0 || index === 1)) { state.setup.difficulties[index] = v; return state; }
    }
    if (root === "characters" && ["concept", "name", "pronouns", "desire", "want", "img"].includes(field)) {
      const character = charById(state, key) ?? fail("MR.Error.NoCharacter");
      if (!canActFor(state, character.seatId, ctx)) fail("MR.Error.NotYourSeat");
      if (field === "want" && !character.hasWant) fail("MR.Error.NoWant");
      character[field] = v; return state;
    }
    if (root === "seats" && field === "name") {
      const seat = seatById(state, key) ?? fail("MR.Error.NoSeat");
      if (!canActFor(state, seat.id, ctx)) fail("MR.Error.NotYourSeat");
      seat.name = v.trim() || seat.name; return state;
    }
    if (root === "challenge" && ["title", "why", "timescale", "leadCharId"].includes(key) && parts.length === 2) {
      const challenge = requireStage(state, "choose");
      if (!challenge.pickerSeatId) fail("MR.Error.NeedPicker");
      if (!canActFor(state, challenge.pickerSeatId, ctx)) fail("MR.Error.PickerDecides");
      if (key === "leadCharId" && v && !isActiveMain(state, v)) fail("MR.Error.LeadMustBeMain");
      challenge[key] = key === "leadCharId" ? (v || null) : v; return state;
    }
    if (root === "scene" && ["who", "where", "situation", "summary"].includes(key) && parts.length === 2) {
      const challenge = requireStage(state, "scenes");
      const scene = challenge.scenes[challenge.sceneIndex];
      if (!canActFor(state, scene.seatId, ctx)) fail("MR.Error.EstablisherDecides");
      scene[key] = v; return state;
    }
    if (root === "epilogues") {
      if (state.phase !== "epilogue") fail("MR.Error.WrongPhase");
      if (!seatById(state, key)) fail("MR.Error.NoSeat");
      if (!canActFor(state, key, ctx)) fail("MR.Error.NotYourSeat");
      state.epilogues[key] = v; return state;
    }
    fail("MR.Error.BadField");
  },

  setupDone(state, _args, ctx) {
    requirePhase(state, "setup");
    if (!state.setup.goal.trim()) fail("MR.Error.NeedGoal");
    state.phase = "characters";
    log(state, ctx, "setup", { goal: state.setup.goal });
    return state;
  },

  setReady(state, { seatId, ready }, ctx) {
    requirePhase(state, "characters");
    const seat = seatById(state, seatId) ?? fail("MR.Error.NoSeat");
    if (!canActFor(state, seatId, ctx)) fail("MR.Error.NotYourSeat");
    if (ready) {
      const main = activeMain(state, seatId);
      if (!main?.name.trim() || !main.concept.trim()) fail("MR.Error.NeedMain");
    }
    seat.ready = Boolean(ready);
    return state;
  },

  charactersDone(state, { force = false } = {}, ctx) {
    requirePhase(state, "characters");
    const pending = state.seats.filter(seat => !seat.ready);
    if (pending.length && !(force && ctx.isGM)) fail("MR.Error.NotAllReady");
    for (const seat of state.seats) {
      const main = activeMain(state, seat.id);
      if (!main?.name.trim()) fail("MR.Error.NeedMain");
    }
    state.phase = "challenge";
    state.challenges.push(makeChallenge(0));
    log(state, ctx, "company", { names: state.seats.map(seat => activeMain(state, seat.id).name) });
    return state;
  },

  setPicker(state, { seatId }, ctx) {
    const challenge = requireStage(state, "choose");
    if (!seatById(state, seatId)) fail("MR.Error.NoSeat");
    if (!availablePickers(state).includes(seatId)) fail("MR.Error.AlreadyPicked");
    challenge.pickerSeatId = seatId;
    return state;
  },

  startScenes(state, _args, ctx) {
    const challenge = requireStage(state, "choose");
    if (!challenge.pickerSeatId) fail("MR.Error.NeedPicker");
    if (!canActFor(state, challenge.pickerSeatId, ctx)) fail("MR.Error.PickerDecides");
    if (!challenge.title.trim()) fail("MR.Error.NeedChallenge");
    if (!challenge.timescale.trim()) fail("MR.Error.NeedTimescale");
    const lead = charById(state, challenge.leadCharId);
    if (!lead || !isActiveMain(state, lead.id)) fail("MR.Error.LeadMustBeMain");
    const start = state.seats.findIndex(seat => seat.id === lead.seatId);
    const order = state.seats.map((_, i) => state.seats[(start + i) % state.seats.length].id);
    challenge.scenes = order.map(seatId => ({ seatId, who: "", where: "", situation: "", summary: "", consequences: [], done: false }));
    challenge.sceneIndex = 0;
    challenge.stage = "scenes";
    log(state, ctx, "challenge", { n: challenge.index + 1, title: challenge.title, lead: lead.name });
    return state;
  },

  addConsequence(state, { text: value }, ctx) {
    const challenge = requireStage(state, "scenes");
    const clean = text(value).trim();
    if (!clean) fail("MR.Error.Empty");
    challenge.scenes[challenge.sceneIndex].consequences.push({ id: ctx.id(), text: clean });
    return state;
  },

  removeConsequence(state, { id }) {
    const challenge = requireStage(state, "scenes");
    const scene = challenge.scenes[challenge.sceneIndex];
    scene.consequences = scene.consequences.filter(c => c.id !== id);
    return state;
  },

  endScene(state, _args, ctx) {
    const challenge = requireStage(state, "scenes");
    const scene = challenge.scenes[challenge.sceneIndex];
    scene.done = true;
    log(state, ctx, "scene", { n: challenge.sceneIndex + 1, seat: seatById(state, scene.seatId)?.name, summary: scene.summary || scene.situation });
    challenge.sceneIndex += 1;
    if (challenge.sceneIndex >= challenge.scenes.length) {
      challenge.sceneIndex = challenge.scenes.length - 1;
      challenge.stage = "stones";
      challenge.pile = { white: 1, red: 1 };
      if (challenge.index === CHALLENGE_COUNT - 1) {
        for (const success of results(state)) challenge.pile[success ? "white" : "red"] += 1;
      }
      challenge.submitted = [];
    }
    return state;
  },

  submitStones(state, { seatId, discontent, verdict }, ctx) {
    const challenge = requireStage(state, "stones");
    if (!seatById(state, seatId)) fail("MR.Error.NoSeat");
    if (!canActFor(state, seatId, ctx)) fail("MR.Error.NotYourSeat");
    if (challenge.submitted.includes(seatId)) fail("MR.Error.AlreadySubmitted");
    const reds = Number(discontent);
    if (!DISCONTENT.includes(reds)) fail("MR.Error.BadStones");
    if (!["white", "red"].includes(verdict)) fail("MR.Error.BadStones");
    challenge.pile.red += reds;
    challenge.pile[verdict] += 1;
    challenge.submitted.push(seatId);
    return state;
  },

  draw(state, { force = false } = {}, ctx) {
    const challenge = requireStage(state, "stones");
    if (challenge.submitted.length < state.seats.length && !(force && ctx.isGM)) fail("MR.Error.StonesPending");
    const bag = [...Array(challenge.pile.white).fill("white"), ...Array(challenge.pile.red).fill("red")];
    const take = () => bag.splice(Math.min(bag.length - 1, Math.floor(ctx.rng() * bag.length)), 1)[0];
    challenge.draw = [take(), take()];
    const key = challenge.draw.join("-");
    challenge.outcome = { key, ...OUTCOMES[key] };
    challenge.stage = "outcome";
    log(state, ctx, "draw", { n: challenge.index + 1, key });
    return state;
  },

  resolveLoss(state, { charId, fate, note }, ctx) {
    const challenge = requireStage(state, "outcome");
    if (!challenge.outcome.loss) fail("MR.Error.NoLossNeeded");
    if (challenge.loss) fail("MR.Error.LossDone");
    const character = charById(state, charId);
    if (!character || character.status !== "active") fail("MR.Error.NoCharacter");
    if (!FATES.includes(fate)) fail("MR.Error.BadFate");
    loseCharacter(state, character, fate, text(note), challenge.index);
    challenge.loss = { charId, fate, note: text(note) };
    log(state, ctx, "loss", { name: character.name || character.concept, fate, note: text(note) });
    return state;
  },

  replaceMain(state, { seatId, mode, charId, name, concept }, ctx) {
    if (!["challenge", "epilogue"].includes(state?.phase)) fail("MR.Error.WrongPhase");
    if (!canActFor(state, seatId, ctx)) fail("MR.Error.NotYourSeat");
    if (activeMain(state, seatId)) fail("MR.Error.SeatHasMain");
    if (mode === "adopt") {
      const minor = charById(state, charId);
      if (!minor || minor.role !== "minor" || minor.status !== "active") fail("MR.Error.NoCharacter");
      minor.seatId = seatId; minor.role = "main"; minor.promoted = true;
      log(state, ctx, "adopt", { name: minor.name || minor.concept, seat: seatById(state, seatId).name });
      return state;
    }
    const clean = text(name).trim();
    if (!clean) fail("MR.Error.NeedName");
    state.characters.push(makeCharacter(ctx, seatId, "main", { name: clean, concept: text(concept), hasWant: false, promoted: true }));
    log(state, ctx, "newcomer", { name: clean, seat: seatById(state, seatId).name });
    return state;
  },

  nextChallenge(state, _args, ctx) {
    const challenge = requireStage(state, "outcome");
    if (challenge.outcome.loss && !challenge.loss) fail("MR.Error.LossPending");
    if (challenge.index < CHALLENGE_COUNT - 1) state.challenges.push(makeChallenge(challenge.index + 1));
    else {
      state.phase = "epilogue";
      state.result = { success: challenge.outcome.success };
      log(state, ctx, "questEnd", { success: challenge.outcome.success });
    }
    return state;
  },

  finish(state, _args, ctx) {
    requirePhase(state, "epilogue");
    state.phase = "complete";
    state.completedAt = ctx.now;
    log(state, ctx, "finish", {});
    return state;
  }
};

function loseCharacter(state, character, fate, note, index) {
  character.status = "lost"; character.fate = fate; character.fateNote = note; character.lostIn = index;
  if (character.role === "main") {
    const minor = activeMinor(state, character.seatId);
    if (minor) { minor.role = "main"; minor.promoted = true; }
  }
}

function isActiveMain(state, id) {
  const c = charById(state, id);
  return Boolean(c) && c.role === "main" && c.status === "active";
}
function requireStory(state) { if (!state) fail("MR.Error.NoStory"); }
function requirePhase(state, phase) { requireStory(state); if (state.phase !== phase) fail("MR.Error.WrongPhase"); }
function requireStage(state, stage) {
  requirePhase(state, "challenge");
  const challenge = currentChallenge(state);
  if (challenge?.stage !== stage) fail("MR.Error.WrongPhase");
  return challenge;
}

export const OPERATIONS = Object.freeze(Object.keys(OPS));

/** Aplica una operación. Devuelve un estado nuevo; lanza RuleError si no está permitida. */
export function reduce(state, op, args = {}, ctx) {
  const handler = OPS[op];
  if (!handler) fail("MR.Error.UnknownOp");
  const next = handler(structuredClone(state ?? null), args ?? {}, ctx);
  if (next) next.updatedAt = ctx.now;
  return next;
}
