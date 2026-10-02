// The charts and the picture of docs/LEVELS.md, drawn from the built package (`pnpm build` first): `node scripts/levels-charts.mjs`.
//   docs/score-by-level.svg     the score of every level of the four sizes, 1.0.0 against now
//   docs/tall-score-by-level.svg the score of every level of the six tall sizes
//   docs/easy-before-after.jpg  the easy third of Small, drawn: seven levels of 1.0.0 and seven of now
// Plain SVG with its colours as custom properties, light and dark; nothing in it is typed by hand.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { buildMaze, parseRecipe } from "../dist/index.js";
import { drawMaze } from "../dist/draw-entry.js";
import { MEIKYUU_MAZE_LEVELS, MEIKYUU_SIZES, mazeLevelsOfSize } from "../dist/levels.js";
import { MEIKYUU_LEGACY_MAZE_LEVELS } from "../dist/levels-legacy.js";
import { MEIKYUU_TALL_LEVELS, MEIKYUU_TALL_SIZES, tallLevelsOfSize } from "../dist/levels-tall.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docs = join(root, "docs");

const STYLE = `
.viz { color-scheme: light; --surface: #fcfcfb; --ink: #0b0b0b; --muted: #52514e; --grid: rgba(11,11,11,.10); --before: #8a8984; --now: #2a78d6; font: 12px system-ui, -apple-system, "Segoe UI", sans-serif; }
@media (prefers-color-scheme: dark) { .viz { color-scheme: dark; --surface: #1a1a19; --ink: #ffffff; --muted: #c3c2b7; --grid: rgba(255,255,255,.12); --before: #9a9992; --now: #3987e5; } }
.surface { fill: var(--surface); } .t { fill: var(--ink); } .m { fill: var(--muted); } .g { stroke: var(--grid); stroke-width: 1; fill: none; }
.before { stroke: var(--before); stroke-width: 2; fill: none; stroke-dasharray: 5 3; } .now { stroke: var(--now); stroke-width: 2; fill: none; }
.keyb { fill: var(--before); } .keyn { fill: var(--now); }
text { font-family: inherit; }`;

const PANEL = { w: 300, h: 190, left: 34, right: 10, top: 28, bottom: 28 };

/** A panel: a title, a score axis, a place axis with the band edges, and lines. */
function panel({ x, y, title, series, yMin, yMax, count = 285 }) {
  const iw = PANEL.w - PANEL.left - PANEL.right;
  const ih = PANEL.h - PANEL.top - PANEL.bottom;
  const px = (place) => PANEL.left + ((place - 1) / (count - 1)) * iw;
  const py = (score) => PANEL.top + ih - ((score - yMin) / (yMax - yMin)) * ih;
  const out = [`<g transform="translate(${x} ${y})">`, `<text class="t" x="${PANEL.left}" y="16" font-weight="600">${title}</text>`];
  const step = yMax - yMin > 40 ? 20 : 10;
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) {
    out.push(`<line class="g" x1="${PANEL.left}" x2="${PANEL.w - PANEL.right}" y1="${py(v)}" y2="${py(v)}"/><text class="m" x="${PANEL.left - 6}" y="${py(v) + 4}" text-anchor="end">${v}</text>`);
  }
  for (const place of [1, 86, 171, 256]) out.push(`<text class="m" x="${px(place)}" y="${PANEL.h - 10}" text-anchor="${place === 1 ? "start" : "middle"}">${place}</text>`);
  for (const place of [86.5, 171.5]) out.push(`<line class="g" x1="${px(place)}" x2="${px(place)}" y1="${PANEL.top}" y2="${PANEL.top + ih}" stroke-dasharray="2 4"/>`);
  for (const { cls, points, label } of series) {
    const d = points.map(([place, score], i) => `${i === 0 ? "M" : "L"}${px(place).toFixed(1)} ${py(score).toFixed(1)}`).join("");
    out.push(`<path class="${cls}" d="${d}"><title>${label}</title></path>`);
  }
  out.push("</g>");
  return out.join("");
}

function sheet({ cols, panels, width, height, title, legend }) {
  const body = panels.map((p, i) => panel({ ...p, x: (i % cols) * PANEL.w + 8, y: Math.floor(i / cols) * PANEL.h + 56 })).join("");
  const key = legend
    ? `<g transform="translate(8 38)"><line x1="0" x2="22" y1="-4" y2="-4" class="before"/><text class="m" x="28" y="0">1.0.0 (its places, up to 285)</text><line x1="400" x2="422" y1="-4" y2="-4" class="now"/><text class="m" x="428" y="0">now</text></g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${title}"><style>${STYLE}</style><g class="viz"><rect class="surface" width="${width}" height="${height}" rx="10"/><text class="t" x="8" y="22" font-size="14" font-weight="600">${title}</text>${key}${body}<text class="m" x="${width - 8}" y="${height - 6}" text-anchor="end" font-size="10">level of the size (bands: easy 1–86, medium 87–171, hard 172–256) · score 0–100</text></g></svg>`;
}

// 1. Four sizes, before and after.
const points = (levels) => levels.map((level, i) => [i + 1, level.score]);
const sizes = MEIKYUU_SIZES.map((size) => {
  const before = MEIKYUU_LEGACY_MAZE_LEVELS.filter((level) => level.size === size);
  const now = mazeLevelsOfSize(size);
  return { title: `${size[0].toUpperCase()}${size.slice(1)}`, yMin: Math.floor(Math.min(before[0].score, now[0].score, 2) / 10) * 10, yMax: 100, series: [{ cls: "before", points: points(before), label: `${size}, 1.0.0` }, { cls: "now", points: points(now), label: `${size}, now` }] };
});
writeFileSync(join(docs, "score-by-level.svg"), sheet({ cols: 2, panels: sizes, width: 616, height: 56 + 2 * PANEL.h + 12, title: "Score by level of the size, 1.0.0 and now", legend: true }));

// 2. Six tall sizes.
const talls = MEIKYUU_TALL_SIZES.map((s) => ({ count: 256, title: `Tall ${s.label}`, yMin: 20, yMax: 80, series: [{ cls: "now", points: points(tallLevelsOfSize(s.size)), label: `tall ${s.label}` }] }));
writeFileSync(join(docs, "tall-score-by-level.svg"), sheet({ cols: 3, panels: talls, width: 916, height: 56 + 2 * PANEL.h + 12, title: "Score by level, the six tall sizes", legend: false }));

// 3. The easy third of Small, before and after, drawn.
const old = MEIKYUU_LEGACY_MAZE_LEVELS.filter((level) => level.size === "small");
const oldEasy = old.slice(0, Math.ceil(old.length / 3));
const newEasy = mazeLevelsOfSize("small").slice(0, 86);
const pick = (list, n) => Array.from({ length: n }, (_, i) => list[Math.round((i / (n - 1)) * (list.length - 1))]);
const cell = (level, place, of) => {
  const maze = buildMaze(level.recipe ?? parseRecipe(level.code));
  // One scale for every figure: a cell is 17 pixels wide wherever it is, so a bigger maze is a bigger picture.
  const svg = drawMaze(maze, { label: "", wall: 0.14, board: "paper", standalone: true });
  const width = Number(/viewBox="[-\d. ]+ [-\d. ]+ ([\d.]+) /.exec(svg)[1]);
  return `<figure><div style="width:${Math.round(width * 17)}px;margin:0 auto">${svg}</div><figcaption><b>${place}</b> of ${of}<br>${level.cells} cells · score ${level.score}</figcaption></figure>`;
};
const row = (title, list, total) => `<h2>${title}</h2><div class="row">${pick(list, 7).map((level) => cell(level, list.indexOf(level) + 1, total)).join("")}</div>`;
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:18px 20px;background:#f4efe4;color:#1f2320;font:14px system-ui,sans-serif;width:1100px}
h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:16px 0 8px;color:#6b6f68;font-weight:600}
.row{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}figure{margin:0;text-align:center}figcaption{font-size:12px;margin-top:4px;color:#6b6f68}
svg{width:100%;height:auto;display:block;border-radius:8px}figure{align-self:end}</style>
<h1>The easy third of Small, drawn to one scale</h1>
${row(`1.0.0: levels 1 to ${oldEasy.length} of ${old.length}`, oldEasy, oldEasy.length)}
${row("Now: levels 1 to 86 of 256", newEasy, 86)}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1140, height: 600 }, deviceScaleFactor: 1.5 });
await page.setContent(html);
await page.screenshot({ path: join(docs, "easy-before-after.jpg"), type: "jpeg", quality: 80, fullPage: true });
await browser.close();
void existsSync; void readFileSync; void MEIKYUU_MAZE_LEVELS; void MEIKYUU_TALL_LEVELS;
console.log("wrote docs/score-by-level.svg, docs/tall-score-by-level.svg, docs/easy-before-after.jpg");
