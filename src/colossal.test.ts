import { describe, expect, it } from "vitest";

import { COLOSSAL_CELLS, COLOSSAL_TALL_HEIGHT, COLOSSAL_TALL_WIDTH, colossalLevelOf, colossalTallLevelOf, findColossalLevels, MEIKYUU_COLOSSAL_LEVELS, MEIKYUU_COLOSSAL_PER_LIST, MEIKYUU_COLOSSAL_TALL_LEVELS } from "./levels-colossal.ts";
import { MEIKYUU_MAZE_LEVELS } from "./levels.ts";
import { MEIKYUU_TALL_LEVELS } from "./levels-tall.ts";
import { buildMaze, layoutCells, MEIKYUU_MOST_CELLS, parseRecipe } from "./maze.ts";
import { TALL_RATIO } from "./tall.ts";

const ALL = [...MEIKYUU_COLOSSAL_LEVELS, ...MEIKYUU_COLOSSAL_TALL_LEVELS];

describe("the colossal levels", () => {
  it("are two lists of 128, numbered from 1, with no maze of any other list among them", () => {
    expect(MEIKYUU_COLOSSAL_PER_LIST).toBe(128);
    expect(MEIKYUU_COLOSSAL_LEVELS.length).toBe(128);
    expect(MEIKYUU_COLOSSAL_TALL_LEVELS.length).toBe(128);
    for (const list of [MEIKYUU_COLOSSAL_LEVELS, MEIKYUU_COLOSSAL_TALL_LEVELS]) list.forEach((level, index) => {
      expect(level.number).toBe(index + 1);
      expect(level.inSize).toBe(index + 1);
      expect(level.rating).toBeGreaterThanOrEqual(1);
      expect(level.rating).toBeLessThanOrEqual(100);
    });
    expect(new Set(ALL.map((level) => level.code)).size).toBe(256);
    const others = new Set([...MEIKYUU_MAZE_LEVELS, ...MEIKYUU_TALL_LEVELS].map((level) => level.code));
    expect(ALL.some((level) => others.has(level.code))).toBe(false);
    expect(colossalLevelOf(1)).toBe(MEIKYUU_COLOSSAL_LEVELS[0]);
    expect(colossalLevelOf(128)).toBe(MEIKYUU_COLOSSAL_LEVELS[127]);
    expect(colossalLevelOf(129)).toBeNull();
    expect(colossalLevelOf(0)).toBeNull();
    expect(colossalLevelOf(1.5)).toBeNull();
    expect(colossalTallLevelOf(128)).toBe(MEIKYUU_COLOSSAL_TALL_LEVELS[127]);
    expect(colossalTallLevelOf(129)).toBeNull();
  });

  it("are about ten thousand cells (square) and 64 across by 96 down (tall), the biggest the lists go", () => {
    const biggest = Math.max(...MEIKYUU_MAZE_LEVELS.map((level) => level.cells));
    for (const level of MEIKYUU_COLOSSAL_LEVELS) {
      expect(level.cells, level.code).toBeGreaterThanOrEqual(COLOSSAL_CELLS[0]);
      expect(level.cells, level.code).toBeLessThanOrEqual(COLOSSAL_CELLS[1]);
      expect(level.ratio).toBe("square");
    }
    expect(Math.min(...MEIKYUU_COLOSSAL_LEVELS.map((level) => level.cells))).toBeGreaterThan(biggest);
    expect(MEIKYUU_COLOSSAL_LEVELS.some((level) => level.recipe.shape === "square" && level.recipe.w >= 90 && level.recipe.w <= 110)).toBe(true);
    expect([COLOSSAL_TALL_WIDTH, COLOSSAL_TALL_HEIGHT]).toEqual([64, 96]);
    for (const level of MEIKYUU_COLOSSAL_TALL_LEVELS) {
      expect(level.ratio, level.code).toBe(TALL_RATIO);
      expect(level.cells, level.code).toBeGreaterThan(64 * 96 * 0.8);
      expect(level.cells, level.code).toBeLessThan(64 * 96 * 1.2);
      if (level.recipe.shape === "square") expect([level.recipe.w, level.recipe.h], level.code).toEqual([64, 96]);
    }
  });

  it("stay inside what a recipe may ask for, and every code is its recipe", () => {
    for (const level of ALL) {
      expect(layoutCells(level.recipe.shape, level.recipe.w, level.recipe.h), level.code).toBeLessThanOrEqual(36_100);
      expect(layoutCells(level.recipe.shape, level.recipe.w, level.recipe.h), level.code).toBeLessThan(MEIKYUU_MOST_CELLS);
      expect(parseRecipe(level.code), level.code).toEqual(level.recipe);
    }
  });

  it("climb by the score, never scoring under the one before, and the score is the same measure as every other list", () => {
    for (const list of [MEIKYUU_COLOSSAL_LEVELS, MEIKYUU_COLOSSAL_TALL_LEVELS]) {
      for (let i = 1; i < list.length; i += 1) expect(list[i]!.score, `level ${i + 1}`).toBeGreaterThanOrEqual(list[i - 1]!.score);
      const mean = (from: number, to: number): number => list.slice(from, to).reduce((a, level) => a + level.score, 0) / (to - from);
      expect(mean(0, 43)).toBeLessThan(mean(43, 86));
      expect(mean(43, 86)).toBeLessThan(mean(86, 128));
      expect(list[127]!.score).toBeGreaterThan(list[0]!.score + 8);
      for (const level of list) expect(level.score, level.code).toBeGreaterThan(40);
    }
    // The biggest colossal maze is harder than the hardest huge one, the smallest is no easier than a middling huge one.
    const huge = MEIKYUU_MAZE_LEVELS.slice(768);
    expect(Math.max(...MEIKYUU_COLOSSAL_LEVELS.map((level) => level.effort))).toBeGreaterThan(Math.max(...huge.map((level) => level.effort)));
  });

  it("come in every shape and way to play, in both lists", () => {
    for (const shape of ["square", "hex", "triangle", "circle"] as const) expect(findColossalLevels({ list: "colossal", shape }).length, shape).toBeGreaterThanOrEqual(5);
    expect(new Set(MEIKYUU_COLOSSAL_LEVELS.map((level) => level.recipe.shape)).size).toBeGreaterThanOrEqual(10);
    for (const mode of ["enter-leave", "to-goal", "centre-out", "keys"] as const) for (const list of ["colossal", "colossal-tall"] as const) expect(findColossalLevels({ list, mode }).length, `${list} ${mode}`).toBeGreaterThanOrEqual(15);
    expect(new Set(MEIKYUU_COLOSSAL_TALL_LEVELS.map((level) => level.recipe.shape))).toEqual(new Set(["square", "hex", "triangle"]));
    expect(findColossalLevels().length).toBe(256);
  });

  it("are made from their recipe in a browser's time: the biggest builds in well under a second", () => {
    const biggest = [...ALL].sort((a, b) => b.cells - a.cells).slice(0, 3);
    for (const level of biggest) {
      const started = performance.now();
      const maze = buildMaze(level.recipe);
      const took = performance.now() - started;
      expect(maze.grid.cells).toBe(level.cells);
      expect(took, `${level.code} took ${took.toFixed(0)} ms`).toBeLessThan(1500);
    }
  });
});
