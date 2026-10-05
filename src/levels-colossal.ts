import { COLOSSAL_CELLS, COLOSSAL_TALL_HEIGHT, COLOSSAL_TALL_WIDTH, MEIKYUU_COLOSSAL_PER_LIST } from "./colossal.ts";
import { MEIKYUU_COLOSSAL_ROWS, MEIKYUU_COLOSSAL_TALL_ROWS } from "./levels/colossal.data.ts";
import { parseRecipe, type MazeRecipe } from "./maze.ts";
import { ratingOf } from "./measure.ts";
import { TALL_RATIO } from "./tall.ts";

/**
 * THE COLOSSAL LEVELS: the biggest mazes of the lists, about ten thousand cells, in two lists of 128. The square ones are a hundred cells
 * across or so in every shape and every way to play (9,500 to 12,000 cells); the tall ones are 64 cells across and 96 down for a square one, and
 * hexagons and triangles that fill the same container two to three, for a phone held upright. Each list is in order of the effort its
 * levels measure, so none is easier to draw than the one before, with the score `difficultyOf` gives beside it.
 *
 * A level is a recipe, such as `square:100x100:backtracker:to-goal:48213`, and a recipe is the whole of it: the list is a few kilobytes, and the maze is
 * made from its seed where it is played (about twenty milliseconds in a browser for ten thousand cells), never stored. So nothing here is
 * generated on demand and nothing needs to be: a list that held the mazes themselves would be megabytes, this one holds what makes them.
 *
 * It is an entry of its own (`@johnmorrisdotca/meikyuu/levels/colossal`), so a page that plays only the other lists does not carry it.
 * Play one with `mountMeikyuu(host, { recipe: level.code, ratio: level.ratio })`; a square list's `ratio` is `square`.
 */
export type MeikyuuColossalLevel = {
  readonly kind: "maze";
  /** Which list it is in: the square ones or the tall ones. */
  readonly list: "colossal" | "colossal-tall";
  /** Its place in its list, from 1. */
  readonly number: number;
  /** Its place among the levels of its list, from 1: the same as `number`, as a list is one size. */
  readonly inSize: number;
  readonly code: string;
  readonly recipe: MazeRecipe;
  readonly cells: number;
  /** What it measures (see `measureMaze`). */
  readonly effort: number;
  /** The effort as a rating from 1 to 100 on the scale of the maze lists; a colossal maze is at the top of it. */
  readonly rating: number;
  /** How hard it is to play, from 0 to 100 (see `difficultyOf`). */
  readonly score: number;
  /** The box's width over its height, for the board's `ratio` option: 2 to 3 for the tall list, `square` for the other. */
  readonly ratio: number | "square";
};

export { COLOSSAL_CELLS, COLOSSAL_TALL_HEIGHT, COLOSSAL_TALL_WIDTH, MEIKYUU_COLOSSAL_PER_LIST };

function listOf(rows: readonly (readonly [string, number, number, number])[], list: MeikyuuColossalLevel["list"], ratio: MeikyuuColossalLevel["ratio"]): readonly MeikyuuColossalLevel[] {
  return rows.map(([code, effort, cells, score], index) => {
    const recipe = parseRecipe(code);
    if (recipe === null) throw new Error(`${code} is not a recipe`);
    return { kind: "maze", list, number: index + 1, inSize: index + 1, code, recipe, cells, effort, rating: ratingOf(effort), score, ratio };
  });
}

/** The 128 square colossal levels. */
export const MEIKYUU_COLOSSAL_LEVELS: readonly MeikyuuColossalLevel[] = listOf(MEIKYUU_COLOSSAL_ROWS, "colossal", "square");

/** The 128 tall colossal levels: 64 across and 96 down, two to three. */
export const MEIKYUU_COLOSSAL_TALL_LEVELS: readonly MeikyuuColossalLevel[] = listOf(MEIKYUU_COLOSSAL_TALL_ROWS, "colossal-tall", TALL_RATIO);

/** Square colossal level `n` (from 1), or null when there is none. */
export function colossalLevelOf(n: number): MeikyuuColossalLevel | null {
  return Number.isInteger(n) ? MEIKYUU_COLOSSAL_LEVELS[n - 1] ?? null : null;
}

/** Tall colossal level `n` (from 1), or null when there is none. */
export function colossalTallLevelOf(n: number): MeikyuuColossalLevel | null {
  return Number.isInteger(n) ? MEIKYUU_COLOSSAL_TALL_LEVELS[n - 1] ?? null : null;
}

/** The colossal levels of a list that pass a filter, by shape and way to play, each when given. */
export function findColossalLevels(filter: { list?: MeikyuuColossalLevel["list"]; shape?: MazeRecipe["shape"]; mode?: MazeRecipe["mode"] } = {}): MeikyuuColossalLevel[] {
  const every = filter.list === "colossal" ? MEIKYUU_COLOSSAL_LEVELS : filter.list === "colossal-tall" ? MEIKYUU_COLOSSAL_TALL_LEVELS : [...MEIKYUU_COLOSSAL_LEVELS, ...MEIKYUU_COLOSSAL_TALL_LEVELS];
  return every.filter((level) => (filter.shape === undefined || level.recipe.shape === filter.shape) && (filter.mode === undefined || level.recipe.mode === filter.mode));
}
