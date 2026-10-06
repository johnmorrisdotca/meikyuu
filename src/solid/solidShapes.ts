import type { Loop, Parts } from "./solidParts.ts";
import { baseSolid, latticeOf, outward, PHI, trianglesOf } from "./solidParts.ts";
import { heartDirection } from "./solidHeart.ts";
import { cross, dot, mean, sub, unit, type Vec3 } from "./vec.ts";

/**
 * THE OTHER SOLIDS: every solid but the five the first release had (the cube, the globe and the three made of triangles). Two kinds of thing, named for
 * how they are met, and the demo's picker keeps them on two rows:
 *
 * DICE (`SOLID_DICE`): the shapes dice are made in, each a convex solid whose faces are all alike, or nearly, so that a die rolls on any of them. The
 *   tetrahedron (d4), cube (d6), octahedron (d8) and icosahedron (d20) are the originals and live in `solidGrid.ts`; here are the ten-sided
 *   trapezohedron (d10), the dodecahedron (d12) and the rhombic dodecahedron (the other d12), the octagonal bipyramid (d16), the deltoidal
 *   icositetrahedron (d24), the rhombic triacontahedron (d30) and the triangular prism (d3, the long die that rolls on its three sides).
 *   A d2 is a coin and a d100 a d10, so neither is a solid of its own; a d14 is a trapezohedron too, and is left for a package that needs it.
 * SHAPES (`SOLID_SHAPES`): a globe (`sphere`, the original), a box that is not a cube, a cross of cubes in three dimensions, a ring that is a square
 *   torus, a star and a heart. The cross, the ring, the star and the heart are not convex (a part of them can hide another), so they are painted back to front.
 *
 * HOW A FACE BECOMES CELLS, EXACTLY. Every polygon face is cut into smaller polygons, and the cells of one face are joined to the cells of the next across every
 * edge, with no cell on the edge of anything. A triangle is cut `m` ways along each side into `m * m` triangles; a four-sided face (a rhombus, a kite, a rectangle) into
 * `p` by `q` quadrilaterals, in proportion; a pentagon into five quadrilaterals (from its middle to the middles of its sides), each `k` by `k`, so that
 * a side has `2 k` cuts. A point is found by whole-number keys (which side of the shape it is on, and how far along), never by comparing coordinates, so
 * the graph is the same in every browser and every Node. A face that two faces meet at must be cut the same number of ways on both sides (the build
 * throws if not, because an edge with one cell beside it is found). The positions are only plain arithmetic and square roots, exact in every engine.
 */

/** The shapes dice are made in (as well as the cube, the tetrahedron, the octahedron and the icosahedron, which are the first five solids). */
export const SOLID_DICE_MORE = ["prism", "trapezohedron", "dodecahedron", "rhombic-dodecahedron", "bipyramid", "icositetrahedron", "triacontahedron"] as const;
/** The shapes that are not dice. */
export const SOLID_SHAPES_MORE = ["box", "cross", "ring", "torus", "star", "heart"] as const;
export const SOLID_SHAPE_KINDS = [...SOLID_DICE_MORE, ...SOLID_SHAPES_MORE] as const;
export type SolidShapeKind = (typeof SOLID_SHAPE_KINDS)[number];

const S2 = Math.sqrt(2);
const S3 = Math.sqrt(3);
const S5 = Math.sqrt(5);

/** The proportions of the box: a brick of three by two by one. */
export const BOX_SIDES = [3, 2, 1] as const;
/** How much taller than a cut of the triangle's side the prism is: its length in cells along the axis is `PRISM_LENGTH` times the cut. */
export const PRISM_LENGTH = 2;
/** The outline of the star: its tips are one from the middle, its inner corners this far. */
const STAR_INNER = 0.5;

/** How many cells the thickness of a star has to a cut of `n`: about six tenths of the length of the outline's side. */
export function starRows(n: number): number {
  return Math.max(1, Math.round(0.6 * n));
}

/** How many cells a shape cut `n` ways has. */
export function solidShapeCells(kind: SolidShapeKind, n: number): number {
  switch (kind) {
    case "prism":
      return 2 * n * n + 3 * n * PRISM_LENGTH * n;
    case "trapezohedron":
      return 10 * n * n;
    case "dodecahedron":
      return 60 * n * n;
    case "rhombic-dodecahedron":
      return 12 * n * n;
    case "bipyramid":
      return 16 * n * n;
    case "icositetrahedron":
      return 24 * n * n;
    case "triacontahedron":
      return 30 * n * n;
    case "box":
      return 2 * (BOX_SIDES[0] * BOX_SIDES[1] + BOX_SIDES[1] * BOX_SIDES[2] + BOX_SIDES[2] * BOX_SIDES[0]) * n * n;
    case "cross":
      return 30 * n * n;
    case "ring":
      return 32 * n * n;
    case "torus":
      return 3 * n * n;
    case "star":
      return 10 * n * n + 10 * n * starRows(n);
    case "heart":
      return 20 * n * n;
  }
}

// ---- A MESH: the lattice points of faces, found by keys ----

const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

class Mesh {
  readonly vertices: Vec3[] = [];
  readonly loops: Loop[] = [];
  readonly faceOf: number[] = [];
  private readonly ids = new Map<string, number>();

  readonly base: readonly Vec3[];

  constructor(base: readonly Vec3[]) {
    this.base = base;
  }

  /** A point by its key, made the first time it is asked for. */
  at(key: string, position: () => Vec3): number {
    let id = this.ids.get(key);
    if (id === undefined) {
      id = this.vertices.length;
      this.ids.set(key, id);
      this.vertices.push(position());
    }
    return id;
  }

  /** A corner of the shape itself. */
  corner(v: number): number {
    return this.at(`v${v}`, () => this.base[v]!);
  }

  /** The point `k` of `m` of the way from corner `u` to corner `v` along an edge of the shape: the same point from either of the two faces that share it. */
  edge(u: number, v: number, k: number, m: number): number {
    if (k === 0) return this.corner(u);
    if (k === m) return this.corner(v);
    const [a, b, i] = u < v ? [u, v, k] : [v, u, m - k];
    return this.at(`e${a},${b},${i}/${m}`, () => lerp(this.base[a]!, this.base[b]!, i / m));
  }

  add(loop: Loop, face: number): void {
    this.loops.push(loop);
    this.faceOf.push(face);
  }

  /** A triangular face (corners `a`, `b`, `c`) cut `m` ways along each side. */
  triangle(face: number, [a, b, c]: readonly [number, number, number], m: number): void {
    const [pa, pb, pc] = [this.base[a]!, this.base[b]!, this.base[c]!];
    const id = (i: number, j: number): number => {
      if (j === 0) return this.edge(a, b, i, m);
      if (i === 0) return this.edge(a, c, j, m);
      if (i + j === m) return this.edge(b, c, j, m);
      return this.at(`f${face}:${i},${j}`, () => [(pa[0] * (m - i - j) + pb[0] * i + pc[0] * j) / m, (pa[1] * (m - i - j) + pb[1] * i + pc[1] * j) / m, (pa[2] * (m - i - j) + pb[2] * i + pc[2] * j) / m]);
    };
    for (let j = 0; j < m; j += 1) {
      for (let i = 0; i + j < m; i += 1) {
        this.add([id(i, j), id(i + 1, j), id(i, j + 1)], face);
        if (i + j < m - 1) this.add([id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)], face);
      }
    }
  }

  /** A four-sided face (corners `a`, `b`, `c`, `d` in order round it) cut `p` ways along `a` to `b` (and `d` to `c`) and `q` ways along `b` to `c` (and `a` to `d`). */
  quad(face: number, [a, b, c, d]: readonly [number, number, number, number], p: number, q: number): void {
    const [pa, pb, pc, pd] = [this.base[a]!, this.base[b]!, this.base[c]!, this.base[d]!];
    const id = (i: number, j: number): number => {
      if (j === 0) return this.edge(a, b, i, p);
      if (j === q) return this.edge(d, c, i, p);
      if (i === 0) return this.edge(a, d, j, q);
      if (i === p) return this.edge(b, c, j, q);
      return this.at(`f${face}:${i},${j}`, () => bilinear(pa, pb, pc, pd, i / p, j / q));
    };
    for (let j = 0; j < q; j += 1) for (let i = 0; i < p; i += 1) this.add([id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)], face);
  }

  /** A pentagonal face (corners in order) cut into five quadrilaterals from its middle to the middles of its sides, each `k` by `k`: a side has `2 k` cuts. */
  pentagon(face: number, v: readonly number[], k: number): void {
    const m = 2 * k;
    const middle = mean(v.map((i) => this.base[i]!));
    const centre = (): number => this.at(`f${face}:c`, () => middle);
    // The middle of side `s` (from corner `s` to corner `s + 1`), and a point `step` of `k` of the way along the ray from the face's middle to it.
    const mid = (s: number): number => this.edge(v[s]!, v[(s + 1) % 5]!, k, m);
    const ray = (s: number, step: number): number => {
      if (step === 0) return centre();
      if (step === k) return mid(s);
      return this.at(`f${face}:r${s}:${step}`, () => lerp(middle, midpoint(this.base[v[s]!]!, this.base[v[(s + 1) % 5]!]!), step / k));
    };
    for (let s = 0; s < 5; s += 1) {
      const before = (s + 4) % 5;
      const after = (s + 1) % 5;
      const [pa, pb, pc, pd] = [middle, midpoint(this.base[v[before]!]!, this.base[v[s]!]!), this.base[v[s]!]!, midpoint(this.base[v[s]!]!, this.base[v[after]!]!)];
      const id = (i: number, j: number): number => {
        if (i === k) return this.edge(v[before]!, v[s]!, k + j, m);
        if (j === k) return this.edge(v[s]!, v[after]!, k - i, m);
        if (j === 0) return ray(before, i);
        if (i === 0) return ray(s, j);
        return this.at(`f${face}:s${s}:${i},${j}`, () => bilinear(pa, pb, pc, pd, i / k, j / k));
      };
      for (let j = 0; j < k; j += 1) for (let i = 0; i < k; i += 1) this.add([id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)], face);
    }
  }
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

function bilinear(a: Vec3, b: Vec3, c: Vec3, d: Vec3, u: number, w: number): Vec3 {
  const k0 = (1 - u) * (1 - w);
  const k1 = u * (1 - w);
  const k2 = u * w;
  const k3 = (1 - u) * w;
  return [k0 * a[0] + k1 * b[0] + k2 * c[0] + k3 * d[0], k0 * a[1] + k1 * b[1] + k2 * c[1] + k3 * d[1], k0 * a[2] + k1 * b[2] + k2 * c[2] + k3 * d[2]];
}

/** The corners that lie on the face a normal points at (the ones farthest along it), in order round the face and starting at the lowest numbered. */
function faceAt(points: readonly Vec3[], normal: Vec3): number[] {
  let most = -Infinity;
  for (const p of points) most = Math.max(most, dot(p, normal));
  const on = points.flatMap((p, i) => (dot(p, normal) >= most - 1e-9 ? [i] : []));
  const middle = mean(on.map((i) => points[i]!));
  const toward = unit(sub(points[on[0]!]!, middle));
  const across = cross(unit(normal), toward);
  const angle = (i: number): number => {
    const r = sub(points[i]!, middle);
    return Math.atan2(dot(r, across), dot(r, toward));
  };
  const round = [...on].sort((x, y) => angle(x) - angle(y));
  const first = round.indexOf(Math.min(...round));
  return [...round.slice(first), ...round.slice(0, first)];
}

/** Every face of a convex solid, one for each normal named. */
function facesAt(points: readonly Vec3[], normals: readonly Vec3[]): number[][] {
  return normals.map((normal) => faceAt(points, normal));
}

const SIGNS = [1, -1] as const;

/** Parts from a mesh, for a convex solid round the origin. */
function convex(kind: SolidShapeKind, n: number, mesh: Mesh, hull: readonly Vec3[]): Parts {
  return { kind, n, vertices: mesh.vertices, loops: mesh.loops, faceOf: mesh.faceOf, hull: [...hull], round: false };
}

// ---- THE DICE ----

/** The dodecahedron: twelve pentagons, each cut into five quadrilaterals `n` by `n` (60 n^2 cells). */
function dodecahedron(n: number): Parts {
  const phi = PHI;
  const points: Vec3[] = [];
  for (const x of SIGNS) for (const y of SIGNS) for (const z of SIGNS) points.push([x, y, z]);
  for (const y of SIGNS) for (const z of SIGNS) points.push([0, y / phi, z * phi]);
  for (const x of SIGNS) for (const y of SIGNS) points.push([x / phi, y * phi, 0]);
  for (const x of SIGNS) for (const z of SIGNS) points.push([x * phi, 0, z / phi]);
  const normals: Vec3[] = [];
  for (const y of SIGNS) for (const z of SIGNS) normals.push([0, y * phi, z]);
  for (const x of SIGNS) for (const z of SIGNS) normals.push([x, 0, z * phi]);
  for (const x of SIGNS) for (const y of SIGNS) normals.push([x * phi, y, 0]);
  const mesh = new Mesh(points);
  facesAt(points, normals).forEach((face, f) => mesh.pentagon(f, face, n));
  return convex("dodecahedron", n, mesh, points);
}

/** The rhombic dodecahedron: twelve rhombi, each cut `n` by `n` (12 n^2 cells). */
function rhombicDodecahedron(n: number): Parts {
  const points: Vec3[] = [];
  for (const x of SIGNS) for (const y of SIGNS) for (const z of SIGNS) points.push([x, y, z]);
  for (const s of SIGNS) points.push([2 * s, 0, 0], [0, 2 * s, 0], [0, 0, 2 * s]);
  const normals: Vec3[] = [];
  for (const a of SIGNS) for (const b of SIGNS) normals.push([a, b, 0], [a, 0, b], [0, a, b]);
  const mesh = new Mesh(points);
  facesAt(points, normals).forEach((face, f) => mesh.quad(f, face as unknown as [number, number, number, number], n, n));
  return convex("rhombic-dodecahedron", n, mesh, points);
}

/** The rhombic triacontahedron: thirty rhombi, each cut `n` by `n` (30 n^2 cells). The twelve corners of an icosahedron of edge 2 and the twenty of a dodecahedron, whose edges cross at their middles. */
function triacontahedron(n: number): Parts {
  const phi = PHI;
  const icosa: Vec3[] = [];
  for (const y of SIGNS) for (const z of SIGNS) icosa.push([0, y, z * phi], [z * phi, 0, y], [y, z * phi, 0]);
  const dodeca: Vec3[] = [];
  for (const x of SIGNS) for (const y of SIGNS) for (const z of SIGNS) dodeca.push([x, y, z]);
  for (const y of SIGNS) for (const z of SIGNS) dodeca.push([0, y * phi, z / phi], [z / phi, 0, y * phi], [y * phi, z / phi, 0]);
  const points = [...icosa, ...dodeca];
  // A rhombus for each edge of the icosahedron (two corners two apart): its normal is their sum.
  const normals: Vec3[] = [];
  for (let i = 0; i < icosa.length; i += 1) {
    for (let j = i + 1; j < icosa.length; j += 1) {
      const d = Math.sqrt((icosa[i]![0] - icosa[j]![0]) ** 2 + (icosa[i]![1] - icosa[j]![1]) ** 2 + (icosa[i]![2] - icosa[j]![2]) ** 2);
      if (Math.abs(d - 2) < 1e-9) normals.push([icosa[i]![0] + icosa[j]![0], icosa[i]![1] + icosa[j]![1], icosa[i]![2] + icosa[j]![2]]);
    }
  }
  const mesh = new Mesh(points);
  facesAt(points, normals).forEach((face, f) => mesh.quad(f, face as unknown as [number, number, number, number], n, n));
  return convex("triacontahedron", n, mesh, points);
}

/** The deltoidal icositetrahedron: twenty-four kites, each cut `n` by `n` (24 n^2 cells). */
function icositetrahedron(n: number): Parts {
  const k = 1 + S2;
  const c = k / (k + 1);
  const b = k / (k + 2);
  const points: Vec3[] = [];
  for (const s of SIGNS) points.push([s, 0, 0], [0, s, 0], [0, 0, s]);
  for (const x of SIGNS) for (const y of SIGNS) points.push([x * c, y * c, 0], [x * c, 0, y * c], [0, x * c, y * c]);
  for (const x of SIGNS) for (const y of SIGNS) for (const z of SIGNS) points.push([x * b, y * b, z * b]);
  const normals: Vec3[] = [];
  for (const a of SIGNS) for (const e of SIGNS) for (const f of SIGNS) normals.push([a * k, e, f], [e, a * k, f], [e, f, a * k]);
  const mesh = new Mesh(points);
  facesAt(points, normals).forEach((face, f) => mesh.quad(f, face as unknown as [number, number, number, number], n, n));
  return convex("icositetrahedron", n, mesh, points);
}

/** The cosines and sines of multiples of 36 degrees, from square roots only. */
const C36 = (1 + S5) / 4;
const S36 = Math.sqrt(10 - 2 * S5) / 4;
const C72 = (S5 - 1) / 4;
const S72 = Math.sqrt(10 + 2 * S5) / 4;
const COS36 = [1, C36, C72, -C72, -C36, -1, -C36, -C72, C72, C36] as const;
const SIN36 = [0, S36, S72, S72, S36, 0, -S36, -S72, -S72, -S36] as const;

/** The pentagonal trapezohedron, the ten-sided die: ten kites, each cut `n` by `n` (10 n^2 cells). Its apexes are one and a tenth from the middle and its two rings of five are the height at which every kite is flat. */
function trapezohedron(n: number): Parts {
  const top = 1.1;
  const ring = (top * (1 - C36)) / (1 + C36);
  const points: Vec3[] = [[0, 0, top], [0, 0, -top]];
  for (let k = 0; k < 5; k += 1) points.push([COS36[2 * k]!, SIN36[2 * k]!, ring]);
  for (let k = 0; k < 5; k += 1) points.push([COS36[2 * k + 1]!, SIN36[2 * k + 1]!, -ring]);
  const upper = (k: number): number => 2 + (k % 5);
  const lower = (k: number): number => 7 + (k % 5);
  const mesh = new Mesh(points);
  for (let k = 0; k < 5; k += 1) mesh.quad(k, [0, upper(k), lower(k), upper(k + 1)], n, n);
  for (let k = 0; k < 5; k += 1) mesh.quad(5 + k, [1, lower(k), upper(k + 1), lower(k + 1)], n, n);
  return convex("trapezohedron", n, mesh, points);
}

/** The octagonal bipyramid, the sixteen-sided die: sixteen triangles, each cut `n` ways (16 n^2 cells). */
function bipyramid(n: number): Parts {
  const s = S2 / 2;
  const ring: [number, number][] = [[1, 0], [s, s], [0, 1], [-s, s], [-1, 0], [-s, -s], [0, -1], [s, -s]];
  const height = 0.8;
  const points: Vec3[] = [[0, 0, height], [0, 0, -height], ...ring.map(([x, y]): Vec3 => [x, y, 0])];
  const mesh = new Mesh(points);
  for (let k = 0; k < 8; k += 1) mesh.triangle(k, [0, 2 + k, 2 + ((k + 1) % 8)], n);
  for (let k = 0; k < 8; k += 1) mesh.triangle(8 + k, [1, 2 + k, 2 + ((k + 1) % 8)], n);
  return convex("bipyramid", n, mesh, points);
}

/** The triangular prism, the long die of three: two triangles cut `n` ways and three rectangles `n` by `PRISM_LENGTH n` (8 n^2 cells). */
function prism(n: number): Parts {
  const ring: [number, number][] = [[0, 1], [-S3 / 2, -0.5], [S3 / 2, -0.5]];
  const half = S3;
  const points: Vec3[] = [...ring.map(([x, y]): Vec3 => [x, y, half]), ...ring.map(([x, y]): Vec3 => [x, y, -half])];
  const mesh = new Mesh(points);
  mesh.triangle(0, [0, 1, 2], n);
  mesh.triangle(1, [3, 4, 5], n);
  for (let k = 0; k < 3; k += 1) mesh.quad(2 + k, [k, (k + 1) % 3, 3 + ((k + 1) % 3), 3 + k], n, PRISM_LENGTH * n);
  return convex("prism", n, mesh, points);
}

// ---- THE SHAPES ----

/** The box: three by two by one, each face cut in the same square cells (22 n^2 cells). */
function box(n: number): Parts {
  const [a, b, c] = [BOX_SIDES[0] / 2, BOX_SIDES[1] / 2, BOX_SIDES[2] / 2];
  const points: Vec3[] = [];
  for (const x of SIGNS) for (const y of SIGNS) for (const z of SIGNS) points.push([x * a, y * b, z * c]);
  const at = (x: number, y: number, z: number): number => (x > 0 ? 0 : 4) + (y > 0 ? 0 : 2) + (z > 0 ? 0 : 1);
  const mesh = new Mesh(points);
  const [nx, ny, nz] = [BOX_SIDES[0] * n, BOX_SIDES[1] * n, BOX_SIDES[2] * n];
  mesh.quad(0, [at(1, 1, 1), at(1, -1, 1), at(1, -1, -1), at(1, 1, -1)], ny, nz);
  mesh.quad(1, [at(-1, 1, 1), at(-1, -1, 1), at(-1, -1, -1), at(-1, 1, -1)], ny, nz);
  mesh.quad(2, [at(1, 1, 1), at(-1, 1, 1), at(-1, 1, -1), at(1, 1, -1)], nx, nz);
  mesh.quad(3, [at(1, -1, 1), at(-1, -1, 1), at(-1, -1, -1), at(1, -1, -1)], nx, nz);
  mesh.quad(4, [at(1, 1, 1), at(-1, 1, 1), at(-1, -1, 1), at(1, -1, 1)], nx, ny);
  mesh.quad(5, [at(1, 1, -1), at(-1, 1, -1), at(-1, -1, -1), at(1, -1, -1)], nx, ny);
  return convex("box", n, mesh, points);
}

type Voxel = readonly [number, number, number];

const DIRECTIONS: readonly Voxel[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

/** The surface of a heap of unit cubes, each unit face cut `n` by `n`: whole-number corners, so two faces meeting at an edge find the same points. */
function voxels(kind: SolidShapeKind, n: number, filled: readonly Voxel[], origin: Voxel): Parts {
  const has = new Set(filled.map((v) => v.join(",")));
  const ids = new Map<string, number>();
  const vertices: Vec3[] = [];
  const corner = (x: number, y: number, z: number): number => {
    const key = `${x},${y},${z}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = vertices.length;
      ids.set(key, id);
      vertices.push([x / n - origin[0], y / n - origin[1], z / n - origin[2]]);
    }
    return id;
  };
  const loops: Loop[] = [];
  const faceOf: number[] = [];
  let face = 0;
  for (const voxel of filled) {
    for (const d of DIRECTIONS) {
      if (has.has(`${voxel[0] + d[0]},${voxel[1] + d[1]},${voxel[2] + d[2]}`)) continue;
      const axis = d[0] !== 0 ? 0 : d[1] !== 0 ? 1 : 2;
      const u = (axis + 1) % 3;
      const w = (axis + 2) % 3;
      const plane = (voxel[axis]! + (d[axis]! > 0 ? 1 : 0)) * n;
      const at = (i: number, j: number): number => {
        const xyz = [0, 0, 0];
        xyz[axis] = plane;
        xyz[u] = voxel[u]! * n + i;
        xyz[w] = voxel[w]! * n + j;
        return corner(xyz[0]!, xyz[1]!, xyz[2]!);
      };
      // Counter-clockwise seen from outside: along u then along w is so when the face looks along the positive direction of its axis.
      const flip = d[axis]! < 0;
      for (let j = 0; j < n; j += 1) {
        for (let i = 0; i < n; i += 1) {
          const loop = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
          loops.push(flip ? loop.reverse() : loop);
          faceOf.push(face);
        }
      }
      face += 1;
    }
  }
  return { kind, n, vertices, loops, faceOf, hull: [], round: false, oriented: true, convex: false };
}

/** The cross: a cube with a cube on each of its six faces, a plus in three dimensions (30 n^2 cells). */
function crossOfCubes(n: number): Parts {
  return voxels("cross", n, [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], [0.5, 0.5, 0.5]);
}

/** The ring: eight cubes in a square round a hole of one, a torus with square corners (32 n^2 cells). */
function ring(n: number): Parts {
  const filled: Voxel[] = [];
  for (let z = 0; z < 1; z += 1) for (let y = 0; y < 3; y += 1) for (let x = 0; x < 3; x += 1) if (!(x === 1 && y === 1)) filled.push([x, y, z]);
  return voxels("ring", n, filled, [1.5, 1.5, 0.5]);
}

/** How far the middle of the torus's tube is from its middle, and how thick the tube is: a ring about two and a half times as wide as the tube is thick. */
const TORUS_ROUND = 1;
const TORUS_TUBE = 0.38;

/**
 * The torus, a doughnut: a tube bent into a ring, `3 n` cells round the ring and `n` round the tube (3 n^2 cells), a cell about as long as it is wide at the outside of the ring
 * and narrower inside the hole. Not a convex solid: the far side of the ring shows through its hole.
 */
function torus(n: number): Parts {
  const around = 3 * n;
  const mesh = new Mesh([]);
  const at = (i: number, j: number): number => {
    const a = i % around;
    const b = j % n;
    return mesh.at(`t${a},${b}`, () => {
      const theta = (2 * Math.PI * a) / around;
      const phi = (2 * Math.PI * b) / n;
      const rho = TORUS_ROUND + TORUS_TUBE * Math.cos(phi);
      return [rho * Math.cos(theta), rho * Math.sin(theta), TORUS_TUBE * Math.sin(phi)];
    });
  };
  for (let j = 0; j < n; j += 1) for (let i = 0; i < around; i += 1) mesh.add([at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)], 0);
  return { kind: "torus", n, vertices: mesh.vertices, loops: mesh.loops, faceOf: mesh.faceOf, hull: [], round: false, oriented: true, convex: false };
}

/** The star: a five pointed star, tips up, as thick as a little over half the length of a side of its outline (10 n^2 + 10 n h cells for h = `starRows(n)`). */
function star(n: number): Parts {
  const h = starRows(n);
  const outline: [number, number][] = [];
  for (let t = 0; t < 10; t += 1) {
    const radius = t % 2 === 0 ? 1 : STAR_INNER;
    // Tips up the screen (y runs down it): the angle of tip `t` is 90 degrees and then 36 degrees a step.
    outline.push([-SIN36[t]! * radius, -COS36[t]! * radius]);
  }
  const side = Math.sqrt((outline[0]![0] - outline[1]![0]) ** 2 + (outline[0]![1] - outline[1]![1]) ** 2);
  const half = (h * side) / (2 * n);
  // Corner numbers: 0 to 9 the outline in front (toward the viewer, z positive), 10 to 19 behind, 20 and 21 the middles of the two faces.
  const points: Vec3[] = [...outline.map(([x, y]): Vec3 => [x, y, half]), ...outline.map(([x, y]): Vec3 => [x, y, -half]), [0, 0, half], [0, 0, -half]];
  const mesh = new Mesh(points);
  for (let tip = 0; tip < 5; tip += 1) {
    const t = 2 * tip;
    mesh.quad(tip, [20, (t + 9) % 10, t, t + 1], n, n);
    mesh.quad(5 + tip, [21, 10 + ((t + 9) % 10), 10 + t, 10 + t + 1], n, n);
  }
  for (let t = 0; t < 10; t += 1) mesh.quad(10 + t, [t, (t + 1) % 10, 10 + ((t + 1) % 10), 10 + t], n, h);
  return { kind: "star", n, vertices: mesh.vertices, loops: mesh.loops, faceOf: mesh.faceOf, hull: [], round: false, convex: false, upright: true };
}

/** The heart: a geodesic globe (an icosahedron cut `n` ways, 20 n^2 triangles) pushed out to the surface of a puffed heart, tips down, cleft up. */
function heart(n: number): Parts {
  const { points, faces } = baseSolid("icosahedron");
  const lattice = latticeOf(points, faces, n);
  const { loops, faceOf } = trianglesOf(faces.length, n, lattice.at);
  const sphere = lattice.vertices.map((p) => unit(p));
  const oriented = loops.map((loop) => outward(loop, sphere));
  // Out to the heart along each direction, then into the screen's own axes: x across, y down, z toward the viewer.
  const vertices = sphere.map((d) => heartDirection(d));
  return { kind: "heart", n, vertices, loops: oriented, faceOf, hull: [], round: false, oriented: true, convex: false, upright: true };
}

/** The cells and corners of a shape cut `n` ways. */
export function solidShapeParts(kind: SolidShapeKind, n: number): Parts {
  switch (kind) {
    case "prism":
      return prism(n);
    case "trapezohedron":
      return trapezohedron(n);
    case "dodecahedron":
      return dodecahedron(n);
    case "rhombic-dodecahedron":
      return rhombicDodecahedron(n);
    case "bipyramid":
      return bipyramid(n);
    case "icositetrahedron":
      return icositetrahedron(n);
    case "triacontahedron":
      return triacontahedron(n);
    case "box":
      return box(n);
    case "cross":
      return crossOfCubes(n);
    case "ring":
      return ring(n);
    case "torus":
      return torus(n);
    case "star":
      return star(n);
    case "heart":
      return heart(n);
  }
}
