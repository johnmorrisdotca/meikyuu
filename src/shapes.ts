import { makeGrid, subGrid, type Grid, type MeikyuuShape, type Point, type Side, type Wall } from "./grid.ts";
import { maskOf } from "./masks.ts";

/**
 * THE SHAPES: each is a way to lay cells out and say which touch. Squares, hexagons (pointy side
 * up, every other row shifted), triangles (rows of up and down pointing ones), and circles (rings
 * that gain cells outward) are cell graphs of their own; the rest are those graphs with a
 * shape cut out of them: a heart, a leaf, a star, a ring, a diamond, a cross, a crescent on
 * squares, a hexagon on hexagons and a pyramid on triangles.
 */

const wall = (a: Point, b: Point, r?: number): Wall => (r === undefined ? { a, b } : { a, b, r });

/** Columns by rows of square cells. */
export function squareGrid(w: number, h: number): Grid {
  const centres: Point[] = [];
  const sides: Side[][] = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      centres.push([x + 0.5, y + 0.5]);
      sides.push([
        { to: y > 0 ? (y - 1) * w + x : -1, wall: wall([x, y], [x + 1, y]) },
        { to: x < w - 1 ? y * w + x + 1 : -1, wall: wall([x + 1, y], [x + 1, y + 1]) },
        { to: y < h - 1 ? (y + 1) * w + x : -1, wall: wall([x + 1, y + 1], [x, y + 1]) },
        { to: x > 0 ? y * w + x - 1 : -1, wall: wall([x, y + 1], [x, y]) },
      ]);
    }
  }
  return makeGrid({ shape: "square", w, h, centres, sides, box: { x: 0, y: 0, w, h }, at: (px, py) => (px >= 0 && py >= 0 && px < w && py < h ? Math.floor(py) * w + Math.floor(px) : -1) });
}

const HEX_S = 1 / Math.sqrt(3);

/** Columns by rows of hexagons, pointy side up, every odd row shifted half a cell right. */
export function hexGrid(w: number, h: number): Grid {
  const centreOf = (col: number, row: number): Point => [col + 0.5 + (row & 1 ? 0.5 : 0), HEX_S + row * 1.5 * HEX_S];
  const centres: Point[] = [];
  const sides: Side[][] = [];
  for (let row = 0; row < h; row += 1) {
    for (let col = 0; col < w; col += 1) {
      const [cx, cy] = centreOf(col, row);
      const vertex = (k: number): Point => {
        const angle = ((-30 + 60 * k) * Math.PI) / 180;
        return [cx + HEX_S * Math.cos(angle), cy + HEX_S * Math.sin(angle)];
      };
      const odd = (row & 1) === 1;
      // East, south-east, south-west, west, north-west, north-east.
      const across: [number, number][] = odd
        ? [[col + 1, row], [col + 1, row + 1], [col, row + 1], [col - 1, row], [col, row - 1], [col + 1, row - 1]]
        : [[col + 1, row], [col, row + 1], [col - 1, row + 1], [col - 1, row], [col - 1, row - 1], [col, row - 1]];
      centres.push([cx, cy]);
      sides.push(across.map(([c, r], k) => ({ to: c >= 0 && c < w && r >= 0 && r < h ? r * w + c : -1, wall: wall(vertex(k), vertex(k + 1)) })));
    }
  }
  const at = (px: number, py: number): number => {
    const around = Math.round((py - HEX_S) / (1.5 * HEX_S));
    let best = -1;
    let bestDistance = Infinity;
    for (let row = around - 1; row <= around + 1; row += 1) {
      if (row < 0 || row >= h) continue;
      const first = Math.floor(px - 0.5 - (row & 1 ? 0.5 : 0));
      for (let col = first; col <= first + 1; col += 1) {
        if (col < 0 || col >= w) continue;
        const [cx, cy] = centres[row * w + col]!;
        const d = (cx - px) * (cx - px) + (cy - py) * (cy - py);
        if (d < bestDistance) {
          bestDistance = d;
          best = row * w + col;
        }
      }
    }
    // Further from every middle than a hexagon's corner is: outside the shape.
    return bestDistance <= HEX_S * HEX_S + 1e-9 ? best : -1;
  };
  return makeGrid({ shape: "hex", w, h, centres, sides, box: { x: 0, y: 0, w: h > 1 ? w + 0.5 : w, h: HEX_S * (1.5 * h + 0.5) }, at });
}

const TRI_H = Math.sqrt(3) / 2;

/** Rows of triangles, each pointing up or down in turn, `w` to a row; a cell is up when its column and row make an even number. */
export function triangleGrid(w: number, h: number): Grid {
  const centres: Point[] = [];
  const sides: Side[][] = [];
  const corners: [Point, Point, Point][] = [];
  for (let row = 0; row < h; row += 1) {
    for (let col = 0; col < w; col += 1) {
      const up = (col + row) % 2 === 0;
      const left = col / 2;
      const top = row * TRI_H;
      const bottom = (row + 1) * TRI_H;
      const left3: [Point, Point, Point] = up ? [[left + 0.5, top], [left, bottom], [left + 1, bottom]] : [[left, top], [left + 1, top], [left + 0.5, bottom]];
      corners.push(left3);
      const [p, q, s] = left3;
      centres.push([(p[0] + q[0] + s[0]) / 3, (p[1] + q[1] + s[1]) / 3]);
      const l = col > 0 ? row * w + col - 1 : -1;
      const r = col < w - 1 ? row * w + col + 1 : -1;
      if (up) {
        // Left side, right side, bottom (the cell below is a down-pointing one).
        sides.push([{ to: l, wall: wall(q, p) }, { to: r, wall: wall(p, s) }, { to: row < h - 1 ? (row + 1) * w + col : -1, wall: wall(s, q) }]);
      } else {
        // Left side, right side, top (the cell above is an up-pointing one).
        sides.push([{ to: l, wall: wall(p, s) }, { to: r, wall: wall(q, s) }, { to: row > 0 ? (row - 1) * w + col : -1, wall: wall(p, q) }]);
      }
    }
  }
  const inside = (point: Point, [a, b, c]: [Point, Point, Point]): boolean => {
    const cross = (p: Point, q: Point): number => (q[0] - p[0]) * (point[1] - p[1]) - (q[1] - p[1]) * (point[0] - p[0]);
    const d1 = cross(a, b);
    const d2 = cross(b, c);
    const d3 = cross(c, a);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  };
  const at = (px: number, py: number): number => {
    const row = Math.floor(py / TRI_H);
    if (row < 0 || row >= h) return -1;
    const around = Math.floor(px * 2);
    for (let col = around - 1; col <= around + 1; col += 1) if (col >= 0 && col < w && inside([px, py], corners[row * w + col]!)) return row * w + col;
    return -1;
  };
  return makeGrid({ shape: "triangle", w, h, centres, sides, box: { x: 0, y: 0, w: (w + 1) / 2, h: h * TRI_H }, at });
}

/** How many cells each ring of a circle maze holds: one in the middle, six round it, and a ring doubles its cells when its cells would otherwise be wider than tall. */
export function ringCounts(rings: number): number[] {
  const counts = [1];
  for (let ring = 1; ring < rings; ring += 1) {
    const before = counts[ring - 1]!;
    // round(2π × ring / before), by the fraction 710/113 so that no two engines can disagree on a half.
    const ratio = Math.max(1, Math.floor((1420 * ring + 113 * before) / (226 * before)));
    counts.push(before * ratio);
  }
  return counts;
}

/** A circle maze: `rings` rings round a middle cell, cells running round each ring and out between the rings. */
export function circleGrid(rings: number): Grid {
  const counts = ringCounts(rings);
  const first: number[] = [];
  let total = 0;
  for (const count of counts) {
    first.push(total);
    total += count;
  }
  const angle = (ring: number, index: number): number => -Math.PI / 2 + (2 * Math.PI * index) / counts[ring]!;
  const polar = (radius: number, theta: number): Point => [radius * Math.cos(theta), radius * Math.sin(theta)];
  const centres: Point[] = [];
  const sides: Side[][] = Array.from({ length: total }, () => []);
  for (let ring = 0; ring < rings; ring += 1) {
    const n = counts[ring]!;
    for (let index = 0; index < n; index += 1) {
      const cell = first[ring]! + index;
      const t0 = angle(ring, index);
      const t1 = angle(ring, index + 1);
      const mid = (t0 + t1) / 2;
      centres.push(ring === 0 ? [0, 0] : polar(ring + 0.5, mid));
      const here = sides[cell]!;
      if (ring > 0) {
        // Back along the ring, forward along it, then in toward the middle.
        here.push({ to: first[ring]! + ((index + n - 1) % n), wall: wall(polar(ring + 1, t0), polar(ring, t0)) });
        here.push({ to: first[ring]! + ((index + 1) % n), wall: wall(polar(ring, t1), polar(ring + 1, t1)) });
        here.push({ to: first[ring - 1]! + Math.floor((index * counts[ring - 1]!) / n), wall: wall(polar(ring, t0), polar(ring, t1), ring) });
      }
      // Out: each cell of the next ring that sits on this one, or the edge of the maze.
      if (ring === rings - 1) here.push({ to: -1, wall: wall(polar(ring + 1, t0), polar(ring + 1, t1), ring + 1) });
      else {
        const next = counts[ring + 1]!;
        const per = next / n;
        for (let child = index * per; child < (index + 1) * per; child += 1) here.push({ to: first[ring + 1]! + child, wall: wall(polar(ring + 1, angle(ring + 1, child)), polar(ring + 1, angle(ring + 1, child + 1)), ring + 1) });
      }
    }
  }
  const at = (px: number, py: number): number => {
    const radius = Math.hypot(px, py);
    if (radius >= rings) return -1;
    const ring = Math.floor(radius);
    if (ring === 0) return 0;
    let turn = (Math.atan2(py, px) + Math.PI / 2) / (2 * Math.PI);
    turn -= Math.floor(turn);
    return first[ring]! + Math.min(counts[ring]! - 1, Math.floor(turn * counts[ring]!));
  };
  return makeGrid({ shape: "circle", w: rings, h: rings, centres, sides, box: { x: -rings, y: -rings, w: 2 * rings, h: 2 * rings }, at });
}

/** Every shape cut out of a bigger grid: the grid it is cut from, and the test a cell passes to stay. */
function cut(base: Grid, shape: MeikyuuShape, w: number, h: number, stays: (x: number, y: number, cell: number) => boolean): Grid {
  return subGrid(base, (cell) => stays(base.centres[cell]![0], base.centres[cell]![1], cell), shape, w, h);
}

/** A hexagon of hexagons, `radius` cells from the middle to a side. */
function hexagonGrid(radius: number): Grid {
  const side = 2 * radius + 1;
  const base = hexGrid(side, side);
  return cut(base, "hexagon", radius, radius, (_x, _y, cell) => {
    const col = cell % side;
    const row = Math.floor(cell / side);
    const q = col - (row - (row & 1)) / 2;
    const q0 = radius - (radius - (radius & 1)) / 2;
    const dq = q - q0;
    const dr = row - radius;
    return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) <= radius;
  });
}

/** A big triangle of triangles, `rows` rows tall, one more cell in each row than the one above and then one more again. */
function pyramidGrid(rows: number): Grid {
  // The apex must point up, which a cell does when its column and row make an even number.
  const middle = (rows - 1) % 2 === 0 ? rows - 1 : rows;
  const width = 2 * middle + 1;
  const base = triangleGrid(width, rows);
  return cut(base, "pyramid", rows, rows, (_x, _y, cell) => {
    const col = cell % width;
    const row = Math.floor(cell / width);
    return Math.abs(col - middle) <= row;
  });
}

/** A grid by name. `w` and `h` are columns and rows for squares, hexagons and triangles, and the size of the raster a shape is cut from for the rest (`h` is ignored there); for a circle `w` is the number of rings, and for a hexagon the radius, and for a pyramid the rows. */
export function gridOf(shape: MeikyuuShape, w: number, h: number = w): Grid {
  switch (shape) {
    case "square":
      return squareGrid(w, h);
    case "hex":
      return hexGrid(w, h);
    case "triangle":
      return triangleGrid(w, h);
    case "circle":
      return circleGrid(w);
    case "hexagon":
      return hexagonGrid(w);
    case "pyramid":
      return pyramidGrid(w);
    default: {
      const test = maskOf(shape);
      const base = squareGrid(w, w);
      return cut(base, shape, w, w, (x, y) => test(((x / w) * 2) - 1, ((y / w) * 2) - 1));
    }
  }
}
