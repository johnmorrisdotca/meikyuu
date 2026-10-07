// Mazes over a solid, played in a browser: each solid opens at its size and is painted; it is turned by dragging away from the line (by mouse on a desk,
// by touch on a phone, as Chromium's own input) and by the arrow buttons and Face me; a line is drawn from the start across the edges from face to face to
// the goal in ONE stroke, the solid turning by itself to keep the end of the line in view; the answer is the list of cells and is the same however the solid is
// turned; stones go beside the line; a point of the picture is on the cell the picture shows there; and turning holds the screen's rate on a phone slowed four times.
import { expect, test } from "@playwright/test";

import { buildSolidMaze, solidSolutionOf } from "../dist/solid-entry.js";
import { isSolidDie, SOLID_DICE, SOLID_DIE_SIDES, SOLID_SHAPES, SOLID_SIZE_NAMES } from "../dist/solid-entry.js";
import { solidLevelOf, SOLID_KINDS } from "../dist/levels-solid-all.js";
import { at, noSidewaysScroll, open } from "./demo.mjs";

const hostOf = (page) => page.locator(`${at("solid-board")}`);
const boxOf = (page) => page.locator(`${at("solid-board")} .mk-box`);

/** The solid on the page, with its board ready. */
async function openSolid(page, kind = "cube", size = "small", level = 1) {
  const errors = await open(page, `?solid=${kind}&solidsize=${size}&solidlevel=${level}`);
  await page.waitForSelector(`${at("solid-board")}[data-ready="true"] canvas.mk-solid`);
  await boxOf(page).scrollIntoViewIfNeeded();
  return errors;
}

const call = (page, source, argument) => page.evaluate(`(async (argument) => { const s = document.querySelector('[data-testid="solid-board"]').meikyuuSolid; ${source} })(${JSON.stringify(argument ?? null)})`);

/** Where the box is on the page. */
const rectOf = async (page) => {
  const r = await boxOf(page).boundingBox();
  return { left: r.x, top: r.y, width: r.width, height: r.height };
};

/**
 * An input the way the page's input is made: a mouse on a desk, a touch through Chromium's protocol on a phone, and, in an engine without that protocol,
 * pointer events sent to the box (which is what the browser makes of a touch).
 */
async function input(page, browserName, project) {
  const rect = await rectOf(page);
  const touch = project.use?.hasTouch === true;
  if (browserName === "chromium" && touch) {
    const client = await page.context().newCDPSession(page);
    // Chromium hands a touch to the page with the next frame, so each move waits for it.
    const frame = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const send = async (type, x, y) => {
      await client.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: rect.left + x, y: rect.top + y, id: 3 }] });
      await frame();
    };
    return { down: (x, y) => send("touchStart", x, y), move: (x, y) => send("touchMove", x, y), up: () => send("touchEnd", 0, 0), rect };
  }
  if (browserName === "chromium") {
    return {
      down: async (x, y) => {
        await page.mouse.move(rect.left + x, rect.top + y);
        await page.mouse.down();
      },
      move: (x, y) => page.mouse.move(rect.left + x, rect.top + y),
      up: () => page.mouse.up(),
      rect,
    };
  }
  const send = (type, x, y) => boxOf(page).evaluate((box, [type, x, y]) => {
    const r = box.getBoundingClientRect();
    box.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: "touch", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: r.left + x, clientY: r.top + y, bubbles: true, cancelable: true }));
  }, [type, x, y]);
  return { down: (x, y) => send("pointerdown", x, y), move: (x, y) => send("pointermove", x, y), up: () => send("pointerup", 0, 0), rect };
}

const placeOf = (page, cell) => call(page, "return s.place(argument);", cell);
const between = (page, a, b) => call(page, "return s.between(argument[0], argument[1]);", [a, b]);

/**
 * Draw the whole way with one finger, as a person follows a corridor: the end of the line, then the edge it crosses, then the next cell, reading where each is on the
 * picture afresh at each move, and, when the next cell is out of sight, keeping the finger on the end of the line while the solid turns by itself to show it.
 */
async function followWay(page, finger, way, { stopAt = way.length, leastFacing = 0.4 } = {}) {
  let p = await placeOf(page, way[0]);
  await finger.down(p.x, p.y);
  for (let i = 1; i < stopAt; i += 1) {
    for (let tries = 0; ; tries += 1) {
      p = await placeOf(page, way[i]);
      // In clear view (not facing away, and, on a solid with parts that hide parts, not behind one) and not so near edge-on that a finger cannot be put on it. A solid with parts that hide
      // parts turns to the cell and the cells round it together, which can leave the cell facing a little less squarely than on a solid that hides nothing.
      if (p.visible && p.facing > leastFacing) break;
      expect(tries, `cell ${i} of the way never came into view`).toBeLessThan(200);
      // Where the solid cannot tell which of two passages is meant (the rim cells of a star above the head and below it), the player presses Face me, and the cell comes round.
      if (tries === 60) await call(page, "s.faceMe(argument);", way[i]);
      const head = await placeOf(page, way[i - 1]);
      await finger.move(head.x, head.y);
      await page.waitForTimeout(25);
    }
    const mid = await between(page, way[i - 1], way[i]);
    await finger.move(mid.x, mid.y);
    p = await placeOf(page, way[i]);
    await finger.move(p.x, p.y);
    const head = await call(page, "const g = s.mazeGame(); return g.path[g.path.length - 1];");
    expect(head, `the line is at cell ${head} where it should be at ${way[i]} (step ${i})`).toBe(way[i]);
  }
  await finger.up();
}

test.describe("the solids", () => {
  test("each solid opens at its size, painted, and says what it is", async ({ page }) => {
    const errors = await openSolid(page);
    for (const kind of SOLID_KINDS) {
      await page.locator(`${at("solid-kinds")} button[data-value="${kind}"]`).click();
      await expect(hostOf(page)).toHaveAttribute("data-solid", kind);
      const level = solidLevelOf(kind, "small", 1);
      expect(await call(page, "return s.maze().grid.cells;")).toBe(level.cells);
      expect(await call(page, "return s.recipe().kind;")).toBe(kind);
      // The canvas is painted: it holds more than one colour.
      const colours = await boxOf(page).evaluate((box) => {
        const canvas = box.querySelector("canvas");
        const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        const seen = new Set();
        for (let i = 0; i < data.length; i += 4 * 211) seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
        return seen.size;
      });
      expect(colours, kind).toBeGreaterThan(4);
      await expect(page.locator(`${at("solid-info")}`)).toContainText(String(level.cells));
    }
    expect(errors).toEqual([]);
  });

  test("the picker has a row of dice, by their sides, and a row of shapes, and five sizes", async ({ page }) => {
    await openSolid(page);
    const dice = page.locator(`${at("solid-kinds")} [data-testid="solid-dice"] button`);
    const shapes = page.locator(`${at("solid-kinds")} [data-testid="solid-shapes"] button`);
    await expect(dice).toHaveCount(SOLID_DICE.length);
    await expect(shapes).toHaveCount(SOLID_SHAPES.length);
    expect(await dice.evaluateAll((buttons) => buttons.map((button) => button.dataset.value))).toEqual([...SOLID_DICE]);
    expect(await shapes.evaluateAll((buttons) => buttons.map((button) => button.dataset.value))).toEqual([...SOLID_SHAPES]);
    // Each die says its sides.
    expect(await dice.evaluateAll((buttons) => buttons.map((button) => /^d(\d+) /.exec(button.textContent)?.[1]))).toEqual(SOLID_DICE.map((kind) => String(SOLID_DIE_SIDES[kind])));
    for (const kind of SOLID_DICE) expect(isSolidDie(kind)).toBe(true);
    await expect(page.locator(`${at("solid-sizes")} button`)).toHaveCount(5);
    expect(await page.locator(`${at("solid-sizes")} button`).evaluateAll((buttons) => buttons.map((button) => button.dataset.value))).toEqual([...SOLID_SIZE_NAMES]);
    // Choosing a shape and a size opens that list at its first level.
    await page.locator(`${at("solid-kinds")} button[data-value="heart"]`).click();
    await page.locator(`${at("solid-sizes")} button[data-value="colossal"]`).click();
    await expect(hostOf(page)).toHaveAttribute("data-solid", "heart");
    const level = solidLevelOf("heart", "colossal", 1);
    expect(await call(page, "return s.maze().grid.cells;")).toBe(level.cells);
    expect(level.cells).toBeGreaterThan(3000);
    await expect(page.locator(`${at("solid-info")}`)).toContainText(String(level.cells));
  });

  test("a picture of a solid takes no input: it is not focusable, a touch passes through it to the page, and the keys and the wheel do nothing", async ({ page }) => {
    await openSolid(page);
    const result = await page.evaluate(async () => {
      const { mountSolid } = await import("./dist/solid-play-entry.js");
      const host = document.createElement("div");
      host.style.width = "300px";
      document.body.append(host);
      const picture = mountSolid(host, { recipe: "octahedron:3:prim:5", still: true, controls: false });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const box = host.querySelector(".mk-box");
      const before = JSON.stringify(picture.view());
      box.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 4, clientX: 30, clientY: 30, bubbles: true }));
      box.dispatchEvent(new PointerEvent("pointermove", { pointerId: 4, clientX: 90, clientY: 80, bubbles: true }));
      box.dispatchEvent(new WheelEvent("wheel", { deltaY: -400, bubbles: true, cancelable: true }));
      host.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      const rect = box.getBoundingClientRect();
      const style = getComputedStyle(box);
      return { moved: JSON.stringify(picture.view()) !== before, still: box.dataset.still, role: box.getAttribute("role"), tab: box.tabIndex, events: getComputedStyle(box).pointerEvents, touch: style.touchAction, width: rect.width, cells: picture.maze().grid.cells };
    });
    expect(result).toMatchObject({ moved: false, still: "true", role: "img", tab: -1, events: "none", touch: "auto", cells: 72 });
    expect(result.width).toBeGreaterThan(100);
  });

  test("the box leaves the page beside it and the page does not scroll sideways", async ({ page }) => {
    await openSolid(page, "icosahedron", "large", 5);
    const rect = await rectOf(page);
    const window_ = page.viewportSize();
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.left + rect.width).toBeLessThanOrEqual(window_.width);
    expect(await boxOf(page).evaluate((element) => getComputedStyle(element).touchAction)).toBe("none");
    await noSidewaysScroll(page);
  });

  test("a drag away from the line turns the solid and draws nothing; the arrows and Face me turn it too", async ({ page, browserName }, info) => {
    await openSolid(page, "cube", "medium", 3);
    const finger = await input(page, browserName, info.project);
    const before = await call(page, "return { q: s.view().q, cells: s.mazeGame().path.length };");
    // From the corner of the box, where there is no solid: a drag turns the solid.
    await finger.down(6, 6);
    for (let i = 1; i <= 12; i += 1) await finger.move(6 + i * 14, 6 + i * 9);
    await finger.up();
    const after = await call(page, "return { q: s.view().q, cells: s.mazeGame().path.length };");
    expect(after.q).not.toEqual(before.q);
    expect(after.cells).toBe(0);
    // The arrow buttons.
    const q1 = after.q;
    await page.locator(`${at("solid-board")} [data-action="turn-right"]`).click();
    await expect.poll(() => call(page, "return s.view().q;")).not.toEqual(q1);
    // Face me brings the start to face the viewer: squarely when the start is in the middle of a side, and, where it is at an edge or a corner, to face the side it is on
    // and its neighbours' together (45 degrees, 0.707, at an edge of a cube; 0.577 at a corner), so that the line's end is seen with what is round it.
    const start = await call(page, "return s.maze().start;");
    await page.locator(`${at("solid-board")} [data-action="face-me"]`).click();
    await expect.poll(() => call(page, "return s.place(argument).facing;", start)).toBeGreaterThan(0.57);
  });

  test("a point of the picture is on the cell the picture shows there, at any turn", async ({ page }) => {
    await openSolid(page, "sphere", "medium", 2);
    const result = await call(page, `
      let wrong = 0, tried = 0;
      for (let turn = 0; turn < 6; turn += 1) {
        s.view({ q: [Math.sin(turn), Math.cos(turn * 2) / 3, Math.sin(turn * 3) / 2, 1] });
        const g = s.maze().grid;
        for (let cell = 0; cell < g.cells; cell += 1) {
          const p = s.place(cell);
          if (!p.visible || p.facing < 0.3) continue;
          tried += 1;
          if (s.pick(p.x, p.y) !== cell) wrong += 1;
        }
      }
      return { wrong, tried };`);
    expect(result.tried).toBeGreaterThan(300);
    expect(result.wrong).toBe(0);
  });

  // A finger follows a solid that is turning under it, and now and then, on a slow runner, lands one cell off before the turn has finished: each whole way is tried again once.
  test.describe("a finger follows the whole way", () => {
    test.describe.configure({ retries: 1 });
    for (const kind of SOLID_KINDS) {
      test(`${kind}: the whole way is drawn in one stroke across the edges, the solid turning by itself, and the maze is solved`, async ({ page, browserName }, info) => {
        const level = solidLevelOf(kind, "small", 7);
        await openSolid(page, kind, "small", 7);
        const maze = buildSolidMaze(level.recipe);
        const way = solidSolutionOf(maze);
        const finger = await input(page, browserName, info.project);
        await call(page, "window.__solved = 0; s.host.addEventListener('meikyuu-solve', () => { window.__solved += 1; });");
        await followWay(page, finger, way, { leastFacing: maze.grid.convex ? 0.4 : 0.25 });
        const state = await call(page, "const g = s.mazeGame(); return { solved: g.solved, path: g.path, strokes: g.strokes, moves: s.host.dataset.moves, told: window.__solved };");
        expect(state.solved).toBe(true);
        expect(state.path).toEqual(way);
        expect(state.strokes).toBe(1);
        expect(state.told).toBe(1);
        // The line really did cross from one face to another (the faces of the triangle solids and the cube; the globe and the torus have none to name).
        if (kind !== "sphere" && kind !== "torus") {
          const faces = new Set(way.map((cell) => maze.grid.faceOf[cell]));
          expect(faces.size).toBeGreaterThan(1);
        }
        await expect(hostOf(page)).toHaveAttribute("data-solved", "true");
      });
    }
  });

  /** The solved message is open over a finished cube; drawing it took the whole way in one stroke, as a person would. */
  async function solveCube(page, browserName, info) {
    await openSolid(page, "cube", "small", 1);
    const opened = await call(page, "return s.view();");
    const way = solidSolutionOf(buildSolidMaze(solidLevelOf("cube", "small", 1).recipe));
    const finger = await input(page, browserName, info.project);
    await followWay(page, finger, way);
    const banner = page.locator(`${at("solid-board")} .mk-banner`);
    await expect(hostOf(page)).toHaveAttribute("data-solved", "true");
    await expect(banner).toHaveAttribute("data-show", "true");
    await expect(banner).toContainText("Solved in 1 stroke.");
    return { banner, finger, opened };
  }

  /** Turning, zooming, Fit and the arrows all still work: the message is not in their way, open or shut. */
  async function stillTurnsAndZooms(page, finger) {
    const q0 = await call(page, "return s.view().q;");
    await finger.down(6, 6);
    for (let i = 1; i <= 10; i += 1) await finger.move(6 + i * 12, 6 + i * 8);
    await finger.up();
    const q1 = await call(page, "return s.view().q;");
    expect(q1).not.toEqual(q0);
    await page.locator(`${at("solid-board")} [data-action="turn-left"]`).click();
    await expect.poll(() => call(page, "return s.view().q;")).not.toEqual(q1);
    const z0 = await call(page, "return s.view().zoom;");
    await page.locator(`${at("solid-board")} [data-action="in"]`).click();
    await expect.poll(() => call(page, "return s.view().zoom;")).toBeGreaterThan(z0);
    await page.locator(`${at("solid-board")} [data-action="fit"]`).click();
    await expect.poll(() => call(page, "return s.view().zoom;")).toBeCloseTo(z0, 5);
  }

  test("the solved message sits at the top of the box, covers little, and is closed by a click on it; turning and zooming work with it open and after", async ({ page, browserName }, info) => {
    const { banner, finger } = await solveCube(page, browserName, info);
    const box = await rectOf(page);
    const pill = await banner.boundingBox();
    expect(pill.y).toBeGreaterThanOrEqual(box.top);
    expect(pill.y + pill.height).toBeLessThan(box.top + box.height * 0.3);
    expect(pill.x).toBeGreaterThanOrEqual(box.left);
    expect(pill.x + pill.width).toBeLessThanOrEqual(box.left + box.width);
    await stillTurnsAndZooms(page, finger);
    await expect(banner).toHaveAttribute("data-show", "true");
    await banner.locator(".mk-banner-text").click();
    await expect(banner).toHaveAttribute("data-show", "false");
    await expect(banner).toBeHidden();
    // It is said still, in the line below, and a new look at the state does not bring it back.
    await expect(page.locator(`${at("solid-board")} .mk-progress`)).toContainText("Solved in 1 stroke");
    await stillTurnsAndZooms(page, finger);
    await expect(banner).toHaveAttribute("data-show", "false");
    await expect(hostOf(page)).toHaveAttribute("data-solved", "true");
  });

  test("the solved message has a labelled close button, and is closed by it", async ({ page, browserName }, info) => {
    const { banner } = await solveCube(page, browserName, info);
    const close = page.getByRole("button", { name: "Close the message" });
    await expect(close).toBeVisible();
    await close.click();
    await expect(banner).toHaveAttribute("data-show", "false");
    await expect(close).toBeHidden();
    await expect(hostOf(page)).toHaveAttribute("data-solved", "true");
  });

  test("Escape closes the solved message and goes no further; the next Escape does", async ({ page, browserName }, info) => {
    const { banner, finger } = await solveCube(page, browserName, info);
    await call(page, "window.__escapes = 0; document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.__escapes += 1; });");
    await boxOf(page).focus();
    await page.keyboard.press("Escape");
    await expect(banner).toHaveAttribute("data-show", "false");
    expect(await page.evaluate(() => window.__escapes)).toBe(0);
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => window.__escapes)).toBe(1);
    await stillTurnsAndZooms(page, finger);
    await expect(banner).toHaveAttribute("data-show", "false");
  });

  test("the solved message comes back for the next win, and `banner: false` shows none", async ({ page, browserName }, info) => {
    const { banner, opened } = await solveCube(page, browserName, info);
    await banner.locator(".mk-banner-close").click();
    await expect(banner).toHaveAttribute("data-show", "false");
    // Undo leaves it solved no more; solving again says it again.
    await page.locator(`${at("solid-board")} [data-action="restart"]`).click();
    await expect(hostOf(page)).toHaveAttribute("data-solved", "false");
    const way = solidSolutionOf(buildSolidMaze(solidLevelOf("cube", "small", 1).recipe));
    // The solid is where the first win left it: put it back as it was opened, so the finger can find the start.
    await call(page, "s.view(argument);", opened);
    const finger = await input(page, browserName, info.project);
    await followWay(page, finger, way);
    await expect(banner).toHaveAttribute("data-show", "true");
    // Off: nothing shows, the words below still do.
    await call(page, "s.set({ banner: false });");
    await expect(banner).toHaveAttribute("data-show", "false");
    await expect(page.locator(`${at("solid-board")} .mk-progress`)).toContainText("Solved in 1 stroke");
    await call(page, "s.set({ banner: true });");
    await expect(banner).toHaveAttribute("data-show", "true");
  });

  test("the answer is the list of cells, whichever way the solid is turned: the run kept is the same text, and a fresh board takes it back", async ({ page, browserName }, info) => {
    await openSolid(page, "cube", "small", 12);
    const maze = buildSolidMaze(solidLevelOf("cube", "small", 12).recipe);
    const way = solidSolutionOf(maze);
    const finger = await input(page, browserName, info.project);
    await followWay(page, finger, way, { stopAt: Math.floor(way.length / 2) });
    const run = await call(page, "return s.run();");
    expect(run.length).toBeGreaterThan(3);
    // Turn the solid every which way: the text does not change.
    await call(page, "s.view({ q: [0.3, -0.5, 0.2, 0.7], zoom: 1.6 });");
    expect(await call(page, "return s.run();")).toBe(run);
    await call(page, "s.view({ q: [-0.6, 0.1, 0.5, 0.3], zoom: 0.8 });");
    expect(await call(page, "return s.run();")).toBe(run);
    // Another board takes it back, at whatever turn it is opened.
    await page.reload();
    await page.waitForSelector(`${at("solid-board")}[data-ready="true"] canvas.mk-solid`);
    const taken = await call(page, "const ok = s.restore(argument); return { ok, cells: s.mazeGame().path.length };", run);
    expect(taken.ok).toBe(true);
    expect(taken.cells).toBeGreaterThan(2);
    expect(await call(page, "return s.restore('zzzzzz');")).toBe(false);
  });

  test("stones are laid beside the line and shut a passage; one Undo takes the line and the stones back", async ({ page, browserName }, info) => {
    await open(page, "?stones=on&solid=octahedron&solidsize=small&solidlevel=4");
    await page.waitForSelector(`${at("solid-board")}[data-ready="true"] canvas.mk-solid`);
    await boxOf(page).scrollIntoViewIfNeeded();
    const maze = buildSolidMaze(solidLevelOf("octahedron", "small", 4).recipe);
    const way = solidSolutionOf(maze);
    const finger = await input(page, browserName, info.project);
    await followWay(page, finger, way, { stopAt: 5 });
    const side = way.slice(0, 4).flatMap((cell) => maze.links[cell]).find((cell) => !way.includes(cell));
    expect(side).toBeDefined();
    expect(await call(page, "return s.stone(argument);", side)).toBe("ok");
    expect(await call(page, "return s.stones();")).toEqual([side]);
    expect(await call(page, "return s.stone(argument);", way[1])).toBe("on-line");
    expect(await call(page, "return s.stone(argument);", maze.goal)).not.toBe("ok");
    await expect(hostOf(page)).toHaveAttribute("data-stones", "1");
  });

  test("turning holds the screen's rate on a phone slowed four times over, on the solids of the first five at large and a die and a shape at huge", async ({ page, browserName }, info) => {
    test.skip(browserName !== "chromium" || info.project.use?.hasTouch !== true, "a phone's Chromium, through its protocol");
    test.setTimeout(120_000);
    const client = await page.context().newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    for (const [kind, size, level] of [["cube", "large", 9], ["sphere", "large", 9], ["octahedron", "large", 9], ["icosahedron", "large", 9], ["dodecahedron", "huge", 9], ["torus", "huge", 9]]) {
      await openSolid(page, kind, size, level);
      await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      const result = await boxOf(page).evaluate(async (box) => {
        const rect = box.getBoundingClientRect();
        const frames = [];
        let last = performance.now();
        const fire = (type, x, y) => box.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: "touch", clientX: rect.left + x, clientY: rect.top + y, bubbles: true, isPrimary: true }));
        fire("pointerdown", 5, 5);
        await new Promise((resolve) => {
          let t = 0;
          const step = (now) => {
            frames.push(now - last);
            last = now;
            t += 1;
            const a = (t / 20) * Math.PI;
            fire("pointermove", 5 + (rect.width - 10) * (0.5 + 0.5 * Math.sin(a)), 5 + (rect.height - 10) * (0.5 + 0.5 * Math.cos(a * 0.7)));
            if (t < 120) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        });
        fire("pointerup", 5, 5);
        frames.shift();
        return { frames: frames.length, over: frames.filter((f) => f > 20).length, worst: Math.max(...frames) };
      });
      // A frame is 16.7 ms; a few slow ones on a busy machine are allowed, a drawing that cannot keep up is not.
      expect(result.over / result.frames, `${kind}: ${JSON.stringify(result)}`).toBeLessThan(0.15);
      await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    }
  });

  test("a colossal solid, about four and a half thousand cells, turns at a good rate on a phone slowed four times over when it is zoomed in four times, which is how it is played", async ({ page, browserName }, info) => {
    test.skip(browserName !== "chromium" || info.project.use?.hasTouch !== true, "a phone's Chromium, through its protocol");
    test.setTimeout(120_000);
    const client = await page.context().newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    for (const [kind, size, level] of [["cube", "colossal", 40], ["icosahedron", "colossal", 40], ["dodecahedron", "colossal", 40], ["torus", "colossal", 40], ["heart", "colossal", 40], ["cross", "colossal", 40]]) {
      await openSolid(page, kind, size, level);
      await call(page, "s.view({ zoom: 4 });");
      // Zoomed in four times, which the board allows (to six): a colossal cell is a finger wide at four.
      expect(await call(page, "return s.view().zoom;"), kind).toBe(4);
      await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      const result = await boxOf(page).evaluate(async (box) => {
        const rect = box.getBoundingClientRect();
        const frames = [];
        let last = performance.now();
        const fire = (type, x, y) => box.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: "touch", clientX: rect.left + x, clientY: rect.top + y, bubbles: true, isPrimary: true }));
        fire("pointerdown", 5, 5);
        await new Promise((resolve) => {
          let t = 0;
          const step = (now) => {
            frames.push(now - last);
            last = now;
            t += 1;
            const a = (t / 20) * Math.PI;
            fire("pointermove", 5 + (rect.width - 10) * (0.5 + 0.5 * Math.sin(a)), 5 + (rect.height - 10) * (0.5 + 0.5 * Math.cos(a * 0.7)));
            if (t < 120) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        });
        fire("pointerup", 5, 5);
        frames.shift();
        return { frames: frames.length, over: frames.filter((f) => f > 34).length, worst: Math.max(...frames) };
      });
      // Two frames of the screen's rate (34 ms), at four times slower than a laptop and in software; a few slow ones on a busy machine are allowed, a drawing that cannot keep up is not.
      expect(result.over / result.frames, `${kind}: ${JSON.stringify(result)}`).toBeLessThan(0.25);
      await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    }
  });
});
