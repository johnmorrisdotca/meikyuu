import { expect, it } from "vitest";

import { isPerfect, recipeCode, buildMaze } from "./maze.ts";
import { measureMaze } from "./measure.ts";
import { newMazeGame, playSolution } from "./game.ts";
import { MEIKYUU_MAZE_LEVELS } from "./levels.ts";

/**
 * What every maze level must be, checked for the levels `from` to `to` (from 1): its recipe is its code, it builds, it is a perfect
 * maze of the cells the table says, it measures the effort the table says, and a line drawn along its way (by the game's own rules,
 * a cell at a time, picking up its keys) solves it. The list is split across several test files so that they run side by side.
 */
export function checkMazeLevels(from: number, to: number): void {
  it(`levels ${from} to ${to} build, are perfect, measure what the list says, and are solved by drawing their way`, () => {
    for (const level of MEIKYUU_MAZE_LEVELS.slice(from - 1, to)) {
      const where = `maze level ${level.number} (${level.code})`;
      expect(recipeCode(level.recipe), where).toBe(level.code);
      const maze = buildMaze(level.recipe);
      expect(maze.grid.cells, where).toBe(level.cells);
      expect(isPerfect(maze.grid, maze.links), where).toBe(true);
      expect(measureMaze(maze).effort, where).toBe(level.effort);
      const game = playSolution(newMazeGame(maze));
      expect(game.solved, where).toBe(true);
      expect(game.collected.length, where).toBe(maze.keys.length);
      if (level.recipe.mode === "keys") expect(maze.keys.length, where).toBe(level.recipe.keys);
      if (level.recipe.mode === "enter-leave") expect(maze.entrance, where).not.toBeNull();
      if (level.recipe.mode !== "to-goal") expect(maze.exit ?? maze.entrance, where).not.toBeNull();
    }
  }, 120_000);
}
