/**
 * THE MEIKYUU MAZE LEVELS, MADE ON A DESK: `node scripts/meikyuu-levels.ts [--count N] [--out file]`.
 *
 * A level is a recipe (shape, size, algorithm, way to play, seed), never a drawing. For each
 * of the N levels this picks a shape, a way to play and an algorithm from what that point of
 * the list has unlocked, then searches sizes and seeds for the maze whose measured effort
 * (`measureMaze`) is nearest the effort the list should have there, which grows from a few
 * cells drawn to thousands. The levels are then sorted by the effort they measured, so each
 * is at least as hard as the one before, and written to `src/levels/mazes.data.ts` with the
 * effort beside each recipe. The tests rebuild every one and measure it again.
 *
 * Seeded, so the same run writes the same file; the file is what everybody plays, and this is
 * how it was made, kept so it can be made again. Nothing here runs in a browser. A level
 * once published keeps its number: change this and the numbers move, so a published list
 * is only ever added to at the end (a new file, a new version), never rewritten.
 */
import { writeFileSync } from "node:fs";

import { MEIKYUU_ALGORITHMS, type MeikyuuAlgorithm } from "../src/algorithms.ts";
import type { MeikyuuShape } from "../src/grid.ts";
import { gridOf } from "../src/shapes.ts";
import { buildMaze, isPerfect, recipeCode, walk, type MazeRecipe, type MeikyuuMode } from "../src/maze.ts";
import { measureMaze } from "../src/measure.ts";
import { seededRandom } from "../src/random.ts";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string): string => (args.includes(name) ? args[args.indexOf(name) + 1]! : fallback);
const COUNT = Number(flag("--count", "1000"));
const OUT = flag("--out", new URL("../src/levels/mazes.data.ts", import.meta.url).pathname);

/** The effort of the first level and of the last, and how fast the list climbs toward the last (below 1 is quick at first). */
const EFFORT_FIRST = 9;
const EFFORT_LAST = 5200;
const CLIMB = 0.55;
/** No maze has more cells than this: a phone has to draw it. */
const MOST_CELLS = 9000;
/** A maze of an effort has no more cells than this: the long, winding algorithms make the hardest mazes, and a maze of many short branches does not get to be a big one. */
const cellsFor = (effort: number): number => Math.min(MOST_CELLS, Math.round(3.2 * effort + 40));

/** The effort the list should have at level index `i`. */
const targetAt = (i: number): number => EFFORT_FIRST * (EFFORT_LAST / EFFORT_FIRST) ** (Math.min(1, i / (COUNT - 1)) ** CLIMB);

/** Each shape arrives when the list's effort reaches this, so the first levels are plain squares. */
const SHAPE_FROM: Record<MeikyuuShape, number> = { square: 0, circle: 12, hex: 16, triangle: 20, hexagon: 26, pyramid: 30, diamond: 36, ring: 42, cross: 48, moon: 55, heart: 62, star: 75, leaf: 90 };
const MODE_FROM: Record<MeikyuuMode, number> = { "enter-leave": 0, "to-goal": 10, "centre-out": 25, keys: 55 };
const ALGORITHM_FROM: Record<MeikyuuAlgorithm, number> = { prim: 0, growing: 0, kruskal: 12, wilson: 25, eller: 25, hunt: 60, backtracker: 90 };

const ASPECTS: readonly (readonly [number, number])[] = [[1, 1], [1.25, 0.8], [0.8, 1.25], [1, 1]];

/** The columns and rows (or the one size) a shape has at a scale: how many cells across it is about. */
function dimensions(shape: MeikyuuShape, scale: number, aspect: number): [number, number] {
  const [aw, ah] = ASPECTS[aspect % ASPECTS.length]!;
  switch (shape) {
    case "square":
      return [Math.max(3, Math.round(scale * aw)), Math.max(3, Math.round(scale * ah))];
    case "hex":
      return [Math.max(2, Math.round(scale * aw)), Math.max(2, Math.round(scale * ah * 1.15))];
    case "triangle":
      return [Math.max(3, Math.round(2 * scale * aw)), Math.max(2, Math.round(scale * ah * 1.15))];
    case "circle":
    case "hexagon":
    case "pyramid":
      return [Math.max(2, scale), Math.max(2, scale)];
    default:
      return [Math.max(7, scale), Math.max(7, scale)];
  }
}

/** The number of keys for a keys level of a given size: one more for each couple of hundred cells, up to five. */
const keysFor = (cells: number): number => Math.min(5, 1 + Math.floor(cells / 220));

type Candidate = { recipe: MazeRecipe; effort: number; cells: number };

/** Build and measure a recipe; null when it cannot be played (too few cells, too many, or no room for its way to play). */
function attempt(recipe: MazeRecipe, most: number): Candidate | null {
  let maze;
  try {
    if (gridOf(recipe.shape, recipe.w, recipe.h).cells > most) return null;
    maze = buildMaze(recipe);
  } catch {
    return null;
  }
  if (maze.grid.cells < 6) return null;
  if (recipe.mode === "keys" && maze.keys.length < (recipe.keys ?? 1)) return null;
  if (recipe.mode === "keys" && maze.grid.cells < 40) return null;
  if (maze.start === maze.goal) return null;
  const { effort } = measureMaze(maze);
  return { recipe, effort, cells: maze.grid.cells };
}

/** A key that says whether two mazes are the same maze, so the list never repeats one (small mazes would). */
function sameness(recipe: MazeRecipe): string {
  const maze = buildMaze(recipe);
  const { before } = walk(maze.links, maze.start);
  return `${recipe.shape}:${recipe.w}x${recipe.h}:${recipe.mode}:${maze.start}:${maze.goal}:${maze.keys.join(",")}:${Array.from(before).join(",")}`;
}

const kept = new Set<string>();
const hints = new Map<string, number>();
const chosen: Candidate[] = [];
const started = Date.now();

for (let index = 0; index < COUNT; index += 1) {
  const target = targetAt(index);
  const random = seededRandom(7000 + index);
  const shapes = (Object.keys(SHAPE_FROM) as MeikyuuShape[]).filter((shape) => SHAPE_FROM[shape] <= target);
  const modes = (Object.keys(MODE_FROM) as MeikyuuMode[]).filter((mode) => MODE_FROM[mode] <= target);
  // The first level a shape or a way to play is available shows it; after that, squares are a little commoner than the rest.
  const newShape = shapes.find((shape) => SHAPE_FROM[shape] <= target && !chosen.some((c) => c.recipe.shape === shape));
  const newMode = modes.find((mode) => !chosen.some((c) => c.recipe.mode === mode));
  const weighted = shapes.flatMap((shape) => (shape === "square" ? [shape, shape] : [shape]));
  const shape = newShape ?? weighted[Math.floor(random() * weighted.length)]!;
  const mode = newMode ?? modes[Math.floor(random() * modes.length)]!;
  const aspect = Math.floor(random() * 4);
  const pool = MEIKYUU_ALGORITHMS.filter((algorithm) => ALGORITHM_FROM[algorithm] <= target && (algorithm !== "eller" || shape === "square"));
  // A preferred algorithm first, then the rest: the first that can reach the target's effort within a tenth is taken.
  const first = pool[Math.floor(random() * pool.length)]!;
  const order = [first, ...pool.filter((algorithm) => algorithm !== first).sort((a, b) => (a === "backtracker" ? -1 : b === "backtracker" ? 1 : 0))];
  let best: Candidate | null = null;
  for (const algorithm of order) {
    const key = `${shape}:${algorithm}:${aspect}`;
    let found: Candidate | null = null;
    // Climb through sizes from where the last search of this kind ended until the effort passes the target.
    let scale = Math.max(3, (hints.get(key) ?? 3) - 2);
    let passed = false;
    for (; scale < 140 && !passed; scale += 1) {
      const [w, h] = dimensions(shape, scale, aspect);
      for (let seed = 0; seed < 4; seed += 1) {
        const recipe: MazeRecipe = { shape, w, h, algorithm, mode, seed: 1 + seed * 7919 + index * 31, ...(mode === "keys" ? { keys: 1 } : {}) };
        const keysed = mode === "keys" ? { ...recipe, keys: keysFor(buildMaze({ ...recipe, keys: 1 }).grid.cells) } : recipe;
        const made = attempt(keysed, cellsFor(target * 1.6));
        if (made === null) {
          // Too big for this effort, or too small to play: bigger sizes only get bigger.
          if (gridOf(shape, w, h).cells > cellsFor(target * 1.6)) passed = true;
          continue;
        }
        if (made.effort > target * 1.6) passed = true;
        if (found === null || Math.abs(Math.log(made.effort / target)) < Math.abs(Math.log(found.effort / target))) found = made;
      }
    }
    hints.set(key, scale - 1);
    if (found === null) continue;
    // Refine: more seeds at the size that came nearest.
    const { recipe } = found;
    for (let seed = 0; seed < 40 && Math.abs(Math.log(found.effort / target)) > 0.025; seed += 1) {
      const made = attempt({ ...recipe, seed: 100003 + seed * 104729 + index * 17 }, cellsFor(target * 1.6));
      if (made !== null && Math.abs(Math.log(made.effort / target)) < Math.abs(Math.log(found.effort / target)) && !kept.has(sameness(made.recipe))) found = made;
    }
    if (best === null || Math.abs(Math.log(found.effort / target)) < Math.abs(Math.log(best.effort / target))) best = found;
    if (Math.abs(Math.log(best.effort / target)) < 0.1) break;
  }
  if (best === null) throw new Error(`no maze for level ${index + 1} (target ${target.toFixed(1)}, ${shape}, ${mode})`);
  if (kept.has(sameness(best.recipe))) {
    // A small maze that already is in the list: take a neighbour by seed.
    for (let seed = 0; seed < 400 && kept.has(sameness(best.recipe)); seed += 1) {
      const made = attempt({ ...best.recipe, seed: 55555 + seed * 977 + index }, MOST_CELLS);
      if (made !== null) best = made;
    }
  }
  kept.add(sameness(best.recipe));
  chosen.push(best);
  if ((index + 1) % 10 === 0) console.log(`${index + 1}/${COUNT}  target ${target.toFixed(0)}  got ${best.effort}  ${recipeCode(best.recipe)}  ${((Date.now() - started) / 1000).toFixed(0)}s`);
}

chosen.sort((a, b) => a.effort - b.effort);
for (const level of chosen) if (!isPerfect(buildMaze(level.recipe).grid, buildMaze(level.recipe).links)) throw new Error(`${recipeCode(level.recipe)} is not perfect`);

const rows = chosen.map((level) => `  ["${recipeCode(level.recipe)}", ${level.effort}, ${level.cells}],`).join("\n");
writeFileSync(
  OUT,
  `// THE MAZE LEVELS: ${chosen.length} recipes, easiest first, each with the effort it measures (see measure.ts) and its cells.\n// Made by scripts/meikyuu-levels.ts and never edited by hand: a recipe rebuilds its maze exactly, and levels.mazes.*.test.ts\n// rebuilds every one and checks the effort, so a change to a generator or to the stream fails the build.\nexport const MEIKYUU_MAZE_ROWS: readonly (readonly [string, number, number])[] = [\n${rows}\n];\n`,
);

const count = (pick: (c: Candidate) => string): string => {
  const map = new Map<string, number>();
  for (const level of chosen) map.set(pick(level), (map.get(pick(level)) ?? 0) + 1);
  return [...map].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(", ");
};
console.log(`wrote ${chosen.length} levels to ${OUT} in ${((Date.now() - started) / 1000).toFixed(0)}s`);
console.log("shapes:", count((c) => c.recipe.shape));
console.log("modes:", count((c) => c.recipe.mode));
console.log("algorithms:", count((c) => c.recipe.algorithm));
console.log("effort:", chosen[0]!.effort, "to", chosen[chosen.length - 1]!.effort, " cells:", Math.min(...chosen.map((c) => c.cells)), "to", Math.max(...chosen.map((c) => c.cells)));
