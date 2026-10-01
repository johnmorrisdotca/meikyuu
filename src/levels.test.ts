import { describe, expect, it } from "vitest";

import { findMazeLevels, levelCount, levelOf, levelsOf, MEIKYUU_ARROW_LEVELS, MEIKYUU_KINDS, MEIKYUU_MAZE_LEVELS, MEIKYUU_MIXED_LEVELS, MEIKYUU_SIZES, sizeOf } from "./levels.ts";
import { MEIKYUU_ALGORITHMS } from "./algorithms.ts";
import { MEIKYUU_SHAPES } from "./grid.ts";
import { MEIKYUU_MODES } from "./maze.ts";
import { ratingOf } from "./measure.ts";

describe("the maze list", () => {
  it("has about a thousand levels, numbered from 1, each a different recipe", () => {
    expect(MEIKYUU_MAZE_LEVELS.length).toBe(1000);
    MEIKYUU_MAZE_LEVELS.forEach((level, index) => expect(level.number).toBe(index + 1));
    expect(new Set(MEIKYUU_MAZE_LEVELS.map((level) => level.code)).size).toBe(1000);
  });

  it("never gets easier: every level is at least as hard as the one before, by the effort it measures and by the rating", () => {
    for (let i = 1; i < MEIKYUU_MAZE_LEVELS.length; i += 1) {
      expect(MEIKYUU_MAZE_LEVELS[i]!.effort, `level ${i + 1}`).toBeGreaterThanOrEqual(MEIKYUU_MAZE_LEVELS[i - 1]!.effort);
      expect(MEIKYUU_MAZE_LEVELS[i]!.rating, `level ${i + 1}`).toBeGreaterThanOrEqual(MEIKYUU_MAZE_LEVELS[i - 1]!.rating);
    }
  });

  it("starts small and quick, and grows to huge mazes that take a while", () => {
    const first = MEIKYUU_MAZE_LEVELS[0]!;
    const last = MEIKYUU_MAZE_LEVELS[999]!;
    expect(first.cells).toBeLessThanOrEqual(12);
    expect(first.effort).toBeLessThanOrEqual(12);
    expect(first.rating).toBe(1);
    expect(last.cells).toBeGreaterThan(5000);
    expect(last.effort).toBeGreaterThan(4000);
    expect(last.rating).toBeGreaterThan(95);
    // Cells grow with the list: the last hundred are all bigger than the first four hundred.
    const mostEarly = Math.max(...MEIKYUU_MAZE_LEVELS.slice(0, 400).map((level) => level.cells));
    expect(Math.min(...MEIKYUU_MAZE_LEVELS.slice(900).map((level) => level.cells))).toBeGreaterThan(mostEarly);
    expect(Math.max(...MEIKYUU_MAZE_LEVELS.map((level) => level.cells))).toBeLessThanOrEqual(9000);
  });

  it("mixes the shapes, the ways to play and the algorithms through the list, a quarter at a time", () => {
    for (const shape of MEIKYUU_SHAPES) expect(findMazeLevels({ shape }).length, shape).toBeGreaterThanOrEqual(30);
    for (const mode of MEIKYUU_MODES) expect(findMazeLevels({ mode }).length, mode).toBeGreaterThanOrEqual(100);
    for (const algorithm of MEIKYUU_ALGORITHMS) expect(MEIKYUU_MAZE_LEVELS.filter((level) => level.recipe.algorithm === algorithm).length, algorithm).toBeGreaterThanOrEqual(10);
    // Once a shape has arrived it keeps coming: in each of the last three quarters, every shape and every way to play turns up.
    for (const from of [250, 500, 750]) {
      const quarter = MEIKYUU_MAZE_LEVELS.slice(from, from + 250);
      for (const shape of MEIKYUU_SHAPES) expect(quarter.some((level) => level.recipe.shape === shape), `${shape} after ${from}`).toBe(true);
      for (const mode of MEIKYUU_MODES) expect(quarter.some((level) => level.recipe.mode === mode), `${mode} after ${from}`).toBe(true);
    }
    // The first levels are plain squares, and the first is in and out: the shapes and the ways to play arrive as the list goes on.
    expect(MEIKYUU_MAZE_LEVELS.slice(0, 7).every((level) => level.recipe.shape === "square")).toBe(true);
    expect(MEIKYUU_MAZE_LEVELS[0]!.recipe.mode).toBe("enter-leave");
    expect(MEIKYUU_MAZE_LEVELS.findIndex((level) => level.recipe.shape !== "square")).toBeGreaterThan(6);
  });

  it("gives each size a share of the list", () => {
    for (const size of MEIKYUU_SIZES) expect(findMazeLevels({ size }).length, size).toBeGreaterThanOrEqual(80);
    expect(sizeOf(10)).toBe("small");
    expect(sizeOf(200)).toBe("medium");
    expect(sizeOf(1000)).toBe("large");
    expect(sizeOf(5000)).toBe("huge");
    expect(sizeOf(149)).toBe("small");
    expect(sizeOf(4000)).toBe("huge");
  });

  it("is found by kind and number", () => {
    expect(levelOf("maze", 1)).toBe(MEIKYUU_MAZE_LEVELS[0]);
    expect(levelOf("maze", 0)).toBeNull();
    expect(levelOf("maze", 1001)).toBeNull();
    expect(levelOf("arrows", 5)).toBe(MEIKYUU_ARROW_LEVELS[4]);
    expect(levelOf("mixed", 3)).toBe(MEIKYUU_MIXED_LEVELS[2]);
    expect(levelsOf("mixed")).toBe(MEIKYUU_MIXED_LEVELS);
    for (const kind of MEIKYUU_KINDS) expect(levelCount(kind)).toBe(levelsOf(kind).length);
    expect(MEIKYUU_KINDS).toEqual(["maze", "arrows", "mixed"]);
  });

  it("rates the effort of a level the same way every time", () => {
    for (const level of MEIKYUU_MAZE_LEVELS.slice(0, 50)) expect(level.rating).toBe(ratingOf(level.effort));
  });
});
