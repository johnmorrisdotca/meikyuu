/**
 * THE MEIKYUU ARROW AND MIXED LEVELS, MADE ON A DESK: `node scripts/meikyuu-arrows.ts [--arrows N] [--mixed N]`.
 *
 * The same way the maze levels are made (scripts/meikyuu-levels.ts): a level is a recipe, each is searched
 * for by size and seed until its measured effort is nearest what the list should have there, and the list is
 * sorted by the effort measured, easiest first. Arrow puzzles (`src/levels/arrows.data.ts`) are a picture
 * drawn in arrows, a bigger picture and a longer arrow as the list goes on. The mixed puzzles
 * (`src/levels/mixed.data.ts`) are an arrow puzzle with some arrows locked and a maze to find the
 * unlock button in; they come after the plain ones in the order of play. Seeded, so the same run
 * writes the same files.
 */
import { writeFileSync } from "node:fs";

import { arrowRecipeCode, ARROW_SHAPES, makeArrows, measureArrows, type ArrowRecipe, type ArrowShape } from "../src/arrows.ts";
import { MEIKYUU_ALGORITHMS } from "../src/algorithms.ts";
import { buildMaze, recipeCode, type MazeRecipe } from "../src/maze.ts";
import { measureMaze } from "../src/measure.ts";
import { buildMixed, measureMixed, mixedRecipeCode } from "../src/mixed.ts";
import { seededRandom } from "../src/random.ts";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string): string => (args.includes(name) ? args[args.indexOf(name) + 1]! : fallback);
const ARROWS = Number(flag("--arrows", "300"));
const MIXED = Number(flag("--mixed", "100"));
const here = (name: string): string => new URL(`../src/levels/${name}`, import.meta.url).pathname;

const SHAPE_FROM: Record<ArrowShape, number> = { square: 0, diamond: 22, cross: 30, ring: 40, heart: 50, moon: 62, leaf: 76, star: 90 };

/** The recipe of an arrow puzzle at a scale (about how many cells across the picture is). */
function arrowRecipe(shape: ArrowShape, scale: number, aspect: number, seed: number, locks: number, random: () => number): ArrowRecipe {
  const w = shape === "square" ? Math.max(3, Math.round(scale * (aspect === 1 ? 1.25 : 1))) : Math.max(7, scale);
  const h = shape === "square" ? Math.max(3, Math.round(scale * (aspect === 2 ? 1.25 : 1))) : w;
  // Longer arrows as the picture grows: from two cells to nine.
  const longest = Math.max(2, Math.min(9, 2 + Math.floor(scale / 3) + Math.floor(random() * 2)));
  return { shape, w, h, longest, seed, ...(locks > 0 ? { locks } : {}) };
}

type Found = { recipe: ArrowRecipe; effort: number };

function search(target: number, shape: ArrowShape, index: number, locks: number, hints: Map<string, number>): Found | null {
  const random = seededRandom(900 + index);
  const aspect = Math.floor(random() * 3);
  const key = `${shape}:${aspect}:${locks}`;
  let best: Found | null = null;
  let passed = false;
  let scale = Math.max(3, (hints.get(key) ?? 3) - 2);
  for (; scale < 44 && !passed; scale += 1) {
    for (let seed = 0; seed < 3; seed += 1) {
      const recipe = arrowRecipe(shape, scale, aspect, 1 + seed * 131 + index * 17, locks, random);
      try {
        const effort = measureArrows(makeArrows(recipe)).effort;
        if (effort > target * 1.5) passed = true;
        if (best === null || Math.abs(Math.log(effort / target)) < Math.abs(Math.log(best.effort / target))) best = { recipe, effort };
      } catch {
        // Too few arrows to lock that many: a bigger picture.
      }
    }
  }
  hints.set(key, scale - 1);
  if (best === null) return null;
  const base = best.recipe;
  for (let seed = 0; seed < 40 && Math.abs(Math.log(best.effort / target)) > 0.03; seed += 1) {
    const recipe = { ...base, seed: 5000 + seed * 389 + index * 7 };
    try {
      const effort = measureArrows(makeArrows(recipe)).effort;
      if (Math.abs(Math.log(effort / target)) < Math.abs(Math.log(best.effort / target))) best = { recipe, effort };
    } catch {
      // As above.
    }
  }
  return best;
}

const started = Date.now();
const EFFORT_FIRST = 8;
const EFFORT_LAST = 380;
const targetAt = (i: number, count: number): number => EFFORT_FIRST * (EFFORT_LAST / EFFORT_FIRST) ** (Math.min(1, i / (count - 1)) ** 0.8);

// Plain arrow puzzles.
const plain: Found[] = [];
const seen = new Set<string>();
const hints = new Map<string, number>();
for (let index = 0; index < ARROWS; index += 1) {
  const target = targetAt(index, ARROWS);
  const shapes = ARROW_SHAPES.filter((shape) => SHAPE_FROM[shape] <= target);
  const fresh = shapes.find((shape) => !plain.some((found) => found.recipe.shape === shape));
  const random = seededRandom(300 + index);
  const shape = fresh ?? shapes[Math.floor(random() * (shapes.length + 1)) % shapes.length]!;
  let found = search(target, shape, index, 0, hints);
  if (found === null) found = search(target, "square", index, 0, hints);
  if (found === null) throw new Error(`no arrow puzzle for level ${index + 1}`);
  let code = arrowRecipeCode(found.recipe);
  for (let nudge = 0; seen.has(code) && nudge < 50; nudge += 1) {
    found = { ...found, recipe: { ...found.recipe, seed: found.recipe.seed + 1000003 * (nudge + 1) } };
    found = { ...found, effort: measureArrows(makeArrows(found.recipe)).effort };
    code = arrowRecipeCode(found.recipe);
  }
  seen.add(code);
  plain.push(found);
  if ((index + 1) % 25 === 0) console.log(`arrows ${index + 1}/${ARROWS} target ${target.toFixed(0)} got ${found.effort} ${code} ${((Date.now() - started) / 1000).toFixed(0)}s`);
}
plain.sort((a, b) => a.effort - b.effort);
writeFileSync(
  here("arrows.data.ts"),
  `// THE ARROW LEVELS: ${plain.length} recipes, easiest first, each with the effort it measures (see arrows.ts).\n// Made by scripts/meikyuu-arrows.ts and never edited by hand: levels.arrows.test.ts rebuilds every one.\nexport const MEIKYUU_ARROW_ROWS: readonly (readonly [string, number])[] = [\n${plain.map((found) => `  ["${arrowRecipeCode(found.recipe)}", ${found.effort}],`).join("\n")}\n];\n`,
);

// Mixed puzzles: locked arrows and a maze with the button deep in it.
type Mixed = { code: string; effort: number };
const mixed: Mixed[] = [];
const mixedHints = new Map<string, number>();
const mixedSeen = new Set<string>();
const MIXED_FIRST = 40;
const MIXED_LAST = 700;
for (let index = 0; index < MIXED; index += 1) {
  const target = MIXED_FIRST * (MIXED_LAST / MIXED_FIRST) ** (Math.min(1, index / (MIXED - 1)) ** 0.8);
  const random = seededRandom(5300 + index);
  const shapes = ARROW_SHAPES.filter((shape) => SHAPE_FROM[shape] <= target);
  const shape = shapes[Math.floor(random() * shapes.length)]!;
  const locks = 1 + Math.min(3, Math.floor((index / MIXED) * 4) + (random() < 0.3 ? 1 : 0));
  let arrows = search(target * 0.62, shape, index, locks, mixedHints);
  if (arrows === null) arrows = search(target * 0.62, "square", index, locks, mixedHints);
  if (arrows === null) throw new Error(`no mixed arrows for ${index + 1}`);
  // A maze, played to its goal (the button), whose effort is what the rest of the target is, doubled, as the mixed measure halves it.
  const mazeTarget = target * 0.7;
  const algorithms = MEIKYUU_ALGORITHMS.filter((algorithm) => algorithm !== "eller" && (algorithm !== "backtracker" || target > 200));
  let bestMaze: { recipe: MazeRecipe; effort: number } | null = null;
  for (let scale = 3; scale < 90; scale += 1) {
    for (let seed = 0; seed < 3; seed += 1) {
      const recipe: MazeRecipe = { shape: "square", w: scale, h: scale, algorithm: algorithms[(index + seed) % algorithms.length]!, mode: "to-goal", seed: 1 + seed * 53 + index * 19 };
      const effort = measureMaze(buildMaze(recipe)).effort;
      if (bestMaze === null || Math.abs(Math.log(effort / mazeTarget)) < Math.abs(Math.log(bestMaze.effort / mazeTarget))) bestMaze = { recipe, effort };
    }
    if (bestMaze !== null && bestMaze.effort > mazeTarget * 1.4) break;
  }
  const recipe = { arrows: arrows.recipe, maze: bestMaze!.recipe };
  let code = mixedRecipeCode(recipe);
  for (let nudge = 0; mixedSeen.has(code) && nudge < 50; nudge += 1) {
    code = mixedRecipeCode({ ...recipe, arrows: { ...recipe.arrows, seed: recipe.arrows.seed + 999983 * (nudge + 1) } });
  }
  mixedSeen.add(code);
  const effort = measureMixed(buildMixed({ ...recipe, arrows: { ...recipe.arrows } }));
  mixed.push({ code, effort });
  if ((index + 1) % 25 === 0) console.log(`mixed ${index + 1}/${MIXED} target ${target.toFixed(0)} got ${effort} ${code} ${((Date.now() - started) / 1000).toFixed(0)}s`);
}
mixed.sort((a, b) => a.effort - b.effort);
writeFileSync(
  here("mixed.data.ts"),
  `// THE MIXED LEVELS: ${mixed.length} recipes, easiest first, each with the effort it measures (see mixed.ts).\n// Made by scripts/meikyuu-arrows.ts and never edited by hand: levels.mixed.test.ts rebuilds every one.\nexport const MEIKYUU_MIXED_ROWS: readonly (readonly [string, number])[] = [\n${mixed.map((m) => `  ["${m.code}", ${m.effort}],`).join("\n")}\n];\n`,
);
const count = (items: string[]): string => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(", ");
};
console.log(`arrows ${plain.length} (${plain[0]!.effort} to ${plain[plain.length - 1]!.effort}): ${count(plain.map((p) => p.recipe.shape))}`);
console.log(`mixed ${mixed.length} (${mixed[0]!.effort} to ${mixed[mixed.length - 1]!.effort}) in ${((Date.now() - started) / 1000).toFixed(0)}s`);
void recipeCode;
