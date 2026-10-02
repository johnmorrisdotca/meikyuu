// Choosing a level: the three kinds, the shapes, sizes and ways to play, the level number and its arrows, the gallery of shapes,
// and what is kept between visits.
import { expect, test } from "@playwright/test";

import { at, mazeOf, noSidewaysScroll, open } from "./demo.mjs";
import { findMazeLevels, levelCount } from "../dist/levels.js";

const info = (page) => page.locator("#info");

test("a first visit starts at level 1 of the mazes, which is small and plain", async ({ page }) => {
  const errors = await open(page, "");
  await expect(page.locator("#level-input")).toHaveValue("1");
  await expect(page.locator("#level-of")).toContainText("1024");
  await expect(page.locator("#previous")).toBeDisabled();
  await expect(info(page)).toContainText("Square");
  await expect(info(page)).toContainText("Small · level 1 of 256");
  await expect(info(page)).toContainText(/difficulty \d+ of 100/);
  expect(errors).toEqual([]);
  await noSidewaysScroll(page);
});

test("the arrows step to the next and the previous level, and a number typed goes straight to it", async ({ page }) => {
  await open(page, "");
  await page.locator("#next").click();
  await expect(page.locator("#level-input")).toHaveValue("2");
  await expect(page.locator(at("board"))).toHaveAttribute("data-level", "2");
  await page.locator("#previous").click();
  await expect(page.locator("#level-input")).toHaveValue("1");
  await page.locator("#level-input").fill("500");
  await page.locator("#level-input").press("Enter");
  await expect(page.locator(at("board"))).toHaveAttribute("data-level", "500");
  const { level } = mazeOf(500);
  await expect(info(page)).toContainText(`${level.cells} cells`);
  await page.locator("#level-input").fill("1000000");
  await page.locator("#level-input").press("Enter");
  await expect(page.locator(at("board"))).toHaveAttribute("data-level", "1024");
  await expect(page.locator("#next")).toBeDisabled();
});

test("the difficulty shown climbs inside each size, from its easy third to its hard one, and each size ends harder than the one before", async ({ page }) => {
  await open(page, "");
  let top = 0;
  for (const first of [0, 256, 512, 768]) {
    let before = 0;
    for (const place of [10, 128, 246]) {
      const number = first + place;
      await page.locator("#level-input").fill(String(number));
      await page.locator("#level-input").press("Enter");
      await expect(page.locator(at("board"))).toHaveAttribute("data-level", String(number));
      const score = Number(/difficulty (\d+) of 100/.exec(await info(page).textContent())[1]);
      expect(score).toBeGreaterThan(before);
      before = score;
    }
    // The end of a size is harder than the end of the one before.
    expect(before).toBeGreaterThan(top);
    top = before;
  }
  expect(top).toBeGreaterThan(90);
});

test("the shape, the size and the way to play narrow the levels, and the arrows step through only those", async ({ page }) => {
  await open(page, "");
  await page.locator('#shapes button[data-value="heart"]').click();
  const hearts = findMazeLevels({ shape: "heart" });
  await expect(page.locator(at("board"))).toHaveAttribute("data-level", String(hearts[0].number));
  await expect(info(page)).toContainText("Heart");
  await expect(info(page)).toContainText(`${hearts.length} levels match`);
  await page.locator("#next").click();
  await expect(page.locator(at("board"))).toHaveAttribute("data-level", String(hearts[1].number));
  await page.locator('#modes button[data-value="keys"]').click();
  const keys = findMazeLevels({ shape: "heart", mode: "keys" });
  await expect(info(page)).toContainText(`${keys.length} levels match`);
  await page.locator('#sizes button[data-value="large"]').click();
  const large = findMazeLevels({ shape: "heart", mode: "keys", size: "large" });
  if (large.length > 0) await expect(info(page)).toContainText(`${large.length} levels match`);
  await page.locator('#shapes button[data-value="all"]').click();
  await page.locator('#modes button[data-value="all"]').click();
  await page.locator('#sizes button[data-value="all"]').click();
  await expect(info(page)).not.toContainText("levels match");
});

test("the three kinds each have their own list and their own place in it", async ({ page }) => {
  await open(page, "");
  await page.locator("#next").click();
  await page.locator('#kinds button[data-value="arrows"]').click();
  await expect(page.locator("#level-of")).toContainText(String(levelCount("arrows")));
  await expect(page.locator(at("board"))).toHaveAttribute("data-kind", "arrows");
  await expect(page.locator("#maze-filters")).toBeHidden();
  await page.locator("#next").click();
  await page.locator("#next").click();
  await page.locator('#kinds button[data-value="mixed"]').click();
  await expect(page.locator("#level-of")).toContainText(String(levelCount("mixed")));
  await expect(info(page)).toContainText("locked");
  await page.locator('#kinds button[data-value="maze"]').click();
  await expect(page.locator("#level-input")).toHaveValue("2");
  await page.locator('#kinds button[data-value="arrows"]').click();
  await expect(page.locator("#level-input")).toHaveValue("3");
  // Kept across a visit.
  await page.reload();
  await page.waitForSelector(`${at("board")}[data-ready="true"] .mk-box svg[viewBox]`);
  await expect(page.locator(at("board"))).toHaveAttribute("data-kind", "arrows");
  await expect(page.locator("#level-input")).toHaveValue("3");
});

test("the gallery shows each shape as a maze, and pressing one plays that shape's levels", async ({ page }) => {
  await open(page, "");
  await expect(page.locator("#gallery li")).toHaveCount(13);
  await expect(page.locator("#gallery svg")).toHaveCount(13);
  await page.locator('#gallery button[data-shape="star"]').click();
  await expect(info(page)).toContainText("Star");
  await expect(page.locator('#shapes button[data-value="star"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator('#gallery button[data-shape="circle"]').click();
  await expect(page.locator(`${at("board")} .mk-box svg`)).toHaveAttribute("data-shape", "circle");
  // The gallery is a grid of several to a row, not a long column, at a phone's width and a desk's.
  const tops = await page.evaluate(() => [...document.querySelectorAll("#gallery li")].slice(0, 4).map((el) => Math.round(el.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBeLessThan(4);
});

test("a level asked for in the address is shown even if the filters kept would hide it", async ({ page }) => {
  await open(page, "?shape=heart&kind=maze&level=3");
  await expect(page.locator(at("board"))).toHaveAttribute("data-level", "3");
});
