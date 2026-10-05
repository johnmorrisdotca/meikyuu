// The colossal mazes (about ten thousand cells), played in a browser: the biggest of each list opens, is zoomed and moved, has a long line drawn
// through it (and drawn back and on again) whose text is the line's own, and is solved. The cost of the drawing was measured on a phone's Chromium
// slowed four times over (docs/LEVELS.md): this holds what must stay true, that the line drawn by the incremental text is the line the game has.
import process from "node:process";

import { expect, test } from "@playwright/test";

import { buildMaze, solutionOf } from "../dist/index.js";
import { linePath } from "../dist/draw-entry.js";
import { MEIKYUU_COLOSSAL_LEVELS, MEIKYUU_COLOSSAL_TALL_LEVELS } from "../dist/levels-colossal.js";
import { at, noSidewaysScroll, open } from "./demo.mjs";

const svgOf = (page) => page.locator(`${at("board")} .mk-box svg`);

/** The colossal level of a list with the longest way through it that has no keys. */
function longest(list) {
  let best = null;
  for (const level of list) {
    if (level.recipe.mode === "keys") continue;
    const maze = buildMaze(level.recipe);
    const way = solutionOf(maze);
    if (best === null || way.length > best.way.length) best = { level, maze, way };
  }
  return best;
}

/** Pointer events along cells of the maze, as a fast finger sends them: the page is asked for where each cell is on the screen. */
async function draw(page, maze, cells, { lift = true, perFrame = 12 } = {}) {
  await page.evaluate(
    async ({ cells, centres, lift, perFrame }) => {
      const box = document.querySelector(".mk-box");
      const svg = box.querySelector("svg");
      const place = (cell) => {
        const r = svg.getBoundingClientRect();
        const [vx, vy, vw, vh] = svg.getAttribute("viewBox").split(" ").map(Number);
        const turned = svg.getAttribute("data-turned") === "true";
        const [x, y] = centres[cell];
        const [px, py] = turned ? [y, -x] : [x, y];
        return { x: r.x + ((px - vx) / vw) * r.width, y: r.y + ((py - vy) / vh) * r.height };
      };
      const send = (type, cell) => {
        const p = place(cell);
        box.dispatchEvent(new PointerEvent(type, { pointerId: 5, pointerType: "touch", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: p.x, clientY: p.y, bubbles: true, cancelable: true }));
      };
      send("pointerdown", cells[0]);
      for (let i = 1; i < cells.length; i += perFrame) {
        for (let j = i; j < Math.min(cells.length, i + perFrame); j += 1) send("pointermove", cells[j]);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      if (lift) send("pointerup", cells[cells.length - 1]);
    },
    { cells, centres: maze.grid.centres, lift, perFrame },
  );
}

for (const [name, kind, list] of [["square", "colossal", MEIKYUU_COLOSSAL_LEVELS], ["tall", "colossal-tall", MEIKYUU_COLOSSAL_TALL_LEVELS]]) {
  test(`the biggest ${name} colossal maze opens at about its size, takes a long line drawn and drawn back with the line's own text, and is solved`, async ({ page, browserName }) => {
    // WebKit on Linux paints in software, and an SVG of this size makes every frame take tens of seconds there: the same stall is in the earlier release's huge mazes (e2e/zoom.demo.mjs's smoothness
    // check fails there on 2.0.1 too), and WebKit on a Mac, Chromium on Linux and on a Mac are all at the frame rate (docs/LEVELS.md). So the long line is drawn in the other engines.
    test.skip(browserName === "webkit" && process.platform === "linux", "WebKit's software painting on Linux cannot repaint a maze this big in a frame");
    const { level, maze, way } = longest(list);
    expect(way.length).toBeGreaterThan(1000);
    const errors = await open(page, `?kind=${kind}&level=${level.number}`);
    await expect(page.locator(at("board"))).toHaveAttribute("data-level", String(level.number));
    await expect(svgOf(page)).toHaveAttribute("data-cells", String(level.cells));
    expect(level.cells).toBeGreaterThan(name === "square" ? 9400 : 5000);
    // The line is its own text after every kind of change: drawn on, cut back by a lot, drawn on again down a different way, and drawn back to the start.
    const text = () => page.locator(`${at("board")} .mk-trail`).getAttribute("d");
    const half = Math.floor(way.length / 2);
    await draw(page, maze, way.slice(0, half));
    await expect(page.locator(at("board"))).toHaveAttribute("data-cells", String(half));
    await expect.poll(text).toBe(linePath(maze.grid, way.slice(0, half)));
    await draw(page, maze, way.slice(0, half).reverse().slice(0, 300));
    await expect(page.locator(at("board"))).toHaveAttribute("data-cells", String(half - 299));
    await expect.poll(text).toBe(linePath(maze.grid, way.slice(0, half - 299)));
    const finish = way.slice(half - 300);
    await draw(page, maze, finish);
    await expect(page.locator(at("board"))).toHaveAttribute("data-cells", String(half - 300 + finish.length));
    await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
    await expect.poll(text).toBe(linePath(maze.grid, way));
    await page.locator(`${at("board")} [data-action="undo"]`).click();
    await expect.poll(text).toBe(linePath(maze.grid, way.slice(0, half - 299)));
    await page.locator(`${at("board")} [data-action="restart"]`).click();
    await expect.poll(text).toBe("");
    await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "0");
    expect(errors).toEqual([]);
    await noSidewaysScroll(page);
  });
}

test("a colossal maze is zoomed, moved and fitted again, and only the walls on screen are in the page", async ({ page }) => {
  await open(page, "?kind=colossal&level=1");
  const svg = svgOf(page);
  const shown = async () => Number((await svg.getAttribute("viewBox")).split(" ")[2]);
  const walls = () => page.locator(`${at("board")} .mk-walls path`).count();
  const fitted = await shown();
  const wholeTiles = await walls();
  await page.locator(`${at("board")} [data-action="in"]`).click();
  await page.locator(`${at("board")} [data-action="in"]`).click();
  await page.locator(`${at("board")} [data-action="in"]`).click();
  await page.locator(`${at("board")} [data-action="in"]`).click();
  await expect.poll(shown).toBeLessThan(fitted / 3);
  // Zoomed in, fewer tiles are in the page than when the whole maze was in view.
  expect(await walls()).toBeLessThan(wholeTiles);
  expect(await walls()).toBeGreaterThan(0);
  await page.locator(`${at("board")} [data-action="fit"]`).click();
  await expect.poll(shown).toBeCloseTo(fitted, 1);
  expect(wholeTiles).toBeGreaterThanOrEqual(40);
});

test("the chooser offers the two colossal lists, with their levels and no size row", async ({ page }) => {
  await open(page, "?kind=colossal&level=7");
  await expect(page.locator('#kinds button[data-value="colossal"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#size-row")).toBeHidden();
  await expect(page.locator("#level-of")).toHaveText(" / 128");
  await expect(page.locator("#info")).toContainText("Colossal");
  await page.locator('#kinds button[data-value="colossal-tall"]').click();
  await expect(page.locator(at("board"))).toHaveAttribute("data-level", "1");
  await expect(page.locator("#level-of")).toHaveText(" / 128");
  await expect(page.locator(`${at("board")} .mk-wrap`)).toBeVisible();
  const box = await page.locator(`${at("board")} .mk-box`).boundingBox();
  // Tall: narrower than it is high, or lying down on a desk, wider than high.
  expect(Math.abs(box.width / box.height - 2 / 3) < 0.03 || Math.abs(box.width / box.height - 3 / 2) < 0.03).toBe(true);
});
