// Touch on a phone, with a tall maze: one finger draws, so it must not scroll the page, and the page must still have somewhere to be scrolled
// from. The page keeps a gutter beside the box (24 px at least) where a touch is the browser's; the box alone keeps touches to itself; a pinch
// with nothing left to zoom out of widens the gutters; two fingers move the zoomed view while one draws; a line drawn to the edge moves the
// view along, or not, as asked. The scrolling is done by Chromium's own touch gesture (a real swipe, handled by the browser as it would be), the
// drawing by its touch protocol too, at 390 x 844 and at 360 x 740.
import { expect, test } from "@playwright/test";

import { at, bare, board, cellPoint, findTall, noSidewaysScroll, open, touchDrag, twoTouches, along } from "./demo.mjs";

const svgOf = (page) => page.locator(`${at("board")} .mk-box svg`);
const GUTTER = 24;

// These are about a phone held upright; the desk's own are in orientation.demo.mjs.
test.beforeEach(({ browserName }, info) => test.skip(browserName === "chromium" && info.project.name === "chromium-desk", "a phone touch"));

/** The tallest tall maze that has no keys and runs from near its top to near its bottom: the longest walk in the biggest size. */
const tallest = findTall(({ level, maze, way }) => {
  if (level.size !== 6 || level.recipe.shape !== "square" || maze.keys.length > 0) return false;
  const { box } = maze.grid;
  const top = maze.grid.centres[way[0]][1];
  const foot = maze.grid.centres[way[way.length - 1]][1];
  return Math.abs(top - foot) > box.h * 0.7 && way.length > 80;
});

/** A touch the way Chromium makes one, through its protocol: down, along the points, up. Touch points are pixels of the page. */
async function cdpDraw(page, points, { lift = true } = {}) {
  const client = await page.context().newCDPSession(page);
  const touch = (p) => [{ x: p.x, y: p.y, id: 1 }];
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: touch(points[0]) });
  for (const p of points.slice(1)) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: touch(p) });
  if (lift) await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  return client;
}

/**
 * A real swipe by touch at a point, `distance` pixels up the screen (the page scrolls down): Chromium's own touch events, so the browser decides what the
 * touch does. Made of touch events and not of `Input.synthesizeScrollGesture`, which scrolls on a Mac but does nothing in Linux's headless Chromium.
 */
async function swipeUp(page, x, y, distance) {
  const client = await page.context().newCDPSession(page);
  const touch = (at) => [{ x, y: at, id: 1 }];
  const steps = 15;
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: touch(y) });
  for (let step = 1; step <= steps; step += 1) {
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: touch(y - (distance * step) / steps) });
    await page.waitForTimeout(16);
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await client.detach();
}

const scrollY = (page) => page.evaluate(() => window.scrollY);
const boxOf = async (page) => (await board(page).boundingBox());

/** The cells of the way, as pixels now, for a finger to follow. */
async function pointsOf(page, { maze, way }, cells = way) {
  const svg = svgOf(page);
  const out = [];
  for (const cell of cells) out.push(await cellPoint(svg, maze, cell));
  return out;
}

test.describe("the page beside the box", () => {
  test("is always there: the box is never wider than the window less a gutter each side, and only the box keeps touches", async ({ page }) => {
    await open(page, `?kind=tall&level=${tallest.level.number}`);
    const window_ = page.viewportSize();
    const box = await boxOf(page);
    expect(box.x).toBeGreaterThanOrEqual(GUTTER - 0.5);
    expect(window_.width - (box.x + box.width)).toBeGreaterThanOrEqual(GUTTER - 0.5);
    // A touch beside the box is a touch on the page, and the box alone asks the browser to leave touches to it.
    expect(await board(page).evaluate((element) => getComputedStyle(element).touchAction)).toBe("none");
    expect(await page.locator(at("board")).evaluate((element) => getComputedStyle(element).touchAction)).toContain("pan-y");
    const beside = await page.evaluate(({ x, y }) => ({ found: document.elementFromPoint(x, y) !== null, inBox: Boolean(document.elementFromPoint(x, y)?.closest(".mk-box")) }), { x: GUTTER / 2, y: Math.min(box.y + box.height / 2, page.viewportSize().height - 10) });
    expect(beside).toEqual({ found: true, inBox: false });
    await noSidewaysScroll(page);
  });

  test("scrolls the page under a swipe, where a swipe on the box does not", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "a real touch swipe is made through Chromium's own protocol");
    await open(page, `?kind=tall&level=${tallest.level.number}`);
    await page.locator(at("board")).evaluate((element) => element.scrollIntoView({ block: "center" }));
    const box = await boxOf(page);
    const middle = Math.min(Math.max(box.y + box.height / 2, 120), page.viewportSize().height - 120);
    const before = await scrollY(page);
    // On the box: it is the board's, nothing scrolls, and nothing is drawn (the swipe did not start on the line).
    await swipeUp(page, box.x + box.width / 2, middle, 180);
    expect(await scrollY(page)).toBe(before);
    await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "0");
    // Beside it: the page scrolls.
    await swipeUp(page, GUTTER / 2, middle, 180);
    await expect.poll(() => scrollY(page)).toBeGreaterThan(before + 60);
  });
});

test.describe("a line from the top to the bottom of the tallest tall maze", () => {
  test("is drawn by one finger at the size the box fits, and the page does not move", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Chromium's touch protocol");
    await open(page, `?kind=tall&level=${tallest.level.number}`);
    await svgOf(page).scrollIntoViewIfNeeded();
    const before = await scrollY(page);
    const points = await pointsOf(page, tallest);
    await cdpDraw(page, points);
    await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
    await expect(page.locator(at("board"))).toHaveAttribute("data-cells", String(tallest.way.length));
    expect(await scrollY(page)).toBe(before);
  });

  test("is drawn by one finger on a board whose box is the smallest the page makes (360 across)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Chromium's touch protocol");
    await page.setViewportSize({ width: 360, height: 740 });
    await open(page, `?kind=tall&level=${tallest.level.number}`);
    await svgOf(page).scrollIntoViewIfNeeded();
    const box = await boxOf(page);
    expect(box.x).toBeGreaterThanOrEqual(GUTTER - 0.5);
    expect(360 - (box.x + box.width)).toBeGreaterThanOrEqual(GUTTER - 0.5);
    const before = await scrollY(page);
    await cdpDraw(page, await pointsOf(page, tallest));
    await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
    expect(await scrollY(page)).toBe(before);
  });

  test("is drawn zoomed in, a stretch at a time: one finger draws, two fingers move the view to the next stretch, and the page does not move", async ({ page }) => {
    await open(page, `?kind=tall&level=${tallest.level.number}`);
    const svg = svgOf(page);
    await svg.scrollIntoViewIfNeeded();
    const before = await scrollY(page);
    const { maze, way } = tallest;
    for (let i = 0; i < 4; i += 1) await page.locator(`${at("board")} [data-action="in"]`).click();
    const fitted = 342;
    expect(Number((await svg.getAttribute("viewBox")).split(" ")[2])).toBeLessThan(fitted / 20);
    let drawn = 0;
    for (let guard = 0; guard < 120 && drawn < way.length; guard += 1) {
      const box = await boxOf(page);
      const inside = (p) => p.x > box.x + 50 && p.x < box.x + box.width - 50 && p.y > box.y + 50 && p.y < box.y + box.height - 50;
      const first = Math.max(0, drawn - 1);
      const ahead = [];
      for (const cell of way.slice(first, first + 6)) ahead.push(await cellPoint(svg, maze, cell));
      const focus = { x: ahead.reduce((a, p) => a + p.x, 0) / ahead.length, y: ahead.reduce((a, p) => a + p.y, 0) / ahead.length };
      const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      if (!ahead.every(inside)) {
        // Two fingers carry the view: the stretch about to be drawn is moved to the middle of the box (as far as the view may go).
        const dx = Math.max(-120, Math.min(120, middle.x - focus.x));
        const dy = Math.max(-120, Math.min(120, middle.y - focus.y));
        const a = { x: middle.x - 40, y: middle.y };
        const b = { x: middle.x + 40, y: middle.y };
        await twoTouches(page, board(page), along(a, { x: a.x + dx, y: a.y + dy }, 6), along(b, { x: b.x + dx, y: b.y + dy }, 6));
        await page.waitForTimeout(60);
        const again = [];
        for (const cell of way.slice(first, first + 6)) again.push(await cellPoint(svg, maze, cell));
        if (!again[0] || !inside(again[0]) || !inside(again[1] ?? again[0])) continue;
      }
      // One finger, from the end of the line (or the start), through as many cells as stay well inside the box.
      const stretch = [];
      for (let k = first; k < way.length; k += 1) {
        const p = await cellPoint(svg, maze, way[k]);
        if (!inside(p)) break;
        stretch.push(p);
        if (stretch.length >= 12) break;
      }
      if (stretch.length < 2) continue;
      await touchDrag(page, board(page), stretch);
      const cells = Number(await page.locator(at("board")).getAttribute("data-cells"));
      expect(cells).toBeGreaterThan(drawn);
      drawn = cells;
    }
    await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
    await expect(page.locator(at("board"))).toHaveAttribute("data-cells", String(way.length));
    expect(await scrollY(page)).toBe(before);
  });

  test("is drawn zoomed out as far as the page lets it be, with the gutters wide and the page still scrolling from them", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Chromium's touch protocol");
    await open(page, `?kind=tall&level=${tallest.level.number}`);
    await svgOf(page).scrollIntoViewIfNeeded();
    const out = page.locator(`${at("board")} [data-action="out"]`);
    // The whole maze is in the box already, so each press of minus widens the gutters a step, to 72 px.
    // The first press zooms the maze out to a little past the fit, the next two widen the gutters a step each, and then there is no more to zoom out.
    for (let i = 0; i < 4 && (await out.isEnabled()); i += 1) await out.click();
    await expect(page.locator(at("board"))).toHaveAttribute("data-gutter", "72");
    await expect(out).toBeDisabled();
    const box = await boxOf(page);
    expect(box.x).toBeGreaterThanOrEqual(72 - 1);
    // The page scrolls from the wide gutter, and the maze still draws, top to bottom.
    await page.evaluate(() => window.scrollTo(0, 100));
    const middle = box.y + box.height / 2;
    const scrolled = await scrollY(page);
    await swipeUp(page, 36, middle, 160);
    await expect.poll(() => scrollY(page)).toBeGreaterThan(scrolled + 50);
    await svgOf(page).scrollIntoViewIfNeeded();
    const held = await scrollY(page);
    await cdpDraw(page, await pointsOf(page, tallest));
    await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
    expect(await scrollY(page)).toBe(held);
    // Plus brings the gutters back, a step at a time, before it zooms.
    const plus = page.locator(`${at("board")} [data-action="in"]`);
    await plus.click();
    await expect(page.locator(at("board"))).toHaveAttribute("data-gutter", "48");
    await page.locator(`${at("board")} [data-action="fit"]`).click();
    await expect(page.locator(at("board"))).toHaveAttribute("data-gutter", "24");
  });
});

test("a pinch of two fingers coming together, with the whole maze in the box, widens the gutters; apart, narrows them", async ({ page }) => {
  await open(page, `?kind=tall&level=${tallest.level.number}`);
  await svgOf(page).scrollIntoViewIfNeeded();
  const box = await boxOf(page);
  const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await twoTouches(page, board(page), along({ x: middle.x - 110, y: middle.y }, { x: middle.x - 40, y: middle.y }, 8), along({ x: middle.x + 110, y: middle.y }, { x: middle.x + 40, y: middle.y }, 8));
  const widened = Number(await page.locator(at("board")).getAttribute("data-gutter"));
  expect(widened).toBeGreaterThan(GUTTER + 10);
  // Apart again: the gutters come in before the maze is zoomed.
  const wide = await boxOf(page);
  const centre = { x: wide.x + wide.width / 2, y: wide.y + wide.height / 2 };
  await twoTouches(page, board(page), along({ x: centre.x - 40, y: centre.y }, { x: centre.x - 110, y: centre.y }, 8), along({ x: centre.x + 40, y: centre.y }, { x: centre.x + 110, y: centre.y }, 8));
  expect(Number(await page.locator(at("board")).getAttribute("data-gutter"))).toBeLessThan(widened);
});

test("two fingers move a zoomed maze and draw nothing; one finger on the end of the line carries on drawing, and one finger elsewhere moves the view too", async ({ page }) => {
  await open(page, `?kind=tall&level=${tallest.level.number}`);
  const svg = svgOf(page);
  await svg.scrollIntoViewIfNeeded();
  const { maze, way } = tallest;
  for (let i = 0; i < 3; i += 1) await page.locator(`${at("board")} [data-action="in"]`).click();
  const start = await cellPoint(svg, maze, way[0]);
  const box = await boxOf(page);
  const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const viewX = async () => Number((await svg.getAttribute("viewBox")).split(" ")[0]);
  const x0 = await viewX();
  await twoTouches(page, board(page), along({ x: middle.x - 30, y: middle.y }, { x: middle.x - 130, y: middle.y }, 6), along({ x: middle.x + 30, y: middle.y }, { x: middle.x - 70, y: middle.y }, 6));
  await expect.poll(async () => Math.abs((await viewX()) - x0)).toBeGreaterThan(0.5);
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "0");
  void start;
  // One finger pressed away from the line moves the view, as a hand does a map.
  const x1 = await viewX();
  await touchDrag(page, board(page), along({ x: middle.x + 60, y: middle.y }, { x: middle.x - 40, y: middle.y }, 6));
  await expect.poll(async () => Math.abs((await viewX()) - x1)).toBeGreaterThan(0.3);
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "0");
});

test("the Move button makes every one-finger drag move the view, even one that begins on the start; pressed again, it draws", async ({ page }) => {
  await open(page, `?kind=tall&level=${tallest.level.number}`);
  const svg = svgOf(page);
  await svg.scrollIntoViewIfNeeded();
  const { maze, way } = tallest;
  for (let i = 0; i < 2; i += 1) await page.locator(`${at("board")} [data-action="in"]`).click();
  const move = page.locator(`${at("board")} [data-action="pan"]`);
  await move.click();
  await expect(move).toHaveAttribute("aria-pressed", "true");
  const viewBox = async () => (await svg.getAttribute("viewBox")).split(" ").map(Number);
  const before = await viewBox();
  const start = await cellPoint(svg, maze, way[0]);
  const box = await boxOf(page);
  const target = { x: Math.min(box.x + box.width - 30, start.x + 60), y: Math.min(box.y + box.height - 30, start.y + 60) };
  await touchDrag(page, board(page), along(start, target, 6));
  await expect.poll(async () => Math.abs((await viewBox())[0] - before[0]) + Math.abs((await viewBox())[1] - before[1])).toBeGreaterThan(0.3);
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "0");
  await move.click();
  await expect(move).toHaveAttribute("aria-pressed", "false");
  const now = await cellPoint(svg, maze, way[0]);
  const second = await cellPoint(svg, maze, way[1]);
  await touchDrag(page, board(page), [now, second]);
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "2");
});

test.describe("a line drawn to the edge of a zoomed box", () => {
  /** A page of nothing but a tall board, zoomed in, with the line's first stretch drawn, to be held at the edge. */
  async function zoomed(page, attributes) {
    const { level } = tallest;
    await bare(page, `<meikyuu-board id="a" recipe="${level.code}" ratio="2/3" ${attributes}></meikyuu-board>`);
    await expect(page.locator("#a .mk-box svg[viewBox]")).toBeVisible();
    for (let i = 0; i < 3; i += 1) await page.locator('#a [data-action="in"]').click();
  }

  test("moves the view along, gently, and not when it is turned off", async ({ page }) => {
    const { maze, way } = tallest;
    for (const [attributes, moves] of [["", true], ['edge-pan="off"', false]]) {
      await zoomed(page, attributes);
      const svg = page.locator("#a .mk-box svg");
      const viewX = async () => Number((await svg.getAttribute("viewBox")).split(" ")[0]);
      const start = await cellPoint(svg, maze, way[0]);
      const box = await page.locator("#a .mk-box").boundingBox();
      // Draw the first cell, then carry the end of the line to a spot near the right edge of the box and hold it.
      await touchDrag(page, page.locator("#a .mk-box"), [start, await cellPoint(svg, maze, way[1])], { lift: false });
      const x0 = await viewX();
      await page.locator("#a .mk-box").evaluate((element, { x, y }) => {
        element.dispatchEvent(new PointerEvent("pointermove", { pointerId: 7, pointerType: "touch", isPrimary: true, buttons: 1, clientX: x, clientY: y, bubbles: true, cancelable: true }));
      }, { x: box.x + box.width - 6, y: box.y + box.height / 2 });
      await page.waitForTimeout(400);
      const moved = (await viewX()) - x0;
      if (moves) expect(moved).toBeGreaterThan(0.2);
      else expect(Math.abs(moved)).toBeLessThan(0.01);
      await page.locator("#a .mk-box").evaluate((element) => element.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7, pointerType: "touch", isPrimary: true, bubbles: true, cancelable: true })));
    }
  });
});
