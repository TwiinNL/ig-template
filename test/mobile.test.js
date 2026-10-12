#!/usr/bin/env node
// Checks the layout of the test IG pages at a screen width of 390 px in headless Chromium:
// - the page is not wider than the screen;
// - every top-level table of the page content is in a container that scrolls horizontally;
// - no table column is narrower than the longest word of its header, and no table cell breaks
//   inside a word (overflow-wrap anywhere / break-word, word-break break-all / break-word).
// The page is loaded in an iframe of 390 px, because a headless browser window cannot be made that
// narrow. After a build of test/sample-ig, run from the repo root:
//   node test/mobile.test.js
// The browser is $CHROME, or else the first Chromium-based browser found.
const fs = require("fs");
const http = require("http");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve("test/sample-ig/output");
const WIDTH = 390;
const PAGES = [
  "en/index.html",
  "en/StructureDefinition-sample-patient.html",
  "en/StructureDefinition-sample-long-names.html",
  "en/StructureDefinition-sample-long-names-definitions.html",
  "en/StructureDefinition-sample-patient.profile.history.html",
];
const BROWSERS = [
  process.env.CHROME,
  "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
].filter(Boolean);

// Runs in the parent page; measures the page in the iframe and writes the result as JSON to
// <body data-result>.
const PROBE = `
function probe(doc, win) {
  const words = (s) => (s || "").split(/\\s+/).filter(Boolean);
  const ctx = doc.createElement("canvas").getContext("2d");
  const textWidth = (el, word) => {
    const cs = win.getComputedStyle(el);
    ctx.font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
    return ctx.measureText(word).width;
  };
  const r = { pageWidth: doc.documentElement.scrollWidth, wide: [], unwrapped: [], narrow: [], breaking: [] };
  const content = doc.getElementById("segment-content");
  const W = doc.documentElement.clientWidth;
  for (const el of doc.body.querySelectorAll("*")) {
    const b = el.getBoundingClientRect();
    const inScroll = el.parentElement && el.parentElement.closest(".twiin-table-scroll");
    const textOverflow = el.scrollWidth > el.clientWidth + 1 && b.left + el.scrollWidth > W + 1 && win.getComputedStyle(el).overflowX === "visible";
    if (!inScroll && b.width > 0 && (b.right > W + 1 || textOverflow)) {
      r.wide.push(el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : "") + " " + Math.round(b.right) + " px");
    }
  }
  // Tables in tabs that are not shown (other views of the profile) are measured too.
  if (content) for (const el of content.querySelectorAll("*")) {
    if (win.getComputedStyle(el).display === "none" && el.querySelector("table")) el.style.display = "block";
  }
  const tables = content ? [...content.querySelectorAll("table")] : [];
  for (const t of tables) {
    const label = (t.id || t.className || "table").toString().slice(0, 40);
    if (!t.parentElement.closest("table")) {
      const p = t.parentElement;
      if (!p.classList.contains("twiin-table-scroll") || win.getComputedStyle(p).overflowX !== "auto") r.unwrapped.push(label);
    }
    for (const cell of t.querySelectorAll("th, td")) {
      const cs = win.getComputedStyle(cell);
      if (["anywhere", "break-word"].includes(cs.overflowWrap) || ["break-all", "break-word"].includes(cs.wordBreak)) {
        r.breaking.push(label + ": " + cs.overflowWrap + "/" + cs.wordBreak);
        break;
      }
    }
    for (const th of t.querySelectorAll("th")) {
      const longest = Math.max(0, ...words(th.textContent).map((w) => textWidth(th, w)));
      const width = th.getBoundingClientRect().width;
      if (longest > 0 && width + 1 < longest) r.narrow.push(label + ": '" + th.textContent.trim().slice(0, 30) + "' " + Math.round(width) + " px < " + Math.round(longest) + " px");
    }
  }
  return r;
}
const f = document.getElementById("f");
f.onload = () => setTimeout(() => {
  document.body.setAttribute("data-result", JSON.stringify(probe(f.contentDocument, f.contentWindow)));
}, 1000);
f.src = new URLSearchParams(location.search).get("u");
`;
const HARNESS = `<!DOCTYPE html><html><body style="margin:0"><iframe id="f" style="width:${WIDTH}px;height:900px;border:0"></iframe><script>${PROBE}</script></body></html>`;

function findBrowser() {
  for (const b of BROWSERS) {
    if (b.includes("/") ? fs.existsSync(b) : (() => { try { execFileSync("which", [b], { stdio: "ignore" }); return true; } catch { return false; } })()) return b;
  }
  console.log("::error::no Chromium-based browser found; set CHROME");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/__harness.html") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(HARNESS); }
  const file = path.join(ROOT, url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
  res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

server.listen(0, "127.0.0.1", async () => {
  const browser = findBrowser();
  const port = server.address().port;
  let failed = false;
  const check = (ok, msg) => { console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) { console.log(`::error::${msg}`); failed = true; } };
  for (const page of PAGES) {
    const args = ["--headless=new", "--disable-gpu", "--no-sandbox", "--window-size=600,900", "--virtual-time-budget=10000", "--dump-dom",
      `http://127.0.0.1:${port}/__harness.html?u=/${page}`];
    const dom = await new Promise((resolve) => {
      require("child_process").execFile(browser, args, { maxBuffer: 1 << 26 }, (err, stdout) => resolve(stdout || ""));
    });
    const m = dom.match(/data-result="([^"]*)"/);
    if (!m) { check(false, `${page}: no result from the browser`); continue; }
    const r = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
    check(r.pageWidth <= WIDTH, `${page}: page width ${r.pageWidth} px at a screen of ${WIDTH} px${r.wide.length ? " (wider: " + r.wide.slice(-8).join(", ") + ")" : ""}`);
    check(r.unwrapped.length === 0, `${page}: every content table scrolls in its own container${r.unwrapped.length ? " (not: " + r.unwrapped.join(", ") + ")" : ""}`);
    check(r.breaking.length === 0, `${page}: no word breaking in tables${r.breaking.length ? " (" + r.breaking.join("; ") + ")" : ""}`);
    check(r.narrow.length === 0, `${page}: no column narrower than its header${r.narrow.length ? " (" + r.narrow.slice(0, 5).join("; ") + ")" : ""}`);
  }
  server.close();
  process.exit(failed ? 1 : 0);
});
