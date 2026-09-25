import { StoryGenerator } from "./generator.js";
import { StoryStore } from "./store.js";
import { NewStoryWizard } from "./apps/new-story.js";
import { StoryDashboard } from "./apps/dashboard.js";
import { StoryTools } from "./apps/story-tools.js";
export const api = Object.freeze({
  get story() { return StoryStore.story; },
  openDashboard: () => new StoryDashboard().render(true),
  newStory: () => new NewStoryWizard().render(true),
  openTools: section => new StoryTools({ section }).render(true),
  generate: options => StoryGenerator.generate(options),
  inspiration: type => StoryGenerator.inspiration(StoryStore.story, type),
  updateStory: changes => StoryStore.patch(changes),
  exportStory: () => JSON.stringify({ format: "mr-story-night", version: 1, story: StoryStore.story }, null, 2),
  importStory: async value => {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (parsed?.format !== "mr-story-night" || parsed?.version !== 1 || !parsed?.story?.id) throw new Error("Invalid MR Story Night story pack");
    return StoryStore.replace(parsed.story);
  },
  hooks: { changed: "mrStoryNightStoryChanged" }
});
