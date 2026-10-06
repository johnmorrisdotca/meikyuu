/**
 * THE MEIKYUU MAZE LEVELS, MADE ON A DESK: `node scripts/meikyuu-levels.ts [--out file]`.
 *
 * Four sizes (small, medium, large, huge, as `sizeOf` words them), 256 levels each, in that order, each size in the order of the effort it
 * measures, as the 1.0.0 list was. A level is a recipe (shape, size, algorithm, way to play, seed), never a drawing.
 *
 * It is made FROM the 1.0.0 list (`src/levels/legacy.data.ts`), keeping as many numbers as can be kept:
 *
 * - A level that is good enough keeps its number and its maze. Good enough is `isTooEasy` at its place: the least a level has (the straight
 *   guess must be wrong, and cost something), and, through the easy third of a size, a floor that rises (`easyFloorAt`).
 * - A level that is not is replaced in its own place by a new maze whose effort fits between its neighbours', as near the old one as there
 *   is one (a place must still never be easier to draw than the one before). The first places of Small, which were a 3 by 3, become the
 *   smallest mazes that are mazes, so for a few places the effort stands still.
 * - A size with fewer than 256 is added to at the END, with mazes whose effort carries on up from the last, so no number moves.
 * - A size with more than 256 loses its END: the hardest levels of Large (257 to 285) and of Huge (257 to 267) of 1.0.0 are not in the list.
 *
 * The shapes, ways to play and algorithms of a replaced place arrive by the effort of the place it takes, as they did (`arrivedAt`), and a new
 * maze avoids the shapes and ways to play of the eight places before it. Seeded, so the same run writes the same file; the file is what
 * everybody plays, and this is how it was made, kept so it can be made again. Nothing here runs in a browser. A level once published keeps its
 * number: change this and the numbers move, so a published list is only ever added to at the end (a new file, a new version), never
 * rewritten, except by a release that says so (CHANGELOG.md, 2.0.0).
 *
 * Since 3.0.0 the lists are in the order of the score that counts how much of the map the answer covers: run `pnpm levels:rescore` (scripts/meikyuu-rescore.ts)
 * after this, which scores every level again and puts each list in that order. This writes each list in the order it was chosen in.
 */
import { writeFileSync } from "node:fs";

import type { MeikyuuAlgorithm } from "../src/algorithms.ts";
import { MEIKYUU_SHAPES } from "../src/grid.ts";
import { MEIKYUU_LEGACY_MAZE_ROWS } from "../src/levels/legacy.data.ts";
import { layoutCells, parseRecipe } from "../src/maze.ts";
import { EFFORT_MOST } from "../src/measure.ts";
import { arrivedAt, candidateOf, candidates, SIZE_CELLS, tooEasy, type Candidate, type SizeWord } from "./levels-lib.ts";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string): string => (args.includes(name) ? args[args.indexOf(name) + 1]! : fallback);
const OUT = flag("--out", new URL("../src/levels/mazes.data.ts", import.meta.url).pathname);
const COUNT = 256;
/** No level lays out more cells than the 1.0.0 list's biggest did (a heart cut from a raster 139 across), so `MEIKYUU_MOST_CELLS` is still a little over twice what a level lays out. */
const BIGGEST_LAYOUT = 19_321;
const POOL: Record<SizeWord, number> = { small: 60_000, medium: 30_000, large: 0, huge: 0 };
const SIZES: readonly SizeWord[] = ["small", "medium", "large", "huge"];
const sizeOfCells = (cells: number): SizeWord => (cells < 150 ? "small" : cells < 800 ? "medium" : cells < 4000 ? "large" : "huge");
const WINDING: readonly MeikyuuAlgorithm[] = ["backtracker", "hunt", "growing"];

const legacy: Candidate[] = MEIKYUU_LEGACY_MAZE_ROWS.map(([code], index) => candidateOf(parseRecipe(code)!, index + 1)!);
const started = Date.now();
const rows: string[] = [];
const report: string[] = [];
const allowed = (c: Candidate): boolean => c.effort <= EFFORT_MOST && layoutCells(c.recipe.shape, c.recipe.w, c.recipe.h) <= BIGGEST_LAYOUT;

/** How alike the recent places a maze would sit among are, in the log of the effort it is worth: a shape, a way to play or a size seen lately costs a little. */
function crowd(recent: readonly Candidate[], c: Candidate): number {
  let cost = 0;
  for (const r of recent) {
    if (r.recipe.shape === c.recipe.shape) cost += 0.03;
    if (r.recipe.mode === c.recipe.mode) cost += 0.012;
    if (r.recipe.algorithm === c.recipe.algorithm) cost += 0.008;
    if (r.recipe.w === c.recipe.w && r.recipe.h === c.recipe.h && r.recipe.shape === c.recipe.shape) cost += 0.04;
  }
  return cost;
}

for (const [index, size] of SIZES.entries()) {
  const [low, high] = SIZE_CELLS[size];
  const old = legacy.filter((c) => sizeOfCells(c.cells) === size);
  const taken = new Set(old.map((c) => c.same));
  const pool: Candidate[] = [];
  const stream = candidates(1000 + index, low, high, MEIKYUU_SHAPES);
  while (pool.length < POOL[size]) pool.push(stream.next().value!);
  const fresh = pool.filter((c) => allowed(c) && !taken.has(c.same));

  const forced = new Set<number>();
  const kept = (c: Candidate, place: number): boolean => allowed(c) && !tooEasy(c, place) && !forced.has(place - 1);
  const level: Candidate[] = [];
  let replaced = 0;
  let cutOff = 0;
  for (let i = 0; i < Math.min(old.length, COUNT); i += 1) {
    const place = i + 1;
    const here = old[i]!;
    if (kept(here, place)) {
      level.push(here);
      continue;
    }
    // The first later place that stays: this one's effort may not pass it, unless that one is replaced too, which it is when there is no room.
    const floor = level.length > 0 ? level[level.length - 1]!.effort : 0;
    let best: Candidate | null = null;
    for (let from = i + 1; best === null; from += 1) {
      let ceiling = Infinity;
      let at = -1;
      for (let j = from; j < Math.min(old.length, COUNT); j += 1) {
        if (kept(old[j]!, j + 1)) {
          ceiling = old[j]!.effort;
          at = j;
          break;
        }
      }
      // A shape, a way to play or an algorithm arrives at the effort the place had; if nothing of the kind fits, a little earlier than that.
      for (const slack of [0, 4]) {
        let bestCost = Infinity;
        for (const c of fresh) {
          if (taken.has(c.same) || c.effort < floor || c.effort > ceiling || tooEasy(c, place) || !arrivedAt(c, here.effort + slack)) continue;
          const cost = Math.abs(Math.log(c.effort / Math.max(here.effort, 1))) + crowd(level.slice(-8), c);
          if (cost < bestCost) {
            bestCost = cost;
            best = c;
          }
        }
        if (best !== null) break;
      }
      if (best === null) {
        if (at < 0) throw new Error(`no maze to take place ${place} of ${size} (effort ${here.effort}, from ${floor})`);
        forced.add(at);
        from = at;
      }
    }
    taken.add(best.same);
    level.push(best);
    replaced += 1;
  }
  if (old.length > COUNT) cutOff = old.length - COUNT;

  // Too few: carry on up from the last, at the end, with mazes of rising effort.
  const added = COUNT - level.length;
  if (added > 0) {
    const winding: Candidate[] = [];
    const harder = candidates(5000 + index, Math.round(high * 0.55), high, MEIKYUU_SHAPES, undefined, WINDING);
    const last = level[level.length - 1]!.effort;
    for (let n = 0; winding.length < 12_000 && n < 150_000; n += 1) {
      const c = harder.next().value!;
      if (allowed(c) && c.effort >= last) winding.push(c);
    }
    winding.sort((a, b) => a.effort - b.effort);
    const top = winding[Math.floor(winding.length * 0.985)]!.effort;
    for (let j = 1; j <= added; j += 1) {
      const place = level.length + 1;
      const target = last * (top / last) ** (j / added);
      const floor = level[level.length - 1]!.effort;
      let best: Candidate | null = null;
      let bestCost = Infinity;
      for (const c of winding) {
        if (taken.has(c.same) || c.effort < floor || tooEasy(c, place)) continue;
        const cost = Math.abs(Math.log(c.effort / target)) + crowd(level.slice(-8), c);
        if (cost < bestCost) {
          bestCost = cost;
          best = c;
        }
      }
      if (best === null) throw new Error(`no maze to add at place ${place} of ${size}`);
      taken.add(best.same);
      level.push(best);
    }
  }
  for (let i = 1; i < level.length; i += 1) if (level[i]!.effort < level[i - 1]!.effort) throw new Error(`${size} place ${i + 1} is easier than the one before`);
  report.push(`${size}: ${old.length} were published; ${level.filter((c) => c.old !== undefined).length} stay at their number, ${replaced} places have a new maze (the old one was too easy), ${added} are added at the end, ${cutOff} cut off the end (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  for (const c of level) rows.push(`  ["${c.code}", ${c.effort}, ${c.cells}, ${c.score}],`);
}

writeFileSync(
  OUT,
  `// THE MAZE LEVELS: ${rows.length} recipes, ${COUNT} to each size (small, medium, large, huge, in that order), each size in the order of the effort it measures\n// (never easier to draw than the one before), each with that effort, its cells and its score (see difficulty.ts). Made by scripts/meikyuu-levels.ts and never edited by\n// hand: a recipe rebuilds its maze exactly, and levels.mazes.*.test.ts rebuilds every one and checks all of it, so a change to a generator or to the stream fails the build.\nexport const MEIKYUU_MAZE_ROWS: readonly (readonly [string, number, number, number])[] = [\n${rows.join("\n")}\n];\n`,
);
console.log(report.join("\n"));
console.log(`wrote ${rows.length} levels to ${OUT} in ${((Date.now() - started) / 1000).toFixed(0)}s`);
