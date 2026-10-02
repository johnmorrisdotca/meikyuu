/**
 * THE FACTS OF THE LISTS, as tables: `node scripts/levels-facts.ts [--capacity]`. It reads what is in the package (and the 1.0.0 list kept in
 * `src/levels/legacy.data.ts`) and prints Markdown, the tables of docs/LEVELS.md. With `--capacity` it also draws fresh mazes to say how many more
 * levels could be published (about three minutes). Nothing here is typed by hand: a number in the docs is one this printed.
 */
import { MEIKYUU_ARROW_LEVELS, MEIKYUU_MAZE_LEVELS, MEIKYUU_MIXED_LEVELS, MEIKYUU_SIZES, bandOf, mazeLevelsOfSize, sizeOf, type MeikyuuMazeLevel, type MeikyuuSize } from "../src/levels.ts";
import { MEIKYUU_TALL_LEVELS, MEIKYUU_TALL_SIZES, tallLevelsOfSize } from "../src/levels-tall.ts";
import { MEIKYUU_LEGACY_MAZE_ROWS } from "../src/levels/legacy.data.ts";
import { difficultyOf } from "../src/difficulty.ts";
import { MEIKYUU_SHAPES } from "../src/grid.ts";
import { buildMaze, MEIKYUU_MODES, parseRecipe, type MazeRecipe } from "../src/maze.ts";
import { MEIKYUU_ALGORITHMS } from "../src/algorithms.ts";
import { candidateOf, candidates, SIZE_CELLS, tooEasy, type SizeWord } from "./levels-lib.ts";

type Row = { number: number; recipe: MazeRecipe; cells: number; effort: number; score: number; decisions: number; traps: number; deadEnds: number; waste: number; depth: number; solution: number };
const rowOf = (level: { number: number; recipe: MazeRecipe; cells: number; effort: number; score: number }): Row => {
  const d = difficultyOf(buildMaze(level.recipe));
  return { number: level.number, recipe: level.recipe, cells: level.cells, effort: level.effort, score: level.score, decisions: d.measure.decisions, traps: d.traps, deadEnds: d.measure.deadEnds, waste: d.waste, depth: d.measure.longestBranch, solution: d.measure.solution };
};
const avg = (rows: readonly Row[], pick: (r: Row) => number): string => (rows.reduce((a, r) => a + pick(r), 0) / Math.max(1, rows.length)).toFixed(1);
const third = <T,>(list: readonly T[], band: 0 | 1 | 2): T[] => list.filter((_, i) => bandOf(i + 1, list.length) === (["easy", "medium", "hard"] as const)[band]);
const BANDS = ["easy", "medium", "hard"] as const;

const legacyAll: Row[] = MEIKYUU_LEGACY_MAZE_ROWS.map(([code, effort, cells, score], i) => rowOf({ number: i + 1, recipe: parseRecipe(code)!, cells, effort, score }));
const legacyBySize = (size: MeikyuuSize): Row[] => legacyAll.filter((r) => sizeOf(r.cells) === size);
const now = new Map<MeikyuuSize, Row[]>(MEIKYUU_SIZES.map((size) => [size, mazeLevelsOfSize(size).map(rowOf)]));
const tall = MEIKYUU_TALL_SIZES.map((s) => tallLevelsOfSize(s.size).map(rowOf));

const out: string[] = [];
const print = (line = ""): void => void out.push(line);

print("### What the package holds");
print();
print("| Kind | Levels | Sizes and bands | On the site today |");
print("| --- | --- | --- | --- |");
print(`| Mazes (\`MEIKYUU_MAZE_LEVELS\`) | ${MEIKYUU_MAZE_LEVELS.length} | 4 sizes of 256: small, medium, large, huge; each size 86 easy, 85 medium, 85 hard | all 1,000 of the 1.0.0 list (217 small, 231 medium, 285 large, 267 huge) |`);
print(`| Tall mazes (\`MEIKYUU_TALL_LEVELS\`) | ${MEIKYUU_TALL_LEVELS.length} | 6 sizes of 256: ${MEIKYUU_TALL_SIZES.map((s) => s.label).join(", ")}; the same bands | not yet |`);
print(`| Arrow puzzles (\`MEIKYUU_ARROW_LEVELS\`) | ${MEIKYUU_ARROW_LEVELS.length} | one list, 8 pictures, in thirds of 100 | no |`);
print(`| Mixed puzzles (\`MEIKYUU_MIXED_LEVELS\`) | ${MEIKYUU_MIXED_LEVELS.length} | one list, in thirds (34, 33, 33) | no |`);
print();

const table = (title: string, rowsBySize: readonly (readonly Row[])[], labels: readonly string[]): void => {
  print(`### ${title}`);
  print();
  print("| Size | Band | Levels | Cells | Effort | Score | Way (cells) | Choices | Wrong turns | Dead ends | Straight guess wastes |");
  print("| --- | --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |");
  rowsBySize.forEach((rows, k) => {
    BANDS.forEach((band, b) => {
      const part = third(rows, b as 0 | 1 | 2);
      if (part.length === 0) return;
      const range = (pick: (r: Row) => number): string => `${Math.min(...part.map(pick))}–${Math.max(...part.map(pick))}`;
      print(`| ${b === 0 ? labels[k] : ""} | ${band} | ${part.length} | ${range((r) => r.cells)} | ${range((r) => r.effort)} | ${range((r) => r.score)} | ${avg(part, (r) => r.solution)} | ${avg(part, (r) => r.decisions)} | ${avg(part, (r) => r.traps)} | ${avg(part, (r) => r.deadEnds)} | ${avg(part, (r) => r.waste)} |`);
    });
  });
  print();
};
// A "band" in the 1.0.0 list is a third of the size's levels, as the site derives it from the counts it knew (217, 231, 285, 267).
table("The mazes, now (1.1: 256 to a size)", MEIKYUU_SIZES.map((s) => now.get(s)!), MEIKYUU_SIZES);
table("The mazes as 1.0.0 had them (thirds of each size's own count)", MEIKYUU_SIZES.map(legacyBySize), MEIKYUU_SIZES.map((s) => `${s} (${legacyBySize(s).length})`));
table("The tall mazes", tall, MEIKYUU_TALL_SIZES.map((s) => s.label));

// Straight-guess failures of the published easy third.
print("### How many of the 1.0.0 levels were too easy");
print();
print("| Size | Levels | Too easy to keep | Of them, the straight guess walks straight to the goal | In the easy third |");
print("| --- | ---: | ---: | ---: | ---: |");
for (const size of MEIKYUU_SIZES) {
  const rows = legacyBySize(size);
  const easy = rows.filter((r) => tooEasy(candidateOf(r.recipe)!));
  const first = new Set(third(rows, 0).map((r) => r.number));
  print(`| ${size} | ${rows.length} | ${easy.length} | ${rows.filter((r) => r.waste === 0).length} | ${easy.filter((r) => first.has(r.number)).length} |`);
}
print();

// Score by level number.
const marks = [1, 5, 10, 20, 40, 60, 86, 128, 171, 214, 256];
print("### Score by level number, before and after");
print();
print(`| Size | ${marks.map((m) => `L${m}`).join(" | ")} |`);
print(`| --- | ${marks.map(() => "---:").join(" | ")} |`);
for (const size of MEIKYUU_SIZES) {
  const before = legacyBySize(size);
  const scale = (m: number): number => Math.min(before.length, Math.max(1, Math.round((m / 256) * before.length)));
  print(`| ${size}, 1.0.0 (level at the same place in its ${before.length}) | ${marks.map((m) => before[scale(m) - 1]!.score).join(" | ")} |`);
  print(`| ${size}, now | ${marks.map((m) => now.get(size)![m - 1]!.score).join(" | ")} |`);
}
print();

// Shapes and ways to play by size.
print("### Shapes, ways to play and algorithms by size (now)");
print();
print(`| Size | ${MEIKYUU_SHAPES.join(" | ")} |`);
print(`| --- | ${MEIKYUU_SHAPES.map(() => "---:").join(" | ")} |`);
for (const size of MEIKYUU_SIZES) print(`| ${size} | ${MEIKYUU_SHAPES.map((shape) => now.get(size)!.filter((r) => r.recipe.shape === shape).length).join(" | ")} |`);
print();
print(`| Size | ${MEIKYUU_MODES.join(" | ")} | ${MEIKYUU_ALGORITHMS.join(" | ")} |`);
print(`| --- | ${[...MEIKYUU_MODES, ...MEIKYUU_ALGORITHMS].map(() => "---:").join(" | ")} |`);
for (const size of MEIKYUU_SIZES) print(`| ${size} | ${MEIKYUU_MODES.map((mode) => now.get(size)!.filter((r) => r.recipe.mode === mode).length).join(" | ")} | ${MEIKYUU_ALGORITHMS.map((a) => now.get(size)!.filter((r) => r.recipe.algorithm === a).length).join(" | ")} |`);
print();

// Arrow and mixed lists, by picture.
const pictures = new Map<string, number>();
for (const level of MEIKYUU_ARROW_LEVELS) pictures.set(level.recipe.shape, (pictures.get(level.recipe.shape) ?? 0) + 1);
print("### Arrow puzzles by picture");
print();
print(`| ${[...pictures.keys()].join(" | ")} |`);
print(`| ${[...pictures.keys()].map(() => "---:").join(" | ")} |`);
print(`| ${[...pictures.values()].join(" | ")} |`);
print();

if (process.argv.includes("--capacity")) {
  print("### How many more could be published");
  print();
  const DRAWS: Record<SizeWord, number> = { small: 100_000, medium: 50_000, large: 20_000, huge: 5_000 };
  print("| Size | Drawn | Seconds | ms a maze | Hard enough (not too easy) | Distinct | Easy-band scores | Medium-band | Hard-band |");
  print("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const [index, size] of MEIKYUU_SIZES.entries()) {
    const [low, high] = SIZE_CELLS[size];
    const started = Date.now();
    const stream = candidates(900_000 + index, low, high, MEIKYUU_SHAPES);
    const seen = new Set<string>(now.get(size)!.map((r) => r.recipe.shape + r.number)); // placeholder so the type is a set
    seen.clear();
    const published = new Set(mazeLevelsOfSize(size).map((l: MeikyuuMazeLevel) => l.code));
    const levels = mazeLevelsOfSize(size);
    const cut = (b: 0 | 1 | 2): [number, number] => {
      const part = third(levels, b);
      return [part[0]!.score, part[part.length - 1]!.score];
    };
    const edges = [cut(0), cut(1), cut(2)];
    const counts = [0, 0, 0];
    let fit = 0;
    for (let i = 0; i < DRAWS[size]; i += 1) {
      const c = stream.next().value!;
      if (tooEasy(c) || published.has(c.code) || seen.has(c.same)) continue;
      seen.add(c.same);
      fit += 1;
      const at = c.score <= edges[0]![1] ? 0 : c.score <= edges[1]![1] ? 1 : 2;
      counts[at] = counts[at]! + 1;
    }
    const seconds = (Date.now() - started) / 1000;
    print(`| ${size} | ${DRAWS[size].toLocaleString("en")} | ${seconds.toFixed(0)} | ${((seconds * 1000) / DRAWS[size]).toFixed(1)} | ${fit.toLocaleString("en")} | ${seen.size.toLocaleString("en")} | ${counts[0]!.toLocaleString("en")} | ${counts[1]!.toLocaleString("en")} | ${counts[2]!.toLocaleString("en")} |`);
  }
  print();
}

console.log(out.join("\n"));
