import { parseArrowRecipe, type ArrowRecipe } from "./arrows.ts";
import { MEIKYUU_ARROW_ROWS } from "./levels/arrows.data.ts";
import { MEIKYUU_MAZE_ROWS } from "./levels/mazes.data.ts";
import { MEIKYUU_MIXED_ROWS } from "./levels/mixed.data.ts";
import { parseRecipe, type MazeRecipe } from "./maze.ts";
import { parseMixedRecipe, type MixedRecipe } from "./mixed.ts";
import { ratingOf } from "./measure.ts";

/**
 * THE LEVELS: numbered lists of recipes, easiest first, never drawings. Each list is ordered by the
 * effort its levels measure, so every level is at least as hard as the one before. A recipe rebuilds the
 * same puzzle on every browser, and a level once published keeps its number.
 *
 * There are three lists, each numbered from 1: the mazes (about a thousand, from a few cells to thousands,
 * in every shape and every way to play), the arrow puzzles, and the mixed ones, an arrow puzzle with locked
 * arrows and a labyrinth to find the unlock button in. In the order of play the mixed come after the
 * plain ones: `MEIKYUU_KINDS` is that order.
 */
export const MEIKYUU_KINDS = ["maze", "arrows", "mixed"] as const;
export type MeikyuuKind = (typeof MEIKYUU_KINDS)[number];

/** The four sizes of the maze list. */
export const MEIKYUU_SIZES = ["small", "medium", "large", "huge"] as const;
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
export type MeikyuuArrowLevel = Base & { readonly kind: "arrows"; readonly recipe: ArrowRecipe };
export type MeikyuuMixedLevel = Base & { readonly kind: "mixed"; readonly recipe: MixedRecipe };
export type MeikyuuLevel = MeikyuuMazeLevel | MeikyuuArrowLevel | MeikyuuMixedLevel;

function parsed<T>(code: string, read: (code: string) => T | null): T {
  const recipe = read(code);
  if (recipe === null) throw new Error(`${code} is not a recipe`);
  return recipe;
}

/** How many levels each size has: 256, so a size is sixteen pages of sixteen, and the four sizes make 1,024. */
export const MEIKYUU_LEVELS_PER_SIZE = 256;

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
export const MEIKYUU_ARROW_LEVELS: readonly MeikyuuArrowLevel[] = MEIKYUU_ARROW_ROWS.map(([code, effort], index) => ({ kind: "arrows", number: index + 1, code, effort, rating: Math.min(100, Math.max(1, Math.round(1 + (99 * Math.log(effort / 8)) / Math.log(800 / 8)))), recipe: parsed(code, parseArrowRecipe) }));
export const MEIKYUU_MIXED_LEVELS: readonly MeikyuuMixedLevel[] = MEIKYUU_MIXED_ROWS.map(([code, effort], index) => ({ kind: "mixed", number: index + 1, code, effort, rating: Math.min(100, Math.max(1, Math.round(1 + (99 * Math.log(effort / 30)) / Math.log(1000 / 30)))), recipe: parsed(code, parseMixedRecipe) }));

/** How many levels a kind has. */
export function levelCount(kind: MeikyuuKind): number {
  return kind === "maze" ? MEIKYUU_MAZE_LEVELS.length : kind === "arrows" ? MEIKYUU_ARROW_LEVELS.length : MEIKYUU_MIXED_LEVELS.length;
}

/** Every level of a kind. */
export function levelsOf(kind: "maze"): readonly MeikyuuMazeLevel[];
export function levelsOf(kind: "arrows"): readonly MeikyuuArrowLevel[];
export function levelsOf(kind: "mixed"): readonly MeikyuuMixedLevel[];
export function levelsOf(kind: MeikyuuKind): readonly MeikyuuLevel[];
export function levelsOf(kind: MeikyuuKind): readonly MeikyuuLevel[] {
  return kind === "maze" ? MEIKYUU_MAZE_LEVELS : kind === "arrows" ? MEIKYUU_ARROW_LEVELS : MEIKYUU_MIXED_LEVELS;
}

/** Level number `n` (from 1) of a kind, or null when there is none. */
export function levelOf(kind: "maze", n: number): MeikyuuMazeLevel | null;
export function levelOf(kind: "arrows", n: number): MeikyuuArrowLevel | null;
export function levelOf(kind: "mixed", n: number): MeikyuuMixedLevel | null;
export function levelOf(kind: MeikyuuKind, n: number): MeikyuuLevel | null;
export function levelOf(kind: MeikyuuKind, n: number): MeikyuuLevel | null {
  return levelsOf(kind)[n - 1] ?? null;
}

/** How big a maze is, in words a person picks by: under 150 cells is small, under 800 medium, under 4,000 large, and the rest huge. */
export function sizeOf(cells: number): MeikyuuSize {
  return cells < 150 ? "small" : cells < 800 ? "medium" : cells < 4000 ? "large" : "huge";
}

/** The levels of one size, in order: 256 of them, each a little harder than the one before. */
export function mazeLevelsOfSize(size: MeikyuuSize): readonly MeikyuuMazeLevel[] {
  const first = MEIKYUU_SIZES.indexOf(size) * MEIKYUU_LEVELS_PER_SIZE;
  return MEIKYUU_MAZE_LEVELS.slice(first, first + MEIKYUU_LEVELS_PER_SIZE);
}

/** Level `n` (from 1) of a size, or null when there is none. */
export function mazeLevelOfSize(size: MeikyuuSize, n: number): MeikyuuMazeLevel | null {
  return Number.isInteger(n) && n >= 1 && n <= MEIKYUU_LEVELS_PER_SIZE ? mazeLevelsOfSize(size)[n - 1] ?? null : null;
}

/** Which third of a size's list a level is in: the easy, medium and hard a site files it under. Place `n` is from 1 of `count`. */
export type MeikyuuBand = "easy" | "medium" | "hard";
export function bandOf(n: number, count: number = MEIKYUU_LEVELS_PER_SIZE): MeikyuuBand {
  const third = (n - 1) / count;
  return third < 1 / 3 ? "easy" : third < 2 / 3 ? "medium" : "hard";
}

/** The levels of a kind that pass a filter, with their numbers: by shape, by way to play and by size, each when given. */
export function findMazeLevels(filter: { shape?: MazeRecipe["shape"]; mode?: MazeRecipe["mode"]; size?: MeikyuuSize } = {}): MeikyuuMazeLevel[] {
  return MEIKYUU_MAZE_LEVELS.filter((level) => (filter.shape === undefined || level.recipe.shape === filter.shape) && (filter.mode === undefined || level.recipe.mode === filter.mode) && (filter.size === undefined || sizeOf(level.cells) === filter.size));
}
