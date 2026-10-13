import { MEIKYUU_SOLID_LEVELS as DICE } from "./levels-solid-dice.ts";
import { MEIKYUU_SOLID_LEVELS as SHAPES } from "./levels-solid-shapes.ts";
import { MEIKYUU_SOLID_LEVELS as FIRST } from "./levels-solid.ts";
import { solidFinders, type MeikyuuSolidLevel, type SolidLevelLists } from "./solid/solidLevelList.ts";
import { SOLID_KINDS, type SolidKind } from "./solid/solidGrid.ts";
import { SOLID_DICE, SOLID_DIE_SIDES, SOLID_FIRST, SOLID_MORE_DICE, SOLID_MORE_SHAPES, SOLID_SHAPES, isSolidDie } from "./solid/solidKinds.ts";
import { MEIKYUU_SOLID_PER_LIST, SOLID_CUTS, SOLID_SIZE_NAMES, solidCellsOf, solidCutOf, type SolidSize } from "./solid/solidSizes.ts";

/**
 * THE LEVELS OF EVERY SOLID, in one entry (`@johnmorrisdotca/meikyuu/3d/levels/all`): the first five (`3d/levels`), the seven further dice (`3d/levels/dice`) and the six shapes (`3d/levels/shapes`),
 * 5,760 levels in 90 lists. A page that shows one solid at a time loads the file of that solid, not this.
 */
export type { MeikyuuSolidLevel };

export { isSolidDie, MEIKYUU_SOLID_PER_LIST, SOLID_CUTS, SOLID_DICE, SOLID_DIE_SIDES, SOLID_FIRST, SOLID_KINDS, SOLID_MORE_DICE, SOLID_MORE_SHAPES, SOLID_SHAPES, SOLID_SIZE_NAMES, solidCellsOf, solidCutOf };
export type { SolidKind, SolidSize };

/** Every list: a solid, then a size.
 *
 * @example
 * ```ts
 * import { MEIKYUU_SOLID_LEVELS } from "@johnmorrisdotca/meikyuu/3d/levels/all";
 * console.log(Object.keys(MEIKYUU_SOLID_LEVELS));
 * ```
 */
export const MEIKYUU_SOLID_LEVELS: SolidLevelLists = { ...FIRST, ...DICE, ...SHAPES };

const finders = solidFinders(MEIKYUU_SOLID_LEVELS);

/** The native surface-level collection for this kind and size; empty when this entry has none.
 *
 * @param kind - The native surface kind.
 * @param size - The small, medium, large, huge or colossal collection.
 * @returns The native surface-level collection for this kind and size; empty when this entry has none.
 * @example
 * ```ts
 * import { solidLevelsOf } from "@johnmorrisdotca/meikyuu/3d/levels/all";
 * console.log(solidLevelsOf("cube","small").length);
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
 * import { solidLevelOf } from "@johnmorrisdotca/meikyuu/3d/levels/all";
 * console.log(solidLevelOf("cube","small",1)?.code);
 * ```
 */
export const solidLevelOf = finders.solidLevelOf;

/** All surface levels in this entry matching the optional kind and size filters.
 *
 * @param filter - Optional native kind and size filters.
 * @returns All surface levels in this entry matching the optional kind and size filters.
 * @example
 * ```ts
 * import { findSolidLevels } from "@johnmorrisdotca/meikyuu/3d/levels/all";
 * console.log(findSolidLevels({kind:"cube",size:"small"}).length);
 * ```
 */
export const findSolidLevels = finders.findSolidLevels;
