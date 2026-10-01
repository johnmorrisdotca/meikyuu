import { carveMaze, MEIKYUU_ALGORITHMS, type Links, type MeikyuuAlgorithm } from "./algorithms.ts";
import { boundaryCells, centreCell, MEIKYUU_SHAPES, type Grid, type MeikyuuShape } from "./grid.ts";
import { below, seededRandom, shuffled, type Random } from "./random.ts";
import { gridOf, ringCounts } from "./shapes.ts";

/**
 * A MAZE: a grid, the passages carved through it (always a spanning tree, so exactly one way between
 * any two cells), and how it is played. The way to play is a declared field of the level, never
 * inferred from the shape:
 *
 * - `enter-leave`: in at one door in the outer wall, out at another.
 * - `to-goal`: from a cell inside to a dot hidden deep in the maze.
 * - `centre-out`: from the middle of the shape to a door in the outer wall.
 * - `keys`: from a cell inside, collecting every key, to a door in the outer wall. A key is picked up by
 *   passing over it, and stays picked up if the line is drawn back.
 *
 * A maze is a recipe (`MazeRecipe`) and nothing else: the same recipe makes the same maze in every
 * browser and every Node, because everything that decides it is integer arithmetic on a seeded stream.
 */
export const MEIKYUU_MODES = ["enter-leave", "to-goal", "centre-out", "keys"] as const;
export type MeikyuuMode = (typeof MEIKYUU_MODES)[number];

/** Everything that makes a maze. */
export type MazeRecipe = {
  readonly shape: MeikyuuShape;
  /** Columns, rings, a radius or the size of the square a shape is cut from: see `gridOf`. */
  readonly w: number;
  /** Rows, for the shapes that have them; the same as `w` for the others. */
  readonly h: number;
  readonly algorithm: MeikyuuAlgorithm;
  readonly mode: MeikyuuMode;
  readonly seed: number;
  /** How many keys, for the `keys` way to play. */
  readonly keys?: number;
};

/** A door in the outer wall: the cell it is beside, and which of that cell's sides. */
export type Door = { readonly cell: number; readonly side: number };

export type Maze = {
  readonly recipe: MazeRecipe;
  readonly grid: Grid;
  /** Each cell's open neighbours. */
  readonly links: Links;
  /** The cell the line starts in. */
  readonly start: number;
  /** The cell the line must reach. */
  readonly goal: number;
  /** The door the line comes in by, for `enter-leave`. */
  readonly entrance: Door | null;
  /** The door the line goes out by, for `enter-leave`, `centre-out` and `keys`. */
  readonly exit: Door | null;
  /** The keys to collect, for `keys`. */
  readonly keys: readonly number[];
};

const ROWLESS: readonly MeikyuuShape[] = ["circle", "heart", "leaf", "star", "ring", "diamond", "cross", "moon", "hexagon", "pyramid"];

/** A recipe as one short word, such as `square:12x9:wilson:to-goal:48213` or `heart:25:prim:keys-3:7`, and the other way (`parseRecipe`). */
export function recipeCode(recipe: MazeRecipe): string {
  const size = ROWLESS.includes(recipe.shape) ? `${recipe.w}` : `${recipe.w}x${recipe.h}`;
  const mode = recipe.mode === "keys" ? `keys-${recipe.keys ?? 1}` : recipe.mode;
  return `${recipe.shape}:${size}:${recipe.algorithm}:${mode}:${recipe.seed}`;
}

/**
 * The most cells a recipe may lay out: a little over twice what the biggest level does (19,321, a heart, leaf, star
 * or moon cut from a raster 139 across). A recipe names its own size, and a server that takes recipes from other
 * people must not be asked to build a maze of millions of cells, so `parseRecipe` refuses one that would.
 */
export const MEIKYUU_MOST_CELLS = 40_000;

/** The most keys a recipe may ask for: twice the most any level uses (five). */
export const MEIKYUU_MOST_KEYS = 10;

/**
 * How many cells laying out a recipe's grid takes, counted before anything is built: the grid's own cells for
 * squares, hexagons, triangles and circles, and the whole raster for a shape cut out of one (a cut-out shape
 * keeps fewer, but is built from all of them). A hexagon of radius `w` is cut from a hex grid `2w + 1` across,
 * and a pyramid of `w` rows from a triangle grid twice as wide as it is tall.
 */
export function layoutCells(shape: MeikyuuShape, w: number, h: number): number {
  switch (shape) {
    case "square":
    case "hex":
    case "triangle":
      return w * h;
    case "circle":
      // Every ring holds at least one cell, so more rings than the most cells is already too many.
      return w > MEIKYUU_MOST_CELLS ? Infinity : ringCounts(w).reduce((total, count) => total + count, 0);
    case "hexagon":
      return (2 * w + 1) * (2 * w + 1);
    case "pyramid":
      return (2 * ((w - 1) % 2 === 0 ? w - 1 : w) + 1) * w;
    default:
      return w * w;
  }
}

/** A recipe from its code, or null when it is not one, or names a maze bigger than `MEIKYUU_MOST_CELLS` or more keys than `MEIKYUU_MOST_KEYS`. */
export function parseRecipe(code: string): MazeRecipe | null {
  const parts = code.split(":");
  if (parts.length !== 5) return null;
  const [shape, size, algorithm, mode, seed] = parts as [string, string, string, string, string];
  if (!(MEIKYUU_SHAPES as readonly string[]).includes(shape) || !(MEIKYUU_ALGORITHMS as readonly string[]).includes(algorithm)) return null;
  const sizes = /^(\d+)(?:x(\d+))?$/.exec(size);
  const modes = /^(enter-leave|to-goal|centre-out|keys)(?:-(\d+))?$/.exec(mode);
  if (sizes === null || modes === null || !/^\d+$/.test(seed)) return null;
  const w = Number(sizes[1]);
  const h = sizes[2] === undefined ? w : Number(sizes[2]);
  const isRowless = ROWLESS.includes(shape as MeikyuuShape);
  if (isRowless !== (sizes[2] === undefined) || w < 2 || h < 2) return null;
  if (layoutCells(shape as MeikyuuShape, w, h) > MEIKYUU_MOST_CELLS) return null;
  const keys = modes[1] === "keys" ? Math.max(1, Number(modes[2] ?? 1)) : undefined;
  if (keys !== undefined && keys > MEIKYUU_MOST_KEYS) return null;
  return { shape: shape as MeikyuuShape, w, h, algorithm: algorithm as MeikyuuAlgorithm, mode: modes[1] as MeikyuuMode, seed: Number(seed), ...(keys === undefined ? {} : { keys }) };
}

/** How far every cell is from `from` along the passages, and the cell before it on the way: -1 where unreachable. */
export function walk(links: Links, from: number): { dist: Int32Array; before: Int32Array; order: Int32Array } {
  const dist = new Int32Array(links.length).fill(-1);
  const before = new Int32Array(links.length).fill(-1);
  const order = new Int32Array(links.length);
  let head = 0;
  let tail = 0;
  dist[from] = 0;
  order[tail++] = from;
  while (head < tail) {
    const cell = order[head++]!;
    for (const next of links[cell]!) {
      if (dist[next] !== -1) continue;
      dist[next] = dist[cell]! + 1;
      before[next] = cell;
      order[tail++] = next;
    }
  }
  return { dist, before, order: order.subarray(0, tail) };
}

/** The first cell of the list with the greatest distance. */
function farthest(cells: readonly number[], dist: Int32Array): number {
  let best = cells[0]!;
  for (const cell of cells) if (dist[cell]! > dist[best]!) best = cell;
  return best;
}

/** A cell chosen from those at least `share` of the way to the farthest. */
function deep(cells: readonly number[], dist: Int32Array, share: number, random: Random): number {
  const most = dist[farthest(cells, dist)]!;
  const far = cells.filter((cell) => dist[cell]! >= Math.ceil(most * share) && dist[cell]! > 0);
  return far[below(random, far.length)] ?? farthest(cells, dist);
}

/** The first side of the cell that is the edge of the shape, as a door. */
function doorAt(grid: Grid, cell: number, random: Random): Door {
  const outer = grid.sides[cell]!.map((side, index) => (side.to < 0 ? index : -1)).filter((index) => index >= 0);
  return { cell, side: outer[below(random, outer.length)]! };
}

/** A start inside the maze where there is room, and anywhere where there is not. */
function innerCell(grid: Grid, random: Random): number {
  const edge = new Set(boundaryCells(grid));
  const inside: number[] = [];
  for (let cell = 0; cell < grid.cells; cell += 1) if (!edge.has(cell)) inside.push(cell);
  return inside.length > 0 ? inside[below(random, inside.length)]! : below(random, grid.cells);
}

/** Where `count` keys go: ends of branches, far from the way from start to goal and from each other. */
function placeKeys(grid: Grid, links: Links, start: number, goal: number, count: number, random: Random): number[] {
  const { before } = walk(links, start);
  const onWay = new Set<number>();
  for (let cell = goal; cell !== -1; cell = before[cell]!) onWay.add(cell);
  // How far from the way every cell is: a walk outward from all of it at once.
  const away = new Int32Array(grid.cells).fill(-1);
  const queue: number[] = [...onWay];
  for (const cell of queue) away[cell] = 0;
  for (let head = 0; head < queue.length; head += 1) {
    for (const next of links[queue[head]!]!) {
      if (away[next] === -1) {
        away[next] = away[queue[head]!]! + 1;
        queue.push(next);
      }
    }
  }
  const ends = [];
  for (let cell = 0; cell < grid.cells; cell += 1) if (links[cell]!.length === 1 && !onWay.has(cell)) ends.push(cell);
  const most = ends.reduce((m, cell) => Math.max(m, away[cell]!), 0);
  const deepEnds = shuffled(ends.filter((cell) => away[cell]! >= Math.ceil(most * 0.4)), random);
  const picked: number[] = [];
  const spacing = Math.max(3, Math.floor(Math.sqrt(grid.cells) / 3));
  for (const cell of deepEnds) {
    if (picked.length === count) break;
    const { dist } = walk(links, cell);
    if (picked.every((other) => dist[other]! >= spacing)) picked.push(cell);
  }
  // Too few far-apart ends: take any that remain.
  for (const cell of deepEnds) if (picked.length < count && !picked.includes(cell)) picked.push(cell);
  return picked;
}

/** Make the maze a recipe names. */
export function buildMaze(recipe: MazeRecipe): Maze {
  const grid = gridOf(recipe.shape, recipe.w, recipe.h);
  const random = seededRandom(recipe.seed);
  const links = carveMaze(grid, recipe.algorithm, random);
  const edge = boundaryCells(grid);
  let start = 0;
  let goal = 0;
  let entrance: Door | null = null;
  let exit: Door | null = null;
  let keys: number[] = [];
  switch (recipe.mode) {
    case "enter-leave": {
      const from = edge[below(random, edge.length)]!;
      start = farthest(edge, walk(links, from).dist);
      goal = farthest(edge.filter((cell) => cell !== start), walk(links, start).dist);
      entrance = doorAt(grid, start, random);
      exit = doorAt(grid, goal, random);
      break;
    }
    case "to-goal": {
      start = innerCell(grid, random);
      goal = deep(Array.from({ length: grid.cells }, (_, i) => i), walk(links, start).dist, 0.8, random);
      break;
    }
    case "centre-out": {
      start = centreCell(grid);
      goal = deep(edge.filter((cell) => cell !== start), walk(links, start).dist, 0.8, random);
      exit = doorAt(grid, goal, random);
      break;
    }
    case "keys": {
      start = innerCell(grid, random);
      goal = deep(edge.filter((cell) => cell !== start), walk(links, start).dist, 0.8, random);
      exit = doorAt(grid, goal, random);
      keys = placeKeys(grid, links, start, goal, recipe.keys ?? 1, random);
      break;
    }
  }
  return { recipe, grid, links, start, goal, entrance, exit, keys };
}

/** The one way from the start to the goal, cell by cell, both ends included. */
export function solutionOf(maze: Maze): number[] {
  const { before } = walk(maze.links, maze.start);
  const out: number[] = [];
  for (let cell = maze.goal; cell !== -1; cell = before[cell]!) out.push(cell);
  return out.reverse();
}

/** How many passages the maze has: one fewer than its cells, if it is perfect. */
export function passageCount(links: Links): number {
  return links.reduce((sum, open) => sum + open.length, 0) / 2;
}

/** Whether the passages are a spanning tree of the grid: every cell reached, and exactly one way to each. */
export function isPerfect(grid: Grid, links: Links): boolean {
  if (passageCount(links) !== grid.cells - 1) return false;
  for (let cell = 0; cell < grid.cells; cell += 1) for (const next of links[cell]!) if (!grid.neighbours[cell]!.includes(next) || !links[next]!.includes(cell)) return false;
  return walk(links, 0).order.length === grid.cells;
}
