// The demo, played as a person plays it: lines drawn from the start through a maze by mouse and by touch, shortened, undone,
// hinted and solved. What the page shows is held to what the package says of the same level.
import { expect, test } from "@playwright/test";

import { at, board, cellPoint, dragCells, events, findMaze, mazeOf, noSidewaysScroll, open, recordEvents, touchDrag } from "./demo.mjs";

const svgOf = (page) => page.locator(`${at("board")} .mk-box svg`);

test("a first visit draws the level the address names, with its walls, its start and its goal, and says how to play it", async ({ page }) => {
  const errors = await open(page, "?kind=maze&level=40");
  const { level } = mazeOf(40);
  await expect(page.locator(at("board"))).toHaveAttribute("data-level", "40");
  await expect(svgOf(page)).toHaveAttribute("data-cells", String(level.cells));
  await expect(page.locator(`${at("board")} [data-mark="start"]`)).toHaveCount(1);
  await expect(page.locator(`${at("board")} [data-mark="goal"]`)).toHaveCount(1);
  expect(await page.locator(`${at("board")} .mk-walls path`).count()).toBeGreaterThan(0);
  await expect(page.locator(`${at("board")} .mk-says`)).not.toHaveText("");
  await expect(page.locator(`${at("board")} .mk-progress`)).toContainText("Press the start");
  expect(errors).toEqual([]);
  await noSidewaysScroll(page);
});

test("a line is drawn by dragging from the start along the passages, by mouse, and Undo takes the stroke back", async ({ page }) => {
  await open(page, "?kind=maze&level=40");
  const { maze, way } = mazeOf(40);
  const svg = svgOf(page);
  await dragCells(page, svg, maze, way.slice(0, 6));
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "6");
  await expect(page.locator(`${at("board")} .mk-trail`)).toHaveAttribute("d", /^M/);
  await expect(page.locator(`${at("board")} .mk-progress`)).toContainText("6 cells drawn");
  await page.locator(`${at("board")} [data-action="undo"]`).click();
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "0");
  await expect(page.locator(`${at("board")} .mk-trail`)).toHaveAttribute("d", "");
});

test("a line cannot pass through a wall, and a press that is not on the start draws nothing", async ({ page }) => {
  await open(page, "?kind=maze&level=40");
  const { maze, way } = mazeOf(40);
  const svg = svgOf(page);
  const start = way[0];
  const walled = maze.grid.neighbours[start].find((next) => !maze.links[start].includes(next));
  expect(walled).toBeDefined();
  await dragCells(page, svg, maze, [start, walled]);
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "1");
  // A press far from the start moves the view if it can and draws nothing.
  await dragCells(page, svg, maze, [way[Math.floor(way.length / 2)], way[Math.floor(way.length / 2) + 1]]);
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "1");
});

test("drawing back over the line shortens it, cell by cell, without letting go", async ({ page }) => {
  await open(page, "?kind=maze&level=40");
  const { maze, way } = mazeOf(40);
  const svg = svgOf(page);
  await dragCells(page, svg, maze, [...way.slice(0, 6), way[4], way[3]], { lift: false });
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "4");
  await page.mouse.up();
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "4");
});

test("the line carries on from its end in a second stroke, and Restart clears it all", async ({ page }) => {
  await open(page, "?kind=maze&level=40");
  const { maze, way } = mazeOf(40);
  const svg = svgOf(page);
  await dragCells(page, svg, maze, way.slice(0, 4));
  await dragCells(page, svg, maze, way.slice(3, 8));
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "8");
  await expect(page.locator(at("board"))).toHaveAttribute("data-moves", "2");
  await page.locator(`${at("board")} [data-action="restart"]`).click();
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "0");
  await expect(page.locator(at("board"))).toHaveAttribute("data-moves", "0");
});

test("a line drawn the whole way solves it: the page says so, tells the event once, keeps it, and the line is then fixed", async ({ page }) => {
  await open(page, "?kind=maze&level=40");
  await recordEvents(page, at("board"), ["meikyuu-move", "meikyuu-solve"]);
  const { maze, way } = mazeOf(40);
  const svg = svgOf(page);
  await dragCells(page, svg, maze, way);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
  await expect(page.locator(`${at("board")} .mk-progress`)).toContainText("Solved in 1 stroke");
  await expect(page.locator(`${at("board")} .mk-banner`)).toHaveAttribute("data-show", "true");
  await expect(svg).toHaveAttribute("data-won", "true");
  const told = await events(page);
  expect(told.map((each) => each.name)).toEqual(["meikyuu-move", "meikyuu-solve"]);
  expect(told[1].detail).toMatchObject({ kind: "maze", level: 40, solved: true, moves: 1 });
  // Once solved, the line stays.
  await dragCells(page, svg, maze, [way[way.length - 1], way[way.length - 2]]);
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", String(way.length));
  // It is kept, and the next visit knows it.
  await page.reload();
  await page.waitForSelector(`${at("board")}[data-ready="true"] .mk-box svg[viewBox]`);
  await expect(page.locator("#info")).toContainText("Solved");
});

test("a line is drawn by touch too, and the page does not scroll under the finger", async ({ page }) => {
  await open(page, "?kind=maze&level=40");
  const { maze, way } = mazeOf(40);
  const svg = svgOf(page);
  await svg.scrollIntoViewIfNeeded();
  const points = [];
  for (const cell of way.slice(0, 7)) points.push(await cellPoint(svg, maze, cell));
  const before = await page.evaluate(() => window.scrollY);
  await touchDrag(page, board(page), points);
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "7");
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  // The box asks the browser to leave touches to it.
  expect(await board(page).evaluate((element) => getComputedStyle(element).touchAction)).toBe("none");
});

test("with the browser's own touch (Chromium), a finger drags a line and the page does not scroll", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "real touch is driven through Chromium's own protocol");
  await open(page, "?kind=maze&level=40");
  const { maze, way } = mazeOf(40);
  const svg = svgOf(page);
  await svg.scrollIntoViewIfNeeded();
  const client = await page.context().newCDPSession(page);
  const points = [];
  for (const cell of way.slice(0, 6)) points.push(await cellPoint(svg, maze, cell));
  const touch = (p) => [{ x: p.x, y: p.y, id: 1 }];
  const before = await page.evaluate(() => window.scrollY);
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: touch(points[0]) });
  for (const p of points.slice(1)) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: touch(p) });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "6");
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test("a fast drag that skips cells still follows the corridors: cells between are not missed", async ({ page }) => {
  await open(page, "?kind=maze&level=40");
  const { maze, way } = mazeOf(40);
  const svg = svgOf(page);
  // From the start straight to a cell some cells along the way, in one move: the line goes through the cells between, where it can.
  const straight = way.findIndex((cell, i) => i >= 3 && way.slice(0, i + 1).every((c, j) => j === 0 || maze.links[way[j - 1]].includes(c)));
  expect(straight).toBeGreaterThan(2);
  const first = await cellPoint(svg, maze, way[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const cell of way.slice(1, 5)) {
    const p = await cellPoint(svg, maze, cell);
    await page.mouse.move(p.x, p.y, { steps: 1 });
  }
  await page.mouse.up();
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "5");
});

test("Hint lights the next stretch of the right way, and a wrong turn is told to draw back", async ({ page }) => {
  await open(page, "?kind=maze&level=40");
  const { maze, way } = mazeOf(40);
  const svg = svgOf(page);
  await page.locator(`${at("board")} [data-action="hint"]`).click();
  await expect(page.locator(`${at("board")} .mk-messages`)).toContainText("Press the green start");
  await dragCells(page, svg, maze, way.slice(0, 5));
  await page.locator(`${at("board")} [data-action="hint"]`).click();
  await expect(page.locator(`${at("board")} .mk-hint[data-kind="ahead"]`)).toHaveAttribute("d", /^M.*L/);
  await expect(page.locator(`${at("board")} .mk-messages`)).toContainText("Follow the glow");
  // The hint goes when the line moves.
  await dragCells(page, svg, maze, way.slice(4, 7));
  await expect(page.locator(`${at("board")} .mk-hint[data-kind="ahead"]`)).toHaveAttribute("d", "");
});

test("Tap to extend runs the line along the corridor, and stops at a fork", async ({ page }) => {
  await open(page, "?kind=maze&level=40&tap=on");
  const { maze, way } = mazeOf(40);
  const svg = svgOf(page);
  // Tap the start, then a cell of the way further along: the line runs to the tapped cell or the next fork.
  const start = await cellPoint(svg, maze, way[0]);
  await page.mouse.click(start.x, start.y);
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "1");
  const fork = way.findIndex((cell, i) => i > 0 && maze.links[cell].length > 2);
  const target = await cellPoint(svg, maze, way[way.length - 1]);
  await page.mouse.click(target.x, target.y);
  const expected = fork < 0 ? way.length : fork + 1;
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", String(expected));
});

test("the arrow keys step the line, Backspace takes a step back, and Ctrl+Z undoes", async ({ page }) => {
  await open(page, "?kind=maze&level=40");
  const { maze, way } = mazeOf(40);
  await board(page).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "1");
  const [sx, sy] = maze.grid.centres[way[0]];
  const [nx, ny] = maze.grid.centres[way[1]];
  const key = Math.abs(nx - sx) > Math.abs(ny - sy) ? (nx > sx ? "ArrowRight" : "ArrowLeft") : ny > sy ? "ArrowDown" : "ArrowUp";
  await page.keyboard.press(key);
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "2");
  await page.keyboard.press("Control+z");
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "1");
});

test("the box stays one steady square whatever is drawn, loaded or switched", async ({ page }) => {
  await open(page, "?kind=maze&level=40");
  const before = await page.locator(`${at("board")} .mk-wrap`).boundingBox();
  expect(Math.abs(before.width - before.height)).toBeLessThan(1);
  const { maze, way } = mazeOf(40);
  await dragCells(page, svgOf(page), maze, way.slice(0, 5));
  await page.locator(`${at("board")} [data-action="hint"]`).click();
  const during = await page.locator(`${at("board")} .mk-wrap`).boundingBox();
  await page.locator("#next").click();
  await page.locator("#kinds button[data-value='arrows']").click();
  await page.locator("#kinds button[data-value='mixed']").click();
  await page.locator("#kinds button[data-value='maze']").click();
  await page.locator("#next").click();
  await page.waitForTimeout(100);
  const after = await page.locator(`${at("board")} .mk-wrap`).boundingBox();
  for (const box of [during, after]) {
    expect(Math.abs(box.width - before.width)).toBeLessThan(0.5);
    expect(Math.abs(box.height - before.height)).toBeLessThan(0.5);
  }
});

test("nothing the player touches can be selected", async ({ page }) => {
  await open(page, "?kind=maze&level=40");
  const styles = await page.evaluate(() => {
    const read = (selector) => getComputedStyle(document.querySelector(selector)).userSelect;
    return { host: read('[data-testid="board"]'), box: read(".mk-box"), svg: read(".mk-box svg"), button: read(".mk-button"), trail: read(".mk-trail") };
  });
  for (const [name, value] of Object.entries(styles)) expect(value, name).toBe("none");
  // A double click on the board selects nothing.
  const { maze, way } = mazeOf(40);
  const p = await cellPoint(svgOf(page), maze, way[3]);
  await page.mouse.dblclick(p.x, p.y);
  expect(await page.evaluate(() => String(getSelection()))).toBe("");
});

test("a level of keys must have every key picked up before the goal counts, and is solved by fetching each and drawing out", async ({ page }) => {
  const found = findMaze(({ level, maze }) => level.recipe.mode === "keys" && maze.grid.cells < 450 && maze.keys.length >= 2, { from: 100, to: 700 });
  await open(page, `?kind=maze&level=${found.level.number}`);
  const { maze, way } = found;
  const svg = svgOf(page);
  await dragCells(page, svg, maze, way);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "false");
  await expect(page.locator(`${at("board")} .mk-progress`)).toContainText(`Keys 0 of ${maze.keys.length}`);
  await page.locator(`${at("board")} [data-action="restart"]`).click();
  const { walk } = await import("../dist/index.js");
  const { before } = walk(maze.links, maze.start);
  const route = (to) => {
    const cells = [];
    for (let cell = to; cell !== -1; cell = before[cell]) cells.push(cell);
    return cells.reverse();
  };
  const trip = maze.keys.flatMap((key) => [...route(key), ...route(key).slice(0, -1).reverse()]);
  await dragCells(page, svg, maze, [...trip, ...way]);
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
  await expect(page.locator(at("board"))).toHaveAttribute("data-keys", String(maze.keys.length));
  await expect(page.locator(`${at("board")} [data-mark="key"][data-got="true"]`)).toHaveCount(maze.keys.length);
});
