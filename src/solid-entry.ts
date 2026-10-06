/**
 * Meikyuu over the surface of a solid: a perfect maze on a cube, a globe, the other dice (a tetrahedron, an octahedron, an icosahedron, a ten-sided, a twelve-sided and more) or a shape (a box, a cross of
 * cubes, a ring, a torus, a star, a heart), with the line drawn from one face to the next across the edges. The graph of the surface (`solidGridOf`), the maze made on it by the very algorithms the flat mazes use
 * (`buildSolidMaze`, `SolidRecipe`), the measure of how hard it is (`solidDifficultyOf`), the arithmetic of looking at a turned solid and of finding
 * the cell under a finger (`projectFrame`, `pickCell`), the checker for an answer (`checkSolidAnswer`) and a still picture as SVG (`drawSolid`).
 * The game itself (drawing, undo, stones, steps) is the root entry's: it plays any maze, flat or not. The board to play in a page is
 * `@johnmorrisdotca/meikyuu/3d/play`, and the numbered levels are in `@johnmorrisdotca/meikyuu/3d/levels`.
 */
export { isSolidCut, MEIKYUU_MOST_SOLID_CELLS, SOLID_KINDS, solidCells, solidGridOf } from "./solid/solidGrid.ts";
export { isSolidDie, SOLID_DICE, SOLID_DIE_SIDES, SOLID_FIRST, SOLID_MORE_DICE, SOLID_MORE_SHAPES, SOLID_SHAPES } from "./solid/solidKinds.ts";
export { MEIKYUU_SOLID_PER_LIST, SOLID_CUTS, SOLID_SIZE_NAMES, solidCellsOf, solidCutOf } from "./solid/solidSizes.ts";
export type { SolidSize } from "./solid/solidSizes.ts";
export type { SolidEdge, SolidGrid, SolidKind } from "./solid/solidGrid.ts";
export { buildSolidMaze, cachedSolidGrid, checkSolidAnswer, parseSolidRecipe, SOLID_ALGORITHMS, solidAnswerSteps, solidDifficultyOf, solidGeometry, solidRecipeCode, solidSolutionOf } from "./solid/solidMaze.ts";
export type { SolidAlgorithm, SolidMaze, SolidRecipe } from "./solid/solidMaze.ts";
export { cellsAlongDrag, createFrame, dragTurn, EDGE_FULL, EDGE_NEIGHBOUR, EDGE_RATE, EDGE_SAFE, edgeTurn, faceCellTurn, openingTurn, pickCell, projectFrame, SOLID_EYE, SOLID_FILL, SOLID_ZOOM_LEAST, SOLID_ZOOM_MOST, stepTurn, trackballPoint } from "./solid/solidView.ts";
export type { SolidFrame } from "./solid/solidView.ts";
export { QUAT_IDENTITY, quatAngle, quatAxisAngle, quatBetween, quatMul, quatNormalize, quatSlerp, quatTurn } from "./solid/vec.ts";
export type { Quat, Vec3 } from "./solid/vec.ts";
export { drawSolid } from "./solid/solidDraw.ts";
export type { DrawSolidOptions } from "./solid/solidDraw.ts";
