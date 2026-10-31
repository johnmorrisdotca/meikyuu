import { heartDirection } from "./solidHeart.ts";
import type { Parts } from "./solidParts.ts";
import { baseSolid, latticeOf, outward, trianglesOf } from "./solidParts.ts";
import { COS36, Mesh, SIN36, STAR_INNER, starRows } from "./solidShapes.ts";
import { unit, type Vec3 } from "./vec.ts";

/** How far the middle of the torus's tube is from its middle, and how thick the tube is: a ring about two and a half times as wide as the tube is thick. */
const TORUS_ROUND = 1;
const TORUS_TUBE = 0.38;

/**
 * The torus, a doughnut: a tube bent into a ring, `3 n` cells round the ring and `n` round the tube (3 n^2 cells), a cell about as long as it is wide at the outside of the ring
 * and narrower inside the hole. Not a convex solid: the far side of the ring shows through its hole.
 */
export function torus(n: number): Parts {
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
  for (let j = 0; j < n; j += 1)
    for (let i = 0; i < around; i += 1) mesh.add([at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)], 0);
  return {
    kind: "torus",
    n,
    vertices: mesh.vertices,
    loops: mesh.loops,
    faceOf: mesh.faceOf,
    hull: [],
    round: false,
    oriented: true,
    convex: false,
  };
}

/** The star: a five pointed star, tips up, as thick as a little over half the length of a side of its outline (10 n^2 + 10 n h cells for h = `starRows(n)`). */
export function star(n: number): Parts {
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
  const points: Vec3[] = [
    ...outline.map(([x, y]): Vec3 => [x, y, half]),
    ...outline.map(([x, y]): Vec3 => [x, y, -half]),
    [0, 0, half],
    [0, 0, -half],
  ];
  const mesh = new Mesh(points);
  for (let tip = 0; tip < 5; tip += 1) {
    const t = 2 * tip;
    mesh.quad(tip, [20, (t + 9) % 10, t, t + 1], n, n);
    mesh.quad(5 + tip, [21, 10 + ((t + 9) % 10), 10 + t, 10 + t + 1], n, n);
  }
  for (let t = 0; t < 10; t += 1) mesh.quad(10 + t, [t, (t + 1) % 10, 10 + ((t + 1) % 10), 10 + t], n, h);
  return {
    kind: "star",
    n,
    vertices: mesh.vertices,
    loops: mesh.loops,
    faceOf: mesh.faceOf,
    hull: [],
    round: false,
    convex: false,
    upright: true,
  };
}

/** The heart: a geodesic globe (an icosahedron cut `n` ways, 20 n^2 triangles) pushed out to the surface of a puffed heart, tips down, cleft up. */
export function heart(n: number): Parts {
  const { points, faces } = baseSolid("icosahedron");
  const lattice = latticeOf(points, faces, n);
  const { loops, faceOf } = trianglesOf(faces.length, n, lattice.at);
  const sphere = lattice.vertices.map((p) => unit(p));
  const oriented = loops.map((loop) => outward(loop, sphere));
  // Out to the heart along each direction, then into the screen's own axes: x across, y down, z toward the viewer.
  const vertices = sphere.map((d) => heartDirection(d));
  return {
    kind: "heart",
    n,
    vertices,
    loops: oriented,
    faceOf,
    hull: [],
    round: false,
    oriented: true,
    convex: false,
    upright: true,
  };
}
