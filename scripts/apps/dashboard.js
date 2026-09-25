import { BaseApp, attachActions } from "./base-app.js";
import { Compat } from "../compat.js";
import { StoryStore } from "../store.js";
import { StoryGenerator } from "../generator.js";
import { localize, escapeHTML } from "../utils.js";
import { NewStoryWizard } from "./new-story.js";

export class StoryDashboard extends BaseApp {
  static DEFAULT_OPTIONS = { id: "mr-story-dashboard", tag: "section", window: { title: "MR · Story Night", resizable: true }, position: { width: 1180, height: 760 }, classes: ["mr-app", "mr-dashboard"] };
  constructor(options = {}) { super(options); this._unsubscribe = StoryStore.subscribe(() => this.render()); }
  async close(options) { this._unsubscribe?.(); return super.close(options); }
  async _prepareContext() { return { story: StoryStore.story, isGM: Compat.isGM(), characters: game.actors?.filter(actor => actor.type === "character") ?? [] }; }
  async _renderHTML(context) { return Compat.renderTemplate("systems/mr-story-night/templates/dashboard.hbs", context); }
  _replaceHTML(result, content) { content.replaceChildren(result instanceof HTMLElement ? result : Object.assign(document.createElement("div"), { innerHTML: result })); attachActions(content, this); }
  activateListeners(html) { super.activateListeners?.(html); attachActions(html[0] ?? html, this); }
  async _onAction(event, action) {
    event.preventDefault();
    if (action === "new-story") return new NewStoryWizard().render(true);
    if (!StoryStore.story) return Compat.notify("warn", localize("MR.Error.NoStory"));
    if (action === "new-character") return Actor.create({ name: localize("MR.Character.New"), type: "character" }, { renderSheet: true });
    if (action === "new-scene") { const scene = await StoryGenerator.makeScene(StoryStore.story); return StoryStore.patch({ scenes: [...StoryStore.story.scenes, scene], currentScene: scene.id, state: "scene" }, { type: "scene-created", label: scene.title }); }
    if (action === "complicate") return StoryStore.patch({ complication: await StoryGenerator.inspiration(StoryStore.story), tension: Math.min(5, StoryStore.story.tension + 1) }, { type: "complication", label: localize("MR.Action.Complicate") });
    if (action === "focus") return StoryStore.patch({ complication: await StoryGenerator.inspiration(StoryStore.story, "focus") }, { type: "focus", label: localize("MR.Action.Focus") });
    if (action === "tension") return StoryStore.patch({ tension: Math.min(5, StoryStore.story.tension + 1) }, { type: "tension", label: localize("MR.Action.Tension") });
    if (action === "inspiration") { const value = await StoryGenerator.inspiration(StoryStore.story); return ChatMessage.create({ content: `<article class="mr-chat-card"><h3>${escapeHTML(localize("MR.Action.Inspiration"))}</h3><p>${escapeHTML(value)}</p></article>` }); }
    if (action === "undo") return StoryStore.undo();
    if (action === "end") return this._endStory();
    if (action === "settings") return game.settings.sheet.render(true);
  }
  async _endStory() {
    if (!await Compat.confirm({ title: localize("MR.End.Title"), content: `<p>${escapeHTML(localize("MR.End.Confirm"))}</p>` })) return;
    await StoryStore.patch({ state: "complete" }, { type: "end", label: localize("MR.End.Title") });
  }
}
