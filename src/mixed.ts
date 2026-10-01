import { arrowRecipeCode, makeArrows, measureArrows, parseArrowRecipe, type ArrowBoard, type ArrowRecipe } from "./arrows.ts";
import { newArrowGame, unlockArrows, type ArrowGame } from "./arrowGame.ts";
import { newMazeGame, type MazeGame } from "./game.ts";
import { buildMaze, parseRecipe, recipeCode, type Maze, type MazeRecipe } from "./maze.ts";
import { measureMaze } from "./measure.ts";

/**
 * THE MIXED PUZZLE: an arrow board with some arrows locked, and a labyrinth beside it with an unlock
 * button hidden deep inside. The labyrinth is an ordinary maze played to its goal (the button); reaching
 * the button unlocks every locked arrow at once. The arrows are the puzzle (clear them all, with the
 * hearts you have); the labyrinth is the way to the arrows that are in the way.
 *
 * A locked arrow can be in the way of others, so the puzzle cannot be finished without the button, and
 * it can always be: the arrows can all be cleared once they are unlocked, and the labyrinth can always
 * be solved. A level is its two recipes, written `<arrows>|<maze>`.
 */
export type MixedRecipe = { readonly arrows: ArrowRecipe; readonly maze: MazeRecipe };

export type MixedBoard = { readonly recipe: MixedRecipe; readonly arrows: ArrowBoard; readonly maze: Maze };

export function mixedRecipeCode(recipe: MixedRecipe): string {
  return `${arrowRecipeCode(recipe.arrows)}|${recipeCode(recipe.maze)}`;
}

export function parseMixedRecipe(code: string): MixedRecipe | null {
  const [arrows, maze, ...rest] = code.split("|");
  if (arrows === undefined || maze === undefined || rest.length > 0) return null;
  const a = parseArrowRecipe(arrows);
  const m = parseRecipe(maze);
  return a === null || m === null || (a.locks ?? 0) < 1 || m.mode !== "to-goal" ? null : { arrows: a, maze: m };
}

export function buildMixed(recipe: MixedRecipe): MixedBoard {
  return { recipe, arrows: makeArrows(recipe.arrows), maze: buildMaze(recipe.maze) };
}

/** How hard it is: the arrows' effort and half the labyrinth's. */
export function measureMixed(board: MixedBoard): number {
  return measureArrows(board.arrows).effort + Math.round(measureMaze(board.maze).effort / 2);
}

export type MixedGame = { readonly arrows: ArrowGame; readonly maze: MazeGame };

export function newMixedGame(board: MixedBoard): MixedGame {
  return { arrows: newArrowGame(board.arrows), maze: newMazeGame(board.maze) };
}

/** The labyrinth changed: when its button is reached, every locked arrow is unlocked. */
export function withMaze(game: MixedGame, maze: MazeGame): MixedGame {
  return { arrows: maze.solved ? unlockArrows(game.arrows) : game.arrows, maze };
}

/** The arrows changed. */
export function withArrows(game: MixedGame, arrows: ArrowGame): MixedGame {
  return { ...game, arrows };
}

/** Whether the puzzle is won: every arrow cleared. */
export function mixedSolved(game: MixedGame): boolean {
  return game.arrows.status === "cleared";
}
