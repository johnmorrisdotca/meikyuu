import { SOLID_KINDS, solidCells, type SolidKind } from "./solidGrid.ts";

/**
 * THE SIZES OF THE LEVELS OF A SOLID: three to each, small, medium and large, cut so that they come to about the same number of cells whichever solid
 * it is (under a hundred, about three hundred, and six to seven hundred), and so that the one kind of solid is not the easy one: a cube cut
 * 4, 7 and 10 ways has 96, 294 and 600 cells, a globe at frequency 3, 5 and 8 has 92, 252 and 642, an octahedron cut 3, 6 and 9 has 72, 288 and 648.
 * More than seven hundred cells is not offered: the solid is looked at from outside, one side at a time, and a cell on a phone's screen needs to be a finger wide.
 */
export const SOLID_SIZE_NAMES = ["small", "medium", "large"] as const;
export type SolidSize = (typeof SOLID_SIZE_NAMES)[number];

/** How many ways each solid is cut, for each size. */
export const SOLID_CUTS: Record<SolidKind, readonly [number, number, number]> = {
  cube: [4, 7, 10],
  sphere: [3, 5, 8],
  tetrahedron: [5, 8, 12],
  octahedron: [3, 6, 9],
  icosahedron: [2, 4, 6],
};

/** How many levels each size of each solid has: eight pages of eight. */
export const MEIKYUU_SOLID_PER_LIST = 64;

/** The cut of a solid at a size. */
export function solidCutOf(kind: SolidKind, size: SolidSize): number {
  return SOLID_CUTS[kind][SOLID_SIZE_NAMES.indexOf(size)]!;
}

/** How many cells a solid has at a size. */
export function solidCellsOf(kind: SolidKind, size: SolidSize): number {
  return solidCells(kind, solidCutOf(kind, size));
}

export { SOLID_KINDS };
