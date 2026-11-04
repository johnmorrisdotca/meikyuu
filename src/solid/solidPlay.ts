import { dragMaze, headOf, liftMaze, type MazeGame, newMazeGame, pressMaze, tapMaze } from "../game.ts";
import { stoneRulesOf, stonesLeft, toggleStone } from "../stones.ts";
import { applyLook, readColours } from "./solidColours.ts";
import { buildSolidMaze, type SolidMaze, type SolidRecipe } from "./solidMaze.ts";
import { HOLD_TIME, REACH, TAP_SLOP, TAP_TIME, WHEEL_GESTURE_MS } from "./solidMount.ts";
import type { SolidGesture, SolidSession } from "./solidSession.ts";
import {
  cellsAlongDrag,
  createFrame,
  dragTurn,
  openingTurn,
  pickCell,
  SOLID_ZOOM_LEAST,
  SOLID_ZOOM_MOST,
} from "./solidView.ts";
import { quatAxisAngle, quatMul, quatNormalize } from "./vec.ts";

/** The words, the drawing and the pointer moves of a solid, closed over the session `mountSolid` built. */
export function bindSolidPlay(s: SolidSession): void {
  function words(): void {
    const solved = s.game.solved;
    s.host.dataset.kind = "solid";
    s.host.dataset.solid = s.recipe.kind;
    s.host.dataset.solved = String(solved);
    s.host.dataset.moves = String(s.moves);
    s.host.dataset.cells = String(s.game.path.length);
    s.host.dataset.reached = String(s.game.solved);
    s.host.dataset.turnMode = String(s.turnOnly);
    s.host.dataset.stones = String(s.game.stones.length);
    s.host.dataset.stoneMode = String(s.stoneModeOn && s.game.rules !== null);
    if (s.game.rules !== null) s.host.dataset.stonesLeft = String(stonesLeft(s.game) ?? "none");
    else delete s.host.dataset.stonesLeft;
    const label = s.say("solidLabel", {
      shape: s.say(`solid_${s.recipe.kind}`),
      n: s.maze.grid.cells,
      play: s.say("play_solid"),
    });
    s.box.setAttribute("aria-label", label);
    s.banner.sync(s.say("solved", { n: s.moves }), s.say("closeMessage"), solved);
    s.undoButton.textContent = s.say("undo");
    s.restartButton.textContent = s.say("restart");
    s.hintButton.textContent = s.say("hint");
    s.hintButton.hidden = !s.withHints;
    s.stoneButton.hidden = s.game.rules === null;
    s.stoneButton.textContent = s.say("stone");
    s.stoneButton.setAttribute("aria-label", s.say("stoneLabel"));
    s.stoneButton.setAttribute("aria-pressed", String(s.stoneModeOn && s.game.rules !== null));
    s.stoneButton.disabled = solved;
    for (const [one, key] of [
      [s.leftButton, "turnLeft"],
      [s.rightButton, "turnRight"],
      [s.upButton, "turnUp"],
      [s.downButton, "turnDown"],
    ] as const)
      one.setAttribute("aria-label", s.say(key));
    s.pad.setAttribute("aria-label", s.say("turnPadLabel"));
    s.faceButton.textContent = s.say("faceMe");
    s.faceButton.setAttribute("aria-label", s.say("faceMeLabel"));
    s.turnOnlyButton.textContent = s.say("solidTurnMode");
    s.turnOnlyButton.setAttribute("aria-label", s.say("solidTurnModeLabel"));
    s.turnOnlyButton.setAttribute("aria-pressed", String(s.turnOnly));
    s.turnOnlyButton.hidden = !s.drawable;
    s.fitButton.textContent = s.say("fit");
    s.outButton.setAttribute("aria-label", s.say("zoomOut"));
    s.inButton.setAttribute("aria-label", s.say("zoomIn"));
    for (const one of [s.outButton, s.inButton, s.fitButton]) one.hidden = !s.withZoom;
    s.outButton.disabled = s.zoom <= SOLID_ZOOM_LEAST + 1e-6;
    s.inButton.disabled = s.zoom >= SOLID_ZOOM_MOST - 1e-6;
    s.fitButton.disabled = Math.abs(s.zoom - 1) < 1e-6;
    s.undoButton.disabled = s.game.undo.length === 0;
    s.restartButton.disabled = s.game.path.length === 0 && s.game.strokes === 0 && s.game.stones.length === 0;
    s.hintButton.disabled = solved;
    if (!s.withControls) return;
    const joiner = s.language === "ja" ? "" : " ";
    s.says.textContent =
      s.stoneModeOn && s.game.rules !== null ? s.say("stoneHow", { n: s.game.rules.reach }) : s.say("solidHow");
    const parts: string[] = [];
    if (solved) parts.push(s.say("solved", { n: s.moves }));
    else {
      parts.push(s.game.path.length === 0 ? s.say("notStarted") : s.say("drawn", { n: s.game.path.length }));
      if (s.game.rules !== null) {
        const left = stonesLeft(s.game);
        parts.push(left === null ? s.say("stonesFree", { n: s.game.stones.length }) : s.say("stonesLeft", { n: left }));
      }
    }
    s.progress.textContent = parts.join(joiner);
    s.messages.textContent = s.message === null ? "" : s.say(s.message.key, s.message.values);
    s.messages.dataset.warn = String(s.message?.warn === true);
  }
  function refresh(): void {
    words();
    s.invalidate();
  }

  s.STONE_WHY = {
    far: "stoneFar",
    "on-line": "stoneOnLine",
    end: "stoneEnd",
    limit: "stoneLimit",
    "no-line": "stoneNoLine",
    solved: "stoneSolved",
    drawing: "stoneDrawing",
    "no-cell": "stoneFar",
  };

  function stonesMoved(before: MazeGame<SolidMaze>): void {
    if (before.stones.length === s.game.stones.length && before.stones.every((cell, at) => cell === s.game.stones[at]))
      return;
    s.tell("meikyuu-stones", s.callbacks.onStones);
  }

  /** A stone asked for on a cell by a tap in the Stone mode or a press-and-hold: laid, taken up or refused with a word. True when that did something the player should see. */
  function layStoneAt(cell: number, how: "tap" | "hold"): boolean {
    if (s.game.rules === null) return false;
    const before = how === "hold" && s.game.drawing ? liftMaze(s.game) : s.game;
    const result = toggleStone(before, cell);
    s.hinted = null;
    if (result.how === "refused") {
      if (how === "hold" && (result.why === "no-line" || result.why === "solved" || result.why === "drawing"))
        return false;
      s.game = before;
      s.setMessage(s.STONE_WHY[result.why] ?? "stoneFar", { n: before.rules?.reach ?? 2 }, true);
      s.playSound("bump");
      refresh();
      return true;
    }
    const prior = s.game;
    s.game = result.game;
    s.setMessage(result.how === "laid" ? "stoneLaid" : "stoneTaken");
    s.playSound(result.how === "laid" ? "stone" : "back");
    refresh();
    stonesMoved(prior);
    return true;
  }

  function onChange(next: MazeGame<SolidMaze>, how: "press" | "drag" | "lift" | "tap"): void {
    const before = s.game;
    s.game = next;
    if (how === "press" || how === "tap") {
      s.hinted = null;
      s.setMessage(null);
    }
    if (how === "drag" || how === "tap") {
      if (next.path.length > before.path.length) s.playSound("step");
      else if (next.path.length < before.path.length) s.playSound("back");
    }
    if (next.solved && !before.solved) s.pendingSolve = true;
    if (how === "lift" || how === "tap") {
      if (next.strokes !== before.strokes) {
        s.moves += 1;
        s.tell("meikyuu-move", s.callbacks.onMove);
      }
      if (s.pendingSolve) {
        s.pendingSolve = false;
        if (!s.solveTold) {
          s.solveTold = true;
          s.playSound("solve");
          s.tell("meikyuu-solve", s.callbacks.onSolve);
        }
      }
    }
    refresh();
  }

  function begin(next: SolidRecipe): void {
    s.recipe = next;
    s.maze = buildSolidMaze(next);
    s.game = newMazeGame(s.maze, stoneRulesOf(s.stoneOption, s.maze.grid.cells));
    s.frame = createFrame(s.maze.grid);
    s.turned = openingTurn(s.maze.grid, s.maze.start);
    s.zoom = 1;
    s.glide = null;
    s.hinted = null;
    s.message = null;
    s.moves = 0;
    s.solveTold = false;
    s.pendingSolve = false;
    applyLook(s.canvas, s.look);
    s.colours = readColours(s.canvas);
    s.measure();
    refresh();
  }

  // Pointers.
  s.local = (event: { clientX: number; clientY: number }): [number, number] => {
    const rect = s.box.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  };
  s.pointers = new Map<number, [number, number]>();
  s.gesture = null;

  /** Whether a press at a point is on the cell that draws: the end of the line, or the start before there is one. */
  function pressTarget(x: number, y: number): number | null {
    if (!s.drawable || s.game.solved || s.turnOnly || s.stoneModeOn) return null;
    const target = headOf(s.game) ?? s.maze.start;
    const now = s.frameNow();
    if (now.visible[target] === 0) {
      s.setMessage("solidHidden", {}, true);
      words();
      return null;
    }
    if (pickCell(now, s.maze.grid, x, y) === target) return target;
    const room = s.maze.grid.radii[target]! * now.scale * (now.eye / (now.eye - now.cz[target]!));
    return Math.hypot(x - now.cx[target]!, y - now.cy[target]!) <= Math.max(REACH, room * 1.3) ? target : null;
  }

  /** Offer the game the cells a finger passed from one point to another. */
  function followDrag(from: readonly [number, number], to: readonly [number, number]): void {
    const now = s.frameNow();
    let next = s.game;
    for (const cell of cellsAlongDrag(now, s.maze.grid, from, to)) next = dragMaze(next, cell);
    if (next !== s.game) onChange(next, "drag");
  }
  /** Offer the game the cell under a finger that has not moved while the solid turned under it. */
  function followPointer(x: number, y: number): void {
    const cell = pickCell(s.frameNow(), s.maze.grid, x, y);
    if (cell < 0) return;
    const next = dragMaze(s.game, cell);
    if (next !== s.game) onChange(next, "drag");
  }

  s.endGesture = (lifted: boolean): void => {
    const was = s.gesture;
    s.gesture = null;
    s.drawing = false;
    s.pointerOn = null;
    if (was?.mode === "draw") onChange(liftMaze(s.game), "lift");
    else if (was?.mode === "turn") {
      s.windowOf.clearTimeout(was.hold);
      if (lifted && !was.moved && !was.held && s.windowOf.performance.now() - was.at < TAP_TIME) {
        const cell = pickCell(s.frameNow(), s.maze.grid, was.last[0], was.last[1]);
        if (cell >= 0) {
          if (s.stoneModeOn && s.game.rules !== null) layStoneAt(cell, "tap");
          else if (s.tapExtends && s.drawable && !s.game.solved) onChange(tapMaze(s.game, cell), "tap");
        }
      }
    }
  };

  s.onDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // A pointer the browser does not know (a script's) cannot be captured, and need not be.
    try {
      s.box.setPointerCapture?.(event.pointerId);
    } catch {
      /* Not captured; the board still plays. */
    }
    const at = s.local(event);
    s.pointers.set(event.pointerId, at);
    s.glide = null;
    if (s.pointers.size === 2) {
      s.endGesture(false);
      const [a, b] = [...s.pointers.values()] as [[number, number], [number, number]];
      s.gesture = {
        mode: "pinch",
        mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
        gap: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1,
        angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
      };
      return;
    }
    if (s.pointers.size > 2) return;
    const target = pressTarget(at[0], at[1]);
    if (target !== null) {
      s.gesture = { mode: "draw", id: event.pointerId, last: at };
      s.drawing = true;
      s.pointerOn = { x: at[0], y: at[1] };
      onChange(pressMaze(s.game, target), "press");
      s.schedule();
      return;
    }
    const turnGesture: SolidGesture & { mode: "turn" } = {
      mode: "turn",
      id: event.pointerId,
      last: at,
      from: at,
      at: s.windowOf.performance.now(),
      moved: false,
      hold: 0,
      held: false,
    };
    // Press and hold lays a stone where the finger is, if the game has stones and the finger is not on the line.
    if (s.game.rules !== null) {
      turnGesture.hold = s.windowOf.setTimeout(() => {
        if (s.gesture !== turnGesture || turnGesture.moved) return;
        const cell = pickCell(s.frameNow(), s.maze.grid, turnGesture.last[0], turnGesture.last[1]);
        if (cell >= 0 && !s.game.path.includes(cell) && layStoneAt(cell, "hold")) turnGesture.held = true;
      }, HOLD_TIME);
    }
    s.gesture = turnGesture;
  };

  s.onMove = (event: PointerEvent): void => {
    if (!s.pointers.has(event.pointerId)) return;
    const at = s.local(event);
    s.pointers.set(event.pointerId, at);
    const now = s.gesture;
    if (now === null) return;
    if (now.mode === "draw") {
      s.pointerOn = { x: at[0], y: at[1] };
      followDrag(now.last, at);
      now.last = at;
    } else if (now.mode === "turn") {
      if (!now.moved && Math.hypot(at[0] - now.from[0], at[1] - now.from[1]) > TAP_SLOP) now.moved = true;
      if (!now.moved || now.held) return;
      s.turned = dragTurn(s.frameNow(), s.turned, now.last, at);
      now.last = at;
      s.inMotion();
      s.invalidate();
    } else if (now.mode === "pinch" && s.pointers.size >= 2) {
      const [a, b] = [...s.pointers.values()] as [[number, number], [number, number]];
      const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const gap = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
      const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      let q = dragTurn(s.frameNow(), s.turned, now.mid, mid);
      q = quatNormalize(quatMul(quatAxisAngle([0, 0, 1], angle - now.angle), q));
      s.turned = q;
      s.zoom = Math.min(SOLID_ZOOM_MOST, Math.max(SOLID_ZOOM_LEAST, s.zoom * (gap / now.gap)));
      now.mid = mid;
      now.gap = gap;
      now.angle = angle;
      s.inMotion();
      s.invalidate();
      words();
    }
  };

  s.onUp = (event: PointerEvent): void => {
    if (!s.pointers.has(event.pointerId)) return;
    s.pointers.delete(event.pointerId);
    try {
      s.box.releasePointerCapture?.(event.pointerId);
    } catch {
      /* Not captured. */
    }
    if (s.gesture?.mode === "pinch") {
      if (s.pointers.size < 2) {
        s.gesture = null;
        // The finger left down does not go on to turn or draw: it is let go of, and the next press begins anew.
        s.pointers.clear();
      }
      return;
    }
    s.endGesture(event.type === "pointerup");
  };

  s.onCancel = (event: PointerEvent): void => s.onUp(event);

  // The wheel over the solid zooms it. A wheel that starts with the zoom already at its end, or a sideways swipe, is left to the page to scroll.
  let wheelTaken = Number.NEGATIVE_INFINITY;
  s.onWheel = (event: WheelEvent): void => {
    const pinch = event.ctrlKey || event.metaKey;
    if (!pinch && (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))) return;
    const factor = Math.exp(-event.deltaY * (pinch ? 0.01 : 0.0015));
    const atEnd = factor >= 1 ? s.zoom >= SOLID_ZOOM_MOST - 1e-6 : s.zoom <= SOLID_ZOOM_LEAST + 1e-6;
    const now = Number.isFinite(event.timeStamp) ? event.timeStamp : 0;
    if (!pinch && atEnd && !(now >= wheelTaken && now - wheelTaken < WHEEL_GESTURE_MS)) return;
    event.preventDefault();
    wheelTaken = now;
    if (atEnd) return;
    s.glide = null;
    s.zoom = Math.min(SOLID_ZOOM_MOST, Math.max(SOLID_ZOOM_LEAST, s.zoom * factor));
    s.inMotion();
    s.invalidate();
    words();
  };

  if (!s.picture) {
    s.box.addEventListener("pointerdown", s.onDown);
    s.box.addEventListener("pointermove", s.onMove);
    s.box.addEventListener("pointerup", s.onUp);
    s.box.addEventListener("pointercancel", s.onCancel);
    s.box.addEventListener("wheel", s.onWheel, { passive: false });
  }

  /** The way a key points (dx, dy, y down) as one step of the line: the linked neighbour of the line's end that lies nearest that way on the picture. */
  function neighbourToward(dx: number, dy: number): number {
    const head = headOf(s.game);
    if (head === null) return -1;
    const now = s.frameNow();
    let best = -1;
    let bestCosine = 0.5;
    const candidates = [
      ...s.maze.links[head]!,
      ...(s.game.path.length > 1 ? [s.game.path[s.game.path.length - 2]!] : []),
    ];
    for (const next of candidates) {
      const vx = now.cx[next]! - now.cx[head]!;
      const vy = now.cy[next]! - now.cy[head]!;
      const cosine = (vx * dx + vy * dy) / ((Math.hypot(vx, vy) || 1) * Math.hypot(dx, dy));
      if (cosine > bestCosine) {
        bestCosine = cosine;
        best = next;
      }
    }
    return best;
  }
  function stepByKey(dx: number, dy: number): void {
    if (!s.drawable || s.game.solved) return;
    const head = headOf(s.game);
    if (head === null) {
      if (s.frameNow().visible[s.maze.start] === 0) {
        s.setMessage("solidHidden", {}, true);
        words();
        return;
      }
      onChange(liftMaze(pressMaze(s.game, s.maze.start)), "tap");
      return;
    }
    if (s.frameNow().visible[head] === 0) {
      s.setMessage("solidHidden", {}, true);
      words();
      return;
    }
    const next = neighbourToward(dx, dy);
    if (next >= 0) onChange(liftMaze(dragMaze(pressMaze(s.game, head), next)), "tap");
  }
  s.onKey = (event: KeyboardEvent): void => {
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
      event.preventDefault();
      s.api.undo();
      return;
    }
    if (event.target !== s.box) return;
    const turns: Record<string, "left" | "right" | "up" | "down"> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
    };
    const steps: Record<string, [number, number]> = { w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
    const key = event.key;
    if (turns[key] !== undefined) {
      event.preventDefault();
      s.api.turn(turns[key]!);
    } else if (steps[key.toLowerCase()] !== undefined && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      const [dx, dy] = steps[key.toLowerCase()]!;
      if (event.shiftKey && s.game.rules !== null) {
        const next = neighbourToward(dx, dy);
        if (next >= 0) layStoneAt(next, "tap");
      } else stepByKey(dx, dy);
    } else if (key === "Enter" || key === " ") {
      event.preventDefault();
      if (s.game.path.length === 0) stepByKey(0, 0);
    } else if (key === "f" || key === "F" || key === "Home") {
      event.preventDefault();
      s.api.faceMe();
    } else if (key === "+" || key === "=") s.api.zoomIn();
    else if (key === "-" || key === "_") s.api.zoomOut();
    else if (key === "Backspace" || key === "Delete") {
      event.preventDefault();
      s.api.undo();
    }
  };

  s.words = words;
  s.refresh = refresh;
  s.stonesMoved = stonesMoved;
  s.layStoneAt = layStoneAt;
  s.begin = begin;
  s.followPointer = followPointer;
  s.followDrag = followDrag;
  s.pressTarget = pressTarget;
  s.stepByKey = stepByKey;
  s.neighbourToward = neighbourToward;
}
