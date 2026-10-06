import { describe, expect, it } from "vitest";

import { isTooEasy } from "./difficulty.ts";
import { newMazeGame, playSolution } from "./game.ts";
import { findSolidLevels, MEIKYUU_SOLID_LEVELS, MEIKYUU_SOLID_PER_LIST, solidLevelOf, solidLevelsOf } from "./levels-solid.ts";
import { isPerfect } from "./maze.ts";
import { measureMaze, ratingOf } from "./measure.ts";
import { SOLID_KINDS } from "./solid/solidGrid.ts";
import { buildSolidMaze, checkSolidAnswer, solidDifficultyOf, solidRecipeCode, solidSolutionOf } from "./solid/solidMaze.ts";
import { SOLID_CUTS, SOLID_SIZE_NAMES, solidCellsOf } from "./solid/solidSizes.ts";

describe("the solid levels", () => {
  it("are sixty-four to a size, three sizes to a solid, five solids", () => {
    expect(MEIKYUU_SOLID_PER_LIST).toBe(64);
    expect(findSolidLevels()).toHaveLength(5 * 3 * 64);
    for (const kind of SOLID_KINDS) for (const size of SOLID_SIZE_NAMES) expect(solidLevelsOf(kind, size)).toHaveLength(64);
    expect(solidLevelOf("cube", "small", 1)?.number).toBe(1);
    expect(solidLevelOf("cube", "small", 65)).toBeNull();
    expect(solidLevelOf("cube", "small", 0)).toBeNull();
    expect(findSolidLevels({ kind: "sphere", size: "large" })).toHaveLength(64);
  });

  it("have about the same cells whichever solid it is, in three steps up", () => {
    for (const size of SOLID_SIZE_NAMES) {
      const cells = SOLID_KINDS.map((kind) => solidCellsOf(kind, size));
      expect(Math.max(...cells) / Math.min(...cells), size).toBeLessThan(1.45);
    }
    for (const kind of SOLID_KINDS) {
      expect(SOLID_CUTS[kind][0]).toBeLessThan(SOLID_CUTS[kind][1]);
      expect(solidCellsOf(kind, "large")).toBeLessThanOrEqual(750);
    }
  });

  for (const kind of SOLID_KINDS) {
    for (const size of SOLID_SIZE_NAMES) {
      it(`${kind} ${size}: every level is rebuilt, proved perfect, measured again, solved by drawing, and never scoring under the one before`, () => {
        const list = MEIKYUU_SOLID_LEVELS[kind][size];
        const seen = new Set<string>();
        let before = -Infinity;
        for (const level of list) {
          const maze = buildSolidMaze(level.recipe);
          expect(solidRecipeCode(level.recipe)).toBe(level.code);
          expect(level.recipe.kind).toBe(kind);
          expect(level.cells).toBe(solidCellsOf(kind, size));
          expect(maze.grid.cells).toBe(level.cells);
          expect(isPerfect(maze.grid, maze.links), level.code).toBe(true);
          const difficulty = solidDifficultyOf(maze);
          expect(measureMaze(maze).effort, level.code).toBe(level.effort);
          expect(difficulty.score, level.code).toBe(level.score);
          expect(level.rating).toBe(ratingOf(level.effort));
          expect(isTooEasy(difficulty), level.code).toBe(false);
          expect(difficulty.exact, level.code).toBeGreaterThanOrEqual(before);
          before = difficulty.exact;
          expect(playSolution(newMazeGame(maze)).solved, level.code).toBe(true);
          expect(checkSolidAnswer(maze, solidSolutionOf(maze)), level.code).toBe(true);
          expect(seen.has(level.code)).toBe(false);
          seen.add(level.code);
        }
      });
    }
  }

  it("climb: the last level of a size scores higher than the first, and the large ones higher than the small", () => {
    for (const kind of SOLID_KINDS) {
      for (const size of SOLID_SIZE_NAMES) {
        const list = solidLevelsOf(kind, size);
        expect(list[63]!.score).toBeGreaterThan(list[0]!.score);
      }
      const median = (size: "small" | "medium" | "large"): number => solidLevelsOf(kind, size)[32]!.score;
      expect(median("medium"), kind).toBeGreaterThanOrEqual(median("small"));
      expect(median("large"), kind).toBeGreaterThan(median("medium"));
    }
  });
});
