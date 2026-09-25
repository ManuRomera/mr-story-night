export const SYSTEM_ID = "mr-story-night";
export const CHANNEL = `system.${SYSTEM_ID}`;
export const TEMPLATES = "systems/mr-story-night/templates";
export const PARTIALS = ["lobby", "setup", "characters", "challenge", "epilogue", "credits", "company", "chronicle", "quests", "safety", "archive"].map(name => `${TEMPLATES}/parts/${name}.hbs`);
export const DEFAULT_SAFETY = Object.freeze({ lines: [], veils: [], paused: false, lastSignal: null });
