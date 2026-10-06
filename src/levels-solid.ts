import { MEIKYUU_SOLID_ROWS } from "./levels/solid.data.ts";
import { solidFinders, solidListsOf, type MeikyuuSolidLevel } from "./solid/solidLevelList.ts";
import { SOLID_KINDS, type SolidKind } from "./solid/solidGrid.ts";
import { SOLID_FIRST } from "./solid/solidKinds.ts";
import { MEIKYUU_SOLID_PER_LIST, SOLID_CUTS, SOLID_SIZE_NAMES, solidCellsOf, solidCutOf, type SolidSize } from "./solid/solidSizes.ts";

/**
 * THE LEVELS OF THE SOLIDS: sixty-four for each of five sizes (small, medium, large, huge and colossal) of each solid, in entries of their own so that a page loads the file of the solid it shows.
 * This one (`@johnmorrisdotca/meikyuu/3d/levels`) is the first five solids' (the cube, the globe and the tetrahedron, octahedron and icosahedron: 1,600 levels); the seven further dice are in
 * `3d/levels/dice`, the six shapes (a box, a cross, a ring, a torus, a star and a heart) in `3d/levels/shapes`, and every one in `3d/levels/all`.
 * A list is one solid at one size, in the order of the difficulty `solidDifficultyOf` scores, so none is scored under the one before; the cells are the same in a list, which is what a size is. A level is a
 * recipe such as `cube:7:prim:48213`, and the maze is made from its seed where it is played (a few thousandths of a second), never stored. Play one with `mountSolid(host, { recipe: level.code })`.
 * A solid this entry holds no list for (`solidLevelsOf("heart", "small")` here) has none: an empty list.
 */
export type { MeikyuuSolidLevel };

export { MEIKYUU_SOLID_PER_LIST, SOLID_CUTS, SOLID_FIRST, SOLID_KINDS, SOLID_SIZE_NAMES, solidCellsOf, solidCutOf };
export type { SolidKind, SolidSize };

/** Every list this entry has: a solid, then a size. */
export const MEIKYUU_SOLID_LEVELS = solidListsOf(MEIKYUU_SOLID_ROWS);

export const { solidLevelsOf, solidLevelOf, findSolidLevels } = solidFinders(MEIKYUU_SOLID_LEVELS);
