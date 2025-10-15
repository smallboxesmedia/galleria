const tilesEl = document.getElementById("tiles");
const crumbEl = document.getElementById("breadcrumb");
const folderTitleEl = document.getElementById("folder-title");

const lb = {
  el: document.getElementById("lightbox"),
  media: document.getElementById("lbMedia"),
  btnPrev: document.getElementById("lbPrev"),
  btnNext: document.getElementById("lbNext"),
  btnClose: document.getElementById("lbClose"),
  items: [],
  idx: -1
};

function decodePathFromHash() { const q = new URLSearchParams(location.hash.slice(1)); return q.get("path") || ""; }

function setPath(path) { const q = new URLSearchParams(); if (path) q.set("path", path);
  location.hash = q.toString(); }

function breadcrumb(path) {
  crumbEl.innerHTML = "";
  const parts = path.split("/").filter(Boolean);
  const add = (label, p, isLast) => {
    if (isLast) { const span = document.createElement("span");
      span.textContent = label || "Home";
      crumbEl.appendChild(span); } else { const a = document.createElement("a");
      a.href = "#";
      a.textContent = label || "Home";
      a.onclick = e => { e.preventDefault();
        setPath(p); };
      crumbEl.appendChild(a); }
  };
  add("Home", "", parts.length === 0);
  let acc = "";
  parts.forEach((seg, i) => { crumbEl.insertAdjacentHTML("beforeend", '<span class="sep">/</span>');
    acc += (acc ? "/" : "") + seg;
    add(seg, acc, i === parts.length - 1); });
}

async function fetchFolder(path) {
  const safe = path ? path.replaceAll("..", "") : "";
  const url = "data/" + (safe ? safe + "/" : "") + "index.json";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Missing index: " + url);
  return res.json();
}

function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

function renderTiles(data, path) {
  clear(tilesEl);
  folderTitleEl.textContent = data.title || (path || "Home");

  // Folders
  data.folders.forEach(f => {
    const a = document.createElement("a");
    a.className = "tile folder-tile";
    a.href = "#";
    a.onclick = e => { e.preventDefault();
      setPath((path ? path + "/" : "") + f.name); };
    const img = document.createElement("img");
    img.className = "thumb";
    img.alt = f.name;
    img.loading = "lazy";
    img.src = f.leadThumb;
    a.appendChild(img);
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = f.name;
    a.appendChild(label);
    tilesEl.appendChild(a);
  });

  // Media
  lb.items = [];
  data.media.forEach((m) => {
    const a = document.createElement("a");
    a.className = "tile " + (m.type === "video" ? "video-tile" : "image-tile");
    a.href = "#";

    const img = document.createElement("img");
    img.className = "thumb";
    img.alt = m.name;
    img.loading = "lazy";
    img.src = m.thumb;
    a.appendChild(img);

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = m.name;
    a.appendChild(label);

    // ✅ Push both images and videos into the lightbox playlist
    const idx = lb.items.length;
    lb.items.push({
      type: m.type, // "image" | "video"
      src: m.src,
      name: m.name,
      poster: m.poster || m.thumb
    });

    a.onclick = (e) => { e.preventDefault();
      openLightbox(idx); };

    tilesEl.appendChild(a);
  });

}

// Lightbox
function openLightbox(i) { lb.idx = i;
  lb.el.setAttribute("aria-hidden", "false");
  renderLB(); }

function renderLB() {
  lb.media.innerHTML = "";

  const item = lb.items[lb.idx];

  if (item.type === "video") {
    const v = document.createElement("video");
    v.src = item.src;
    v.controls = true;
    v.playsInline = true;
    if (item.poster) v.poster = item.poster;
    // optional: start paused to avoid surprising users
    // v.autoplay = true; // enable if you prefer auto-play
    v.autoplay = true;
    lb.media.appendChild(v);
  } else {
    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.name || "";
    lb.media.appendChild(img);
  }

  document.body.style.overflow = "hidden";
}

function stopVideoIfAny() {
  const vid = lb.media.querySelector("video");
  if (vid) {
    try { vid.pause(); } catch {}
    // ensure src is released on switch to save memory
    vid.removeAttribute("src");
    vid.load?.();
  }
}

function closeLB(){
  stopVideoIfAny();
  lb.el.setAttribute("aria-hidden","true");
  lb.media.innerHTML = "";
  document.body.style.overflow = "";
}

function prevLB(){
  if (lb.items.length === 0) return;
  stopVideoIfAny();
  lb.idx = (lb.idx - 1 + lb.items.length) % lb.items.length;
  renderLB();
}
function nextLB(){
  if (lb.items.length === 0) return;
  stopVideoIfAny();
  lb.idx = (lb.idx + 1) % lb.items.length;
  renderLB();
}

document.getElementById("lbClose").addEventListener("click", closeLB);
document.getElementById("lbPrev").addEventListener("click", prevLB);
document.getElementById("lbNext").addEventListener("click", nextLB);
document.addEventListener("keydown", (e) => { if (lb.el.getAttribute("aria-hidden") === "true") return; if (e.key === "Escape") closeLB(); if (e.key === "ArrowLeft") prevLB(); if (e.key === "ArrowRight") nextLB(); });

async function render() { const p = decodePathFromHash();
  breadcrumb(p); try { const data = await fetchFolder(p);
    renderTiles(data, p); } catch { tilesEl.innerHTML = '<div style="opacity:.7">Folder not found.</div>'; } }
window.addEventListener("hashchange", render);
render();