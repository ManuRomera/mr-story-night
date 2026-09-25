import { SYSTEM_ID, TEMPLATES } from "./constants.js";
import { Store } from "./store.js";
import { buildLobbyView } from "./view.js";
import { allQuests, customQuests, findQuest, normalizeQuest, questFromForm, saveCustomQuests } from "./quests.js";
import { download, slug } from "./utils.js";
import { TableWindow, localize as t } from "./sheets/common.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Vestíbulo: empezar una partida, gestionar misiones y consultar el archivo de compañías. */
export class Lobby extends TableWindow(HandlebarsApplicationMixin(ApplicationV2)) {
  static DEFAULT_OPTIONS = {
    id: "mr-lobby",
    classes: ["mr-app", "mr-lobby-app"],
    tag: "section",
    window: { title: "MR.Lobby.Window", icon: "fa-solid fa-door-open", resizable: true },
    position: { width: 960, height: 700 },
    actions: {
      tab: Lobby.#onTab, genre: Lobby.#onGenre, selectQuest: Lobby.#onSelectQuest, randomQuest: Lobby.#onRandomQuest,
      addSeat: Lobby.#onAddSeat, addGuest: Lobby.#onAddGuest, removeSeat: Lobby.#onRemoveSeat, moveSeat: Lobby.#onMoveSeat, start: Lobby.#onStart,
      newQuest: Lobby.#onNewQuest, editQuest: Lobby.#onEditQuest, cancelEdit: Lobby.#onCancelEdit, duplicateQuest: Lobby.#onDuplicateQuest,
      deleteQuest: Lobby.#onDeleteQuest, exportQuest: Lobby.#onExportQuest, saveQuest: Lobby.#onSaveQuest, openFellowship: Lobby.#onOpenFellowship, activate: Lobby.#onActivate
    }
  };
  static PARTS = { lobby: { template: `${TEMPLATES}/lobby.hbs`, scrollable: [".mr-lobby__scroll", ".mr-main"] } };

  static #instance = null;
  static open(options = {}) {
    this.#instance ??= new Lobby();
    if (options.tab) this.#instance.local.tab = options.tab;
    return this.#instance.render({ force: true });
  }
  static refresh() { this.#instance?.requestRender(); }

  local = { tab: "new", seats: null };

  async _prepareContext() {
    if (!this.local.seats) this.local.seats = game.users.filter(u => u.active).map(u => ({ userId: u.id, name: u.name }));
    return buildLobbyView({
      quests: allQuests(), users: game.users.map(u => ({ id: u.id, name: u.name })), local: this.local, t,
      user: { id: game.user.id, isGM: game.user.isGM }, fellowships: Store.fellowships(), activeId: Store.activeId
    });
  }

  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this.element.addEventListener("change", async event => {
      const el = event.target;
      if (el.name === "storyTitle") this.local.title = el.value;
      if (el.dataset.import === "quest" && el.files?.[0]) {
        try {
          const quest = normalizeQuest(JSON.parse(await el.files[0].text()));
          if (!quest) throw new Error("bad");
          await saveCustomQuests([...customQuests(), quest]);
          ui.notifications.info(t("MR.Quest.Imported", { title: quest.title }));
          this.render();
        } catch { ui.notifications.error(t("MR.Error.BadFile")); }
      }
    });
  }

  static #onTab(event, target) { this.local.tab = target.dataset.tab; this.render(); }
  static #onGenre(event, target) { this.local.genre = target.dataset.genre || ""; this.render(); }
  static #onSelectQuest(event, target) { this.local.questId = target.dataset.id; this.render(); }
  static #onRandomQuest() {
    const list = allQuests().filter(q => !this.local.genre || (q.genre ?? q.theme) === this.local.genre);
    if (list.length) this.local.questId = list[Math.floor(Math.random() * list.length)].id;
    this.render();
  }
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
  static async #onStart() {
    const quest = findQuest(this.local.questId);
    if (!quest) return ui.notifications.warn(t("MR.Lobby.NeedQuest"));
    const { builtin, ...clean } = quest;
    const title = this.element.querySelector("[name=storyTitle]")?.value || quest.title;
    const result = await Store.createStory({ quest: clean, seats: this.local.seats, title });
    if (result) { this.local.questId = null; this.local.title = ""; this.close(); }
  }

  static #onNewQuest() { this.local.editQuest = { id: "", title: "", theme: "neutral", genre: "fantasy", questions: [], difficulties: [], concepts: [], desires: [], challenges: [] }; this.render(); }
  static #onEditQuest(event, target) { this.local.editQuest = structuredClone(findQuest(target.dataset.id)); this.render(); }
  static #onCancelEdit() { this.local.editQuest = null; this.render(); }
  static async #onDuplicateQuest(event, target) {
    const quest = normalizeQuest(findQuest(target.dataset.id));
    if (!quest) return;
    quest.title = t("MR.Quest.CopyOf", { title: quest.title });
    await saveCustomQuests([...customQuests(), quest]);
    this.render();
  }
  static async #onDeleteQuest(event, target) {
    const quest = findQuest(target.dataset.id);
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: t("MR.Action.Delete") }, content: `<p>${t("MR.Quest.DeleteConfirm", { title: foundry.utils.escapeHTML(quest?.title ?? "") })}</p>` });
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
  static #onOpenFellowship(event, target) { game.actors.get(target.dataset.id)?.sheet?.render(true); }
  static async #onActivate(event, target) { if (game.user.isGM) { await game.settings.set(SYSTEM_ID, "activeFellowship", target.dataset.id); this.render(); } }
}
