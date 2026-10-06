import { SOLID_DICE_MORE, SOLID_SHAPES_MORE, type SolidShapeKind } from "./solidShapes.ts";

/**
 * THE SOLIDS BY HOW THEY ARE MET. A solid is a die or a shape, and the picker of a page keeps them on two rows:
 *
 * - `SOLID_DICE`: the shapes dice are made in, by how many sides the die has (`SOLID_DIE_SIDES`): the triangular prism (a d3, the long die that rolls on its three sides), the tetrahedron (d4), the cube (d6), the
 *   octahedron (d8), the pentagonal trapezohedron (d10), the dodecahedron (d12) and the rhombic dodecahedron (the other d12), the octagonal bipyramid (d16), the icosahedron (d20), the deltoidal icositetrahedron
 *   (d24) and the rhombic triacontahedron (d30). A d2 is a coin and a d100 a d10, so neither is a solid of its own.
 * - `SOLID_SHAPES`: the globe, the box, the cross of cubes, the ring, the torus, the star and the heart.
 *
 * The files the levels are kept in are cut another way, by when a solid came: the first five (`SOLID_FIRST`: the cube, the globe and the three solids of triangles) are `3d/levels`, the seven further dice
 * `3d/levels/dice` and the six further shapes `3d/levels/shapes`, so that a page loads only the file of the solid it shows.
 */
export const SOLID_FIRST = ["cube", "sphere", "tetrahedron", "octahedron", "icosahedron"] as const;
export type SolidFirstKind = (typeof SOLID_FIRST)[number];

/** The seven dice that came after the first five, and the six shapes. */
export const SOLID_MORE_DICE = SOLID_DICE_MORE;
export const SOLID_MORE_SHAPES = SOLID_SHAPES_MORE;

/** The dice, by how many sides, smallest first. */
export const SOLID_DICE = ["prism", "tetrahedron", "cube", "octahedron", "trapezohedron", "dodecahedron", "rhombic-dodecahedron", "bipyramid", "icosahedron", "icositetrahedron", "triacontahedron"] as const;
/** The shapes. */
export const SOLID_SHAPES = ["sphere", "box", "cross", "ring", "torus", "star", "heart"] as const;

/** How many sides a die has (what its name on a die is: d6). Only a solid in `SOLID_DICE` has one. */
export const SOLID_DIE_SIDES: Readonly<Record<(typeof SOLID_DICE)[number], number>> = {
  prism: 3,
  tetrahedron: 4,
  cube: 6,
  octahedron: 8,
  trapezohedron: 10,
  dodecahedron: 12,
  "rhombic-dodecahedron": 12,
  bipyramid: 16,
  icosahedron: 20,
  icositetrahedron: 24,
  triacontahedron: 30,
};

/** Whether a solid is among the dice (the rest are shapes). */
export function isSolidDie(kind: string): kind is (typeof SOLID_DICE)[number] {
  return (SOLID_DICE as readonly string[]).includes(kind);
}

export type { SolidShapeKind };
