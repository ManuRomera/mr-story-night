import { CHANNEL } from "./constants.js";

/**
 * Quién está escribiendo en qué campo. No se guarda en ningún documento: se anuncia por socket
 * al entrar en un campo y se retira al salir. Si nadie lo renueva, caduca solo.
 * Si dos personas entran a la vez en el mismo campo, gana quien entró antes.
 */
// Los navegadores espacian los temporizadores de las pestañas en segundo plano hasta un minuto.
const TTL = 90_000;
const REFRESH = 15_000;
const locks = new Map();   // "docId|campo" → { userId, at, seen }
const mine = new Map();    // "docId|campo" → { at, sent }
const keyOf = (docId, field) => `${docId}|${field}`;

export const Presence = {
  init({ onChange, onLost }) {
    this.onChange = onChange;
    this.onLost = onLost;
    game.socket.on(CHANNEL, message => { if (message?.type === "lock") this._receive(message); });
    Hooks.on("userConnected", (user, connected) => {
      if (connected) return;
      for (const [key, lock] of locks) if (lock.userId === user.id) locks.delete(key);
      this.onChange?.();
    });
    window.addEventListener("beforeunload", () => { for (const key of mine.keys()) this._send(key, false); });
    // Latido: mientras sigas dentro del campo, aunque no escribas, el bloqueo no caduca.
    // Y se repasan los bloqueos ajenos, por si alguien se desconectó sin soltarlos.
    setInterval(() => { for (const [key, held] of mine) { held.sent = Date.now(); this._send(key, true); } this.onChange?.(); }, REFRESH);
  },

  /** Usuario que está editando ese campo, si no soy yo y no ha caducado. */
  holder(docId, field) {
    const lock = locks.get(keyOf(docId, field));
    if (!lock || lock.userId === game.user.id || Date.now() - lock.seen > TTL) return null;
    return game.users.get(lock.userId) ?? null;
  },

  /** Todos los bloqueos vigentes de un documento: campo → usuario. */
  heldIn(docId) {
    const out = new Map();
    for (const key of locks.keys()) {
      const [doc, field] = key.split("|");
      const user = doc === docId && this.holder(doc, field);
      if (user) out.set(field, user);
    }
    return out;
  },

  claim(docId, field) {
    const key = keyOf(docId, field);
    const now = Date.now();
    const held = mine.get(key);
    if (held && now - held.sent < REFRESH) return;
    mine.set(key, { at: held?.at ?? now, sent: now });
    this._send(key, true);
  },

  release(docId, field) {
    const key = keyOf(docId, field);
    if (mine.delete(key)) this._send(key, false);
  },

  _send(key, on) {
    const [docId, field] = key.split("|");
    game.socket.emit(CHANNEL, { type: "lock", docId, field, on, userId: game.user.id, at: mine.get(key)?.at ?? Date.now() });
  },

  _receive({ docId, field, on, userId, at }) {
    if (!docId || !field || userId === game.user.id) return;
    const key = keyOf(docId, field);
    if (!on) { if (locks.get(key)?.userId === userId) locks.delete(key); return this.onChange?.(); }
    const own = mine.get(key);
    // Empate: si yo entré antes, sigo yo y el otro recibirá mi aviso.
    if (own && (own.at < at || (own.at === at && game.user.id < userId))) { own.sent = 0; return this.claim(docId, field); }
    locks.set(key, { userId, at, seen: Date.now() });
    if (own) { mine.delete(key); this.onLost?.(docId, field, game.users.get(userId)); }
    this.onChange?.();
  }
};
