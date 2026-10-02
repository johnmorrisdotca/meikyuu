// What every demo test starts from: the built demo in `site/`, served to the page without a port, the package as built in
// `dist/`, and the helpers a test draws and looks with.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect } from "@playwright/test";

import { buildMaze, solutionOf } from "../dist/index.js";
import { levelOf } from "../dist/levels.js";
import { MEIKYUU_TALL_LEVELS } from "../dist/levels-tall.js";

const site = join(dirname(fileURLToPath(import.meta.url)), "..", "site");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };

/** Serve `site/` to a page at http://meikyuu.test/. */
export async function serve(page) {
  if (!existsSync(join(site, "index.html"))) throw new Error("site/ is not built: run `pnpm site` first (`pnpm test:demo` does)");
  await page.route("http://meikyuu.test/**", (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(site, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: readFileSync(file), contentType: TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream" });
  });
}

/** Collect anything the page complains of. */
function listen(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  return errors;
}

export const at = (id) => `[data-testid="${id}"]`;
export const board = (page) => page.locator(`${at("board")} .mk-box`);

/** Open the demo with a query and wait until its board is drawn; returns what the page complains of. */
export async function open(page, query = "") {
  const errors = listen(page);
  await serve(page);
  await page.goto(`http://meikyuu.test/${query}`);
  await page.waitForSelector(`${at("board")}[data-ready="true"] .mk-box svg[viewBox]`);
  return errors;
}

/** A page holding only what is given, with the element defined from the built package. */
export async function bare(page, html, { lang = "en" } = {}) {
  const errors = listen(page);
  await serve(page);
  await page.route("http://meikyuu.test/bare.html", (route) =>
    route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:12px;background:#2f5d4a;color:#fff;font-family:system-ui}</style></head><body>${html}<script type="module">import "./dist/element-define.js";</script></body></html>` }),
  );
  await page.goto("http://meikyuu.test/bare.html");
  await page.waitForFunction(() => customElements.get("meikyuu-board") !== undefined);
  return errors;
}

/** A maze level as the package has it: its recipe, its maze and its one way. */
export function mazeOf(number) {
  const level = levelOf("maze", number);
  const maze = buildMaze(level.recipe);
  return { level, maze, way: solutionOf(maze) };
}

/** A tall level as the package has it: its recipe, its maze and its one way. */
export function tallOf(number) {
  const level = MEIKYUU_TALL_LEVELS[number - 1];
  const maze = buildMaze(level.recipe);
  return { level, maze, way: solutionOf(maze) };
}

/** The first tall level, by number, that passes the test. */
export function findTall(want, { from = 1, to = MEIKYUU_TALL_LEVELS.length } = {}) {
  for (let number = from; number <= to; number += 1) {
    const found = tallOf(number);
    if (want(found)) return found;
  }
  throw new Error("no such tall level");
}

/** The first maze level, by number, that passes the test. */
export function findMaze(want, { from = 1, to = 1024 } = {}) {
  for (let number = from; number <= to; number += 1) {
    const found = mazeOf(number);
    if (want(found)) return found;
  }
  throw new Error("no such maze level");
}

/** Where a point of the maze is on the page, in pixels, given the svg showing it: its viewBox, where it sits, and whether the board shows the maze turned a quarter (then a point (x, y) is shown at (y, -x)). */
export async function pixelOf(svg, [x, y]) {
  await svg.scrollIntoViewIfNeeded();
  const box = await svg.boundingBox();
  const [vx, vy, vw, vh] = (await svg.getAttribute("viewBox")).split(" ").map(Number);
  const turned = (await svg.getAttribute("data-turned")) === "true";
  const [px, py] = turned ? [y, -x] : [x, y];
  return { x: box.x + ((px - vx) / vw) * box.width, y: box.y + ((py - vy) / vh) * box.height };
}

/** A cell's middle on the page. */
export async function cellPoint(svg, maze, cell) {
  return pixelOf(svg, maze.grid.centres[cell]);
}

/** A finger (a mouse, where there is none) drawn through cells: down on the first, moved through each, and let go unless told not to. */
export async function dragCells(page, svg, maze, cells, { lift = true, steps = 3 } = {}) {
  const first = await cellPoint(svg, maze, cells[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const cell of cells.slice(1)) {
    const point = await cellPoint(svg, maze, cell);
    await page.mouse.move(point.x, point.y, { steps });
  }
  if (lift) await page.mouse.up();
}

/** A touch, made as the browser makes one: pointer events with the touch type, sent to the box. `points` are pixels of the page. */
export async function touchDrag(page, target, points, { id = 7, lift = true } = {}) {
  const [first, ...rest] = points;
  await target.evaluate(
    (element, { first, rest, id, lift }) => {
      const send = (type, p, extra = {}) => element.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: "touch", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: p.x, clientY: p.y, bubbles: true, cancelable: true, ...extra }));
      send("pointerdown", first);
      for (const p of rest) send("pointermove", p);
      if (lift) send("pointerup", rest.length > 0 ? rest[rest.length - 1] : first);
    },
    { first, rest, id, lift },
  );
}

/** Two touches at once (a pinch or a two finger move): each a list of pixels, moved together. */
export async function twoTouches(page, target, a, b, { lift = true } = {}) {
  await target.evaluate(
    (element, { a, b, lift }) => {
      const send = (type, id, p) => element.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: "touch", isPrimary: id === 1, button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: p.x, clientY: p.y, bubbles: true, cancelable: true }));
      send("pointerdown", 1, a[0]);
      send("pointerdown", 2, b[0]);
      for (let i = 1; i < a.length; i += 1) {
        send("pointermove", 1, a[i]);
        send("pointermove", 2, b[i]);
      }
      if (lift) {
        send("pointerup", 1, a[a.length - 1]);
        send("pointerup", 2, b[b.length - 1]);
      }
    },
    { a, b, lift },
  );
}

/** The width of the part of the board the box shows, in cells. */
export async function shownWidth(svg) {
  return Number((await svg.getAttribute("viewBox")).split(" ")[2]);
}

/** A page does not scroll sideways. */
export async function noSidewaysScroll(page) {
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll).toBeLessThanOrEqual(inner);
}

/** Record every event of this name the host fires. */
export async function recordEvents(page, selector, names) {
  await page.evaluate(
    ({ selector, names }) => {
      window.__events = [];
      const host = document.querySelector(selector);
      for (const name of names) host.addEventListener(name, (event) => window.__events.push({ name, detail: event.detail }));
    },
    { selector, names },
  );
}

export const events = (page) => page.evaluate(() => window.__events);

/** Points from one pixel to another in even steps, both ends included: a finger's way for `touchDrag` and `twoTouches`. */
export function along(from, to, steps = 12) {
  return Array.from({ length: steps + 1 }, (_, i) => ({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }));
}

/** An arrow level as the package has it: its board, and the arrows that block each. */
export async function arrowsOf(number) {
  const { makeArrows, blockersOf } = await import("../dist/index.js");
  const level = levelOf("arrows", number);
  const board = makeArrows(level.recipe);
  return { level, board, blockers: blockersOf(board) };
}

/** A mixed level as the package has it. */
export async function mixedOf(number) {
  const { buildMixed, solutionOf: way } = await import("../dist/index.js");
  const level = levelOf("mixed", number);
  const board = buildMixed(level.recipe);
  return { level, board, way: way(board.maze) };
}

/** The middle of an arrow's head cell on the page, to tap it. */
export async function arrowPoint(svg, board, id) {
  const cell = board.arrows[id].cells[board.arrows[id].cells.length - 1];
  return pixelOf(svg, [(cell % board.w) + 0.5, Math.floor(cell / board.w) + 0.5]);
}

/** Tap the arrow `id`: a click on the middle of its head's cell. */
export async function tapArrowOnPage(page, svg, board, id) {
  const point = await arrowPoint(svg, board, id);
  await page.mouse.click(point.x, point.y);
}

/**
 * How a mixed level is played, worked out by the package's own rules: `before` the arrows that can be taken before the unlock, in an order that
 * never bumps; `locked` and `held` (the locked arrows, and the others that nothing can free before the unlock); `after` the rest, in an order
 * that never bumps; `mistake` an arrow that is blocked now by one the player could clear first; and `way` the labyrinth's one way to its button.
 */
export async function mixedPlan(number) {
  const { arrowsLeft, buildMixed, hintArrow, newArrowGame, solutionOf, tapArrow, unlockArrows, heldByLocks } = await import("../dist/index.js");
  const level = levelOf("mixed", number);
  const board = buildMixed(level.recipe);
  const start = newArrowGame(board.arrows);
  const take = (game, order) => {
    for (let id = hintArrow(game); id !== null; id = hintArrow(game)) {
      order.push(id);
      game = tapArrow(game, id).game;
    }
    return game;
  };
  const before = [];
  const stuck = take(start, before);
  const held = stuck.present.flatMap((here, id) => (here && !board.arrows.locked[id] && heldByLocks(start, id) ? [id] : []));
  const after = [];
  const done = take(unlockArrows(stuck), after);
  if (arrowsLeft(done) !== 0) throw new Error(`mixed level ${number} cannot be cleared`);
  const mistake = start.present.findIndex((_, id) => !board.arrows.locked[id] && !stuck.present[id] && !heldByLocks(start, id) && tapArrow(start, id).result === "blocked");
  return { level, board, way: solutionOf(board.maze), before, held, after, mistake, locked: board.arrows.locked.flatMap((on, id) => (on ? [id] : [])) };
}
