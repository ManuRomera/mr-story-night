import test from "node:test"; import assert from "node:assert/strict"; import { readFile } from "node:fs/promises";
const content=JSON.parse(await readFile(new URL("../data/story-content.json",import.meta.url)));
test("all sixteen genres have complete generation banks",()=>{assert.equal(Object.keys(content.genres).length,16);for(const [name,bank] of Object.entries(content.genres)){for(const key of ["targets","locations","problems","threats","complications","titleA","titleB"])assert.ok(bank[key]?.length>=4,`${name}.${key}`)}});
test("premise space exceeds hundreds per genre",()=>{for(const bank of Object.values(content.genres))assert.ok(content.goals.length*bank.targets.length*bank.locations.length*bank.problems.length>=800)});
test("scene engine has broad prompts",()=>{assert.ok(content.sceneGoals.length>=12);assert.ok(content.sceneQuestions.length>=12);assert.ok(content.focus.length>=8)});
