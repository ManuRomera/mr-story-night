import { readFile, readdir, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const failures = [];
const jsonFiles = ["package.json","system.json","template.json","lang/es.json","lang/en.json","data/story-content.json"];
for (const file of jsonFiles) { try { JSON.parse(await readFile(path.join(root, file), "utf8")); } catch (error) { failures.push(`${file}: ${error.message}`); } }
const en = JSON.parse(await readFile(path.join(root,"lang/en.json"))), es = JSON.parse(await readFile(path.join(root,"lang/es.json")));
for (const key of new Set([...Object.keys(en),...Object.keys(es)])) if (!(key in en) || !(key in es)) failures.push(`i18n mismatch: ${key}`);
async function walk(directory) { const out=[]; for (const entry of await readdir(directory,{withFileTypes:true})) { const full=path.join(directory,entry.name); if(entry.isDirectory()) out.push(...await walk(full)); else out.push(full); } return out; }
for (const file of await walk(path.join(root,"scripts"))) if (file.endsWith(".js") || file.endsWith(".mjs")) { const result=spawnSync(process.execPath,["--check",file],{encoding:"utf8"}); if(result.status) failures.push(`${path.relative(root,file)}: ${result.stderr.trim()}`); }
const manifest = JSON.parse(await readFile(path.join(root,"system.json")));
for (const file of [...manifest.esmodules,...manifest.styles,...manifest.languages.map(x=>x.path)]) try { await access(path.join(root,file)); } catch { failures.push(`missing manifest reference: ${file}`); }
const templates = await walk(path.join(root,"templates"));
for (const file of templates) { const text=await readFile(file,"utf8"); const opens=(text.match(/{{#(if|each|unless)\b/g)||[]).length; const closes=(text.match(/{{\/(if|each|unless)}}/g)||[]).length; if(opens!==closes) failures.push(`${path.relative(root,file)}: unbalanced block helpers (${opens}/${closes})`); }
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`Validated ${jsonFiles.length} JSON files, ${templates.length} templates, i18n parity, scripts, and manifest references.`);
