import { describe, expect, it } from "vitest";

import { SOLID_KINDS, solidCells, solidGridOf, type SolidGrid, type SolidKind } from "./solidGrid.ts";
import { cross, dot, length, sub } from "./vec.ts";

const SIZES: Record<SolidKind, readonly number[]> = { cube: [2, 3, 5], sphere: [2, 3, 5], tetrahedron: [2, 3, 5], octahedron: [2, 3, 5], icosahedron: [2, 3, 4] };

describe("the surface of a solid as a cell graph", () => {
  for (const kind of SOLID_KINDS) {
    for (const n of SIZES[kind]) {
      const grid = solidGridOf(kind, n);

      it(`${kind} cut ${n} ways has ${solidCells(kind, n)} cells`, () => {
        expect(grid.cells).toBe(solidCells(kind, n));
        expect(grid.neighbours).toHaveLength(grid.cells);
        expect(grid.centres).toHaveLength(grid.cells);
      });

      it(`${kind} ${n}: every side has a cell across it, and that cell has this one across a side of its own`, () => {
        for (let cell = 0; cell < grid.cells; cell += 1) {
          expect(grid.neighbours[cell]).toHaveLength(grid.corners[cell]!.length);
          for (const next of grid.neighbours[cell]!) {
            expect(next).not.toBe(cell);
            expect(grid.neighbours[next]).toContain(cell);
          }
          // No two sides lead to the same cell.
          expect(new Set(grid.neighbours[cell]).size).toBe(grid.neighbours[cell]!.length);
        }
      });

      it(`${kind} ${n}: it is a closed surface (Euler's V - E + F = 2) and every edge has two cells`, () => {
        expect(grid.vertices.length - grid.edges.length + grid.cells).toBe(2);
        for (const edge of grid.edges) expect(edge.left).not.toBe(edge.right);
        const uses = new Int32Array(grid.edges.length);
        for (const row of grid.sideEdge) for (const id of row) uses[id] = (uses[id] ?? 0) + 1;
        expect([...uses].every((count) => count === 2)).toBe(true);
      });

      it(`${kind} ${n}: each cell faces outward, counter-clockwise seen from outside`, () => {
        for (let cell = 0; cell < grid.cells; cell += 1) {
          const corners = grid.corners[cell]!.map((v) => grid.vertices[v]!);
          const normal = cross(sub(corners[1]!, corners[0]!), sub(corners[2]!, corners[1]!));
          expect(dot(normal, grid.centres[cell]!)).toBeGreaterThan(0);
          expect(dot(grid.normals[cell]!, grid.centres[cell]!)).toBeGreaterThan(0);
          expect(length(grid.normals[cell]!)).toBeCloseTo(1, 9);
        }
      });
    }
  }

  it("a cube's cells have four neighbours, a globe's have five (twelve of them) or six, and the triangle solids' have three", () => {
    const degrees = (grid: SolidGrid): Map<number, number> => {
      const out = new Map<number, number>();
      for (const row of grid.neighbours) out.set(row.length, (out.get(row.length) ?? 0) + 1);
      return out;
    };
    expect([...degrees(solidGridOf("cube", 4))]).toEqual([[4, 96]]);
    expect(degrees(solidGridOf("sphere", 3))).toEqual(new Map([[5, 12], [6, 80]]));
    for (const kind of ["tetrahedron", "octahedron", "icosahedron"] as const) expect([...degrees(solidGridOf(kind, 3))]).toEqual([[3, solidCells(kind, 3)]]);
  });

  it("a cube's cells are joined across its edges: a cell on the top face's rim has the cell of the next face as a neighbour", () => {
    const grid = solidGridOf("cube", 3);
    const faces = new Set<number>();
    for (let cell = 0; cell < grid.cells; cell += 1) for (const next of grid.neighbours[cell]!) if (grid.faceOf[next] !== grid.faceOf[cell]) faces.add(grid.faceOf[cell]! * 10 + grid.faceOf[next]!);
    // Four faces round each face, and none across it.
    expect(faces.size).toBe(6 * 4);
    for (let face = 0; face < 6; face += 1) expect(faces.has(face * 10 + (face ^ 1))).toBe(false);
  });

  it("the cells of a flat solid are flat, and of equal size on a face", () => {
    const grid = solidGridOf("cube", 4);
    for (let cell = 0; cell < grid.cells; cell += 1) expect(grid.radii[cell]).toBeCloseTo(1 / 4, 9);
  });

  it("is the same graph every time, down to the order of the sides", () => {
    for (const kind of SOLID_KINDS) expect(solidGridOf(kind, 3).neighbours).toEqual(solidGridOf(kind, 3).neighbours);
  });

  it("refuses a solid cut fewer than two ways", () => {
    expect(() => solidGridOf("cube", 1)).toThrow();
    expect(() => solidGridOf("cube", 2.5)).toThrow();
  });
});
