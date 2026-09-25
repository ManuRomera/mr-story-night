import { PARTIALS, SYSTEM_ID } from "./constants.js";
import { registerSettings, applyPreferences } from "./settings.js";
import { Store } from "./store.js";
import { CharacterData, FellowshipData } from "./models.js";
import { FellowshipSheet } from "./sheets/fellowship.js";
import { CharacterSheet } from "./sheets/character.js";
import { Lobby } from "./lobby.js";
import { loadContent, getTables, allQuests } from "./quests.js";
import { syncSafety } from "./overlay.js";
import { OUTCOMES } from "./engine.js";
import { generate } from "./generators.js";

/** Abre la hoja común activa o, si no hay partida, el vestíbulo. */
function openTable() {
  const fellowship = Store.fellowship();
  if (fellowship) return fellowship.sheet.render(true);
  return Lobby.open();
}

/** Abre las fichas de protagonista de este usuario en la partida activa. */
function openMySheets(state) {
  for (const seat of state.seats.filter(s => s.userId === game.user.id)) {
    const main = state.characters.find(c => c.seatId === seat.id && c.role === "main" && c.status === "active");
    game.actors.get(main?.id)?.sheet?.render(true);
  }
}

const lastPhase = new Map();

Hooks.once("init", () => {
  console.info("MR · Story Night | Inicializando");
  registerSettings({
    onActive: () => { if (game.settings.get(SYSTEM_ID, "autoOpen")) Store.fellowship()?.sheet.render(true); Lobby.refresh(); },
    onSafety: () => { syncSafety(); for (const app of foundry.applications.instances.values()) if (app instanceof FellowshipSheet) app.requestRender(); },
    onLibrary: () => Lobby.refresh()
  });
  Object.assign(CONFIG.Actor.dataModels, { character: CharacterData, fellowship: FellowshipData });
  const Actors = foundry.documents.collections.Actors;
  Actors.registerSheet(SYSTEM_ID, CharacterSheet, { types: ["character"], makeDefault: true, label: "MR.Sheet.Character" });
  Actors.registerSheet(SYSTEM_ID, FellowshipSheet, { types: ["fellowship"], makeDefault: true, label: "MR.Sheet.Fellowship" });
  foundry.applications.handlebars.loadTemplates(PARTIALS);
  game.keybindings.register(SYSTEM_ID, "openTable", { name: "MR.App.Open", editable: [{ key: "KeyT", modifiers: ["Shift"] }], onDown: () => { openTable(); return true; } });
  game[SYSTEM_ID] = Object.freeze({
    open: openTable, lobby: options => Lobby.open(options),
    get fellowship() { return Store.fellowship(); }, get story() { return Store.story(); },
    dispatch: (op, args) => Store.dispatch(op, args),
    generate: (kind, opts) => generate(getTables(), Store.story()?.quest ?? {}, kind, Math.random, opts),
    quests: () => allQuests(), outcomes: OUTCOMES, hooks: { changed: "mrStoryNightChanged" }
  });
});

Hooks.once("ready", async () => {
  applyPreferences();
  Store.init();
  await loadContent();
  syncSafety({ notify: false });
  for (const actor of game.actors.filter(a => a.type === "fellowship")) lastPhase.set(actor.id, actor.system.state?.phase);
  if (!game.settings.get(SYSTEM_ID, "autoOpen")) return;
  const state = Store.story();
  if (!state) { if (game.user.isGM) Lobby.open(); return; }
  Store.fellowship().sheet.render(true);
  if (state.phase === "characters") openMySheets(state);
});

Hooks.on("updateActor", (actor, changes) => {
  if (actor.type === "fellowship" && changes.system) {
    const state = actor.system.state;
    const before = lastPhase.get(actor.id);
    lastPhase.set(actor.id, state?.phase);
    // Al pasar a crear la compañía, cada jugador ve su ficha.
    if (state?.phase === "characters" && before !== "characters" && actor.id === Store.activeId) openMySheets(state);
    for (const app of foundry.applications.instances.values()) {
      if (app instanceof CharacterSheet && app.document.system.fellowship === actor.id) app.requestRender();
    }
    Hooks.callAll("mrStoryNightChanged", state, actor);
  }
  if (actor.type === "character" && actor.system.fellowship) {
    const fellowship = Store.fellowship(actor.system.fellowship);
    if (fellowship?.sheet?.rendered) fellowship.sheet.requestRender();
    // Las fichas de los demás muestran el nombre de su vecino de la izquierda.
    for (const app of foundry.applications.instances.values()) if (app instanceof CharacterSheet && app.document.id !== actor.id && app.document.system.fellowship === actor.system.fellowship) app.requestRender();
  }
});

Hooks.on("getSceneControlButtons", controls => {
  const notes = controls?.notes;
  if (!notes?.tools) return;
  notes.tools.mrStoryTable = { name: "mrStoryTable", title: "MR.App.Open", icon: "fa-solid fa-people-group", order: Object.keys(notes.tools).length, button: true, visible: true, onChange: () => openTable() };
});

function addButton(root, className, label, icon, onClick, where) {
  if (!root || root.querySelector(`.${className}`)) return;
  const button = document.createElement("button");
  button.type = "button"; button.className = `mr-sidebar-button ${className}`;
  button.innerHTML = `<i class="${icon}"></i> ${game.i18n.localize(label)}`;
  button.addEventListener("click", onClick);
  (where?.(root) ?? root).prepend(button);
}

/** En el directorio de actores: acceso a la mesa y al vestíbulo, al estilo de las hojas de club. */
Hooks.on("renderActorDirectory", (_app, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  const box = document.createElement("div");
  if (!root || root.querySelector(".mr-directory-actions")) return;
  box.className = "mr-directory-actions";
  const make = (label, icon, fn) => { const b = document.createElement("button"); b.type = "button"; b.innerHTML = `<i class="${icon}"></i> ${game.i18n.localize(label)}`; b.addEventListener("click", fn); return b; };
  box.append(make("MR.App.Open", "fa-solid fa-people-group", openTable), make("MR.Lobby.Window", "fa-solid fa-door-open", () => Lobby.open()));
  (root.querySelector(".directory-header") ?? root).append(box);
});

Hooks.on("renderSettings", (_app, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  addButton(root, "mr-open-table", "MR.App.Open", "fa-solid fa-people-group", openTable, r => r.querySelector("section") ?? r);
});
