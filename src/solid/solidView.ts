import type { SolidGrid } from "./solidGrid.ts";
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
/** How far in and out the picture can be zoomed, as a multiple of the fitted size. */
export const SOLID_ZOOM_LEAST = 0.6;
export const SOLID_ZOOM_MOST = 3;

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
  /** 1 for a cell on the near side. */
  readonly visible: Uint8Array;
  /** The cells on the near side, the first `count` of them. */
  readonly near: Int32Array;
  count: number;
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
    cellPixels: 1,
  };
}

/** How far the solid's outline reaches from the middle of the picture, in the solid's units after perspective, for the turn `m`. */
function reachOf(grid: SolidGrid, m: readonly number[], eye: number): number {
  if (grid.round) return (grid.reach * eye) / Math.sqrt(eye * eye - grid.reach * grid.reach);
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
    if (sum > 0 && !(grid.round && frame.facing[cell]! < ROUND_LIMB)) {
      frame.visible[cell] = 1;
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
  frame.width = width;
  frame.height = height;
  frame.q = q;
  frame.zoom = zoom;
  frame.scale = scale;
  frame.count = count;
  frame.cellPixels = squarely > 0 ? Math.max(1, sizes / squarely) : count > 0 ? Math.max(1, allSizes / count) : 1;
  return frame;
}

/**
 * The cell the point `(x, y)` of the picture is on, or -1 for none. The point is on a cell when it is inside the outline the cell is drawn with;
 * a point on the line between two cells is on the lower numbered. Where outlines overlap (they do not, on a solid with no hollows, but a
 * flattened globe's might at the very edge) the cell nearest the viewer wins.
 */
export function pickCell(frame: SolidFrame, grid: SolidGrid, x: number, y: number): number {
  let found = -1;
  let foundZ = -Infinity;
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
    if (inside && (found < 0 || frame.cz[cell]! > foundZ + 1e-9 || (Math.abs(frame.cz[cell]! - foundZ) <= 1e-9 && cell < found))) {
      found = cell;
      foundZ = frame.cz[cell]!;
    }
  }
  return found;
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
 * on the near side can be seen.
 */
export function openingTurn(grid: SolidGrid, cell: number): Quat {
  return stepTurn(faceCellTurn(grid, [0, 0, 0, 1], cell), -0.5, 0.42);
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

export function edgeTurn(grid: SolidGrid, links: readonly (readonly number[])[], q: Quat, cell: number, seconds: number): Quat | null {
  const n = quatTurn(q, grid.normals[cell]!);
  let urgency = n[2] >= EDGE_SAFE ? 0 : Math.min(1, (EDGE_SAFE - n[2]) / (EDGE_SAFE - EDGE_FULL));
  let sx = n[0];
  let sy = n[1];
  let sz = n[2];
  let any = urgency > 0;
  for (const next of links[cell]!) {
    const m = quatTurn(q, grid.normals[next]!);
    if (m[2] >= EDGE_NEIGHBOUR) continue;
    any = true;
    urgency = Math.max(urgency, Math.min(1, (EDGE_NEIGHBOUR - m[2]) / (EDGE_NEIGHBOUR + 0.3)));
    sx += m[0];
    sy += m[1];
    sz += m[2];
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
