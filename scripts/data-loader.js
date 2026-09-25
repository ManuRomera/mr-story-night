const cache = new Map();
export async function loadData(name) {
  if (cache.has(name)) return cache.get(name);
  const response = await fetch(`systems/mr-story-night/data/${name}.json`);
  if (!response.ok) throw new Error(`MR Story Night: cannot load ${name}`);
  const value = await response.json(); cache.set(name, value); return value;
}
export const clearDataCache = () => cache.clear();
