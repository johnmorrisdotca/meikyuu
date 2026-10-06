import type { SolidGrid } from "./solidGrid.ts";
import { add, cross, dot, scale, sub, unit, type Vec3 } from "./vec.ts";

/**
 * WHERE TO LOOK FROM TO SEE A CELL, for a solid that is not convex: a cell in the hole of a ring, or between two arms of a cross, is hidden from most sides, and when a line
 * runs into it the solid has to turn to a view it can be seen from. That is a fact about the solid and not about how it is turned, so it is found once for a cell, by shooting
 * rays from its middle: the direction nearest the cell's own facing from which nothing of the solid is in the way, in the solid's own axes.
 */

/** A ray from `origin` along `dir` meets a flat polygon of the solid (not the cell `skip`). */
function hits(grid: SolidGrid, origin: Vec3, dir: Vec3, skip: number): boolean {
  for (let cell = 0; cell < grid.cells; cell += 1) {
    if (cell === skip) continue;
    // A cell facing the same way as the ray, or edge-on to it, cannot be in front of the origin looking back along it.
    const facing = dot(grid.normals[cell]!, dir);
    if (facing >= -1e-9) continue;
    const loop = grid.corners[cell]!;
    const a = grid.vertices[loop[0]!]!;
    for (let i = 1; i + 1 < loop.length; i += 1) {
      const b = grid.vertices[loop[i]!]!;
      const c = grid.vertices[loop[i + 1]!]!;
      const e1 = sub(b, a);
      const e2 = sub(c, a);
      const p = cross(dir, e2);
      const det = dot(e1, p);
      if (Math.abs(det) < 1e-12) continue;
      const t = sub(origin, a);
      const u = dot(t, p) / det;
      if (u < -1e-9 || u > 1 + 1e-9) continue;
      const q = cross(t, e1);
      const v = dot(dir, q) / det;
      if (v < -1e-9 || u + v > 1 + 1e-9) continue;
      if (dot(e2, q) / det > 1e-9) return true;
    }
  }
  return false;
}

const REVEALED = new WeakMap<SolidGrid, Map<number, Vec3>>();

/** How far from a cell's own facing a view is tried, in the order tried: none, then a step, then a wider one, round the facing. */
const TILTS = [0, 0.35, 0.6, 0.9, 1.15] as const;
/** How far a ray may stray (radians) and still be clear: the eye is a finite way off, so a direction clear by a hair is not clear from where the viewer is. */
const SLACK = 0.14;
const AROUND = 10;

/**
 * The direction (a way from the solid toward the viewer, in the solid's own axes) from which a cell is seen: its own facing if nothing is in the way, and, if not, the
 * nearest way round it that is clear, tilted up to about 66 degrees off the facing. The facing again if no way is clear (a cell shut in a hole).
 */
export function revealDirection(grid: SolidGrid, cell: number): Vec3 {
  let kept = REVEALED.get(grid);
  if (kept === undefined) {
    kept = new Map();
    REVEALED.set(grid, kept);
  }
  const known = kept.get(cell);
  if (known !== undefined) return known;
  const normal = grid.normals[cell]!;
  const start = add(grid.centres[cell]!, scale(normal, grid.radii[cell]! * 0.05));
  // Two directions across the facing to tilt it toward.
  const across = unit(cross(normal, Math.abs(normal[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
  const along = cross(normal, across);
  let found: Vec3 = normal;
  search: for (const tilt of TILTS) {
    for (let k = 0; k < (tilt === 0 ? 1 : AROUND); k += 1) {
      const turn = (k / AROUND) * 2 * Math.PI;
      const sideways = add(scale(across, Math.cos(turn)), scale(along, Math.sin(turn)));
      const direction = unit(add(scale(normal, Math.cos(tilt)), scale(sideways, Math.sin(tilt))));
      // Clear along the direction and a little either side of it, which is how much of a turn the eye's own distance makes.
      const strays = [across, scale(across, -1), along, scale(along, -1)].map((side) => unit(add(direction, scale(side, SLACK))));
      if (!hits(grid, start, direction, cell) && strays.every((stray) => !hits(grid, start, stray, cell))) {
        found = direction;
        break search;
      }
    }
  }
  kept.set(cell, found);
  return found;
}
