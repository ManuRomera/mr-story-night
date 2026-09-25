import test from "node:test"; import assert from "node:assert/strict";
import { hashSeed, seededRandom, pick } from "../scripts/utils.js";
test("seed hashing is stable",()=>assert.equal(hashSeed("midnight"),hashSeed("midnight")));
test("seeded random is deterministic",()=>{const a=seededRandom("same"),b=seededRandom("same");assert.deepEqual([a(),a(),a()],[b(),b(),b()])});
test("pick always returns a member",()=>{const values=["a","b","c"];assert.ok(values.includes(pick(values,seededRandom("x"))))});
