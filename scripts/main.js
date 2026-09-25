import { PARTIALS, SYSTEM_ID } from "./constants.js";
import { registerSettings, applyPreferences } from "./settings.js";
import { Store } from "./store.js";
import { StoryTable } from "./app.js";
import { CharacterData, CharacterSheet } from "./sheets/character.js";
import { loadBuiltinQuests } from "./quests.js";
import { syncSafety } from "./overlay.js";
import { OUTCOMES } from "./engine.js";

Hooks.once("init", () => {
  console.info("MR · Story Night | Inicializando");
  registerSettings({
    onStory: () => Store.emit(),
    onSafety: () => { syncSafety(); StoryTable.refresh(); },
    onLibrary: () => StoryTable.refresh()
  });
  CONFIG.Actor.dataModels.character = CharacterData;
  foundry.documents.collections.Actors.registerSheet(SYSTEM_ID, CharacterSheet, { types: ["character"], makeDefault: true, label: "MR.Character.Sheet" });
  foundry.applications.handlebars.loadTemplates(PARTIALS);
  game.keybindings.register(SYSTEM_ID, "openTable", {
    name: "MR.App.Open", editable: [{ key: "KeyT", modifiers: ["Shift"] }],
    onDown: () => { StoryTable.open(); return true; }
  });
  game[SYSTEM_ID] = Object.freeze({
    open: options => StoryTable.open(options),
    get story() { return Store.story; },
    dispatch: (op, args) => Store.dispatch(op, args),
    outcomes: OUTCOMES,
    hooks: { changed: "mrStoryNightChanged" }
  });
});

Hooks.once("ready", async () => {
  applyPreferences();
  Store.init();
  await loadBuiltinQuests();
  syncSafety({ notify: false });
  if (game.settings.get(SYSTEM_ID, "autoOpen")) StoryTable.open();
});

Hooks.on("getSceneControlButtons", controls => {
  const notes = controls?.notes;
  if (!notes?.tools) return;
  notes.tools.mrStoryTable = {
    name: "mrStoryTable", title: "MR.App.Open", icon: "fa-solid fa-people-group", order: Object.keys(notes.tools).length,
    button: true, visible: true, onChange: () => StoryTable.open()
  };
});

/** Botón visible en la barra lateral de ajustes, aunque no haya escena activa. */
Hooks.on("renderSettings", (_app, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(".mr-open-table")) return;
  const button = document.createElement("button");
  button.type = "button"; button.className = "mr-open-table";
  button.innerHTML = `<i class="fa-solid fa-people-group"></i> ${game.i18n.localize("MR.App.Open")}`;
  button.addEventListener("click", () => StoryTable.open());
  (root.querySelector("section") ?? root).prepend(button);
});
