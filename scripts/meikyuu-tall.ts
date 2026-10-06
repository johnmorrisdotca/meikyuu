/**
 * THE MEIKYUU TALL LEVELS, MADE ON A DESK: `node scripts/meikyuu-tall.ts [--out file]`.
 *
 * Portrait mazes, two columns of cells to every three rows (a container 2:3, width to height), in six sizes of 256 levels each, in
 * the order of the effort they measure (never easier to draw than the one before, as the square lists are, and with the score `difficultyOf`
 * gives beside it, docs/LEVELS.md): 6 cells across, 8, 10, 12, 16 and 20. Squares are 6x9, 8x12 and so
 * on; hexagons and triangles are laid out to fill a container of that shape with about as many cells as the square has, so a size is as big to draw in every shape.
 * A level is a recipe, never a drawing, and is written the way it is played, upright (narrower than tall): turning it to lie on a
 * wide screen is the board's business and changes nothing in the recipe or in a line drawn on it.
 *
 * No level is taken from any earlier list, so each size is a ramp of 256 steps of the effort, from the 3rd percentile to the 97th of a
 * pool of 30,000 mazes drawn for it that are not too easy (`isTooEasy`, and from the first place the whole floor of the end of the easy third: the smallest tall maze has 54 cells, so it can be asked), each place taking the maze nearest its step, so no level is an outlier. Seeded: the same run
 * writes the same file.
 *
 * Since 3.0.0 the lists are in the order of the score that counts how much of the map the answer covers: run `pnpm levels:rescore` (scripts/meikyuu-rescore.ts)
 * after this, which scores every level again and puts each list in that order. This writes each list in the order it was chosen in.
 */
import { writeFileSync } from "node:fs";

import { MEIKYUU_ALGORITHMS } from "../src/algorithms.ts";
import type { MeikyuuShape } from "../src/grid.ts";
import { type MazeRecipe, type MeikyuuMode } from "../src/maze.ts";
import { below, seededRandom } from "../src/random.ts";
import { MEIKYUU_EASY_PLACES } from "../src/difficulty.ts";
import { TALL_WIDTHS, tallDimensions } from "../src/tall.ts";
import { candidateOf, keysFor, tooEasy, type Candidate } from "./levels-lib.ts";
import { chooseList } from "./levels-list.ts";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string): string => (args.includes(name) ? args[args.indexOf(name) + 1]! : fallback);
const OUT = flag("--out", new URL("../src/levels/tall.data.ts", import.meta.url).pathname);
const COUNT = 256;
const POOL = 30_000;
const SHAPES: readonly MeikyuuShape[] = ["square", "square", "hex", "triangle"];
const MODES: readonly MeikyuuMode[] = ["enter-leave", "to-goal", "centre-out", "keys"];

const started = Date.now();
const rows: string[] = [];
const report: string[] = [];
for (const [index, width] of TALL_WIDTHS.entries()) {
  const random = seededRandom(5000 + index);
  const dimensions = new Map(SHAPES.map((shape) => [shape, tallDimensions(shape, width)] as const));
  const pool: Candidate[] = [];
  while (pool.length < POOL) {
    const shape = SHAPES[below(random, SHAPES.length)]!;
    const [w, h] = dimensions.get(shape)!;
    const algorithms = MEIKYUU_ALGORITHMS.filter((algorithm) => algorithm !== "eller" || shape === "square");
    const algorithm = algorithms[below(random, algorithms.length)]!;
    const mode = MODES[below(random, MODES.length)]!;
    const seed = 1 + Math.floor(random() * 4_000_000_000);
    const recipe: MazeRecipe = { shape, w, h, algorithm, mode, seed, ...(mode === "keys" ? { keys: keysFor(w * h) } : {}) };
    const made = candidateOf(recipe);
    if (made !== null) pool.push(made);
  }
  const fit = pool.filter((c) => !tooEasy(c)).sort((a, b) => a.effort - b.effort);
  // The ramp runs from the 3rd percentile of the pool's effort to the 97th. (The ways to play differ in what they cost at one size, an in-and-out
  // maze more than one out from the middle, so the low end has more of the one and the high end more of the other; the ramp's crowding rule keeps
  // every shape and way to play in every third.)
  const from = fit[Math.floor(fit.length * 0.03)]!.effort;
  const to = fit[Math.floor(fit.length * 0.97)]!.effort;
  const listed = chooseList({ count: COUNT, pool: fit, allowed: (c) => c.effort >= from && c.effort <= to, okAt: (c) => !tooEasy(c, MEIKYUU_EASY_PLACES), from, to });
  const range = `${listed.levels[0]!.effort} to ${listed.levels[COUNT - 1]!.effort}`;
  report.push(`${width} across (${tallDimensions("square", width).join("x")}): ${fit.length} of ${pool.length} drawn were hard enough; efforts ${range}; steps ${listed.steps.mean.toFixed(2)} on average, ${listed.steps.biggest.toFixed(2)} at most (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  for (const c of listed.levels) rows.push(`  ["${c.code}", ${c.effort}, ${c.cells}, ${c.score}],`);
}

writeFileSync(
  OUT,
  `// THE TALL LEVELS: ${rows.length} recipes, ${COUNT} to each of ${TALL_WIDTHS.length} sizes (${TALL_WIDTHS.join(", ")} cells across, in that order), each size in the order of the score it is given\n// (see difficulty.ts), each with the effort it measures, its cells and its score. Made by scripts/meikyuu-tall.ts and never edited by hand.\nexport const MEIKYUU_TALL_ROWS: readonly (readonly [string, number, number, number])[] = [\n${rows.join("\n")}\n];\n`,
);
console.log(report.join("\n"));
console.log(`wrote ${rows.length} levels to ${OUT} in ${((Date.now() - started) / 1000).toFixed(0)}s`);
