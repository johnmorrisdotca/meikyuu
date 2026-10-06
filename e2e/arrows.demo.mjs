// The arrow puzzles and the mixed ones, played as a person plays them: arrows tapped, bumped, hinted and cleared, hearts lost, locks
// opened by drawing a path through a labyrinth to its hidden button.
import { expect, test } from "@playwright/test";

import { arrowsOf, at, dragCells, events, flashes, mixedOf, noSidewaysScroll, open, recordEvents, recordFlashes, tapArrowOnPage } from "./demo.mjs";

const svgOf = (page) => page.locator(`${at("board")} .mk-box svg`);

test("an arrow level draws a dot for each cell of its picture and an arrow for each arrow, with its hearts and what is left", async ({ page }) => {
  const errors = await open(page, "?kind=arrows&level=40");
  const { board } = await arrowsOf(40);
  await expect(page.locator(`${at("board")} .mk-arrow`)).toHaveCount(board.arrows.length);
  await expect(page.locator(`${at("board")} .mk-dot`)).toHaveCount(board.inShape.filter(Boolean).length);
  await expect(page.locator(at("board"))).toHaveAttribute("data-hearts", "3");
  await expect(page.locator(`${at("board")} .mk-progress`)).toContainText(`${board.arrows.length} arrows left`);
  await expect(page.locator(`${at("board")} .mk-says`)).toContainText("Tap an arrow");
  expect(errors).toEqual([]);
  await noSidewaysScroll(page);
});

test("a free arrow tapped slides off the board, and nothing else changes", async ({ page }) => {
  await open(page, "?kind=arrows&level=40");
  const { board, blockers } = await arrowsOf(40);
  const id = board.arrows.findIndex((_, each) => blockers[each].length === 0);
  await recordEvents(page, at("board"), ["meikyuu-move", "meikyuu-bump"]);
  await tapArrowOnPage(page, svgOf(page), board, id);
  await expect(page.locator(at("board"))).toHaveAttribute("data-left", String(board.arrows.length - 1));
  await expect(page.locator(`${at("board")} .mk-arrow[data-id="${id}"]`)).toHaveCount(0);
  await expect(page.locator(at("board"))).toHaveAttribute("data-hearts", "3");
  expect((await events(page)).map((each) => each.name)).toEqual(["meikyuu-move"]);
});

test("a blocked arrow bumps, costs a heart, and shows which arrow is in its way; the third bump loses, and Restart plays again", async ({ page }) => {
  await open(page, "?kind=arrows&level=40");
  const { board, blockers } = await arrowsOf(40);
  const id = board.arrows.findIndex((_, each) => blockers[each].length > 0);
  await recordEvents(page, at("board"), ["meikyuu-bump", "meikyuu-lose"]);
  await recordFlashes(page, at("board"));
  const svg = svgOf(page);
  await tapArrowOnPage(page, svg, board, id);
  await expect(page.locator(at("board"))).toHaveAttribute("data-hearts", "2");
  await expect(page.locator(`${at("board")} .mk-messages`)).toContainText("Blocked");
  await expect(page.locator(`${at("board")} .mk-arrow[data-bump="true"]`)).toHaveCount(1);
  // The arrow in the way is marked once, by a flash that the board takes off again: what it did is read, not what it still shows.
  await expect.poll(async () => (await flashes(page)).length).toBe(1);
  expect(blockers[id]).toContain((await flashes(page))[0].id);
  await expect(page.locator(`${at("board")} .mk-progress`)).toContainText("♥♥♡");
  await tapArrowOnPage(page, svg, board, id);
  await tapArrowOnPage(page, svg, board, id);
  await expect(page.locator(at("board"))).toHaveAttribute("data-status", "lost");
  await expect(page.locator(`${at("board")} .mk-messages`)).toContainText("Out of hearts");
  expect((await events(page)).filter((each) => each.name === "meikyuu-lose").length).toBe(1);
  // Nothing more can be tapped.
  const free = board.arrows.findIndex((_, each) => blockers[each].length === 0);
  await tapArrowOnPage(page, svg, board, free);
  await expect(page.locator(at("board"))).toHaveAttribute("data-left", String(board.arrows.length));
  await page.locator(`${at("board")} [data-action="restart"]`).click();
  await expect(page.locator(at("board"))).toHaveAttribute("data-status", "playing");
  await expect(page.locator(at("board"))).toHaveAttribute("data-hearts", "3");
  await expect(page.locator(`${at("board")} .mk-arrow`)).toHaveCount(board.arrows.length);
});

test("every arrow tapped, the opposite way to how they were added, clears the puzzle: it says so, once, and keeps it", async ({ page }) => {
  await open(page, "?kind=arrows&level=12");
  const { board } = await arrowsOf(12);
  await recordEvents(page, at("board"), ["meikyuu-solve"]);
  const svg = svgOf(page);
  for (let id = board.arrows.length - 1; id >= 0; id -= 1) await tapArrowOnPage(page, svg, board, id);
  await expect(page.locator(at("board"))).toHaveAttribute("data-status", "cleared");
  await expect(page.locator(at("board"))).toHaveAttribute("data-solved", "true");
  await expect(page.locator(`${at("board")} .mk-banner`)).toHaveAttribute("data-show", "true");
  await expect(page.locator(`${at("board")} .mk-progress`)).toContainText("Cleared");
  await expect(page.locator(at("board"))).toHaveAttribute("data-hearts", "3");
  expect((await events(page)).length).toBe(1);
  await page.reload();
  await page.waitForSelector(`${at("board")}[data-ready="true"] .mk-box svg[viewBox]`);
  await expect(page.locator("#info")).toContainText("Solved");
});

test("Hint lights a free arrow, Undo puts the last arrow back, and a tap on an empty cell or a drag does nothing", async ({ page }) => {
  await open(page, "?kind=arrows&level=40");
  const { board, blockers } = await arrowsOf(40);
  const svg = svgOf(page);
  await page.locator(`${at("board")} [data-action="hint"]`).click();
  const lit = page.locator(`${at("board")} .mk-arrow[data-hint="true"]`);
  await expect(lit).toHaveCount(1);
  const id = Number(await lit.getAttribute("data-id"));
  expect(blockers[id]).toEqual([]);
  await tapArrowOnPage(page, svg, board, id);
  await expect(page.locator(at("board"))).toHaveAttribute("data-left", String(board.arrows.length - 1));
  await page.locator(`${at("board")} [data-action="undo"]`).click();
  await expect(page.locator(at("board"))).toHaveAttribute("data-left", String(board.arrows.length));
  await expect(page.locator(`${at("board")} .mk-arrow[data-id="${id}"]`)).toHaveCount(1);
  // A drag across the board pans; it never taps an arrow.
  const box = await svg.boundingBox();
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 20, box.y + box.height - 20, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator(at("board"))).toHaveAttribute("data-left", String(board.arrows.length));
  await expect(page.locator(at("board"))).toHaveAttribute("data-hearts", "3");
});

test("an arrow is tapped by touch too", async ({ page }) => {
  await open(page, "?kind=arrows&level=40");
  const { board, blockers } = await arrowsOf(40);
  const id = board.arrows.findIndex((_, each) => blockers[each].length === 0);
  const svg = svgOf(page);
  await svg.scrollIntoViewIfNeeded();
  const cell = board.arrows[id].cells.at(-1);
  const rect = await svg.boundingBox();
  const [vx, vy, vw, vh] = (await svg.getAttribute("viewBox")).split(" ").map(Number);
  const x = rect.x + (((cell % board.w) + 0.5 - vx) / vw) * rect.width;
  const y = rect.y + ((Math.floor(cell / board.w) + 0.5 - vy) / vh) * rect.height;
  await page.evaluate(({ x, y }) => {
    const box = document.querySelector(".mk-box");
    const send = (type) => box.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: "touch", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    send("pointerdown");
    send("pointerup");
  }, { x, y });
  await expect(page.locator(at("board"))).toHaveAttribute("data-left", String(board.arrows.length - 1));
});

test("a mixed level has locked arrows and a labyrinth: a locked arrow does nothing and costs nothing until the button is reached", async ({ page }) => {
  await open(page, "?kind=mixed&level=8");
  const { board, way } = await mixedOf(8);
  const arrows = board.arrows;
  const lockedId = arrows.locked.indexOf(true);
  await expect(page.locator(`${at("board")} .mk-tab`)).toHaveCount(2);
  await expect(page.locator(`${at("board")} .mk-arrow[data-locked="true"]`)).toHaveCount(arrows.locked.filter(Boolean).length);
  await expect(page.locator(`${at("board")} .mk-says`)).toContainText("locked");
  await recordEvents(page, at("board"), ["meikyuu-unlock", "meikyuu-solve"]);
  await tapArrowOnPage(page, svgOf(page), arrows, lockedId);
  await expect(page.locator(`${at("board")} .mk-messages`)).toContainText("Locked");
  await expect(page.locator(at("board"))).toHaveAttribute("data-hearts", "3");
  await expect(page.locator(at("board"))).toHaveAttribute("data-left", String(arrows.arrows.length));
  // The labyrinth: draw a line from its start to the button.
  await page.locator(`${at("board")} [data-action="tab-maze"]`).click();
  await expect(page.locator(at("board"))).toHaveAttribute("data-view", "maze");
  await expect(page.locator(`${at("board")} .mk-says`)).toContainText("unlock button");
  await dragCells(page, svgOf(page), board.maze, way);
  await expect(page.locator(at("board"))).toHaveAttribute("data-unlocked", "true");
  await expect(page.locator(`${at("board")} .mk-progress`)).toContainText("Unlocked");
  // Back at the arrows, nothing is locked any more, and they can all be cleared.
  await page.locator(`${at("board")} [data-action="tab-arrows"]`).click();
  await expect(page.locator(`${at("board")} .mk-arrow[data-locked="true"]`)).toHaveCount(0);
  const svg = svgOf(page);
  for (let id = arrows.arrows.length - 1; id >= 0; id -= 1) await tapArrowOnPage(page, svg, arrows, id);
  await expect(page.locator(at("board"))).toHaveAttribute("data-status", "cleared");
  const told = (await events(page)).map((each) => each.name);
  expect(told).toEqual(["meikyuu-unlock", "meikyuu-solve"]);
});

test("a big arrow board can be zoomed and an arrow tapped while zoomed", async ({ page }) => {
  const { levelOf } = await import("../dist/levels.js");
  const last = levelOf("arrows", 300);
  await open(page, `?kind=arrows&level=${last.number}`);
  const { board, blockers } = await arrowsOf(last.number);
  const svg = svgOf(page);
  const before = Number((await svg.getAttribute("viewBox")).split(" ")[2]);
  const id = board.arrows.findIndex((_, each) => blockers[each].length === 0);
  const { arrowPoint } = await import("./demo.mjs");
  const point = await arrowPoint(svg, board, id);
  await page.mouse.move(point.x, point.y);
  await page.mouse.wheel(0, -700);
  await expect.poll(async () => Number((await svg.getAttribute("viewBox")).split(" ")[2])).toBeLessThan(before * 0.5);
  await tapArrowOnPage(page, svg, board, id);
  await expect(page.locator(at("board"))).toHaveAttribute("data-left", String(board.arrows.length - 1));
});
