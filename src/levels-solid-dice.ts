import { MEIKYUU_SOLID_DICE_ROWS } from "./levels/solid-dice.data.ts";
import { solidFinders, solidListsOf, type MeikyuuSolidLevel } from "./solid/solidLevelList.ts";
import { SOLID_KINDS, type SolidKind } from "./solid/solidGrid.ts";
import { SOLID_MORE_DICE } from "./solid/solidKinds.ts";
import { MEIKYUU_SOLID_PER_LIST, SOLID_CUTS, SOLID_SIZE_NAMES, solidCellsOf, solidCutOf, type SolidSize } from "./solid/solidSizes.ts";

/**
 * THE LEVELS OF THE SEVEN FURTHER DICE: the prism (d3), the pentagonal trapezohedron (d10), the dodecahedron (d12), the rhombic dodecahedron (d12), the octagonal bipyramid (d16), the deltoidal icositetrahedron (d24) and the rhombic triacontahedron (d30). Sixty-four for each of five sizes of each (7 solids, 2,240 levels), in an entry of
 * their own (`@johnmorrisdotca/meikyuu/3d/levels/dice`), so that a page loads only what it shows. The same calls as `3d/levels`, which holds the first five solids.
 */
export type { MeikyuuSolidLevel };

export { MEIKYUU_SOLID_PER_LIST, SOLID_CUTS, SOLID_MORE_DICE, SOLID_KINDS, SOLID_SIZE_NAMES, solidCellsOf, solidCutOf };
export type { SolidKind, SolidSize };

/** Every list this entry has: a solid, then a size. */
export const MEIKYUU_SOLID_LEVELS = solidListsOf(MEIKYUU_SOLID_DICE_ROWS);

export const { solidLevelsOf, solidLevelOf, findSolidLevels } = solidFinders(MEIKYUU_SOLID_LEVELS);
