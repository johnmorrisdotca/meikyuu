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

/** Every list this entry has: a solid, then a size.
 *
 * @example
 * ```ts
 * import { MEIKYUU_SOLID_LEVELS } from "@johnmorrisdotca/meikyuu/3d/levels/dice";
 * console.log(Object.keys(MEIKYUU_SOLID_LEVELS));
 * ```
 */
export const MEIKYUU_SOLID_LEVELS = solidListsOf(MEIKYUU_SOLID_DICE_ROWS);

const finders = solidFinders(MEIKYUU_SOLID_LEVELS);

/** The native surface-level collection for this kind and size; empty when this entry has none.
 *
 * @param kind - The native surface kind.
 * @param size - The small, medium, large, huge or colossal collection.
 * @returns The native surface-level collection for this kind and size; empty when this entry has none.
 * @example
 * ```ts
 * import { solidLevelsOf } from "@johnmorrisdotca/meikyuu/3d/levels/dice";
 * console.log(solidLevelsOf("prism","small").length);
 * ```
 */
export const solidLevelsOf = finders.solidLevelsOf;

/** The one-based surface level, or null when this entry has no such kind, size or number.
 *
 * @param kind - The native surface kind.
 * @param size - The small, medium, large, huge or colossal collection.
 * @param n - The one-based level number.
 * @returns The one-based surface level, or null when this entry has no such kind, size or number.
 * @example
 * ```ts
 * import { solidLevelOf } from "@johnmorrisdotca/meikyuu/3d/levels/dice";
 * console.log(solidLevelOf("prism","small",1)?.code);
 * ```
 */
export const solidLevelOf = finders.solidLevelOf;

/** All surface levels in this entry matching the optional kind and size filters.
 *
 * @param filter - Optional native kind and size filters.
 * @returns All surface levels in this entry matching the optional kind and size filters.
 * @example
 * ```ts
 * import { findSolidLevels } from "@johnmorrisdotca/meikyuu/3d/levels/dice";
 * console.log(findSolidLevels({kind:"prism",size:"small"}).length);
 * ```
 */
export const findSolidLevels = finders.findSolidLevels;
