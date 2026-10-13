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
 *
 * @example
 * ```ts
 * import type { ArrowRecipe, MazeRecipe, MixedRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, makeArrows } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const arrowRecipe: ArrowRecipe = {shape:"square",w:5,h:5,longest:3,seed:42};
 * const arrows = makeArrows(arrowRecipe);
 * const mixedRecipe: MixedRecipe = {maze:recipe,arrows:arrowRecipe};
 * const value: MixedRecipe = mixedRecipe;
 * console.log(value);
 * ```
 */
export type MixedRecipe = { readonly arrows: ArrowRecipe; readonly maze: MazeRecipe };

/** A native mixed recipe with its flat maze and arrow layers.
 *
 * @example
 * ```ts
 * import type { ArrowRecipe, MazeRecipe, MixedBoard, MixedRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, buildMixed, makeArrows } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const arrowRecipe: ArrowRecipe = {shape:"square",w:5,h:5,longest:3,seed:42};
 * const arrows = makeArrows(arrowRecipe);
 * const mixedRecipe: MixedRecipe = {maze:recipe,arrows:arrowRecipe};
 * const mixed = buildMixed(mixedRecipe);
 * const value: MixedBoard = mixed;
 * console.log(value);
 * ```
 */
export type MixedBoard = { readonly recipe: MixedRecipe; readonly arrows: ArrowBoard; readonly maze: Maze };

/** Encode a native mixed maze/arrow recipe as reproducible text.
 *
 * @param recipe - The complete reproducible native recipe.
 * @returns Encode a native mixed maze/arrow recipe as reproducible text.
 * @example
 * ```ts
 * import type { ArrowRecipe, MazeRecipe, MixedRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, makeArrows, mixedRecipeCode } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const arrowRecipe: ArrowRecipe = {shape:"square",w:5,h:5,longest:3,seed:42};
 * const arrows = makeArrows(arrowRecipe);
 * const mixedRecipe: MixedRecipe = {maze:recipe,arrows:arrowRecipe};
 * console.log(mixedRecipeCode(mixedRecipe));
 * ```
 */
export function mixedRecipeCode(recipe: MixedRecipe): string {
  return `${arrowRecipeCode(recipe.arrows)}|${recipeCode(recipe.maze)}`;
}

/** Read native mixed-recipe text, or null for a malformed maze/arrow recipe.
 *
 * @param code - The native encoded recipe or saved run.
 * @returns Read native mixed-recipe text, or null for a malformed maze/arrow recipe.
 * @example
 * ```ts
 * import type { ArrowRecipe, MazeRecipe, MixedRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, makeArrows, mixedRecipeCode, parseMixedRecipe } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const arrowRecipe: ArrowRecipe = {shape:"square",w:5,h:5,longest:3,seed:42};
 * const arrows = makeArrows(arrowRecipe);
 * const mixedRecipe: MixedRecipe = {maze:recipe,arrows:arrowRecipe};
 * console.log(parseMixedRecipe(mixedRecipeCode(mixedRecipe)));
 * ```
 */
export function parseMixedRecipe(code: string): MixedRecipe | null {
  const [arrows, maze, ...rest] = code.split("|");
  if (arrows === undefined || maze === undefined || rest.length > 0) return null;
  const a = parseArrowRecipe(arrows);
  const m = parseRecipe(maze);
  return a === null || m === null || (a.locks ?? 0) < 1 || m.mode !== "to-goal" ? null : { arrows: a, maze: m };
}

/** Build the maze and locked-arrow layers of one native mixed recipe.
 *
 * @param recipe - The complete reproducible native recipe.
 * @returns Build the maze and locked-arrow layers of one native mixed recipe.
 * @example
 * ```ts
 * import type { ArrowRecipe, MazeRecipe, MixedRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, buildMixed, makeArrows } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const arrowRecipe: ArrowRecipe = {shape:"square",w:5,h:5,longest:3,seed:42};
 * const arrows = makeArrows(arrowRecipe);
 * const mixedRecipe: MixedRecipe = {maze:recipe,arrows:arrowRecipe};
 * console.log(buildMixed(mixedRecipe).maze.grid.cells);
 * ```
 */
export function buildMixed(recipe: MixedRecipe): MixedBoard {
  return { recipe, arrows: makeArrows(recipe.arrows), maze: buildMaze(recipe.maze) };
}

/** How hard it is: the arrows' effort and half the labyrinth's.
 *
 * @param board - The native arrow board or named maze appearance specified by this signature.
 * @returns How hard it is: the arrows' effort and half the labyrinth's.
 * @example
 * ```ts
 * import type { ArrowRecipe, MazeRecipe, MixedRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, buildMixed, makeArrows, measureMixed } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const arrowRecipe: ArrowRecipe = {shape:"square",w:5,h:5,longest:3,seed:42};
 * const arrows = makeArrows(arrowRecipe);
 * const mixedRecipe: MixedRecipe = {maze:recipe,arrows:arrowRecipe};
 * const mixed = buildMixed(mixedRecipe);
 * console.log(measureMixed(mixed));
 * ```
 */
export function measureMixed(board: MixedBoard): number {
  return measureArrows(board.arrows).effort + Math.round(measureMaze(board.maze).effort / 2);
}

/** The current native maze and arrow states of one mixed puzzle.
 *
 * @example
 * ```ts
 * import type { ArrowRecipe, MazeRecipe, MixedGame, MixedRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, buildMixed, makeArrows, newMixedGame } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const arrowRecipe: ArrowRecipe = {shape:"square",w:5,h:5,longest:3,seed:42};
 * const arrows = makeArrows(arrowRecipe);
 * const mixedRecipe: MixedRecipe = {maze:recipe,arrows:arrowRecipe};
 * const mixed = buildMixed(mixedRecipe);
 * const mixedGame = newMixedGame(mixed);
 * const value: MixedGame = mixedGame;
 * console.log(value);
 * ```
 */
export type MixedGame = { readonly arrows: ArrowGame; readonly maze: MazeGame };

/** Create the native game states for both layers of a mixed board.
 *
 * @param board - The native arrow board or named maze appearance specified by this signature.
 * @returns Create the native game states for both layers of a mixed board.
 * @example
 * ```ts
 * import type { ArrowRecipe, MazeRecipe, MixedRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, buildMixed, makeArrows, newMixedGame } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const arrowRecipe: ArrowRecipe = {shape:"square",w:5,h:5,longest:3,seed:42};
 * const arrows = makeArrows(arrowRecipe);
 * const mixedRecipe: MixedRecipe = {maze:recipe,arrows:arrowRecipe};
 * const mixed = buildMixed(mixedRecipe);
 * console.log(newMixedGame(mixed));
 * ```
 */
export function newMixedGame(board: MixedBoard): MixedGame {
  return { arrows: newArrowGame(board.arrows), maze: newMazeGame(board.maze) };
}

/** The labyrinth changed: when its button is reached, every locked arrow is unlocked.
 *
 * @param game - The current immutable native game state.
 * @param maze - The valid flat/surface maze or required maze-core fields.
 * @returns The labyrinth changed: when its button is reached, every locked arrow is unlocked.
 * @example
 * ```ts
 * import type { ArrowRecipe, MazeRecipe, MixedRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, buildMixed, makeArrows, newMixedGame, playSolution, withMaze } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const arrowRecipe: ArrowRecipe = {shape:"square",w:5,h:5,longest:3,seed:42};
 * const arrows = makeArrows(arrowRecipe);
 * const mixedRecipe: MixedRecipe = {maze:recipe,arrows:arrowRecipe};
 * const mixed = buildMixed(mixedRecipe);
 * const mixedGame = newMixedGame(mixed);
 * console.log(withMaze(mixedGame,playSolution(mixedGame.maze)).maze.solved);
 * ```
 */
export function withMaze(game: MixedGame, maze: MazeGame): MixedGame {
  return { arrows: maze.solved ? unlockArrows(game.arrows) : game.arrows, maze };
}

/** The arrows changed.
 *
 * @param game - The current immutable native game state.
 * @param arrows - The replacement native arrow state.
 * @returns The arrows changed.
 * @example
 * ```ts
 * import type { ArrowRecipe, MazeRecipe, MixedRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, buildMixed, clearArrows, makeArrows, newMixedGame, withArrows } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const arrowRecipe: ArrowRecipe = {shape:"square",w:5,h:5,longest:3,seed:42};
 * const arrows = makeArrows(arrowRecipe);
 * const mixedRecipe: MixedRecipe = {maze:recipe,arrows:arrowRecipe};
 * const mixed = buildMixed(mixedRecipe);
 * const mixedGame = newMixedGame(mixed);
 * console.log(withArrows(mixedGame,clearArrows(mixedGame.arrows)).arrows.status);
 * ```
 */
export function withArrows(game: MixedGame, arrows: ArrowGame): MixedGame {
  return { ...game, arrows };
}

/** Whether the puzzle is won: every arrow cleared.
 *
 * @param game - The current immutable native game state.
 * @returns Whether the puzzle is won: every arrow cleared.
 * @example
 * ```ts
 * import type { ArrowRecipe, MazeRecipe, MixedRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, buildMixed, makeArrows, mixedSolved, newMixedGame } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const arrowRecipe: ArrowRecipe = {shape:"square",w:5,h:5,longest:3,seed:42};
 * const arrows = makeArrows(arrowRecipe);
 * const mixedRecipe: MixedRecipe = {maze:recipe,arrows:arrowRecipe};
 * const mixed = buildMixed(mixedRecipe);
 * const mixedGame = newMixedGame(mixed);
 * console.log(mixedSolved(mixedGame));
 * ```
 */
export function mixedSolved(game: MixedGame): boolean {
  return game.arrows.status === "cleared";
}
