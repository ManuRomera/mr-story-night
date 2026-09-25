export const SYSTEM_ID = "mr-story-night";
export const STORY_FLAG = "story";
export const THEMES = ["neutral","noir","horror","cosmic","fantasy","dark-fantasy","sci-fi","cyberpunk","post-apocalyptic","western","1920s","contemporary","pulp","mystery","gothic","space-survival"];
export const GENRES = ["heist","noir","mystery","horror","cosmic","sci-fi","space-survival","cyberpunk","fantasy","dark-fantasy","western","post-apocalyptic","pulp","crime","supernatural","contemporary"];
export const DEFAULT_STORY = Object.freeze({
  id: "", title: "", genre: "neutral", tone: ["adventure"], duration: "90", intensity: "normal",
  seed: "", state: "setup", act: 0, tension: 1, premise: "", objective: "", threat: "",
  complication: "", currentScene: null, scenes: [], relationships: [], history: [], generationHistory: [], createdAt: 0, updatedAt: 0
});
