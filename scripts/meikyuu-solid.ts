/**
 * THE MEIKYUU SOLID LEVELS, MADE ON A DESK: `node --experimental-strip-types scripts/meikyuu-solid.ts [--out file] [--pool n]`.
 *
 * Sixty-four levels for each size (small, medium, large) of each of the five solids, in `src/levels/solid.data.ts`. Each list is a ramp of the
 * difficulty `solidDifficultyOf` scores, one step to a place, from the 3rd percentile of a pool of mazes that are not too easy to the 97th, each
 * place taking the maze nearest its step and avoiding the algorithms the places just before it had; the list is then put in order of that score.
 * A level is a recipe, never a drawing. Seeded, so the same run writes the same file; the file is what everybody plays.
 */
import { writeFileSync } from "node:fs";

import { isTooEasy } from "../src/difficulty.ts";
import { seededRandom } from "../src/random.ts";
import { SOLID_KINDS } from "../src/solid/solidGrid.ts";
import { buildSolidMaze, SOLID_ALGORITHMS, solidDifficultyOf, solidRecipeCode } from "../src/solid/solidMaze.ts";
import { MEIKYUU_SOLID_PER_LIST, SOLID_CUTS, SOLID_SIZE_NAMES } from "../src/solid/solidSizes.ts";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string): string => (args.includes(name) ? args[args.indexOf(name) + 1]! : fallback);
const OUT = flag("--out", new URL("../src/levels/solid.data.ts", import.meta.url).pathname);
const POOL = Number(flag("--pool", "1500"));
const COUNT = MEIKYUU_SOLID_PER_LIST;
const started = Date.now();

type Candidate = { code: string; algorithm: string; effort: number; cells: number; exact: number; score: number };

function listFor(kind: (typeof SOLID_KINDS)[number], n: number, base: number): Candidate[] {
  const random = seededRandom(base);
  const pool: Candidate[] = [];
  const seen = new Set<string>();
  while (pool.length < POOL) {
    const algorithm = SOLID_ALGORITHMS[Math.floor(random() * SOLID_ALGORITHMS.length)]!;
    const seed = 1 + Math.floor(random() * 4_000_000_000);
    const maze = buildSolidMaze({ kind, n, algorithm, seed });
    const difficulty = solidDifficultyOf(maze);
    if (isTooEasy(difficulty)) continue;
    // The same maze twice (a different seed that carves the same passages) is one level.
    const same = maze.links.map((open) => [...open].sort((a, b) => a - b).join(",")).join("|") + `@${maze.start}-${maze.goal}`;
    if (seen.has(same)) continue;
    seen.add(same);
    pool.push({ code: solidRecipeCode(maze.recipe), algorithm, effort: difficulty.measure.effort, cells: maze.grid.cells, exact: difficulty.exact, score: difficulty.score });
  }
  pool.sort((a, b) => a.exact - b.exact || (a.code < b.code ? -1 : 1));
  const from = pool[Math.floor(pool.length * 0.03)]!.exact;
  const to = pool[Math.floor(pool.length * 0.97)]!.exact;
  const step = (to - from) / (COUNT - 1);
  const taken = new Uint8Array(pool.length);
  const picked: Candidate[] = [];
  for (let place = 0; place < COUNT; place += 1) {
    const target = from + step * place;
    let best = -1;
    let bestCost = Infinity;
    const recent = picked.slice(-6);
    for (let i = 0; i < pool.length; i += 1) {
      if (taken[i] === 1) continue;
      const c = pool[i]!;
      let cost = Math.abs(c.exact - target) / step;
      if (cost > 12) continue;
      for (const r of recent) if (r.algorithm === c.algorithm) cost += 0.6;
      if (cost < bestCost) {
        bestCost = cost;
        best = i;
      }
    }
    if (best < 0) throw new Error(`the pool ran out at place ${place + 1} of ${COUNT} for ${kind} ${n}`);
    taken[best] = 1;
    picked.push(pool[best]!);
  }
  picked.sort((a, b) => a.exact - b.exact || (a.code < b.code ? -1 : 1));
  const gaps = picked.slice(1).map((c, i) => c.exact - picked[i]!.exact);
  console.log(`  ${kind} ${n}: ${picked[0]!.cells} cells, scores ${picked[0]!.score} to ${picked[COUNT - 1]!.score}, efforts ${picked[0]!.effort} to ${picked[COUNT - 1]!.effort}, biggest step ${Math.max(...gaps).toFixed(2)} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  return picked;
}

const blocks: string[] = [];
let base = 31000;
for (const kind of SOLID_KINDS) {
  const lists: string[] = [];
  for (const [index, size] of SOLID_SIZE_NAMES.entries()) {
    const n = SOLID_CUTS[kind][index]!;
    base += 1;
    const rows = listFor(kind, n, base);
    lists.push(`    ${size}: [\n${rows.map((c) => `      ["${c.code}", ${c.effort}, ${c.cells}, ${c.score}],`).join("\n")}\n    ],`);
  }
  blocks.push(`  ${kind}: {\n${lists.join("\n")}\n  },`);
}
writeFileSync(
  OUT,
  `// THE SOLID LEVELS: ${COUNT} recipes for each of the three sizes of each solid, each list in the order of the difficulty it scores (never easier than the one before), with the effort,\n// the cells and the score (see difficulty.ts). Made by scripts/meikyuu-solid.ts and never edited by hand: a recipe rebuilds its maze exactly, and levels.solid.test.ts rebuilds\n// every one and checks all of it, so a change to a generator, to the graph of a solid or to the stream fails the build.\nexport const MEIKYUU_SOLID_ROWS: Record<string, Record<string, readonly (readonly [string, number, number, number])[]>> = {\n${blocks.join("\n")}\n};\n`,
);
console.log(`wrote ${SOLID_KINDS.length * SOLID_SIZE_NAMES.length * COUNT} solid levels to ${OUT} in ${((Date.now() - started) / 1000).toFixed(0)}s`);
