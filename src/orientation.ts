import type { Box, Grid, Point } from "./grid.ts";

/**
 * WHICH WAY UP A MAZE IS LOOKED AT. A tall maze is made to be played upright on a phone and wants to lie down on a wide screen; a wide one
 * the other way. Turning is presentation only: the maze, its cells and the line drawn through them stay as they were made (the logical
 * orientation), and the board draws them a quarter turn counter-clockwise, so the maze's top is on the left, its left at the foot, and a
 * finger's path over the picture is carried back into the maze before anything is decided. A line stored as its steps (`lineToSteps`)
 * therefore replays the same on a board turned either way, which is what lets a person start a level on a phone and finish it on a desk.
 *
 * The turn is a quarter turn counter-clockwise: the logical point (x, y) is shown at (y, -x), a rotation of -90 degrees in SVG's terms.
 *
 * @example
 * ```ts
 * import { MEIKYUU_ORIENTATIONS } from "@johnmorrisdotca/meikyuu/play";
 * console.log(MEIKYUU_ORIENTATIONS);
 * ```
 */
export const MEIKYUU_ORIENTATIONS = ["portrait", "landscape", "auto"] as const;
/** The native portrait, landscape or automatic board orientation.
 *
 * @example
 * ```ts
 * import type { MeikyuuOrientation } from "@johnmorrisdotca/meikyuu/play";
 *
 * const value: MeikyuuOrientation = "portrait";
 * console.log(value);
 * ```
 */
export type MeikyuuOrientation = (typeof MEIKYUU_ORIENTATIONS)[number];

/** 0 for a maze shown as it was made, 1 for a quarter turn counter-clockwise.
 *
 * @example
 * ```ts
 * import type { Turn } from "@johnmorrisdotca/meikyuu";
 *
 * const value: Turn = 1;
 * console.log(value);
 * ```
 */
export type Turn = 0 | 1;

/** A logical point as it is shown.
 *
 * @param turn - The native quarter-turn setting.
 * @param options - Native display/mount choices, or the point tuple specified by this signature.
 * @returns A logical point as it is shown.
 * @example
 * ```ts
 * import { toDisplay } from "@johnmorrisdotca/meikyuu";
 *
 * console.log(toDisplay(1,[10,20]));
 * ```
 */
export function toDisplay(turn: Turn, [x, y]: Point): [number, number] {
  return turn === 0 ? [x, y] : [y, -x];
}

/** A point of the picture as the maze has it: the inverse of `toDisplay`.
 *
 * @param turn - The native quarter-turn setting.
 * @param options - Native display/mount choices, or the point tuple specified by this signature.
 * @returns A point of the picture as the maze has it: the inverse of `toDisplay`.
 * @example
 * ```ts
 * import { toLogical } from "@johnmorrisdotca/meikyuu";
 *
 * console.log(toLogical(1,[10,20]));
 * ```
 */
export function toLogical(turn: Turn, [x, y]: Point): [number, number] {
  return turn === 0 ? [x, y] : [-y, x];
}

/** The rectangle a logical rectangle takes when shown.
 *
 * @param turn - The native quarter-turn setting.
 * @param box - The viewport dimensions and logical board bounds, or board bounds specified by the signature.
 * @returns The rectangle a logical rectangle takes when shown.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, turnedBox } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const box = {width:390,height:844,area:grid.box};
 * console.log(turnedBox(1,grid.box));
 * ```
 */
export function turnedBox(turn: Turn, box: Box): Box {
  return turn === 0 ? box : { x: box.y, y: -(box.x + box.w), w: box.h, h: box.w };
}

/** The logical rectangle a shown rectangle covers: the inverse of `turnedBox`.
 *
 * @param turn - The native quarter-turn setting.
 * @param box - The viewport dimensions and logical board bounds, or board bounds specified by the signature.
 * @returns The logical rectangle a shown rectangle covers: the inverse of `turnedBox`.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, turnedBox, unturnedBox } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const box = {width:390,height:844,area:grid.box};
 * console.log(unturnedBox(1,turnedBox(1,grid.box)));
 * ```
 */
export function unturnedBox(turn: Turn, box: Box): Box {
  return turn === 0 ? box : { x: -(box.y + box.h), y: box.x, w: box.h, h: box.w };
}

/** The SVG transform that shows a logical drawing turned, or none.
 *
 * @param turn - The native quarter-turn setting.
 * @returns The SVG transform that shows a logical drawing turned, or none.
 * @example
 * ```ts
 * import { turnTransform } from "@johnmorrisdotca/meikyuu";
 *
 * console.log(turnTransform(1));
 * ```
 */
export function turnTransform(turn: Turn): string {
  return turn === 0 ? "" : "rotate(-90)";
}

/**
 * Whether to turn a maze `box` (as made) for an orientation. `portrait` turns a wide maze upright and `landscape` lays a tall one down;
 * a maze that is as wide as it is tall (within a tenth) is never turned by either. `auto` has no container to look at here, so it leaves
 * the maze as made: see `autoTurn`.
 *
 * @param orientation - Portrait, landscape or automatic native orientation.
 * @param box - The viewport dimensions and logical board bounds, or board bounds specified by the signature.
 * @returns Whether to turn a maze `box` (as made) for an orientation. `portrait` turns a wide maze upright and `landscape` lays a tall one down; a maze that is as wide as it is tall (within a tenth) is never turned by either. `auto` has no container to look at here, so it leaves the maze as made: see `autoTurn`.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, turnFor } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const box = {width:390,height:844,area:grid.box};
 * console.log(turnFor("portrait",grid.box));
 * ```
 */
export function turnFor(orientation: MeikyuuOrientation, box: Box): Turn {
  const ratio = box.w / box.h;
  if (orientation === "portrait") return ratio > 1.1 ? 1 : 0;
  if (orientation === "landscape") return ratio < 1 / 1.1 ? 1 : 0;
  return 0;
}

/**
 * `auto`: turn a maze when that makes it bigger in the room there is. `room` is the width and height a board may have; `ratio` the board's
 * width over its height as made (a number the host chose, or the maze's own). A board fills the room as far as its shape allows, so it
 * is the wider-than-tall room that fits a tall maze lying down. A tie, or a gain under a twelfth, leaves it as made.
 *
 * @param box - The viewport dimensions and logical board bounds, or board bounds specified by the signature.
 * @param ratio - The desired display ratio.
 * @param room - Available viewport width/height, or null before layout.
 * @returns `auto`: turn a maze when that makes it bigger in the room there is. `room` is the width and height a board may have; `ratio` the board's width over its height as made (a number the host chose, or the maze's own). A board fills the room as far as its shape allows, so it is the wider-than-tall room that fits a tall maze lying down. A tie, or a gain under a twelfth, leaves it as made.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { autoTurn, buildMaze } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const box = {width:390,height:844,area:grid.box};
 * console.log(autoTurn(grid.box,1,{width:390,height:844}));
 * ```
 */
export function autoTurn(box: Box, ratio: number, room: { width: number; height: number }): Turn {
  // The biggest board of an aspect that fits the room, and the scale the maze (or the maze turned) has fitted in it.
  const scale = (aspect: number, across: number, down: number): number => {
    const width = Math.min(room.width, room.height * aspect);
    return Math.min(width / across, width / aspect / down);
  };
  const upright = scale(ratio, box.w, box.h);
  const turned = scale(1 / ratio, box.h, box.w);
  return turned > upright * (1 + 1 / 12) ? 1 : 0;
}

/** The turn an orientation means for a maze, given the room when it is `auto`.
 *
 * @param orientation - Portrait, landscape or automatic native orientation.
 * @param box - The viewport dimensions and logical board bounds, or board bounds specified by the signature.
 * @param ratio - The desired display ratio.
 * @param room - Available viewport width/height, or null before layout.
 * @returns The turn an orientation means for a maze, given the room when it is `auto`.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, resolveTurn } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const box = {width:390,height:844,area:grid.box};
 * console.log(resolveTurn("auto",grid.box,1,{width:390,height:844}));
 * ```
 */
export function resolveTurn(orientation: MeikyuuOrientation, box: Box, ratio: number, room: { width: number; height: number } | null): Turn {
  if (orientation !== "auto") return turnFor(orientation, box);
  return room === null ? 0 : autoTurn(box, ratio, room);
}

/**
 * The cells a pointer enters moving from one shown point to the next: the straight path between them cut into steps of a third of a cell
 * and each step carried back into the maze. Every cell it passes is offered in order, so a fast finger skips none. The board and the
 * tests use this one function, so a line drawn on a turned board is exactly the line drawn on one that is not.
 *
 * @param grid - The valid native flat or surface cell graph.
 * @param turn - The native quarter-turn setting.
 * @param from - The start cell or pointer point specified by the signature.
 * @param to - The destination pointer point specified by the signature.
 * @returns The cells a pointer enters moving from one shown point to the next: the straight path between them cut into steps of a third of a cell and each step carried back into the maze. Every cell it passes is offered in order, so a fast finger skips none. The board and the tests use this one function, so a line drawn on a turned board is exactly the line drawn on one that is not.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, cellsAlong, solutionOf } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const route = solutionOf(maze);
 * console.log(cellsAlong(grid,0,grid.centres[route[0]],grid.centres[route[1]]));
 * ```
 */
export function cellsAlong(grid: Grid, turn: Turn, from: Point, to: Point): number[] {
  const [ax, ay] = toLogical(turn, from);
  const [bx, by] = toLogical(turn, to);
  const length = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(1, Math.ceil(length / 0.3));
  const cells: number[] = [];
  let previous = -2;
  for (let i = 1; i <= steps; i += 1) {
    const cell = grid.at(ax + ((bx - ax) * i) / steps, ay + ((by - ay) * i) / steps);
    if (cell < 0 || cell === previous) continue;
    previous = cell;
    cells.push(cell);
  }
  return cells;
}
