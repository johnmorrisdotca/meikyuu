import type { SolidGrid } from "./solidGrid.ts";
import { revealDirection } from "./solidReveal.ts";
import { quatAxisAngle, quatBetween, quatMatrix, quatMul, quatNormalize, quatTurn, type Quat, type Vec3 } from "./vec.ts";

/**
 * LOOKING AT A SOLID: where every corner and every cell lands on a flat picture when the solid is turned, which cells are on the near side, which
 * cell a point of the picture is on, and the turns that bring a cell round to face the viewer. Pure arithmetic over typed arrays, made once for a
 * solid and reused for every frame, so that turning a solid of a thousand cells costs a few thousand multiplications and allocates nothing.
 *
 * THE PICTURE. The solid is turned by a quaternion, then looked at from a point on the z axis a few times its reach away (a gentle perspective), and
 * drawn at the size that makes its outline just fit the box: the scale is worked out from how far the solid's own corners reach on the picture, so a
 * cube seen face on fills the box and a cube seen along its diagonal is smaller, and a globe is the same size however it is turned. The picture's
 * y runs down the screen and its z toward the person looking.
 *
 * THE NEAR SIDE. A cell is on the near side when its outline, as drawn, runs the right way round: the sum of `(x_i - x_{i+1})(y_i + y_{i+1})` over its
 * corners is positive. That is the cell facing the eye, in perspective as in a flat view, and it needs no normal. Only those cells are drawn,
 * and only those can be touched.
 *
 * WHICH CELL A POINT IS ON, EXACTLY. A cell is hit by a point when the point is inside the outline the cell is drawn with, so what a finger lands
 * on is what the eye saw it land on, by construction and not by a second calculation that could disagree. Where a point is on the line between
 * two cells, the cell with the lower number wins. `solidView.test.ts` checks it against an independent method: a ray from the eye through the point,
 * tested against the cell's polygon in three dimensions.
 */

/** How far the eye is from the middle of the solid, in times its reach. */
export const SOLID_EYE = 6;
/** The share of the box the solid's outline fills at most. */
export const SOLID_FILL = 0.94;
/** How far in and out the picture can be zoomed, as a multiple of the fitted size: in to six, so that a cell of a colossal solid (about six pixels across when the whole solid is in the box) is a finger wide (about 24) at four and has room beyond. */
export const SOLID_ZOOM_LEAST = 0.6;
export const SOLID_ZOOM_MOST = 6;

/** The least a globe's cell faces the viewer to be drawn, and to be touched. */
const ROUND_LIMB = 0.2;

/** Where a solid is, as a picture of a given size: the turn, the zoom, and every corner and cell as it lands. */
export type SolidFrame = {
  width: number;
  height: number;
  q: Quat;
  zoom: number;
  /** Pixels to a unit of the solid's own, before perspective. */
  scale: number;
  /** The distance of the eye from the middle, in the solid's units. */
  readonly eye: number;
  /** Each corner on the picture, and how far it is toward the viewer. */
  readonly sx: Float64Array;
  readonly sy: Float64Array;
  readonly sz: Float64Array;
  /** Each cell's middle on the picture, and how far toward the viewer. */
  readonly cx: Float64Array;
  readonly cy: Float64Array;
  readonly cz: Float64Array;
  /** How squarely each cell faces the viewer: the turned normal's z, from -1 to 1. */
  readonly facing: Float64Array;
  /** Each cell's turned normal. */
  readonly nx: Float64Array;
  readonly ny: Float64Array;
  /** 1 for a cell on the near side (it faces the eye). On a solid that is not convex it may still be hidden by another part: see `cellSeen`. */
  readonly visible: Uint8Array;
  /** The cells on the near side that are in the picture (not wholly out of it, where it is zoomed in), the first `count` of them. */
  readonly near: Int32Array;
  count: number;
  /** 1 for a cell in `near`: on the near side and in the picture. A cell on the near side and out of the picture (visible but not shown) is not painted, picked or looked up. */
  readonly shown: Uint8Array;
  /** For a solid that is not convex: the cells on the near side from the farthest to the nearest, the order to paint them in (the first `count` of them; empty for a convex solid, which needs none). */
  readonly order: Int32Array;
  /** Whether each cell is seen (1) or hidden behind another part (2), found the first time it is asked (0 until then): see `cellSeen`. */
  readonly seen: Uint8Array;
  /** About how many pixels across a cell is on the near side, for stepping along a drag. */
  cellPixels: number;
};

/** Room for a frame of a solid. */
export function createFrame(grid: SolidGrid): SolidFrame {
  const vertices = grid.vertices.length;
  const cells = grid.cells;
  return {
    width: 1,
    height: 1,
    q: [0, 0, 0, 1],
    zoom: 1,
    scale: 1,
    eye: SOLID_EYE * grid.reach,
    sx: new Float64Array(vertices),
    sy: new Float64Array(vertices),
    sz: new Float64Array(vertices),
    cx: new Float64Array(cells),
    cy: new Float64Array(cells),
    cz: new Float64Array(cells),
    facing: new Float64Array(cells),
    nx: new Float64Array(cells),
    ny: new Float64Array(cells),
    visible: new Uint8Array(cells),
    near: new Int32Array(cells),
    count: 0,
    shown: new Uint8Array(cells),
    order: new Int32Array(grid.convex ? 0 : cells),
    seen: new Uint8Array(grid.convex ? 0 : cells),
    cellPixels: 1,
  };
}

/** How far outside the picture a cell may lie and still be drawn, in pixels: room for the width of a wall or a line and a cell's mark that is over the edge. */
const MARGIN = 24;

/** How far the solid's outline reaches from the middle of the picture, in the solid's units after perspective, for the turn `m`. */
function reachOf(grid: SolidGrid, m: readonly number[], eye: number): number {
  // A globe, and a solid that is not convex (which has no few corners to say how far it reaches), fit a circle: the same size however it is turned.
  if (grid.round || !grid.convex) return (grid.reach * eye) / Math.sqrt(eye * eye - grid.reach * grid.reach);
  let most = 0;
  for (const [x, y, z] of grid.hull) {
    const px = m[0]! * x + m[1]! * y + m[2]! * z;
    const py = m[3]! * x + m[4]! * y + m[5]! * z;
    const pz = m[6]! * x + m[7]! * y + m[8]! * z;
    const k = eye / (eye - pz);
    most = Math.max(most, Math.abs(px * k), Math.abs(py * k));
  }
  return most;
}

/** Put the solid, turned by `q` and zoomed, on a picture `width` by `height`: fills every array of the frame. */
export function projectFrame(frame: SolidFrame, grid: SolidGrid, q: Quat, zoom: number, width: number, height: number): SolidFrame {
  const m = quatMatrix(q);
  const eye = frame.eye;
  const fit = (Math.min(width, height) / 2) * SOLID_FILL;
  const scale = (fit / reachOf(grid, m, eye)) * zoom;
  const middleX = width / 2;
  const middleY = height / 2;
  const { vertices, centres, normals, corners } = grid;
  for (let v = 0; v < vertices.length; v += 1) {
    const [x, y, z] = vertices[v]!;
    const px = m[0]! * x + m[1]! * y + m[2]! * z;
    const py = m[3]! * x + m[4]! * y + m[5]! * z;
    const pz = m[6]! * x + m[7]! * y + m[8]! * z;
    const k = (eye / (eye - pz)) * scale;
    frame.sx[v] = middleX + px * k;
    frame.sy[v] = middleY + py * k;
    frame.sz[v] = pz;
  }
  let count = 0;
  let sizes = 0;
  let squarely = 0;
  let allSizes = 0;
  for (let cell = 0; cell < grid.cells; cell += 1) {
    const loop = corners[cell]!;
    // The outline runs the right way round (the shoelace sum is positive) when the cell faces the eye.
    let sum = 0;
    for (let i = 0; i < loop.length; i += 1) {
      const a = loop[i]!;
      const b = loop[i + 1 === loop.length ? 0 : i + 1]!;
      sum += (frame.sx[a]! - frame.sx[b]!) * (frame.sy[a]! + frame.sy[b]!);
    }
    const [x, y, z] = centres[cell]!;
    const px = m[0]! * x + m[1]! * y + m[2]! * z;
    const py = m[3]! * x + m[4]! * y + m[5]! * z;
    const pz = m[6]! * x + m[7]! * y + m[8]! * z;
    const k = (eye / (eye - pz)) * scale;
    frame.cx[cell] = middleX + px * k;
    frame.cy[cell] = middleY + py * k;
    frame.cz[cell] = pz;
    const [ux, uy, uz] = normals[cell]!;
    frame.nx[cell] = m[0]! * ux + m[1]! * uy + m[2]! * uz;
    frame.ny[cell] = m[3]! * ux + m[4]! * uy + m[5]! * uz;
    frame.facing[cell] = m[6]! * ux + m[7]! * uy + m[8]! * uz;
    // A globe's cell is a flat polygon through four to six points that do not lie in one plane; seen edge-on it folds over itself, so the limb is left out (a cell at an angle of 78 degrees or more from the viewer).
    frame.shown[cell] = 0;
    if (sum > 0 && !(grid.round && frame.facing[cell]! < ROUND_LIMB)) {
      frame.visible[cell] = 1;
      // Zoomed in, most of a big solid is out of the picture: a cell wholly outside it (by a margin, so that a line or a wall just over the edge is still drawn) is left alone.
      let left = Infinity;
      let right = -Infinity;
      let top = Infinity;
      let bottom = -Infinity;
      for (let i = 0; i < loop.length; i += 1) {
        const px = frame.sx[loop[i]!]!;
        const py = frame.sy[loop[i]!]!;
        if (px < left) left = px;
        if (px > right) right = px;
        if (py < top) top = py;
        if (py > bottom) bottom = py;
      }
      if (right < -MARGIN || left > width + MARGIN || bottom < -MARGIN || top > height + MARGIN) continue;
      frame.shown[cell] = 1;
      frame.near[count] = cell;
      count += 1;
      const across = Math.sqrt(sum / 2);
      allSizes += across;
      if (frame.facing[cell]! > 0.6) {
        sizes += across;
        squarely += 1;
      }
    } else frame.visible[cell] = 0;
  }
  if (!grid.convex) {
    // Back to front: the order to paint them in. Sorted by the depth of the middle, which is right for cells as small as these are.
    const order = frame.order.subarray(0, count);
    order.set(frame.near.subarray(0, count));
    order.sort((a, b) => frame.cz[a]! - frame.cz[b]! || a - b);
    frame.seen.fill(0);
  }
  frame.width = width;
  frame.height = height;
  frame.q = q;
  frame.zoom = zoom;
  frame.scale = scale;
  frame.count = count;
  frame.cellPixels = squarely > 0 ? Math.max(1, sizes / squarely) : count > 0 ? Math.max(1, allSizes / count) : 1;
  return frame;
}

/** How far toward the viewer the surface of a cell is at a point of the picture inside it: the depth of its corners carried across its flat face. */
function depthAt(frame: SolidFrame, grid: SolidGrid, cell: number, x: number, y: number): number {
  const loop = grid.corners[cell]!;
  const a = loop[0]!;
  const b = loop[1]!;
  const c = loop[2]!;
  const ux = frame.sx[b]! - frame.sx[a]!;
  const uy = frame.sy[b]! - frame.sy[a]!;
  const vx = frame.sx[c]! - frame.sx[a]!;
  const vy = frame.sy[c]! - frame.sy[a]!;
  const det = ux * vy - uy * vx;
  if (Math.abs(det) < 1e-9) return frame.cz[cell]!;
  const px = x - frame.sx[a]!;
  const py = y - frame.sy[a]!;
  const s = (px * vy - py * vx) / det;
  const t = (ux * py - uy * px) / det;
  return frame.sz[a]! + s * (frame.sz[b]! - frame.sz[a]!) + t * (frame.sz[c]! - frame.sz[a]!);
}

/**
 * The cell the point `(x, y)` of the picture is on, or -1 for none. The point is on a cell when it is inside the outline the cell is drawn with;
 * a point on the line between two cells is on the lower numbered. Where outlines overlap (they do not on a convex solid, but a flattened globe's might at the very
 * edge, and a star, a cross or a heart has parts in front of parts) the cell nearest the viewer at that point wins.
 */
export function pickCell(frame: SolidFrame, grid: SolidGrid, x: number, y: number): number {
  let found = -1;
  let foundZ = -Infinity;
  const overlapping = !grid.convex;
  for (let at = 0; at < frame.count; at += 1) {
    const cell = frame.near[at]!;
    const loop = grid.corners[cell]!;
    let inside = true;
    for (let i = 0; i < loop.length && inside; i += 1) {
      const a = loop[i]!;
      const b = loop[i + 1 === loop.length ? 0 : i + 1]!;
      // The outline runs one way round, so a point inside is on the same side of every edge.
      if ((frame.sx[b]! - frame.sx[a]!) * (y - frame.sy[a]!) - (frame.sy[b]! - frame.sy[a]!) * (x - frame.sx[a]!) < 0) inside = false;
    }
    if (!inside) continue;
    const z = overlapping ? depthAt(frame, grid, cell, x, y) : frame.cz[cell]!;
    if (found < 0 || z > foundZ + 1e-9 || (Math.abs(z - foundZ) <= 1e-9 && cell < found)) {
      found = cell;
      foundZ = z;
    }
  }
  return found;
}

/**
 * Whether a cell is seen: on the near side and, on a solid that is not convex, not hidden behind another part of it. A convex solid hides nothing, so this is `visible`.
 * Worked out the first time a cell is asked about in a frame (it is not worth doing for every cell of every frame), by what is in front of the middle of the cell.
 */
export function cellSeen(frame: SolidFrame, grid: SolidGrid, cell: number): boolean {
  if (frame.visible[cell] === 0) return false;
  // A cell out of the picture is not worked out (what hides it cannot be told from the cells that are painted): it counts as seen.
  if (grid.convex || frame.shown[cell] === 0) return true;
  let known = frame.seen[cell]!;
  if (known === 0) {
    // At the middle of the cell's own outline (the average of its corners on the picture), which is inside it however the cell curves: the projected middle of a big curved cell, a torus's, may not be.
    const loop = grid.corners[cell]!;
    let x = 0;
    let y = 0;
    for (const corner of loop) {
      x += frame.sx[corner]!;
      y += frame.sy[corner]!;
    }
    known = pickCell(frame, grid, x / loop.length, y / loop.length) === cell ? 1 : 2;
    frame.seen[cell] = known;
  }
  return known === 1;
}

/** The cells a straight drag from one point to another crosses, in order, by sampling it finely enough that no cell the drag passes through is missed. */
export function cellsAlongDrag(frame: SolidFrame, grid: SolidGrid, from: readonly [number, number], to: readonly [number, number]): number[] {
  const out: number[] = [];
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const step = Math.max(1.5, Math.min(10, frame.cellPixels * 0.25));
  const samples = Math.max(1, Math.ceil(length / step));
  for (let at = 1; at <= samples; at += 1) {
    const t = at / samples;
    const cell = pickCell(frame, grid, from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t);
    if (cell >= 0 && out[out.length - 1] !== cell) out.push(cell);
  }
  return out;
}

/** The point of the trackball a point of the picture is on, for turning by a drag: the unit sphere seen from the front, and, outside it, the rim. */
export function trackballPoint(frame: SolidFrame, x: number, y: number): Vec3 {
  const radius = (Math.min(frame.width, frame.height) / 2) * SOLID_FILL;
  const px = (x - frame.width / 2) / radius;
  const py = (y - frame.height / 2) / radius;
  const d = px * px + py * py;
  if (d <= 1) return [px, py, Math.sqrt(1 - d)];
  const l = Math.sqrt(d);
  return [px / l, py / l, 0];
}

/** The turn a drag from one point to another makes: the point of the solid under the first is carried to under the second. */
export function dragTurn(frame: SolidFrame, q: Quat, from: readonly [number, number], to: readonly [number, number]): Quat {
  return quatNormalize(quatMul(quatBetween(trackballPoint(frame, from[0], from[1]), trackballPoint(frame, to[0], to[1])), q));
}

/** A turn about the viewer's own axes: `right` radians about the vertical (the solid's near side moves right) and `down` about the horizontal. */
export function stepTurn(q: Quat, right: number, down: number): Quat {
  const about = quatMul(quatAxisAngle([1, 0, 0], -down), quatAxisAngle([0, 1, 0], right));
  return quatNormalize(quatMul(about, q));
}

/**
 * The direction to bring round to face the viewer for a cell: its own facing, or, with `around`, the way the cell and the cells beside it face
 * together (their distinct facings added, so a cell in the middle of a flat face is faced squarely, and a cell at the edge of a cube's face is
 * turned to show both faces at a slant, and one at a corner all three). A cell at an edge faced squarely would have the cells over the edge
 * seen edge-on, which is no way to follow a line across.
 */
function facingOf(grid: SolidGrid, cell: number, around: boolean): Vec3 {
  const own = grid.normals[cell]!;
  if (!around) return own;
  // On a solid with parts that hide parts the cell may have to be looked at from a little off its own facing, to be seen at all.
  if (!grid.convex) return revealDirection(grid, cell);
  const seen: Vec3[] = [own];
  for (const next of grid.neighbours[cell]!) {
    const n = grid.normals[next]!;
    if (!seen.some((m) => m[0] * n[0] + m[1] * n[1] + m[2] * n[2] > 0.999)) seen.push(n);
  }
  const sum = seen.reduce<Vec3>((total, n) => [total[0] + n[0], total[1] + n[1], total[2] + n[2]], [0, 0, 0]);
  const l = Math.sqrt(sum[0] * sum[0] + sum[1] * sum[1] + sum[2] * sum[2]);
  return l < 1e-9 ? own : [sum[0] / l, sum[1] / l, sum[2] / l];
}

/** The turn that brings the cell round to face the viewer (see `facingOf` for `around`), by the shortest way, and then rolls it so that a side of the cell lies level (the cell's own first side, to the nearest of the turns that put one of its sides level). */
export function faceCellTurn(grid: SolidGrid, q: Quat, cell: number, around = false): Quat {
  const toward = quatNormalize(quatMul(quatBetween(quatTurn(q, facingOf(grid, cell, around)), [0, 0, 1]), q));
  // Where the cell's first side then points on the picture, and the nearest roll that makes it level.
  const loop = grid.corners[cell]!;
  const a = quatTurn(toward, grid.vertices[loop[0]!]!);
  const b = quatTurn(toward, grid.vertices[loop[1]!]!);
  const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const share = (2 * Math.PI) / loop.length;
  const roll = Math.round(angle / share) * share - angle;
  return quatNormalize(quatMul(quatAxisAngle([0, 0, 1], roll), toward));
}

/**
 * A view of the solid to begin with: the cell faces the viewer, then the solid is tipped a little so that its depth shows and its neighbours
 * on the near side can be seen. A shape with a way up (a heart, a star) is turned about its vertical axis only, so that it is seen upright, with the cell on the near side;
 * and a solid with parts that hide parts is given a view in which the cell is not hidden, the first of a few tried.
 */
export function openingTurn(grid: SolidGrid, cell: number): Quat {
  const faced = faceCellTurn(grid, [0, 0, 0, 1], cell);
  const tipped = stepTurn(faced, -0.5, 0.42);
  if (grid.convex && !grid.upright) return tipped;
  const tries: Quat[] = [];
  if (grid.upright) {
    // A shape with a way up (a heart, a star) is first seen from the front, tipped a little to show the top; if the cell is not on that side, turned about the vertical (the screen's
    // y) by a little more each time, round to the back, so that the shape is still seen from a side with its face on show; and only then with the cell squarely facing the viewer.
    for (const yaw of [0, 0.6, -0.6, 1, -1, Math.PI, Math.PI + 0.6, Math.PI - 0.6]) tries.push(stepTurn(quatAxisAngle([0, 1, 0], yaw), -0.15, 0.3));
    const n = grid.normals[cell]!;
    const facing = quatAxisAngle([0, 1, 0], -Math.atan2(n[0], n[2]));
    tries.push(stepTurn(facing, 0, 0.3), facing);
  }
  tries.push(tipped, stepTurn(faced, -0.2, 0.15), faced);
  const frame = createFrame(grid);
  for (const q of tries) {
    projectFrame(frame, grid, q, 1, 100, 100);
    if (cellSeen(frame, grid, cell) && frame.facing[cell]! > (grid.upright ? 0.4 : 0.3)) return q;
  }
  return tipped;
}

/**
 * THE SOLID TURNS BY ITSELF to keep the end of a line being drawn in view. The end of the line is in trouble when it faces away from the viewer
 * (`EDGE_SAFE`, a cell turned this far from squarely on is hard to draw on) or when a passage leads from it to a cell that is out of sight or nearly
 * edge-on (`EDGE_NEIGHBOUR`): a line at the edge of a cube's face, with the next face round the corner, is the case that matters, because that
 * cell is hidden however squarely the head faces you. Then it turns the solid so that the head and the cells it leads to, taken together, face
 * the viewer, which puts the edge between them at the front, where both are seen at a slant. It turns gently, up to `EDGE_RATE` radians a second and
 * slower the less the need, and stops when neither trouble is left. It answers the new turn, or null when there is nothing to do.
 */
export const EDGE_SAFE = 0.62;
export const EDGE_FULL = 0.25;
export const EDGE_NEIGHBOUR = 0.5;
/** The fastest the solid turns by itself, in radians a second. */
export const EDGE_RATE = 1.6;

export function edgeTurn(grid: SolidGrid, links: readonly (readonly number[])[], q: Quat, cell: number, seconds: number, hidden?: (cell: number) => boolean): Quat | null {
  const n = quatTurn(q, grid.normals[cell]!);
  let urgency = n[2] >= EDGE_SAFE ? 0 : Math.min(1, (EDGE_SAFE - n[2]) / (EDGE_SAFE - EDGE_FULL));
  let sx = n[0];
  let sy = n[1];
  let sz = n[2];
  let any = urgency > 0;
  // On a solid with parts that hide parts, a cell facing the viewer can still be hidden. The end of the line itself hidden is turned to the view it can be seen from (`revealDirection`),
  // and nothing else is looked at until it is seen.
  if (hidden !== undefined && hidden(cell)) {
    const w = quatTurn(q, revealDirection(grid, cell));
    sx = w[0];
    sy = w[1];
    sz = w[2];
    any = true;
    urgency = 0.8;
  } else {
    // The cells the line can go on to that are hidden or facing away, each with the direction to look from to see it: its own facing, or, hidden, the direction it can be seen from.
    // More than one on opposite sides (the rim cells of a star, above the head and below it) would cancel one another out and leave the solid where it is, so they are kept to choose among.
    const wanted: { cell: number; w: Vec3 }[] = [];
    const own: Vec3 = [sx, sy, sz];
    for (const next of links[cell]!) {
      if (hidden !== undefined && hidden(next)) {
        wanted.push({ cell: next, w: quatTurn(q, revealDirection(grid, next)) });
        any = true;
        urgency = Math.max(urgency, 0.8);
        continue;
      }
      const m = quatTurn(q, grid.normals[next]!);
      if (m[2] >= EDGE_NEIGHBOUR) continue;
      wanted.push({ cell: next, w: m });
      any = true;
      urgency = Math.max(urgency, Math.min(1, (EDGE_NEIGHBOUR - m[2]) / (EDGE_NEIGHBOUR + 0.3)));
    }
    for (const { w } of wanted) {
      sx += w[0];
      sy += w[1];
      sz += w[2];
    }
    // If the cells wanted cancel one another (the sum looks straight at the viewer though some are hidden or facing away), the solid is turned to one of them, the lowest numbered, which does not
    // change with the turn: a choice that went by what is in view would turn the solid back and forth between two passages for ever. A player who meant the other turns it by hand, or presses Face me.
    if (wanted.length > 1 && sx * sx + sy * sy < 0.01) {
      const first = wanted.reduce((best, each) => (each.cell < best.cell ? each : best));
      sx = own[0] + first.w[0];
      sy = own[1] + first.w[1];
      sz = own[2] + first.w[2];
    }
  }
  if (!any) return null;
  const l = Math.sqrt(sx * sx + sy * sy + sz * sz);
  if (l < 1e-9) return null;
  const toward: Vec3 = [sx / l, sy / l, sz / l];
  const needed = Math.acos(Math.max(-1, Math.min(1, toward[2])));
  const angle = Math.min(needed, EDGE_RATE * Math.max(0.25, urgency) * seconds);
  if (angle <= 1e-6) return null;
  // About the axis that carries that direction toward the viewer: it x z.
  return quatNormalize(quatMul(quatAxisAngle([toward[1], -toward[0], 0], angle), q));
}
