#!/usr/bin/env node
import fse from "fs-extra";
import path from "path";
import sharp from "sharp";
import { spawn } from "child_process";

const [,, inputDirArg, thumbsDirArg] = process.argv;

const inputDir  = path.resolve(process.cwd(), inputDirArg  || "./public/media");
const thumbsDir = path.resolve(process.cwd(), thumbsDirArg || "./public/thumbs");
const publicDir = path.resolve(process.cwd(), "./public");
const manifestPath = path.join(publicDir, ".gallery-manifest.json");

const IMG_EXT = new Set([".jpg",".jpeg",".JPG",".JPEG"]);
const VID_EXT = new Set([".mp4",".MP4"]);

const ensure = async (p)=> fse.mkdirp(p);

const walk = async (dir) => {
  if (!await fse.pathExists(dir)) return [];
  const entries = await fse.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
	const full = path.join(dir, e.name);
	if (e.isDirectory()) files.push(...await walk(full));
	else files.push(full);
  }
  return files;
};

function rel(p){ return path.relative(inputDir, p).split(path.sep).join("/"); }
function outThumbPath(relPath) {
  const dir = path.dirname(relPath);
  const base = path.basename(relPath, path.extname(relPath)) + ".jpg";
  return path.join(thumbsDir, dir, base);
}
function fileSig(stat){ return `${stat.size}-${Math.floor(stat.mtimeMs)}`; }

async function loadManifest(){
  try{ return JSON.parse(await fse.readFile(manifestPath, "utf-8")); }
  catch{ return { files: {} }; }
}
async function saveManifest(m){ await fse.writeFile(manifestPath, JSON.stringify(m, null, 2)); }

async function processImage(absPath, relPath, manifest){
  const stat = await fse.stat(absPath);
  const sig = fileSig(stat);
  const key = `img:${relPath}`;
  const outPath = outThumbPath(relPath);
  if (manifest.files[key] === sig && await fse.pathExists(outPath)) return;
  await ensure(path.dirname(outPath));
  await sharp(absPath).resize({ height: 200, withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(outPath);
  manifest.files[key] = sig;
  console.log("IMG  ->", relPath);
}

async function processVideo(absPath, relPath, manifest){
  const stat = await fse.stat(absPath);
  const sig = fileSig(stat);
  const key = `vid:${relPath}`;
  const outPoster = outThumbPath(relPath);
  if (manifest.files[key] === sig && await fse.pathExists(outPoster)) return;

  await ensure(path.dirname(outPoster));

  // 1) Extract a frame at 1s using system ffmpeg (200px height)
  await new Promise((resolve, reject)=>{
    const args = [
      "-y","-hide_banner","-loglevel","error",
      "-ss","1",
      "-i", absPath,
      "-frames:v","1",
      "-vf","scale=-2:200",
      outPoster
    ];
    const p = spawn("ffmpeg", args);
    let stderr = "";
    p.stderr.on("data", d => { stderr += d.toString(); });
    p.on("error", reject);
    p.on("close", (code)=> code === 0 ? resolve() : reject(new Error("ffmpeg failed: " + stderr.trim())));
  });

  // 2) Overlay a centered play icon — write to a temp file, then replace
  const PLAY_SVG = Buffer.from(`
    <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="24" fill="black" fill-opacity="0.35" />
          <circle cx="24" cy="24" r="23" stroke="white" stroke-opacity="0.6" stroke-width="2" fill="none" />
          <polygon points="16,12 16,36 36,24" fill="white" fill-opacity="0.9"/>
     </svg>
  `.trim());

  const tmpPoster = outPoster + ".tmp.jpg";
  await sharp(outPoster)
    .composite([{ input: PLAY_SVG, gravity: "centre" }])
    .jpeg({ quality: 80 })
    .toFile(tmpPoster);

  await fse.move(tmpPoster, outPoster, { overwrite: true });

  manifest.files[key] = sig;
  console.log("MP4 ->", relPath);
}

(async function main(){
  console.log("Thumbs: scanning", inputDir);
  await ensure(thumbsDir);
  const manifest = await loadManifest();

  const all = await walk(inputDir);
  const supported = all.filter(p => {
	const ext = path.extname(p);
	return IMG_EXT.has(ext) || VID_EXT.has(ext);
  });
  supported.sort((a,b)=> a.localeCompare(b));

  console.log(`Found ${supported.length} supported files`);
  if (supported.length === 0) {
	console.log("No .jpg/.jpeg/.mp4 found under:", inputDir);
  }

  let imgCount=0, vidCount=0;
  for (const abs of supported){
	const relPath = rel(abs);
	const ext = path.extname(abs);
	if (IMG_EXT.has(ext)) { await processImage(abs, relPath, manifest); imgCount++; }
	else if (VID_EXT.has(ext)) { await processVideo(abs, relPath, manifest); vidCount++; }
  }
  await saveManifest(manifest);
  console.log(`Thumbnails complete. (images: ${imgCount}, videos: ${vidCount})`);
})().catch(err=>{ console.error(err); process.exit(1); });
