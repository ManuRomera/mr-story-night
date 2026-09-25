import { BaseApp, attachActions } from "./base-app.js";
import { Compat } from "../compat.js";
import { GENRES } from "../constants.js";
import { StoryGenerator } from "../generator.js";
import { StoryStore } from "../store.js";

export class NewStoryWizard extends BaseApp {
  static DEFAULT_OPTIONS = { id: "mr-new-story", tag: "form", window: { title: "MR.NewStory.Title", modal: true, resizable: true }, position: { width: 920, height: 700 }, classes: ["mr-app", "mr-wizard"], form: { closeOnSubmit: false } };
  step = 1; values = { genre: "surprise", tone: ["adventure"], duration: "90", intensity: "normal", seed: "" };
  async _prepareContext() { return { step: this.step, values: this.values, genres: ["surprise", ...GENRES] }; }
  async _renderHTML(context) { return Compat.renderTemplate("systems/mr-story-night/templates/new-story.hbs", context); }
  _replaceHTML(result, content) { const wrapper = document.createElement("div"); wrapper.innerHTML = result; content.replaceChildren(...wrapper.childNodes); attachActions(content, this); this._bind(content); }
  activateListeners(html) { super.activateListeners?.(html); const root = html[0] ?? html; attachActions(root, this); this._bind(root); }
  _bind(root) { root.querySelectorAll("[data-value]").forEach(el => el.addEventListener("click", () => this._select(el))); root.querySelector("input[name=seed]")?.addEventListener("input", e => this.values.seed = e.target.value); }
  _select(element) { const { field, value } = element.dataset; if (field === "tone") { const tones = new Set(this.values.tone); tones.has(value) ? tones.delete(value) : tones.size < 2 && tones.add(value); this.values.tone = [...tones]; } else this.values[field] = value; this.render(); }
  async _onAction(event, action) { event.preventDefault(); if (action === "back") { this.step = Math.max(1, this.step - 1); return this.render(); } if (action === "next") { this.step = Math.min(5, this.step + 1); return this.render(); } if (action === "create") { const story = await StoryGenerator.generate(this.values); await StoryStore.replace(story); Compat.notify("info", game.i18n.format("MR.NewStory.Created", { title: story.title })); await this.close(); new (await import("./dashboard.js")).StoryDashboard().render(true); } }
}
