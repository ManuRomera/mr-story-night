export const SYSTEM_ID = "mr-story-night";
export const CHANNEL = `system.${SYSTEM_ID}`;
export const TEMPLATES = "systems/mr-story-night/templates";
export const PARTIALS = ["setup", "characters", "challenge", "epilogue", "credits", "company", "chronicle", "safety", "members", "stones", "guide", "phase-card"].map(name => `${TEMPLATES}/parts/${name}.hbs`);
export const DEFAULT_SAFETY = Object.freeze({ lines: [], veils: [], paused: false, lastSignal: null });
export const FELLOWSHIP_ICON = "systems/mr-story-night/assets/icons/fellowship.svg";
export const CHARACTER_ICON = "icons/svg/mystery-man.svg";
