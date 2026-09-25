import { SYSTEM_ID, TEMPLATES, CHARACTER_ICON } from "../constants.js";
import { Store } from "../store.js";
import { buildCharacterView } from "../view.js";
import { generate, generateCharacter } from "../generators.js";
import { getTables } from "../quests.js";
import { charById, leftSeat, activeMain } from "../engine.js";
import { TableWindow, localize as t } from "./common.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

/** Ficha personal: cada jugador edita la suya directamente, con dados de inspiración. */
export class CharacterSheet extends TableWindow(HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2)) {
  static DEFAULT_OPTIONS = {
    classes: ["mr-app", "mr-character"],
    position: { width: 500, height: 700 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      portrait: CharacterSheet.#onPortrait, roll: CharacterSheet.#onRoll, rollAll: CharacterSheet.#onRollAll, openTable: CharacterSheet.#onOpenTable,
      ready: CharacterSheet.#onReady, stoneDraft: CharacterSheet.#onStoneDraft, submitStones: CharacterSheet.#onSubmitStones
    }
  };
  static PARTS = { sheet: { template: `${TEMPLATES}/character.hbs`, scrollable: [".mr-character__body"] } };

  local = { stones: {} };

  get fellowship() { return Store.fellowship(this.document.system.fellowship); }
  get state() { return this.fellowship?.system.state ?? null; }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const state = this.state;
    const d = Store.describe(this.document.id);
    const actor = { ...d, id: this.document.id, name: this.document.name, displayName: d.name, img: this.document.img, notes: this.document.system.notes, placeholder: this.document.getFlag(SYSTEM_ID, "placeholder") ?? "" };
    const view = buildCharacterView({ state, actorId: this.document.id, actor, actors: Store.actorsFor(state), user: { id: game.user.id, isGM: game.user.isGM }, t, local: this.local, editable: this.isEditable });
    return { ...context, ...view, actor, hasPortrait: this.document.img && this.document.img !== CHARACTER_ICON };
  }

  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this.element.addEventListener("change", event => {
      const el = event.target;
      if (el.dataset.field) Store.dispatch("setField", { path: el.dataset.field, value: el.value }, this.document.system.fellowship);
    });
  }

  /** Un nombre vacío no se guarda (Foundry lo exige): se conserva el provisional. */
  _prepareSubmitData(event, form, formData, updateData) {
    const data = super._prepareSubmitData(event, form, formData, updateData);
    if (typeof data.name === "string" && !data.name.trim()) delete data.name;
    else if (data.name) foundry.utils.setProperty(data, "prototypeToken.name", data.name);
    return data;
  }

  /** El nombre del protagonista de la izquierda, para los deseos. */
  #target() {
    const state = this.state, c = state ? charById(state, this.document.id) : null;
    if (!c) return "";
    const seat = leftSeat(state, c.seatId);
    const left = activeMain(state, seat.id);
    return (left && Store.describe(left.id).name) || t("MR.Character.LeftOf", { seat: seat.name });
  }

  async #setFields(values) {
    const update = {};
    for (const [key, value] of Object.entries(values)) {
      if (key === "name") update.name = value;
      else update[`system.${key}`] = value;
    }
    if (update.name) update["prototypeToken.name"] = update.name;
    await this.document.update(update);
  }

  static async #onRoll(event, target) {
    if (!this.isEditable) return;
    const kind = target.dataset.kind;
    const quest = this.state?.quest ?? {};
    const current = kind === "name" ? this.document.name : this.document.system[kind];
    const value = generate(getTables(), quest, kind, Math.random, { target: this.#target(), avoid: [current] });
    await this.#setFields({ [kind]: value });
  }

  /** Rellena solo lo que esté vacío (o todo, con Mayús). */
  static async #onRollAll(event) {
    if (!this.isEditable) return;
    const c = this.state ? charById(this.state, this.document.id) : null;
    const g = generateCharacter(getTables(), this.state?.quest ?? {}, Math.random, { role: c?.role ?? "main", target: this.#target() });
    if (c && !c.hasWant) delete g.want;
    const d = Store.describe(this.document.id);
    const values = {};
    for (const [key, value] of Object.entries(g)) if (event.shiftKey || !String(d[key] ?? "").trim()) values[key] = value;
    if (!d.pronouns && event.shiftKey) values.pronouns = generate(getTables(), {}, "pronouns");
    await this.#setFields(values);
  }

  static #onPortrait() {
    if (!this.isEditable) return;
    const Picker = foundry.applications.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
    new Picker({ type: "image", current: this.document.img, callback: path => this.document.update({ img: path, "prototypeToken.texture.src": path }) }).render(true);
  }
  static #onOpenTable() { this.fellowship?.sheet?.render(true); }
  static async #onReady(event, target) { await Store.dispatch("setReady", { seatId: target.dataset.seatId, ready: target.dataset.ready === "true" }, this.document.system.fellowship); }
  static #onStoneDraft(event, target) {
    const { seatId, key, value } = target.dataset;
    this.local.stones[seatId] = { ...(this.local.stones[seatId] ?? {}), [key]: key === "discontent" ? Number(value) : value };
    this.render();
  }
  static async #onSubmitStones(event, target) {
    const seatId = target.dataset.seatId;
    const draft = this.local.stones[seatId];
    if (draft && await Store.dispatch("submitStones", { seatId, ...draft }, this.document.system.fellowship)) delete this.local.stones[seatId];
  }
}
