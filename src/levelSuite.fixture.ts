import { expect, it } from "vitest";

import { difficultyOf, isTooEasy } from "./difficulty.ts";
import { isPerfect, recipeCode, buildMaze } from "./maze.ts";
import { measureMaze } from "./measure.ts";
import { newMazeGame, playSolution } from "./game.ts";
import { MEIKYUU_MAZE_LEVELS, sizeOf } from "./levels.ts";
import { MEIKYUU_COLOSSAL_LEVELS, MEIKYUU_COLOSSAL_TALL_LEVELS } from "./levels-colossal.ts";
import { MEIKYUU_TALL_LEVELS } from "./levels-tall.ts";
import { TALL_RATIO } from "./tall.ts";

/**
 * What every maze level must be, checked for the levels `from` to `to` (from 1): its recipe is its code, it builds, it is a perfect
 * maze of the cells the table says, it measures the effort and the score the table says, it is not too easy (`isTooEasy`'s least, whatever its place: since 3.0.0 a list is in the order of the score, not built up to a floor), and a line drawn along its
 * way (by the game's own rules, a cell at a time, picking up its keys) solves it. The lists are split across several test files so that
 * they run side by side.
 */
export function checkMazeLevels(from: number, to: number, list: "square" | "tall" | "colossal" | "colossal-tall" = "square"): void {
  const levels = list === "square" ? MEIKYUU_MAZE_LEVELS : list === "tall" ? MEIKYUU_TALL_LEVELS : list === "colossal" ? MEIKYUU_COLOSSAL_LEVELS : MEIKYUU_COLOSSAL_TALL_LEVELS;
  it(`${list} levels ${from} to ${to} build, are perfect, measure what the list says, are not too easy, and are solved by drawing their way`, () => {
    for (const level of levels.slice(from - 1, to)) {
      const where = `${list} level ${level.number} (${level.code})`;
      expect(recipeCode(level.recipe), where).toBe(level.code);
      const maze = buildMaze(level.recipe);
      expect(maze.grid.cells, where).toBe(level.cells);
      expect(isPerfect(maze.grid, maze.links), where).toBe(true);
      expect(measureMaze(maze).effort, where).toBe(level.effort);
      const difficulty = difficultyOf(maze);
      expect(difficulty.score, where).toBe(level.score);
      expect(isTooEasy(difficulty), `${where} is too easy`).toBe(false);
      expect(difficulty.straight, `${where}: the straight guess solves it`).toBe(false);
      const game = playSolution(newMazeGame(maze));
      expect(game.solved, where).toBe(true);
      expect(game.collected.length, where).toBe(maze.keys.length);
      if (level.recipe.mode === "keys") expect(maze.keys.length, where).toBe(level.recipe.keys);
      if (level.recipe.mode === "enter-leave") expect(maze.entrance, where).not.toBeNull();
      if (level.recipe.mode !== "to-goal") expect(maze.exit ?? maze.entrance, where).not.toBeNull();
      if (list === "square") expect(sizeOf(level.cells), where).toBe((level as (typeof MEIKYUU_MAZE_LEVELS)[number]).size);
      else if (list === "colossal") expect(level.cells, where).toBeGreaterThanOrEqual(9500);
      else {
        // Upright, and filling a container two thirds as wide as it is tall.
        const { box } = maze.grid;
        expect(box.w / box.h, where).toBeGreaterThan(TALL_RATIO - 0.04);
        expect(box.w / box.h, where).toBeLessThan(TALL_RATIO + 0.04);
      }
    }
  }, 120_000);
}
