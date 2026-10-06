/**
 * THE MEIKYUU SOLID LEVELS, MADE ON A DESK. Two steps, so that the lists can be made side by side on several processes:
 *
 *   node --experimental-strip-types scripts/meikyuu-solid.ts --kind cube [--size colossal] [--force] [--cache dir] [--pool n] [--elite n]   makes the lists of one solid that are not yet in the data (--size one size, --force even if it is)
 *   node --experimental-strip-types scripts/meikyuu-solid.ts --write [--cache dir]                              writes the three data files from the data already there and the lists made
 *
 * Sixty-four levels for each of five sizes (small, medium, large, huge, colossal) of each of the eighteen solids. Each list is a ramp of the difficulty `solidDifficultyOf` scores, one
 * step to a place, from the 3rd percentile of a pool of mazes that are not too easy to the very hardest of it, each place taking the maze nearest its step and avoiding the algorithms
 * the places just before it had. The pool is random recipes of every algorithm, with an elite of the long winding algorithms (the backtracker, Wilson's, Kruskal's) drawn in
 * numbers beside it, because the hardest mazes of a size are of those, and the top of a list is the hardest there is: where a size is big enough, 90 and over on the scale of the
 * flat lists. A level is a recipe, never a drawing. Seeded, so the same run writes the same file; the file is what everybody plays.
 *
 * A list that is already in the data is kept as it is (the lists of the first five solids at the first three sizes were made before the others): only the missing ones are made, and `--force` remakes the one asked for.
 *
 * Since 3.0.0 the lists are in the order of the score that counts how much of the map the answer covers: run `pnpm levels:rescore` (scripts/meikyuu-rescore.ts) after this, which scores every
 * level again and puts each list in that order. This writes each list in the order it was chosen in, which is the order of the score as it was then.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { isTooEasy } from "../src/difficulty.ts";
import { seededRandom } from "../src/random.ts";
import { SOLID_KINDS, type SolidKind } from "../src/solid/solidGrid.ts";
import { buildSolidMaze, SOLID_ALGORITHMS, solidDifficultyOf, solidRecipeCode } from "../src/solid/solidMaze.ts";
import { MEIKYUU_SOLID_PER_LIST, SOLID_CUTS, SOLID_SIZE_NAMES } from "../src/solid/solidSizes.ts";
import { SOLID_GROUPS, SOLID_GROUP_FILES } from "./solid-groups.ts";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string): string => (args.includes(name) ? args[args.indexOf(name) + 1]! : fallback);
const CACHE = flag("--cache", new URL("../node_modules/.cache/meikyuu-solid", import.meta.url).pathname);
const POOL = Number(flag("--pool", "1500"));
const ELITE = Number(flag("--elite", "1500"));
const COUNT = MEIKYUU_SOLID_PER_LIST;
const started = Date.now();

type Row = readonly [string, number, number, number];
type Candidate = { code: string; algorithm: string; effort: number; cells: number; exact: number; score: number };
const WINDING = ["backtracker", "wilson", "kruskal"] as const;

async function existing(): Promise<Record<string, Record<string, readonly Row[]>>> {
  const out: Record<string, Record<string, readonly Row[]>> = {};
  for (const file of Object.values(SOLID_GROUP_FILES)) {
    const path = new URL(`../src/levels/${file.name}`, import.meta.url);
    if (!existsSync(path)) continue;
    const module = (await import(path.href)) as Record<string, Record<string, Record<string, readonly Row[]>>>;
    for (const [kind, sizes] of Object.entries(module[file.constant] ?? {})) out[kind] = { ...(out[kind] ?? {}), ...sizes };
  }
  return out;
}

/** The recipes of a pool: `count` mazes of the algorithms given, not too easy, never the same recipe twice. */
function draw(kind: SolidKind, n: number, random: () => number, count: number, algorithms: readonly string[], seen: Set<string>): Candidate[] {
  const pool: Candidate[] = [];
  while (pool.length < count) {
    const algorithm = algorithms[Math.floor(random() * algorithms.length)]!;
    const seed = 1 + Math.floor(random() * 4_000_000_000);
    const maze = buildSolidMaze({ kind, n, algorithm: algorithm as never, seed });
    const difficulty = solidDifficultyOf(maze);
    if (isTooEasy(difficulty)) continue;
    // The same maze twice (a different seed that carves the same passages) is one level: told by the passages, for a solid small enough that it is cheap to.
    if (maze.grid.cells <= 1500) {
      const same = maze.links.map((open) => [...open].sort((a, b) => a - b).join(",")).join("|") + `@${maze.start}-${maze.goal}`;
      if (seen.has(same)) continue;
      seen.add(same);
    }
    pool.push({ code: solidRecipeCode(maze.recipe), algorithm, effort: difficulty.measure.effort, cells: maze.grid.cells, exact: difficulty.exact, score: difficulty.score });
  }
  return pool;
}

function listFor(kind: SolidKind, n: number, base: number): Candidate[] {
  const random = seededRandom(base);
  const seen = new Set<string>();
  const pool = [...draw(kind, n, random, POOL, SOLID_ALGORITHMS, seen), ...draw(kind, n, random, ELITE, WINDING, seen)];
  pool.sort((a, b) => a.exact - b.exact || (a.code < b.code ? -1 : 1));
  const from = pool[Math.floor(pool.length * 0.03)]!.exact;
  const to = pool[pool.length - 1]!.exact;
  const step = (to - from) / (COUNT - 1);
  const taken = new Uint8Array(pool.length);
  const picked: Candidate[] = [];
  // From the top down, so that the hardest places are filled by the hardest mazes of the pool and are never short of one.
  for (let place = COUNT - 1; place >= 0; place -= 1) {
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

const rowOf = (c: Candidate): Row => [c.code, c.effort, c.cells, c.score];

if (args.includes("--write")) {
  const have = await existing();
  mkdirSync(CACHE, { recursive: true });
  const made: Record<string, Record<string, readonly Row[]>> = {};
  for (const file of readdirSync(CACHE).filter((f) => f.endsWith(".json"))) made[file.replace(/\.json$/, "")] = JSON.parse(readFileSync(join(CACHE, file), "utf8")) as Record<string, readonly Row[]>;
  let total = 0;
  for (const [group, file] of Object.entries(SOLID_GROUP_FILES)) {
    const blocks: string[] = [];
    for (const kind of SOLID_GROUPS[group as keyof typeof SOLID_GROUPS]) {
      const lists: string[] = [];
      for (const size of SOLID_SIZE_NAMES) {
        const rows = made[kind]?.[size] ?? have[kind]?.[size];
        if (rows === undefined) throw new Error(`no list for ${kind} ${size}: make it with --kind ${kind}`);
        total += rows.length;
        lists.push(`    ${size}: [\n${rows.map(([code, effort, cells, score]) => `      ["${code}", ${effort}, ${cells}, ${score}],`).join("\n")}\n    ],`);
      }
      blocks.push(`  ${/-/.test(kind) ? `"${kind}"` : kind}: {\n${lists.join("\n")}\n  },`);
    }
    writeFileSync(
      new URL(`../src/levels/${file.name}`, import.meta.url),
      `// THE SOLID LEVELS OF ${file.title}: ${COUNT} recipes for each of the ${SOLID_SIZE_NAMES.length} sizes of each solid (${SOLID_SIZE_NAMES.join(", ")}), each list in the order of the difficulty it scores (never easier than the one before), with the effort,\n// the cells and the score (see difficulty.ts). Made by scripts/meikyuu-solid.ts and never edited by hand: a recipe rebuilds its maze exactly, and levels.solid.test.ts rebuilds\n// every one and checks all of it, so a change to a generator, to the graph of a solid or to the stream fails the build.\nexport const ${file.constant}: Record<string, Record<string, readonly (readonly [string, number, number, number])[]>> = {\n${blocks.join("\n")}\n};\n`,
    );
  }
  // The same recipes with nothing else, for a server that has only to say which recipe is which level: one text a list, "<cut>:<algorithm letter><seed in base 36>,...".
  const letters: Record<string, string> = { backtracker: "b", hunt: "h", growing: "g", prim: "p", kruskal: "k", wilson: "w" };
  const lists: string[] = [];
  for (const [group, file] of Object.entries(SOLID_GROUP_FILES)) {
    const module = (await import(new URL(`../src/levels/${file.name}`, import.meta.url).href)) as Record<string, Record<string, Record<string, readonly Row[]>>>;
    for (const kind of SOLID_GROUPS[group as keyof typeof SOLID_GROUPS]) {
      const sizes = SOLID_SIZE_NAMES.map((size) => {
        const rows = module[file.constant]![kind]![size]!;
        const cut = rows[0]![0].split(":")[1]!;
        return `${size}: "${cut}:${rows.map(([code]) => { const [, , algorithm, seed] = code.split(":"); return `${letters[algorithm!]!}${Number(seed).toString(36)}`; }).join(",")}"`;
      });
      lists.push(`  ${/-/.test(kind) ? `"${kind}"` : kind}: { ${sizes.join(", ")} },`);
    }
  }
  writeFileSync(
    new URL("../src/levels/solid-recipes.data.ts", import.meta.url),
    `// THE RECIPES OF THE SOLID LEVELS AND NOTHING ELSE: for each solid and size, the cut and the ${COUNT} levels in order as the algorithm's first letter (b, h, g, p, k, w) and the seed in base 36, which is all a server needs to say which\n// recipe is which level. Made by scripts/meikyuu-solid.ts --write from the data files beside it and never edited by hand; levels-solid-recipes.test.ts holds it to them.\nexport const MEIKYUU_SOLID_RECIPE_TEXT: Record<string, Record<string, string>> = {\n${lists.join("\n")}\n};\n`,
  );
  console.log(`wrote ${total} solid levels in ${((Date.now() - started) / 1000).toFixed(0)}s`);
} else {
  const kind = flag("--kind", "") as SolidKind;
  if (!(SOLID_KINDS as readonly string[]).includes(kind)) throw new Error(`--kind is one of ${SOLID_KINDS.join(", ")}`);
  const have = await existing();
  mkdirSync(CACHE, { recursive: true });
  const rows: Record<string, readonly Row[]> = {};
  for (const [index, size] of SOLID_SIZE_NAMES.entries()) {
    if ((flag("--size", size) !== size) || (have[kind]?.[size] !== undefined && !args.includes("--force"))) continue;
    rows[size] = listFor(kind, SOLID_CUTS[kind][index]!, 31000 + 1000 * SOLID_KINDS.indexOf(kind) + index).map(rowOf);
  }
  writeFileSync(join(CACHE, `${kind}.json`), JSON.stringify(rows));
  console.log(`${kind}: made ${Object.keys(rows).join(", ") || "nothing"} in ${((Date.now() - started) / 1000).toFixed(0)}s`);
}
