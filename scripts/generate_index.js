#!/usr/bin/env node
import fse from "fs-extra";
import path from "path";

const [,, inputDirArg, publicDirArg] = process.argv;
const inputDir  = path.resolve(process.cwd(), inputDirArg  || "./public/media");
const publicDir = path.resolve(process.cwd(), publicDirArg || "./public");
const dataRoot  = path.join(publicDir, "data");
const thumbsRoot= path.join(publicDir, "thumbs");

const IMG_EXT = new Set([".jpg",".jpeg",".JPG",".JPEG"]);
const VID_EXT = new Set([".mp4",".MP4"]);

const ensure = async (p)=> fse.mkdirp(p);
function rel(p){ return path.relative(inputDir, p).split(path.sep).join("/"); }
function toThumbUrl(relPath){
  const dir = path.dirname(relPath);
  const base = path.basename(relPath, path.extname(relPath)) + ".jpg";
  return ["/thumbs", dir, base].filter(Boolean).join("/").replace(/\\/g,"/");
}
function toMediaUrl(relPath){ return ["/media", relPath].join("/").replace(/\\/g,"/"); }

async function walkDir(dir){
  if (!await fse.pathExists(dir)) return { dirs:[], files:[] };
  const entries = await fse.readdir(dir, { withFileTypes:true });
  const dirs=[], files=[];
  for (const e of entries){
	if (e.name.startsWith(".")) continue;
	const full = path.join(dir, e.name);
	if (e.isDirectory()) dirs.push(full);
	else files.push(full);
  }
  dirs.sort((a,b)=> a.localeCompare(b));
  files.sort((a,b)=> a.localeCompare(b));
  return { dirs, files };
}

const expected = { folders:new Set(), media:new Set() };

async function buildFolder(absPath){
  const { dirs, files } = await walkDir(absPath);
  const relPath = rel(absPath);
  const outDir = path.join(dataRoot, relPath);
  await ensure(outDir);

  const foldersOut = [];
  const mediaOut   = [];

  for (const f of files){
	const ext = path.extname(f);
	if (!IMG_EXT.has(ext) && !VID_EXT.has(ext)) continue;
	const r = rel(f);
	const item = {
	  name: path.basename(f),
	  type: IMG_EXT.has(ext) ? "image" : "video",
	  src:  toMediaUrl(r),
	  thumb: toThumbUrl(r)
	};
	if (item.type === "video") item.poster = item.thumb;
	mediaOut.push(item);
	expected.media.add(r);
  }

  for (const d of dirs){
	await buildFolder(d);
	const childRel = rel(d);
	const childIndexPath = path.join(dataRoot, childRel, "index.json");
	const childIdx = JSON.parse(await fse.readFile(childIndexPath,"utf-8"));
	let leadThumb = null;
	if (childIdx.media?.length) leadThumb = childIdx.media[0].thumb;
	else if (childIdx.folders?.length) leadThumb = childIdx.folders[0].leadThumb;

	foldersOut.push({ name: path.basename(d), path: childRel, leadThumb });
  }

  expected.folders.add(relPath);
  const index = { title: relPath || "Home", path: relPath, folders: foldersOut, media: mediaOut };
  await fse.writeFile(path.join(outDir,"index.json"), JSON.stringify(index));
}

(async function main(){
  await ensure(dataRoot);
  await ensure(thumbsRoot);
  await buildFolder(inputDir);
  await fse.writeFile(path.join(publicDir,".expected.json"),
	JSON.stringify({ folders:[...expected.folders], media:[...expected.media] })
  );
  console.log("Indexes complete.");
})().catch(err=>{ console.error(err); process.exit(1); });
