import { describe, expect, it } from "vitest";

import { dragMaze, liftMaze, newMazeGame, pressMaze, playSolution } from "./game.ts";
import { MEIKYUU_SHAPES, type MeikyuuShape } from "./grid.ts";
import { MEIKYUU_TALL_LEVELS } from "./levels-tall.ts";
import { MEIKYUU_MAZE_LEVELS } from "./levels.ts";
import { MEIKYUU_MODES, buildMaze, solutionOf, type Maze } from "./maze.ts";
import { autoTurn, cellsAlong, resolveTurn, toDisplay, toLogical, turnedBox, turnFor, turnTransform, unturnedBox, type Turn } from "./orientation.ts";
import { lineToSteps, stepsToLine } from "./steps.ts";

const SIZES: Record<MeikyuuShape, [number, number]> = { square: [9, 6], hex: [8, 6], triangle: [10, 5], circle: [5, 5], heart: [14, 14], leaf: [14, 14], star: [16, 16], ring: [12, 12], diamond: [12, 12], cross: [11, 11], moon: [14, 14], hexagon: [3, 3], pyramid: [6, 6] };

/** A line drawn as a finger draws it on a board shown at a turn: down on the start, and moved through the middle of each cell in the picture, one point at a time. */
function drawnAt(maze: Maze, cells: readonly number[], turn: Turn): { path: readonly number[]; steps: string | null; solved: boolean } {
  let game = pressMaze(newMazeGame(maze), cells[0]!);
  for (let i = 1; i < cells.length; i += 1) {
    const from = toDisplay(turn, maze.grid.centres[cells[i - 1]!]!);
    const to = toDisplay(turn, maze.grid.centres[cells[i]!]!);
    for (const cell of cellsAlong(maze.grid, turn, from, to)) game = dragMaze(game, cell);
  }
  game = liftMaze(game);
  return { path: game.path, steps: lineToSteps(maze, game.path), solved: game.solved };
}

describe("turning a maze a quarter", () => {
  it("carries a point there and back, and a rectangle with it", () => {
    for (const turn of [0, 1] as const) {
      for (const point of [[0, 0], [3, 4], [-2.5, 7.25]] as const) {
        const back = toLogical(turn, toDisplay(turn, point));
        expect(back[0]).toBeCloseTo(point[0], 12);
        expect(back[1]).toBeCloseTo(point[1], 12);
      }
      const box = { x: 1, y: 2, w: 6, h: 9 };
      expect(unturnedBox(turn, turnedBox(turn, box))).toEqual(box);
    }
    // Counter-clockwise: the maze's top ends up on the left, and its left at the foot.
    expect(toDisplay(1, [0, 0])).toEqual([0, -0]);
    expect(toDisplay(1, [0, 5])).toEqual([5, -0]);
    expect(toDisplay(1, [4, 0])).toEqual([0, -4]);
    expect(turnedBox(1, { x: 0, y: 0, w: 6, h: 9 })).toEqual({ x: 0, y: -6, w: 9, h: 6 });
    expect(turnTransform(0)).toBe("");
    expect(turnTransform(1)).toBe("rotate(-90)");
  });

  it("turns a wide maze upright and a tall one down when told, a square one never, and leaves auto to the room", () => {
    const tall = { x: 0, y: 0, w: 6, h: 9 };
    const wide = { x: 0, y: 0, w: 9, h: 6 };
    const square = { x: 0, y: 0, w: 8, h: 8.5 };
    expect([turnFor("portrait", tall), turnFor("portrait", wide), turnFor("portrait", square)]).toEqual([0, 1, 0]);
    expect([turnFor("landscape", tall), turnFor("landscape", wide), turnFor("landscape", square)]).toEqual([1, 0, 0]);
    expect(turnFor("auto", tall)).toBe(0);
    expect(resolveTurn("auto", tall, 2 / 3, null)).toBe(0);
  });

  it("lies a tall maze down where the room is wider than tall, and not on a phone held upright", () => {
    const tall = { x: 0, y: 0, w: 10, h: 15 };
    // A phone upright: 342 across and 640 high in the window, less the page's own.
    expect(autoTurn(tall, 2 / 3, { width: 342, height: 560 })).toBe(0);
    // A phone on its side: wide and short.
    expect(autoTurn(tall, 2 / 3, { width: 796, height: 300 })).toBe(1);
    // A desk with a column of 900 and a window 700 high.
    expect(autoTurn(tall, 2 / 3, { width: 900, height: 600 })).toBe(1);
    // A square room: it is the same either way, so it is left as made.
    expect(autoTurn(tall, 2 / 3, { width: 600, height: 600 })).toBe(0);
    // A square box is never turned, whatever the room.
    expect(autoTurn(tall, 1, { width: 900, height: 300 })).toBe(0);
    // And a wide maze stands up in a tall, narrow room.
    expect(autoTurn({ x: 0, y: 0, w: 15, h: 10 }, 3 / 2, { width: 340, height: 700 })).toBe(1);
  });
});

describe("a line drawn on a board that is turned is the line drawn on one that is not", () => {
  for (const shape of MEIKYUU_SHAPES) {
    it(`${shape}: the same cells, the same steps, solved, whichever way it is shown`, () => {
      const [w, h] = SIZES[shape];
      for (const mode of MEIKYUU_MODES) {
        const maze = buildMaze({ shape, w, h, algorithm: "wilson", mode, seed: 31, ...(mode === "keys" ? { keys: 2 } : {}) });
        const way = solutionOf(maze);
        const reference = playSolution(newMazeGame(maze));
        const made = drawnAt(maze, way, 0);
        const turned = drawnAt(maze, way, 1);
        expect(made.path, `${shape} ${mode}`).toEqual(turned.path);
        expect(made.steps, `${shape} ${mode}`).toBe(turned.steps);
        expect(made.path.slice(0, way.length), `${shape} ${mode}`).toEqual(way.slice(0, made.path.length));
        if (mode !== "keys") {
          // Without keys to detour for, the finger's line is the way through and solves it.
          expect(made.path, `${shape} ${mode}`).toEqual(way);
          expect(made.solved).toBe(true);
          expect(turned.solved).toBe(true);
          expect(made.steps).toBe(lineToSteps(maze, reference.path));
        }
        // The steps read back the line.
        expect(stepsToLine(maze, turned.steps!)).toEqual([...turned.path]);
      }
    });
  }

  it("holds for a spread of tall levels and square levels, drawn upright and lying down", () => {
    for (const level of [...MEIKYUU_TALL_LEVELS.filter((_, i) => i % 61 === 0), ...MEIKYUU_MAZE_LEVELS.filter((_, i) => i % 83 === 0)]) {
      const maze = buildMaze(level.recipe);
      if (maze.keys.length > 0) continue;
      const way = solutionOf(maze);
      const upright = drawnAt(maze, way, 0);
      const lying = drawnAt(maze, way, 1);
      expect(lying.steps, level.code).toBe(upright.steps);
      expect(lying.path, level.code).toEqual(way);
      expect(lying.solved, level.code).toBe(true);
    }
  });
});

describe("a line as its steps", () => {
  it("is one character a step, from the start, and refuses what is no line", () => {
    const maze = buildMaze({ shape: "square", w: 5, h: 5, algorithm: "prim", mode: "to-goal", seed: 3 });
    const way = solutionOf(maze);
    const steps = lineToSteps(maze, way)!;
    expect(steps.length).toBe(way.length - 1);
    expect(stepsToLine(maze, steps)).toEqual(way);
    expect(stepsToLine(maze, "")).toEqual([maze.start]);
    expect(stepsToLine(maze, steps.slice(0, 3))).toEqual(way.slice(0, 4));
    expect(stepsToLine(maze, "Z!")).toBeNull();
    // Two cells that are not neighbours are no step.
    expect(lineToSteps(maze, [maze.start, maze.start])).toBeNull();
    // A step through a wall reads as no line.
    const walled = maze.grid.neighbours[maze.start]!.findIndex((n) => !maze.links[maze.start]!.includes(n));
    if (walled >= 0) expect(stepsToLine(maze, walled.toString(36))).toBeNull();
  });
});
