import { SYSTEM_ID, TEMPLATES } from "../constants.js";
import { Store } from "../store.js";
import { buildTableView } from "../view.js";
import { generate, generateScene } from "../generators.js";
import { getTables } from "../quests.js";
import { currentChallenge, activeMain } from "../engine.js";
import { download, slug } from "../utils.js";
import { TableWindow, localize as t } from "./common.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

/** Hoja común: la compañía. Todo el grupo la ve; los cambios pasan por el anfitrión. */
export class FellowshipSheet extends TableWindow(HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2)) {
  static DEFAULT_OPTIONS = {
    classes: ["mr-app", "mr-fellowship"],
    position: { width: 900, height: 740 },
    window: { resizable: true, icon: "fa-solid fa-people-group" },
    form: { submitOnChange: false, closeOnSubmit: false, handler: async () => {} },
    actions: {
      mrTab: FellowshipSheet.#onTab, undo: FellowshipSheet.#onUndo, op: FellowshipSheet.#onOp, set: FellowshipSheet.#onSet, local: FellowshipSheet.#onLocal,
      openSheet: FellowshipSheet.#onOpenSheet, roll: FellowshipSheet.#onRoll, pickDifficulty: FellowshipSheet.#onPickDifficulty, pickChallenge: FellowshipSheet.#onPickChallenge,
      adopt: FellowshipSheet.#onAdopt, newcomer: FellowshipSheet.#onNewcomer, addConsequence: FellowshipSheet.#onAddConsequence,
      stoneDraft: FellowshipSheet.#onStoneDraft, submitStones: FellowshipSheet.#onSubmitStones, resolveLoss: FellowshipSheet.#onResolveLoss,
      finish: FellowshipSheet.#onFinish, print: FellowshipSheet.#onPrint, exportStory: FellowshipSheet.#onExport, activate: FellowshipSheet.#onActivate,
      toggleGuide: FellowshipSheet.#onToggleGuide, toggleSide: FellowshipSheet.#onToggleSide, signal: FellowshipSheet.#onSignal, addLimit: FellowshipSheet.#onAddLimit, removeLimit: FellowshipSheet.#onRemoveLimit, lobby: FellowshipSheet.#onLobby
    }
  };
  static PARTS = { sheet: { template: `${TEMPLATES}/fellowship.hbs`, scrollable: [".mr-main", ".mr-side", ".mr-layout"] } };

  tab = "play";
  local = { stones: {} };

  get title() { return this.document.name; }
  get state() { return this.document.system.state; }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const state = this.state;
    const view = buildTableView({
      state, actors: Store.actorsFor(state), user: { id: game.user.id, isGM: game.user.isGM }, t, tab: this.tab,
      local: { ...this.local, canUndo: Store.canUndo(this.document.id), hideGuide: !game.settings.get(SYSTEM_ID, "phaseGuide"), hideSide: !game.settings.get(SYSTEM_ID, "sidePanel") }, safety: Store.safety, title: this.document.name
    });
    view.isActive = Store.activeId === this.document.id;
    return { ...context, ...view };
  }

  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this.element.addEventListener("change", event => this.#onChange(event));
  }

  dispatch(op, args) { return Store.dispatch(op, args, this.document.id); }

  _presenceDoc(el) { return el.dataset.field ? this.document.id : null; }
  _commitLive(el) { return this.dispatch("setField", { path: el.dataset.field, value: el.value }); }

  async #onChange(event) {
    const el = event.target;
    if (el.dataset.field) return this.dispatch("setField", { path: el.dataset.field, value: el.value });
    if (el.dataset.local) { this.local[el.dataset.local] = el.value; return; }
    if (el.dataset.actionChange === "actForAll") { this.local.actForAll = el.checked; return this.render(); }
  }

  /** Nombres de los protagonistas activos, para los generadores. */
  #names() { return (this.state?.seats ?? []).map(s => activeMain(this.state, s.id)).filter(Boolean).map(m => Store.describe(m.id).name).filter(Boolean); }

  static async #onTab(event, target) {
    this.tab = target.dataset.tab;
    await this.render();
    // Desde la tarjeta de fase: saltar a su sección del tutorial.
    if (target.dataset.anchor) this.element.querySelector(`#mr-guide-${target.dataset.anchor}`)?.scrollIntoView({ block: "start" });
  }
  static async #onToggleSide() {
    await game.settings.set(SYSTEM_ID, "sidePanel", !game.settings.get(SYSTEM_ID, "sidePanel"));
    this.render();
  }
  static async #onToggleGuide() {
    await game.settings.set(SYSTEM_ID, "phaseGuide", !game.settings.get(SYSTEM_ID, "phaseGuide"));
    this.render();
  }
  static async #onUndo() { await Store.undo(this.document.id); }
  static async #onOp(event, target) { await this.dispatch(target.dataset.op, target.dataset.args ? JSON.parse(target.dataset.args) : {}); }
  static async #onSet(event, target) { await this.dispatch("setField", { path: target.dataset.field, value: target.dataset.value }); }
  static #onLocal(event, target) { this.local[target.dataset.key] = target.dataset.value || null; this.render(); }
  static #onOpenSheet(event, target) { game.actors.get(target.dataset.actorId)?.sheet?.render(true); }
  static #onLobby() { game[SYSTEM_ID].lobby(); }

  /** Dados de inspiración: rellenan un campo con una opción de las tablas. */
  static async #onRoll(event, target) {
    const kind = target.dataset.kind, field = target.dataset.field;
    const tables = getTables(), quest = this.state.quest;
    if (kind === "scene") {
      const s = generateScene(tables, quest, Math.random, { names: this.#names() });
      const value = [[s.where, s.who].filter(Boolean).join(" — "), s.situation].filter(Boolean).join(".\n");
      return this.dispatch("setField", { path: "scene.situation", value });
    }
    if (kind === "challenge") {
      const c = generate(tables, quest, "challenge", Math.random, { avoid: this.state.challenges.map(x => x.title) });
      await this.dispatch("setField", { path: "challenge.title", value: c.title });
      await this.dispatch("setField", { path: "challenge.why", value: c.text });
      return;
    }
    if (kind === "consequence") {
      const input = this.element.querySelector("[name=consequence]");
      if (input) { input.value = generate(tables, quest, "consequence", Math.random); input.focus(); }
      return;
    }
    const value = generate(tables, quest, kind, Math.random, { names: this.#names(), avoid: [this.element.querySelector(`[data-field="${field}"]`)?.value] });
    await this.dispatch("setField", { path: field, value });
  }

  static async #onPickDifficulty(event, target) {
    const current = this.state?.setup?.difficulties ?? ["", ""];
    const value = target.dataset.value;
    const existing = current.indexOf(value);
    const index = existing >= 0 ? existing : current.findIndex(d => !d.trim());
    await this.dispatch("setField", { path: `setup.difficulties.${index >= 0 ? index : 1}`, value: existing >= 0 ? "" : value });
  }
  static async #onPickChallenge(event, target) {
    await this.dispatch("setField", { path: "challenge.title", value: target.dataset.title });
    if (target.dataset.text) await this.dispatch("setField", { path: "challenge.why", value: target.dataset.text });
  }
  static async #onAdopt(event, target) {
    const seatId = target.dataset.seatId;
    const charId = this.element.querySelector(`[name="adopt-${seatId}"]`)?.value;
    await this.dispatch("replaceMain", { seatId, mode: "adopt", charId });
  }
  static async #onNewcomer(event, target) { await Store.newcomer(target.dataset.seatId, this.document.id); }
  static async #onAddConsequence() {
    const input = this.element.querySelector("[name=consequence]");
    if (!input?.value.trim()) return;
    const text = input.value; input.value = "";
    await this.dispatch("addConsequence", { text });
  }
  static #onStoneDraft(event, target) {
    const { seatId, key, value } = target.dataset;
    this.local.stones[seatId] = { ...(this.local.stones[seatId] ?? {}), [key]: key === "discontent" ? Number(value) : value };
    this.render();
  }
  static async #onSubmitStones(event, target) {
    const seatId = target.dataset.seatId;
    const draft = this.local.stones[seatId];
    if (draft && await this.dispatch("submitStones", { seatId, ...draft })) delete this.local.stones[seatId];
  }
  static async #onResolveLoss() {
    const note = this.element.querySelector("[name=lossNote]")?.value ?? "";
    const fate = this.local.lossFate ?? (currentChallenge(this.state)?.outcome?.betrayal ? "betrayed" : null);
    if (!this.local.lossChar || !fate) return ui.notifications.warn(t("MR.Loss.Incomplete"));
    if (await this.dispatch("resolveLoss", { charId: this.local.lossChar, fate, note })) Object.assign(this.local, { lossChar: null, lossFate: null, lossNote: "" });
  }
  static async #onFinish() {
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: t("MR.Epilogue.Finish") }, content: `<p>${t("MR.Epilogue.FinishConfirm")}</p>` });
    if (ok) await this.dispatch("finish");
  }
  static #onPrint() {
    const html = this.element.querySelector(".mr-credits")?.outerHTML;
    if (!html) return;
    const win = window.open("", "_blank");
    if (!win) return ui.notifications.warn(t("MR.Credits.PopupBlocked"));
    const css = [...document.querySelectorAll("link[rel=stylesheet]")].filter(l => l.href.includes(SYSTEM_ID) || l.href.includes("fontawesome")).map(l => `<link rel="stylesheet" href="${l.href}">`).join("");
    win.document.write(`<!doctype html><html lang="${game.i18n.lang}"><head><meta charset="utf-8"><title>${foundry.utils.escapeHTML(this.document.name)}</title>${css}</head><body class="mr-print">${html}</body></html>`);
    win.document.close();
    win.addEventListener("load", () => win.print());
  }
  static #onExport() { if (this.state) download(`${slug(this.document.name)}.mrstory.json`, { format: "mr-story-night", version: 3, story: this.state }); }
  static async #onActivate() { if (game.user.isGM) await game.settings.set(SYSTEM_ID, "activeFellowship", this.document.id); }

  static async #onSignal(event, target) { await Store.safetyAction("signal", { type: target.dataset.signal }); }
  static async #onAddLimit(event, target) {
    const input = this.element.querySelector(`[name="limit-${target.dataset.kind}"]`);
    if (!input?.value.trim()) return;
    await Store.safetyAction("addLimit", { kind: target.dataset.kind, text: input.value });
    input.value = "";
  }
  static async #onRemoveLimit(event, target) { await Store.safetyAction("removeLimit", { kind: target.dataset.kind, index: target.dataset.index }); }
}
