import { add, cross, dot, length, mean, scale, sub, unit, type Vec3 } from "./vec.ts";

/**
 * THE SURFACE OF A SOLID AS A CELL GRAPH: the one thing a maze over a solid is made on. A solid is a closed surface cut into cells; each cell
 * has the cells beside it, one across each of its sides, and nothing is the edge of the shape, because a surface has none. The generators, the
 * measure and the game read only `cells` and `neighbours` (as they do for a flat maze), so a maze over a cube is carved by the very same
 * algorithms as a maze on a page, and what is new is only where the cells lie in space.
 *
 * Five solids, each cut into cells in a way that suits it:
 *
 * - `cube`: six squares, each `n` by `n`, with the cells of one face joined to the cells of the next across every edge of the cube (6 n^2 cells).
 * - `sphere`: a geodesic globe, a football: the dual of an icosahedron cut `n` ways along each edge, so its cells are 12 pentagons and the
 *   rest hexagons (10 n^2 + 2 cells). It was weighed against a cube with its corners rounded off, which has the very graph of the cube and so
 *   would be the same maze in a different coat. The football's cells are nearly equal in size all over the globe, with no poles and no seams;
 *   its twelve pentagons are the corners, each with only five ways out.
 * - `tetrahedron`, `octahedron`, `icosahedron`: four, eight and twenty triangles, each cut `n` ways along its edges into `n^2` small triangles
 *   (4 n^2, 8 n^2 and 20 n^2 cells). A triangle has three ways out, so these mazes branch least and run longest.
 *
 * A cell is a flat polygon (a curved cell of the sphere is the flat polygon through its corners). Its sides are in a fixed order, counter-clockwise
 * seen from outside, starting at a corner that is fixed by how the grid is built, and `neighbours[cell][side]` is the cell across that side. That
 * order is part of the format: a line kept as steps (`lineToSteps`) is the position of each cell among its predecessor's neighbours, so it is the
 * same line for ever and on every device. Everything that decides the graph is integer arithmetic (a corner is found by whole-number weights, never
 * by a rounded coordinate), so the same solid is the same graph in every browser and every Node.
 */
export const SOLID_KINDS = ["cube", "sphere", "tetrahedron", "octahedron", "icosahedron"] as const;
export type SolidKind = (typeof SOLID_KINDS)[number];

/** The edge between two cells: its two corners (indices into `vertices`) and the two cells it lies between. */
export type SolidEdge = { readonly a: number; readonly b: number; readonly left: number; readonly right: number };

export type SolidGrid = {
  readonly kind: SolidKind;
  /** The cut: cells along an edge of a face (`cube`, and the triangle solids), or the frequency of the globe (`sphere`). */
  readonly n: number;
  /** The kind, as `CellGraph` has it (the algorithms read `shape`, `w` and `h` only to refuse Eller's, which needs rows). */
  readonly shape: SolidKind;
  readonly w: number;
  readonly h: number;
  readonly cells: number;
  /** The cell across each side of each cell, in the order of the sides. */
  readonly neighbours: readonly (readonly number[])[];
  /** Each cell's corners (indices into `vertices`), counter-clockwise seen from outside. Side `k` runs from corner `k` to corner `k + 1`. */
  readonly corners: readonly (readonly number[])[];
  readonly vertices: readonly Vec3[];
  /** The middle of each cell, on the surface. */
  readonly centres: readonly Vec3[];
  /** Which way each cell faces, of length one. */
  readonly normals: readonly Vec3[];
  /** How far each cell reaches from its middle to the middle of its nearest side: the room for a mark in it. */
  readonly radii: readonly number[];
  /** Which of the solid's own faces each cell is on (the sphere has none to name: -1). */
  readonly faceOf: readonly number[];
  readonly edges: readonly SolidEdge[];
  /** For each cell and side, the edge it is (an index into `edges`). */
  readonly sideEdge: readonly (readonly number[])[];
  /** The corners of the solid itself, which decide how far it reaches whichever way it is turned (empty for the sphere, which reaches `reach` everywhere). */
  readonly hull: readonly Vec3[];
  /** The farthest any part of the solid is from its middle. */
  readonly reach: number;
  /** Whether the solid is round (a silhouette that is a circle however it is turned). */
  readonly round: boolean;
};

/** The most cells a solid may have in a recipe: a little over twice the biggest level. */
export const MEIKYUU_MOST_SOLID_CELLS = 6000;

/** How many cells a solid cut `n` ways has. */
export function solidCells(kind: SolidKind, n: number): number {
  switch (kind) {
    case "cube":
      return 6 * n * n;
    case "sphere":
      return 10 * n * n + 2;
    case "tetrahedron":
      return 4 * n * n;
    case "octahedron":
      return 8 * n * n;
    case "icosahedron":
      return 20 * n * n;
  }
}

type Loop = number[];

/** A loop of corners turned, if need be, to run counter-clockwise seen from outside the solid (which is round the origin). */
function outward(loop: Loop, vertices: readonly Vec3[]): Loop {
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

type Parts = { kind: SolidKind; n: number; vertices: Vec3[]; loops: Loop[]; faceOf: number[]; hull: Vec3[]; round: boolean; centre?: (corners: readonly Vec3[]) => Vec3 };

/** Join the polygons into a graph: edges found by their corner numbers, the cell across each side, each polygon's middle, its facing and its room. */
function assemble(parts: Parts): SolidGrid {
  const { kind, n, vertices } = parts;
  const loops = parts.loops.map((loop) => outward(loop, vertices));
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
  return { kind, n, shape: kind, w: n, h: n, cells, neighbours, corners: loops, vertices, centres, normals, radii, faceOf: parts.faceOf, edges, sideEdge, hull: parts.hull, reach, round: parts.round };
}

/** A cube cut into `n` by `n` squares a face. Corners are found by whole-number coordinates. */
function cubeParts(n: number): Parts {
  const ids = new Map<string, number>();
  const vertices: Vec3[] = [];
  const corner = (x: number, y: number, z: number): number => {
    const key = `${x},${y},${z}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = vertices.length;
      ids.set(key, id);
      vertices.push([x / n, y / n, z / n]);
    }
    return id;
  };
  const loops: Loop[] = [];
  const faceOf: number[] = [];
  for (let face = 0; face < 6; face += 1) {
    const axis = face >> 1;
    const sign = face % 2 === 0 ? 1 : -1;
    const at = (i: number, j: number): number => {
      const xyz = [0, 0, 0];
      xyz[axis] = sign * n;
      xyz[(axis + 1) % 3] = 2 * i - n;
      xyz[(axis + 2) % 3] = 2 * j - n;
      return corner(xyz[0]!, xyz[1]!, xyz[2]!);
    };
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        loops.push([at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
        faceOf.push(face);
      }
    }
  }
  const hull: Vec3[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) hull.push([x, y, z]);
  return { kind: "cube", n, vertices, loops, faceOf, hull, round: false };
}

const PHI = (1 + Math.sqrt(5)) / 2;

/** The corners and triangular faces of a regular solid with triangles for faces, round the origin and of radius one. */
function baseSolid(kind: "tetrahedron" | "octahedron" | "icosahedron" | "sphere"): { points: Vec3[]; faces: [number, number, number][] } {
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
function latticeOf(points: readonly Vec3[], faces: readonly (readonly [number, number, number])[], n: number): { vertices: Vec3[]; at: (face: number, i: number, j: number) => number } {
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
function trianglesOf(faces: number, n: number, at: (face: number, i: number, j: number) => number): { loops: Loop[]; faceOf: number[] } {
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

function triangleSolidParts(kind: "tetrahedron" | "octahedron" | "icosahedron", n: number): Parts {
  const { points, faces } = baseSolid(kind);
  const { vertices, at } = latticeOf(points, faces, n);
  const { loops, faceOf } = trianglesOf(faces.length, n, at);
  return { kind, n, vertices, loops, faceOf, hull: points, round: false };
}

/** A globe: an icosahedron cut `n` ways, put on a sphere, and made its dual: a cell for each of its corners, a corner of the cell for each triangle round it. */
function sphereParts(n: number): Parts {
  const { points, faces } = baseSolid("icosahedron");
  const lattice = latticeOf(points, faces, n);
  const { loops: triangles } = trianglesOf(faces.length, n, lattice.at);
  const cellOf = lattice.vertices.map((point) => unit(point));
  // Each triangle is a corner of the three cells at its corners; the triangles round a cell, in order, are the cell's polygon.
  const turned = triangles.map((triangle) => outward(triangle, cellOf));
  const corners: Vec3[] = turned.map((triangle) => unit(mean(triangle.map((v) => cellOf[v]!))));
  const round: number[][][] = cellOf.map(() => []);
  turned.forEach((triangle, t) => {
    for (let k = 0; k < 3; k += 1) round[triangle[k]!]!.push([t, triangle[(k + 1) % 3]!, triangle[(k + 2) % 3]!]);
  });
  const loops: Loop[] = round.map((fan) => {
    // Follow the fan: the triangle after (t, a, b) is the one whose first other corner is b.
    const byFirst = new Map(fan.map((entry) => [entry[1]!, entry] as const));
    const order: number[] = [];
    let entry = fan[0]!;
    for (let step = 0; step < fan.length; step += 1) {
      order.push(entry[0]!);
      entry = byFirst.get(entry[2]!)!;
    }
    return order;
  });
  return { kind: "sphere", n, vertices: corners, loops, faceOf: loops.map(() => -1), hull: [], round: true, centre: (polygon) => unit(mean(polygon)) };
}

/** The surface of a solid cut `n` ways (`n` at least 2): its cells, which are beside which, and where each lies. */
export function solidGridOf(kind: SolidKind, n: number): SolidGrid {
  if (!Number.isInteger(n) || n < 2) throw new Error(`a ${kind} is cut into at least 2 a side, not ${n}`);
  switch (kind) {
    case "cube":
      return assemble(cubeParts(n));
    case "sphere":
      return assemble(sphereParts(n));
    default:
      return assemble(triangleSolidParts(kind, n));
  }
}
