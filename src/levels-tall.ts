import { MEIKYUU_TALL_ROWS } from "./levels/tall.data.ts";
import { parseRecipe, type MazeRecipe } from "./maze.ts";
import { ratingOf } from "./measure.ts";
import { TALL_RATIO, TALL_WIDTHS } from "./tall.ts";

/**
 * THE TALL LEVELS: portrait mazes for a phone held upright, 1,536 of them in six sizes of 256, each size in order of the score
 * `difficultyOf` gives, so no level is easier than the one before inside its size. A level is a recipe, such as
 * `square:10x15:wilson:to-goal:48213`, narrower than it is tall, two columns to three rows; squares, hexagons and triangles are
 * laid out to fill a container of that shape with about the same number of cells (`tallDimensions`). The recipe is the upright maze whatever screen it is played on: a wide
 * screen turns the drawing, and a line drawn on it is the same line (`orientation` in `mountMeikyuu`).
 *
 * This is a list of its own, in an entry of its own (`@johnmorrisdotca/meikyuu/levels/tall`), so a page that plays only the square
 * mazes does not carry it. Play one with `mountMeikyuu(host, { recipe: level.code, ratio: level.ratio })`.
 */
export type MeikyuuTallLevel = {
  readonly kind: "maze";
  readonly list: "tall";
  /** Its place in the whole tall list, from 1. */
  readonly number: number;
  /** The size, from 1 (the smallest) to 6. */
  readonly size: number;
  /** How many cells across a square maze of its size is (6, 8, 10, 12, 16 or 20). */
  readonly width: number;
  /** Its place among the levels of its size, from 1. */
  readonly inSize: number;
  readonly code: string;
  readonly recipe: MazeRecipe;
  readonly cells: number;
  readonly effort: number;
  readonly rating: number;
  /** How hard it is to play, from 0 to 100 (see `difficultyOf`). */
  readonly score: number;
  /** The container's width over its height, for the board's `ratio` option. */
  readonly ratio: number;
};

/** How many levels each tall size has. */
export const MEIKYUU_TALL_PER_SIZE = 256;

/** The sizes: their number, how many cells across, and the squares' columns and rows ("6×9"). */
export const MEIKYUU_TALL_SIZES: readonly { readonly size: number; readonly width: number; readonly height: number; readonly label: string }[] = TALL_WIDTHS.map((width, index) => ({ size: index + 1, width, height: Math.round(width * 1.5), label: `${width}×${Math.round(width * 1.5)}` }));

export const MEIKYUU_TALL_LEVELS: readonly MeikyuuTallLevel[] = MEIKYUU_TALL_ROWS.map(([code, effort, cells, score], index) => {
  const recipe = parseRecipe(code);
  if (recipe === null) throw new Error(`${code} is not a recipe`);
  const size = Math.floor(index / MEIKYUU_TALL_PER_SIZE) + 1;
  return { kind: "maze", list: "tall", number: index + 1, size, width: TALL_WIDTHS[size - 1]!, inSize: (index % MEIKYUU_TALL_PER_SIZE) + 1, code, recipe, cells, effort, rating: ratingOf(effort), score, ratio: TALL_RATIO };
});

/** Tall level `n` (from 1) of the whole list, or null when there is none. */
export function tallLevelOf(n: number): MeikyuuTallLevel | null {
  return MEIKYUU_TALL_LEVELS[n - 1] ?? null;
}

/** The levels of one size (1 to 6), in order. */
export function tallLevelsOfSize(size: number): readonly MeikyuuTallLevel[] {
  return Number.isInteger(size) && size >= 1 && size <= TALL_WIDTHS.length ? MEIKYUU_TALL_LEVELS.slice((size - 1) * MEIKYUU_TALL_PER_SIZE, size * MEIKYUU_TALL_PER_SIZE) : [];
}

/** Level `n` (from 1) of a size, or null. */
export function tallLevelOfSize(size: number, n: number): MeikyuuTallLevel | null {
  return tallLevelsOfSize(size)[n - 1] ?? null;
}

/** The tall levels that pass a filter, by shape, way to play and size, each when given. */
export function findTallLevels(filter: { shape?: MazeRecipe["shape"]; mode?: MazeRecipe["mode"]; size?: number } = {}): MeikyuuTallLevel[] {
  return MEIKYUU_TALL_LEVELS.filter((level) => (filter.shape === undefined || level.recipe.shape === filter.shape) && (filter.mode === undefined || level.recipe.mode === filter.mode) && (filter.size === undefined || level.size === filter.size));
}

export { TALL_RATIO, TALL_SHAPES, TALL_WIDTHS, tallDimensions } from "./tall.ts";
