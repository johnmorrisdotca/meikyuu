/**
 * A CELL GRAPH: the one thing every maze here is made on. A grid is a list of
 * cells, each with the cells beside it and the wall between them; it knows
 * nothing about squares or hexagons. The generators, the solver, the measure
 * and the game read only this, so a new shape is a new way to make one.
 *
 * Coordinates are in cells: one unit is about the width of a cell, with y
 * pointing down as on a screen. Only `neighbours` and `sides` decide how a maze
 * is made; the geometry (`centres`, `wall`, `at`) is for drawing and touch and
 * is never read by a generator, so a rounding difference between two browsers
 * cannot change a maze.
 */

/** A point, [x, y], in cells. */
export type Point = readonly [number, number];

/**
 * The line a wall is drawn along, from `a` to `b`. With `r`, an arc of the circle of radius `r`
 * about the origin, drawn clockwise on the screen from `a` to `b` (circle mazes only).
 */
export type Wall = { readonly a: Point; readonly b: Point; readonly r?: number };

/** One side of a cell: the cell across it (-1 for the edge of the shape) and the wall it is drawn with. */
export type Side = { readonly to: number; readonly wall: Wall };

/** A rectangle, in cells. */
export type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/** Every shape a maze can be made on. */
export const MEIKYUU_SHAPES = ["square", "hex", "triangle", "circle", "heart", "leaf", "star", "ring", "diamond", "cross", "moon", "hexagon", "pyramid"] as const;
export type MeikyuuShape = (typeof MEIKYUU_SHAPES)[number];

export type Grid = {
  readonly shape: MeikyuuShape;
  /** The two numbers the shape was asked for (columns and rows; rings; a radius). */
  readonly w: number;
  readonly h: number;
  readonly cells: number;
  /** Where each cell's middle is. */
  readonly centres: readonly Point[];
  /** Each cell's sides, one per wall round it, in the order the shape draws them. */
  readonly sides: readonly (readonly Side[])[];
  /** Each cell's neighbours across a side that is not the shape's edge. */
  readonly neighbours: readonly (readonly number[])[];
  /** The rectangle that holds the whole shape. */
  readonly box: Box;
  /** The cell at a point, or -1 where there is none. */
  at(x: number, y: number): number;
};

/** The cells with a side on the edge of the shape: where a door in the outer wall can be. */
export function boundaryCells(grid: Grid): number[] {
  const out: number[] = [];
  for (let cell = 0; cell < grid.cells; cell += 1) if (grid.sides[cell]!.some((side) => side.to < 0)) out.push(cell);
  return out;
}

/** The cell whose middle is nearest the middle of the shape. */
export function centreCell(grid: Grid): number {
  const mx = grid.box.x + grid.box.w / 2;
  const my = grid.box.y + grid.box.h / 2;
  let best = 0;
  let bestDistance = Infinity;
  for (let cell = 0; cell < grid.cells; cell += 1) {
    const [x, y] = grid.centres[cell]!;
    const d = (x - mx) * (x - mx) + (y - my) * (y - my);
    if (d < bestDistance - 1e-9) {
      bestDistance = d;
      best = cell;
    }
  }
  return best;
}

/** Build a grid from the parts a shape makes; `neighbours` is read off `sides`. */
export function makeGrid(parts: { shape: MeikyuuShape; w: number; h: number; centres: Point[]; sides: Side[][]; box: Box; at: (x: number, y: number) => number }): Grid {
  const neighbours = parts.sides.map((sides) => sides.filter((side) => side.to >= 0).map((side) => side.to));
  return { ...parts, cells: parts.centres.length, neighbours };
}

/**
 * A grid with only the cells `keep` says yes to, and only the biggest piece of those that touch.
 * A side that led to a cell dropped becomes the edge of the shape, drawn with the same wall. Cells
 * are numbered again in their old order.
 */
export function subGrid(grid: Grid, keep: (cell: number) => boolean, shape: MeikyuuShape, w: number, h: number): Grid {
  const kept = new Uint8Array(grid.cells);
  for (let cell = 0; cell < grid.cells; cell += 1) kept[cell] = keep(cell) ? 1 : 0;
  // The biggest piece, found by flooding from each unvisited cell in turn.
  const piece = new Int32Array(grid.cells).fill(-1);
  const sizes: number[] = [];
  for (let first = 0; first < grid.cells; first += 1) {
    if (kept[first] === 0 || piece[first]! >= 0) continue;
    const id = sizes.length;
    let size = 0;
    const stack = [first];
    piece[first] = id;
    while (stack.length > 0) {
      const cell = stack.pop()!;
      size += 1;
      for (const next of grid.neighbours[cell]!) {
        if (kept[next] === 1 && piece[next]! < 0) {
          piece[next] = id;
          stack.push(next);
        }
      }
    }
    sizes.push(size);
  }
  let biggest = 0;
  for (let id = 1; id < sizes.length; id += 1) if (sizes[id]! > sizes[biggest]!) biggest = id;
  const renumbered = new Int32Array(grid.cells).fill(-1);
  const old: number[] = [];
  for (let cell = 0; cell < grid.cells; cell += 1) {
    if (piece[cell] === biggest && kept[cell] === 1) {
      renumbered[cell] = old.length;
      old.push(cell);
    }
  }
  const centres = old.map((cell) => grid.centres[cell]!);
  const sides = old.map((cell) => grid.sides[cell]!.map((side) => ({ to: side.to < 0 ? -1 : renumbered[side.to]!, wall: side.wall })));
  // The box shrinks to what is left, so a heart is fitted by its own outline and not its raster's.
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const cellSides of sides) {
    for (const side of cellSides) {
      if (side.to >= 0) continue;
      for (const [x, y] of [side.wall.a, side.wall.b]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
  }
  return makeGrid({
    shape,
    w,
    h,
    centres,
    sides,
    box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
    at: (x, y) => {
      const cell = grid.at(x, y);
      return cell < 0 ? -1 : renumbered[cell]!;
    },
  });
}
