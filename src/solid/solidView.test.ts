import { describe, expect, it } from "vitest";

import { seededRandom } from "../random.ts";
import { SOLID_KINDS, solidGridOf, type SolidGrid, type SolidKind } from "./solidGrid.ts";
import { cellsAlongDrag, createFrame, dragTurn, edgeTurn, EDGE_SAFE, faceCellTurn, openingTurn, pickCell, projectFrame, stepTurn, trackballPoint } from "./solidView.ts";
import { dot, quatAxisAngle, quatBetween, quatMul, quatTurn, QUAT_IDENTITY, type Quat, type Vec3 } from "./vec.ts";

const SIZES: Record<SolidKind, number> = { cube: 4, sphere: 3, tetrahedron: 4, octahedron: 3, icosahedron: 2 };
const W = 360;
const H = 300;

function randomTurn(random: () => number): Quat {
  const [x, y, z, w] = [random() - 0.5, random() - 0.5, random() - 0.5, random() - 0.5];
  const l = Math.hypot(x, y, z, w) || 1;
  return [x / l, y / l, z / l, w / l];
}

/**
 * An independent way to say which cell a point is on: a ray from the eye through the point, tested against each cell's polygon in three dimensions
 * (the plane of its corners, then whether the hit is inside, by its fan of triangles). Nothing here reads the projected outlines.
 */
function byRay(grid: SolidGrid, q: Quat, frame: { scale: number; eye: number }, x: number, y: number): number {
  const eye = frame.eye;
  const u = (x - W / 2) / frame.scale;
  const v = (y - H / 2) / frame.scale;
  // The ray: the points (u (eye - z) / eye, v (eye - z) / eye, z) for z below the eye.
  const E: Vec3 = [0, 0, eye];
  const D: Vec3 = [u, v, -eye]; // from the eye to the point at z = 0, scaled by 1 / eye below
  let best = -1;
  let bestT = Infinity;
  for (let cell = 0; cell < grid.cells; cell += 1) {
    const corners = grid.corners[cell]!.map((c) => quatTurn(q, grid.vertices[c]!));
    const p0 = corners[0]!;
    for (let k = 1; k + 1 < corners.length; k += 1) {
      const p1 = corners[k]!;
      const p2 = corners[k + 1]!;
      // Moller-Trumbore, both ways round.
      const e1: Vec3 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
      const e2: Vec3 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
      const h: Vec3 = [D[1] * e2[2] - D[2] * e2[1], D[2] * e2[0] - D[0] * e2[2], D[0] * e2[1] - D[1] * e2[0]];
      const a = dot(e1, h);
      if (Math.abs(a) < 1e-12) continue;
      const f = 1 / a;
      const s: Vec3 = [E[0] - p0[0], E[1] - p0[1], E[2] - p0[2]];
      const uu = f * dot(s, h);
      if (uu < 0 || uu > 1) continue;
      const qv: Vec3 = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
      const vv = f * dot(D, qv);
      if (vv < 0 || uu + vv > 1) continue;
      const t = f * dot(e2, qv);
      if (t > 0 && t < bestT) {
        bestT = t;
        best = cell;
      }
    }
  }
  return best;
}

/** How far a point is from the nearest edge of a cell's outline, in pixels. */
function nearEdge(grid: SolidGrid, frame: ReturnType<typeof createFrame>, cell: number, x: number, y: number): number {
  const loop = grid.corners[cell]!;
  let least = Infinity;
  for (let i = 0; i < loop.length; i += 1) {
    const a = loop[i]!;
    const b = loop[(i + 1) % loop.length]!;
    const ax = frame.sx[a]!;
    const ay = frame.sy[a]!;
    const dx = frame.sx[b]! - ax;
    const dy = frame.sy[b]! - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    least = Math.min(least, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return least;
}

describe("looking at a solid", () => {
  for (const kind of SOLID_KINDS) {
    const grid = solidGridOf(kind, SIZES[kind]);

    it(`${kind}: a cell is on the near side exactly when it faces the eye`, () => {
      const random = seededRandom(7);
      const frame = createFrame(grid);
      for (let trial = 0; trial < 12; trial += 1) {
        const q = randomTurn(random);
        projectFrame(frame, grid, q, 1, W, H);
        for (let cell = 0; cell < grid.cells; cell += 1) {
          const centre = quatTurn(q, grid.centres[cell]!);
          const normal = quatTurn(q, grid.normals[cell]!);
          const toEye: Vec3 = [-centre[0], -centre[1], frame.eye - centre[2]];
          // A flat cell faces the eye when its plane's normal does; a globe's cell is judged by its own polygon, the very thing drawn.
          const corners = grid.corners[cell]!.map((c) => quatTurn(q, grid.vertices[c]!));
          const flat = [0, 0, 0] as [number, number, number];
          for (let i = 0; i < corners.length; i += 1) {
            const a = corners[i]!;
            const b = corners[(i + 1) % corners.length]!;
            flat[0] += (a[1] - b[1]) * (a[2] + b[2]);
            flat[1] += (a[2] - b[2]) * (a[0] + b[0]);
            flat[2] += (a[0] - b[0]) * (a[1] + b[1]);
          }
          const facesEye = dot(flat, toEye) > 0;
          if (Math.abs(dot(flat, toEye)) < 1e-9) continue;
          // A globe's cell near the limb is left out whatever way round it runs.
          if (kind === "sphere" && (frame.facing[cell]! < 0.25 || !facesEye)) continue;
          expect(frame.visible[cell] === 1, `${kind} cell ${cell}`).toBe(facesEye);
          if (!parts(kind).round) expect(dot(normal, toEye) > 0).toBe(facesEye);
        }
      }
    });

    it(`${kind}: every cell on the near side is hit at its middle, and by no other cell`, () => {
      const random = seededRandom(11);
      const frame = createFrame(grid);
      for (let trial = 0; trial < 6; trial += 1) {
        projectFrame(frame, grid, randomTurn(random), 1, W, H);
        for (let at = 0; at < frame.count; at += 1) {
          const cell = frame.near[at]!;
          // The middle of the outline, not of the cell in space: the outline's own centre is inside a convex polygon.
          const loop = grid.corners[cell]!;
          let x = 0;
          let y = 0;
          for (const c of loop) {
            x += frame.sx[c]!;
            y += frame.sy[c]!;
          }
          expect(pickCell(frame, grid, x / loop.length, y / loop.length)).toBe(cell);
        }
      }
    });

    it(`${kind}: a point picks the very cell a ray from the eye through it hits, everywhere but on the line between two cells`, () => {
      const random = seededRandom(23);
      const frame = createFrame(grid);
      let hit = 0;
      for (let trial = 0; trial < 4; trial += 1) {
        const q = randomTurn(random);
        projectFrame(frame, grid, q, 1, W, H);
        for (let i = 0; i < 300; i += 1) {
          const x = random() * W;
          const y = random() * H;
          const picked = pickCell(frame, grid, x, y);
          const ray = byRay(grid, q, frame, x, y);
          if (picked !== ray) {
            // Only allowed where the point is on the line between the two, to within a hair.
            expect(picked >= 0 && ray >= 0 ? Math.min(nearEdge(grid, frame, picked, x, y), nearEdge(grid, frame, ray, x, y)) : 0, `${kind} at ${x.toFixed(2)},${y.toFixed(2)}: picked ${picked}, ray ${ray}`).toBeLessThan(1e-6);
          } else if (picked >= 0) hit += 1;
        }
      }
      expect(hit).toBeGreaterThan(100);
    });

    it(`${kind}: the outline fits the box at any turn, and a point outside it picks nothing`, () => {
      const random = seededRandom(31);
      const frame = createFrame(grid);
      for (let trial = 0; trial < 10; trial += 1) {
        projectFrame(frame, grid, randomTurn(random), 1, W, H);
        for (let v = 0; v < grid.vertices.length; v += 1) {
          expect(frame.sx[v]).toBeGreaterThanOrEqual(W / 2 - H / 2 - 1);
          expect(frame.sx[v]).toBeLessThanOrEqual(W / 2 + H / 2 + 1);
          expect(frame.sy[v]).toBeGreaterThanOrEqual(-1);
          expect(frame.sy[v]).toBeLessThanOrEqual(H + 1);
        }
        expect(pickCell(frame, grid, 1, 1)).toBe(-1);
        expect(pickCell(frame, grid, W - 1, H - 1)).toBe(-1);
      }
    });
  }

  it("turning does not change which cell is which: a cell's centre is hit at the same cell before and after a round trip of turns", () => {
    const grid = solidGridOf("cube", 4);
    const frame = createFrame(grid);
    const q0 = openingTurn(grid, 5);
    projectFrame(frame, grid, q0, 1, W, H);
    const before = pickCell(frame, grid, frame.cx[5]!, frame.cy[5]!);
    const q1 = stepTurn(stepTurn(q0, 1.1, 0.3), -1.1, -0.3);
    projectFrame(frame, grid, q1, 1, W, H);
    expect(before).toBe(5);
    expect(pickCell(frame, grid, frame.cx[5]!, frame.cy[5]!)).toBe(5);
  });

  it("a cell brought round to face the viewer faces it squarely, with a side of it level", () => {
    const random = seededRandom(5);
    for (const kind of SOLID_KINDS) {
      const grid = solidGridOf(kind, SIZES[kind]);
      for (let trial = 0; trial < 8; trial += 1) {
        const cell = Math.floor(random() * grid.cells);
        const q = faceCellTurn(grid, randomTurn(random), cell);
        const n = quatTurn(q, grid.normals[cell]!);
        expect(n[2]).toBeCloseTo(1, 6);
        const loop = grid.corners[cell]!;
        const a = quatTurn(q, grid.vertices[loop[0]!]!);
        const b = quatTurn(q, grid.vertices[loop[1]!]!);
        const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
        const share = (2 * Math.PI) / loop.length;
        const away = Math.abs(angle / share - Math.round(angle / share));
        expect(away, `${kind} cell ${cell}`).toBeLessThan(1e-6);
      }
    }
  });

  it("a cell at the edge of a cube's face is faced with the faces over the edge in view, a cell in the middle of a face squarely, and a corner with its three faces", () => {
    const grid = solidGridOf("cube", 5);
    const facing = (cell: number): number[] => {
      const q = faceCellTurn(grid, QUAT_IDENTITY, cell, true);
      return [cell, ...grid.neighbours[cell]!].map((c) => quatTurn(q, grid.normals[c]!)[2]!);
    };
    // Cell 12 is the middle of the first face; 2 is on the face's edge; 0 is at its corner.
    expect(Math.min(...facing(12))).toBeCloseTo(1, 6);
    expect(Math.min(...facing(2))).toBeGreaterThan(0.6);
    expect(Math.min(...facing(0))).toBeGreaterThan(0.5);
  });

  it("a drag carries the point of the solid under the finger to under the finger", () => {
    const grid = solidGridOf("sphere", 3);
    const frame = createFrame(grid);
    const q = openingTurn(grid, 3);
    projectFrame(frame, grid, q, 1, W, H);
    const from: [number, number] = [W / 2 + 20, H / 2 - 10];
    const to: [number, number] = [W / 2 - 35, H / 2 + 40];
    const a = trackballPoint(frame, from[0], from[1]);
    const next = dragTurn(frame, q, from, to);
    // The point of the trackball under the first position, carried by the turn between the two, lands at the second.
    const landed = quatTurn(quatBetween(a, trackballPoint(frame, to[0], to[1])), a);
    const want = trackballPoint(frame, to[0], to[1]);
    for (let i = 0; i < 3; i += 1) expect(landed[i]).toBeCloseTo(want[i]!, 6);
    expect(next).not.toEqual(q);
  });

  it("a line's end near the edge of the near side makes the solid turn toward it, and one well inside makes it keep still", () => {
    const grid = solidGridOf("cube", 4);
    const links = grid.neighbours.map((row) => row.slice(0, 0));
    // A cell whose normal is turned well away from the viewer.
    const away = quatAxisAngle([0, 1, 0], 1.3);
    const n = quatTurn(away, grid.normals[0]!);
    expect(n[2]).toBeLessThan(EDGE_SAFE);
    const turned = edgeTurn(grid, links, away, 0, 0.1);
    expect(turned).not.toBeNull();
    expect(quatTurn(turned!, grid.normals[0]!)[2]).toBeGreaterThan(n[2]);
    // Faced squarely: nothing to do.
    expect(edgeTurn(grid, links, faceCellTurn(grid, QUAT_IDENTITY, 0), 0, 0.1)).toBeNull();
  });

  it("a line at the edge of a face, with the next face round the corner, turns the solid until both are in view, then stops", () => {
    const grid = solidGridOf("cube", 5);
    // The head faces the viewer squarely, and a passage leads over the edge to a cell that is edge-on: the case a facing test alone misses.
    const head = 2;
    const over = grid.neighbours[head]!.find((c) => grid.faceOf[c] !== grid.faceOf[head])!;
    const links = grid.neighbours.map((row, cell) => (cell === head ? [over] : []));
    let q = faceCellTurn(grid, QUAT_IDENTITY, head);
    expect(quatTurn(q, grid.normals[over]!)[2]).toBeLessThan(0.01);
    let turns = 0;
    for (let next = edgeTurn(grid, links, q, head, 1 / 60); next !== null && turns < 600; next = edgeTurn(grid, links, q, head, 1 / 60)) {
      q = next;
      turns += 1;
    }
    expect(turns).toBeGreaterThan(5);
    expect(turns).toBeLessThan(120);
    expect(quatTurn(q, grid.normals[over]!)[2]).toBeGreaterThanOrEqual(0.49);
    expect(quatTurn(q, grid.normals[head]!)[2]).toBeGreaterThanOrEqual(0.49);
  });

  it("a drag along a face crosses its cells one after another, each next to the last", () => {
    const grid = solidGridOf("cube", 10);
    const frame = createFrame(grid);
    projectFrame(frame, grid, faceCellTurn(grid, QUAT_IDENTITY, 34), 1, W, H);
    const cells = cellsAlongDrag(frame, grid, [W / 2 - 100, H / 2 - 4], [W / 2 + 100, H / 2 - 4]);
    expect(cells.length).toBeGreaterThan(4);
    for (let i = 1; i < cells.length; i += 1) expect(grid.neighbours[cells[i - 1]!]).toContain(cells[i]);
  });

  it("zoomed in, the solid is bigger and the same cell is still hit at its middle", () => {
    const grid = solidGridOf("octahedron", 3);
    const frame = createFrame(grid);
    const q = openingTurn(grid, 4);
    projectFrame(frame, grid, q, 1, W, H);
    const small = frame.scale;
    projectFrame(frame, grid, q, 2, W, H);
    expect(frame.scale).toBeCloseTo(small * 2, 9);
    expect(pickCell(frame, grid, frame.cx[4]!, frame.cy[4]!)).toBe(4);
  });

  it("a rotation composed with its opposite is the identity (the trackball does not drift)", () => {
    const q = quatMul(quatAxisAngle([1, 2, 3], 0.7), quatAxisAngle([-1, 0, 2], -0.3));
    const back = quatMul(quatAxisAngle([-1, 0, 2], 0.3), quatMul(quatAxisAngle([1, 2, 3], -0.7), q));
    expect(Math.abs(back[3])).toBeCloseTo(1, 9);
  });
});

function parts(kind: SolidKind): { round: boolean } {
  return { round: kind === "sphere" };
}
