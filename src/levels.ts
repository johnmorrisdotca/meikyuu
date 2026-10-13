import { parseArrowRecipe, type ArrowRecipe } from "./arrows.ts";
import { MEIKYUU_ARROW_ROWS } from "./levels/arrows.data.ts";
import { MEIKYUU_MAZE_ROWS } from "./levels/mazes.data.ts";
import { MEIKYUU_MIXED_ROWS } from "./levels/mixed.data.ts";
import { parseRecipe, type MazeRecipe } from "./maze.ts";
import { parseMixedRecipe, type MixedRecipe } from "./mixed.ts";
import { ratingOf } from "./measure.ts";

/**
 * THE LEVELS: numbered lists of recipes, easiest first, never drawings. Flat maze lists are ordered by their geometry-aware score; arrow and mixed lists use their native
 * measured effort. A recipe rebuilds the same puzzle on every browser. Pin the package version when
 * keeping only numbers: major releases can reorder levels, while recipe codes preserve puzzle identity.
 *
 * There are three lists, each numbered from 1: the mazes (about a thousand, from a few cells to thousands,
 * in every shape and every way to play), the arrow puzzles, and the mixed ones, an arrow puzzle with locked
 * arrows and a labyrinth to find the unlock button in. In the order of play the mixed come after the
 * plain ones: `MEIKYUU_KINDS` is that order.
 *
 * @example
 * ```ts
 * import { MEIKYUU_KINDS } from "@johnmorrisdotca/meikyuu/levels";
 * console.log(MEIKYUU_KINDS);
 * ```
 */
export const MEIKYUU_KINDS = ["maze", "arrows", "mixed"] as const;
/** The flat maze, arrow or mixed puzzle family.
 *
 * @example
 * ```ts
 * import type { MeikyuuKind } from "@johnmorrisdotca/meikyuu/levels";
 *
 * const value: MeikyuuKind = "maze";
 * console.log(value);
 * ```
 */
export type MeikyuuKind = (typeof MEIKYUU_KINDS)[number];

/** The four sizes of the maze list.
 *
 * @example
 * ```ts
 * import { MEIKYUU_SIZES } from "@johnmorrisdotca/meikyuu/levels";
 * console.log(MEIKYUU_SIZES);
 * ```
 */
export const MEIKYUU_SIZES = ["small", "medium", "large", "huge"] as const;
/** The small, medium, large or huge numbered flat-maze collection.
 *
 * @example
 * ```ts
 * import type { MeikyuuSize } from "@johnmorrisdotca/meikyuu/levels";
 *
 * const value: MeikyuuSize = "small";
 * console.log(value);
 * ```
 */
export type MeikyuuSize = (typeof MEIKYUU_SIZES)[number];

type Base = {
  /** Its place in its own list, from 1. */
  readonly number: number;
  /** The recipe as one short word. */
  readonly code: string;
  /** What it measures (see `measureMaze`, `measureArrows`, `measureMixed`). */
  readonly effort: number;
  /** The effort as a rating from 1 to 100 on the scale of the maze list. */
  readonly rating: number;
};

/** A numbered flat-maze recipe, difficulty measures, cell count and place within its size.
 *
 * @example
 * ```ts
 * import type { MeikyuuMazeLevel } from "@johnmorrisdotca/meikyuu/levels";
 * import { levelOf } from "@johnmorrisdotca/meikyuu/levels";
 *
 * const value: MeikyuuMazeLevel = levelOf("maze",1)!;
 * console.log(value);
 * ```
 */
export type MeikyuuMazeLevel = Base & {
  readonly kind: "maze";
  readonly recipe: MazeRecipe;
  readonly cells: number;
  /** How hard it is to play, from 0 to 100 (see `difficultyOf`): what each size's list is put in order by. */
  readonly score: number;
  /** The size it belongs to, as `sizeOf` words its cells. */
  readonly size: MeikyuuSize;
  /** Its place among the levels of its size, from 1: the number a person playing that size meets it at. */
  readonly inSize: number;
};
/** A numbered arrow-puzzle recipe and its native difficulty metadata.
 *
 * @example
 * ```ts
 * import type { MeikyuuArrowLevel } from "@johnmorrisdotca/meikyuu/levels";
 * import { levelOf } from "@johnmorrisdotca/meikyuu/levels";
 *
 * const value: MeikyuuArrowLevel = levelOf("arrows",1)!;
 * console.log(value);
 * ```
 */
export type MeikyuuArrowLevel = Base & { readonly kind: "arrows"; readonly recipe: ArrowRecipe };
/** A numbered mixed-puzzle recipe and its native difficulty metadata.
 *
 * @example
 * ```ts
 * import type { MeikyuuMixedLevel } from "@johnmorrisdotca/meikyuu/levels";
 * import { levelOf } from "@johnmorrisdotca/meikyuu/levels";
 *
 * const value: MeikyuuMixedLevel = levelOf("mixed",1)!;
 * console.log(value);
 * ```
 */
export type MeikyuuMixedLevel = Base & { readonly kind: "mixed"; readonly recipe: MixedRecipe };
/** One native numbered maze, arrow or mixed level.
 *
 * @example
 * ```ts
 * import type { MeikyuuLevel } from "@johnmorrisdotca/meikyuu/levels";
 * import { levelOf } from "@johnmorrisdotca/meikyuu/levels";
 *
 * const value: MeikyuuLevel = levelOf("maze",1)!;
 * console.log(value);
 * ```
 */
export type MeikyuuLevel = MeikyuuMazeLevel | MeikyuuArrowLevel | MeikyuuMixedLevel;

function parsed<T>(code: string, read: (code: string) => T | null): T {
  const recipe = read(code);
  if (recipe === null) throw new Error(`${code} is not a recipe`);
  return recipe;
}

/** How many levels each size has: 256, so a size is sixteen pages of sixteen, and the four sizes make 1,024.
 *
 * @example
 * ```ts
 * import { MEIKYUU_LEVELS_PER_SIZE } from "@johnmorrisdotca/meikyuu/levels";
 * console.log(MEIKYUU_LEVELS_PER_SIZE);
 * ```
 */
export const MEIKYUU_LEVELS_PER_SIZE = 256;

/** The fixed numbered flat-maze recipes and their measured difficulty metadata.
 *
 * @example
 * ```ts
 * import { MEIKYUU_MAZE_LEVELS } from "@johnmorrisdotca/meikyuu/levels";
 * console.log(MEIKYUU_MAZE_LEVELS.length);
 * ```
 */
export const MEIKYUU_MAZE_LEVELS: readonly MeikyuuMazeLevel[] = MEIKYUU_MAZE_ROWS.map(([code, effort, cells, score], index) => ({
  kind: "maze",
  number: index + 1,
  code,
  effort,
  rating: ratingOf(effort),
  score,
  cells,
  size: sizeOf(cells),
  inSize: (index % MEIKYUU_LEVELS_PER_SIZE) + 1,
  recipe: parsed(code, parseRecipe),
}));
/** The fixed numbered arrow recipes and their measured effort.
 *
 * @example
 * ```ts
 * import { MEIKYUU_ARROW_LEVELS } from "@johnmorrisdotca/meikyuu/levels";
 * console.log(MEIKYUU_ARROW_LEVELS.length);
 * ```
 */
export const MEIKYUU_ARROW_LEVELS: readonly MeikyuuArrowLevel[] = MEIKYUU_ARROW_ROWS.map(([code, effort], index) => ({ kind: "arrows", number: index + 1, code, effort, rating: Math.min(100, Math.max(1, Math.round(1 + (99 * Math.log(effort / 8)) / Math.log(800 / 8)))), recipe: parsed(code, parseArrowRecipe) }));
/** The fixed numbered mixed-board recipes and their measured effort.
 *
 * @example
 * ```ts
 * import { MEIKYUU_MIXED_LEVELS } from "@johnmorrisdotca/meikyuu/levels";
 * console.log(MEIKYUU_MIXED_LEVELS.length);
 * ```
 */
export const MEIKYUU_MIXED_LEVELS: readonly MeikyuuMixedLevel[] = MEIKYUU_MIXED_ROWS.map(([code, effort], index) => ({ kind: "mixed", number: index + 1, code, effort, rating: Math.min(100, Math.max(1, Math.round(1 + (99 * Math.log(effort / 30)) / Math.log(1000 / 30)))), recipe: parsed(code, parseMixedRecipe) }));

/** How many levels a kind has.
 *
 * @param kind - The native puzzle family or surface shape specified by this signature.
 * @returns How many levels a kind has.
 * @example
 * ```ts
 * import { levelCount } from "@johnmorrisdotca/meikyuu/levels";
 *
 * console.log(levelCount("maze"));
 * ```
 */
export function levelCount(kind: MeikyuuKind): number {
  return kind === "maze" ? MEIKYUU_MAZE_LEVELS.length : kind === "arrows" ? MEIKYUU_ARROW_LEVELS.length : MEIKYUU_MIXED_LEVELS.length;
}

/** Every level of a kind.
 *
 * @param kind - The native puzzle family or surface shape specified by this signature.
 * @returns Every level of a kind.
 * @example
 * ```ts
 * import { levelsOf } from "@johnmorrisdotca/meikyuu/levels";
 *
 * console.log(levelsOf("maze").length);
 * ```
 */
export function levelsOf(kind: "maze"): readonly MeikyuuMazeLevel[];
export function levelsOf(kind: "arrows"): readonly MeikyuuArrowLevel[];
export function levelsOf(kind: "mixed"): readonly MeikyuuMixedLevel[];
export function levelsOf(kind: MeikyuuKind): readonly MeikyuuLevel[];
export function levelsOf(kind: MeikyuuKind): readonly MeikyuuLevel[] {
  return kind === "maze" ? MEIKYUU_MAZE_LEVELS : kind === "arrows" ? MEIKYUU_ARROW_LEVELS : MEIKYUU_MIXED_LEVELS;
}

/** Level number `n` (from 1) of a kind, or null when there is none.
 *
 * @param kind - The native puzzle family or surface shape specified by this signature.
 * @param n - The level number, random bound or surface subdivision specified by the signature.
 * @returns Level number `n` (from 1) of a kind, or null when there is none.
 * @example
 * ```ts
 * import { levelOf } from "@johnmorrisdotca/meikyuu/levels";
 *
 * console.log(levelOf("maze",1)?.code);
 * ```
 */
export function levelOf(kind: "maze", n: number): MeikyuuMazeLevel | null;
export function levelOf(kind: "arrows", n: number): MeikyuuArrowLevel | null;
export function levelOf(kind: "mixed", n: number): MeikyuuMixedLevel | null;
export function levelOf(kind: MeikyuuKind, n: number): MeikyuuLevel | null;
export function levelOf(kind: MeikyuuKind, n: number): MeikyuuLevel | null {
  return levelsOf(kind)[n - 1] ?? null;
}

/** How big a maze is, in words a person picks by: under 150 cells is small, under 800 medium, under 4,000 large, and the rest huge.
 *
 * @param cells - A cell-index path or total count specified by this signature.
 * @returns How big a maze is, in words a person picks by: under 150 cells is small, under 800 medium, under 4,000 large, and the rest huge.
 * @example
 * ```ts
 * import { sizeOf } from "@johnmorrisdotca/meikyuu/levels";
 *
 * console.log(sizeOf(100));
 * ```
 */
export function sizeOf(cells: number): MeikyuuSize {
  return cells < 150 ? "small" : cells < 800 ? "medium" : cells < 4000 ? "large" : "huge";
}

/** The levels of one size, in order: 256 of them, each a little harder than the one before.
 *
 * @param size - The named level size, or numeric tall width specified by this signature.
 * @returns The levels of one size, in order: 256 of them, each a little harder than the one before.
 * @example
 * ```ts
 * import { mazeLevelsOfSize } from "@johnmorrisdotca/meikyuu/levels";
 *
 * console.log(mazeLevelsOfSize("small").length);
 * ```
 */
export function mazeLevelsOfSize(size: MeikyuuSize): readonly MeikyuuMazeLevel[] {
  const first = MEIKYUU_SIZES.indexOf(size) * MEIKYUU_LEVELS_PER_SIZE;
  return MEIKYUU_MAZE_LEVELS.slice(first, first + MEIKYUU_LEVELS_PER_SIZE);
}

/** Level `n` (from 1) of a size, or null when there is none.
 *
 * @param size - The named level size, or numeric tall width specified by this signature.
 * @param n - The level number, random bound or surface subdivision specified by the signature.
 * @returns Level `n` (from 1) of a size, or null when there is none.
 * @example
 * ```ts
 * import { mazeLevelOfSize } from "@johnmorrisdotca/meikyuu/levels";
 *
 * console.log(mazeLevelOfSize("small",1)?.code);
 * ```
 */
export function mazeLevelOfSize(size: MeikyuuSize, n: number): MeikyuuMazeLevel | null {
  return Number.isInteger(n) && n >= 1 && n <= MEIKYUU_LEVELS_PER_SIZE ? mazeLevelsOfSize(size)[n - 1] ?? null : null;
}

/** Which third of a size's list a level is in: the easy, medium and hard a site files it under. Place `n` is from 1 of `count`.
 *
 * @example
 * ```ts
 * import type { MeikyuuBand } from "@johnmorrisdotca/meikyuu/levels";
 *
 * const value: MeikyuuBand = "easy";
 * console.log(value);
 * ```
 */
export type MeikyuuBand = "easy" | "medium" | "hard";
/** Read the easy, medium or hard third of a numbered level collection.
 *
 * @param n - The level number, random bound or surface subdivision specified by the signature.
 * @param count - The collection size or number of dice/items specified by the signature.
 * @returns Read the easy, medium or hard third of a numbered level collection.
 * @example
 * ```ts
 * import { bandOf } from "@johnmorrisdotca/meikyuu/levels";
 *
 * console.log(bandOf(1,256));
 * ```
 */
export function bandOf(n: number, count: number = MEIKYUU_LEVELS_PER_SIZE): MeikyuuBand {
  const third = (n - 1) / count;
  return third < 1 / 3 ? "easy" : third < 2 / 3 ? "medium" : "hard";
}

/** The levels of a kind that pass a filter, with their numbers: by shape, by way to play and by size, each when given.
 *
 * @param filter - Optional native shape, mode, size or collection filters.
 * @returns The levels of a kind that pass a filter, with their numbers: by shape, by way to play and by size, each when given.
 * @example
 * ```ts
 * import { findMazeLevels } from "@johnmorrisdotca/meikyuu/levels";
 *
 * console.log(findMazeLevels({shape:"square",size:"small"}).length);
 * ```
 */
export function findMazeLevels(filter: { shape?: MazeRecipe["shape"]; mode?: MazeRecipe["mode"]; size?: MeikyuuSize } = {}): MeikyuuMazeLevel[] {
  return MEIKYUU_MAZE_LEVELS.filter((level) => (filter.shape === undefined || level.recipe.shape === filter.shape) && (filter.mode === undefined || level.recipe.mode === filter.mode) && (filter.size === undefined || sizeOf(level.cells) === filter.size));
}
