#!/usr/bin/env node
import fse from "fs-extra";
import path from "path";

const [,, publicDirArg] = process.argv;
const publicDir = path.resolve(process.cwd(), publicDirArg || "./public");
const mediaRoot = path.join(publicDir, "media");
const thumbsRoot= path.join(publicDir, "thumbs");
const dataRoot  = path.join(publicDir, "data");
const expectedPath = path.join(publicDir, ".expected.json");

function relFrom(root,p){ return path.relative(root,p).split(path.sep).join("/"); }

async function collectFiles(dir){
  if (!await fse.pathExists(dir)) return [];
  const out=[], stack=[dir];
  while (stack.length){
	const d=stack.pop();
	const entries = await fse.readdir(d, { withFileTypes:true });
	for (const e of entries){
	  if (e.name.startsWith(".")) continue;
	  const full = path.join(d,e.name);
	  if (e.isDirectory()) stack.push(full); else out.push(full);
	}
  }
  return out;
}

(async function main(){
  if (!await fse.pathExists(expectedPath)){
	console.warn("No .expected.json found. Run generate_index.js first.");
	process.exit(0);
  }
  const expected = JSON.parse(await fse.readFile(expectedPath,"utf-8"));
  const expectedMedia = new Set(expected.media.map(s=>s.toLowerCase()));
  const expectedFolders = new Set(expected.folders);

  // prune originals (public/media)
  for (const f of await collectFiles(mediaRoot)){
	const rel = relFrom(mediaRoot, f).toLowerCase();
	if (!expectedMedia.has(rel)){ await fse.remove(f); console.log("REMOVE media   ", rel); }
  }

  // prune thumbs (by stem match)
  const stemSet = new Set(expected.media.map(m=>{
	const d = path.dirname(m);
	const n = path.basename(m, path.extname(m));
	return (d==="."? n : d+"/"+n).toLowerCase();
  }));
  for (const f of await collectFiles(thumbsRoot)){
	const rel = relFrom(thumbsRoot, f);
	const d = path.dirname(rel);
	const n = path.basename(rel, path.extname(rel));
	const stem = (d==="."? n : d+"/"+n).toLowerCase();
	if (!stemSet.has(stem)){ await fse.remove(f); console.log("REMOVE thumb   ", rel); }
  }

  // prune data
  for (const f of await collectFiles(dataRoot)){
	const rel = relFrom(dataRoot, f);
	if (path.basename(rel).toLowerCase() !== "index.json"){
	  await fse.remove(f); console.log("REMOVE datafile", rel); continue;
	}
	const folderRel = path.dirname(rel);
	const norm = (folderRel === "." ? "" : folderRel);
	if (!expectedFolders.has(norm)){
	  await fse.remove(f); console.log("REMOVE index   ", rel);
	}
  }

  // clean empty dirs
  async function pruneEmpty(root){
	if (!await fse.pathExists(root)) return;
	const stack=[root], dirs=[];
	while (stack.length){
	  const d=stack.pop();
	  const entries = await fse.readdir(d, { withFileTypes:true });
	  for (const e of entries){
		const full=path.join(d,e.name);
		if (e.isDirectory()) stack.push(full);
	  }
	  dirs.push(d);
	}
	dirs.sort((a,b)=> b.length-a.length);
	for (const d of dirs){
	  if (d===root) continue;
	  if ((await fse.readdir(d)).length===0){
		await fse.remove(d);
		const which = root===mediaRoot? "media" : root===thumbsRoot? "thumbs" : "data";
		console.log("RMDIR", which, relFrom(root,d)||"/");
	  }
	}
  }
  await pruneEmpty(mediaRoot);
  await pruneEmpty(thumbsRoot);
  await pruneEmpty(dataRoot);

  console.log("Prune complete.");
})().catch(err=>{ console.error(err); process.exit(1); });
