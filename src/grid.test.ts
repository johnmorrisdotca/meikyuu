import { describe, expect, it } from "vitest";

import { boundaryCells, centreCell, MEIKYUU_SHAPES } from "./grid.ts";
import { gridOf, ringCounts } from "./shapes.ts";

/** A size that makes each shape a handful of cells wide, the same for every test below. */
const SIZES: Record<(typeof MEIKYUU_SHAPES)[number], [number, number]> = {
  square: [7, 5],
  hex: [7, 6],
  triangle: [9, 5],
  circle: [6, 6],
  heart: [25, 25],
  leaf: [25, 25],
  star: [31, 31],
  ring: [21, 21],
  diamond: [15, 15],
  cross: [15, 15],
  moon: [21, 21],
  hexagon: [4, 4],
  pyramid: [6, 6],
};

describe("every shape is a sound cell graph", () => {
  for (const shape of MEIKYUU_SHAPES) {
    const [w, h] = SIZES[shape];
    const grid = gridOf(shape, w, h);

    it(`${shape}: neighbours are mutual and distinct, and every neighbour has a side`, () => {
      expect(grid.cells).toBeGreaterThan(10);
      expect(grid.centres.length).toBe(grid.cells);
      for (let cell = 0; cell < grid.cells; cell += 1) {
        expect(new Set(grid.neighbours[cell]).size).toBe(grid.neighbours[cell]!.length);
        for (const next of grid.neighbours[cell]!) {
          expect(next).not.toBe(cell);
          expect(grid.neighbours[next]).toContain(cell);
        }
        expect(grid.sides[cell]!.filter((side) => side.to >= 0).length).toBe(grid.neighbours[cell]!.length);
      }
    });

    it(`${shape}: every cell can be reached from every other, and a point at a cell's middle finds that cell`, () => {
      const seen = new Set([0]);
      const stack = [0];
      while (stack.length > 0) {
        for (const next of grid.neighbours[stack.pop()!]!) {
          if (seen.has(next)) continue;
          seen.add(next);
          stack.push(next);
        }
      }
      expect(seen.size).toBe(grid.cells);
      for (let cell = 0; cell < grid.cells; cell += 1) expect(grid.at(grid.centres[cell]![0], grid.centres[cell]![1])).toBe(cell);
      expect(grid.at(grid.box.x - 5, grid.box.y - 5)).toBe(-1);
    });

    it(`${shape}: the box holds every cell's middle, and a door can be made somewhere`, () => {
      const { box } = grid;
      for (const [x, y] of grid.centres) {
        expect(x).toBeGreaterThanOrEqual(box.x - 1e-6);
        expect(x).toBeLessThanOrEqual(box.x + box.w + 1e-6);
        expect(y).toBeGreaterThanOrEqual(box.y - 1e-6);
        expect(y).toBeLessThanOrEqual(box.y + box.h + 1e-6);
      }
      expect(boundaryCells(grid).length).toBeGreaterThan(3);
      expect(centreCell(grid)).toBeGreaterThanOrEqual(0);
    });
  }

  it("the wall between two cells is the same line from either side", () => {
    for (const shape of ["square", "hex", "triangle", "circle"] as const) {
      const grid = gridOf(shape, ...SIZES[shape]);
      const mid = (side: { wall: { a: readonly [number, number]; b: readonly [number, number] } }): [number, number] => [side.wall.a[0] + side.wall.b[0], side.wall.a[1] + side.wall.b[1]];
      for (let cell = 0; cell < grid.cells; cell += 1) {
        for (const side of grid.sides[cell]!) {
          if (side.to < 0) continue;
          const [x, y] = mid(side);
          const back = grid.sides[side.to]!.find((other) => other.to === cell && Math.abs(mid(other)[0] - x) < 1e-6 && Math.abs(mid(other)[1] - y) < 1e-6);
          expect(back, `${shape} cell ${cell} to ${side.to}`).toBeDefined();
        }
      }
    }
  });
});

describe("the shapes' own arithmetic", () => {
  it("counts the cells of a square, a hexagon board and a pyramid", () => {
    expect(gridOf("square", 7, 5).cells).toBe(35);
    // A hexagon of radius r has 3r(r+1)+1 cells.
    expect(gridOf("hexagon", 4, 4).cells).toBe(61);
    expect(gridOf("hexagon", 6, 6).cells).toBe(127);
    // A pyramid of n rows of triangles has n² cells.
    expect(gridOf("pyramid", 6, 6).cells).toBe(36);
    expect(gridOf("pyramid", 7, 7).cells).toBe(49);
  });

  it("makes the rings of a circle: one in the middle, six round it, and a ring doubles when its cells would be wider than tall", () => {
    expect(ringCounts(6)).toEqual([1, 6, 12, 24, 24, 24]);
    expect(ringCounts(8).slice(0, 8)).toEqual([1, 6, 12, 24, 24, 24, 48, 48]);
  });

  it("keeps a heart one piece, about as wide as tall, with its point at the bottom", () => {
    const heart = gridOf("heart", 25, 25);
    expect(heart.box.w / heart.box.h).toBeGreaterThan(0.85);
    expect(heart.box.w / heart.box.h).toBeLessThan(1.25);
    const lowest = Math.max(...heart.centres.map(([, y]) => y));
    expect(heart.centres.filter(([, y]) => y === lowest).length).toBeLessThanOrEqual(3);
  });
});
