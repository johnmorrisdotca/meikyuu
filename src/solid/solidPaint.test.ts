import { describe, expect, it } from "vitest";

import { SOLID_KINDS, type SolidKind } from "./solidGrid.ts";
import { buildSolidMaze, solidSolutionOf } from "./solidMaze.ts";
import { drawSolid } from "./solidDraw.ts";
import { paintSolid, shadeAt, shadeOf, type PaintContext, type SolidColours } from "./solidPaint.ts";
import { createFrame, openingTurn, projectFrame, stepTurn } from "./solidView.ts";

const COLOURS: SolidColours = { paper: [251, 248, 241], ground: "rgb(230,227,220)", wall: "#1f2320", trail: "#2e8b57", start: "#2f7a4f", goal: "#e0b43b", hint: "#f2a900", bad: "#b5452c", stone: "#4b5d8f", stoneEdge: "#161c33" };

/** A drawing surface that counts what it is asked to do. */
function recorder(): { ctx: PaintContext; calls: Record<string, number>; styles: Set<string> } {
  const calls: Record<string, number> = {};
  const styles = new Set<string>();
  const count = (name: string) => (): void => {
    calls[name] = (calls[name] ?? 0) + 1;
  };
  const ctx = {
    beginPath: count("beginPath"),
    moveTo: count("moveTo"),
    lineTo: count("lineTo"),
    closePath: count("closePath"),
    fill: count("fill"),
    stroke: count("stroke"),
    arc: count("arc"),
    fillRect: count("fillRect"),
    clearRect: count("clearRect"),
    save: count("save"),
    restore: count("restore"),
    setTransform: count("setTransform"),
    set fillStyle(value: string) {
      styles.add(value);
    },
    get fillStyle() {
      return "";
    },
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "round",
    globalAlpha: 1,
  } as unknown as PaintContext;
  return { ctx, calls, styles };
}

const SIZE: Record<SolidKind, number> = { cube: 10, sphere: 8, tetrahedron: 12, octahedron: 9, icosahedron: 6 };

describe("painting a solid", () => {
  for (const kind of SOLID_KINDS) {
    it(`${kind}: paints the whole picture in a few dozen fills and strokes, however many cells it has`, () => {
      const maze = buildSolidMaze({ kind, n: SIZE[kind], algorithm: "prim", seed: 5 });
      const frame = createFrame(maze.grid);
      projectFrame(frame, maze.grid, stepTurn(openingTurn(maze.grid, maze.start), 0.4, -0.2), 1, 330, 330);
      const way = solidSolutionOf(maze);
      const { ctx, calls } = recorder();
      paintSolid(ctx, maze, frame, COLOURS, { path: way.slice(0, 20), stones: [way[5]!], hint: { back: 2, cells: way.slice(20, 26) }, won: false, wall: 0.12, line: 0.34 });
      expect(maze.grid.cells).toBeGreaterThan(500);
      expect((calls["fill"] ?? 0) + (calls["stroke"] ?? 0)).toBeLessThan(60);
      expect(calls["beginPath"]).toBeGreaterThan(5);
      // The walls are many segments in few paths.
      expect(calls["lineTo"]).toBeGreaterThan(200);
    });
  }

  it("shades a cell facing the viewer as the paper, and the rest darker toward the limb", () => {
    expect(shadeOf([200, 100, 50], 1)).toBe("rgb(200,100,50)");
    expect(shadeOf([200, 100, 50], 0)).toBe("rgb(104,52,26)");
    expect(shadeAt(1)).toBe(1);
    expect(shadeAt(0)).toBe(0);
    expect(shadeAt(-0.4)).toBe(0);
    expect(shadeAt(0.5)).toBeGreaterThan(shadeAt(0.2));
  });

  it("paints a solved line in the colour of a win", () => {
    const maze = buildSolidMaze({ kind: "cube", n: 4, algorithm: "prim", seed: 2 });
    const frame = createFrame(maze.grid);
    projectFrame(frame, maze.grid, openingTurn(maze.grid, maze.start), 1, 300, 300);
    const strokes: string[] = [];
    const { ctx } = recorder();
    Object.defineProperty(ctx, "strokeStyle", { set: (v: string) => strokes.push(v), get: () => "" });
    paintSolid(ctx, maze, frame, COLOURS, { path: solidSolutionOf(maze), stones: [], hint: null, won: true, wall: 0.12, line: 0.34 });
    expect(strokes).toContain(COLOURS.goal);
  });
});

describe("a still picture of a solid as SVG text", () => {
  it("has the cells shaded, the walls that stand, the marks, the words for a screen reader, and the same text every time", () => {
    const maze = buildSolidMaze({ kind: "octahedron", n: 4, algorithm: "kruskal", seed: 6 });
    const svg = drawSolid(maze);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('class="mk-walls"');
    expect(svg).toContain('data-solid="octahedron"');
    expect(svg).toContain('aria-label="Octahedron maze of 128 cells.');
    expect(svg).toContain("color-mix(in srgb, var(--mk-paper)");
    expect(svg).toContain('data-mark="start"');
    expect(drawSolid(maze)).toBe(svg);
    expect(drawSolid(maze, { language: "ja" })).toContain("正八面体の迷宮（128マス）");
  });

  it("draws the line and the solution when asked, and a stone", () => {
    const maze = buildSolidMaze({ kind: "cube", n: 4, algorithm: "prim", seed: 1 });
    const way = solidSolutionOf(maze);
    const svg = drawSolid(maze, { path: way.slice(0, 6), solution: true, stones: [way[2]!], standalone: true, board: "wood" });
    expect(svg).toContain('class="mk-trail"');
    expect(svg).toContain('class="mk-solution"');
    expect(svg).toContain("<style>");
    expect(svg).toContain('data-board="wood"');
    expect(drawSolid(maze)).not.toContain("mk-trail");
  });
});
