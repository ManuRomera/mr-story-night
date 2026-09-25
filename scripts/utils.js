export function hashSeed(value = "story-night") {
  let hash = 2166136261;
  for (const char of String(value)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

export function seededRandom(seed) {
  let state = hashSeed(seed) || 1;
  return () => { state |= 0; state = state + 0x6D2B79F5 | 0; let t = Math.imul(state ^ state >>> 15, 1 | state); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export const pick = (values, random = Math.random) => values[Math.floor(random() * values.length)];
export const uid = () => globalThis.foundry?.utils?.randomID?.() ?? crypto.randomUUID();
export const clone = value => globalThis.foundry?.utils?.deepClone?.(value) ?? structuredClone(value);
export const debounce = (fn, wait = 180) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); }; };
export const escapeHTML = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
export const localize = (key, data) => data ? game.i18n.format(key, data) : game.i18n.localize(key);
