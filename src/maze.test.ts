import { describe, expect, it } from "vitest";

import { MEIKYUU_ALGORITHMS } from "./algorithms.ts";
import { MEIKYUU_SHAPES } from "./grid.ts";
import { buildMaze, isPerfect, MEIKYUU_MODES, parseRecipe, recipeCode, solutionOf, walk, type MazeRecipe } from "./maze.ts";

const SIZES: Record<(typeof MEIKYUU_SHAPES)[number], [number, number]> = {
  square: [13, 9], hex: [11, 9], triangle: [15, 8], circle: [9, 9], heart: [25, 25], leaf: [25, 25], star: [31, 31], ring: [21, 21], diamond: [19, 19], cross: [19, 19], moon: [23, 23], hexagon: [5, 5], pyramid: [8, 8],
};

describe("every shape's mazes are perfect, whichever algorithm made them", () => {
  for (const shape of MEIKYUU_SHAPES) {
    for (const algorithm of MEIKYUU_ALGORITHMS) {
      if (algorithm === "eller" && shape !== "square") continue;
      it(`${shape} by ${algorithm}: a spanning tree, so exactly one way between any two cells`, () => {
        const [w, h] = SIZES[shape];
        for (const seed of [1, 2, 3]) {
          const maze = buildMaze({ shape, w, h, algorithm, mode: "to-goal", seed });
          expect(isPerfect(maze.grid, maze.links)).toBe(true);
          // Exactly one simple path between two cells: n - 1 passages, connected, is a tree.
          expect(maze.links.reduce((sum, open) => sum + open.length, 0)).toBe(2 * (maze.grid.cells - 1));
          const { dist } = walk(maze.links, 0);
          expect(dist.every((d) => d >= 0)).toBe(true);
        }
      });
    }
  }

  it("Eller's algorithm is for squares, and says so", () => {
    expect(() => buildMaze({ shape: "hex", w: 5, h: 5, algorithm: "eller", mode: "to-goal", seed: 1 })).toThrow(/square/);
  });
});

describe("a recipe makes the same maze every time, and its code reads back", () => {
  it("rebuilds identically", () => {
    const recipe: MazeRecipe = { shape: "hex", w: 12, h: 10, algorithm: "wilson", mode: "enter-leave", seed: 48213 };
    const one = buildMaze(recipe);
    const two = buildMaze({ ...recipe });
    expect(two.links).toEqual(one.links);
    expect([two.start, two.goal]).toEqual([one.start, one.goal]);
    expect(buildMaze({ ...recipe, seed: 48214 }).links).not.toEqual(one.links);
  });

  it("pins a maze, so a change to the stream or to a generator is noticed: a 6×6 backtracker by seed 7", () => {
    const maze = buildMaze({ shape: "square", w: 6, h: 6, algorithm: "backtracker", mode: "to-goal", seed: 7 });
    expect([maze.start, maze.goal, solutionOf(maze).length]).toEqual([26, 0, 23]);
    expect(maze.links.map((open) => [...open].sort((a, b) => a - b).join(",")).join("|").length).toBeGreaterThan(50);
  });

  it("round-trips every shape and mode through its code", () => {
    for (const shape of MEIKYUU_SHAPES) {
      for (const mode of MEIKYUU_MODES) {
        const [w, h] = SIZES[shape];
        const recipe: MazeRecipe = { shape, w, h: ["square", "hex", "triangle"].includes(shape) ? h : w, algorithm: "prim", mode, seed: 9, ...(mode === "keys" ? { keys: 3 } : {}) };
        expect(parseRecipe(recipeCode(recipe))).toEqual(recipe);
      }
    }
    expect(recipeCode({ shape: "square", w: 12, h: 9, algorithm: "wilson", mode: "to-goal", seed: 48213 })).toBe("square:12x9:wilson:to-goal:48213");
    expect(recipeCode({ shape: "heart", w: 25, h: 25, algorithm: "prim", mode: "keys", keys: 3, seed: 7 })).toBe("heart:25:prim:keys-3:7");
  });

  it("refuses what is not a recipe", () => {
    for (const bad of ["", "square:12x9:wilson:to-goal", "cube:12x9:wilson:to-goal:1", "square:12:wilson:to-goal:1", "heart:12x9:prim:to-goal:1", "square:12x9:dfs:to-goal:1", "square:12x9:wilson:fly:1", "square:12x9:wilson:to-goal:-1", "square:1x9:wilson:to-goal:1"]) expect(parseRecipe(bad), bad).toBeNull();
  });
});

describe("each way to play places its start, goal and doors as declared", () => {
  const base = { algorithm: "wilson", seed: 21 } as const;

  it("enter-leave: a door in the outer wall at each end, on the edge, far apart", () => {
    for (const shape of MEIKYUU_SHAPES) {
      const [w, h] = SIZES[shape];
      const maze = buildMaze({ ...base, shape, w, h, mode: "enter-leave" });
      expect(maze.entrance, shape).not.toBeNull();
      expect(maze.exit).not.toBeNull();
      expect(maze.entrance!.cell).toBe(maze.start);
      expect(maze.exit!.cell).toBe(maze.goal);
      expect(maze.grid.sides[maze.start]![maze.entrance!.side]!.to).toBe(-1);
      expect(maze.grid.sides[maze.goal]![maze.exit!.side]!.to).toBe(-1);
      expect(maze.start).not.toBe(maze.goal);
      expect(solutionOf(maze).length).toBeGreaterThan(Math.sqrt(maze.grid.cells));
    }
  });

  it("to-goal: a start inside the maze and a goal deep from it, no doors", () => {
    const maze = buildMaze({ ...base, shape: "square", w: 20, h: 20, mode: "to-goal" });
    expect(maze.entrance).toBeNull();
    expect(maze.exit).toBeNull();
    expect(maze.grid.sides[maze.start]!.every((side) => side.to >= 0)).toBe(true);
    const { dist } = walk(maze.links, maze.start);
    expect(dist[maze.goal]).toBeGreaterThanOrEqual(Math.ceil(0.8 * Math.max(...dist)));
  });

  it("centre-out: from the middle of the shape to a door in the outer wall", () => {
    for (const shape of ["square", "circle", "hex", "heart", "hexagon"] as const) {
      const [w, h] = SIZES[shape];
      const maze = buildMaze({ ...base, shape, w, h, mode: "centre-out" });
      const [x, y] = maze.grid.centres[maze.start]!;
      expect(Math.hypot(x - (maze.grid.box.x + maze.grid.box.w / 2), y - (maze.grid.box.y + maze.grid.box.h / 2)), shape).toBeLessThan(1.6);
      expect(maze.exit!.cell).toBe(maze.goal);
      expect(maze.grid.sides[maze.goal]![maze.exit!.side]!.to).toBe(-1);
    }
  });

  it("keys: as many keys as asked, each at the end of a branch that is off the way, no two alike", () => {
    const maze = buildMaze({ ...base, shape: "square", w: 20, h: 20, mode: "keys", keys: 3 });
    expect(maze.keys.length).toBe(3);
    expect(new Set(maze.keys).size).toBe(3);
    const way = new Set(solutionOf(maze));
    for (const key of maze.keys) {
      expect(way.has(key)).toBe(false);
      expect(maze.links[key]!.length).toBe(1);
    }
    expect(maze.exit).not.toBeNull();
  });
});
