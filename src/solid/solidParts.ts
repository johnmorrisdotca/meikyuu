import type { SolidGrid, SolidKind } from "./solidGrid.ts";
import { add, cross, dot, length, mean, scale, sub, unit, type Vec3 } from "./vec.ts";

/**
 * THE JOINING UP OF A SOLID: the polygons of a surface, as loops of corner numbers, made into a cell graph (`assemble`), and the lattice of a triangular face cut into
 * small triangles (`latticeOf`, `trianglesOf`). Every solid is built by something that makes its `Parts`, and this makes the graph of them, the same way for all.
 */
/** A polygon as the numbers of its corners, in order round it. */
export type Loop = number[];

/** A loop of corners turned, if need be, to run counter-clockwise seen from outside the solid (which is round the origin). */
export function outward(loop: Loop, vertices: readonly Vec3[]): Loop {
  // Newell's normal of the polygon, against the direction from the middle of the solid to the polygon.
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < loop.length; i += 1) {
    const a = vertices[loop[i]!]!;
    const b = vertices[loop[(i + 1) % loop.length]!]!;
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const centre = mean(loop.map((v) => vertices[v]!));
  return dot([nx, ny, nz], centre) >= 0 ? loop : [...loop].reverse();
}

/**
 * What a solid is made of before it is joined up: its corners, its polygons (as loops of corner numbers), which of the solid's own faces each polygon is part of, and how it is to be looked at.
 * `oriented` says the loops already run counter-clockwise seen from outside (a shape that is not convex cannot be told by looking from its middle); `convex` says no part of the solid can hide another.
 */
export type Parts = { kind: SolidKind; n: number; vertices: Vec3[]; loops: Loop[]; faceOf: number[]; hull: Vec3[]; round: boolean; centre?: (corners: readonly Vec3[]) => Vec3; oriented?: boolean; convex?: boolean; upright?: boolean };

/** Join the polygons into a graph: edges found by their corner numbers, the cell across each side, each polygon's middle, its facing and its room. */
export function assemble(parts: Parts): SolidGrid {
  const { kind, n, vertices } = parts;
  const loops = parts.oriented === true ? parts.loops : parts.loops.map((loop) => outward(loop, vertices));
  const cells = loops.length;
  const edges: { a: number; b: number; left: number; right: number }[] = [];
  const found = new Map<number, number>();
  const sideEdge: number[][] = [];
  const stride = vertices.length;
  for (let cell = 0; cell < cells; cell += 1) {
    const loop = loops[cell]!;
    const row: number[] = [];
    for (let k = 0; k < loop.length; k += 1) {
      const p = loop[k]!;
      const q = loop[(k + 1) % loop.length]!;
      const lo = Math.min(p, q);
      const hi = Math.max(p, q);
      const key = lo * stride + hi;
      let id = found.get(key);
      if (id === undefined) {
        id = edges.length;
        found.set(key, id);
        edges.push({ a: lo, b: hi, left: cell, right: -1 });
      } else {
        if (edges[id]!.right >= 0) throw new Error(`an edge of the ${kind} has more than two cells beside it`);
        edges[id]!.right = cell;
      }
      row.push(id);
    }
    sideEdge.push(row);
  }
  for (const edge of edges) if (edge.right < 0) throw new Error(`an edge of the ${kind} has only one cell beside it`);
  const neighbours = sideEdge.map((row, cell) => row.map((id) => (edges[id]!.left === cell ? edges[id]!.right : edges[id]!.left)));
  const centres: Vec3[] = [];
  const normals: Vec3[] = [];
  const radii: number[] = [];
  for (let cell = 0; cell < cells; cell += 1) {
    const corners = loops[cell]!.map((v) => vertices[v]!);
    const centre = parts.centre === undefined ? mean(corners) : parts.centre(corners);
    centres.push(centre);
    // The facing: round a globe it is the direction from the middle, and on a flat polygon the direction at right angles to it.
    const normal = parts.round ? unit(centre) : unit(cross(sub(corners[1]!, corners[0]!), sub(corners[2]!, corners[1]!)));
    normals.push(normal);
    let room = Infinity;
    for (let k = 0; k < corners.length; k += 1) {
      const middle = scale(add(corners[k]!, corners[(k + 1) % corners.length]!), 0.5);
      room = Math.min(room, length(sub(middle, centre)));
    }
    radii.push(room);
  }
  const reach = Math.max(...vertices.map(length));
  return { kind, n, shape: kind, w: n, h: n, cells, neighbours, corners: loops, vertices, centres, normals, radii, faceOf: parts.faceOf, edges, sideEdge, hull: parts.hull, reach, round: parts.round, convex: parts.convex !== false, upright: parts.upright === true };
}

export const PHI = (1 + Math.sqrt(5)) / 2;

/** The corners and triangular faces of a regular solid with triangles for faces, round the origin and of radius one. */
export function baseSolid(kind: "tetrahedron" | "octahedron" | "icosahedron" | "sphere"): { points: Vec3[]; faces: [number, number, number][] } {
  let points: Vec3[];
  if (kind === "tetrahedron") points = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
  else if (kind === "octahedron") points = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  else {
    points = [];
    for (const a of [-1, 1]) for (const b of [-PHI, PHI]) points.push([0, a, b], [a, b, 0], [b, 0, a]);
  }
  points = points.map(unit);
  // The faces: every triple of corners that are all each other's nearest neighbours (the length of an edge is the shortest distance between two corners).
  let edge = Infinity;
  for (let i = 0; i < points.length; i += 1) for (let j = i + 1; j < points.length; j += 1) edge = Math.min(edge, length(sub(points[i]!, points[j]!)));
  const near = (i: number, j: number): boolean => Math.abs(length(sub(points[i]!, points[j]!)) - edge) < 1e-9;
  const faces: [number, number, number][] = [];
  for (let i = 0; i < points.length; i += 1) for (let j = i + 1; j < points.length; j += 1) for (let k = j + 1; k < points.length; k += 1) if (near(i, j) && near(j, k) && near(i, k)) faces.push([i, j, k]);
  return { points, faces };
}

/** Every point of a triangular face that is `n` cuts along its edges: corner `(i, j)` has weights `n - i - j`, `i`, `j` on the face's three corners. A point on an edge of the solid is the same point from either face. */
export function latticeOf(points: readonly Vec3[], faces: readonly (readonly [number, number, number])[], n: number): { vertices: Vec3[]; at: (face: number, i: number, j: number) => number } {
  const ids = new Map<string, number>();
  const vertices: Vec3[] = [];
  const at = (face: number, i: number, j: number): number => {
    const [a, b, c] = faces[face]!;
    const weights = [[a, n - i - j], [b, i], [c, j]] as const;
    const key = weights
      .filter(([, w]) => w > 0)
      .sort((p, q) => p[0] - q[0])
      .map(([corner, w]) => `${corner}:${w}`)
      .join("|");
    let id = ids.get(key);
    if (id === undefined) {
      id = vertices.length;
      ids.set(key, id);
      const pa = points[a]!;
      const pb = points[b]!;
      const pc = points[c]!;
      vertices.push([(pa[0] * (n - i - j) + pb[0] * i + pc[0] * j) / n, (pa[1] * (n - i - j) + pb[1] * i + pc[1] * j) / n, (pa[2] * (n - i - j) + pb[2] * i + pc[2] * j) / n]);
    }
    return id;
  };
  return { vertices, at };
}

/** The `n * n` small triangles of each face of a solid with triangles for faces, as loops of lattice points. */
export function trianglesOf(faces: number, n: number, at: (face: number, i: number, j: number) => number): { loops: Loop[]; faceOf: number[] } {
  const loops: Loop[] = [];
  const faceOf: number[] = [];
  for (let face = 0; face < faces; face += 1) {
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i + j < n; i += 1) {
        loops.push([at(face, i, j), at(face, i + 1, j), at(face, i, j + 1)]);
        faceOf.push(face);
        if (i + j < n - 1) {
          loops.push([at(face, i + 1, j), at(face, i + 1, j + 1), at(face, i, j + 1)]);
          faceOf.push(face);
        }
      }
    }
  }
  return { loops, faceOf };
}

