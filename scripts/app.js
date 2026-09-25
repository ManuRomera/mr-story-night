import { SYSTEM_ID, TEMPLATES } from "./constants.js";
import { Store } from "./store.js";
import { buildView } from "./view.js";
import { allQuests, customQuests, findQuest, normalizeQuest, questFromForm, saveCustomQuests } from "./quests.js";
import { download, slug } from "./utils.js";
import { RuleError } from "./engine.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const t = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));

/** La mesa: una única ventana compartida por todo el grupo. */
export class StoryTable extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "mr-story-table",
    classes: ["mr-app", "mr-table-app"],
    tag: "section",
    window: { title: "MR.App.Title", icon: "fa-solid fa-people-group", resizable: true },
    position: { width: 1120, height: 800 },
    actions: {
      tab: StoryTable.#onTab, undo: StoryTable.#onUndo, op: StoryTable.#onOp, set: StoryTable.#onSet, local: StoryTable.#onLocal,
      selectQuest: StoryTable.#onSelectQuest, addSeat: StoryTable.#onAddSeat, addGuest: StoryTable.#onAddGuest,
      removeSeat: StoryTable.#onRemoveSeat, moveSeat: StoryTable.#onMoveSeat, startStory: StoryTable.#onStartStory,
      pickDifficulty: StoryTable.#onPickDifficulty, pickChallenge: StoryTable.#onPickChallenge, pickImage: StoryTable.#onPickImage,
      adopt: StoryTable.#onAdopt, newcomer: StoryTable.#onNewcomer, addConsequence: StoryTable.#onAddConsequence,
      stoneDraft: StoryTable.#onStoneDraft, submitStones: StoryTable.#onSubmitStones, resolveLoss: StoryTable.#onResolveLoss,
      finish: StoryTable.#onFinish, print: StoryTable.#onPrint, exportStory: StoryTable.#onExportStory, newStory: StoryTable.#onNewStory,
      signal: StoryTable.#onSignal, addLimit: StoryTable.#onAddLimit, removeLimit: StoryTable.#onRemoveLimit,
      newQuest: StoryTable.#onNewQuest, editQuest: StoryTable.#onEditQuest, duplicateQuest: StoryTable.#onDuplicateQuest,
      deleteQuest: StoryTable.#onDeleteQuest, exportQuest: StoryTable.#onExportQuest, saveQuest: StoryTable.#onSaveQuest
    }
  };

  static PARTS = { table: { template: `${TEMPLATES}/table.hbs`, scrollable: [".mr-main", ".mr-side", ".mr-layout"] } };

  static #instance = null;
  static open(options = {}) {
    this.#instance ??= new StoryTable();
    if (options.tab) this.#instance.tab = options.tab;
    return this.#instance.render({ force: true });
  }
  static refresh() { this.#instance?.requestRender(); }

  tab = "play";
  local = { seats: null, stones: {} };
  #pendingRender = false;
  #focus = null;

  constructor(options) {
    super(options);
    this.unsubscribe = Store.subscribe(() => this.requestRender());
  }

  /** Evita redibujar mientras alguien escribe; se redibuja al salir del campo. */
  requestRender() {
    if (!this.rendered) return;
    const active = document.activeElement;
    if (active && this.element.contains(active) && active.matches("input[type=text], textarea")) { this.#pendingRender = true; return; }
    this.render();
  }

  async _prepareContext() {
    const story = Store.story;
    if (!this.local.seats) this.local.seats = game.users.filter(u => u.active).map(u => ({ userId: u.id, name: u.name }));
    const view = buildView({
      state: story, user: { id: game.user.id, isGM: game.user.isGM }, t, tab: this.tab,
      local: { ...this.local, canUndo: Store.canUndo() }, quests: allQuests(), archive: game.settings.get(SYSTEM_ID, "archive") ?? [],
      safety: Store.safety, users: game.users.map(u => ({ id: u.id, name: u.name }))
    });
    this.view = view;
    return view;
  }

  _preRender(context, options) {
    const active = document.activeElement;
    this.#focus = active && this.element?.contains(active) ? { selector: active.dataset.field ? `[data-field="${active.dataset.field}"]` : active.name ? `[name="${active.name}"]` : null, start: active.selectionStart, end: active.selectionEnd } : null;
    return super._preRender(context, options);
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.dataset.mrTheme = context.theme;
    if (this.#focus?.selector) {
      const target = this.element.querySelector(this.#focus.selector);
      if (target && !target.disabled) { target.focus({ preventScroll: true }); try { target.setSelectionRange?.(this.#focus.start, this.#focus.end); } catch { /* campos sin selección */ } }
    }
  }

  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    const root = this.element;
    root.addEventListener("change", event => this.#onChange(event));
    root.addEventListener("focusout", () => { if (this.#pendingRender) setTimeout(() => { if (!this.#pendingRender) return; this.#pendingRender = false; this.requestRender(); }, 0); });
    root.addEventListener("keydown", event => {
      if (event.key !== "Enter" || event.target.tagName !== "INPUT" || event.target.dataset.field) return;
      const button = event.target.closest(".mr-inline")?.querySelector("button");
      if (button) { event.preventDefault(); button.click(); }
    });
  }

  async close(options) {
    return super.close(options);
  }

  async #onChange(event) {
    const el = event.target;
    if (el.dataset.field) return Store.dispatch("setField", { path: el.dataset.field, value: el.value });
    if (el.dataset.local) { this.local[el.dataset.local] = el.value; return; }
    if (el.dataset.actionChange === "actForAll") { this.local.actForAll = el.checked; return this.render(); }
    if (el.dataset.import && el.files?.[0]) {
      try {
        const data = JSON.parse(await el.files[0].text());
        if (el.dataset.import === "quest") {
          const quest = normalizeQuest(data) ?? (() => { throw new RuleError("MR.Error.BadFile"); })();
          await saveCustomQuests([...customQuests(), quest]);
          ui.notifications.info(t("MR.Quest.Imported", { title: quest.title }));
        } else {
          await Store.importStory(data);
          ui.notifications.info(t("MR.Archive.Imported"));
        }
        this.render();
      } catch (error) { ui.notifications.error(t(error instanceof RuleError ? error.key : "MR.Error.BadFile")); }
    }
  }

  /* ---------- Acciones ---------- */
  static #onTab(event, target) { this.tab = target.dataset.tab; this.render(); }
  static async #onUndo() { await Store.undo(); }
  static async #onOp(event, target) { await Store.dispatch(target.dataset.op, target.dataset.args ? JSON.parse(target.dataset.args) : {}); }
  static async #onSet(event, target) { await Store.dispatch("setField", { path: target.dataset.field, value: target.dataset.value }); }
  static #onLocal(event, target) { this.local[target.dataset.key] = target.dataset.value || null; this.render(); }

  static #onSelectQuest(event, target) { this.local.questId = target.dataset.id; this.render(); }
  static #onAddSeat(event, target) {
    const user = game.users.get(target.dataset.userId);
    if (user) this.local.seats.push({ userId: user.id, name: user.name });
    this.render();
  }
  static #onAddGuest() {
    const input = this.element.querySelector("[name=guestName]");
    const name = input?.value.trim();
    if (!name) return;
    this.local.seats.push({ userId: null, name });
    this.render();
  }
  static #onRemoveSeat(event, target) { this.local.seats.splice(Number(target.dataset.index), 1); this.render(); }
  static #onMoveSeat(event, target) {
    const i = Number(target.dataset.index), j = i + Number(target.dataset.dir), seats = this.local.seats;
    if (j < 0 || j >= seats.length) return;
    [seats[i], seats[j]] = [seats[j], seats[i]];
    this.render();
  }
  static async #onStartStory() {
    const quest = findQuest(this.local.questId);
    if (!quest) return ui.notifications.warn(t("MR.Lobby.NeedQuest"));
    const story = Store.story;
    if (story && story.phase !== "complete") {
      const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: t("MR.Lobby.ReplaceTitle") }, content: `<p>${t("MR.Lobby.ReplaceBody")}</p>` });
      if (!ok) return;
    }
    const { builtin, ...clean } = quest;
    if (await Store.dispatch("start", { quest: clean, seats: this.local.seats })) { this.local.lobby = false; this.tab = "play"; }
  }

  static async #onPickDifficulty(event, target) {
    const current = Store.story?.setup?.difficulties ?? ["", ""];
    const value = target.dataset.value;
    const existing = current.indexOf(value);
    const index = existing >= 0 ? existing : current.findIndex(d => !d.trim());
    await Store.dispatch("setField", { path: `setup.difficulties.${index >= 0 ? index : 1}`, value: existing >= 0 ? "" : value });
  }
  static async #onPickChallenge(event, target) {
    await Store.dispatch("setField", { path: "challenge.title", value: target.dataset.title });
    if (target.dataset.text && !Store.story?.challenges?.at(-1)?.why) await Store.dispatch("setField", { path: "challenge.why", value: target.dataset.text });
  }
  static #onPickImage(event, target) {
    const id = target.dataset.charId;
    const current = Store.story?.characters.find(c => c.id === id)?.img ?? "";
    const Picker = foundry.applications.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
    new Picker({ type: "image", current, callback: path => Store.dispatch("setField", { path: `characters.${id}.img`, value: path }) }).render(true);
  }
  static async #onAdopt(event, target) {
    const seatId = target.dataset.seatId;
    const charId = this.element.querySelector(`[name="adopt-${seatId}"]`)?.value;
    await Store.dispatch("replaceMain", { seatId, mode: "adopt", charId });
  }
  static async #onNewcomer(event, target) {
    const seatId = target.dataset.seatId;
    const name = this.element.querySelector(`[name="newName-${seatId}"]`)?.value;
    const concept = this.element.querySelector(`[name="newConcept-${seatId}"]`)?.value;
    await Store.dispatch("replaceMain", { seatId, mode: "new", name, concept });
  }
  static async #onAddConsequence() {
    const input = this.element.querySelector("[name=consequence]");
    if (!input?.value.trim()) return;
    const text = input.value; input.value = "";
    await Store.dispatch("addConsequence", { text });
  }
  static #onStoneDraft(event, target) {
    const { seatId, key, value } = target.dataset;
    this.local.stones[seatId] = { ...(this.local.stones[seatId] ?? {}), [key]: key === "discontent" ? Number(value) : value };
    this.render();
  }
  static async #onSubmitStones(event, target) {
    const seatId = target.dataset.seatId;
    const draft = this.local.stones[seatId];
    if (!draft) return;
    if (await Store.dispatch("submitStones", { seatId, ...draft })) delete this.local.stones[seatId];
  }
  static async #onResolveLoss() {
    const note = this.element.querySelector("[name=lossNote]")?.value ?? "";
    const fate = this.local.lossFate ?? (Store.story?.challenges?.at(-1)?.outcome?.betrayal ? "betrayed" : null);
    if (!this.local.lossChar || !fate) return ui.notifications.warn(t("MR.Loss.Incomplete"));
    if (await Store.dispatch("resolveLoss", { charId: this.local.lossChar, fate, note })) { this.local.lossChar = null; this.local.lossFate = null; this.local.lossNote = ""; }
  }
  static async #onFinish() {
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: t("MR.Epilogue.Finish") }, content: `<p>${t("MR.Epilogue.FinishConfirm")}</p>` });
    if (ok) await Store.dispatch("finish");
  }
  static #onPrint() {
    const html = this.element.querySelector(".mr-credits")?.outerHTML;
    if (!html) return;
    const win = window.open("", "_blank");
    if (!win) return ui.notifications.warn(t("MR.Credits.PopupBlocked"));
    const css = [...document.querySelectorAll("link[rel=stylesheet]")].filter(l => l.href.includes(SYSTEM_ID) || l.href.includes("fontawesome")).map(l => `<link rel="stylesheet" href="${l.href}">`).join("");
    win.document.write(`<!doctype html><html lang="${game.i18n.lang}"><head><meta charset="utf-8"><title>${Store.story?.quest?.title ?? "MR · Story Night"}</title>${css}</head><body class="mr-print">${html}</body></html>`);
    win.document.close();
    win.addEventListener("load", () => win.print());
  }
  static #onExportStory(event, target) {
    const id = target.dataset.id;
    const story = Store.story?.id === id ? Store.story : (game.settings.get(SYSTEM_ID, "archive") ?? []).find(s => s.id === id);
    if (story) download(`${slug(story.quest.title)}.mrstory.json`, { format: "mr-story-night", version: 2, story });
  }
  static #onNewStory() { this.local.lobby = true; this.local.questId = null; this.render(); }

  static async #onSignal(event, target) { await Store.safetyAction("signal", { type: target.dataset.signal }); }
  static async #onAddLimit(event, target) {
    const input = this.element.querySelector(`[name="limit-${target.dataset.kind}"]`);
    if (!input?.value.trim()) return;
    await Store.safetyAction("addLimit", { kind: target.dataset.kind, text: input.value });
    input.value = "";
  }
  static async #onRemoveLimit(event, target) { await Store.safetyAction("removeLimit", { kind: target.dataset.kind, index: target.dataset.index }); }

  static #onNewQuest() { this.local.editQuest = { id: "", title: "", theme: "neutral", questions: [], difficulties: [], concepts: [], desires: [], challenges: [] }; this.render(); }
  static #onEditQuest(event, target) { this.local.editQuest = structuredClone(findQuest(target.dataset.id)); this.render(); }
  static async #onDuplicateQuest(event, target) {
    const quest = normalizeQuest(findQuest(target.dataset.id));
    if (!quest) return;
    quest.title = t("MR.Quest.CopyOf", { title: quest.title });
    await saveCustomQuests([...customQuests(), quest]);
    this.render();
  }
  static async #onDeleteQuest(event, target) {
    const quest = findQuest(target.dataset.id);
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: t("MR.Action.Delete") }, content: `<p>${t("MR.Quest.DeleteConfirm", { title: foundry.utils.escapeHTML?.(quest?.title ?? "") ?? "" })}</p>` });
    if (!ok) return;
    await saveCustomQuests(customQuests().filter(q => q.id !== target.dataset.id));
    this.render();
  }
  static #onExportQuest(event, target) {
    const { builtin, ...quest } = findQuest(target.dataset.id) ?? {};
    if (quest.title) download(`${slug(quest.title)}.mrquest.json`, { format: "mr-story-night-quest", version: 1, quest });
  }
  static async #onSaveQuest(event, target) {
    const form = this.element.querySelector("[data-quest-form]");
    const quest = questFromForm(form, target.dataset.id);
    if (!quest.title) return ui.notifications.warn(t("MR.Quest.NeedTitle"));
    if (quest.challenges.length < 3) ui.notifications.warn(t("MR.Quest.FewChallenges"));
    const list = customQuests();
    const index = list.findIndex(q => q.id === quest.id);
    if (index >= 0) list[index] = quest; else list.push(quest);
    await saveCustomQuests(list);
    this.local.editQuest = null;
    this.render();
  }
}
