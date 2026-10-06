/**
 * THE LEVELS, SCORED AGAIN AND PUT IN ORDER BY THE SCORE: `node scripts/meikyuu-rescore.ts [--check]`.
 *
 * 3.0.0 made the score count how much of the map the answer covers (`coverageOf`, src/coverage.ts), so every level's score moved, and every list
 * is ordered by the score instead of by effort. This reads each list's recipes from `src/levels/*.data.ts`, builds every maze, scores it with
 * `difficultyOf` (`solidDifficultyOf` over a solid), and writes the same recipes back in order: by the unrounded score, then the effort, then the old
 * place, so the same run writes the same file. Which recipes are in a list does not change, only where each one stands and what score it carries.
 *
 * It is a step of its own, after any of the level makers (`meikyuu-levels.ts` and the others write lists in the order they choose by): run it
 * last, and a list is in the order of the score. It never edits a recipe and never adds or removes one. `--check` writes nothing and says whether
 * every file is already as this would write it, which the test suite also holds.
 *
 * The 1.0.0 list kept in `legacy.data.ts` keeps its own order (it is the order the first release numbered them in); only its score column is
 * written again, so it says what the score is now.
 */
import { readFileSync, writeFileSync } from "node:fs";

import { difficultyOf } from "../src/difficulty.ts";
import { MEIKYUU_COLOSSAL_ROWS, MEIKYUU_COLOSSAL_TALL_ROWS } from "../src/levels/colossal.data.ts";
import { MEIKYUU_LEGACY_MAZE_ROWS } from "../src/levels/legacy.data.ts";
import { MEIKYUU_MAZE_ROWS } from "../src/levels/mazes.data.ts";
import { MEIKYUU_SOLID_DICE_ROWS } from "../src/levels/solid-dice.data.ts";
import { MEIKYUU_SOLID_SHAPE_ROWS } from "../src/levels/solid-shapes.data.ts";
import { MEIKYUU_SOLID_ROWS } from "../src/levels/solid.data.ts";
import { MEIKYUU_TALL_ROWS } from "../src/levels/tall.data.ts";
import { buildMaze, parseRecipe } from "../src/maze.ts";
import { buildSolidMaze, parseSolidRecipe, solidDifficultyOf } from "../src/solid/solidMaze.ts";
import { SOLID_GROUP_FILES } from "./solid-groups.ts";

type Row = readonly [string, number, number, number];
type Scored = { row: Row; exact: number; at: number };

const CHECK = process.argv.includes("--check");
const here = (name: string): string => new URL(`../src/levels/${name}`, import.meta.url).pathname;

function scoreOf(code: string, solid: boolean): { exact: number; score: number } {
  if (solid) {
    const recipe = parseSolidRecipe(code);
    if (recipe === null) throw new Error(`${code} is not a solid's recipe`);
    const d = solidDifficultyOf(buildSolidMaze(recipe));
    return { exact: d.exact, score: d.score };
  }
  const recipe = parseRecipe(code);
  if (recipe === null) throw new Error(`${code} is not a recipe`);
  const d = difficultyOf(buildMaze(recipe));
  return { exact: d.exact, score: d.score };
}

/** A list scored again and put in order: the unrounded score, then the effort, then where it stood. */
function ordered(rows: readonly Row[], solid = false): Row[] {
  const scored: Scored[] = rows.map(([code, effort, cells], at) => {
    const { exact, score } = scoreOf(code, solid);
    return { row: [code, effort, cells, score], exact, at };
  });
  scored.sort((a, b) => a.exact - b.exact || a.row[1] - b.row[1] || a.at - b.at);
  return scored.map((s) => s.row);
}

/** A list scored again, left in the order it was in. */
function rescored(rows: readonly Row[]): Row[] {
  return rows.map(([code, effort, cells]) => [code, effort, cells, scoreOf(code, false).score]);
}

const line = (indent: string, [code, effort, cells, score]: Row): string => `${indent}["${code}", ${effort}, ${cells}, ${score}],`;
const block = (indent: string, rows: readonly Row[]): string => rows.map((row) => line(indent, row)).join("\n");

/** The comment lines at the head of a file, which say how it was made. */
function head(name: string): string {
  const lines = readFileSync(here(name), "utf8").split("\n");
  return `${lines.filter((l, i) => l.startsWith("//") && lines.slice(0, i).every((p) => p.startsWith("//"))).join("\n")}\n`;
}

const files: { name: string; text: string }[] = [];

// The square maze list: four sizes in blocks of 256, each a block of its own.
{
  const out: Row[] = [];
  for (let size = 0; size < MEIKYUU_MAZE_ROWS.length / 256; size += 1) out.push(...ordered(MEIKYUU_MAZE_ROWS.slice(size * 256, size * 256 + 256)));
  const h = head("mazes.data.ts").replace("in the order of the effort it measures\n// (never easier to draw than the one before)", "in the order of the score it is given\n// (see difficulty.ts; scripts/meikyuu-rescore.ts puts it in order)");
  files.push({ name: "mazes.data.ts", text: `${h}export const MEIKYUU_MAZE_ROWS: readonly (readonly [string, number, number, number])[] = [\n${block("  ", out)}\n];\n` });
}

// The tall list, six sizes of 256.
{
  const out: Row[] = [];
  for (let size = 0; size < MEIKYUU_TALL_ROWS.length / 256; size += 1) out.push(...ordered(MEIKYUU_TALL_ROWS.slice(size * 256, size * 256 + 256)));
  files.push({ name: "tall.data.ts", text: `${head("tall.data.ts")}export const MEIKYUU_TALL_ROWS: readonly (readonly [string, number, number, number])[] = [\n${block("  ", out)}\n];\n` });
}

// The colossal lists.
{
  const h = head("colossal.data.ts").replace("in the order of the effort it measures\n// (never easier to draw than the one before)", "in the order of the score it is given\n// (see difficulty.ts; scripts/meikyuu-rescore.ts puts it in order)");
  files.push({
    name: "colossal.data.ts",
    text: `${h}export const MEIKYUU_COLOSSAL_ROWS: readonly (readonly [string, number, number, number])[] = [\n${block("  ", ordered(MEIKYUU_COLOSSAL_ROWS))}\n];\nexport const MEIKYUU_COLOSSAL_TALL_ROWS: readonly (readonly [string, number, number, number])[] = [\n${block("  ", ordered(MEIKYUU_COLOSSAL_TALL_ROWS))}\n];\n`,
  });
}

// The solids, in their three files: a solid, then a size.
{
  const sources = { first: MEIKYUU_SOLID_ROWS, dice: MEIKYUU_SOLID_DICE_ROWS, shapes: MEIKYUU_SOLID_SHAPE_ROWS } as const;
  for (const [group, file] of Object.entries(SOLID_GROUP_FILES)) {
    const rows = sources[group as keyof typeof sources] as Record<string, Record<string, readonly Row[]>>;
    const kinds = Object.keys(rows).map((kind) => {
      const sizes = Object.entries(rows[kind]!).map(([size, list]) => `    ${size}: [\n${block("      ", ordered(list, true))}\n    ],`);
      return `  ${/-/.test(kind) ? `"${kind}"` : kind}: {\n${sizes.join("\n")}\n  },`;
    });
    files.push({ name: file.name, text: `${head(file.name)}export const ${file.constant}: Record<string, Record<string, readonly (readonly [string, number, number, number])[]>> = {\n${kinds.join("\n")}\n};\n` });
  }
}

// The 1.0.0 list: its own order, a new score column.
files.push({ name: "legacy.data.ts", text: `${head("legacy.data.ts")}export const MEIKYUU_LEGACY_MAZE_ROWS: readonly (readonly [string, number, number, number])[] = [\n${block("  ", rescored(MEIKYUU_LEGACY_MAZE_ROWS))}\n];\n` });

let stale = 0;
for (const { name, text } of files) {
  const same = readFileSync(here(name), "utf8") === text;
  if (!same) stale += 1;
  console.log(`${name}: ${same ? "already in order" : CHECK ? "would change" : "written"}`);
  if (!CHECK && !same) writeFileSync(here(name), text);
}
if (CHECK && stale > 0) process.exit(1);
