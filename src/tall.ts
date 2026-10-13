import type { MeikyuuShape } from "./grid.ts";
import { hexGrid, triangleGrid } from "./shapes.ts";

/**
 * TALL MAZES: portrait ones, two columns of cells to every three rows, made to fill a container that is two thirds as wide as it is
 * tall, which is what a phone held upright leaves for a maze (docs/LEVELS.md has the arithmetic). A tall maze is an ordinary
 * maze (`buildMaze`) with a tall recipe: `square:10x15:...` is ten cells across and fifteen down. These are the sizes the tall
 * levels come in, and the dimensions that make each of the three shapes with rows fill the same container.
 */

/** The ratio of a tall container, width over height: two to three.
 *
 * @example
 * ```ts
 * import { TALL_RATIO } from "@johnmorrisdotca/meikyuu/levels/tall";
 * console.log(TALL_RATIO);
 * ```
 */
export const TALL_RATIO = 2 / 3;

/** How many cells across each size of the tall levels is.
 *
 * @example
 * ```ts
 * import { TALL_WIDTHS } from "@johnmorrisdotca/meikyuu/levels/tall";
 * console.log(TALL_WIDTHS);
 * ```
 */
export const TALL_WIDTHS = [6, 8, 10, 12, 16, 20] as const;

/**
 * The columns and rows of a maze of `shape` for the size `width` (a square maze of that size is `width` by one and a half times that): as near 2:3 as
 * its cells allow, and with about as many cells as that square maze has (`width` times one and a half `width`), so that the sizes are as big to
 * draw whatever the shape is. A hexagon or a triangle has smaller cells, so the same number of them fills the same container with bigger cells.
 *
 * @param shape - The supported native flat-grid geometry or cut-out shape.
 * @param width - The native width in cells or pixels specified by this signature.
 * @returns The columns and rows of a maze of `shape` for the size `width` (a square maze of that size is `width` by one and a half times that): as near 2:3 as its cells allow, and with about as many cells as that square maze has (`width` times one and a half `width`), so that the sizes are as big to draw whatever the shape is. A hexagon or a triangle has smaller cells, so the same number of them fills the same container with bigger cells.
 * @example
 * ```ts
 * import { TALL_WIDTHS, tallDimensions } from "@johnmorrisdotca/meikyuu/levels/tall";
 *
 * console.log(tallDimensions("square",TALL_WIDTHS[0]));
 * ```
 */
export function tallDimensions(shape: MeikyuuShape, width: number): [number, number] {
  if (shape === "square") return [width, Math.round(width * 1.5)];
  const make = shape === "hex" ? hexGrid : shape === "triangle" ? triangleGrid : null;
  if (make === null) throw new Error(`${shape} has no columns and rows: only squares, hexagons and triangles are made tall`);
  const target = width * Math.round(width * 1.5);
  let best: [number, number] = [width, Math.round(width * 1.5)];
  let bestOff = Infinity;
  const ahead = shapeFactor(shape);
  for (let rows = 2; rows <= 120; rows += 1) {
    // The columns that make the shape 2:3 at this many rows, and a few either side of that.
    const guess = Math.round(TALL_RATIO * ahead.height(rows) * ahead.perColumn - ahead.offset);
    for (let columns = Math.max(2, guess - 2); columns <= guess + 2; columns += 1) {
      const cells = columns * rows;
      if (Math.abs(cells - target) > target * 0.2) continue;
      const { box } = make(columns, rows);
      const off = (2 * Math.abs(box.w / box.h - TALL_RATIO)) / TALL_RATIO + Math.abs(cells - target) / target / 4;
      if (off < bestOff - 1e-9) {
        bestOff = off;
        best = [columns, rows];
      }
    }
  }
  return best;
}

/** How a hexagon grid's or a triangle grid's box grows with its columns and rows, to guess the columns that make it 2:3: width = (columns + offset) / perColumn, height = height(rows). */
function shapeFactor(shape: MeikyuuShape): { height: (rows: number) => number; perColumn: number; offset: number } {
  return shape === "hex"
    ? { height: (rows) => (1 / Math.sqrt(3)) * (1.5 * rows + 0.5), perColumn: 1, offset: 0.5 }
    : { height: (rows) => (rows * Math.sqrt(3)) / 2, perColumn: 2, offset: 1 };
}

/** The shapes that are made tall.
 *
 * @example
 * ```ts
 * import { TALL_SHAPES } from "@johnmorrisdotca/meikyuu/levels/tall";
 * console.log(TALL_SHAPES);
 * ```
 */
export const TALL_SHAPES = ["square", "hex", "triangle"] as const satisfies readonly MeikyuuShape[];
