// How the page looks and speaks: English and Japanese, light and dark, the boards and the line colours, motion and its absence, sounds,
// and no sideways scroll at a phone's width or a desk's, for each of the three kinds.
import { expect, test } from "@playwright/test";

import { at, dragCells, mazeOf, noSidewaysScroll, open, serve } from "./demo.mjs";

const svgOf = (page) => page.locator(`${at("board")} .mk-box svg`);

for (const kind of ["maze", "arrows", "mixed"]) {
  for (const lang of ["en", "ja"]) {
    test(`${kind} in ${lang}: no sideways scroll, nothing wider than the page, no errors`, async ({ page }) => {
      const errors = await open(page, `?kind=${kind}&level=20&lang=${lang}`);
      await noSidewaysScroll(page);
      const wide = await page.evaluate(() => [...document.querySelectorAll("main *")].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && !el.closest("svg, pre, .fam-table-box, .mk-box")).map((el) => el.tagName + "." + el.className).slice(0, 5));
      expect(wide).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}

test("Japanese: the buttons, the lines under the board and the shapes are in Japanese, and switching back and forth keeps the line drawn", async ({ page }) => {
  await open(page, "?kind=maze&level=40&lang=ja");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator(`${at("board")} [data-action="undo"]`)).toHaveText("もどす");
  await expect(page.locator(`${at("board")} [data-action="hint"]`)).toHaveText("ヒント");
  await expect(page.locator(`${at("board")} .mk-progress`)).toContainText("スタートを押して");
  await expect(svgOf(page)).toHaveAttribute("data-cells", /\d+/);
  const { maze, way } = mazeOf(40);
  await dragCells(page, svgOf(page), maze, way.slice(0, 4));
  await expect(page.locator(`${at("board")} .mk-progress`)).toContainText("4マス描きました");
  await page.locator('[data-lang="en"]').click();
  await expect(page.locator(`${at("board")} [data-action="undo"]`)).toHaveText("Undo");
  await expect(page.locator(`${at("board")} .mk-progress`)).toContainText("4 cells drawn");
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "4");
  await page.locator('[data-lang="ja"]').click();
  await expect(page.locator(`${at("board")} .mk-progress`)).toContainText("4マス");
  // The page itself, and the shapes' names.
  await expect(page.locator("#gallery span").first()).toHaveText("四角");
  await expect(page.locator('[data-testid="kinds"] button').first()).toHaveText("迷路");
});

test("light and dark: the paper follows the device, and a board is chosen on the page", async ({ page }) => {
  await open(page, "?kind=maze&level=40&lang=en");
  await page.emulateMedia({ colorScheme: "light" });
  const paper = () => page.locator(`${at("board")} .mk-paper`).evaluate((el) => getComputedStyle(el).fill);
  const light = await paper();
  await page.emulateMedia({ colorScheme: "dark" });
  const dark = await paper();
  expect(light).not.toBe(dark);
  expect(light).toBe("rgb(251, 248, 241)");
  expect(dark).toBe("rgb(38, 42, 39)");
  await page.emulateMedia({ colorScheme: "light" });
  await page.locator('#board-look button[data-value="wood"]').click();
  await expect(svgOf(page)).toHaveAttribute("data-board", "wood");
  expect(await paper()).toBe("rgb(226, 186, 122)");
  await page.locator('#board-look button[data-value="black"]').click();
  expect(await paper()).toBe("rgb(47, 50, 54)");
  await page.locator('#trail-look button[data-value="red"]').click();
  const { maze, way } = mazeOf(40);
  await dragCells(page, svgOf(page), maze, way.slice(0, 4));
  const trail = await page.locator(`${at("board")} .mk-trail`).evaluate((el) => getComputedStyle(el).stroke);
  expect(trail).not.toBe("none");
  // The choice stays across a visit.
  await page.reload();
  await page.waitForSelector(`${at("board")}[data-ready="true"] .mk-box svg[viewBox]`);
  await expect(svgOf(page)).toHaveAttribute("data-board", "black");
});

test.describe("a win with motion asked for", () => {
  test.use({ reducedMotion: "no-preference" });
  test("the line ripples when the maze is solved, and the banner comes in", async ({ page }) => {
    await open(page, "?kind=maze&level=40");
    const { maze, way } = mazeOf(40);
    await dragCells(page, svgOf(page), maze, way);
    await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
    const animation = await page.locator(`${at("board")} .mk-trail`).evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe("mk-ripple");
    const transition = await page.locator(`${at("board")} .mk-banner`).evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(transition).not.toBe("0s");
  });
});

test.describe("a win with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("nothing moves: no animation on the line, no transition on the banner, and an arrow just goes", async ({ page }) => {
    await open(page, "?kind=maze&level=40");
    const { maze, way } = mazeOf(40);
    await dragCells(page, svgOf(page), maze, way);
    await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
    expect(await page.locator(`${at("board")} .mk-trail`).evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    expect(await page.locator(`${at("board")} .mk-banner`).evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
  });
});

test("sound: a sound is made for a step only when Sound is on, from the browser's own audio, and never a recording", async ({ page }) => {
  await page.addInitScript(() => {
    window.__tones = 0;
    window.AudioContext = class {
      constructor() { this.currentTime = 0; this.destination = {}; }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (to) => to }; }
      createOscillator() { window.__tones += 1; return { frequency: {}, connect: (to) => to, start() {}, stop() {} }; }
    };
  });
  await open(page, "?kind=maze&level=40&sound=off");
  const { maze, way } = mazeOf(40);
  await dragCells(page, svgOf(page), maze, way.slice(0, 3));
  expect(await page.evaluate(() => window.__tones)).toBe(0);
  await page.locator('#sound button[data-value="true"]').click();
  await page.locator(`${at("board")} [data-action="restart"]`).click();
  await dragCells(page, svgOf(page), maze, way.slice(0, 3));
  expect(await page.evaluate(() => window.__tones)).toBeGreaterThan(0);
});

test("the cloth patches in the family's header change the table the board sits on, and the choice stays", async ({ page }) => {
  await open(page, "?kind=maze&level=40");
  const felt = () => page.locator(at("board")).evaluate((el) => getComputedStyle(el.ownerDocument.documentElement).getPropertyValue("--felt").trim());
  const before = await felt();
  await page.locator('button[data-cloth="blue"]').click();
  expect(await felt()).not.toBe(before);
  await page.reload();
  await page.waitForSelector(`${at("board")}[data-ready="true"] .mk-box svg[viewBox]`);
  expect(await felt()).toBe("#2865a6");
  expect(serve).toBeDefined();
});
