/**
 * Generadores de inspiración. Puros: reciben las tablas (data/tables-*.json),
 * la misión y una función de azar. Combinan listas de la misión, del género y comunes.
 */

export const GENRES = ["fantasy", "scifi", "horror", "cosmic", "gothic", "folk", "noir", "western", "heist", "postapoc"];
const THEME_TO_GENRE = { "sci-fi": "scifi", cyberpunk: "scifi", neutral: "fantasy" };

export const KINDS = ["name", "concept", "desire", "want", "detail", "pronouns", "challenge", "why", "place", "situation", "consequence", "epilogue", "who", "difficulty"];

export function genreOf(quest) {
  const g = quest?.genre || THEME_TO_GENRE[quest?.theme] || quest?.theme;
  return GENRES.includes(g) ? g : null;
}

const pick = (list, rng) => list.length ? list[Math.floor(rng() * list.length) % list.length] : "";
const uniq = list => [...new Set(list.filter(Boolean))];

/** Devuelve la lista de opciones de un tipo, en orden de prioridad: misión, género, común. */
export function pool(tables, quest, kind) {
  const g = genreOf(quest);
  const genre = g ? tables.genres[g] : null;
  const allGenres = Object.values(tables.genres);
  const fromGenre = key => genre ? (genre[key] ?? []) : allGenres.flatMap(x => x[key] ?? []);
  switch (kind) {
    case "concept": return uniq([...(quest?.concepts ?? []), ...fromGenre("concepts")]);
    case "desire": return uniq([...(quest?.desires ?? []), ...fromGenre("desires")]);
    case "want": return uniq([...(quest?.wants ?? []), ...fromGenre("wants"), ...tables.common.wants]);
    case "detail": return uniq([...fromGenre("details"), ...tables.common.details]);
    case "pronouns": return tables.common.pronouns;
    case "challenge": return [...(quest?.challenges ?? []), ...fromGenre("challenges")];
    case "why": return uniq([...fromGenre("whys"), ...(quest?.difficulties ?? [])]);
    case "difficulty": return uniq([...(quest?.difficulties ?? []), ...fromGenre("whys")]);
    case "place": return uniq(fromGenre("places"));
    case "situation": return uniq([...fromGenre("situations"), ...tables.common.situations]);
    case "consequence": return uniq([...fromGenre("consequences"), ...tables.common.consequences]);
    case "epilogue": return uniq([...fromGenre("epilogues"), ...tables.common.epilogues]);
    case "name": return uniq(fromGenre("names"));
    default: return [];
  }
}

/**
 * Genera un valor.
 * opts.target: nombre del personaje de la izquierda (para deseos);
 * opts.names: nombres disponibles (para «¿quién está?»);
 * opts.avoid: valores ya usados que conviene no repetir.
 */
export function generate(tables, quest, kind, rng = Math.random, opts = {}) {
  const avoid = new Set(opts.avoid ?? []);
  const fresh = list => { const rest = list.filter(x => !avoid.has(typeof x === "string" ? x : x.title)); return rest.length ? rest : list; };
  if (kind === "name") {
    const g = genreOf(quest);
    const genre = g ? tables.genres[g] : pick(Object.values(tables.genres), rng);
    const first = pick(fresh(genre.names ?? []), rng);
    const surnames = genre.surnames ?? [];
    return surnames.length && rng() < 0.55 ? `${first} ${pick(surnames, rng)}` : first;
  }
  if (kind === "want") {
    const template = pick(fresh(pool(tables, quest, "want")), rng);
    return template.replaceAll("{name}", opts.target || "…");
  }
  if (kind === "who") {
    const names = [...(opts.names ?? [])];
    if (!names.length) return "";
    const count = Math.min(names.length, 2 + (rng() < 0.4 ? 1 : 0));
    const chosen = [];
    while (chosen.length < count) { const n = names.splice(Math.floor(rng() * names.length), 1)[0]; chosen.push(n); }
    return opts.join ? opts.join(chosen) : chosen.join(", ");
  }
  const value = pick(fresh(pool(tables, quest, kind)), rng);
  return value;
}

/** Un personaje completo para inspirar: protagonista (con deseo hacia la izquierda) o secundario. */
export function generateCharacter(tables, quest, rng = Math.random, { role = "main", target = "" } = {}) {
  const base = { name: generate(tables, quest, "name", rng), concept: generate(tables, quest, "concept", rng), detail: generate(tables, quest, "detail", rng) };
  if (role !== "main") return base;
  return { ...base, desire: generate(tables, quest, "desire", rng), want: generate(tables, quest, "want", rng, { target }) };
}

/** Una escena completa: dónde, quién y qué pasa. */
export function generateScene(tables, quest, rng = Math.random, { names = [], join } = {}) {
  return { where: generate(tables, quest, "place", rng), who: generate(tables, quest, "who", rng, { names, join }), situation: generate(tables, quest, "situation", rng) };
}

/** Cuántas combinaciones distintas puede dar un personaje de este género (para mostrarlo). */
export function variety(tables, quest) {
  const n = k => Math.max(1, pool(tables, quest, k).length);
  const g = genreOf(quest);
  const names = g ? (tables.genres[g].names.length * (1 + (tables.genres[g].surnames?.length ?? 0))) : 1;
  return names * n("concept") * n("desire") * n("want") * n("detail");
}
