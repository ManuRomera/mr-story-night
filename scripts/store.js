import { reduce, RuleError, activeMain, currentChallenge, seatById, charById } from "./engine.js";
import { CHANNEL, CHARACTER_ICON, DEFAULT_SAFETY, FELLOWSHIP_ICON, SYSTEM_ID } from "./constants.js";
import { clone, randomUnit, uid } from "./utils.js";
import { postCard } from "./chat.js";

const t = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));

/**
 * Estado compartido de cada compañía (Actor de tipo "fellowship", campo system.state).
 * Solo el anfitrión (GM activo) escribe; el resto de clientes le envía peticiones por socket.
 * Los personajes son Actores de cada jugador y se editan directamente en su ficha.
 */
export const Store = {
  undoStacks: new Map(),

  get activeId() { return game.settings.get(SYSTEM_ID, "activeFellowship") || null; },
  get isHost() { return Boolean(game.users.activeGM?.isSelf); },
  get safety() { return { ...DEFAULT_SAFETY, ...(game.settings.get(SYSTEM_ID, "safety") ?? {}) }; },

  fellowship(id = this.activeId) { const actor = id ? game.actors?.get(id) : null; return actor?.type === "fellowship" ? actor : null; },
  story(id = this.activeId) { return this.fellowship(id)?.system.state ?? null; },

  /** Nombre y concepto de un personaje; los nombres provisionales cuentan como vacíos. */
  describe(id) {
    const actor = game.actors?.get(id);
    if (!actor) return { name: "", concept: "" };
    const placeholder = actor.getFlag(SYSTEM_ID, "placeholder");
    const s = actor.system;
    return { name: actor.name === placeholder ? "" : actor.name, img: actor.img === CHARACTER_ICON ? "" : actor.img, concept: s.concept, pronouns: s.pronouns, desire: s.desire, want: s.want, detail: s.detail };
  },
  actorsFor(state) { return Object.fromEntries((state?.characters ?? []).map(c => [c.id, this.describe(c.id)])); },

  fellowships() {
    return (game.actors?.filter(a => a.type === "fellowship" && a.system.state) ?? []).map(a => ({ id: a.id, name: a.name, quest: a.system.state.quest.title, phase: a.system.state.phase, result: a.system.state.result, updatedAt: a.system.state.updatedAt, theme: a.system.state.quest.theme }))
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  },

  init() { game.socket.on(CHANNEL, message => this._onSocket(message)); },

  /** Punto de entrada único para cambiar una partida. */
  async dispatch(op, args = {}, fellowshipId = this.activeId) {
    if (!fellowshipId) { ui.notifications.warn(t("MR.Error.NoStory")); return false; }
    if (this.isHost) return this._apply(fellowshipId, op, args, game.user);
    if (!game.users.activeGM) { ui.notifications.warn(t("MR.Error.NoHost")); return false; }
    game.socket.emit(CHANNEL, { type: "op", fellowshipId, op, args, userId: game.user.id });
    return true;
  },

  async _apply(fellowshipId, op, args, user) {
    const actor = this.fellowship(fellowshipId);
    if (!actor) { this._reportError(user, "MR.Error.NoStory"); return false; }
    const previous = actor.system.state;
    const ctx = { userId: user.id, isGM: user.isGM, now: Date.now(), id: uid, rng: randomUnit, describe: id => this.describe(id) };
    let next;
    try { next = reduce(previous, op, args, ctx); }
    catch (error) {
      if (error instanceof RuleError) { this._reportError(user, error.key); return false; }
      console.error("MR · Story Night |", error); this._reportError(user, "MR.Error.Unexpected"); return false;
    }
    if (op !== "setField") {
      const stack = this.undoStacks.get(fellowshipId) ?? [];
      this.undoStacks.set(fellowshipId, [...stack, clone(previous)].slice(-30));
    }
    await actor.update({ system: { state: next } }, { recursive: false });
    await this._effects(actor, op, args, previous, next);
    return true;
  },

  canUndo(fellowshipId = this.activeId) { return this.isHost && (this.undoStacks.get(fellowshipId)?.length ?? 0) > 0; },
  async undo(fellowshipId = this.activeId) {
    if (!this.isHost) return;
    const previous = this.undoStacks.get(fellowshipId)?.pop();
    if (previous) await this.fellowship(fellowshipId)?.update({ system: { state: previous } }, { recursive: false });
  },

  /* ---------- Crear una partida: carpeta, hoja común y dos personajes por asiento ---------- */
  async createStory(payload) {
    if (this.isHost) return this._create(payload, game.user);
    if (!game.users.activeGM) { ui.notifications.warn(t("MR.Error.NoHost")); return false; }
    game.socket.emit(CHANNEL, { type: "create", payload, userId: game.user.id });
    ui.notifications.info(t("MR.Lobby.Requested"));
    return true;
  },

  async _create({ quest, seats, title }, user) {
    const { OWNER, OBSERVER } = CONST.DOCUMENT_OWNERSHIP_LEVELS;
    const name = String(title || "").trim() || quest?.title || "Follow";
    try { reduce(null, "start", { quest, seats, characters: seats.flatMap((_, i) => [{ id: `x${i}m`, seat: i, role: "main" }, { id: `x${i}n`, seat: i, role: "minor" }]) }, { userId: user.id, isGM: user.isGM, now: 0, id: uid, rng: randomUnit }); }
    catch (error) { this._reportError(user, error.key ?? "MR.Error.Unexpected"); return false; }
    const folder = await Folder.create({ name, type: "Actor", color: "#6b4a2b" });
    const [fellowship] = await Actor.createDocuments([{ name, type: "fellowship", img: FELLOWSHIP_ICON, folder: folder.id, ownership: { default: OWNER }, system: { state: null } }]);
    const data = seats.flatMap(seat => ["main", "minor"].map(role => {
      const placeholder = t(`MR.Character.Placeholder.${role}`, { seat: seat.name });
      return {
        name: placeholder, type: "character", img: CHARACTER_ICON, folder: folder.id,
        ownership: seat.userId ? { default: OBSERVER, [seat.userId]: OWNER } : { default: OWNER },
        system: { fellowship: fellowship.id }, flags: { [SYSTEM_ID]: { placeholder } },
        prototypeToken: { actorLink: true, name: placeholder, disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY }
      };
    }));
    const created = await Actor.createDocuments(data);
    const characters = created.map((actor, i) => ({ id: actor.id, seat: Math.floor(i / 2), role: i % 2 ? "minor" : "main" }));
    const state = reduce(null, "start", { quest, seats, characters, title: name }, { userId: user.id, isGM: true, now: Date.now(), id: uid, rng: randomUnit, describe: id => this.describe(id) });
    await fellowship.update({ system: { state } }, { recursive: false });
    await game.settings.set(SYSTEM_ID, "activeFellowship", fellowship.id);
    await postCard("start", { title: name, quest: state.quest, seats: state.seats });
    return fellowship.id;
  },

  /** Un personaje nuevo para un asiento que se ha quedado sin protagonista. */
  async newcomer(seatId, fellowshipId = this.activeId) {
    if (this.isHost) return this._newcomer(fellowshipId, seatId, game.user);
    game.socket.emit(CHANNEL, { type: "newcomer", fellowshipId, seatId, userId: game.user.id });
    return true;
  },
  async _newcomer(fellowshipId, seatId, user) {
    const actor = this.fellowship(fellowshipId);
    const seat = actor ? seatById(actor.system.state, seatId) : null;
    if (!seat) return this._reportError(user, "MR.Error.NoSeat");
    const { OWNER, OBSERVER } = CONST.DOCUMENT_OWNERSHIP_LEVELS;
    const placeholder = t("MR.Character.Placeholder.main", { seat: seat.name });
    const [created] = await Actor.createDocuments([{ name: placeholder, type: "character", img: CHARACTER_ICON, folder: actor.folder?.id, ownership: seat.userId ? { default: OBSERVER, [seat.userId]: OWNER } : { default: OWNER }, system: { fellowship: actor.id }, flags: { [SYSTEM_ID]: { placeholder } }, prototypeToken: { actorLink: true } }]);
    const ok = await this._apply(fellowshipId, "replaceMain", { seatId, mode: "new", charId: created.id }, user);
    if (!ok) await created.delete();
    return ok;
  },

  /* ---------- Efectos secundarios: propietarios y tarjetas de chat ---------- */
  async _effects(actor, op, args, previous, next) {
    const c = currentChallenge(next);
    const name = id => this.describe(id).name || this.describe(id).concept || "?";
    if (op === "replaceMain" && args.mode === "adopt") {
      const seat = seatById(next, args.seatId);
      const adopted = game.actors.get(args.charId);
      const { OWNER, OBSERVER } = CONST.DOCUMENT_OWNERSHIP_LEVELS;
      if (adopted) await adopted.update({ ownership: seat.userId ? { default: OBSERVER, [seat.userId]: OWNER } : { default: OWNER } }, { diff: false, recursive: false });
    }
    if (!game.settings.get(SYSTEM_ID, "chatCards")) return;
    if (op === "startScenes") await postCard("challenge", { n: c.index + 1, title: c.title, why: c.why, lead: name(c.leadCharId), picker: seatById(next, c.pickerSeatId)?.name, timescale: c.timescale });
    if (op === "startScenes" || (op === "endScene" && c.stage === "scenes")) {
      const scene = c.scenes[c.sceneIndex];
      const main = activeMain(next, scene.seatId);
      await postCard("scene", { n: c.sceneIndex + 1, of: c.scenes.length, seat: seatById(next, scene.seatId)?.name, character: main ? name(main.id) : "" });
    }
    if (op === "endScene" && c.stage === "stones") await postCard("stones", { n: c.index + 1 });
    if (op === "draw") await postCard("draw", { n: c.index + 1, draw: c.draw, key: c.outcome.key });
    if (op === "resolveLoss") await postCard("loss", { name: name(args.charId), fate: args.fate, note: args.note, promoted: (() => { const lost = charById(next, args.charId); const m = lost?.role === "main" ? activeMain(next, lost.seatId) : null; return m && m.id !== args.charId ? name(m.id) : ""; })() });
    if (op === "nextChallenge" && next.phase === "epilogue") await postCard("questEnd", { success: next.result.success, goal: next.setup.goal });
    if (op === "finish") await postCard("finish", { title: next.title });
  },

  /* ---------- Comodidad en mesa: las señales nunca registran quién las envía ---------- */
  async safetyAction(action, payload = {}) {
    if (this.isHost) return this._applySafety(action, payload, game.user);
    if (!game.users.activeGM) { ui.notifications.warn(t("MR.Error.NoHostSafety")); return false; }
    game.socket.emit(CHANNEL, { type: "safety", action, payload, userId: game.user.id });
    if (action === "signal") ui.notifications.info(t("MR.Safety.Sent"));
    return true;
  },

  async _applySafety(action, payload, user) {
    const current = this.safety;
    const state = { ...current, lines: [...current.lines], veils: [...current.veils] };
    const kind = payload.kind === "veils" ? "veils" : "lines";
    if (action === "signal" && ["pause", "rewind", "fade"].includes(payload.type)) {
      state.lastSignal = { id: uid(), type: payload.type, at: Date.now() };
      if (payload.type === "pause") state.paused = true;
    } else if (action === "resume" && user.isGM) state.paused = false;
    else if (action === "addLimit") {
      const text = String(payload.text ?? "").trim().slice(0, 200);
      if (!text || state[kind].includes(text)) return false;
      state[kind].push(text);
    } else if (action === "removeLimit" && user.isGM) state[kind].splice(Number(payload.index), 1);
    else return false;
    await game.settings.set(SYSTEM_ID, "safety", state);
    return true;
  },

  _reportError(user, key) {
    if (user.isSelf) ui.notifications.warn(t(key));
    else game.socket.emit(CHANNEL, { type: "error", userId: user.id, key });
    return false;
  },

  _onSocket(message) {
    if (!message || typeof message !== "object") return;
    if (message.type === "error" && message.userId === game.user.id) return ui.notifications.warn(t(message.key));
    if (!this.isHost) return;
    const user = game.users.get(message.userId);
    if (!user) return;
    if (message.type === "op") return this._apply(message.fellowshipId, message.op, message.args, user);
    if (message.type === "create") return this._create(message.payload ?? {}, user);
    if (message.type === "newcomer") return this._newcomer(message.fellowshipId, message.seatId, user);
    if (message.type === "safety") return this._applySafety(message.action, message.payload ?? {}, user);
  }
};
