import { describe, expect, it } from "vitest";

import { clearArrows, tapArrow } from "./arrowGame.ts";
import { dragMaze, liftMaze, pressMaze } from "./game.ts";
import { solutionOf } from "./maze.ts";
import { buildMixed, measureMixed, mixedRecipeCode, mixedSolved, newMixedGame, parseMixedRecipe, withArrows, withMaze, type MixedRecipe } from "./mixed.ts";

const recipe: MixedRecipe = { arrows: { shape: "square", w: 9, h: 9, longest: 4, seed: 5, locks: 2 }, maze: { shape: "square", w: 8, h: 8, algorithm: "kruskal", mode: "to-goal", seed: 3 } };

describe("a mixed puzzle", () => {
  it("is its two recipes in one code, read back, and refuses what is not one", () => {
    expect(mixedRecipeCode(recipe)).toBe("square:9x9:4:5:2|square:8x8:kruskal:to-goal:3");
    expect(parseMixedRecipe(mixedRecipeCode(recipe))).toEqual(recipe);
    for (const bad of ["", "square:9x9:4:5:2", "square:9x9:4:5|square:8x8:kruskal:to-goal:3", "square:9x9:4:5:2|square:8x8:kruskal:enter-leave:3", "a|b|c"]) expect(parseMixedRecipe(bad), bad).toBeNull();
  });

  it("locks arrows that matter, and a labyrinth whose button is its goal", () => {
    const board = buildMixed(recipe);
    expect(board.arrows.locked.filter(Boolean).length).toBe(2);
    expect(board.maze.recipe.mode).toBe("to-goal");
    expect(measureMixed(board)).toBeGreaterThan(20);
  });

  it("unlocks the arrows when the labyrinth's button is reached, and not before, and is won when every arrow is cleared", () => {
    const board = buildMixed(recipe);
    let game = newMixedGame(board);
    expect(game.arrows.unlocked).toBe(false);
    const locked = board.arrows.locked.indexOf(true);
    expect(tapArrow(game.arrows, locked).result).toBe("locked");
    // Part of the way along the labyrinth is not enough.
    let maze = pressMaze(game.maze, board.maze.start);
    const way = solutionOf(board.maze);
    for (const cell of way.slice(0, -1)) maze = dragMaze(maze, cell);
    game = withMaze(game, liftMaze(maze));
    expect(game.arrows.unlocked).toBe(false);
    maze = pressMaze(game.maze, way[way.length - 2]!);
    game = withMaze(game, liftMaze(dragMaze(maze, way[way.length - 1]!)));
    expect(game.maze.solved).toBe(true);
    expect(game.arrows.unlocked).toBe(true);
    expect(mixedSolved(game)).toBe(false);
    game = withArrows(game, clearArrows(game.arrows));
    expect(mixedSolved(game)).toBe(true);
  });
});
