export const Compat = {
  get generation() { return Number(game?.release?.generation ?? game?.version?.split?.(".")[0] ?? 13); },
  get ApplicationBase() { return foundry?.applications?.api?.ApplicationV2 ?? globalThis.Application; },
  async renderTemplate(path, data) { return foundry?.applications?.handlebars?.renderTemplate ? foundry.applications.handlebars.renderTemplate(path, data) : globalThis.renderTemplate(path, data); },
  async confirm({ title, content }) {
    if (foundry?.applications?.api?.DialogV2) return foundry.applications.api.DialogV2.confirm({ window: { title }, content, modal: true });
    return Dialog.confirm({ title, content });
  },
  notify(type, message) { ui.notifications?.[type]?.(message); },
  registerSheet(documentClass, scope, sheetClass, options) {
    const config = foundry?.documents?.collections?.Actors ? foundry.documents : globalThis;
    const registry = documentClass === "Actor" ? config.Actors ?? globalThis.Actors : config.Items ?? globalThis.Items;
    registry?.registerSheet?.(scope, sheetClass, options);
  },
  isGM() { return Boolean(game.user?.isGM); },
  async getStory() { return game.settings.get("mr-story-night", "activeStory") ?? null; },
  async setStory(story) { return game.settings.set("mr-story-night", "activeStory", story); }
};
