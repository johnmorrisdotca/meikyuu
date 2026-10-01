import { describe, expect, it } from "vitest";

import { MEIKYUU_BOARD_NAMES, MEIKYUU_BOARDS } from "./boards.ts";
import { drawMaze, lookAttributes } from "./draw.ts";
import { drawArrows } from "./drawArrows.ts";
import { standingWalls, linePath } from "./geometry.ts";
import { makeArrows } from "./arrows.ts";
import { MEIKYUU_SHAPES } from "./grid.ts";
import { buildMaze, solutionOf, type MazeRecipe } from "./maze.ts";
import { MEIKYUU_STYLE } from "./style.ts";

const recipe: MazeRecipe = { shape: "square", w: 8, h: 6, algorithm: "wilson", mode: "enter-leave", seed: 9 };
const maze = buildMaze(recipe);

describe("a maze drawn as SVG text", () => {
  it("is one svg, with a wall path, a start, a goal and the two doors, and a label that says how to play", () => {
    const svg = drawMaze(maze);
    expect(svg.startsWith("<svg ")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect((svg.match(/<svg /g) ?? []).length).toBe(1);
    expect(svg).toContain('class="mk-walls"');
    expect(svg).toContain('data-mark="start"');
    expect(svg).toContain('data-mark="goal"');
    expect(svg).toContain('data-door="in"');
    expect(svg).toContain('data-door="out"');
    expect(svg).toContain(`data-cells="${maze.grid.cells}"`);
    expect(svg).toMatch(/aria-label="Square maze of 48 cells\. Draw a line from the way in to the way out\."/);
    expect(drawMaze(maze, { language: "ja" })).toContain("四角の迷宮（48マス）");
  });

  it("draws every wall that stands, and none where a passage or a door is: closed walls = all sides less the passages and the two doors", () => {
    const sides = maze.grid.sides.reduce((sum, row) => sum + row.length, 0);
    const outer = maze.grid.sides.reduce((sum, row) => sum + row.filter((side) => side.to < 0).length, 0);
    const inner = (sides - outer) / 2;
    const passages = maze.links.reduce((sum, open) => sum + open.length, 0) / 2;
    expect(standingWalls(maze).length).toBe(inner - passages + outer - 2);
    const doorless = buildMaze({ ...recipe, mode: "to-goal" });
    expect(standingWalls(doorless).length).toBe(inner - passages + outer);
  });

  it("shows the line, the solution, the hint and a picked-up key only when asked", () => {
    const way = solutionOf(maze);
    const plain = drawMaze(maze);
    expect(plain).not.toContain("mk-trail");
    expect(plain).not.toContain("mk-solution");
    const drawn = drawMaze(maze, { path: way.slice(0, 5), solution: true, hint: { cells: way.slice(5, 9) }, won: true });
    expect(drawn).toContain(`d="${linePath(maze.grid, way.slice(0, 5))}"`);
    expect(drawn).toContain("mk-solution");
    expect(drawn).toContain('class="mk-hint"');
    expect(drawn).toContain('data-won="true"');
    const keyed = buildMaze({ ...recipe, mode: "keys", keys: 2, w: 12, h: 12 });
    expect((drawMaze(keyed).match(/data-mark="key"/g) ?? []).length).toBe(2);
    expect(drawMaze(keyed, { collected: [keyed.keys[0]!] })).toContain('data-got="true"');
  });

  it("draws every shape, with its walls as lines or arcs", () => {
    for (const shape of MEIKYUU_SHAPES) {
      const made = buildMaze({ shape, w: shape === "square" || shape === "hex" || shape === "triangle" ? 9 : shape === "circle" ? 5 : shape === "hexagon" ? 3 : shape === "pyramid" ? 6 : 17, h: shape === "triangle" ? 5 : 9, algorithm: "prim", mode: "to-goal", seed: 2 });
      const svg = drawMaze(made);
      expect(svg, shape).toContain("<path");
      expect(svg, shape).not.toContain("NaN");
      expect(svg, shape).not.toContain("undefined");
      if (shape === "circle") expect(svg).toMatch(/A\d+(\.\d+)? \d+(\.\d+)? 0 0 1/);
    }
  });

  it("is a picture on its own with `standalone`, and the style is the package's", () => {
    expect(drawMaze(maze, { standalone: true })).toContain("<style>");
    expect(drawMaze(maze)).not.toContain("<style>");
    expect(MEIKYUU_STYLE).toContain("user-select: none");
    expect(MEIKYUU_STYLE).toContain("prefers-reduced-motion");
    expect(MEIKYUU_STYLE).toContain("prefers-color-scheme: dark");
  });

  it("wears a board and a line colour by custom properties, and paper wears none", () => {
    expect(lookAttributes({})).toBe('class="meikyuu" data-board="paper"');
    for (const name of MEIKYUU_BOARD_NAMES) expect(lookAttributes({ board: name })).toContain(`data-board="${name}"`);
    expect(lookAttributes({ board: "wood" })).toContain(`--mk-paper:${MEIKYUU_BOARDS.wood.paper}`);
    expect(lookAttributes({ trail: "blue" })).toContain('data-trail="blue"');
    expect(lookAttributes({ board: "green", trail: "#abcdef" })).toContain("--mk-trail:#abcdef");
    expect(drawMaze(maze, { board: "black" })).toContain('fill="#2f3236"');
  });
});

describe("an arrow board drawn as SVG text", () => {
  const board = makeArrows({ shape: "heart", w: 14, h: 14, longest: 5, seed: 3, locks: 2 });

  it("has a group for each arrow, with its direction and whether it is locked, and a dot for each cell of the picture", () => {
    const svg = drawArrows(board);
    expect((svg.match(/class="mk-arrow"/g) ?? []).length).toBe(board.arrows.length);
    expect((svg.match(/data-locked="true"/g) ?? []).length).toBe(2);
    expect((svg.match(/class="mk-dot"/g) ?? []).length).toBe(board.inShape.filter(Boolean).length);
    expect(svg).toContain("mk-lock");
    expect(svg).not.toContain("NaN");
  });

  it("leaves out an arrow that has gone, and shows no lock once they are unlocked", () => {
    const gone = board.arrows.map((_, id) => id !== 0);
    expect((drawArrows(board, { present: gone }).match(/class="mk-arrow"/g) ?? []).length).toBe(board.arrows.length - 1);
    expect(drawArrows(board, { unlocked: true })).not.toContain('data-locked="true"');
    expect(drawArrows(board, { hint: 1 })).toContain('data-hint="true"');
  });
});
