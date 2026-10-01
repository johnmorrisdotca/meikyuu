/**
 * Meikyuu 迷宮, a maze game: the rules and the making, with no page needed.
 *
 * - Mazes on any cell graph: squares, hexagons, triangles, circles and shapes cut out of them (`gridOf`,
 *   `MEIKYUU_SHAPES`), carved by seven algorithms from a seed (`carveMaze`), played four ways (`buildMaze`,
 *   `MEIKYUU_MODES`), measured for difficulty (`measureMaze`), drawn as a line through them as pure functions
 *   (`newMazeGame`, `pressMaze`, `dragMaze`, `liftMaze`).
 * - Arrow puzzles that can always be cleared (`makeArrows`, `newArrowGame`, `tapArrow`), and mixed ones with locked
 *   arrows and a labyrinth to find the button in (`buildMixed`).
 * - Every recipe as a short code (`recipeCode`, `parseRecipe`). The numbered levels are in `/levels`, the drawing
 *   in `/draw`, and the board to play in a page in `/play`.
 */
export { VERSION } from "./version.ts";
export { below, pick, seededRandom, shuffled } from "./random.ts";
export type { Random } from "./random.ts";
export { boundaryCells, centreCell, MEIKYUU_SHAPES } from "./grid.ts";
export type { Box, Grid, MeikyuuShape, Point, Side, Wall } from "./grid.ts";
export { circleGrid, gridOf, hexGrid, ringCounts, squareGrid, triangleGrid } from "./shapes.ts";
export { maskOf } from "./masks.ts";
export type { Mask } from "./masks.ts";
export { carveMaze, MEIKYUU_ALGORITHMS } from "./algorithms.ts";
export type { Links, MeikyuuAlgorithm } from "./algorithms.ts";
export { buildMaze, isPerfect, layoutCells, MEIKYUU_MODES, MEIKYUU_MOST_CELLS, MEIKYUU_MOST_KEYS, parseRecipe, passageCount, recipeCode, solutionOf, walk } from "./maze.ts";
export type { Door, MazeRecipe, Maze, MeikyuuMode } from "./maze.ts";
export { EFFORT_LEAST, EFFORT_MOST, measureMaze, ratingOf } from "./measure.ts";
export type { MazeMeasure } from "./measure.ts";
export { dragMaze, headOf, hintMaze, liftMaze, mazeProgress, newMazeGame, playSolution, pressMaze, restartMaze, tapMaze, undoMaze } from "./game.ts";
export type { MazeGame } from "./game.ts";
export { ARROW_SHAPES, ARROW_STEPS, MEIKYUU_MOST_ARROW_CELLS, arrowRecipeCode, blockersOf, makeArrows, measureArrows, parseArrowRecipe, peelRounds, rayOf } from "./arrows.ts";
export type { Arrow, ArrowBoard, ArrowDirection, ArrowMeasure, ArrowRecipe, ArrowShape } from "./arrows.ts";
export { ARROW_HEARTS, arrowsLeft, blockedBy, clearArrows, hintArrow, isFree, newArrowGame, restartArrows, tapArrow, undoArrow, unlockArrows } from "./arrowGame.ts";
export type { ArrowGame, ArrowTap } from "./arrowGame.ts";
export { buildMixed, measureMixed, mixedRecipeCode, mixedSolved, newMixedGame, parseMixedRecipe, withArrows, withMaze } from "./mixed.ts";
export type { MixedBoard, MixedGame, MixedRecipe } from "./mixed.ts";
