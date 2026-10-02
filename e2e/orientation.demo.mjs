// Which way up a maze is shown: a tall one stands on a phone held upright and lies down on a wide screen, by the room there is, or as asked;
// and the line drawn on it is the same line either way, started one way up and finished the other, in every shape.
import { expect, test } from "@playwright/test";

import { at, bare, dragCells, findTall, open } from "./demo.mjs";
import { buildMaze, lineToSteps, MEIKYUU_SHAPES, solutionOf } from "../dist/index.js";

const svgOf = (page, selector = `${at("board")}`) => page.locator(`${selector} .mk-box svg`);
const tall = findTall(({ level, maze }) => level.size === 3 && level.recipe.shape === "square" && maze.keys.length === 0);

/** The width and height the svg is drawn at. */
const sizeOf = async (locator) => {
  const box = await locator.boundingBox();
  return { width: box.width, height: box.height };
};

test("a tall maze lies down on a wide screen by itself, and stands on a narrow one", async ({ page }, info) => {
  await open(page, `?kind=tall&level=${tall.level.number}`);
  const wide = info.project.name === "chromium-desk";
  await expect(page.locator(at("board"))).toHaveAttribute("data-turned", String(wide));
  await expect(page.locator(at("board"))).toHaveAttribute("data-orientation", wide ? "landscape" : "portrait");
  const box = await sizeOf(page.locator(`${at("board")} .mk-box`));
  if (wide) expect(box.width).toBeGreaterThan(box.height);
  else expect(box.height).toBeGreaterThan(box.width);
});

test("the chooser turns it either way, and Auto goes back to what the room says", async ({ page }, info) => {
  await open(page, `?kind=tall&level=${tall.level.number}`);
  const wide = info.project.name === "chromium-desk";
  const choose = (name) => page.locator(`#orientations button[data-value="${name}"]`).click();
  await choose(wide ? "portrait" : "landscape");
  await expect(page.locator(at("board"))).toHaveAttribute("data-turned", String(!wide));
  const turned = await sizeOf(page.locator(`${at("board")} .mk-box`));
  if (wide) expect(turned.height).toBeGreaterThan(turned.width * 0.99);
  else expect(turned.width).toBeGreaterThan(turned.height);
  await choose(wide ? "landscape" : "portrait");
  await expect(page.locator(at("board"))).toHaveAttribute("data-turned", String(wide));
  await choose("auto");
  await expect(page.locator(at("board"))).toHaveAttribute("data-turned", String(wide));
  // It is kept on this device.
  await page.reload();
  await page.waitForSelector(`${at("board")}[data-ready="true"] .mk-box svg[viewBox]`);
  await expect(page.locator('#orientations button[aria-pressed="true"]')).toHaveAttribute("data-value", "auto");
});

test("a square maze is never turned, whatever is asked, and tells the turn in its event", async ({ page }) => {
  const errors = await bare(page, `<meikyuu-board id="a" recipe="square:8x8:wilson:to-goal:3" orientation="landscape" style="max-width:700px"></meikyuu-board>`);
  await expect(page.locator("#a")).toHaveAttribute("data-turned", "false");
  expect(errors).toEqual([]);
  await page.evaluate(() => document.getElementById("a").setAttribute("recipe", "square:6x9:wilson:to-goal:3"));
  await expect(page.locator("#a")).toHaveAttribute("data-turned", "true");
  const detail = await page.evaluate(() => document.getElementById("a").mount.orientation());
  expect(detail).toEqual({ setting: "landscape", orientation: "landscape", turned: true });
});

test("a line started with the maze one way up is the same line when it is finished with the maze the other", async ({ page }) => {
  const { level, maze, way } = tall;
  await bare(page, `<meikyuu-board id="a" recipe="${level.code}" ratio="2/3" orientation="portrait" style="max-width:520px"></meikyuu-board>`);
  const svg = svgOf(page, "#a");
  await expect(page.locator("#a")).toHaveAttribute("data-turned", "false");
  const half = Math.floor(way.length / 2);
  await dragCells(page, svg, maze, way.slice(0, half));
  const pathOf = () => page.evaluate(() => [...document.getElementById("a").mount.mazeGame().path]);
  expect(await pathOf()).toEqual(way.slice(0, half));
  // Lie it down: the line is the line.
  await page.evaluate(() => document.getElementById("a").setAttribute("orientation", "landscape"));
  await expect(page.locator("#a")).toHaveAttribute("data-turned", "true");
  expect(await pathOf()).toEqual(way.slice(0, half));
  await expect(svg).toHaveAttribute("data-turned", "true");
  // Finish it lying down, from the end of the line.
  await dragCells(page, svg, maze, way.slice(half - 1));
  await expect(page.locator("#a")).toHaveAttribute("data-solved", "true");
  expect(await pathOf()).toEqual(way);
  // And the steps a site keeps are the same as for a line drawn all the way upright.
  expect(lineToSteps(maze, await pathOf())).toBe(lineToSteps(maze, way));
});

test.describe("every shape", () => {
  for (const shape of MEIKYUU_SHAPES) {
    test(`${shape}: the same line drawn upright and lying down reads back the same steps`, async ({ page }) => {
      const size = { square: "9x6", hex: "8x6", triangle: "10x5", circle: "5", heart: "14", leaf: "14", star: "16", ring: "12", diamond: "12", cross: "11", moon: "14", hexagon: "3", pyramid: "6" }[shape];
      const code = `${shape}:${size}:wilson:to-goal:31`;
      const [w, h] = size.includes("x") ? size.split("x").map(Number) : [Number(size), Number(size)];
      const maze = buildMaze({ shape, w, h, algorithm: "wilson", mode: "to-goal", seed: 31 });
      const way = solutionOf(maze);
      const steps = [];
      for (const orientation of ["portrait", "landscape"]) {
        await bare(page, `<meikyuu-board id="a" recipe="${code}" orientation="${orientation}" style="max-width:620px"></meikyuu-board>`);
        await expect(page.locator("#a .mk-box svg[viewBox]")).toBeVisible();
        // Turned only if it is wider than tall (to stand it up) or taller than wide (to lay it down): a round or square one stays as it is.
        const ratio = maze.grid.box.w / maze.grid.box.h;
        const turned = orientation === "portrait" ? ratio > 1.1 : ratio < 1 / 1.1;
        await expect(page.locator("#a")).toHaveAttribute("data-turned", String(turned));
        const svg = svgOf(page, "#a");
        // Down on the start, along the way a cell at a time, the first stretch of it: whatever way up it is shown.
        await dragCells(page, svg, maze, way.slice(0, 8), { steps: 4 });
        const path = await page.evaluate(() => [...document.getElementById("a").mount.mazeGame().path]);
        expect(path).toEqual(way.slice(0, 8));
        steps.push(lineToSteps(maze, path));
      }
      expect(steps[0]).toBe(steps[1]);
    });
  }
});

test("the board is turned by what the window and the host leave: a window made wide lays a tall maze down", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await bare(page, `<meikyuu-board id="a" recipe="${tall.level.code}" ratio="2/3"></meikyuu-board>`);
  await expect(page.locator("#a")).toHaveAttribute("data-turned", "false");
  const events = await page.evaluate(() => {
    window.__turns = [];
    document.getElementById("a").addEventListener("meikyuu-orientation", (event) => window.__turns.push(event.detail.orientation));
    return true;
  });
  expect(events).toBe(true);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator("#a")).toHaveAttribute("data-turned", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#a")).toHaveAttribute("data-turned", "false");
  expect(await page.evaluate(() => window.__turns)).toEqual(["landscape", "portrait"]);
});

