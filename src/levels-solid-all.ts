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

/** Every list: a solid, then a size. */
export const MEIKYUU_SOLID_LEVELS: SolidLevelLists = { ...FIRST, ...DICE, ...SHAPES };

export const { solidLevelsOf, solidLevelOf, findSolidLevels } = solidFinders(MEIKYUU_SOLID_LEVELS);
