import { carveMaze, MEIKYUU_ALGORITHMS, type Links, type MeikyuuAlgorithm } from "../algorithms.ts";
import { difficultyOfGraph, type MazeDifficulty, type MazeGeometry } from "../difficulty.ts";
import { solutionOf, walk, type MazeCore } from "../maze.ts";
import { below, seededRandom } from "../random.ts";
import { lineToSteps } from "../steps.ts";
import { MEIKYUU_MOST_SOLID_CELLS, SOLID_KINDS, solidCells, solidGridOf, type SolidGrid, type SolidKind } from "./solidGrid.ts";
import { distanceSquared, dot, length, sub, type Vec3 } from "./vec.ts";

/**
 * A MAZE OVER THE WHOLE SURFACE OF A SOLID: a cube, a globe, or one of the solids made of triangles. It is a perfect maze like any other here: the
 * passages are a spanning tree of the cells (`carveMaze`, the very algorithms the flat mazes use), so there is exactly one way between any two
 * cells, however many edges and faces it crosses. The line is a list of cells, from the start to the goal, and that list is the whole of the answer:
 * it does not know how the solid is turned.
 *
 * The start is a cell chosen from the seed; the goal is a cell among the farthest third from it over the surface (by the number of cells between,
 * which is a whole number and so the same in every engine), and among those a deep one, far along the passages. So the goal is usually on the far
 * side of the solid, and the way to it winds round it.
 *
 * A recipe is `cube:6:prim:48213`: the solid, the cut, the algorithm and the seed. It rebuilds the same maze in every browser and every Node.
 */

/** The algorithms that make a maze over a solid: all but Eller's, which needs rows. */
export const SOLID_ALGORITHMS = MEIKYUU_ALGORITHMS.filter((algorithm): algorithm is Exclude<MeikyuuAlgorithm, "eller"> => algorithm !== "eller");
export type SolidAlgorithm = (typeof SOLID_ALGORITHMS)[number];

/** Everything that makes a maze over a solid. */
export type SolidRecipe = {
  readonly kind: SolidKind;
  /** The cut: cells along an edge of a face, or the frequency of the globe (see `SolidGrid`). */
  readonly n: number;
  readonly algorithm: SolidAlgorithm;
  readonly seed: number;
};

/** A maze over a solid: what a flat maze has that is not flat. It is a `MazeCore`, so the game, the stones, the steps and the measure play it as they play any maze. */
export type SolidMaze = MazeCore & {
  readonly recipe: SolidRecipe;
  readonly grid: SolidGrid;
  readonly links: Links;
  readonly start: number;
  readonly goal: number;
  /** Always empty: a maze over a solid has no keys. */
  readonly keys: readonly number[];
};

/** A recipe as one short word, such as `cube:6:prim:48213`, and the other way (`parseSolidRecipe`). */
export function solidRecipeCode(recipe: SolidRecipe): string {
  return `${recipe.kind}:${recipe.n}:${recipe.algorithm}:${recipe.seed}`;
}

/** A recipe from its code, or null when it is not one, or names a solid of more than `MEIKYUU_MOST_SOLID_CELLS` cells. */
export function parseSolidRecipe(code: string): SolidRecipe | null {
  const parts = code.split(":");
  if (parts.length !== 4) return null;
  const [kind, size, algorithm, seed] = parts as [string, string, string, string];
  if (!(SOLID_KINDS as readonly string[]).includes(kind) || !(SOLID_ALGORITHMS as readonly string[]).includes(algorithm)) return null;
  if (!/^\d{1,4}$/.test(size) || !/^\d{1,10}$/.test(seed)) return null;
  const n = Number(size);
  if (n < 2 || solidCells(kind as SolidKind, n) > MEIKYUU_MOST_SOLID_CELLS) return null;
  const number = Number(seed);
  if (number > 4_294_967_295) return null;
  return { kind: kind as SolidKind, n, algorithm: algorithm as SolidAlgorithm, seed: number };
}

const GRIDS = new Map<string, SolidGrid>();

/** The grid of a solid cut `n` ways, kept: a grid is never changed, and a script that makes thousands of mazes of one size builds it once. */
export function cachedSolidGrid(kind: SolidKind, n: number): SolidGrid {
  const key = `${kind}:${n}`;
  let grid = GRIDS.get(key);
  if (grid === undefined) {
    grid = solidGridOf(kind, n);
    if (GRIDS.size >= 12) GRIDS.delete(GRIDS.keys().next().value!);
    GRIDS.set(key, grid);
  }
  return grid;
}

/** The share of the cells, the farthest from the start over the surface, that the goal is chosen from. */
const FAR_SHARE = 0.3;
/** How deep along the passages, as a share of the deepest of those, the goal is. */
const DEEP_SHARE = 0.7;

/** Make the maze a recipe names. */
export function buildSolidMaze(recipe: SolidRecipe): SolidMaze {
  const grid = cachedSolidGrid(recipe.kind, recipe.n);
  const random = seededRandom(recipe.seed);
  const links = carveMaze(grid, recipe.algorithm, random);
  const start = below(random, grid.cells);
  // The far side: the cells most steps from the start over the surface, by a count that is a whole number. Ties go to the lower cell.
  const across = walk(grid.neighbours as Links, start).dist;
  const far = Array.from({ length: grid.cells }, (_, cell) => cell)
    .filter((cell) => cell !== start)
    .sort((a, b) => across[b]! - across[a]! || a - b)
    .slice(0, Math.max(1, Math.ceil(grid.cells * FAR_SHARE)));
  // And of those one far along the passages: the way from start to goal winds.
  const along = walk(links, start).dist;
  const deepest = far.reduce((most, cell) => Math.max(most, along[cell]!), 0);
  const deep = far.filter((cell) => along[cell]! >= Math.ceil(deepest * DEEP_SHARE));
  const goal = deep[below(random, deep.length)]!;
  return { recipe, grid, links, start, goal, keys: [] };
}

/** How a maze over a solid lies in space, for the measure: squared distance through space to the goal, and the bend of the line in three dimensions. */
export function solidGeometry(maze: SolidMaze): MazeGeometry {
  const { centres } = maze.grid;
  const goal = centres[maze.goal]!;
  return {
    points: centres,
    distanceToGoal: (cell) => distanceSquared(centres[cell]!, goal),
    bend: (before, cell, after) => {
      const a: Vec3 = sub(centres[cell]!, centres[before]!);
      const b: Vec3 = sub(centres[after]!, centres[cell]!);
      const l = length(a) * length(b);
      return l < 1e-12 ? 0 : Math.acos(Math.max(-1, Math.min(1, dot(a, b) / l)));
    },
  };
}

/** How hard a maze over a solid is to play, from 0 to 100, on the very scale flat mazes are scored on (`difficultyOf`). */
export function solidDifficultyOf(maze: SolidMaze): MazeDifficulty {
  return difficultyOfGraph(maze, solidGeometry(maze));
}

/** The one way from the start to the goal, cell by cell. */
export function solidSolutionOf(maze: SolidMaze): number[] {
  return solutionOf(maze);
}

/** Whether a list of cells is the answer: it starts at the start, ends at the goal, steps from each cell to one joined to it by a passage, and never visits a cell twice. It takes time in proportion to the line, never to the solid. */
export function checkSolidAnswer(maze: SolidMaze, cells: readonly number[]): boolean {
  if (cells.length < 2 || cells[0] !== maze.start || cells[cells.length - 1] !== maze.goal) return false;
  const seen = new Uint8Array(maze.grid.cells);
  for (let at = 0; at < cells.length; at += 1) {
    const cell = cells[at]!;
    if (!Number.isInteger(cell) || cell < 0 || cell >= maze.grid.cells || seen[cell] === 1) return false;
    seen[cell] = 1;
    if (at > 0 && !maze.links[cells[at - 1]!]!.includes(cell)) return false;
  }
  return true;
}

/** The answer as steps (the format a kept run uses, `lineToSteps`), for a maze: its whole solution. */
export function solidAnswerSteps(maze: SolidMaze): string {
  return lineToSteps(maze, solidSolutionOf(maze)) ?? "";
}
