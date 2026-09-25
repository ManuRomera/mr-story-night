import { SYSTEM_ID } from "./constants.js";
import { lines, uid } from "./utils.js";

let builtin = [];

/** Carga las misiones de ejemplo incluidas en el sistema (según el idioma). */
export async function loadBuiltinQuests() {
  const lang = game.i18n.lang === "es" ? "es" : "en";
  try {
    const response = await fetch(`systems/${SYSTEM_ID}/data/quests-${lang}.json`);
    builtin = (await response.json()).map(q => ({ ...q, builtin: true }));
  } catch (error) { console.error("MR · Story Night | No se pudieron cargar las misiones", error); builtin = []; }
  return builtin;
}

export const allQuests = () => [...builtin, ...(game.settings.get(SYSTEM_ID, "quests") ?? [])];
export const findQuest = id => allQuests().find(q => q.id === id) ?? null;

export function questFromForm(form, id) {
  const data = Object.fromEntries(new FormData(form).entries());
  return {
    id: id || uid(), title: String(data.title ?? "").trim(), tagline: data.tagline ?? "", intro: data.intro ?? "", goal: data.goal ?? "", theme: data.theme || "neutral",
    questions: lines(data.questions), difficulties: lines(data.difficulties), concepts: lines(data.concepts), desires: lines(data.desires),
    challenges: lines(data.challenges).map(line => { const [title, ...rest] = line.split(/\s+[—–-]\s+/); return { title: title.trim(), text: rest.join(" — ").trim() }; })
  };
}

export function normalizeQuest(data) {
  const q = data?.format === "mr-story-night-quest" ? data.quest : data;
  if (!q || typeof q !== "object" || !String(q.title ?? "").trim()) return null;
  const list = v => (Array.isArray(v) ? v : []).map(x => typeof x === "string" ? x.trim() : x).filter(Boolean);
  return {
    id: uid(), title: String(q.title).trim(), tagline: String(q.tagline ?? ""), intro: String(q.intro ?? ""), goal: String(q.goal ?? ""), theme: String(q.theme ?? "neutral"),
    questions: list(q.questions), difficulties: list(q.difficulties), concepts: list(q.concepts), desires: list(q.desires),
    challenges: list(q.challenges).map(c => typeof c === "string" ? { title: c, text: "" } : { title: String(c.title ?? "").trim(), text: String(c.text ?? "") }).filter(c => c.title)
  };
}

export async function saveCustomQuests(list) { await game.settings.set(SYSTEM_ID, "quests", list); }
export const customQuests = () => [...(game.settings.get(SYSTEM_ID, "quests") ?? [])];
