import { assemble, baseSolid, latticeOf, outward, trianglesOf, type Loop, type Parts } from "./solidParts.ts";
import { solidShapeCells, solidShapeParts, SOLID_SHAPE_KINDS, type SolidShapeKind } from "./solidShapes.ts";
import { mean, unit, type Vec3 } from "./vec.ts";

/**
 * THE SURFACE OF A SOLID AS A CELL GRAPH: the one thing a maze over a solid is made on. A solid is a closed surface cut into cells; each cell
 * has the cells beside it, one across each of its sides, and nothing is the edge of the shape, because a surface has none. The generators, the
 * measure and the game read only `cells` and `neighbours` (as they do for a flat maze), so a maze over a cube is carved by the very same
 * algorithms as a maze on a page, and what is new is only where the cells lie in space.
 *
 * Five solids were the first, each cut into cells in a way that suits it:
 *
 * - `cube`: six squares, each `n` by `n`, with the cells of one face joined to the cells of the next across every edge of the cube (6 n^2 cells).
 * - `sphere`: a geodesic globe, a football: the dual of an icosahedron cut `n` ways along each edge, so its cells are 12 pentagons and the
 *   rest hexagons (10 n^2 + 2 cells). It was weighed against a cube with its corners rounded off, which has the very graph of the cube and so
 *   would be the same maze in a different coat. The football's cells are nearly equal in size all over the globe, with no poles and no seams;
 *   its twelve pentagons are the corners, each with only five ways out.
 * - `tetrahedron`, `octahedron`, `icosahedron`: four, eight and twenty triangles, each cut `n` ways along its edges into `n^2` small triangles
 *   (4 n^2, 8 n^2 and 20 n^2 cells). A triangle has three ways out, so these mazes branch least and run longest.
 *
 * Twelve more came after them (`solidShapes.ts`): the dice a person may know (the dodecahedron, the ten-sided trapezohedron, the rhombic and
 * deltoidal ones, a bipyramid and a prism) and shapes that are not dice (a box, a cross of cubes, a ring, a star and a heart). They are cut into
 * cells the same way: every polygon face of the shape is divided into smaller ones, and the cells of one face are joined to the next across every edge.
 *
 * A cell is a flat polygon (a curved cell of the sphere is the flat polygon through its corners). Its sides are in a fixed order, counter-clockwise
 * seen from outside, starting at a corner that is fixed by how the grid is built, and `neighbours[cell][side]` is the cell across that side. That
 * order is part of the format: a line kept as steps (`lineToSteps`) is the position of each cell among its predecessor's neighbours, so it is the
 * same line for ever and on every device. Everything that decides the graph is integer arithmetic (a corner is found by whole-number weights, never
 * by a rounded coordinate), so the same solid is the same graph in every browser and every Node.
 */
export const SOLID_KINDS = ["cube", "sphere", "tetrahedron", "octahedron", "icosahedron", ...SOLID_SHAPE_KINDS] as const;
export type SolidKind = "cube" | "sphere" | "tetrahedron" | "octahedron" | "icosahedron" | SolidShapeKind;

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
  /** Whether the solid is convex: no part of it can hide another, so the cells that face the viewer are the cells that are seen. A star, a cross, a ring or a heart is not, and is painted back to front. */
  readonly convex: boolean;
  /** Whether the solid has a way up (a heart, a star): it is first seen upright. */
  readonly upright: boolean;
};

/** The most cells a solid may have in a recipe: a little over twice the biggest level. */
export const MEIKYUU_MOST_SOLID_CELLS = 10000;

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
    default:
      return solidShapeCells(kind, n);
  }
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

/** Whether a solid can be cut `n` ways: a whole number of at least 2, or 1 where the solid has already sixty cells uncut (the dodecahedron's five to a face). */
export function isSolidCut(kind: SolidKind, n: number): boolean {
  return Number.isInteger(n) && (n >= 2 || (n === 1 && solidCells(kind, 1) >= 60));
}

/** The surface of a solid cut `n` ways (`n` at least 2, or 1 for a solid with sixty cells at that): its cells, which are beside which, and where each lies. */
export function solidGridOf(kind: SolidKind, n: number): SolidGrid {
  if (!isSolidCut(kind, n)) throw new Error(`a ${kind} is cut into at least 2 a side, not ${n}`);
  switch (kind) {
    case "cube":
      return assemble(cubeParts(n));
    case "sphere":
      return assemble(sphereParts(n));
    case "tetrahedron":
    case "octahedron":
    case "icosahedron":
      return assemble(triangleSolidParts(kind, n));
    default:
      return assemble(solidShapeParts(kind, n));
  }
}
