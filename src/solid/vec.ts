/**
 * THE ARITHMETIC OF TURNING A SOLID: three-dimensional points and the quaternions that turn them. Plain numbers and tuples, no classes, nothing
 * allocated that a frame could avoid, and nothing here reads a page.
 *
 * The coordinates are the screen's: x to the right, y down the screen, z toward the person looking. A quaternion is `[x, y, z, w]` and turns a
 * point by `quatTurn`; the algebra is the same in any handedness, so what a drag does is decided only by which two points it is asked to carry
 * one onto the other (`quatBetween`).
 */

/** A point or a direction in three dimensions. */
export type Vec3 = readonly [number, number, number];

/** A rotation: `[x, y, z, w]`, of length one. */
export type Quat = readonly [number, number, number, number];

/** The rotation that does nothing. */
export const QUAT_IDENTITY: Quat = [0, 0, 0, 1];

export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
// Square roots and the four sums are exact in every engine (Math.hypot is not), so the cells of a solid are the same numbers everywhere.
export const length = (a: Vec3): number => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
export const distance = (a: Vec3, b: Vec3): number => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
/** The square of the distance: the cheapest way to say which of two points is nearer. */
export const distanceSquared = (a: Vec3, b: Vec3): number => (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]) + (a[2] - b[2]) * (a[2] - b[2]);

/** The direction of a vector, of length one; the zero vector stays zero. */
export function unit(a: Vec3): Vec3 {
  const l = length(a);
  return l < 1e-12 ? [0, 0, 0] : [a[0] / l, a[1] / l, a[2] / l];
}

/** The middle of some points. */
export function mean(points: readonly Vec3[]): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of points) {
    x += p[0];
    y += p[1];
    z += p[2];
  }
  const n = points.length || 1;
  return [x / n, y / n, z / n];
}

/** Two rotations in turn: `b` after `a`. */
export function quatMul(b: Quat, a: Quat): Quat {
  const [bx, by, bz, bw] = b;
  const [ax, ay, az, aw] = a;
  return [bw * ax + bx * aw + by * az - bz * ay, bw * ay - bx * az + by * aw + bz * ax, bw * az + bx * ay - by * ax + bz * aw, bw * aw - bx * ax - by * ay - bz * az];
}

/** A rotation made one again: the turns a drag adds up carry a little error, which this takes out. */
export function quatNormalize(q: Quat): Quat {
  const l = Math.hypot(q[0], q[1], q[2], q[3]);
  return l < 1e-12 ? QUAT_IDENTITY : [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}

/** The turn of `angle` radians about an axis (any length but nought). */
export function quatAxisAngle(axis: Vec3, angle: number): Quat {
  const [x, y, z] = unit(axis);
  const s = Math.sin(angle / 2);
  return [x * s, y * s, z * s, Math.cos(angle / 2)];
}

/** The shortest turn that carries the direction `a` onto the direction `b`. */
export function quatBetween(a: Vec3, b: Vec3): Quat {
  const from = unit(a);
  const to = unit(b);
  const d = dot(from, to);
  if (d < -0.999999) {
    // Opposite: any turn of a half circle about an axis across `a` will do.
    const across = Math.abs(from[0]) < 0.9 ? cross(from, [1, 0, 0]) : cross(from, [0, 1, 0]);
    return quatAxisAngle(across, Math.PI);
  }
  const c = cross(from, to);
  return quatNormalize([c[0], c[1], c[2], 1 + d]);
}

/** A point turned. */
export function quatTurn(q: Quat, p: Vec3): Vec3 {
  const [qx, qy, qz, qw] = q;
  // p + 2w(q x p) + 2 q x (q x p)
  const tx = 2 * (qy * p[2] - qz * p[1]);
  const ty = 2 * (qz * p[0] - qx * p[2]);
  const tz = 2 * (qx * p[1] - qy * p[0]);
  return [p[0] + qw * tx + (qy * tz - qz * ty), p[1] + qw * ty + (qz * tx - qx * tz), p[2] + qw * tz + (qx * ty - qy * tx)];
}

/** The turn as a 3 by 3 matrix, row by row, so that a frame turns many points without redoing the algebra for each. */
export function quatMatrix(q: Quat): readonly number[] {
  const [x, y, z, w] = q;
  return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
}

/** Halfway (or any share) from one rotation to another along the shortest way. */
export function quatSlerp(a: Quat, b: Quat, t: number): Quat {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let to: Quat = b;
  if (d < 0) {
    d = -d;
    to = [-b[0], -b[1], -b[2], -b[3]];
  }
  if (d > 0.9995) return quatNormalize([a[0] + (to[0] - a[0]) * t, a[1] + (to[1] - a[1]) * t, a[2] + (to[2] - a[2]) * t, a[3] + (to[3] - a[3]) * t]);
  const angle = Math.acos(Math.min(1, d));
  const sa = Math.sin((1 - t) * angle) / Math.sin(angle);
  const sb = Math.sin(t * angle) / Math.sin(angle);
  return [a[0] * sa + to[0] * sb, a[1] * sa + to[1] * sb, a[2] * sa + to[2] * sb, a[3] * sa + to[3] * sb];
}

/** How far apart two rotations are, in radians, from 0 to pi. */
export function quatAngle(a: Quat, b: Quat): number {
  const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, d));
}
