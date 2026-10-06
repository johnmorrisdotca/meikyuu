// Stones, played as a person plays them: a marble laid beside the line that the line cannot enter. By the Stone button's mode and a tap, by pressing
// and holding a finger (touch, and the mouse), and by Shift and an arrow key; refused when it is far, on the line, or over the limit; taken up by
// a tap or Undo; kept with the run and brought back; never part of the answer. The rules themselves are in src/stones.test.ts.
import { expect, test } from "@playwright/test";

import { at, bare, board, cellPoint, dragCells, events, mazeOf, noSidewaysScroll, open, recordEvents, touchDrag } from "./demo.mjs";

const svgOf = (page, selector = at("board")) => page.locator(`${selector} .mk-box svg`);
const LEVEL = 40;

/** A fork near the start of the level's way: where on the way the line must reach, and the first cell of the side passage (the cell to lay a stone on). */
function forkOf(number) {
  const { maze, way } = mazeOf(number);
  for (let at = 1; at < Math.min(way.length - 2, 40); at += 1) {
    const side = maze.links[way[at]].filter((next) => !way.includes(next));
    if (side.length > 0 && at >= 2) return { maze, way, at, into: side[0] };
  }
  throw new Error("no fork");
}

/** A finger held down on a pixel for `ms`, then lifted: pointer events with the touch type, the wait made in the page. */
async function touchHold(page, target, point, ms) {
  await target.evaluate(
    (element, { point, ms }) =>
      new Promise((resolve) => {
        const send = (type) => element.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: "touch", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: point.x, clientY: point.y, bubbles: true, cancelable: true }));
        send("pointerdown");
        window.setTimeout(() => {
          send("pointerup");
          resolve();
        }, ms);
      }),
    { point, ms },
  );
}

test("a board with stones has a Stone button, the progress says how many are left, and a board without them has neither", async ({ page }) => {
  await open(page, `?kind=maze&level=${LEVEL}`);
  await expect(page.locator(`${at("board")} [data-action="stone"]`)).toBeHidden();
  await expect(page.locator(`${at("board")} .mk-progress`)).not.toContainText("Stones");
  await page.goto(`http://meikyuu.test/?kind=maze&level=${LEVEL}&stones=on`);
  await page.waitForSelector(`${at("board")}[data-ready="true"] .mk-box svg[viewBox]`);
  const button = page.locator(`${at("board")} [data-action="stone"]`);
  await expect(button).toBeVisible();
  await expect(button).toHaveText("Stone");
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(`${at("board")} .mk-progress`)).toContainText("Stones left: 3.");
  await expect(page.locator(at("board"))).toHaveAttribute("data-stones", "0");
  // It is a button like the others: reached with the keyboard and pressed with Enter.
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(`${at("board")} .mk-says`)).toContainText("Stone mode");
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-pressed", "false");
});

test("in the Stone mode a tap lays a stone beside the line, the line cannot enter it, a tap on it takes it up, and Undo puts it back", async ({ page }) => {
  await open(page, `?kind=maze&level=${LEVEL}&stones=on`);
  const { maze, way, at: place, into } = forkOf(LEVEL);
  const svg = svgOf(page);
  await recordEvents(page, at("board"), ["meikyuu-stones", "meikyuu-solve"]);
  await dragCells(page, svg, maze, way.slice(0, place + 1));
  const stone = page.locator(`${at("board")} [data-action="stone"]`);
  await stone.click();
  // With the mode on, a press anywhere moves the view and draws nothing; a tap lays the stone.
  const point = await cellPoint(svg, maze, into);
  await page.mouse.click(point.x, point.y);
  await expect(page.locator(at("board"))).toHaveAttribute("data-stones", "1");
  await expect(page.locator(`${at("board")} .mk-stone`)).toHaveCount(1);
  await expect(page.locator(`${at("board")} .mk-progress`)).toContainText("Stones left: 2.");
  await expect(page.locator(`${at("board")} .mk-messages`)).toContainText("Stone laid");
  expect((await events(page)).map((each) => each.name)).toEqual(["meikyuu-stones"]);
  // The line cannot go in: drawing from its end into the stone's cell stops short.
  await stone.click();
  await dragCells(page, svg, maze, [way[place], into]);
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", String(place + 1));
  // And a tap on the stone takes it up (the mode back on), giving it back.
  await stone.click();
  await page.mouse.click(point.x, point.y);
  await expect(page.locator(at("board"))).toHaveAttribute("data-stones", "0");
  await expect(page.locator(`${at("board")} .mk-progress`)).toContainText("Stones left: 3.");
  await page.mouse.click(point.x, point.y);
  await expect(page.locator(at("board"))).toHaveAttribute("data-stones", "1");
  // Undo takes the laid stone up; the line stays, and a second Undo takes the stroke.
  await page.locator(`${at("board")} [data-action="undo"]`).click();
  await expect(page.locator(at("board"))).toHaveAttribute("data-stones", "0");
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", String(place + 1));
  // Restart takes every stone up with the line.
  await page.mouse.click(point.x, point.y);
  await expect(page.locator(at("board"))).toHaveAttribute("data-stones", "1");
  await page.locator(`${at("board")} [data-action="restart"]`).click();
  await expect(page.locator(at("board"))).toHaveAttribute("data-stones", "0");
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", "0");
});

test("a stone far from the line, on the line, or over the limit is refused, and the words say why", async ({ page }) => {
  await open(page, `?kind=maze&level=${LEVEL}&stones=on&stonereach=1`);
  const { maze, way, at: place } = forkOf(LEVEL);
  const svg = svgOf(page);
  await dragCells(page, svg, maze, way.slice(0, place + 1));
  await page.locator(`${at("board")} [data-action="stone"]`).click();
  const messages = page.locator(`${at("board")} .mk-messages`);
  // On the line.
  const online = await cellPoint(svg, maze, way[1]);
  await page.mouse.click(online.x, online.y);
  await expect(messages).toContainText("on your line");
  // Far: a cell more than the reach along the passages, which a reach of one makes any cell two beyond the line.
  const far = way.find((cell, index) => index > place + 3 && !maze.links[way[place]].includes(cell));
  const farPoint = await cellPoint(svg, maze, far);
  await page.mouse.click(farPoint.x, farPoint.y);
  await expect(messages).toContainText("Too far");
  await expect(page.locator(at("board"))).toHaveAttribute("data-stones", "0");
  await expect(page.locator(`${at("board")} .mk-progress`)).toContainText("Stones left: 3.");
});

test("a finger held on a cell beside the line lays a stone with no mode on, by touch and by mouse; a held finger far away, or a plain tap, does nothing", async ({ page }) => {
  await open(page, `?kind=maze&level=${LEVEL}&stones=on`);
  const { maze, way, at: place, into } = forkOf(LEVEL);
  const svg = svgOf(page);
  await svg.scrollIntoViewIfNeeded();
  const points = [];
  for (const cell of way.slice(0, place + 1)) points.push(await cellPoint(svg, maze, cell));
  await touchDrag(page, board(page), points);
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", String(place + 1));
  const target = await cellPoint(svg, maze, into);
  // A quick tap lays nothing.
  await touchHold(page, board(page), target, 80);
  await expect(page.locator(at("board"))).toHaveAttribute("data-stones", "0");
  // Held, it does.
  await touchHold(page, board(page), target, 700);
  await expect(page.locator(at("board"))).toHaveAttribute("data-stones", "1");
  await expect(page.locator(`${at("board")} .mk-stone`)).toHaveCount(1);
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", String(place + 1));
  // Held on a stone it is taken up.
  await touchHold(page, board(page), target, 700);
  await expect(page.locator(at("board"))).toHaveAttribute("data-stones", "0");
  // The mouse: pressed and kept still.
  await page.mouse.move(target.x, target.y);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await expect(page.locator(at("board"))).toHaveAttribute("data-stones", "1");
  await noSidewaysScroll(page);
});

test("with the browser's own touch (Chromium), a finger held on a cell beside the line lays a stone, and one tapped does not", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "real touch is driven through Chromium's own protocol");
  await open(page, `?kind=maze&level=${LEVEL}&stones=on`);
  const { maze, way, at: place, into } = forkOf(LEVEL);
  const svg = svgOf(page);
  await svg.scrollIntoViewIfNeeded();
  const client = await page.context().newCDPSession(page);
  const touch = (p) => [{ x: p.x, y: p.y, id: 1 }];
  const points = [];
  for (const cell of way.slice(0, place + 1)) points.push(await cellPoint(svg, maze, cell));
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: touch(points[0]) });
  for (const p of points.slice(1)) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: touch(p) });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", String(place + 1));
  const target = await cellPoint(svg, maze, into);
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: touch(target) });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator(at("board"))).toHaveAttribute("data-stones", "0");
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: touch(target) });
  await page.waitForTimeout(800);
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator(at("board"))).toHaveAttribute("data-stones", "1");
  await expect(page.locator(at("board"))).toHaveAttribute("data-cells", String(place + 1));
});

/** The arrow key whose nearest passage of `head` (the package's own rule, within `KEY_REACH`) is `cell`, or null: a hexagon's neighbours do not each lie along one of the four arrows. */
function arrowFor(maze, head, cell) {
  const [hx, hy] = maze.grid.centres[head];
  const arrows = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  for (const [key, [dx, dy]] of Object.entries(arrows)) {
    let best = -1;
    let bestCosine = 0.5;
    for (const next of maze.links[head]) {
      const [nx, ny] = maze.grid.centres[next];
      const cosine = ((nx - hx) * dx + (ny - hy) * dy) / (Math.hypot(nx - hx, ny - hy) || 1);
      if (cosine > bestCosine) {
        bestCosine = cosine;
        best = next;
      }
    }
    if (best === cell) return key;
  }
  return null;
}

/** The first level from `from` with a fork on its way where an arrow key lies toward a passage that is not the line's own: whatever shape the list has put there, a square's four arrows reach it and a hexagon's six passages may not. */
function forkReachedByAnArrow(from) {
  for (let number = from; number < from + 200; number += 1) {
    const { maze, way } = mazeOf(number);
    for (let at = 2; at < Math.min(way.length - 2, 40); at += 1) {
      const open_ = maze.links[way[at]].filter((cell) => cell !== way[at - 1]);
      for (const cell of open_) {
        const key = arrowFor(maze, way[at], cell);
        if (open_.length > 1 && key !== null) return { number, maze, way, at, key };
      }
    }
  }
  throw new Error("no level with a fork an arrow key reaches");
}

test("Shift and an arrow key lays a stone on the open cell of the line's end that lies that way, and again takes it up", async ({ page }) => {
  const { number, maze, way, at: place, key } = forkReachedByAnArrow(LEVEL);
  await open(page, `?kind=maze&level=${number}&stones=on`);
  const svg = svgOf(page);
  await dragCells(page, svg, maze, way.slice(0, place + 1));
  await board(page).focus();
  await page.keyboard.press(`Shift+${key}`);
  await expect(page.locator(at("board"))).toHaveAttribute("data-stones", "1");
  await page.keyboard.press(`Shift+${key}`);
  await expect(page.locator(at("board"))).toHaveAttribute("data-stones", "0");
});

test("a run is kept with its stones as one text, comes back as it was, and a stone is never part of the answer", async ({ page }) => {
  const errors = await bare(page, `<meikyuu-board id="a" level="${LEVEL}" stones style="max-width:360px"></meikyuu-board>`);
  const { maze, way, at: place, into } = forkOf(LEVEL);
  await expect(page.locator("#a .mk-box svg")).toHaveAttribute("viewBox", /./);
  const mounted = () => page.evaluate(() => {
    const mount = document.getElementById("a").mount;
    return { run: mount.run(), stones: [...mount.stones()], left: mount.stonesLeft() };
  });
  await dragCells(page, page.locator("#a .mk-box svg"), maze, way.slice(0, place + 1));
  const verdict = await page.evaluate((cell) => document.getElementById("a").mount.stone(cell), into);
  expect(verdict).toBe("ok");
  const kept = await mounted();
  expect(kept.stones).toEqual([into]);
  expect(kept.left).toBe(2);
  expect(kept.run).toContain("~");
  // A far cell is refused by the method too, with the reason.
  expect(await page.evaluate((cell) => document.getElementById("a").mount.stone(cell), way[way.length - 1])).toBe("end");
  // Restart, then bring the run back.
  await page.evaluate(() => document.getElementById("a").mount.restart());
  await expect(page.locator("#a")).toHaveAttribute("data-stones", "0");
  expect(await page.evaluate((code) => document.getElementById("a").mount.restore(code), kept.run)).toBe(true);
  await expect(page.locator("#a")).toHaveAttribute("data-cells", String(place + 1));
  await expect(page.locator("#a")).toHaveAttribute("data-stones", "1");
  expect(await mounted()).toEqual(kept);
  // Not a run of this maze.
  expect(await page.evaluate(() => document.getElementById("a").mount.restore("zzzzzzzz~1"))).toBe(false);
  expect(await mounted()).toEqual(kept);
  // The maze is solved by the same line whatever stones lie: go on along the way past the stone and finish it.
  await dragCells(page, page.locator("#a .mk-box svg"), maze, way.slice(place));
  await expect(page.locator("#a")).toHaveAttribute("data-solved", "true");
  expect(await page.evaluate(() => document.getElementById("a").mount.mazeGame().path.length)).toBe(way.length);
  expect(errors).toEqual([]);
});

test("over the limit a stone is refused with the words for it, and taking one up gives it back", async ({ page }) => {
  await bare(page, `<meikyuu-board id="a" level="${LEVEL}" stones stone-limit="1" style="max-width:360px"></meikyuu-board>`);
  const { maze, way, at: place } = forkOf(LEVEL);
  await expect(page.locator("#a .mk-box svg")).toHaveAttribute("viewBox", /./);
  await dragCells(page, page.locator("#a .mk-box svg"), maze, way.slice(0, place + 1));
  const beside = [];
  for (const cell of way.slice(0, place + 1)) for (const next of maze.links[cell]) if (!way.includes(next) && !beside.includes(next)) beside.push(next);
  expect(beside.length).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate((cell) => document.getElementById("a").mount.stone(cell), beside[0])).toBe("ok");
  expect(await page.evaluate((cell) => document.getElementById("a").mount.stone(cell), beside[1])).toBe("limit");
  await expect(page.locator("#a .mk-progress")).toContainText("Stones left: 0.");
  // The same refusal by a tap in the mode says it in words.
  await page.locator('#a [data-action="stone"]').click();
  const point = await cellPoint(page.locator("#a .mk-box svg"), maze, beside[1]);
  await page.mouse.click(point.x, point.y);
  await expect(page.locator("#a .mk-messages")).toContainText("No stones left");
  // Taking the first up (a tap on it) gives it back.
  const first = await cellPoint(page.locator("#a .mk-box svg"), maze, beside[0]);
  await page.mouse.click(first.x, first.y);
  await expect(page.locator("#a")).toHaveAttribute("data-stones", "0");
  await expect(page.locator("#a .mk-progress")).toContainText("Stones left: 1.");
});

test("the tag has stones as attributes, a limit of none, and a reach of one", async ({ page }) => {
  await bare(page, `<meikyuu-board id="a" level="${LEVEL}" stones stone-limit="none" stone-reach="1"></meikyuu-board><meikyuu-board id="b" level="${LEVEL}" stone-limit="2" stones></meikyuu-board><meikyuu-board id="c" level="${LEVEL}"></meikyuu-board>`);
  await expect(page.locator("#a .mk-progress")).toContainText("Stones laid: 0.");
  await expect(page.locator("#b .mk-progress")).toContainText("Stones left: 2.");
  await expect(page.locator('#c [data-action="stone"]')).toBeHidden();
  expect(await page.evaluate(() => document.getElementById("a").mount.stonesLeft())).toBeNull();
  expect(await page.evaluate(() => document.getElementById("c").mount.stonesLeft())).toBe(0);
  expect(await page.evaluate(() => document.getElementById("c").mount.stoneMode(true))).toBe(false);
});
