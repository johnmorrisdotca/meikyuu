import type { Box, Grid, Point } from "./grid.ts";

/**
 * WHICH WAY UP A MAZE IS LOOKED AT. A tall maze is made to be played upright on a phone and wants to lie down on a wide screen; a wide one
 * the other way. Turning is presentation only: the maze, its cells and the line drawn through them stay as they were made (the logical
 * orientation), and the board draws them a quarter turn counter-clockwise, so the maze's top is on the left, its left at the foot, and a
 * finger's path over the picture is carried back into the maze before anything is decided. A line stored as its steps (`lineToSteps`)
 * therefore replays the same on a board turned either way, which is what lets a person start a level on a phone and finish it on a desk.
 *
 * The turn is a quarter turn counter-clockwise: the logical point (x, y) is shown at (y, -x), a rotation of -90 degrees in SVG's terms.
 */
export const MEIKYUU_ORIENTATIONS = ["portrait", "landscape", "auto"] as const;
export type MeikyuuOrientation = (typeof MEIKYUU_ORIENTATIONS)[number];

/** 0 for a maze shown as it was made, 1 for a quarter turn counter-clockwise. */
export type Turn = 0 | 1;

/** A logical point as it is shown. */
export function toDisplay(turn: Turn, [x, y]: Point): [number, number] {
  return turn === 0 ? [x, y] : [y, -x];
}

/** A point of the picture as the maze has it: the inverse of `toDisplay`. */
export function toLogical(turn: Turn, [x, y]: Point): [number, number] {
  return turn === 0 ? [x, y] : [-y, x];
}

/** The rectangle a logical rectangle takes when shown. */
export function turnedBox(turn: Turn, box: Box): Box {
  return turn === 0 ? box : { x: box.y, y: -(box.x + box.w), w: box.h, h: box.w };
}

/** The logical rectangle a shown rectangle covers: the inverse of `turnedBox`. */
export function unturnedBox(turn: Turn, box: Box): Box {
  return turn === 0 ? box : { x: -(box.y + box.h), y: box.x, w: box.h, h: box.w };
}

/** The SVG transform that shows a logical drawing turned, or none. */
export function turnTransform(turn: Turn): string {
  return turn === 0 ? "" : "rotate(-90)";
}

/**
 * Whether to turn a maze `box` (as made) for an orientation. `portrait` turns a wide maze upright and `landscape` lays a tall one down;
 * a maze that is as wide as it is tall (within a tenth) is never turned by either. `auto` has no container to look at here, so it leaves
 * the maze as made: see `autoTurn`.
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

/** The turn an orientation means for a maze, given the room when it is `auto`. */
export function resolveTurn(orientation: MeikyuuOrientation, box: Box, ratio: number, room: { width: number; height: number } | null): Turn {
  if (orientation !== "auto") return turnFor(orientation, box);
  return room === null ? 0 : autoTurn(box, ratio, room);
}

/**
 * The cells a pointer enters moving from one shown point to the next: the straight path between them cut into steps of a third of a cell
 * and each step carried back into the maze. Every cell it passes is offered in order, so a fast finger skips none. The board and the
 * tests use this one function, so a line drawn on a turned board is exactly the line drawn on one that is not.
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
