import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GENRES, KINDS, generate, generateCharacter, generateScene, pool, variety, genreOf } from "../scripts/generators.js";

for (const lang of ["es", "en"]) {
  const tables = JSON.parse(readFileSync(new URL(`../data/tables-${lang}.json`, import.meta.url)));
  const quests = JSON.parse(readFileSync(new URL(`../data/quests-${lang}.json`, import.meta.url)));

  test(`[${lang}] cada género tiene tablas amplias`, () => {
    assert.deepEqual(Object.keys(tables.genres).sort(), [...GENRES].sort());
    for (const [g, t] of Object.entries(tables.genres)) {
      for (const key of ["names", "concepts", "desires", "wants", "details", "places", "situations", "challenges", "whys", "consequences", "epilogues"]) assert.ok(t[key]?.length >= 3, `${g}.${key}`);
      assert.ok(t.names.length >= 20 && t.concepts.length >= 12 && t.places.length >= 12, g);
    }
  });

  test(`[${lang}] cada misión tiene género, contenido completo y genera de todo`, () => {
    assert.ok(quests.length >= 24);
    for (const q of quests) {
      assert.ok(genreOf(q), q.id);
      for (const key of ["questions", "difficulties", "concepts", "desires", "challenges"]) assert.ok(q[key].length >= 5, `${q.id}.${key}`);
      for (const kind of KINDS) {
        const value = generate(tables, q, kind, Math.random, { target: "Ada", names: ["A", "B", "C"] });
        assert.ok(value && (typeof value === "string" || value.title), `${q.id}/${kind}`);
      }
      const c = generateCharacter(tables, q, Math.random, { target: "Ada" });
      assert.ok(c.want.includes("Ada") || q.wants?.includes(c.want), `${q.id} want`);
      assert.ok(variety(tables, q) > 100000, `${q.id} variety`);
      assert.ok(generateScene(tables, q, Math.random, { names: ["A", "B"] }).where);
    }
  });

  test(`[${lang}] hay variedad de terror: miedo, cósmico, gótico y folk`, () => {
    const genres = quests.map(genreOf);
    for (const g of ["horror", "cosmic", "gothic", "folk"]) assert.ok(genres.includes(g), g);
  });
}

test("los generadores evitan repetir lo ya usado", () => {
  const tables = JSON.parse(readFileSync(new URL("../data/tables-es.json", import.meta.url)));
  const q = { genre: "gothic" };
  const all = pool(tables, q, "place");
  const avoid = all.slice(1);
  assert.equal(generate(tables, q, "place", Math.random, { avoid }), all[0]);
});
