/**
 * HOW MANY MAZES A SHAPE CAN HAVE AT ALL: `node scripts/levels-trees.ts`. A perfect maze on a grid is a spanning tree of its cells, and the
 * matrix-tree theorem counts them exactly: delete a row and a column of the grid's Laplacian and take the determinant (here with Bareiss's
 * fraction-free elimination on BigInt, so the count is exact). It is the ceiling on how many different mazes a small size can ever give,
 * before the choice of start and goal, which multiplies it again. Prints the Markdown table of docs/LEVELS.md.
 */
import type { MeikyuuShape } from "../src/grid.ts";
import { gridOf } from "../src/shapes.ts";

function treesOf(shape: MeikyuuShape, w: number, h: number): bigint {
  const { neighbours, cells } = gridOf(shape, w, h);
  const n = cells - 1;
  const m: bigint[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? BigInt(neighbours[i]!.length) : neighbours[i]!.includes(j) ? -1n : 0n)));
  let sign = 1n;
  let previous = 1n;
  for (let k = 0; k < n - 1; k += 1) {
    if (m[k]![k] === 0n) {
      const swap = m.findIndex((row, i) => i > k && row[k] !== 0n);
      if (swap < 0) return 0n;
      [m[k], m[swap]] = [m[swap]!, m[k]!];
      sign = -sign;
    }
    for (let i = k + 1; i < n; i += 1) for (let j = k + 1; j < n; j += 1) m[i]![j] = (m[i]![j]! * m[k]![k]! - m[i]![k]! * m[k]![j]!) / previous;
    previous = m[k]![k]!;
  }
  return sign * m[n - 1]![n - 1]!;
}

const grids: readonly [MeikyuuShape, number, number][] = [["square", 3, 3], ["square", 4, 3], ["square", 4, 4], ["square", 5, 4], ["square", 5, 5], ["square", 6, 6], ["square", 7, 7], ["square", 8, 8], ["square", 10, 10], ["hex", 4, 4], ["hex", 6, 6], ["triangle", 8, 4], ["circle", 3, 3], ["circle", 5, 5], ["hexagon", 2, 2], ["hexagon", 4, 4], ["square", 6, 9], ["square", 8, 12], ["square", 10, 15], ["square", 12, 18]];
const lines = ["| Grid | Cells | Different mazes (spanning trees) |", "| --- | ---: | ---: |"];
for (const [shape, w, h] of grids) {
  const trees = treesOf(shape, w, h);
  const text = trees.toString();
  const shown = text.length > 12 ? `${text[0]}.${text.slice(1, 3)} × 10^${text.length - 1}` : trees.toLocaleString("en");
  lines.push(`| ${shape} ${shape === "circle" || shape === "hexagon" ? w : `${w}×${h}`} | ${gridOf(shape, w, h).cells} | ${shown} |`);
}
console.log(lines.join("\n"));
