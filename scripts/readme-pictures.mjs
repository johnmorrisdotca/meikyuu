// Takes the pictures the README shows, from the built demo in `site/`: `pnpm pictures` (builds the demo, then runs this).
// The page is served to a browser without a port, never fetched from the live site, and the same each run: the levels are
// chosen by what they are, their lines are drawn along their own way with the mouse, and motion is reduced. It waits on the
// board's own svg and on the page saying how many cells are drawn, never on a clock.
// Output: docs/tall-phone.jpg, docs/tall-phone-dark.jpg and docs/tall-gutters.jpg (a tall maze on a 390 by 844 phone: whole with some of the page beside it,
// the same in dark, and zoomed out with the gutters widened), docs/tall-desktop.jpg (the same maze lying down on a 1440 by 900 screen), and
// docs/desktop.jpg (1280 wide, light, English: a heart maze, drawn part of the way) and docs/phone.jpg (390 by 844, dark,
// Japanese: a huge maze drawn out from its centre, zoomed in, with its line drawn into it).
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { buildMaze, solutionOf } from "../dist/index.js";
import { MEIKYUU_MAZE_LEVELS } from "../dist/levels.js";
import { MEIKYUU_TALL_LEVELS } from "../dist/levels-tall.js";
import { cellPoint, dragCells, touchDrag } from "../e2e/demo.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site");
const docs = join(root, "docs");
const host = "http://meikyuu.test";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const QUALITY = 78;

if (!existsSync(join(site, "index.html"))) throw new Error("site/ is not built: run `pnpm pictures` (it builds the demo first)");
const browser = await chromium.launch();

/** Where a point of the maze is on the page. */
async function pixelOf(svg, [x, y]) {
  const box = await svg.boundingBox();
  const [vx, vy, vw, vh] = (await svg.getAttribute("viewBox")).split(" ").map(Number);
  return { x: box.x + ((x - vx) / vw) * box.width, y: box.y + ((y - vy) / vh) * box.height };
}

/** A level opened, zoomed about its start by wheel steps, and `share` of its way drawn by the mouse. */
async function shot({ width, height, colorScheme, lang, level, share, zoom, path, scrollTo }) {
  const maze = buildMaze(MEIKYUU_MAZE_LEVELS[level - 1].recipe);
  const way = solutionOf(maze);
  const context = await browser.newContext({ viewport: { width, height }, colorScheme, reducedMotion: "reduce", locale: "en-US", deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.route(`${host}/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(site, pathname === "/" ? "index.html" : pathname);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: readFileSync(file), contentType: TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream" });
  });
  await page.goto(`${host}/?kind=maze&level=${level}&lang=${lang}&help=off`);
  const svg = page.locator("#board .mk-box svg");
  await page.waitForSelector('#board[data-ready="true"] .mk-box svg[viewBox]');
  await svg.scrollIntoViewIfNeeded();
  const cells = Math.floor(way.length * share);
  if (zoom !== 0) {
    const start = await pixelOf(svg, maze.grid.centres[way[0]]);
    const whole = Number((await svg.getAttribute("viewBox")).split(" ")[2]);
    await page.mouse.move(start.x, start.y);
    await page.mouse.wheel(0, zoom);
    await page.waitForFunction((before) => Number(document.querySelector("#board .mk-box svg").getAttribute("viewBox").split(" ")[2]) < before, whole * 0.5);
  }
  // The line, drawn from the start along the way, with the mouse; as much as shows in the box.
  const first = await pixelOf(svg, maze.grid.centres[way[0]]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  let drawn = 0;
  const box = await svg.boundingBox();
  for (const cell of way.slice(1, cells)) {
    const p = await pixelOf(svg, maze.grid.centres[cell]);
    if (p.x < box.x + 50 || p.x > box.x + box.width - 50 || p.y < box.y + 50 || p.y > box.y + box.height - 50) break;
    await page.mouse.move(p.x, p.y, { steps: 2 });
    drawn += 1;
  }
  await page.mouse.up();
  await page.waitForFunction((n) => Number(document.getElementById("board").dataset.cells) >= n, Math.max(1, drawn - 1));
  if (scrollTo) await page.locator(scrollTo).evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 4));
  else await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.screenshot({ path, type: "jpeg", quality: QUALITY });
  await context.close();
}

// A heart-shaped maze, whole, with the first part of its way drawn, under the demo's header with its chooser.
const heart = MEIKYUU_MAZE_LEVELS.find((level) => level.recipe.shape === "heart" && level.recipe.mode === "enter-leave" && level.cells > 500 && level.cells < 900);
await shot({ width: 1280, height: 1250, colorScheme: "light", lang: "en", level: heart.number, share: 0.45, zoom: 0, path: join(docs, "desktop.jpg") });
// A huge maze on a phone, in dark mode and Japanese, zoomed in to a few cells across, scrolled to the board.
const huge = MEIKYUU_MAZE_LEVELS.filter((level) => level.recipe.mode === "centre-out" && level.cells > 5000 && level.recipe.shape === "square").at(-1);
await shot({ width: 390, height: 844, colorScheme: "dark", lang: "ja", level: huge.number, share: 1, zoom: -1400, path: join(docs, "phone.jpg"), scrollTo: "#board" });

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
