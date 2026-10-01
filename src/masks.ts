import type { MeikyuuShape } from "./grid.ts";

/**
 * THE OUTLINES cut out of a square raster: a function from a point of the square (both
 * numbers from -1 to 1, y down) to whether that point is inside the shape. A maze takes
 * the cells whose middles are inside, and the biggest piece of them that touch.
 */
export type Mask = (u: number, v: number) => boolean;

/** Whether the point is inside the polygon (the even-odd rule). */
function inPolygon(u: number, v: number, polygon: readonly (readonly [number, number])[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i]!;
    const [xj, yj] = polygon[j]!;
    if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** A five pointed star, one point up. */
const STAR: readonly (readonly [number, number])[] = Array.from({ length: 10 }, (_, k) => {
  const angle = -Math.PI / 2 + (k * Math.PI) / 5;
  const radius = k % 2 === 0 ? 1 : 0.5;
  return [radius * Math.cos(angle), radius * Math.sin(angle)] as const;
});

const MASKS: Partial<Record<MeikyuuShape, Mask>> = {
  // The heart curve (x² + y² − 1)³ = x²y³, with y up, fitted to the square.
  heart: (u, v) => {
    const x = u * 1.22;
    const y = -v * 1.2 + 0.12;
    return (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0;
  },
  // A leaf: a lens along the diagonal, with a stem at its lower left.
  leaf: (u, v) => {
    const along = (u - v) / Math.SQRT2 / 0.98;
    const across = (u + v) / Math.SQRT2;
    const lens = Math.abs(across) <= 0.5 * (1 - along * along) && Math.abs(along) <= 1;
    const stem = Math.abs(across) <= 0.07 && along < -0.8 && along > -1.3;
    const midrib = false;
    return lens || stem || midrib;
  },
  star: (u, v) => inPolygon(u, v + 0.06, STAR),
  ring: (u, v) => {
    const r = Math.hypot(u, v);
    return r <= 1 && r >= 0.52;
  },
  diamond: (u, v) => Math.abs(u) + Math.abs(v) <= 1,
  cross: (u, v) => Math.abs(u) <= 0.36 || Math.abs(v) <= 0.36,
  // A crescent: the disc less a smaller disc pushed to one side.
  moon: (u, v) => Math.hypot(u, v) <= 1 && Math.hypot(u - 0.45, v + 0.1) > 0.78,
};

/** The outline a raster shape is cut with. */
export function maskOf(shape: MeikyuuShape): Mask {
  const mask = MASKS[shape];
  if (mask === undefined) throw new Error(`${shape} is not cut out of a square raster`);
  return mask;
}
