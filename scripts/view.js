/**
 * Modelos de vista (puros, sin Foundry) para:
 *  - la ficha común de la compañía (buildTableView),
 *  - la ficha personal de cada personaje (buildCharacterView),
 *  - el vestíbulo con misiones y archivo (buildLobbyView).
 * Los datos descriptivos de los personajes llegan en `actors` (id → {name, img, concept, …}).
 */
import { CHALLENGE_COUNT, FATES, TIMESCALES, activeMain, activeMinor, availablePickers, canActFor, charById, currentChallenge, leftSeat, seatById, seatComplete } from "./engine.js";
import { GENRES, genreOf } from "./generators.js";

export const THEMES = ["neutral", "fantasy", "sci-fi", "horror", "cosmic", "gothic", "folk", "noir", "western", "postapoc", "cyberpunk"];
const ROMAN = ["I", "II", "III", "IV", "V"];
const initials = name => String(name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || "?";
const TAB_ICONS = { play: "fa-solid fa-dice-d6", company: "fa-solid fa-people-group", chronicle: "fa-solid fa-scroll", safety: "fa-solid fa-shield-heart", guide: "fa-solid fa-book-open" };

/* ------------------------------------------------------------------ */
/* Tutorial                                                            */
/* ------------------------------------------------------------------ */

/** Secciones del tutorial y cuántos pasos tiene cada una en lang/*.json (MR.Guide.<key>.StepN). */
const GUIDE = { basics: 6, setup: 5, characters: 5, choose: 5, scenes: 5, stones: 5, outcome: 4, epilogue: 3 };

/** Sección del tutorial que corresponde al momento actual de la partida. */
export function guideKey(state) {
  if (!state || state.phase === "complete") return null;
  if (state.phase === "challenge") return currentChallenge(state).stage;
  return state.phase;
}

export function guideView(t, current = null) {
  return {
    sections: Object.entries(GUIDE).map(([key, steps], i) => ({
      key, n: i, title: t(`MR.Guide.${key}.Title`), why: t(`MR.Guide.${key}.Why`), current: key === current,
      steps: Array.from({ length: steps }, (_, j) => t(`MR.Guide.${key}.Step${j + 1}`))
    }))
  };
}

/** Tarjeta breve al principio de cada fase: qué hacéis ahora y para qué sirve. */
function phaseCard(key, t) {
  return key ? { key, title: t(`MR.Guide.${key}.Title`), now: t(`MR.Guide.${key}.Now`), why: t(`MR.Guide.${key}.Why`) } : null;
}

/* ------------------------------------------------------------------ */
/* Personajes                                                          */
/* ------------------------------------------------------------------ */

function describe(actors, id) { return actors?.[id] ?? { name: "", concept: "" }; }

function card(state, c, actors, t, ctx) {
  if (!c) return null;
  const d = describe(actors, c.id);
  const leftMain = c.role === "main" && c.hasWant ? activeMain(state, leftSeat(state, c.seatId).id) : null;
  const seat = seatById(state, c.seatId);
  return {
    ...c, ...d, id: c.id, name: d.name || "", displayName: d.name || d.concept || t("MR.Character.Unnamed"), initials: initials(d.name || d.concept),
    lost: c.status === "lost", fateLabel: c.fate ? t(`MR.Fate.${c.fate}`) : "", roleLabel: t(`MR.Role.${c.role}`),
    wantTarget: leftMain ? (describe(actors, leftMain.id).name || t("MR.Character.LeftNeighbour")) : "",
    seatName: seat?.name ?? "", isMine: seat?.userId === ctx.userId, canEdit: canActFor(state, c.seatId, ctx)
  };
}

/* ------------------------------------------------------------------ */
/* Ficha común                                                         */
/* ------------------------------------------------------------------ */

export function buildTableView({ state, actors = {}, user, t, tab = "play", local = {}, safety = null, title = "" }) {
  const ctx = { userId: user.id, isGM: user.isGM };
  const complete = state?.phase === "complete";
  const view = {
    tab, isGM: user.isGM, complete, theme: state?.quest?.theme || "neutral",
    tabs: ["play", "company", "chronicle", "safety", "guide"].map(key => ({ key, label: t(`MR.Tab.${key}`), active: key === tab, icon: TAB_ICONS[key] })),
    header: header(state, t, title), canUndo: user.isGM && local.canUndo, turn: state ? turnFor(state, actors, ctx, t) : null
  };
  if (tab === "guide") view.guide = guideView(t, guideKey(state));
  if (!state) return { ...view, empty: tab !== "guide" };
  view.members = members(state, actors, ctx, t);
  if (tab === "play") {
    if (complete) view.credits = credits(state, actors, t);
    else {
      view[state.phase] = PHASES[state.phase](state, actors, ctx, t, local);
      view.phaseCard = local.hideGuide ? null : phaseCard(guideKey(state), t);
      view.guideHidden = Boolean(local.hideGuide);
    }
  }
  if (tab === "company") view.company = { ring: ring(state, actors, t), members: view.members, answers: state.quest.questions.map((q, i) => ({ q, a: state.setup.answers[i] })).filter(x => x.a), difficulties: state.setup.difficulties.filter(Boolean), intro: state.quest.intro };
  if (tab === "chronicle") view.chronicle = chronicle(state, t);
  if (tab === "safety") view.safety = safetyView(safety, user);
  view.showSide = tab === "play" && !complete && state.phase !== "setup";
  return view;
}

function header(state, t, title) {
  if (!state) return { eyebrow: "MR · STORY NIGHT", title: title || t("MR.Lobby.Title"), goal: "", steps: [] };
  const current = currentChallenge(state);
  const order = ["setup", "characters", "c0", "c1", "c2", "epilogue"];
  const position = state.phase === "challenge" ? `c${current.index}` : state.phase === "complete" ? "end" : state.phase;
  const at = position === "end" ? order.length : order.indexOf(position);
  const steps = order.map((key, i) => {
    const isChallenge = /^c\d$/.test(key);
    const challenge = isChallenge ? state.challenges[Number(key[1])] : null;
    return {
      key, state: i < at ? "done" : i === at ? "current" : "todo",
      label: isChallenge ? ROMAN[Number(key[1])] : t(`MR.Step.${key}`), long: isChallenge ? `${t("MR.Step.challenge")} ${ROMAN[Number(key[1])]}${challenge?.title ? ` · ${challenge.title}` : ""}` : t(`MR.Step.${key}`),
      stones: challenge?.draw?.length ? challenge.draw.map(color => ({ color })) : null, isChallenge
    };
  });
  return { eyebrow: state.quest.title, title: title || state.title || state.quest.title, goal: state.setup.goal, steps };
}

/** Qué le toca hacer a este usuario ahora mismo (se muestra en ambas fichas). */
export function turnFor(state, actors, ctx, t) {
  const mySeats = state.seats.filter(s => s.userId === ctx.userId);
  const mine = id => mySeats.some(s => s.id === id);
  const name = id => seatById(state, id)?.name ?? "";
  const c = currentChallenge(state);
  const r = (key, data, mineFlag = false, icon = "fa-solid fa-hourglass-half") => ({ text: t(key, data), mine: mineFlag, icon: mineFlag ? "fa-solid fa-hand-point-right" : icon });
  switch (state.phase) {
    case "setup": return r("MR.Turn.Setup", {}, true);
    case "characters": {
      const pending = mySeats.filter(s => !s.ready);
      if (pending.length) return r("MR.Turn.Characters", {}, true);
      const others = state.seats.filter(s => !s.ready).map(s => s.name);
      return others.length ? r("MR.Turn.WaitingReady", { names: others.join(", ") }) : r("MR.Turn.AllReady", {}, true);
    }
    case "challenge":
      if (c.stage === "choose") {
        if (!c.pickerSeatId) return r("MR.Turn.WhoPicks", {}, true);
        return mine(c.pickerSeatId) ? r("MR.Turn.YouPick", {}, true) : r("MR.Turn.Picking", { name: name(c.pickerSeatId) });
      }
      if (c.stage === "scenes") {
        const scene = c.scenes[c.sceneIndex];
        return mine(scene.seatId) ? r("MR.Turn.YourScene", { n: c.sceneIndex + 1 }, true) : r("MR.Turn.Scene", { n: c.sceneIndex + 1, name: name(scene.seatId) }, false, "fa-solid fa-clapperboard");
      }
      if (c.stage === "stones") {
        if (mySeats.some(s => !c.submitted.includes(s.id))) return r("MR.Turn.Stones", {}, true);
        const pending = state.seats.filter(s => !c.submitted.includes(s.id)).map(s => s.name);
        return pending.length ? r("MR.Turn.WaitingStones", { names: pending.join(", ") }) : r("MR.Turn.Draw", {}, true);
      }
      if (c.stage === "outcome") return c.outcome.loss && !c.loss ? r("MR.Turn.Loss", {}, true) : r("MR.Turn.Next", {}, true);
      return null;
    case "epilogue": return mySeats.some(s => !state.epilogues[s.id]) ? r("MR.Turn.Epilogue", {}, true) : r("MR.Turn.WaitingEpilogue");
    default: return null;
  }
}

function members(state, actors, ctx, t) {
  return state.seats.map(seat => {
    const main = card(state, activeMain(state, seat.id), actors, t, ctx);
    const minor = card(state, activeMinor(state, seat.id), actors, t, ctx);
    const lost = state.characters.filter(c => c.seatId === seat.id && c.status === "lost").map(c => card(state, c, actors, t, ctx));
    return { seat, name: seat.name, isMine: seat.userId === ctx.userId, ready: seat.ready, main, minor, lost, needsMain: !main };
  });
}

function ring(state, actors, t) {
  const n = state.seats.length, r = 74, cx = 100, cy = 100;
  const nodes = state.seats.map((seat, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const main = activeMain(state, seat.id);
    const d = main ? describe(actors, main.id) : {};
    return { id: main?.id, x: +(cx + r * Math.cos(a)).toFixed(1), y: +(cy + r * Math.sin(a)).toFixed(1), label: initials(d.name || seat.name), name: d.name || seat.name, img: d.img, lost: !main };
  });
  const arrows = nodes.map((node, i) => {
    const next = nodes[(i + 1) % n];
    const dx = next.x - node.x, dy = next.y - node.y, len = Math.hypot(dx, dy) || 1, k = 19 / len, k2 = 24 / len;
    const main = activeMain(state, state.seats[i].id);
    const want = main?.hasWant ? describe(actors, main.id).want : "";
    return { x1: +(node.x + dx * k).toFixed(1), y1: +(node.y + dy * k).toFixed(1), x2: +(next.x - dx * k2).toFixed(1), y2: +(next.y - dy * k2).toFixed(1), want, title: want ? `${node.name} → ${next.name}: ${want}` : "" };
  });
  return { nodes, arrows, caption: t("MR.Company.RingCaption") };
}

const PHASES = {
  setup(state) {
    const used = new Set(state.setup.difficulties.map(d => d.trim()).filter(Boolean));
    return {
      intro: state.quest.intro, goal: state.setup.goal,
      questions: state.quest.questions.map((question, index) => ({ question, index, answer: state.setup.answers[index] ?? "" })),
      difficulties: state.setup.difficulties.map((value, index) => ({ value, index, n: index + 1 })),
      suggestions: state.quest.difficulties.map(text => ({ text, used: used.has(text) })),
      canContinue: Boolean(state.setup.goal.trim())
    };
  },

  characters(state, actors, ctx, t) {
    const rows = state.seats.map(seat => {
      const main = card(state, activeMain(state, seat.id), actors, t, ctx);
      const minor = card(state, activeMinor(state, seat.id), actors, t, ctx);
      return { seat, main, minor, isMine: seat.userId === ctx.userId, canEdit: canActFor(state, seat.id, ctx), ready: seat.ready, complete: seatComplete(state, seat.id, id => describe(actors, id)) };
    });
    const readyCount = state.seats.filter(s => s.ready).length;
    return { rows, readyCount, total: state.seats.length, allReady: readyCount === state.seats.length, canForce: ctx.isGM && readyCount < state.seats.length };
  },

  challenge(state, actors, ctx, t, local) {
    const c = currentChallenge(state);
    const nameOf = id => describe(actors, id).name || describe(actors, id).concept || "?";
    const picker = seatById(state, c.pickerSeatId);
    const base = {
      n: c.index + 1, roman: ROMAN[c.index], total: CHALLENGE_COUNT, isFinal: c.index === CHALLENGE_COUNT - 1, stage: c.stage, [`is_${c.stage}`]: true,
      title: c.title, why: c.why, timescaleLabel: timescaleLabel(c.timescale, t), pickerName: picker?.name ?? "", lead: c.leadCharId ? nameOf(c.leadCharId) : "",
      replacements: replacements(state, actors, ctx)
    };
    if (c.stage === "choose") {
      const allowed = new Set(availablePickers(state));
      const canEdit = Boolean(picker) && canActFor(state, picker.id, ctx);
      Object.assign(base, {
        pickers: state.seats.map(seat => ({ id: seat.id, name: seat.name, available: allowed.has(seat.id), selected: seat.id === c.pickerSeatId })),
        canEdit, hasPicker: Boolean(picker),
        suggestions: state.quest.challenges.map(s => ({ ...s, selected: s.title === c.title })),
        leads: state.seats.map(seat => activeMain(state, seat.id)).filter(Boolean).map(m => ({ id: m.id, name: nameOf(m.id), concept: describe(actors, m.id).concept, selected: m.id === c.leadCharId, own: m.seatId === c.pickerSeatId })),
        timescales: TIMESCALES.map(key => ({ key, label: t(`MR.Timescale.${key}`), selected: c.timescale === key })),
        customTimescale: TIMESCALES.includes(c.timescale) ? "" : c.timescale,
        canStart: canEdit && Boolean(c.title.trim() && c.timescale.trim() && c.leadCharId)
      });
    }
    if (c.stage === "scenes") {
      const scene = c.scenes[c.sceneIndex];
      const seat = seatById(state, scene.seatId);
      const main = activeMain(state, scene.seatId);
      Object.assign(base, {
        pips: c.scenes.map((s, i) => ({ n: i + 1, name: seatById(state, s.seatId)?.name, state: s.done ? "done" : i === c.sceneIndex ? "current" : "todo" })),
        scene: { ...scene, n: c.sceneIndex + 1, of: c.scenes.length, establisher: seat?.name, establisherChar: main ? nameOf(main.id) : "", canEdit: canActFor(state, scene.seatId, ctx), isMine: seat?.userId === ctx.userId },
        isLastScene: c.sceneIndex === c.scenes.length - 1
      });
    }
    if (c.stage === "stones") Object.assign(base, stonesView(state, actors, ctx, t, local, c));
    if (c.stage === "outcome") {
      const lossChar = c.loss ? charById(state, c.loss.charId) : null;
      const promoted = lossChar && lossChar.role === "main" ? activeMain(state, lossChar.seatId) : null;
      Object.assign(base, {
        draw: c.draw.map((color, i) => ({ color, label: t(`MR.Stone.${color}`), order: t(i ? "MR.Stones.Second" : "MR.Stones.First") })),
        outcomeTitle: t(`MR.Outcome.${c.outcome.key}.Title`), outcomeText: t(`MR.Outcome.${c.outcome.key}.Text`),
        success: c.outcome.success, needsLoss: c.outcome.loss && !c.loss, betrayal: c.outcome.betrayal,
        candidates: state.characters.filter(ch => ch.status === "active").map(ch => ({ id: ch.id, name: nameOf(ch.id), role: t(`MR.Role.${ch.role}`), seat: seatById(state, ch.seatId)?.name, selected: local.lossChar === ch.id })),
        fates: FATES.map(key => ({ key, label: t(`MR.Fate.${key}`), hint: t(`MR.Fate.${key}Hint`), selected: (local.lossFate ?? (c.outcome.betrayal ? "betrayed" : "")) === key })),
        lossNote: local.lossNote ?? "",
        loss: lossChar ? { name: nameOf(lossChar.id), fate: t(`MR.Fate.${c.loss.fate}`), note: c.loss.note, promoted: promoted?.promoted && promoted.id !== lossChar.id ? nameOf(promoted.id) : "" } : null,
        canNext: !(c.outcome.loss && !c.loss),
        nextLabel: t(c.index < CHALLENGE_COUNT - 1 ? "MR.Outcome.Next" : "MR.Outcome.ToEpilogue")
      });
    }
    return base;
  },

  epilogue(state, actors, ctx, t) {
    return {
      success: state.result?.success,
      cards: state.seats.map(seat => {
        const main = activeMain(state, seat.id) ?? state.characters.filter(c => c.seatId === seat.id).at(-1);
        return { seatId: seat.id, seat: seat.name, char: card(state, main, actors, t, ctx), text: state.epilogues[seat.id] ?? "", canEdit: canActFor(state, seat.id, ctx), isMine: seat.userId === ctx.userId };
      })
    };
  }
};

/** Formulario secreto de piedras: solo para los asientos del usuario (o todos, si el anfitrión lo activa). */
export function stonesView(state, actors, ctx, t, local, c = currentChallenge(state)) {
  const drafts = local.stones ?? {};
  const mine = state.seats.filter(seat => canActFor(state, seat.id, ctx) && !c.submitted.includes(seat.id) && (seat.userId === ctx.userId || seat.userId === null || (ctx.isGM && local.actForAll)))
    .filter(seat => !local.onlySeat || seat.id === local.onlySeat);
  const total = c.pile.white + c.pile.red;
  return {
    stoneTotal: total,
    bowl: Array.from({ length: Math.min(total, 24) }, (_, i) => ({ i, rot: (i * 47) % 360, x: +(50 + 30 * Math.cos(i * 2.4) * Math.sqrt((i + 1) / 24)).toFixed(1), y: +(52 + 24 * Math.sin(i * 2.4) * Math.sqrt((i + 1) / 24)).toFixed(1) })),
    carried: c.index === CHALLENGE_COUNT - 1 ? { successes: state.challenges.slice(0, -1).filter(x => x.outcome?.success).length, failures: state.challenges.slice(0, -1).filter(x => x.outcome && !x.outcome.success).length } : null,
    submittedSeats: state.seats.map(seat => ({ name: seat.name, done: c.submitted.includes(seat.id) })),
    forms: mine.map(seat => {
      const draft = drafts[seat.id] ?? {};
      const main = activeMain(state, seat.id);
      return {
        seatId: seat.id, seatName: seat.name, charName: main ? (describe(actors, main.id).name || seat.name) : seat.name,
        discontent: [0, 1, 2].map(value => ({ value, label: t(`MR.Stones.Discontent${value}`), hint: t(`MR.Stones.Discontent${value}Hint`), reds: Array(value).fill(0), selected: draft.discontent === value })),
        verdicts: ["white", "red"].map(value => ({ value, label: t(`MR.Stones.Verdict.${value}`), selected: draft.verdict === value })),
        canSubmit: draft.discontent !== undefined && Boolean(draft.verdict)
      };
    }),
    allIn: c.submitted.length === state.seats.length,
    // Reglas: se eligen en secreto y se muestran a la vez; quien echa rojas explica por qué.
    reveal: c.submitted.length === state.seats.length ? state.seats.filter(seat => c.choices?.[seat.id]).map(seat => {
      const choice = c.choices[seat.id];
      const main = activeMain(state, seat.id);
      return { seat: seat.name, charName: main ? (describe(actors, main.id).name || seat.name) : seat.name, reds: Array(choice.discontent).fill(0), discontent: t(`MR.Stones.Discontent${choice.discontent}`), verdict: choice.verdict, verdictLabel: t(`MR.Stones.Verdict.${choice.verdict}`) };
    }) : null,
    canForce: ctx.isGM && c.submitted.length < state.seats.length,
    showActForAll: ctx.isGM && state.seats.some(seat => seat.userId && seat.userId !== ctx.userId && !c.submitted.includes(seat.id)),
    actForAll: Boolean(local.actForAll)
  };
}

function replacements(state, actors, ctx) {
  return state.seats.filter(seat => !activeMain(state, seat.id)).map(seat => ({
    seatId: seat.id, seat: seat.name, canEdit: canActFor(state, seat.id, ctx),
    minors: state.characters.filter(c => c.role === "minor" && c.status === "active").map(c => ({ id: c.id, name: describe(actors, c.id).name || describe(actors, c.id).concept || "?", owner: seatById(state, c.seatId)?.name }))
  }));
}

function timescaleLabel(value, t) { return TIMESCALES.includes(value) ? t(`MR.Timescale.${value}`) : value; }

export function credits(state, actors, t) {
  const ctx = { userId: null, isGM: false };
  const nameOf = id => describe(actors, id).name || describe(actors, id).concept || "?";
  return {
    id: state.id, title: state.title || state.quest.title, quest: state.quest.title, goal: state.setup.goal, success: state.result?.success,
    resultLabel: state.result ? t(state.result.success ? "MR.Credits.Success" : "MR.Credits.Failure") : "",
    answers: state.quest.questions.map((q, i) => ({ q, a: state.setup.answers[i] })).filter(x => x.a),
    cast: state.seats.map(seat => ({ seat: seat.name, characters: state.characters.filter(c => c.seatId === seat.id).map(c => card(state, c, actors, t, ctx)), epilogue: state.epilogues[seat.id] ?? "" })),
    challenges: state.challenges.filter(c => c.outcome).map(c => ({
      roman: ROMAN[c.index], title: c.title, why: c.why, lead: c.leadCharId ? nameOf(c.leadCharId) : "", timescale: timescaleLabel(c.timescale, t),
      draw: c.draw.map(color => ({ color, label: t(`MR.Stone.${color}`) })), outcome: t(`MR.Outcome.${c.outcome.key}.Title`), success: c.outcome.success,
      loss: c.loss ? `${nameOf(c.loss.charId)} — ${t(`MR.Fate.${c.loss.fate}`)}${c.loss.note ? `: ${c.loss.note}` : ""}` : "",
      scenes: c.scenes.filter(s => s.summary || s.situation).map(s => ({ seat: seatById(state, s.seatId)?.name, text: s.summary || s.situation }))
    }))
  };
}

const LOG_ICONS = { start: "fa-solid fa-flag", setup: "fa-solid fa-compass", company: "fa-solid fa-people-group", challenge: "fa-solid fa-mountain", scene: "fa-solid fa-clapperboard", draw: "fa-solid fa-circle-half-stroke", loss: "fa-solid fa-user-slash", adopt: "fa-solid fa-user-plus", newcomer: "fa-solid fa-user-plus", questEnd: "fa-solid fa-flag-checkered", finish: "fa-solid fa-book" };
function chronicle(state, t) {
  return {
    entries: [...state.log].reverse().map(entry => {
      const data = { ...entry.data };
      if (entry.kind === "draw") data.outcome = t(`MR.Outcome.${data.key}.Title`);
      if (entry.kind === "loss") data.fate = t(`MR.Fate.${data.fate}`);
      if (entry.kind === "company") data.names = (data.names ?? []).join(", ");
      const text = entry.kind === "questEnd" ? t(data.success ? "MR.Log.questWon" : "MR.Log.questLost") : t(`MR.Log.${entry.kind}`, data);
      return { ...entry, icon: LOG_ICONS[entry.kind] ?? "fa-solid fa-circle", text, detail: entry.kind === "scene" ? data.summary : entry.kind === "loss" ? data.note : "" };
    })
  };
}

function safetyView(safety, user) {
  const s = safety ?? { lines: [], veils: [], paused: false };
  return { lines: s.lines.map((text, i) => ({ text, i })), veils: s.veils.map((text, i) => ({ text, i })), paused: s.paused, isGM: user.isGM };
}

/* ------------------------------------------------------------------ */
/* Ficha personal                                                      */
/* ------------------------------------------------------------------ */

export function buildCharacterView({ state, actorId, actor, actors = {}, user, t, local = {}, editable = true }) {
  const ctx = { userId: user.id, isGM: user.isGM };
  const base = { actor, editable, theme: state?.quest?.theme || "neutral", pronounsList: [], hasStory: Boolean(state) };
  const c = state ? charById(state, actorId) : null;
  if (!state || !c) return { ...base, role: "main", roleLabel: t("MR.Role.main"), isMain: true, free: true };
  const all = { ...actors, [actorId]: actor };
  const cc = card(state, c, all, t, ctx);
  const seat = seatById(state, c.seatId);
  const view = {
    ...base, questTitle: state.quest.title, role: c.role, roleLabel: cc.roleLabel, isMain: c.role === "main", hasWant: c.hasWant && c.role === "main",
    lost: cc.lost, fateLabel: cc.fateLabel, fateNote: c.fateNote, promoted: c.promoted, seatName: seat?.name, wantTarget: cc.wantTarget,
    turn: turnFor(state, all, ctx, t), phase: state.phase
  };
  const isMySeat = canActFor(state, c.seatId, ctx);
  const ch = currentChallenge(state);
  if (state.phase === "characters" && isMySeat) view.ready = { seatId: c.seatId, ready: seat.ready, complete: c.role === "main" && seatComplete(state, c.seatId, id => all[id]), minor: c.role === "main" ? card(state, activeMinor(state, c.seatId), all, t, ctx) : null };
  if (state.phase === "challenge" && ch?.stage === "stones" && isMySeat && c.role === "main" && !ch.submitted.includes(c.seatId)) {
    view.stones = stonesView(state, all, ctx, t, { ...local, onlySeat: c.seatId }, ch);
  }
  if (state.phase === "epilogue" && isMySeat && c.role === "main") view.epilogue = { seatId: c.seatId, text: state.epilogues[c.seatId] ?? "" };
  return view;
}

/* ------------------------------------------------------------------ */
/* Editor de misiones                                                  */
/* ------------------------------------------------------------------ */

/**
 * Campos del editor. `min` es lo que exige el juego (p. ej. dos dificultades porque se eligen dos,
 * seis deseos porque no puede haber dos iguales con seis jugadores); `rec` da variedad a los dados.
 */
export const QUEST_FIELDS = [
  { key: "title", input: true }, { key: "tagline", input: true }, { key: "intro", rows: 4 }, { key: "goal", input: true },
  { key: "questions", min: 2, rec: "3–5", rows: 5 }, { key: "difficulties", min: 2, rec: "6", rows: 6 },
  { key: "concepts", min: 6, rec: "8–12", rows: 8 }, { key: "desires", min: 6, rec: "6–8", rows: 6 },
  { key: "wants", min: 3, rec: "6", rows: 6 }, { key: "challenges", min: 3, rec: "8", rows: 8 }
];

const questLines = (quest, key) => key === "challenges"
  ? (quest.challenges ?? []).map(c => c.text ? `${c.title} — ${c.text}` : c.title)
  : (quest[key] ?? []);

/** Listas que no llegan al mínimo: [{ key, n, min }]. */
export function questShortfalls(quest) {
  return QUEST_FIELDS.filter(f => f.min).map(f => ({ key: f.key, n: questLines(quest, f.key).length, min: f.min })).filter(f => f.n < f.min);
}

function questEditor(editing, t) {
  return {
    ...editing,
    fields: QUEST_FIELDS.map(f => {
      const list = Boolean(f.min);
      const n = list ? questLines(editing, f.key).length : 0;
      return {
        ...f, list, label: t(`MR.Quest.Field.${f.key}.Label`), help: t(`MR.Quest.Field.${f.key}.Help`),
        value: list ? questLines(editing, f.key).join("\n") : (editing[f.key] ?? ""),
        count: list ? t("MR.Quest.Count", { n, min: f.min, rec: f.rec }) : "", low: list && n < f.min
      };
    }),
    themes: THEMES.map(key => ({ key, label: t(`MR.Theme.${key}`), selected: (editing.theme || "neutral") === key })),
    genreOptions: GENRES.map(key => ({ key, label: t(`MR.Genre.${key}`), selected: genreOf(editing) === key }))
  };
}

/* ------------------------------------------------------------------ */
/* Vestíbulo                                                           */
/* ------------------------------------------------------------------ */

export function buildLobbyView({ quests, users, local = {}, t, user, fellowships = [], activeId = null }) {
  const tab = local.tab ?? "new";
  const selected = quests.find(q => q.id === local.questId) ?? null;
  const seats = local.seats ?? [];
  const genreFilter = local.genre ?? "";
  const view = {
    tab, isGM: user.isGM,
    tabs: ["new", "quests", "archive", "guide"].map(key => ({ key, label: t(`MR.Lobby.Tab.${key}`), active: key === tab })),
    genres: [{ key: "", label: t("MR.Genre.all"), selected: !genreFilter }, ...GENRES.filter(g => quests.some(q => genreOf(q) === g)).map(g => ({ key: g, label: t(`MR.Genre.${g}`), selected: genreFilter === g }))]
  };
  if (tab === "new") Object.assign(view, {
    quests: quests.filter(q => !genreFilter || genreOf(q) === genreFilter).map(q => ({ ...q, genreLabel: t(`MR.Genre.${genreOf(q) ?? "fantasy"}`), selected: q.id === local.questId })),
    selected, title: local.title ?? "",
    seats: seats.map((seat, i) => ({ ...seat, i, n: i + 1, first: i === 0, last: i === seats.length - 1, left: seats.length > 1 ? seats[(i + 1) % seats.length].name : "" })),
    available: users.filter(u => !seats.some(s => s.userId === u.id)),
    tooMany: seats.length > 6, advisory: seats.length === 2 || seats.length === 6,
    canStart: Boolean(selected) && seats.length >= 2 && seats.length <= 6
  });
  if (tab === "quests") {
    const editing = local.editQuest ?? null;
    Object.assign(view, {
      list: quests.map(q => ({ ...q, genreLabel: t(`MR.Genre.${genreOf(q) ?? "fantasy"}`), canEdit: user.isGM && !q.builtin })),
      editing: editing ? questEditor(editing, t) : null
    });
  }
  if (tab === "guide") view.guide = guideView(t);
  if (tab === "archive") view.fellowships = fellowships.map(f => ({ ...f, active: f.id === activeId, date: f.updatedAt ? new Date(f.updatedAt).toLocaleDateString() : "", phaseLabel: t(`MR.Phase.${f.phase ?? "setup"}`), resultLabel: f.result ? t(f.result.success ? "MR.Credits.Success" : "MR.Credits.Failure") : "" }));
  return view;
}
