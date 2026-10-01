// The `<meikyuu-board>` tag and `mountMeikyuu`, used the way a page that is not this demo uses them: a bare page with nothing but the element.
import { expect, test } from "@playwright/test";

import { arrowsOf, bare, dragCells, events, findMaze, mazeOf, recordEvents } from "./demo.mjs";

const svgOf = (page, selector = "meikyuu-board") => page.locator(`${selector} .mk-box svg`);

test("the tag draws a maze level of the package's own and plays it, with its events", async ({ page }) => {
  const errors = await bare(page, `<meikyuu-board id="a" level="40" style="max-width:360px"></meikyuu-board>`);
  await expect(svgOf(page)).toHaveAttribute("data-cells", String(mazeOf(40).level.cells));
  await recordEvents(page, "#a", ["meikyuu-move", "meikyuu-solve"]);
  const { maze, way } = mazeOf(40);
  await expect(svgOf(page)).toHaveAttribute("viewBox", /./);
  await dragCells(page, svgOf(page), maze, way);
  await expect(page.locator("#a")).toHaveAttribute("data-solved", "true");
  expect((await events(page)).map((each) => each.name)).toEqual(["meikyuu-move", "meikyuu-solve"]);
  expect(errors).toEqual([]);
});

test("its attributes are read again when they change: another level, another kind, a recipe of your own, a board, a language", async ({ page }) => {
  await bare(page, `<meikyuu-board id="a" level="40"></meikyuu-board>`);
  await expect(svgOf(page)).toHaveAttribute("data-shape", mazeOf(40).level.recipe.shape);
  await page.evaluate(() => document.getElementById("a").setAttribute("level", "41"));
  await expect(page.locator("#a")).toHaveAttribute("data-level", "41");
  await page.evaluate(() => document.getElementById("a").setAttribute("kind", "arrows"));
  await expect(page.locator("#a")).toHaveAttribute("data-kind", "arrows");
  await expect(page.locator("#a .mk-arrow").first()).toBeVisible();
  await page.evaluate(() => {
    const tag = document.getElementById("a");
    tag.setAttribute("kind", "maze");
    tag.setAttribute("recipe", "heart:25:wilson:to-goal:5");
  });
  await expect(svgOf(page)).toHaveAttribute("data-shape", "heart");
  await page.evaluate(() => document.getElementById("a").setAttribute("board", "wood"));
  await expect(svgOf(page)).toHaveAttribute("data-board", "wood");
  await page.evaluate(() => document.getElementById("a").setAttribute("lang", "ja"));
  await expect(page.locator('#a [data-action="undo"]')).toHaveText("もどす");
  await page.evaluate(() => document.getElementById("a").setAttribute("controls", "off"));
  await expect(page.locator("#a .mk-controls")).toHaveCount(0);
  await expect(svgOf(page)).toBeVisible();
});

test("tap, hints and zoom are attributes too, and the methods undo, restart, hint and fit are on the element", async ({ page }) => {
  await bare(page, `<meikyuu-board id="a" level="40" tap hints="off" zoom="off"></meikyuu-board>`);
  await expect(page.locator('#a [data-action="hint"]')).toBeHidden();
  await expect(page.locator("#a .mk-pad")).toBeHidden();
  const { maze, way } = mazeOf(40);
  await expect(svgOf(page)).toHaveAttribute("viewBox", /./);
  const start = await svgOf(page).evaluate((svg, s) => {
    const rect = svg.getBoundingClientRect();
    const [vx, vy, vw, vh] = svg.getAttribute("viewBox").split(" ").map(Number);
    return { x: rect.x + ((s[0] - vx) / vw) * rect.width, y: rect.y + ((s[1] - vy) / vh) * rect.height };
  }, maze.grid.centres[way[0]]);
  await page.mouse.click(start.x, start.y);
  await expect(page.locator("#a")).toHaveAttribute("data-cells", "1");
  await page.evaluate(() => document.getElementById("a").undo());
  await expect(page.locator("#a")).toHaveAttribute("data-cells", "0");
  await page.evaluate(() => {
    const tag = document.getElementById("a");
    tag.restart();
    tag.fit();
    tag.hint();
  });
  await expect(page.locator("#a .mk-messages")).toContainText("Press the green start");
});

test("an arrow level and a mixed level load through the tag, and a tag taken out of the page takes its board with it", async ({ page }) => {
  await bare(page, `<meikyuu-board id="a" kind="arrows" level="5"></meikyuu-board><meikyuu-board id="b" kind="mixed" level="5"></meikyuu-board>`);
  const { board } = await arrowsOf(5);
  await expect(page.locator("#a .mk-arrow")).toHaveCount(board.arrows.length);
  await expect(page.locator("#b .mk-tab")).toHaveCount(2);
  await page.evaluate(() => document.getElementById("a").remove());
  await expect(page.locator(".mk-box")).toHaveCount(1);
  await expect(page.locator("style[data-meikyuu-play]")).toHaveCount(1);
});

test("a tag with neither a level nor a recipe, or with one that is none, draws nothing and says nothing", async ({ page }) => {
  const errors = await bare(page, `<meikyuu-board id="a"></meikyuu-board><meikyuu-board id="b" level="99999"></meikyuu-board><meikyuu-board id="c" recipe="nonsense"></meikyuu-board>`);
  await page.waitForTimeout(150);
  await expect(page.locator(".mk-box")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("mountMeikyuu works on any element, with a recipe or a level, and its handle drives the board", async ({ page }) => {
  await bare(page, `<div id="host"></div>`);
  const found = findMaze(({ level }) => level.recipe.mode === "keys" && level.cells < 150, { from: 100, to: 800 });
  const result = await page.evaluate(async (code) => {
    const { mountMeikyuu } = await import("./dist/play-entry.js");
    const host = document.getElementById("host");
    const mount = mountMeikyuu(host, { recipe: code, hints: true });
    const first = mount.kind();
    const bad = mountMeikyuu(document.createElement("div"), { recipe: "nope" });
    const loaded = mount.load({ kind: "arrows", level: 3 });
    const arrows = mount.arrowGame().board.arrows.length;
    mount.destroy();
    return { first, bad, loaded, arrows, left: host.children.length, cls: host.className };
  }, found.level.code);
  expect(result.first).toBe("maze");
  expect(result.bad).toBeNull();
  expect(result.loaded).toBe(true);
  expect(result.arrows).toBeGreaterThan(3);
  expect(result.left).toBe(0);
  expect(result.cls).toBe("");
});

test("keys: the line passes over a key and picks it up, and the key stays picked up when the line is drawn back out of its branch", async ({ page }) => {
  const found = findMaze(({ level, maze, way }) => level.recipe.mode === "keys" && maze.grid.cells < 200 && maze.keys.length >= 1 && way.length > 5, { from: 100, to: 800 });
  const { maze } = found;
  await bare(page, `<meikyuu-board id="a" recipe="${found.level.code}"></meikyuu-board>`);
  await expect(svgOf(page)).toHaveAttribute("viewBox", /./);
  await recordEvents(page, "#a", ["meikyuu-key"]);
  const { walk } = await import("../dist/index.js");
  const { before } = walk(maze.links, maze.start);
  const route = [];
  for (let cell = maze.keys[0]; cell !== -1; cell = before[cell]) route.push(cell);
  route.reverse();
  await dragCells(page, svgOf(page), maze, [...route, ...route.slice(0, -1).reverse()]);
  await expect(page.locator("#a")).toHaveAttribute("data-keys", "1");
  await expect(page.locator("#a")).toHaveAttribute("data-cells", "1");
  await expect(page.locator('#a [data-mark="key"][data-got="true"]')).toHaveCount(1);
  expect((await events(page)).length).toBe(1);
  await expect(page.locator("#a .mk-progress")).toContainText(`Keys 1 of ${maze.keys.length}`);
});
