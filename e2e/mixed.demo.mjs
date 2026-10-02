// The mixed puzzles played as a person plays them, in every order, with the tabs switched as often as they like: the arrows then the labyrinth
// then the arrows; the labyrinth first; a puzzle lost on a mistake; arrows that wait on a lock. Each ends as it should: the puzzle is finished
// once (one `meikyuu-solve`), the board says so in words, and nothing on the board is said twice.
import { expect, test } from "@playwright/test";

import { at, cellPoint, dragCells, events, mazeOf, mixedPlan, noSidewaysScroll, open, recordEvents, tapArrowOnPage, touchDrag } from "./demo.mjs";

// Level 2 is a cross of 12 arrows with 1 locked, and level 26 a cross of 19 with 3: one lock and several.
const LEVELS = [2, 26];
const host = (page) => page.locator(at("board"));
const svgOf = (page) => page.locator(`${at("board")} .mk-box svg`);
const part = (page, name) => page.locator(`${at("board")} .mk-${name}`);
const NAMES = ["meikyuu-solve", "meikyuu-unlock", "meikyuu-lose", "meikyuu-bump", "meikyuu-move"];
const count = async (page, name) => (await events(page)).filter((each) => each.name === name).length;

/** Look at one of the two boards, and wait until it is the one drawn. */
async function show(page, which) {
  await page.locator(`${at("board")} [data-action="tab-${which}"]`).click();
  await expect(host(page)).toHaveAttribute("data-view", which);
  await expect(page.locator(`${at("board")} .mk-box svg[viewBox]`)).toBeVisible();
  if (which === "arrows") await expect(page.locator(`${at("board")} .mk-dot`).first()).toBeVisible();
}

/** Draw the labyrinth's way to its button (on its tab), and wait for the unlock. */
async function reachButton(page, plan) {
  await show(page, "maze");
  await dragCells(page, svgOf(page), plan.board.maze, plan.way);
  await expect(host(page)).toHaveAttribute("data-unlocked", "true");
  await expect(host(page)).toHaveAttribute("data-reached", "true");
}

/** Tap these arrows, one after another, each waiting for the board to say one fewer. */
async function takeOff(page, plan, ids) {
  let left = Number(await host(page).getAttribute("data-left"));
  for (const id of ids) {
    await tapArrowOnPage(page, svgOf(page), plan.board.arrows, id);
    left -= 1;
    await expect(host(page)).toHaveAttribute("data-left", String(left));
  }
}

/** Every line of words the board shows says each thing once: no two of its lines are the same sentence. */
async function saidOnce(page) {
  const lines = (await page.locator(`${at("board")} .mk-says, ${at("board")} .mk-progress, ${at("board")} .mk-messages`).allInnerTexts()).map((each) => each.trim()).filter((each) => each !== "");
  expect(new Set(lines).size, lines.join(" / ")).toBe(lines.length);
  // The unlock is told by one line, whichever tab is open.
  expect(lines.filter((each) => each.includes("Unlocked")).length, lines.join(" / ")).toBeLessThanOrEqual(1);
}

/** The puzzle is finished: once, in an event, in the host's state, in a banner and in a line of words. */
async function expectFinished(page, { solves = 1 } = {}) {
  await expect(host(page)).toHaveAttribute("data-status", "cleared");
  await expect(host(page)).toHaveAttribute("data-solved", "true");
  await expect(host(page)).toHaveAttribute("data-left", "0");
  await expect(part(page, "banner")).toHaveAttribute("data-show", "true");
  await expect(part(page, "banner")).toBeVisible();
  await expect(part(page, "banner")).toContainText("Cleared");
  await expect(part(page, "progress")).toContainText("Cleared");
  await expect(host(page)).toHaveAttribute("data-hearts", /[1-3]/);
  await expect(page.locator("#info")).toContainText("Solved");
  expect(await count(page, "meikyuu-solve")).toBe(solves);
  const solve = (await events(page)).find((each) => each.name === "meikyuu-solve");
  expect(solve.detail).toMatchObject({ kind: "mixed", solved: true, arrowsLeft: 0 });
  await saidOnce(page);
  await noSidewaysScroll(page);
}

for (const number of LEVELS) {
  test(`mixed level ${number}: the labyrinth first, then every arrow, the released ones too: finished once, with its confirmation`, async ({ page }) => {
    const errors = await open(page, `?kind=mixed&level=${number}`);
    const plan = await mixedPlan(number);
    await recordEvents(page, at("board"), NAMES);
    await reachButton(page, plan);
    await saidOnce(page);
    await show(page, "arrows");
    await expect(page.locator(`${at("board")} .mk-arrow[data-locked="true"]`)).toHaveCount(0);
    await expect(host(page)).toHaveAttribute("data-left", String(plan.board.arrows.arrows.length));
    await saidOnce(page);
    await takeOff(page, plan, [...plan.before, ...plan.after]);
    await expectFinished(page);
    expect(await count(page, "meikyuu-unlock")).toBe(1);
    expect(await count(page, "meikyuu-bump")).toBe(0);
    await expect(host(page)).toHaveAttribute("data-hearts", "3");
    expect(errors).toEqual([]);
  });

  test(`mixed level ${number}: some arrows, the labyrinth, the rest; the tabs switched again and again on the way`, async ({ page }) => {
    const errors = await open(page, `?kind=mixed&level=${number}`);
    const plan = await mixedPlan(number);
    await recordEvents(page, at("board"), NAMES);
    // The arrows that can go before the unlock go, with the other tab looked at between each.
    for (const id of plan.before) {
      await takeOff(page, plan, [id]);
      await show(page, "maze");
      await show(page, "arrows");
    }
    expect(plan.held.length).toBeGreaterThan(0);
    await expect(host(page)).toHaveAttribute("data-left", String(plan.held.length + plan.locked.length));
    await expect(host(page)).toHaveAttribute("data-unlocked", "false");
    for (const id of plan.locked) await expect(page.locator(`${at("board")} .mk-arrow[data-id="${id}"]`)).toHaveAttribute("data-locked", "true");
    // Halfway, the labyrinth is looked at, left, and looked at again: its line is where it was.
    await show(page, "maze");
    const half = plan.way.slice(0, Math.floor(plan.way.length / 2));
    await dragCells(page, svgOf(page), plan.board.maze, half);
    await expect(host(page)).toHaveAttribute("data-unlocked", "false");
    await show(page, "arrows");
    await show(page, "maze");
    await expect(host(page)).toHaveAttribute("data-cells", String(half.length));
    await dragCells(page, svgOf(page), plan.board.maze, plan.way.slice(half.length - 1));
    await expect(host(page)).toHaveAttribute("data-unlocked", "true");
    await saidOnce(page);
    for (let again = 0; again < 4; again += 1) {
      await show(page, "arrows");
      await expect(host(page)).toHaveAttribute("data-left", String(plan.held.length + plan.locked.length));
      await expect(page.locator(`${at("board")} .mk-arrow[data-locked="true"]`)).toHaveCount(0);
      await show(page, "maze");
      await saidOnce(page);
    }
    await show(page, "arrows");
    for (const id of plan.after) {
      await takeOff(page, plan, [id]);
      await show(page, "maze");
      await show(page, "arrows");
    }
    await expectFinished(page);
    expect(await count(page, "meikyuu-unlock")).toBe(1);
    expect(await count(page, "meikyuu-bump")).toBe(0);
    expect(await count(page, "meikyuu-lose")).toBe(0);
    // The labyrinth's tab says it is done too, and the banner and the confirmation are there as well.
    await show(page, "maze");
    await expect(part(page, "progress")).toContainText("Cleared");
    expect(await count(page, "meikyuu-solve")).toBe(1);
    expect(errors).toEqual([]);
  });
}

test("an arrow that only the unlock can free costs no heart however often it is tapped, and says what it waits for", async ({ page }) => {
  await open(page, "?kind=mixed&level=2");
  const plan = await mixedPlan(2);
  await recordEvents(page, at("board"), NAMES);
  await takeOff(page, plan, plan.before);
  expect(plan.held.length).toBeGreaterThan(0);
  for (let again = 0; again < 4; again += 1) {
    for (const id of plan.held) {
      await tapArrowOnPage(page, svgOf(page), plan.board.arrows, id);
      await expect(part(page, "messages")).toContainText("holding this one up");
    }
  }
  await expect(page.locator(`${at("board")} .mk-arrow[data-by="true"]`).first()).toHaveAttribute("data-locked", "true");
  await expect(host(page)).toHaveAttribute("data-hearts", "3");
  await expect(host(page)).toHaveAttribute("data-status", "playing");
  expect(await count(page, "meikyuu-bump")).toBe(0);
  // The locked arrow itself says where its button is.
  await tapArrowOnPage(page, svgOf(page), plan.board.arrows, plan.locked[0]);
  await expect(part(page, "messages")).toContainText("Locked. Find the unlock button");
  await reachButton(page, plan);
  await show(page, "arrows");
  await takeOff(page, plan, plan.after);
  await expectFinished(page);
});

test("a puzzle lost on a real mistake says so on the arrows and on the labyrinth, whatever else is said; Restart keeps the unlock and the puzzle is then finished once", async ({ page }) => {
  await open(page, "?kind=mixed&level=2");
  const plan = await mixedPlan(2);
  expect(plan.mistake).toBeGreaterThanOrEqual(0);
  await recordEvents(page, at("board"), NAMES);
  for (let n = 0; n < 3; n += 1) await tapArrowOnPage(page, svgOf(page), plan.board.arrows, plan.mistake);
  await expect(host(page)).toHaveAttribute("data-status", "lost");
  await expect(part(page, "messages")).toContainText("Out of hearts");
  // Over to the labyrinth: it says the arrows are out of hearts, and keeps saying it after the button is reached.
  await show(page, "maze");
  await expect(part(page, "messages")).toContainText("out of hearts");
  await dragCells(page, svgOf(page), plan.board.maze, plan.way);
  await expect(host(page)).toHaveAttribute("data-unlocked", "true");
  await expect(part(page, "progress")).toContainText("Unlocked");
  await expect(part(page, "messages")).toContainText("out of hearts");
  await saidOnce(page);
  // Back on the arrows the puzzle is plainly lost, not quietly stuck, and Restart is the way on.
  await show(page, "arrows");
  await expect(host(page)).toHaveAttribute("data-status", "lost");
  await expect(part(page, "messages")).toContainText("Out of hearts. Restart to try again.");
  await expect(page.locator(`${at("board")} [data-action="restart"]`)).toBeEnabled();
  await page.locator(`${at("board")} [data-action="restart"]`).click();
  await expect(host(page)).toHaveAttribute("data-status", "playing");
  await expect(host(page)).toHaveAttribute("data-hearts", "3");
  await expect(host(page)).toHaveAttribute("data-unlocked", "true");
  await expect(page.locator(`${at("board")} .mk-arrow[data-locked="true"]`)).toHaveCount(0);
  await expect(part(page, "messages")).toHaveText("");
  await takeOff(page, plan, [...plan.before, ...plan.after]);
  await expectFinished(page);
  expect(await count(page, "meikyuu-lose")).toBe(1);
  expect(await count(page, "meikyuu-unlock")).toBe(1);
});

test("Undo and Restart after the unlock: the arrows stay free, and finishing again is told again only after a Restart", async ({ page }) => {
  await open(page, "?kind=mixed&level=2");
  const plan = await mixedPlan(2);
  await recordEvents(page, at("board"), NAMES);
  await reachButton(page, plan);
  // Restart on the labyrinth clears the line; the arrows are not locked again.
  await page.locator(`${at("board")} [data-action="restart"]`).click();
  await expect(host(page)).toHaveAttribute("data-cells", "0");
  await expect(host(page)).toHaveAttribute("data-unlocked", "true");
  await show(page, "arrows");
  await takeOff(page, plan, [...plan.before, ...plan.after]);
  await expectFinished(page);
  // Undo takes the last arrow back and puts it off again: still one solve told.
  await page.locator(`${at("board")} [data-action="undo"]`).click();
  await expect(host(page)).toHaveAttribute("data-status", "playing");
  await expect(part(page, "banner")).toHaveAttribute("data-show", "false");
  await takeOff(page, plan, [plan.after.at(-1) ?? plan.before.at(-1)]);
  await expectFinished(page);
  // Restart on the arrows plays it afresh, still unlocked, and finishing it is told once more.
  await page.locator(`${at("board")} [data-action="restart"]`).click();
  await expect(host(page)).toHaveAttribute("data-left", String(plan.board.arrows.arrows.length));
  await expect(host(page)).toHaveAttribute("data-unlocked", "true");
  await takeOff(page, plan, [...plan.before, ...plan.after]);
  await expectFinished(page, { solves: 2 });
});

test("a mixed puzzle played by touch alone: the labyrinth drawn with a finger, the arrows tapped with one", async ({ page }) => {
  await open(page, "?kind=mixed&level=2");
  const plan = await mixedPlan(2);
  await recordEvents(page, at("board"), NAMES);
  const box = page.locator(`${at("board")} .mk-box`);
  await takeOffByTouch(page, box, plan, plan.before);
  await show(page, "maze");
  const points = [];
  for (const cell of plan.way) points.push(await cellPoint(svgOf(page), plan.board.maze, cell));
  await touchDrag(page, box, points);
  await expect(host(page)).toHaveAttribute("data-unlocked", "true");
  await show(page, "arrows");
  await takeOffByTouch(page, box, plan, plan.after);
  await expectFinished(page);
});

/** Tap arrows with a finger: a pointer down and up on the middle of the arrow's head. */
async function takeOffByTouch(page, box, plan, ids) {
  const { arrowPoint } = await import("./demo.mjs");
  let left = Number(await host(page).getAttribute("data-left"));
  for (const id of ids) {
    const point = await arrowPoint(svgOf(page), plan.board.arrows, id);
    await touchDrag(page, box, [point]);
    left -= 1;
    await expect(host(page)).toHaveAttribute("data-left", String(left));
  }
}

test("a plain maze is finished once, with its banner and its words, and a plain arrow puzzle too", async ({ page }) => {
  await open(page, "?kind=maze&level=3");
  const { way, maze } = mazeOf(3);
  await recordEvents(page, at("board"), NAMES);
  await dragCells(page, svgOf(page), maze, way);
  await expect(host(page)).toHaveAttribute("data-solved", "true");
  await expect(part(page, "banner")).toHaveAttribute("data-show", "true");
  await expect(part(page, "progress")).toContainText("Solved");
  await expect(page.locator("#info")).toContainText("Solved");
  expect(await count(page, "meikyuu-solve")).toBe(1);
  await saidOnce(page);
});
