import { arrowsLeft, newArrowGame, tapArrow, unlockArrows } from "./arrowGame.ts";
import { createArrowSurface } from "./arrowSurface.ts";
import { makeArrows } from "./arrows.ts";
import { dragMaze, headOf, liftMaze, type MazeGame, newMazeGame, pressMaze } from "./game.ts";
import { buildMaze } from "./maze.ts";
import { createMazeSurface } from "./mazeSurface.ts";
import { buildMixed } from "./mixed.ts";
import type { MeikyuuPuzzle } from "./mount.ts";
import type { MountSession } from "./mountSession.ts";
import { stoneRulesOf, stonesLeft, toggleStone } from "./stones.ts";

/** How near the way a key press points a neighbour has to be, as a cosine, to be the one stepped to. */
const KEY_REACH = 0.5;

/** The words, the drawing and the moves of a flat board, closed over the session `mountMeikyuu` built. */
export function bindPlay(s: MountSession): void {
  // What the line says, in words, and the buttons' states.
  function words(): void {
    const mixed = s.puzzle.kind === "mixed";
    const onMaze = s.viewing === "maze";
    const solved = s.puzzle.kind === "maze" ? s.mazeGame?.solved === true : s.arrowGame?.status === "cleared";
    s.host.dataset.kind = s.puzzle.kind;
    s.host.dataset.level = String(s.puzzle.level ?? "");
    s.host.dataset.view = s.viewing;
    s.host.dataset.solved = String(solved);
    s.host.dataset.moves = String(s.moves);
    if (s.mazeGame !== null) {
      s.host.dataset.cells = String(s.mazeGame.path.length);
      s.host.dataset.keys = String(s.mazeGame.collected.length);
      s.host.dataset.reached = String(s.mazeGame.solved);
    }
    if (s.arrowGame !== null) {
      s.host.dataset.hearts = String(s.arrowGame.hearts);
      s.host.dataset.left = String(arrowsLeft(s.arrowGame));
      s.host.dataset.unlocked = String(s.arrowGame.unlocked);
      s.host.dataset.status = s.arrowGame.status;
    }
    s.tabs.hidden = !mixed;
    s.arrowsTab.textContent = s.say("tabArrows");
    s.mazeTab.textContent = s.say("tabMaze");
    s.arrowsTab.setAttribute("aria-selected", String(!onMaze));
    s.mazeTab.setAttribute("aria-selected", String(onMaze));
    s.tabs.setAttribute("aria-label", s.say("tabsLabel"));
    s.banner.sync(
      onMaze && !mixed ? s.say("solved", { n: s.moves }) : s.say("arrowsCleared"),
      s.say("closeMessage"),
      solved && !(mixed && s.mazeGame?.solved === true && onMaze),
    );
    const surface = s.surfaceNow();
    const state = surface?.surface.state();
    s.undoButton.textContent = s.say("undo");
    s.restartButton.textContent = s.say("restart");
    s.hintButton.textContent = s.say("hint");
    s.hintButton.hidden = !s.withHints;
    s.fitButton.textContent = s.say("fit");
    s.outButton.setAttribute("aria-label", s.say("zoomOut"));
    s.inButton.setAttribute("aria-label", s.say("zoomIn"));
    s.pad.setAttribute("aria-label", s.say("zoomLabel"));
    s.pad.hidden = !s.withZoom;
    s.fitButton.disabled = state?.fitted === true && s.gutterNow === s.gutterLeast;
    s.outButton.disabled = state?.atLeast === true && !s.frameCanWiden();
    s.inButton.disabled = state?.atMost === true && s.gutterNow <= s.gutterLeast;
    s.panButton.textContent = s.say("pan");
    s.panButton.setAttribute("aria-label", s.say("panLabel"));
    s.panButton.setAttribute("aria-pressed", String(s.panOn));
    s.turnButton.textContent = s.say("turn");
    s.turnButton.setAttribute("aria-label", s.say("turnLabel"));
    s.turnButton.hidden = s.options.turnButton !== true || s.maze === null || s.viewing !== "maze" || !s.isTurnable();
    s.host.dataset.pan = String(s.panOn);
    const stonesOn = s.viewing === "maze" && s.mazeGame?.rules != null;
    s.stoneButton.hidden = !stonesOn;
    s.stoneButton.textContent = s.say("stone");
    s.stoneButton.setAttribute("aria-label", s.say("stoneLabel"));
    s.stoneButton.setAttribute("aria-pressed", String(s.stoneModeOn && stonesOn));
    s.stoneButton.disabled = s.mazeGame?.solved === true;
    s.host.dataset.stones = String(s.mazeGame?.stones.length ?? 0);
    s.host.dataset.stoneMode = String(s.stoneModeOn && stonesOn);
    if (stonesOn) s.host.dataset.stonesLeft = String(stonesLeft(s.mazeGame!) ?? "none");
    else delete s.host.dataset.stonesLeft;
    const lost = !onMaze && s.arrowGame?.status === "lost";
    const finished = !onMaze && s.arrowGame?.status === "cleared";
    s.undoButton.disabled = onMaze
      ? s.mazeGame === null || s.mazeGame.undo.length === 0
      : s.arrowGame === null || s.arrowGame.taken.length === 0 || lost;
    s.restartButton.disabled = onMaze
      ? s.mazeGame === null ||
        (s.mazeGame.path.length === 0 && s.mazeGame.strokes === 0 && s.mazeGame.stones.length === 0)
      : s.arrowGame === null || (s.arrowGame.taken.length === 0 && s.arrowGame.mistakes === 0);
    s.hintButton.disabled = onMaze ? s.mazeGame?.solved === true : lost || finished;
    const label =
      onMaze && s.maze !== null
        ? s.say("mazeLabel", {
            shape: s.say(`shape_${s.maze.recipe.shape}`),
            n: s.maze.grid.cells,
            play: mixed ? s.say("mazeForButton") : s.say(`play_${s.maze.recipe.mode.replace(/-/g, "_")}`),
          })
        : s.board === null
          ? ""
          : s.say("arrowsLabel", { n: s.board.arrows.length, shape: s.say(`shape_${s.board.recipe.shape}`) });
    s.box.setAttribute("aria-label", label);
    if (!s.withControls) return;
    const joiner = s.language === "ja" ? "" : " ";
    // The line on how to play, the line of progress, and the word of what has just happened.
    s.says.textContent =
      onMaze && s.maze !== null && s.stoneModeOn && s.mazeGame?.rules != null
        ? s.say("stoneHow", { n: s.mazeGame.rules.reach })
        : onMaze && s.maze !== null
          ? mixed
            ? s.say("mazeForButton")
            : s.say(`play_${s.maze.recipe.mode.replace(/-/g, "_")}`)
          : `${s.say("arrowsHint")}${mixed && s.board?.locked.some(Boolean) === true && s.arrowGame?.unlocked !== true ? `${joiner}${s.say("lockedCount", { n: s.board.locked.filter(Boolean).length })}` : ""}`;
    if (onMaze && s.mazeGame !== null && s.maze !== null) {
      const parts: string[] = [];
      if (s.mazeGame.solved)
        parts.push(
          mixed
            ? s.say(s.arrowGame?.status === "cleared" ? "arrowsCleared" : "arrowsUnlocked")
            : s.say("solved", { n: s.moves }),
        );
      else {
        parts.push(s.mazeGame.path.length === 0 ? s.say("notStarted") : s.say("drawn", { n: s.mazeGame.path.length }));
        if (s.maze.keys.length > 0)
          parts.push(s.say("keysOf", { k: s.mazeGame.collected.length, total: s.maze.keys.length }));
        if (s.mazeGame.rules !== null) {
          const left = stonesLeft(s.mazeGame);
          parts.push(
            left === null ? s.say("stonesFree", { n: s.mazeGame.stones.length }) : s.say("stonesLeft", { n: left }),
          );
        }
      }
      s.progress.textContent = parts.join(joiner);
    } else if (s.arrowGame !== null) {
      const hearts = "♥".repeat(s.arrowGame.hearts) + "♡".repeat(s.arrowGame.heartsAtStart - s.arrowGame.hearts);
      s.progress.textContent =
        s.arrowGame.status === "cleared"
          ? s.say("arrowsCleared")
          : `${s.say("arrowsLeft", { n: arrowsLeft(s.arrowGame) })}${joiner}${s.say("hearts", { n: s.arrowGame.hearts, total: s.arrowGame.heartsAtStart })} ${hearts}`;
    }
    // The word of what has just happened is about one board and is said on that board only (the unlock is told on the labyrinth by the line above it,
    // and on the arrows by this one). A puzzle out of hearts says so from its state, on the arrows and, in a mixed puzzle, on the labyrinth too.
    const shown = s.message !== null && s.message.on === s.viewing ? s.message : null;
    const lostNote =
      s.arrowGame?.status === "lost" ? (onMaze ? (mixed ? "arrowsLostAway" : null) : "arrowsLost") : null;
    const line = lostNote !== null && (!onMaze || shown === null) ? { key: lostNote, values: {}, warn: true } : shown;
    s.messages.textContent = line === null ? "" : s.say(line.key, line.values);
    s.messages.dataset.warn = String(line?.warn === true);
  }

  function refresh(): void {
    if (s.viewing === "maze" && s.mazeSurface !== null && s.mazeGame !== null) {
      s.mazeSurface.update(s.mazeGame, s.hintedMaze, s.mazeGame.solved && s.puzzle.kind === "maze");
    } else if (s.viewing === "arrows" && s.arrowSurface !== null && s.arrowGame !== null)
      s.arrowSurface.update(s.arrowGame, s.hintedArrow);
    words();
  }

  function mountSurface(): void {
    s.mazeSurface?.destroy();
    s.arrowSurface?.destroy();
    s.mazeSurface = null;
    s.arrowSurface = null;
    const viewChanged = (): void => {
      const state = s.surfaceNow()?.surface.state();
      s.fitButton.disabled = state?.fitted === true && s.gutterNow === s.gutterLeast;
      s.outButton.disabled = state?.atLeast === true && !s.frameCanWiden();
      s.inButton.disabled = state?.atMost === true && s.gutterNow <= s.gutterLeast;
    };
    if (s.viewing === "maze" && s.maze !== null) {
      s.turnNow = s.resolveNow();
      s.applyBox();
      s.mazeSurface = createMazeSurface(
        s.box,
        {
          game: () => s.mazeGame!,
          change: onMazeChange,
          taps: () => s.tapExtends,
          stoneMode: () => s.stoneModeOn && s.mazeGame?.rules != null,
          stone: layStoneAt,
          viewChanged,
        },
        s.maze,
        s.look,
        s.turnNow,
        { fit: s.fitMode, edgePan: s.edgePanOn, panMode: s.panOn, frame: { zoom: s.frameZoom } },
      );
    } else if (s.board !== null) {
      s.turnNow = 0;
      s.applyBox();
      s.arrowSurface = createArrowSurface(s.box, { tap: onArrowTap, viewChanged }, s.board, s.look);
      if (s.arrowGame !== null) s.arrowSurface.update(s.arrowGame, null);
    }
    refresh();
  }

  /** The word a refused stone is told with. */
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

  /** Tell the page the stones changed, if their number or places did. */
  function stonesMoved(before: MazeGame | null): void {
    if (before === null || s.mazeGame === null) return;
    if (
      before.stones.length === s.mazeGame.stones.length &&
      before.stones.every((cell, at) => cell === s.mazeGame!.stones[at])
    )
      return;
    s.tell("meikyuu-stones", s.callbacks.onStones);
  }

  /** A stone asked for on a cell, by a tap in the Stone mode or a press-and-hold: laid, taken up or refused with a word. True when that did something the player should see. */
  function layStoneAt(cell: number, how: "tap" | "hold"): boolean {
    if (s.viewing !== "maze" || s.mazeGame === null || s.mazeGame.rules === null) return false;
    // A hold that began as a stroke (the finger was within reach of the line's end) first ends that stroke, which was never more than a press.
    const before = how === "hold" && s.mazeGame.drawing ? liftMaze(s.mazeGame) : s.mazeGame;
    const result = toggleStone(before, cell);
    s.hintedMaze = null;
    if (result.how === "refused") {
      // A hold is also what a finger does while looking about a big maze: with no line to lay a stone beside, or nothing left to do, it says nothing and moves on.
      if (how === "hold" && (result.why === "no-line" || result.why === "solved" || result.why === "drawing"))
        return false;
      if (before !== s.mazeGame) s.mazeGame = before;
      s.setMessage(s.STONE_WHY[result.why] ?? "stoneFar", { n: before.rules?.reach ?? 2 }, true);
      s.playSound("bump");
      refresh();
      return true;
    }
    s.mazeGame = result.game;
    s.setMessage(result.how === "laid" ? "stoneLaid" : "stoneTaken");
    s.playSound(result.how === "laid" ? "stone" : "back");
    refresh();
    stonesMoved(before);
    return true;
  }

  function onMazeChange(next: MazeGame, how: "press" | "drag" | "lift" | "tap"): void {
    const before = s.mazeGame!;
    s.mazeGame = next;
    if (how === "press" || how === "tap") {
      s.hintedMaze = null;
      s.setMessage(null);
    }
    if (how === "drag" || how === "tap") {
      if (next.path.length > before.path.length) s.playSound("step");
      else if (next.path.length < before.path.length) s.playSound("back");
      if (next.collected.length > before.collected.length) {
        s.playSound("key");
        s.tell("meikyuu-key", s.callbacks.onKey);
      }
    }
    if (next.solved && !before.solved) s.pendingSolve = true;
    if (how === "lift" || how === "tap") {
      if (next.strokes !== before.strokes) {
        s.moves += 1;
        s.tell("meikyuu-move", s.callbacks.onMove);
      }
      if (s.pendingSolve) {
        s.pendingSolve = false;
        finishMaze();
      }
    }
    refresh();
  }

  /** The line has reached the goal with every key: a maze is won; a labyrinth in a mixed puzzle gives its button up. */
  function finishMaze(): void {
    if (s.puzzle.kind === "mixed") {
      if (s.arrowGame !== null && !s.arrowGame.unlocked) {
        s.arrowGame = unlockArrows(s.arrowGame);
        s.setMessage("arrowsUnlocked", {}, false, "arrows");
        s.playSound("unlock");
        s.tell("meikyuu-unlock", s.callbacks.onUnlock);
      }
      return;
    }
    if (!s.solveTold) {
      s.solveTold = true;
      s.playSound("solve");
      s.tell("meikyuu-solve", s.callbacks.onSolve);
    }
  }

  function onArrowTap(id: number): void {
    if (s.arrowGame === null) return;
    const tapped = tapArrow(s.arrowGame, id);
    if (tapped.result === "ignored") return;
    s.arrowGame = tapped.game;
    s.hintedArrow = null;
    if (tapped.result === "removed") {
      s.setMessage(null);
      s.moves += 1;
      s.arrowSurface?.fly(id, s.still());
      s.playSound("fly");
    } else if (tapped.result === "locked") {
      s.setMessage(tapped.by === undefined ? "arrowsLocked" : "arrowsWaiting", {}, true);
      s.arrowSurface?.bump(id, tapped.by);
      s.playSound("bump");
    } else {
      s.setMessage("arrowsBlocked", {}, true);
      s.arrowSurface?.bump(id, tapped.by);
      s.playSound("bump");
      s.tell("meikyuu-bump", s.callbacks.onBump);
    }
    refresh();
    if (tapped.result === "removed") s.tell("meikyuu-move", s.callbacks.onMove);
    if (s.arrowGame.status === "cleared" && !s.solveTold) {
      s.solveTold = true;
      s.playSound("solve");
      s.tell("meikyuu-solve", s.callbacks.onSolve);
    }
    if (s.arrowGame.status === "lost") {
      s.playSound("lose");
      s.tell("meikyuu-lose", s.callbacks.onLose);
    }
  }

  function begin(next: MeikyuuPuzzle): void {
    s.puzzle = next;
    s.maze = null;
    s.mazeGame = null;
    s.board = null;
    s.arrowGame = null;
    s.hintedMaze = null;
    s.hintedArrow = null;
    s.message = null;
    s.pendingSolve = false;
    s.solveTold = false;
    s.moves = 0;
    if (next.kind === "maze") {
      s.maze = buildMaze(next.recipe);
      s.mazeGame = newMazeGame(s.maze, stoneRulesOf(s.stoneOption, s.maze.grid.cells));
      s.viewing = "maze";
    } else if (next.kind === "arrows") {
      s.board = makeArrows(next.recipe);
      s.arrowGame = newArrowGame(s.board);
      s.viewing = "arrows";
    } else {
      const mixed = buildMixed(next.recipe);
      s.maze = mixed.maze;
      s.mazeGame = newMazeGame(s.maze, stoneRulesOf(s.stoneOption, s.maze.grid.cells));
      s.board = mixed.arrows;
      s.arrowGame = newArrowGame(s.board);
      s.viewing = "arrows";
    }
    mountSurface();
  }

  /** The way a key points (dx, dy in cells, y down) as one step of the line: to the linked neighbour of the line's end that lies nearest that way. */
  function stepByKey(dx: number, dy: number): void {
    if (s.viewing !== "maze" || s.maze === null || s.mazeGame === null || s.mazeGame.solved) return;
    const head = headOf(s.mazeGame) ?? s.maze.start;
    if (headOf(s.mazeGame) === null) {
      onMazeChange(liftMaze(pressMaze(s.mazeGame, s.maze.start)), "tap");
      return;
    }
    const [hx, hy] = s.maze.grid.centres[head]!;
    let best = -1;
    let bestCosine = KEY_REACH;
    for (const next of s.maze.links[head]!) {
      const [nx, ny] = s.maze.grid.centres[next]!;
      const length = Math.hypot(nx - hx, ny - hy) || 1;
      const cosine = ((nx - hx) * dx + (ny - hy) * dy) / (length * Math.hypot(dx, dy));
      if (cosine > bestCosine) {
        bestCosine = cosine;
        best = next;
      }
    }
    // The cell before the end of the line is a way too: stepping toward it draws back.
    const before = s.mazeGame.path.length > 1 ? s.mazeGame.path[s.mazeGame.path.length - 2]! : -1;
    if (before >= 0) {
      const [bx, by] = s.maze.grid.centres[before]!;
      const length = Math.hypot(bx - hx, by - hy) || 1;
      const cosine = ((bx - hx) * dx + (by - hy) * dy) / (length * Math.hypot(dx, dy));
      if (cosine > bestCosine) best = before;
    }
    if (best < 0) return;
    onMazeChange(liftMaze(dragMaze(pressMaze(s.mazeGame, head), best)), "tap");
  }

  /** Shift and an arrow: a stone on (or taken up from) the open neighbour of the line's end that lies nearest that way. */
  function stoneByKey(dx: number, dy: number): void {
    if (s.viewing !== "maze" || s.maze === null || s.mazeGame === null) return;
    const head = headOf(s.mazeGame);
    if (head === null) return;
    const [hx, hy] = s.maze.grid.centres[head]!;
    let best = -1;
    let bestCosine = KEY_REACH;
    for (const next of s.maze.links[head]!) {
      const [nx, ny] = s.maze.grid.centres[next]!;
      const length = Math.hypot(nx - hx, ny - hy) || 1;
      const cosine = ((nx - hx) * dx + (ny - hy) * dy) / (length * Math.hypot(dx, dy));
      if (cosine > bestCosine) {
        bestCosine = cosine;
        best = next;
      }
    }
    if (best >= 0) layStoneAt(best, "tap");
  }

  s.onKey = (event: KeyboardEvent): void => {
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
      event.preventDefault();
      s.api.undo();
      return;
    }
    if (event.target !== s.box) return;
    const arrows: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const step = arrows[event.key];
    if (step !== undefined) {
      event.preventDefault();
      if (event.shiftKey && s.mazeGame?.rules != null) stoneByKey(step[0], step[1]);
      else stepByKey(step[0], step[1]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (s.viewing === "maze" && s.mazeGame !== null && s.mazeGame.path.length === 0) stepByKey(0, 0);
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      s.api.undo();
    }
  };

  s.words = words;
  s.refresh = refresh;
  s.mountSurface = mountSurface;
  s.stonesMoved = stonesMoved;
  s.layStoneAt = layStoneAt;
  s.begin = begin;
}
