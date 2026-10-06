import { ratingOf } from "../measure.ts";
import type { SolidKind } from "./solidGrid.ts";
import { parseSolidRecipe, type SolidRecipe } from "./solidMaze.ts";
import { SOLID_SIZE_NAMES, type SolidSize } from "./solidSizes.ts";

/**
 * A LEVEL OF A SOLID, AND HOW A FILE OF ROWS BECOMES THE LISTS: the shape every level entry of the solids shares (`3d/levels`, `3d/levels/dice`, `3d/levels/shapes`, `3d/levels/all`), so that each file of
 * recipes is turned into levels by the same code, and a page that shows one solid loads the file of that solid and no other.
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
  /** How hard it is to play, from 0 to 100 (see `solidDifficultyOf`), counting how much of the solid the answer covers. */
  readonly score: number;
};

/** A row of a data file: the recipe, what it measures, its cells and its score. */
export type SolidRow = readonly [string, number, number, number];
export type SolidRows = Readonly<Record<string, Readonly<Record<string, readonly SolidRow[]>>>>;
export type SolidLevelLists = Partial<Record<SolidKind, Readonly<Record<SolidSize, readonly MeikyuuSolidLevel[]>>>>;

/** The lists a file of rows makes: a solid, then a size. */
export function solidListsOf(rows: SolidRows): SolidLevelLists {
  const out: Partial<Record<SolidKind, Record<SolidSize, readonly MeikyuuSolidLevel[]>>> = {};
  for (const [kind, sizes] of Object.entries(rows) as [SolidKind, Record<string, readonly SolidRow[]>][]) {
    const lists = {} as Record<SolidSize, readonly MeikyuuSolidLevel[]>;
    for (const size of SOLID_SIZE_NAMES) {
      lists[size] = (sizes[size] ?? []).map(([code, effort, cells, score], index) => {
        const recipe = parseSolidRecipe(code);
        if (recipe === null) throw new Error(`${code} is not a recipe`);
        return { kind, size, number: index + 1, code, recipe, cells, effort, rating: ratingOf(effort), score };
      });
    }
    out[kind] = lists;
  }
  return out;
}

/** The three calls every entry of the levels of the solids has, over the lists it holds. */
export function solidFinders(lists: SolidLevelLists): {
  solidLevelsOf: (kind: SolidKind, size: SolidSize) => readonly MeikyuuSolidLevel[];
  solidLevelOf: (kind: SolidKind, size: SolidSize, n: number) => MeikyuuSolidLevel | null;
  findSolidLevels: (filter?: { kind?: SolidKind; size?: SolidSize }) => MeikyuuSolidLevel[];
} {
  const kinds = Object.keys(lists) as SolidKind[];
  return {
    solidLevelsOf: (kind, size) => lists[kind]?.[size] ?? [],
    solidLevelOf: (kind, size, n) => (Number.isInteger(n) ? lists[kind]?.[size]?.[n - 1] ?? null : null),
    findSolidLevels: (filter = {}) => kinds.filter((kind) => filter.kind === undefined || kind === filter.kind).flatMap((kind) => SOLID_SIZE_NAMES.filter((size) => filter.size === undefined || size === filter.size).flatMap((size) => [...lists[kind]![size]])),
  };
}
