// Takes the pictures docs/LEVELS.md shows of the tall mazes (docs/tall-phone.jpg, docs/tall-phone-dark.jpg, docs/tall-gutters.jpg and
// docs/tall-desktop.jpg), from the built demo in `site/`: `pnpm pictures:levels` (builds the demo, then runs this). The README's own pictures are
// made by `pnpm screenshots:readme` (scripts/readme-pictures.mjs). The page is served to a browser without a port, never fetched from the live site.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { buildMaze, solutionOf } from "../dist/index.js";
import { MEIKYUU_TALL_LEVELS } from "../dist/levels-tall.js";
import { cellPoint, dragCells, touchDrag } from "../e2e/demo.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site");
const docs = join(root, "docs");
const host = "http://meikyuu.test";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const QUALITY = 78;

if (!existsSync(join(site, "index.html"))) throw new Error("site/ is not built: run `pnpm pictures:levels` (it builds the demo first)");
const browser = await chromium.launch();

// A tall maze, 12 across, a good part of its way drawn: on a phone (by touch), zoomed out with wide gutters, in dark, and lying down on a desk.
const tall = MEIKYUU_TALL_LEVELS.find((level) => {
  if (level.size !== 4 || level.recipe.shape !== "square" || level.recipe.mode === "keys") return false;
  const maze = buildMaze(level.recipe);
  const way = solutionOf(maze);
  return Math.abs(maze.grid.centres[way[0]][1] - maze.grid.centres[way[way.length - 1]][1]) > maze.grid.box.h * 0.6 && way.length > 45;
});
async function tallShot({ width, height, touch, dark, widen, path }) {
  const maze = buildMaze(tall.recipe);
  const way = solutionOf(maze);
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, colorScheme: dark ? "dark" : "light", reducedMotion: "reduce", locale: "en-US", deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.route(`${host}/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(site, pathname === "/" ? "index.html" : pathname);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: readFileSync(file), contentType: TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream" });
  });
  await page.goto(`${host}/?kind=tall&level=${tall.number}&help=off`);
  await page.waitForSelector('#board[data-ready="true"] .mk-box svg[viewBox]');
  const svg = page.locator("#board .mk-box svg");
  for (let i = 0; i < widen; i += 1) await page.locator('#board [data-action="out"]').click();
  await svg.scrollIntoViewIfNeeded();
  const cells = Math.floor(way.length * 0.6);
  if (touch) {
    const points = [];
    for (const cell of way.slice(0, cells)) points.push(await cellPoint(svg, maze, cell));
    await touchDrag(page, page.locator("#board .mk-box"), points);
  } else await dragCells(page, svg, maze, way.slice(0, cells), { steps: 2 });
  await page.waitForFunction((n) => Number(document.getElementById("board").dataset.cells) >= n, cells);
  await page.evaluate(() => document.getElementById("board").scrollIntoView({ block: "start" }));
  await page.mouse.move(0, 0);
  await page.screenshot({ path, type: "jpeg", quality: QUALITY });
  await context.close();
}
await tallShot({ width: 390, height: 844, touch: true, dark: false, widen: 0, path: join(docs, "tall-phone.jpg") });
await tallShot({ width: 390, height: 844, touch: true, dark: true, widen: 0, path: join(docs, "tall-phone-dark.jpg") });
await tallShot({ width: 390, height: 844, touch: true, dark: false, widen: 3, path: join(docs, "tall-gutters.jpg") });
await tallShot({ width: 1440, height: 900, touch: false, dark: false, widen: 0, path: join(docs, "tall-desktop.jpg") });
await browser.close();
