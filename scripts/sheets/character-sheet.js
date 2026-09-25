import { Compat } from "../compat.js";
const BaseSheet = globalThis.ActorSheet ?? class {};
export class CharacterSheet extends BaseSheet {
  static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, { classes: ["mr-app", "mr-character-sheet"], template: "systems/mr-story-night/templates/character-sheet.hbs", width: 720, height: 760, resizable: true, tabs: [] }); }
  async getData(options) { const context = await super.getData(options); context.editable = this.isEditable; return context; }
  activateListeners(html) { super.activateListeners(html); html.find?.("[data-action=spend-token]").on("click", async () => { const tokens = Number(this.actor.system.tokens ?? 0); if (tokens > 0) await this.actor.update({ "system.tokens": tokens - 1 }); }); }
}
