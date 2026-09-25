import { reduce, RuleError } from "./engine.js";
import { CHANNEL, DEFAULT_SAFETY, SYSTEM_ID } from "./constants.js";
import { clone, randomUnit, uid } from "./utils.js";

/**
 * Estado compartido. Solo el anfitrión (el GM activo) escribe en los ajustes del mundo;
 * el resto de clientes le envía peticiones por socket. Los cambios llegan a todos
 * mediante el onChange de los ajustes.
 */
export const Store = {
  listeners: new Set(),
  undoStack: [],

  get story() { return game.settings.get(SYSTEM_ID, "story") ?? null; },
  get safety() { return { ...DEFAULT_SAFETY, ...(game.settings.get(SYSTEM_ID, "safety") ?? {}) }; },
  get isHost() { return Boolean(game.users.activeGM?.isSelf); },

  init() { game.socket.on(CHANNEL, message => this._onSocket(message)); },
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit() {
    for (const fn of this.listeners) fn(this.story);
    Hooks.callAll("mrStoryNightChanged", this.story);
  },

  /** Punto de entrada único para cualquier cambio de la historia. */
  async dispatch(op, args = {}) {
    if (this.isHost) return this._apply(op, args, game.user);
    if (!game.users.activeGM) { ui.notifications.warn(game.i18n.localize("MR.Error.NoHost")); return false; }
    game.socket.emit(CHANNEL, { type: "op", op, args, userId: game.user.id });
    return true;
  },

  async _apply(op, args, user) {
    const ctx = { userId: user.id, isGM: user.isGM, now: Date.now(), id: uid, rng: randomUnit };
    let next;
    try { next = reduce(this.story, op, args, ctx); }
    catch (error) {
      if (error instanceof RuleError) { this._reportError(user, error.key); return false; }
      console.error("MR · Story Night |", error); this._reportError(user, "MR.Error.Unexpected"); return false;
    }
    const previous = this.story;
    if (previous && op !== "setField") this.undoStack = [...this.undoStack, clone(previous)].slice(-30);
    await game.settings.set(SYSTEM_ID, "story", next);
    if (op === "finish") await this.archiveStory(next);
    return true;
  },

  canUndo() { return this.isHost && this.undoStack.length > 0; },
  async undo() {
    if (!this.isHost) return;
    const previous = this.undoStack.pop();
    if (previous) await game.settings.set(SYSTEM_ID, "story", previous);
  },

  async archiveStory(story) {
    const archive = (game.settings.get(SYSTEM_ID, "archive") ?? []).filter(entry => entry.id !== story.id);
    await game.settings.set(SYSTEM_ID, "archive", [clone(story), ...archive].slice(0, 50));
  },

  async importStory(data) {
    if (!game.user.isGM) throw new RuleError("MR.Error.HostOnly");
    const story = data?.format === "mr-story-night" ? data.story : data;
    if (!story?.id || story.schema !== 2 || !story.quest || !Array.isArray(story.seats)) throw new RuleError("MR.Error.BadFile");
    await this.archiveStory({ ...story, phase: "complete" });
  },

  /* ---------- Comodidad en mesa: las señales nunca registran quién las envía ---------- */
  async safetyAction(action, payload = {}) {
    if (this.isHost) return this._applySafety(action, payload, game.user);
    if (!game.users.activeGM) { ui.notifications.warn(game.i18n.localize("MR.Error.NoHostSafety")); return false; }
    game.socket.emit(CHANNEL, { type: "safety", action, payload, userId: game.user.id });
    if (action === "signal") ui.notifications.info(game.i18n.localize("MR.Safety.Sent"));
    return true;
  },

  async _applySafety(action, payload, user) {
    const state = { ...this.safety, lines: [...this.safety.lines], veils: [...this.safety.veils] };
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
    if (user.isSelf) ui.notifications.warn(game.i18n.localize(key));
    else game.socket.emit(CHANNEL, { type: "error", userId: user.id, key });
  },

  _onSocket(message) {
    if (!message || typeof message !== "object") return;
    if (message.type === "error" && message.userId === game.user.id) return ui.notifications.warn(game.i18n.localize(message.key));
    if (!this.isHost) return;
    const user = game.users.get(message.userId);
    if (!user) return;
    if (message.type === "op") return this._apply(message.op, message.args, user);
    if (message.type === "safety") return this._applySafety(message.action, message.payload, user);
  }
};
