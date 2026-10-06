import { MEIKYUU_LEGACY_MAZE_ROWS } from "./levels/legacy.data.ts";
import { MEIKYUU_LEVELS_PER_SIZE, MEIKYUU_MAZE_LEVELS, MEIKYUU_SIZES, sizeOf, type MeikyuuSize } from "./levels.ts";

/**
 * WHERE THE 1.0.0 MAZE LEVELS WENT. The first release numbered 1,000 maze levels in one list; this release has 1,024 in four lists of 256
 * (`MEIKYUU_MAZE_LEVELS`), made from them: a level that was good enough stayed in the list, the ones that were too easy (99 small and 7 medium
 * levels, and a few beside them whose effort the new mazes would have passed) have a new maze, and the 29 hardest large and 11 hardest huge levels
 * are not in the list. Since 3.0.0 every list is in the order of its score, so where a maze stands in it (`now`, `nowInSize`) is not where it stood in
 * the first release (`place`). A level somebody solved, or a link to one, still names a number or a recipe of the first release, and this module
 * answers where that maze is now: the same maze at its place now (`now`), or no level at all, with the level of its size that scores nearest it to point at.
 * A recipe never changes what it builds, so a solve kept by recipe is still a solve of that maze whatever it is called.
 *
 * It is an entry of its own (`@johnmorrisdotca/meikyuu/levels/legacy`) because it carries the first release's thousand recipes, which
 * only a site with players from before this release needs.
 */
export type LegacyMazeLevel = {
  /** Its number in the 1.0.0 list, from 1. */
  readonly number: number;
  readonly code: string;
  readonly effort: number;
  readonly cells: number;
  /** The score `difficultyOf` gives it now (3.0.0 on: counting how much of the map its answer covers). */
  readonly score: number;
  readonly size: MeikyuuSize;
  /** Its place among the levels of its size in 1.0.0, from 1: the number a site that listed the sizes met it at. */
  readonly place: number;
  /** Its number in `MEIKYUU_MAZE_LEVELS` now, from 1, when it is still a level; null when it is not. */
  readonly now: number | null;
  /** Its place among the levels of its size now (1 to 256), when it is still a level. */
  readonly nowInSize: number | null;
  /** The level to point at: this very maze where it is still a level (`now`), else the level of its size whose score is nearest its own (the first, on a tie), its number from 1 in `MEIKYUU_MAZE_LEVELS`. */
  readonly nearest: number;
};

const byCode = new Map(MEIKYUU_MAZE_LEVELS.map((level) => [level.code, level]));
const placed = new Map<MeikyuuSize, number>();

/** The level of a size whose score is nearest `score`, first on a tie: the lists are in the order of their score, so the first of the nearest is the lowest place. */
function nearestInSize(size: MeikyuuSize, score: number): number {
  let best = MEIKYUU_SIZES.indexOf(size) * MEIKYUU_LEVELS_PER_SIZE + 1;
  let gap = Infinity;
  for (const level of MEIKYUU_MAZE_LEVELS.slice(best - 1, best - 1 + MEIKYUU_LEVELS_PER_SIZE)) {
    const away = Math.abs(level.score - score);
    if (away < gap) {
      gap = away;
      best = level.number;
    }
  }
  return best;
}

export const MEIKYUU_LEGACY_MAZE_LEVELS: readonly LegacyMazeLevel[] = MEIKYUU_LEGACY_MAZE_ROWS.map(([code, effort, cells, score], index) => {
  const now = byCode.get(code) ?? null;
  const size = sizeOf(cells);
  const place = (placed.get(size) ?? 0) + 1;
  placed.set(size, place);
  const nearest = now?.number ?? nearestInSize(size, score);
  return { number: index + 1, code, effort, cells, score, size, place, now: now?.number ?? null, nowInSize: now?.inSize ?? null, nearest };
});

/** The 1.0.0 level with this number, or null. */
export function legacyLevelOf(number: number): LegacyMazeLevel | null {
  return MEIKYUU_LEGACY_MAZE_LEVELS[number - 1] ?? null;
}

/** What became of a recipe the 1.0.0 list had, or null when it was not one of its levels. */
export function legacyLevelOfCode(code: string): LegacyMazeLevel | null {
  return MEIKYUU_LEGACY_MAZE_LEVELS.find((level) => level.code === code) ?? null;
}
