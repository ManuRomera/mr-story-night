import { loadData } from "./data-loader.js";
import { pick, seededRandom, uid } from "./utils.js";
import { DEFAULT_STORY } from "./constants.js";

export class StoryGenerator {
  static async generate(options = {}) {
    const content = await loadData("story-content");
    const seed = options.seed || `${Date.now()}-${Math.random()}`;
    const random = seededRandom(seed);
    const genre = options.genre === "surprise" || !options.genre ? pick(Object.keys(content.genres), random) : options.genre;
    const bank = content.genres[genre] ?? content.genres.contemporary;
    const goal = pick(content.goals, random), target = pick(bank.targets, random), location = pick(bank.locations, random);
    const problem = pick(bank.problems, random), threat = pick(bank.threats, random), title = `${pick(bank.titleA, random)} ${pick(bank.titleB, random)}`;
    const now = Date.now();
    return {
      ...structuredClone(DEFAULT_STORY), id: uid(), title, genre, tone: options.tone?.length ? options.tone.slice(0, 2) : ["adventure"],
      duration: options.duration ?? "90", intensity: options.intensity ?? "normal", seed, state: "characters", createdAt: now, updatedAt: now,
      premise: content.templates.premise.replace("{goal}", goal).replace("{target}", target).replace("{location}", location).replace("{problem}", problem),
      objective: `${goal} ${target}`, threat, complication: pick(bank.complications, random), generationHistory: [{ at: now, seed, genre }]
    };
  }

  static async inspiration(story, type = "complications") {
    const content = await loadData("story-content");
    const bank = content.genres[story.genre] ?? content.genres.contemporary;
    const values = bank[type] ?? content[type] ?? bank.complications;
    const random = seededRandom(`${story.seed}:${type}:${story.history.length}:${story.updatedAt}`);
    return pick(values, random);
  }

  static async makeScene(story) {
    const content = await loadData("story-content");
    const bank = content.genres[story.genre] ?? content.genres.contemporary;
    const index = story.scenes.length;
    const random = seededRandom(`${story.seed}:scene:${index}`);
    return { id: uid(), title: `${game.i18n.localize("MR.Scene.Label")} ${index + 1}`, location: pick(bank.locations, random), participants: [], goal: pick(content.sceneGoals, random), tension: Math.min(5, story.tension), question: pick(content.sceneQuestions, random), threat: story.threat, complications: [pick(bank.complications, random)], notes: "", result: "", state: "prepared", createdAt: Date.now() };
  }
}
