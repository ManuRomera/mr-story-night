import { SYSTEM_ID } from "./constants.js";
import { registerSettings, applyPreferences } from "./settings.js";
import { StoryStore } from "./store.js";
import { CharacterSheet } from "./sheets/character-sheet.js";
import { StoryDashboard } from "./apps/dashboard.js";
import { NewStoryWizard } from "./apps/new-story.js";
import { api } from "./api.js";
import { StoryTools } from "./apps/story-tools.js";

Hooks.once("init", () => {
  console.info("MR · Story Night | Initializing"); registerSettings();
  Handlebars.registerHelper("concat", (...args) => args.slice(0, -1).join(""));
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("array", (...args) => args.slice(0, -1));
  Handlebars.registerHelper("includes", (value, list) => Array.isArray(list) && list.includes(value));
  Handlebars.registerHelper("multiply", (a, b) => Number(a) * Number(b));
  Handlebars.registerHelper("midpoint", (a, b) => (Number(a) + Number(b)) / 2);
  Handlebars.registerHelper("join", (value, separator) => Array.isArray(value) ? value.join(separator) : "");
  Actors.unregisterSheet?.("core", ActorSheet, { types: ["character"] });
  Actors.registerSheet?.(SYSTEM_ID, CharacterSheet, { types: ["character"], makeDefault: true, label: "MR.Character.Sheet" });
  game[SYSTEM_ID] = api;
});

Hooks.once("ready", async () => {
  applyPreferences(); await StoryStore.init(); document.documentElement.classList.toggle("mr-safety-paused",Boolean(game.settings.get(SYSTEM_ID,"safetyState")?.paused));
  game.socket?.on(`system.${SYSTEM_ID}`, async message => { if (message.type === "story" && !game.user.isGM) StoryStore.receive(message.story); if(message.type==="safety-request"&&game.user.isGM){const state=foundry.utils.deepClone(game.settings.get(SYSTEM_ID,"safetyState"));state.signals.push(message.signal);state.signals=state.signals.slice(-20);if(message.signal.type==="pause")state.paused=true;await game.settings.set(SYSTEM_ID,"safetyState",state);game.socket.emit(`system.${SYSTEM_ID}`,{type:"safety",state});} if(message.type==="safety"){document.documentElement.classList.toggle("mr-safety-paused",message.state.paused);ui.notifications?.warn?.(game.i18n.localize(`MR.Safety.Signal.${message.state.signals.at(-1)?.type}`));} });
  if (game.user.isGM && !StoryStore.story) new NewStoryWizard().render(true);
});

Hooks.on("getSceneControlButtons", controls => {
  const notes = Array.isArray(controls) ? controls.find(control => control.name === "notes") : controls.notes;
  if (!notes?.tools) return;
  const tool = { name: "mr-story", title: "MR.Dashboard.Open", icon: "fas fa-book-open", button: true, onClick: () => new StoryDashboard().render(true) };
  if (Array.isArray(notes.tools)) notes.tools.push(tool); else notes.tools[tool.name] = tool;
});

Hooks.on("renderSidebarTab", (_app, html) => {
  if (!game.user.isGM) return;
  const root = html?.[0] ?? html;
  if (!(root instanceof HTMLElement) || root.querySelector(".mr-sidebar-launch")) return;
  const button = document.createElement("button"); button.className = "mr-sidebar-launch";
  const icon = document.createElement("i"); icon.className = "fas fa-book-open"; button.append(icon, ` ${game.i18n.localize("MR.Dashboard.Open")}`);
  button.addEventListener("click", () => new StoryDashboard().render(true)); root.prepend(button);
});

Hooks.on("hotbarDrop", (_bar, data, slot) => {
  if (data.type !== "MRStoryAction") return;
  Macro.create({ name: game.i18n.localize(data.label), type: "script", command: `game["${SYSTEM_ID}"].${data.action}()`, img: "icons/svg/book.svg" }).then(macro => game.user.assignHotbarMacro(macro, slot)); return false;
});
