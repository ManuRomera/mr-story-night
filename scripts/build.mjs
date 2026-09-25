import { mkdir, rm, cp, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
const root=path.resolve(import.meta.dirname,".."), out=path.join(root,"outputs"), stage=path.join(root,"work","release","mr-story-night");
await rm(path.dirname(stage),{recursive:true,force:true}); await mkdir(stage,{recursive:true}); await mkdir(out,{recursive:true});
const entries=["system.json","README.md","LICENSE","CHANGELOG.md","scripts","styles","templates","lang","data","assets"];
for(const entry of entries) await cp(path.join(root,entry),path.join(stage,entry),{recursive:true});
const zip=path.join(out,"mr-story-night.zip"); await rm(zip,{force:true});
const result=spawnSync("zip",["-qr",zip,"mr-story-night"],{cwd:path.dirname(stage),encoding:"utf8"}); if(result.status){console.error(result.stderr);process.exit(result.status)}
const manifest=JSON.parse(await readFile(path.join(root,"system.json"),"utf8")); await writeFile(path.join(out,"system.json"),JSON.stringify(manifest,null,2)+"\n");
console.log(zip);
