import { describe, expect, it } from "vitest";

import { clearArrows, newArrowGame, tapArrow, unlockArrows } from "./arrowGame.ts";
import { arrowRecipeCode, makeArrows, measureArrows } from "./arrows.ts";
import { MEIKYUU_ARROW_LEVELS, MEIKYUU_MIXED_LEVELS } from "./levels.ts";
import { isPerfect, solutionOf } from "./maze.ts";
import { dragMaze, liftMaze, newMazeGame, pressMaze } from "./game.ts";
import { buildMixed, measureMixed, mixedRecipeCode, newMixedGame, withMaze } from "./mixed.ts";

describe("the arrow levels", () => {
  it("are numbered from 1, each a different recipe, and never get easier", () => {
    expect(MEIKYUU_ARROW_LEVELS.length).toBeGreaterThanOrEqual(250);
    MEIKYUU_ARROW_LEVELS.forEach((level, index) => expect(level.number).toBe(index + 1));
    expect(new Set(MEIKYUU_ARROW_LEVELS.map((level) => level.code)).size).toBe(MEIKYUU_ARROW_LEVELS.length);
    for (let i = 1; i < MEIKYUU_ARROW_LEVELS.length; i += 1) expect(MEIKYUU_ARROW_LEVELS[i]!.effort, `level ${i + 1}`).toBeGreaterThanOrEqual(MEIKYUU_ARROW_LEVELS[i - 1]!.effort);
    expect(MEIKYUU_ARROW_LEVELS[0]!.effort).toBeLessThan(15);
    expect(MEIKYUU_ARROW_LEVELS.at(-1)!.effort).toBeGreaterThan(200);
  });

  it("every one builds from its recipe, measures what the list says, and can always be cleared, taking the arrows in the opposite order they were added or any order of free ones", () => {
    for (const level of MEIKYUU_ARROW_LEVELS) {
      const where = `arrow level ${level.number} (${level.code})`;
      expect(arrowRecipeCode(level.recipe), where).toBe(level.code);
      const board = makeArrows(level.recipe);
      expect(measureArrows(board).effort, where).toBe(level.effort);
      expect(board.locked.some(Boolean), where).toBe(false);
      const done = clearArrows(newArrowGame(board));
      expect(done.status, where).toBe("cleared");
      expect(done.mistakes, where).toBe(0);
      let game = newArrowGame(board);
      for (let id = board.arrows.length - 1; id >= 0; id -= 1) game = tapArrow(game, id).game;
      expect(game.status, where).toBe("cleared");
    }
  }, 120_000);

  it("mix the pictures, a bigger picture and a longer arrow as the list goes on", () => {
    const shapes = new Set(MEIKYUU_ARROW_LEVELS.map((level) => level.recipe.shape));
    expect(shapes.size).toBeGreaterThanOrEqual(7);
    const early = MEIKYUU_ARROW_LEVELS.slice(0, 30).map((level) => level.recipe);
    const late = MEIKYUU_ARROW_LEVELS.slice(-30).map((level) => level.recipe);
    expect(Math.max(...early.map((r) => r.longest))).toBeLessThan(Math.max(...late.map((r) => r.longest)));
    expect(Math.max(...early.map((r) => r.w * r.h))).toBeLessThan(Math.min(...late.map((r) => r.w * r.h)));
  });
});

describe("the mixed levels", () => {
  it("are numbered from 1, each a different recipe, never get easier, and each has locks and a labyrinth", () => {
    expect(MEIKYUU_MIXED_LEVELS.length).toBeGreaterThanOrEqual(80);
    MEIKYUU_MIXED_LEVELS.forEach((level, index) => expect(level.number).toBe(index + 1));
    expect(new Set(MEIKYUU_MIXED_LEVELS.map((level) => level.code)).size).toBe(MEIKYUU_MIXED_LEVELS.length);
    for (let i = 1; i < MEIKYUU_MIXED_LEVELS.length; i += 1) expect(MEIKYUU_MIXED_LEVELS[i]!.effort).toBeGreaterThanOrEqual(MEIKYUU_MIXED_LEVELS[i - 1]!.effort);
    for (const level of MEIKYUU_MIXED_LEVELS) {
      expect(level.recipe.arrows.locks).toBeGreaterThanOrEqual(1);
      expect(level.recipe.maze.mode).toBe("to-goal");
    }
  });

  it("every one cannot be finished until its button is reached, and can be after: the labyrinth is solved by drawing, the arrows are cleared", () => {
    for (const level of MEIKYUU_MIXED_LEVELS) {
      const where = `mixed level ${level.number} (${level.code})`;
      expect(mixedRecipeCode(level.recipe), where).toBe(level.code);
      const board = buildMixed(level.recipe);
      expect(measureMixed(board), where).toBe(level.effort);
      expect(isPerfect(board.maze.grid, board.maze.links), where).toBe(true);
      expect(board.arrows.locked.filter(Boolean).length, where).toBe(level.recipe.arrows.locks);
      let game = newMixedGame(board);
      // Locked: the arrows cannot all be cleared.
      expect(clearArrows(game.arrows).status, where).toBe("playing");
      // Draw the labyrinth to the button, a cell at a time.
      let maze = pressMaze(newMazeGame(board.maze), board.maze.start);
      for (const cell of solutionOf(board.maze)) maze = dragMaze(maze, cell);
      maze = liftMaze(maze);
      expect(maze.solved, where).toBe(true);
      game = withMaze(game, maze);
      expect(game.arrows.unlocked, where).toBe(true);
      expect(clearArrows(game.arrows).status, where).toBe("cleared");
      expect(clearArrows(unlockArrows(newArrowGame(board.arrows))).status, where).toBe("cleared");
    }
  }, 120_000);
});
