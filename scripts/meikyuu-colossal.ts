/**
 * THE MEIKYUU COLOSSAL LEVELS, MADE ON A DESK: `node --experimental-strip-types scripts/meikyuu-colossal.ts [--out file]`.
 *
 * Two lists of 128 levels each, in `src/levels/colossal.data.ts`: the square ones (9,500 to 12,000 cells, a hundred across or so, in
 * every shape the square lists have and every way to play) and the tall ones (64 columns by 96 rows for a square one, and hexagons and
 * triangles that fill the same 2:3 container, `tallDimensions`). Each list is a ramp of the effort, one step to a place, from the 3rd
 * percentile of a pool of mazes that are not too easy to the 97th, each place taking the maze nearest its step and avoiding the shapes,
 * ways to play and algorithms the places just before it had (`chooseList`, as the tall lists are made). No level is taken from any earlier
 * list. A level is a recipe, never a drawing. Seeded, so the same run writes the same file; the file is what everybody plays.
 *
 * The score is `difficultyOf`'s, the same arithmetic as every other list; its terms are scaled to the biggest maze the older lists reach,
 * so a colossal maze scores high (84 to 98) and the list is put in order by effort, which has more room than the score.
 *
 * Since 3.0.0 the lists are in the order of the score that counts how much of the map the answer covers: run `pnpm levels:rescore` (scripts/meikyuu-rescore.ts)
 * after this, which scores every level again and puts each list in that order. This writes each list in the order it was chosen in.
 */
import { writeFileSync } from "node:fs";

import { MEIKYUU_ALGORITHMS } from "../src/algorithms.ts";
import { COLOSSAL_CELLS, COLOSSAL_TALL_WIDTH, MEIKYUU_COLOSSAL_PER_LIST } from "../src/colossal.ts";
import type { MeikyuuShape } from "../src/grid.ts";
import { MEIKYUU_SHAPES } from "../src/grid.ts";
import { layoutCells, type MazeRecipe, type MeikyuuMode } from "../src/maze.ts";
import { below, seededRandom } from "../src/random.ts";
import { tallDimensions } from "../src/tall.ts";
import { candidateOf, candidates, keysFor, tooEasy, type Candidate } from "./levels-lib.ts";
import { chooseList } from "./levels-list.ts";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string): string => (args.includes(name) ? args[args.indexOf(name) + 1]! : fallback);
const OUT = flag("--out", new URL("../src/levels/colossal.data.ts", import.meta.url).pathname);
const COUNT = MEIKYUU_COLOSSAL_PER_LIST;
const POOL = Number(flag("--pool", "4000"));
/** No colossal level lays out more cells than this (a heart or a leaf cut from a raster 190 across), so what a recipe may ask for (`MEIKYUU_MOST_CELLS`, 40,000) is still above what any level lays out. */
const BIGGEST_LAYOUT = 36_100;
const TALL_SHAPES: readonly MeikyuuShape[] = ["square", "square", "hex", "triangle"];
const MODES: readonly MeikyuuMode[] = ["enter-leave", "to-goal", "centre-out", "keys"];
/** A near-square aspect, so "a hundred across" is about what a square one is. */
const ASPECTS = [1, 1, 1, 1.25, 0.8] as const;

const started = Date.now();
const seconds = (): string => `${((Date.now() - started) / 1000).toFixed(0)}s`;

function ramp(pool: readonly Candidate[]): Candidate[] {
  const fit = pool.filter((c) => !tooEasy(c)).sort((a, b) => a.effort - b.effort);
  const from = fit[Math.floor(fit.length * 0.03)]!.effort;
  const to = fit[Math.floor(fit.length * 0.97)]!.effort;
  const listed = chooseList({ count: COUNT, pool: fit, allowed: (c) => c.effort >= from && c.effort <= to, okAt: (c) => !tooEasy(c), from, to });
  console.log(`  ${fit.length} of ${pool.length} drawn were good enough; efforts ${listed.levels[0]!.effort} to ${listed.levels[COUNT - 1]!.effort}; steps ${listed.steps.mean.toFixed(1)} on average, ${listed.steps.biggest.toFixed(1)} at most (${seconds()})`);
  return listed.levels;
}

// The square list: every shape, about ten thousand cells.
console.log("colossal square list");
const square: Candidate[] = [];
const stream = candidates(9100, COLOSSAL_CELLS[0], COLOSSAL_CELLS[1], MEIKYUU_SHAPES, ASPECTS);
while (square.length < POOL) {
  const c = stream.next().value!;
  if (layoutCells(c.recipe.shape, c.recipe.w, c.recipe.h) <= BIGGEST_LAYOUT) square.push(c);
}
const squareList = ramp(square);

// The tall list: squares, hexagons and triangles that fill a 2:3 container, 64 across.
console.log("colossal tall list");
const random = seededRandom(9200);
const dimensions = new Map(TALL_SHAPES.map((shape) => [shape, tallDimensions(shape, COLOSSAL_TALL_WIDTH)] as const));
const tall: Candidate[] = [];
while (tall.length < POOL) {
  const shape = TALL_SHAPES[below(random, TALL_SHAPES.length)]!;
  const [w, h] = dimensions.get(shape)!;
  const algorithms = MEIKYUU_ALGORITHMS.filter((algorithm) => algorithm !== "eller" || shape === "square");
  const algorithm = algorithms[below(random, algorithms.length)]!;
  const mode = MODES[below(random, MODES.length)]!;
  const seed = 1 + Math.floor(random() * 4_000_000_000);
  const recipe: MazeRecipe = { shape, w, h, algorithm, mode, seed, ...(mode === "keys" ? { keys: keysFor(w * h) } : {}) };
  const made = candidateOf(recipe);
  if (made !== null) tall.push(made);
}
const tallList = ramp(tall);

const rowsOf = (list: readonly Candidate[]): string => list.map((c) => `  ["${c.code}", ${c.effort}, ${c.cells}, ${c.score}],`).join("\n");
writeFileSync(
  OUT,
  `// THE COLOSSAL LEVELS: ${COUNT} recipes in each of two lists, the square ones (${COLOSSAL_CELLS[0]} to ${COLOSSAL_CELLS[1]} cells, in every shape) and the tall ones (${COLOSSAL_TALL_WIDTH} cells across, 2:3), each in the order of the effort it measures\n// (never easier to draw than the one before), each with that effort, its cells and its score (see difficulty.ts). Made by scripts/meikyuu-colossal.ts and never edited by\n// hand: a recipe rebuilds its maze exactly, and levels.colossal.test.ts rebuilds every one and checks all of it, so a change to a generator or to the stream fails the build.\nexport const MEIKYUU_COLOSSAL_ROWS: readonly (readonly [string, number, number, number])[] = [\n${rowsOf(squareList)}\n];\nexport const MEIKYUU_COLOSSAL_TALL_ROWS: readonly (readonly [string, number, number, number])[] = [\n${rowsOf(tallList)}\n];\n`,
);
console.log(`wrote ${squareList.length} square and ${tallList.length} tall colossal levels to ${OUT} in ${seconds()}`);
