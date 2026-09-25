import { Compat } from "./compat.js";
import { clone, uid } from "./utils.js";
import { SYSTEM_ID } from "./constants.js";

export class StoryStore {
  static listeners = new Set();
  static story = null;
  static undoStack = [];
  static async init() { this.story = await Compat.getStory(); return this.story; }
  static subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  static emit() { for (const listener of this.listeners) listener(this.story); Hooks.callAll("mrStoryNightStoryChanged", this.story); }
  static async replace(story, { broadcast = true } = {}) {
    if (!Compat.isGM()) throw new Error("MR.Error.GMOnly");
    if (this.story) this.undoStack.push(clone(this.story));
    this.undoStack = this.undoStack.slice(-20);
    this.story = { ...clone(story), updatedAt: Date.now() };
    await Compat.setStory(this.story); this.emit();
    if (broadcast) game.socket?.emit(`system.${SYSTEM_ID}`, { type: "story", story: this.story });
    return this.story;
  }
  static async patch(changes, event) {
    const next = { ...clone(this.story), ...clone(changes), updatedAt: Date.now() };
    if (event) next.history = [...(next.history ?? []), { id: uid(), at: Date.now(), ...event }];
    return this.replace(next);
  }
  static async undo() { const previous = this.undoStack.pop(); if (!previous) return false; this.story = previous; await Compat.setStory(previous); this.emit(); game.socket?.emit(`system.${SYSTEM_ID}`, { type: "story", story: previous }); return true; }
  static receive(story) { this.story = clone(story); this.emit(); }
  static async archiveCurrent() {
    if (!this.story || !Compat.isGM()) return null;
    const archive = clone(game.settings.get(SYSTEM_ID, "storyArchive") ?? []);
    const snapshot = { ...clone(this.story), archivedAt: Date.now() };
    const index = archive.findIndex(entry => entry.id === snapshot.id);
    if (index >= 0) archive[index] = snapshot; else archive.unshift(snapshot);
    await game.settings.set(SYSTEM_ID, "storyArchive", archive.slice(0, 100));
    return snapshot;
  }
}
