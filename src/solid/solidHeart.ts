import type { Vec3 } from "./vec.ts";

/**
 * THE SURFACE OF A PUFFED HEART, as a distance along each direction from a point inside it. The surface is the one the implicit equation
 * `(x^2 + 9/4 y^2 + z^2 - 1)^3 = x^2 z^3 + 9/80 y^2 z^3` draws (x across, y through it, z up), and a ray from a point a little above its middle crosses it once,
 * so a globe of directions pushed out by this distance is a closed heart with the cleft at the top and the tip at the bottom, with no fold in it.
 * Only products, sums and a bisection are used, never a power or a trig function, so the corners come out the same in every engine.
 */

/** Where the rays start: a little above the middle, which is inside the heart and sees all of its surface. */
const ORIGIN_Z = 0.1;
/** The middle of the finished heart's height, taken off so that it sits in the middle of its picture. */
const MIDDLE_Z = 0.03;

function inside(x: number, y: number, z: number): number {
  const q = x * x + 2.25 * y * y + z * z - 1;
  const z3 = z * z * z;
  return q * q * q - x * x * z3 - 0.1125 * y * y * z3;
}

/** The distance along a direction (in the heart's own axes: x across, y through, z up) at which the ray from the origin leaves the heart. */
export function heartReach(dx: number, dy: number, dz: number): number {
  let low = 0;
  let high = 0.02;
  while (inside(high * dx, high * dy, ORIGIN_Z + high * dz) <= 0) {
    low = high;
    high += 0.02;
    if (high > 4) throw new Error("a ray never left the heart");
  }
  for (let step = 0; step < 60; step += 1) {
    const mid = (low + high) / 2;
    if (inside(mid * dx, mid * dy, ORIGIN_Z + mid * dz) <= 0) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** The point of the heart in a direction, in the screen's own axes: x across, y down, z toward the viewer (the heart's front, which is its thickness, `y` in its own). */
export function heartDirection(d: Vec3): Vec3 {
  const t = heartReach(d[0], d[1], d[2]);
  const x = t * d[0];
  const y = t * d[1];
  const z = ORIGIN_Z + t * d[2] - MIDDLE_Z;
  return [x, -z, y];
}
