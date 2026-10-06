// Takes the pictures the README shows, from the built demo in `site/`: `pnpm screenshots:readme` (builds the demo, then runs this).
// The family's standard is in johnmorrisdotca/.github (README-STANDARD.md); the shared part is readme-pictures-lib.mjs.
// The page is served to a browser without a port, never fetched from the live site, and is the same each run: the levels are chosen by
// what they are, their lines are drawn along their own way with the mouse, and motion is reduced. It waits on the board's own svg and on
// the page saying how many cells are drawn, never on a clock. Output: docs/images/<subject>-<desk|phone>-<light|dark>.webp.
// (The tall mazes' pictures for docs/LEVELS.md are made by scripts/levels-pictures.mjs.)
import { takePictures } from "./readme-pictures-lib.mjs";

import { buildMaze, solutionOf } from "../dist/index.js";
import { MEIKYUU_MAZE_LEVELS } from "../dist/levels.js";
import { MEIKYUU_TALL_LEVELS } from "../dist/levels-tall.js";
import { dragCells } from "../e2e/demo.mjs";

const BOARD = "#board .mk-box";
const READY = '#board[data-ready="true"] .mk-box svg[viewBox]';

/** Where a point of the maze is on the page. */
async function pixelOf(svg, [x, y]) {
  const box = await svg.boundingBox();
  const [vx, vy, vw, vh] = (await svg.getAttribute("viewBox")).split(" ").map(Number);
  return { x: box.x + ((x - vx) / vw) * box.width, y: box.y + ((y - vy) / vh) * box.height };
}

/** A level's way drawn with the mouse, `share` of it, after zooming about its start by wheel steps. */
const drawn = (recipe, share, zoom = 0) => async (page) => {
  const maze = buildMaze(recipe);
  const way = solutionOf(maze);
  const svg = page.locator(`${BOARD} svg`);
  await svg.scrollIntoViewIfNeeded();
  if (zoom !== 0) {
    const start = await pixelOf(svg, maze.grid.centres[way[0]]);
    const whole = Number((await svg.getAttribute("viewBox")).split(" ")[2]);
    await page.mouse.move(start.x, start.y);
    await page.mouse.wheel(0, zoom);
    await page.waitForFunction((before) => Number(document.querySelector("#board .mk-box svg").getAttribute("viewBox").split(" ")[2]) < before, whole * 0.5);
  }
  const first = await pixelOf(svg, maze.grid.centres[way[0]]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  let count = 0;
  const box = await svg.boundingBox();
  for (const cell of way.slice(1, Math.floor(way.length * share))) {
    const p = await pixelOf(svg, maze.grid.centres[cell]);
    if (p.x < box.x + 50 || p.x > box.x + box.width - 50 || p.y < box.y + 50 || p.y > box.y + box.height - 50) break;
    await page.mouse.move(p.x, p.y, { steps: 2 });
    count += 1;
  }
  await page.mouse.up();
  await page.waitForFunction((n) => Number(document.getElementById("board").dataset.cells) >= n, Math.max(1, count - 1));
};

const find = (test) => MEIKYUU_MAZE_LEVELS.find(test);
const heart = find((level) => level.recipe.shape === "heart" && level.recipe.mode === "enter-leave" && level.cells > 500 && level.cells < 900);
const huge = MEIKYUU_MAZE_LEVELS.filter((level) => level.recipe.mode === "centre-out" && level.cells > 5000 && level.recipe.shape === "square").at(-1);
const pick = (shape, mode, low = 150, high = 450) => find((level) => level.recipe.shape === shape && (mode === undefined || level.recipe.mode === mode) && level.cells > low && level.cells < high);
const hex = pick("hex");
const triangle = pick("triangle");
const circle = pick("circle");
const leaf = pick("leaf");
const keys = pick("square", "keys");
const tall = MEIKYUU_TALL_LEVELS.find((level) => level.size === 4 && level.recipe.shape === "square" && level.recipe.mode !== "keys");

/** One maze of a kind and level, drawn part of the way, its board cropped. */
const maze = (subject, level, share = 0.5) => ({ subject, views: ["desk"], scale: 1, url: `/?kind=maze&level=${level.number}&lang=en&help=off`, ready: READY, target: BOARD, prepare: drawn(level.recipe, share) });
/** A puzzle of another kind, its board cropped. */
const kind = (subject, query) => ({ subject, views: ["desk"], scale: 1, url: `/?${query}&lang=en&help=off`, ready: '#board[data-ready="true"]', target: "#board" });
/** A maze over a solid, its board cropped. */
const solid = (subject, name) => ({ subject, views: ["desk"], scale: 1, url: `/?solid=${name}&solidsize=small&solidlevel=1&lang=en&help=off`, ready: '[data-testid="solid-board"][data-ready="true"] canvas.mk-solid', target: '[data-testid="solid-board"] .mk-box' });

await takePictures({
  shots: [
    // A heart-shaped maze, whole, with the first part of its way drawn, under the demo's header with its chooser; on a phone, in dark mode and
    // Japanese, a huge maze zoomed in to a few cells across and drawn out from its centre, scrolled to the board.
    {
      subject: "hero",
      views: ["desk", "phone"],
      height: 1250,
      url: `/?kind=maze&level=${heart.number}&lang=en&help=off`,
      ready: READY,
      async prepare(page, { view }) {
        if (view === "phone") {
          await page.goto(`http://meikyuu.test/?kind=maze&level=${huge.number}&lang=ja&help=off`);
          await page.waitForSelector(READY);
          await drawn(huge.recipe, 1, -1400)(page);
          await page.locator("#board").evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 4));
        } else {
          await drawn(heart.recipe, 0.45)(page);
          await page.evaluate(() => window.scrollTo(0, 0));
        }
      },
    },
    maze("hexagons", hex),
    maze("triangles", triangle),
    maze("circle", circle),
    maze("leaf", leaf),
    maze("keys", keys, 0.4),
    kind("arrows", "kind=arrows&level=40"),
    kind("mixed", "kind=mixed&level=1"),
    { subject: "tall", views: ["phone"], url: `/?kind=tall&level=${tall.number}&lang=en&help=off`, ready: READY, target: BOARD, prepare: async (page) => { const made = buildMaze(tall.recipe); const way = solutionOf(made); const svg = page.locator(`${BOARD} svg`); await dragCells(page, svg, made, way.slice(0, Math.floor(way.length * 0.5)), { steps: 2 }); await page.waitForFunction((n) => Number(document.getElementById("board").dataset.cells) >= n, Math.floor(way.length * 0.5)); } },
    solid("cube", "cube"),
    solid("globe", "sphere"),
    solid("icosahedron", "icosahedron"),
  ],
});
