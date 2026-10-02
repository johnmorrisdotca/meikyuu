/**
 * WHAT THE LEVEL MAKERS SHARE (`scripts/meikyuu-levels.ts`, `scripts/meikyuu-tall.ts`, `scripts/levels-facts.ts`): how a maze of about
 * so many cells is asked for in each shape, how a candidate is built and scored, which candidates are too easy to publish, and the key
 * that says two mazes are one. Nothing here runs in a browser.
 */
import { MEIKYUU_ALGORITHMS, type MeikyuuAlgorithm } from "../src/algorithms.ts";
import { difficultyOf, isTooEasy, type MazeDifficulty } from "../src/difficulty.ts";
import type { MeikyuuShape } from "../src/grid.ts";
import { buildMaze, isPerfect, recipeCode, walk, type Maze, type MazeRecipe, type MeikyuuMode } from "../src/maze.ts";
import { below, seededRandom, type Random } from "../src/random.ts";
import { gridOf } from "../src/shapes.ts";

/** The cells of each size of the square lists, as `sizeOf` words them: small under 150, medium under 800, large under 4,000, and huge up to the most any level has. */
export const SIZE_CELLS = { small: [12, 149], medium: [150, 799], large: [800, 3999], huge: [4000, 9000] } as const;
export type SizeWord = keyof typeof SIZE_CELLS;

const cache = new Map<string, number>();
/** How many cells a grid of these dimensions has (kept: building a big one is not free). */
export function cellsOf(shape: MeikyuuShape, w: number, h: number): number {
  if (shape === "square" || shape === "hex" || shape === "triangle") return w * h;
  const key = `${shape}:${w}:${h}`;
  let cells = cache.get(key);
  if (cells === undefined) {
    cells = gridOf(shape, w, h).cells;
    cache.set(key, cells);
  }
  return cells;
}

/** The dimensions of a shape whose cells come nearest `cells`, at an aspect (width over height, for the three shapes that have rows). */
export function dimensionsFor(shape: MeikyuuShape, cells: number, aspect: number): [number, number] {
  switch (shape) {
    case "square": {
      const w = Math.max(3, Math.round(Math.sqrt(cells * aspect)));
      return [w, Math.max(3, Math.round(cells / w))];
    }
    case "hex": {
      const h = Math.max(2, Math.round(Math.sqrt(cells / (aspect * 1.15))));
      return [Math.max(2, Math.round(cells / h)), h];
    }
    case "triangle": {
      const h = Math.max(2, Math.round(Math.sqrt(cells / (2 * aspect * 1.15))));
      return [Math.max(3, Math.round(cells / h)), h];
    }
    default: {
      // One number: the smallest whose shape has at least this many cells, or the one before it when that is nearer.
      let low = 2;
      let high = 400;
      while (low < high) {
        const middle = (low + high) >> 1;
        if (cellsOf(shape, middle, middle) >= cells) high = middle;
        else low = middle + 1;
      }
      const before = Math.max(2, low - 1);
      const w = Math.abs(cellsOf(shape, before, before) - cells) < Math.abs(cellsOf(shape, low, low) - cells) ? before : low;
      return [w, w];
    }
  }
}

/** The number of keys for a keys level of a given size: one more for each couple of hundred cells, up to five. */
export const keysFor = (cells: number): number => Math.min(5, 1 + Math.floor(cells / 220));

/** A maze that was built, with everything a list is chosen by. */
export type Candidate = {
  code: string;
  recipe: MazeRecipe;
  cells: number;
  effort: number;
  /** The score, whole. */
  score: number;
  /** The score before it is rounded: what lists are ordered by. */
  fine: number;
  difficulty: MazeDifficulty;
  deadEnds: number;
  branches: number;
  /** A key that is the same for two mazes that are one. */
  same: string;
  /** Where in the list the maze came from, when it is a level already published. */
  old?: number;
};

/** A key that says whether two mazes are the same maze, so a list never repeats one (small mazes would). */
export function sameness(maze: Maze): string {
  const { recipe } = maze;
  const { before } = walk(maze.links, maze.start);
  let hash = 2166136261;
  for (const value of before) hash = Math.imul(hash ^ (value + 2), 16777619) >>> 0;
  return `${recipe.shape}:${recipe.w}x${recipe.h}:${recipe.mode}:${maze.start}:${maze.goal}:${maze.keys.join(",")}:${maze.links.length}:${hash}`;
}

/** Build and measure a recipe; null when it cannot be played (no room for its way to play, or not a perfect maze). */
export function candidateOf(recipe: MazeRecipe, old?: number): Candidate | null {
  let maze: Maze;
  try {
    maze = buildMaze(recipe);
  } catch {
    return null;
  }
  if (maze.grid.cells < 6 || maze.start === maze.goal) return null;
  if (recipe.mode === "keys" && (maze.keys.length < (recipe.keys ?? 1) || maze.grid.cells < 40)) return null;
  if (!isPerfect(maze.grid, maze.links)) return null;
  const difficulty = difficultyOf(maze);
  const { measure } = difficulty;
  return { code: recipeCode(recipe), recipe, cells: maze.grid.cells, effort: measure.effort, score: difficulty.score, fine: difficulty.exact, difficulty, deadEnds: measure.deadEnds, branches: measure.branches, same: sameness(maze), ...(old === undefined ? {} : { old }) };
}

/** Whether a candidate is too easy to be a level at all, or, with a place of a size, to be a level at that place (`isTooEasy`). */
export const tooEasy = (c: Candidate, place?: number): boolean => isTooEasy(c.difficulty, place);

/**
 * When in a list each shape, way to play and algorithm arrives, in the effort a level has there (`arrivedAt`): a list begins with plain squares,
 * in and out, and Prim's and the growing tree's short dead ends, and brings the rest in one at a time. These are the numbers the 1.0.0 list was made
 * with, so a place keeps the kind of maze it had.
 */
export const SHAPE_FROM: Record<MeikyuuShape, number> = { square: 0, circle: 12, hex: 16, triangle: 20, hexagon: 26, pyramid: 30, diamond: 36, ring: 42, cross: 48, moon: 55, heart: 62, star: 75, leaf: 90 };
export const MODE_FROM: Record<MeikyuuMode, number> = { "enter-leave": 0, "to-goal": 10, "centre-out": 25, keys: 55 };
export const ALGORITHM_FROM: Record<MeikyuuAlgorithm, number> = { prim: 0, growing: 0, kruskal: 12, wilson: 25, eller: 25, hunt: 60, backtracker: 90 };

/** A candidate's shape, way to play and algorithm have arrived by the time a list reaches `effort`. */
export function arrivedAt(c: Candidate, effort: number): boolean {
  return effort >= SHAPE_FROM[c.recipe.shape] && effort >= MODE_FROM[c.recipe.mode] && effort >= ALGORITHM_FROM[c.recipe.algorithm];
}

const ASPECTS = [1, 1.25, 0.8, 1, 1.5, 0.67] as const;

/** A recipe at random, with cells about `cells` (log-uniform between `low` and `high` when not given). */
export function randomRecipe(random: Random, low: number, high: number, shapes: readonly MeikyuuShape[], aspects: readonly number[] = ASPECTS, algorithms: readonly MeikyuuAlgorithm[] = MEIKYUU_ALGORITHMS): MazeRecipe {
  const weighted = shapes.flatMap((shape) => (shape === "square" ? [shape, shape] : [shape]));
  const shape = weighted[below(random, weighted.length)]!;
  const target = Math.exp(Math.log(low) + random() * (Math.log(high) - Math.log(low)));
  const [w, h] = dimensionsFor(shape, target, aspects[below(random, aspects.length)]!);
  const pool = algorithms.filter((algorithm) => algorithm !== "eller" || shape === "square");
  const algorithm = pool[below(random, pool.length)]!;
  const modes: MeikyuuMode[] = ["enter-leave", "to-goal", "centre-out", "keys"];
  const mode = modes[below(random, modes.length)]!;
  const seed = 1 + Math.floor(random() * 4_000_000_000);
  const cells = cellsOf(shape, w, h);
  return { shape, w, h, algorithm, mode, seed, ...(mode === "keys" ? { keys: keysFor(cells) } : {}) };
}

/** A stream of candidates, each a random recipe within the cells given, that builds and is not too easy. */
export function* candidates(seed: number, low: number, high: number, shapes: readonly MeikyuuShape[], aspects?: readonly number[], algorithms?: readonly MeikyuuAlgorithm[]): Generator<Candidate> {
  const random = seededRandom(seed);
  for (;;) {
    const recipe = randomRecipe(random, low, high, shapes, aspects, algorithms);
    const cells = cellsOf(recipe.shape, recipe.w, recipe.h);
    if (cells < low * 0.95 || cells > high * 1.05) continue;
    const made = candidateOf(recipe);
    if (made !== null && made.cells >= low && made.cells <= high) yield made;
  }
}
