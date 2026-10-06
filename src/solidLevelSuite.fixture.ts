import { expect, it } from "vitest";

import { isTooEasy } from "./difficulty.ts";
import { newMazeGame, playSolution } from "./game.ts";
import { MEIKYUU_SOLID_LEVELS } from "./levels-solid-all.ts";
import { isPerfect } from "./maze.ts";
import { measureMaze, ratingOf } from "./measure.ts";
import type { SolidKind } from "./solid/solidGrid.ts";
import { buildSolidMaze, checkSolidAnswer, solidDifficultyOf, solidRecipeCode, solidSolutionOf } from "./solid/solidMaze.ts";
import { SOLID_SIZE_NAMES, solidCellsOf } from "./solid/solidSizes.ts";

/**
 * What every level of a solid must be, checked for every size of the solids given: its recipe is its code, it builds, it is a perfect maze of the cells its size says, it measures the effort and the
 * score the list says, it is not too easy, it scores no less than the level before it, it is solved by drawing its way (by the game's own rules) and is checked by the answer's own checker, and no
 * recipe is in a list twice. The lists are split across several test files so that they run side by side.
 */
export function checkSolidLevels(kinds: readonly SolidKind[]): void {
  for (const kind of kinds) {
    for (const size of SOLID_SIZE_NAMES) {
      it(`${kind} ${size}: every level is rebuilt, proved perfect, measured again, solved by drawing, and never scoring under the one before`, () => {
        const list = MEIKYUU_SOLID_LEVELS[kind]![size];
        expect(list).toHaveLength(64);
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
      }, 120_000);
    }
  }
}
