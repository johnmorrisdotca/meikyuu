import { MEIKYUU_SOLID_SHAPE_ROWS } from "./levels/solid-shapes.data.ts";
import { solidFinders, solidListsOf, type MeikyuuSolidLevel } from "./solid/solidLevelList.ts";
import { SOLID_KINDS, type SolidKind } from "./solid/solidGrid.ts";
import { SOLID_MORE_SHAPES } from "./solid/solidKinds.ts";
import { MEIKYUU_SOLID_PER_LIST, SOLID_CUTS, SOLID_SIZE_NAMES, solidCellsOf, solidCutOf, type SolidSize } from "./solid/solidSizes.ts";

/**
 * THE LEVELS OF THE SIX SHAPES: a box, a cross of cubes, a ring, a torus, a star and a heart. Sixty-four for each of five sizes of each (6 solids, 1,920 levels), in an entry of
 * their own (`@johnmorrisdotca/meikyuu/3d/levels/shapes`), so that a page loads only what it shows. The same calls as `3d/levels`, which holds the first five solids.
 */
export type { MeikyuuSolidLevel };

export { MEIKYUU_SOLID_PER_LIST, SOLID_CUTS, SOLID_MORE_SHAPES, SOLID_KINDS, SOLID_SIZE_NAMES, solidCellsOf, solidCutOf };
export type { SolidKind, SolidSize };

/** Every list this entry has: a solid, then a size. */
export const MEIKYUU_SOLID_LEVELS = solidListsOf(MEIKYUU_SOLID_SHAPE_ROWS);

export const { solidLevelsOf, solidLevelOf, findSolidLevels } = solidFinders(MEIKYUU_SOLID_LEVELS);
