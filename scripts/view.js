/**
 * Construye el modelo de vista de la mesa a partir del estado compartido.
 * Sin dependencias de Foundry: recibe una función de traducción y los datos del usuario.
 */
import { CHALLENGE_COUNT, FATES, TIMESCALES, activeMain, activeMinor, availablePickers, canActFor, charById, currentChallenge, leftSeat, seatById } from "./engine.js";

const ROMAN = ["I", "II", "III", "IV", "V"];
const initials = name => String(name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || "?";

export function buildView({ state, user, t, tab = "play", local = {}, quests = [], archive = [], safety = null, users = [] }) {
  const ctx = { userId: user.id, isGM: user.isGM };
  const hasStory = Boolean(state) && state.phase !== "complete";
  const view = {
    t, tab, isGM: user.isGM, hasStory,
    theme: state?.quest?.theme || "neutral",
    tabs: ["play", "chronicle", "quests", "safety", "archive"].map(key => ({ key, label: t(`MR.Tab.${key}`), active: key === tab, icon: TAB_ICONS[key] })),
    header: header(state, t),
    showSide: Boolean(state) && tab === "play" && hasStory && state.phase !== "setup",
    canUndo: user.isGM && local.canUndo
  };
  if (state) view.company = company(state, ctx, t);
  if (tab === "play") {
    if (!state || (state.phase === "complete" && local.lobby)) view.lobby = lobby({ quests, users, local, t, user });
    else if (state.phase === "complete") view.credits = credits(state, t, { current: true });
    else view[state.phase] = PHASE_BUILDERS[state.phase](state, ctx, t, local);
    view.phase = view.lobby ? "lobby" : state.phase;
  }
  if (tab === "chronicle") view.chronicle = chronicle(state, t);
  if (tab === "quests") view.quests = questsTab({ quests, local, user, t });
  if (tab === "safety") view.safety = safetyTab(safety, user, t);
  if (tab === "archive") view.archive = archiveTab(archive, local, t);
  return view;
}

const TAB_ICONS = { play: "fa-solid fa-people-group", chronicle: "fa-solid fa-scroll", quests: "fa-solid fa-map", safety: "fa-solid fa-shield-heart", archive: "fa-solid fa-box-archive" };

function header(state, t) {
  if (!state || state.phase === "complete") return { eyebrow: "MR · STORY NIGHT", title: state ? state.quest.title : t("MR.Lobby.Title"), subtitle: state ? t("MR.Credits.Closed") : t("MR.Lobby.Subtitle"), steps: [] };
  const current = currentChallenge(state);
  const order = ["setup", "characters", "c0", "c1", "c2", "epilogue"];
  const position = state.phase === "challenge" ? `c${current.index}` : state.phase;
  const at = order.indexOf(position);
  const steps = order.map((key, i) => {
    const challenge = /^c\d$/.test(key) ? state.challenges[Number(key[1])] : null;
    return {
      key, state: i < at ? "done" : i === at ? "current" : "todo",
      label: /^c\d$/.test(key) ? `${t("MR.Step.challenge")} ${ROMAN[Number(key[1])]}` : t(`MR.Step.${key}`),
      stones: challenge?.draw?.length ? challenge.draw.map(color => ({ color })) : null,
      success: challenge?.outcome ? challenge.outcome.success : null
    };
  });
  return { eyebrow: state.quest.title, title: state.setup.goal || state.quest.title, subtitle: state.quest.tagline, steps };
}

function characterCard(state, c, t, ctx) {
  if (!c) return null;
  const left = c.hasWant && c.role === "main" ? activeMain(state, leftSeat(state, c.seatId).id) : null;
  return {
    ...c, initials: initials(c.name || c.concept), displayName: c.name || t("MR.Character.Unnamed"),
    lost: c.status === "lost", fateLabel: c.fate ? t(`MR.Fate.${c.fate}`) : "",
    wantTarget: left?.name || t("MR.Character.LeftNeighbour"),
    canEdit: canActFor(state, c.seatId, ctx) && state.phase !== "complete"
  };
}

function company(state, ctx, t) {
  const seats = state.seats.map(seat => {
    const main = activeMain(state, seat.id);
    const minor = activeMinor(state, seat.id);
    const lost = state.characters.filter(c => c.seatId === seat.id && c.status === "lost").map(c => characterCard(state, c, t, ctx));
    return { ...seat, isMine: seat.userId === ctx.userId, isShared: seat.userId === null, main: characterCard(state, main, t, ctx), minor: characterCard(state, minor, t, ctx), lost, needsMain: !main && state.phase !== "setup" && state.phase !== "characters" };
  });
  return { seats, ring: wantsRing(state, t) };
}

/** Anillo de deseos: cada protagonista apunta al de su izquierda. */
function wantsRing(state, t) {
  const n = state.seats.length, r = 70, cx = 100, cy = 100;
  const nodes = state.seats.map((seat, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const main = activeMain(state, seat.id);
    return { id: seat.id, x: +(cx + r * Math.cos(a)).toFixed(1), y: +(cy + r * Math.sin(a)).toFixed(1), label: initials(main?.name || seat.name), name: main?.name || seat.name, lost: !main };
  });
  const arrows = nodes.map((node, i) => {
    const next = nodes[(i + 1) % n];
    const dx = next.x - node.x, dy = next.y - node.y, len = Math.hypot(dx, dy) || 1, k = 17 / len;
    const main = activeMain(state, state.seats[i].id);
    return { x1: +(node.x + dx * k).toFixed(1), y1: +(node.y + dy * k).toFixed(1), x2: +(next.x - dx * (k + 5 / len)).toFixed(1), y2: +(next.y - dy * (k + 5 / len)).toFixed(1), want: main?.hasWant ? main.want : "", title: main?.want ? `${main.name} → ${next.name}: ${main.want}` : "" };
  });
  return { nodes, arrows, caption: t("MR.Company.RingCaption") };
}

const PHASE_BUILDERS = {
  setup(state, ctx, t) {
    const used = new Set(state.setup.difficulties.map(d => d.trim()).filter(Boolean));
    return {
      intro: state.quest.intro, goal: state.setup.goal,
      questions: state.quest.questions.map((question, index) => ({ question, index, answer: state.setup.answers[index] ?? "" })),
      difficulties: state.setup.difficulties.map((value, index) => ({ value, index, n: index + 1 })),
      suggestions: state.quest.difficulties.map(text => ({ text, used: used.has(text) })),
      canContinue: Boolean(state.setup.goal.trim())
    };
  },

  characters(state, ctx, t) {
    const cards = state.seats.map(seat => {
      const main = characterCard(state, activeMain(state, seat.id), t, ctx);
      const minor = characterCard(state, activeMinor(state, seat.id), t, ctx);
      const canEdit = canActFor(state, seat.id, ctx);
      return { seat, main, minor, canEdit, isMine: seat.userId === ctx.userId, ready: seat.ready, complete: Boolean(main?.name.trim() && main?.concept.trim()) };
    }).sort((a, b) => Number(b.isMine) - Number(a.isMine));
    const readyCount = state.seats.filter(s => s.ready).length;
    return {
      cards, concepts: state.quest.concepts, desires: state.quest.desires,
      readyCount, total: state.seats.length, allReady: readyCount === state.seats.length,
      canForce: ctx.isGM && readyCount < state.seats.length
    };
  },

  challenge(state, ctx, t, local) {
    const c = currentChallenge(state);
    const base = { n: c.index + 1, roman: ROMAN[c.index], total: CHALLENGE_COUNT, isFinal: c.index === CHALLENGE_COUNT - 1, stage: c.stage, [`is_${c.stage}`]: true, title: c.title, why: c.why, timescaleLabel: timescaleLabel(c.timescale, t) };
    const picker = seatById(state, c.pickerSeatId);
    base.pickerName = picker?.name ?? "";
    base.lead = charById(state, c.leadCharId)?.name ?? "";
    base.replacements = replacements(state, ctx, t);
    if (c.stage === "choose") {
      const allowed = new Set(availablePickers(state));
      const canEdit = Boolean(picker) && canActFor(state, picker.id, ctx);
      Object.assign(base, {
        pickers: state.seats.map(seat => ({ id: seat.id, name: seat.name, available: allowed.has(seat.id), selected: seat.id === c.pickerSeatId })),
        canEdit, hasPicker: Boolean(picker),
        suggestions: state.quest.challenges.map(s => ({ ...s, selected: s.title === c.title })),
        leads: state.seats.map(seat => activeMain(state, seat.id)).filter(Boolean).map(m => ({ id: m.id, name: m.name, concept: m.concept, selected: m.id === c.leadCharId })),
        timescales: TIMESCALES.map(key => ({ key, label: t(`MR.Timescale.${key}`), selected: c.timescale === key })),
        customTimescale: TIMESCALES.includes(c.timescale) ? "" : c.timescale,
        canStart: canEdit && c.title.trim() && c.timescale.trim() && c.leadCharId
      });
    }
    if (c.stage === "scenes") {
      const scene = c.scenes[c.sceneIndex];
      const seat = seatById(state, scene.seatId);
      Object.assign(base, {
        pips: c.scenes.map((s, i) => ({ n: i + 1, name: seatById(state, s.seatId)?.name, state: s.done ? "done" : i === c.sceneIndex ? "current" : "todo" })),
        scene: { ...scene, n: c.sceneIndex + 1, of: c.scenes.length, establisher: seat?.name, establisherChar: activeMain(state, scene.seatId)?.name ?? "", canEdit: canActFor(state, scene.seatId, ctx), isMine: seat?.userId === ctx.userId },
        isLastScene: c.sceneIndex === c.scenes.length - 1
      });
    }
    if (c.stage === "stones") {
      const drafts = local.stones ?? {};
      const mine = state.seats.filter(seat => canActFor(state, seat.id, ctx) && !c.submitted.includes(seat.id) && (seat.userId === ctx.userId || seat.userId === null || (ctx.isGM && local.actForAll)));
      const total = c.pile.white + c.pile.red;
      Object.assign(base, {
        stoneTotal: total, bowl: Array.from({ length: Math.min(total, 24) }, (_, i) => ({ i, rot: (i * 47) % 360, x: 50 + 30 * Math.cos(i * 2.4) * Math.sqrt((i + 1) / 24), y: 52 + 22 * Math.sin(i * 2.4) * Math.sqrt((i + 1) / 24) })),
        carried: c.index === CHALLENGE_COUNT - 1 ? { successes: state.challenges.slice(0, -1).filter(x => x.outcome?.success).length, failures: state.challenges.slice(0, -1).filter(x => x.outcome && !x.outcome.success).length } : null,
        seats: state.seats.map(seat => ({ name: seat.name, done: c.submitted.includes(seat.id) })),
        forms: mine.map(seat => {
          const draft = drafts[seat.id] ?? {};
          const main = activeMain(state, seat.id);
          return {
            seatId: seat.id, seatName: seat.name, charName: main?.name ?? seat.name,
            discontent: [0, 1, 2].map(value => ({ value, label: t(`MR.Stones.Discontent${value}`), hint: t(`MR.Stones.Discontent${value}Hint`), reds: Array(value).fill(0), selected: draft.discontent === value })),
            verdicts: ["white", "red"].map(value => ({ value, label: t(`MR.Stones.Verdict.${value}`), selected: draft.verdict === value })),
            canSubmit: draft.discontent !== undefined && Boolean(draft.verdict)
          };
        }),
        allIn: c.submitted.length === state.seats.length,
        canForce: ctx.isGM && c.submitted.length < state.seats.length,
        showActForAll: ctx.isGM && state.seats.some(seat => seat.userId && seat.userId !== ctx.userId && !c.submitted.includes(seat.id)),
        actForAll: Boolean(local.actForAll)
      });
    }
    if (c.stage === "outcome") {
      const lossChar = c.loss ? charById(state, c.loss.charId) : null;
      const promoted = lossChar && lossChar.role === "main" ? activeMain(state, lossChar.seatId) : null;
      Object.assign(base, {
        draw: c.draw.map((color, i) => ({ color, label: t(`MR.Stone.${color}`), order: t(i ? "MR.Stones.Second" : "MR.Stones.First") })),
        outcomeTitle: t(`MR.Outcome.${c.outcome.key}.Title`), outcomeText: t(`MR.Outcome.${c.outcome.key}.Text`),
        success: c.outcome.success, needsLoss: c.outcome.loss && !c.loss, betrayal: c.outcome.betrayal,
        candidates: state.characters.filter(ch => ch.status === "active").map(ch => ({ id: ch.id, name: ch.name || ch.concept, role: t(`MR.Role.${ch.role}`), seat: seatById(state, ch.seatId)?.name, selected: local.lossChar === ch.id })),
        fates: FATES.map(key => ({ key, label: t(`MR.Fate.${key}`), hint: t(`MR.Fate.${key}Hint`), selected: (local.lossFate ?? (c.outcome.betrayal ? "betrayed" : "")) === key })),
        lossNote: local.lossNote ?? "",
        loss: lossChar ? { name: lossChar.name || lossChar.concept, fate: t(`MR.Fate.${c.loss.fate}`), note: c.loss.note, promoted: promoted?.promoted && promoted.id !== lossChar.id ? promoted.name : "" } : null,
        canNext: !(c.outcome.loss && !c.loss),
        nextLabel: t(c.index < CHALLENGE_COUNT - 1 ? "MR.Outcome.Next" : "MR.Outcome.ToEpilogue")
      });
    }
    return base;
  },

  epilogue(state, ctx, t) {
    return {
      success: state.result?.success,
      cards: state.seats.map(seat => {
        const main = activeMain(state, seat.id) ?? state.characters.filter(c => c.seatId === seat.id).at(-1);
        return { seatId: seat.id, seat: seat.name, char: characterCard(state, main, t, ctx), text: state.epilogues[seat.id] ?? "", canEdit: canActFor(state, seat.id, ctx), isMine: seat.userId === ctx.userId };
      }),
      replacements: replacements(state, ctx, t)
    };
  }
};

function replacements(state, ctx, t) {
  return state.seats.filter(seat => !activeMain(state, seat.id)).map(seat => ({
    seatId: seat.id, seat: seat.name, canEdit: canActFor(state, seat.id, ctx),
    minors: state.characters.filter(c => c.role === "minor" && c.status === "active").map(c => ({ id: c.id, name: c.name || c.concept, owner: seatById(state, c.seatId)?.name }))
  }));
}

function timescaleLabel(value, t) { return TIMESCALES.includes(value) ? t(`MR.Timescale.${value}`) : value; }

export function credits(state, t, { current = false } = {}) {
  const ctx = { userId: null, isGM: false };
  return {
    current, id: state.id, title: state.quest.title, goal: state.setup.goal, success: state.result?.success,
    resultLabel: state.result ? t(state.result.success ? "MR.Credits.Success" : "MR.Credits.Failure") : "",
    answers: state.quest.questions.map((q, i) => ({ q, a: state.setup.answers[i] })).filter(x => x.a),
    difficulties: state.setup.difficulties.filter(Boolean),
    cast: state.seats.map(seat => ({
      seat: seat.name,
      characters: state.characters.filter(c => c.seatId === seat.id || (c.promoted && c.seatId === seat.id)).map(c => characterCard(state, c, t, ctx)),
      epilogue: state.epilogues[seat.id] ?? ""
    })),
    challenges: state.challenges.filter(c => c.outcome).map(c => ({
      roman: ROMAN[c.index], title: c.title, why: c.why, lead: charById(state, c.leadCharId)?.name, timescale: timescaleLabel(c.timescale, t),
      draw: c.draw.map(color => ({ color, label: t(`MR.Stone.${color}`) })), outcome: t(`MR.Outcome.${c.outcome.key}.Title`), success: c.outcome.success,
      loss: c.loss ? `${charById(state, c.loss.charId)?.name || "?"} — ${t(`MR.Fate.${c.loss.fate}`)}${c.loss.note ? `: ${c.loss.note}` : ""}` : "",
      scenes: c.scenes.filter(s => s.summary || s.situation).map(s => ({ seat: seatById(state, s.seatId)?.name, text: s.summary || s.situation }))
    }))
  };
}

function lobby({ quests, users, local, t, user }) {
  const selected = quests.find(q => q.id === local.questId) ?? null;
  const seats = local.seats ?? [];
  return {
    quests: quests.map(q => ({ ...q, selected: q.id === local.questId, challengeCount: q.challenges?.length ?? 0 })),
    selected, seats: seats.map((seat, i) => ({ ...seat, i, n: i + 1, first: i === 0, last: i === seats.length - 1, left: seats.length > 1 ? seats[(i + 1) % seats.length].name : "" })),
    available: users.filter(u => !seats.some(s => s.userId === u.id)),
    count: seats.length, tooFew: seats.length < 2, tooMany: seats.length > 6, advisory: seats.length === 2 || seats.length === 6,
    canStart: Boolean(selected) && seats.length >= 2 && seats.length <= 6,
    replacing: false
  };
}

function chronicle(state, t) {
  if (!state) return { entries: [] };
  return {
    entries: [...state.log].reverse().map(entry => {
      const data = { ...entry.data };
      if (entry.kind === "draw") data.outcome = t(`MR.Outcome.${data.key}.Title`);
      if (entry.kind === "loss") data.fate = t(`MR.Fate.${data.fate}`);
      if (entry.kind === "company") data.names = (data.names ?? []).join(", ");
      if (entry.kind === "questEnd") return { ...entry, text: t(data.success ? "MR.Log.questWon" : "MR.Log.questLost") };
      return { ...entry, icon: LOG_ICONS[entry.kind] ?? "fa-solid fa-circle", text: t(`MR.Log.${entry.kind}`, data), detail: entry.kind === "scene" ? data.summary : entry.kind === "loss" ? data.note : "" };
    })
  };
}
const LOG_ICONS = { start: "fa-solid fa-flag", setup: "fa-solid fa-compass", company: "fa-solid fa-people-group", challenge: "fa-solid fa-mountain", scene: "fa-solid fa-clapperboard", draw: "fa-solid fa-circle-half-stroke", loss: "fa-solid fa-user-slash", adopt: "fa-solid fa-user-plus", newcomer: "fa-solid fa-user-plus", finish: "fa-solid fa-book" };

function questsTab({ quests, local, user, t }) {
  const editing = local.editQuest ?? null;
  return {
    list: quests.map(q => ({ ...q, builtin: Boolean(q.builtin), canEdit: user.isGM && !q.builtin })),
    editing: editing ? { ...editing, questionsText: (editing.questions ?? []).join("\n"), difficultiesText: (editing.difficulties ?? []).join("\n"), conceptsText: (editing.concepts ?? []).join("\n"), desiresText: (editing.desires ?? []).join("\n"), challengesText: (editing.challenges ?? []).map(c => c.text ? `${c.title} — ${c.text}` : c.title).join("\n"), themes: THEMES.map(key => ({ key, label: t(`MR.Theme.${key}`), selected: (editing.theme || "neutral") === key })) } : null,
    canEdit: user.isGM
  };
}
export const THEMES = ["neutral", "fantasy", "sci-fi", "noir", "horror", "western", "cyberpunk"];

function safetyTab(safety, user, t) {
  const s = safety ?? { lines: [], veils: [], paused: false };
  return { lines: s.lines.map((text, i) => ({ text, i })), veils: s.veils.map((text, i) => ({ text, i })), paused: s.paused, isGM: user.isGM };
}

function archiveTab(archive, local, t) {
  const viewing = archive.find(a => a.id === local.archiveId);
  return {
    list: archive.map(a => ({ id: a.id, title: a.quest.title, goal: a.setup.goal, success: a.result?.success, date: new Date(a.completedAt ?? a.updatedAt).toLocaleDateString(), names: a.seats.map(s => activeMain(a, s.id)?.name).filter(Boolean).join(", ") })),
    viewing: viewing ? credits(viewing, t) : null
  };
}
