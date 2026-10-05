import { MEIKYUU_SOLID_ROWS } from "./levels/solid.data.ts";
import { ratingOf } from "./measure.ts";
import { SOLID_KINDS, type SolidKind } from "./solid/solidGrid.ts";
import { parseSolidRecipe, type SolidRecipe } from "./solid/solidMaze.ts";
import { MEIKYUU_SOLID_PER_LIST, SOLID_CUTS, SOLID_SIZE_NAMES, solidCellsOf, solidCutOf, type SolidSize } from "./solid/solidSizes.ts";

/**
 * THE LEVELS OF THE SOLIDS: sixty-four for each of three sizes of each of five solids (960), in an entry of their own
 * (`@johnmorrisdotca/meikyuu/3d/levels`). A list is one solid at one size, in the order of the difficulty `solidDifficultyOf` scores, so none is easier
 * than the one before; the cells are the same in a list, which is what a size is. A level is a recipe such as `cube:7:prim:48213`, and the maze is made
 * from its seed where it is played (a few thousandths of a second), never stored. Play one with `mountSolid(host, { recipe: level.code })`.
 */
export type MeikyuuSolidLevel = {
  readonly kind: SolidKind;
  readonly size: SolidSize;
  /** Its place in its list, from 1. */
  readonly number: number;
  readonly code: string;
  readonly recipe: SolidRecipe;
  readonly cells: number;
  /** What it measures (see `measureMaze`). */
  readonly effort: number;
  /** The effort as a rating from 1 to 100, on the scale of the flat lists. */
  readonly rating: number;
  /** How hard it is to play, from 0 to 100 (see `solidDifficultyOf`). */
  readonly score: number;
};

export { MEIKYUU_SOLID_PER_LIST, SOLID_CUTS, SOLID_KINDS, SOLID_SIZE_NAMES, solidCellsOf, solidCutOf };
export type { SolidKind, SolidSize };

function listOf(kind: SolidKind, size: SolidSize): readonly MeikyuuSolidLevel[] {
  return MEIKYUU_SOLID_ROWS[kind]![size]!.map(([code, effort, cells, score], index) => {
    const recipe = parseSolidRecipe(code);
    if (recipe === null) throw new Error(`${code} is not a recipe`);
    return { kind, size, number: index + 1, code, recipe, cells, effort, rating: ratingOf(effort), score };
  });
}

/** Every list: a solid, then a size. */
export const MEIKYUU_SOLID_LEVELS: Readonly<Record<SolidKind, Readonly<Record<SolidSize, readonly MeikyuuSolidLevel[]>>>> = Object.fromEntries(
  SOLID_KINDS.map((kind) => [kind, Object.fromEntries(SOLID_SIZE_NAMES.map((size) => [size, listOf(kind, size)]))]),
) as never;

/** The sixty-four levels of a solid at a size. */
export function solidLevelsOf(kind: SolidKind, size: SolidSize): readonly MeikyuuSolidLevel[] {
  return MEIKYUU_SOLID_LEVELS[kind][size];
}

/** Level `n` (from 1) of a solid at a size, or null when there is none. */
export function solidLevelOf(kind: SolidKind, size: SolidSize, n: number): MeikyuuSolidLevel | null {
  return Number.isInteger(n) ? MEIKYUU_SOLID_LEVELS[kind]?.[size]?.[n - 1] ?? null : null;
}

/** The levels that pass a filter, by solid and size, each when given. */
export function findSolidLevels(filter: { kind?: SolidKind; size?: SolidSize } = {}): MeikyuuSolidLevel[] {
  return SOLID_KINDS.filter((kind) => filter.kind === undefined || kind === filter.kind).flatMap((kind) => SOLID_SIZE_NAMES.filter((size) => filter.size === undefined || size === filter.size).flatMap((size) => [...MEIKYUU_SOLID_LEVELS[kind][size]]));
}
