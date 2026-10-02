// Big mazes, looked at through the box: zoom by the wheel, the pad and a pinch, moved by two fingers or by a drag that starts
// anywhere but on the line, fitted again, drawn on while zoomed, and kept smooth: only what is on screen is in the page.
import { expect, test } from "@playwright/test";

import { along, at, board, cellPoint, dragCells, findMaze, noSidewaysScroll, open, shownWidth, touchDrag, twoTouches } from "./demo.mjs";

const svgOf = (page) => page.locator(`${at("board")} .mk-box svg`);
/** A big maze whose start is near the middle of the shape, so that a zoom about the start leaves it well inside the box, away from the edges that move the view. */
const centred = findMaze(({ maze, way, level }) => {
  const [x, y] = maze.grid.centres[way[0]];
  const { box } = maze.grid;
  return level.cells > 900 && level.cells < 4000 && way.length >= 12 && Math.abs(x - (box.x + box.w / 2)) < box.w * 0.12 && Math.abs(y - (box.y + box.h / 2)) < box.h * 0.12 && way.slice(0, 6).every((cell, i) => i === 0 || maze.links[way[i - 1]].includes(cell));
}, { from: 600, to: 900 });
const hugeMaze = findMaze(() => true, { from: 1024, to: 1024 });
const BIG = centred.level.number;
const mazeOf = () => centred;

test("the wheel zooms about the cursor, the pad zooms and Fit brings the whole maze back", async ({ page }) => {
  await open(page, `?kind=maze&level=${BIG}`);
  const svg = svgOf(page);
  const fitted = await shownWidth(svg);
  await expect(page.locator(`${at("board")} [data-action="fit"]`)).toBeDisabled();
  const { maze, way } = mazeOf();
  const start = await cellPoint(svg, maze, way[0]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.wheel(0, -500);
  await expect.poll(() => shownWidth(svg)).toBeLessThan(fitted * 0.8);
  // The cell under the cursor stays under it.
  const after = await cellPoint(svg, maze, way[0]);
  expect(Math.abs(after.x - start.x)).toBeLessThan(3);
  expect(Math.abs(after.y - start.y)).toBeLessThan(3);
  await expect(page.locator(`${at("board")} [data-action="fit"]`)).toBeEnabled();
  const zoomed = await shownWidth(svg);
  await page.locator(`${at("board")} [data-action="in"]`).click();
  await expect.poll(() => shownWidth(svg)).toBeLessThan(zoomed);
  await page.locator(`${at("board")} [data-action="out"]`).click();
  await page.locator(`${at("board")} [data-action="fit"]`).click();
  await expect.poll(() => shownWidth(svg)).toBeCloseTo(fitted, 1);
  await expect(page.locator(`${at("board")} [data-action="fit"]`)).toBeDisabled();
  // Zooming out past the whole maze stops a little past it.
  await page.mouse.move(start.x, start.y);
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(100);
  expect(await shownWidth(svg)).toBeLessThan(fitted * 1.2);
});

test("a pinch zooms, and two fingers moving together move the view", async ({ page }) => {
  await open(page, `?kind=maze&level=${BIG}`);
  const svg = svgOf(page);
  await svg.scrollIntoViewIfNeeded();
  const box = await board(page).boundingBox();
  const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const fitted = await shownWidth(svg);
  await twoTouches(page, board(page), along({ x: middle.x - 20, y: middle.y }, { x: middle.x - 60, y: middle.y }), along({ x: middle.x + 20, y: middle.y }, { x: middle.x + 60, y: middle.y }));
  await expect.poll(() => shownWidth(svg)).toBeLessThan(fitted * 0.6);
  const [x0] = (await svg.getAttribute("viewBox")).split(" ").map(Number);
  // Two fingers moved left together: the maze slides under them, so the view moves.
  await twoTouches(page, board(page), along({ x: middle.x + 20, y: middle.y }, { x: middle.x - 60, y: middle.y }), along({ x: middle.x + 60, y: middle.y }, { x: middle.x - 20, y: middle.y }));
  await expect.poll(async () => Math.abs(Number((await svg.getAttribute("viewBox")).split(" ")[0]) - x0)).toBeGreaterThan(1);
  // And a pinch inward zooms back out, no further than the whole maze.
  const zoomed = await shownWidth(svg);
  await twoTouches(page, board(page), along({ x: middle.x - 60, y: middle.y }, { x: middle.x - 20, y: middle.y }), along({ x: middle.x + 60, y: middle.y }, { x: middle.x + 20, y: middle.y }));
  await expect.poll(() => shownWidth(svg)).toBeGreaterThan(zoomed);
});

test("a drag that starts anywhere but on the line moves the view, and draws nothing", async ({ page }) => {
  await open(page, `?kind=maze&level=${BIG}`);
  const svg = svgOf(page);
  const { maze, way } = mazeOf();
  const start = await cellPoint(svg, maze, way[0]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.wheel(0, -900);
  await expect.poll(() => shownWidth(svg)).toBeLessThan(40);
  const [x0, y0] = (await svg.getAttribute("viewBox")).split(" ").map(Number);
  const box = await board(page).boundingBox();
  // Pressed in the far corner of the box (not on the start), dragged across it.
  await page.mouse.move(box.x + box.width - 40, box.y + box.height - 40);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  // The view is drawn on the next frame, so wait for it rather than reading it the moment the mouse is up.
  await expect.poll(async () => Number((await svg.getAttribute("viewBox")).split(" ")[0]) - x0).toBeGreaterThan(0.5);
  await expect.poll(async () => Number((await svg.getAttribute("viewBox")).split(" ")[1]) - y0).toBeGreaterThan(0.5);
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "0");
});

test("a line is drawn while zoomed in, and a line held near the edge of the box moves the view along", async ({ page }) => {
  await open(page, `?kind=maze&level=${BIG}`);
  const svg = svgOf(page);
  const { maze, way } = mazeOf();
  const start = await cellPoint(svg, maze, way[0]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.wheel(0, -1100);
  await expect.poll(() => shownWidth(svg)).toBeLessThan(30);
  await dragCells(page, svg, maze, way.slice(0, 5));
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "5");
  // Held near the right edge, the view moves toward it.
  const [x0] = (await svg.getAttribute("viewBox")).split(" ").map(Number);
  const head = await cellPoint(svg, maze, way[4]);
  const box = await board(page).boundingBox();
  await page.mouse.move(head.x, head.y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 10, head.y, { steps: 4 });
  await page.waitForTimeout(350);
  await page.mouse.up();
  const [x1] = (await svg.getAttribute("viewBox")).split(" ").map(Number);
  expect(x1).toBeGreaterThan(x0 + 0.5);
});

test("a huge maze stays smooth: only the walls on screen are in the page, and zooming it is quick", async ({ page }) => {
  const started = Date.now();
  await open(page, "?kind=maze&level=1024");
  expect(Date.now() - started).toBeLessThan(15000);
  const svg = svgOf(page);
  const cells = Number(await svg.getAttribute("data-cells"));
  expect(cells).toBeGreaterThan(5000);
  await noSidewaysScroll(page);
  const tiles = await page.locator(`${at("board")} .mk-walls path`).count();
  expect(tiles).toBeGreaterThan(5);
  const { maze, way } = hugeMaze;
  const start = await cellPoint(svg, maze, way[0]);
  await page.mouse.move(start.x, start.y);
  // Zoomed far in, a handful of tiles are in the page, not the whole maze's.
  await page.mouse.wheel(0, -1500);
  await expect.poll(() => shownWidth(svg)).toBeLessThan(40);
  const near = await page.locator(`${at("board")} .mk-walls path`).count();
  expect(near).toBeLessThanOrEqual(36);
  expect(near).toBeLessThan(tiles / 2);
  // Twenty wheel steps take well under a second and a half of the page's time.
  const took = await page.evaluate(async () => {
    const box = document.querySelector(".mk-box");
    const rect = box.getBoundingClientRect();
    const t0 = performance.now();
    for (let i = 0; i < 20; i += 1) {
      box.dispatchEvent(new WheelEvent("wheel", { deltaY: i % 2 === 0 ? 120 : -120, clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2, bubbles: true, cancelable: true }));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return performance.now() - t0;
  });
  expect(took).toBeLessThan(1500);
});

test("a huge maze can be touched at the start: a finger within a thumb's width of the start draws", async ({ page }) => {
  await open(page, "?kind=maze&level=1024");
  const svg = svgOf(page);
  const { maze, way } = hugeMaze;
  const start = await cellPoint(svg, maze, way[0]);
  const second = await cellPoint(svg, maze, way[1]);
  // At the whole maze's size a cell is a few pixels: a press beside the start is still the start.
  await touchDrag(page, board(page), [{ x: start.x + 6, y: start.y + 5 }, start, second]);
  await expect(page.locator(at("board"))).not.toHaveAttribute("data-cells", "0");
});
