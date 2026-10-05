import type { SolidFrame } from "./solidView.ts";
import type { SolidMaze } from "./solidMaze.ts";
import { cross, dot, scale as times, sub, unit, type Vec3 } from "./vec.ts";
import { quatMatrix } from "./vec.ts";

/**
 * PAINTING A SOLID on a canvas: the near side's cells shaded by how squarely they face the viewer, the walls that stand between cells, the line, the
 * start and the goal, the stones and the hint. One call draws the whole picture from a frame (`projectFrame`) and the game's state, in a few
 * dozen strokes however many cells there are, because the cells are filled in a handful of batches (one for each degree of shade) and the walls
 * are stroked as two paths. Nothing is allocated that a frame could avoid, so that turning a solid of a thousand cells stays at the screen's rate.
 *
 * The colours are the drawing's own custom properties (`--mk-paper`, `--mk-wall`, `--mk-trail`, ...), read by the mount and handed in; the painter
 * knows nothing of a page. A cell facing the viewer squarely is the paper's own colour; the rest fall away toward the limb, which gives the depth,
 * and the picture sits on a ground a little off the paper's colour so that the solid has an outline even where it is bright.
 */

/** The three parts of a colour, from 0 to 255. */
export type Rgb = readonly [number, number, number];

export type SolidColours = {
  /** The cell facing the viewer, as the paper is. */
  readonly paper: Rgb;
  /** What the picture sits on: the paper, a little toward the wall's colour. */
  readonly ground: string;
  readonly wall: string;
  readonly trail: string;
  readonly start: string;
  readonly goal: string;
  readonly hint: string;
  readonly bad: string;
  readonly stone: string;
  readonly stoneEdge: string;
};

/** What is on the solid besides the solid. */
export type SolidPaintState = {
  readonly path: readonly number[];
  readonly stones: readonly number[];
  readonly hint: { readonly back: number; readonly cells: readonly number[] } | null;
  readonly won: boolean;
  /** The thickness of a wall and of the line, in cells (as the drawing's `wall` and `line` options have them). */
  readonly wall: number;
  readonly line: number;
};

/** The drawing surface the painter needs: a 2D canvas context, or anything shaped like one. */
export type PaintContext = Pick<CanvasRenderingContext2D, "beginPath" | "moveTo" | "lineTo" | "closePath" | "fill" | "stroke" | "arc" | "fillRect" | "clearRect" | "save" | "restore" | "setTransform"> & {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  globalAlpha: number;
};

/** How many degrees of shade a cell can be in; the cells of one are filled in one go. */
const SHADES = 10;
/** The darkest a cell at the limb is, as a share of the paper's colour. */
const DARKEST = 0.52;

const OPEN = new WeakMap<SolidMaze, Uint8Array>();

/** For each edge of the solid, 1 when the passage is open (the two cells are joined) and there is no wall. */
function openEdges(maze: SolidMaze): Uint8Array {
  let open = OPEN.get(maze);
  if (open === undefined) {
    const { edges } = maze.grid;
    open = new Uint8Array(edges.length);
    edges.forEach((edge, id) => {
      if (maze.links[edge.left]!.includes(edge.right)) open![id] = 1;
    });
    OPEN.set(maze, open);
  }
  return open;
}

/** The colour of a cell facing the viewer so squarely, from the paper's. */
export function shadeOf(paper: Rgb, shade: number): string {
  const k = DARKEST + (1 - DARKEST) * shade;
  return `rgb(${Math.round(paper[0] * k)},${Math.round(paper[1] * k)},${Math.round(paper[2] * k)})`;
}

/** How a cell facing the viewer at `facing` (the turned normal's z) is shaded, from 0 at the limb to 1 face on. */
export function shadeAt(facing: number): number {
  return Math.max(0, Math.min(1, facing)) ** 0.7;
}

/** A point of the solid, turned and put on the picture: `[x, y, depth]`. */
export function placeOn(frame: SolidFrame, m: readonly number[], point: Vec3): [number, number, number] {
  const px = m[0]! * point[0] + m[1]! * point[1] + m[2]! * point[2];
  const py = m[3]! * point[0] + m[4]! * point[1] + m[5]! * point[2];
  const pz = m[6]! * point[0] + m[7]! * point[1] + m[8]! * point[2];
  const k = (frame.eye / (frame.eye - pz)) * frame.scale;
  return [frame.width / 2 + px * k, frame.height / 2 + py * k, pz];
}

/** The two directions along the surface at a cell, at right angles, the first toward its first corner. */
export function tangentsOf(maze: SolidMaze, cell: number): [Vec3, Vec3] {
  const { grid } = maze;
  const n = grid.normals[cell]!;
  const toward = sub(grid.vertices[grid.corners[cell]![0]!]!, grid.centres[cell]!);
  const u = unit(sub(toward, times(n, dot(toward, n))));
  return [u, cross(n, u)];
}

/** A circle lying on the surface at a cell, as the points of its outline put on the picture. */
function discOn(frame: SolidFrame, m: readonly number[], maze: SolidMaze, cell: number, radius: number, steps = 16): [number, number][] {
  const { grid } = maze;
  const [u, v] = tangentsOf(maze, cell);
  const centre = grid.centres[cell]!;
  const lift = times(grid.normals[cell]!, grid.radii[cell]! * 0.04);
  const out: [number, number][] = [];
  for (let i = 0; i < steps; i += 1) {
    const a = (i / steps) * 2 * Math.PI;
    const point: Vec3 = [centre[0] + lift[0] + radius * (Math.cos(a) * u[0] + Math.sin(a) * v[0]), centre[1] + lift[1] + radius * (Math.cos(a) * u[1] + Math.sin(a) * v[1]), centre[2] + lift[2] + radius * (Math.cos(a) * u[2] + Math.sin(a) * v[2])];
    const [x, y] = placeOn(frame, m, point);
    out.push([x, y]);
  }
  return out;
}

/** The pixels a cell is across, near enough, for a mark in it: the room from its middle to its nearest side, as drawn. */
function roomPixels(frame: SolidFrame, maze: SolidMaze, cell: number): number {
  const k = frame.eye / (frame.eye - frame.cz[cell]!);
  return maze.grid.radii[cell]! * frame.scale * k;
}

/** Where the line passes from one cell to the next, on the picture: the middle of the edge between them. */
function crossing(maze: SolidMaze, frame: SolidFrame, from: number, to: number): [number, number] {
  const side = maze.grid.neighbours[from]!.indexOf(to);
  const edge = maze.grid.edges[maze.grid.sideEdge[from]![side]!]!;
  return [(frame.sx[edge.a]! + frame.sx[edge.b]!) / 2, (frame.sy[edge.a]! + frame.sy[edge.b]!) / 2];
}

/** Trace a line through cells onto the context's current path: through each cell's middle and across the edge to the next, only where the cell is on the near side. */
function trace(ctx: PaintContext, maze: SolidMaze, frame: SolidFrame, cells: readonly number[]): void {
  let drawnTo = -2;
  for (let at = 0; at < cells.length; at += 1) {
    const cell = cells[at]!;
    if (frame.visible[cell] === 0) continue;
    if (drawnTo !== at - 1) {
      const [x, y] = at === 0 ? [frame.cx[cell]!, frame.cy[cell]!] : crossing(maze, frame, cells[at - 1]!, cell);
      ctx.moveTo(x, y);
    }
    ctx.lineTo(frame.cx[cell]!, frame.cy[cell]!);
    if (at < cells.length - 1) {
      const [x, y] = crossing(maze, frame, cell, cells[at + 1]!);
      ctx.lineTo(x, y);
    }
    drawnTo = at;
  }
}

/** The shade a cell is filled with, bucketed. */
const shadeBucket = (frame: SolidFrame, cell: number): number => Math.min(SHADES - 1, Math.floor(shadeAt(frame.facing[cell]!) * SHADES));

const BUCKETS = new WeakMap<SolidFrame, Uint8Array>();
const SEAMS = new WeakMap<SolidFrame, Int8Array>();

/** Paint the solid, as the frame has it, with the game on it. */
export function paintSolid(ctx: PaintContext, maze: SolidMaze, frame: SolidFrame, colours: SolidColours, state: SolidPaintState): void {
  const { grid } = maze;
  const { width, height } = frame;
  ctx.fillStyle = colours.ground;
  ctx.fillRect(0, 0, width, height);
  const unitPixels = frame.cellPixels;
  const wallWidth = Math.max(1, Math.min(2.4, unitPixels * state.wall * 0.45));
  const lineWidth = Math.max(2.4, Math.min(18, unitPixels * state.line * 0.85));
  let buckets = BUCKETS.get(frame);
  if (buckets === undefined) {
    buckets = new Uint8Array(grid.cells);
    BUCKETS.set(frame, buckets);
  }
  for (let at = 0; at < frame.count; at += 1) {
    const cell = frame.near[at]!;
    buckets[cell] = shadeBucket(frame, cell);
  }
  // The cells, a shade at a time: the cells of one shade in one path, which leaves no seam between them. Where one shade meets the next there would be a
  // hairline of the ground, so the edges between shades are stroked, a hair wide, in the colour of the lighter side (a stroke of every cell
  // in its own colour does the same and costs as much again as the fills).
  let seams = SEAMS.get(frame);
  if (seams === undefined) {
    seams = new Int8Array(grid.edges.length);
    SEAMS.set(frame, seams);
  }
  const counts = new Int32Array(SHADES);
  const { edges: allEdges } = grid;
  for (let id = 0; id < allEdges.length; id += 1) {
    const edge = allEdges[id]!;
    const a = frame.visible[edge.left] === 1 ? buckets[edge.left]! : -1;
    const b = frame.visible[edge.right] === 1 ? buckets[edge.right]! : -1;
    seams[id] = a >= 0 && b >= 0 && a !== b ? Math.max(a, b) : -1;
    if (seams[id]! >= 0) counts[seams[id]!]! += 1;
  }
  for (let shade = 0; shade < SHADES; shade += 1) {
    ctx.beginPath();
    let any = false;
    for (let at = 0; at < frame.count; at += 1) {
      const cell = frame.near[at]!;
      if (buckets[cell] !== shade) continue;
      any = true;
      const loop = grid.corners[cell]!;
      ctx.moveTo(frame.sx[loop[0]!]!, frame.sy[loop[0]!]!);
      for (let i = 1; i < loop.length; i += 1) ctx.lineTo(frame.sx[loop[i]!]!, frame.sy[loop[i]!]!);
      ctx.closePath();
    }
    if (!any) continue;
    const colour = shadeOf(colours.paper, (shade + 0.5) / SHADES);
    ctx.fillStyle = colour;
    ctx.fill();
    if (counts[shade]! > 0) {
      ctx.beginPath();
      for (let id = 0; id < allEdges.length; id += 1) {
        if (seams[id] !== shade) continue;
        const edge = allEdges[id]!;
        ctx.moveTo(frame.sx[edge.a]!, frame.sy[edge.a]!);
        ctx.lineTo(frame.sx[edge.b]!, frame.sy[edge.b]!);
      }
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1;
      ctx.lineCap = "butt";
      ctx.stroke();
    }
  }
  // The walls: every edge between two cells that are not joined, where either is on the near side; and, heavier, the outline of the near side.
  const open = openEdges(maze);
  const { edges } = grid;
  ctx.beginPath();
  for (let id = 0; id < edges.length; id += 1) {
    if (open[id] === 1) continue;
    const edge = edges[id]!;
    const a = frame.visible[edge.left]!;
    const b = frame.visible[edge.right]!;
    if (a !== b || a === 0) continue;
    ctx.moveTo(frame.sx[edge.a]!, frame.sy[edge.a]!);
    ctx.lineTo(frame.sx[edge.b]!, frame.sy[edge.b]!);
  }
  ctx.strokeStyle = colours.wall;
  ctx.lineWidth = wallWidth;
  ctx.lineCap = "butt";
  ctx.stroke();
  // The rim: the edges with a cell on the near side on one side only, whether or not a passage crosses them.
  ctx.beginPath();
  for (let id = 0; id < edges.length; id += 1) {
    const edge = edges[id]!;
    if (frame.visible[edge.left] === frame.visible[edge.right]) continue;
    ctx.moveTo(frame.sx[edge.a]!, frame.sy[edge.a]!);
    ctx.lineTo(frame.sx[edge.b]!, frame.sy[edge.b]!);
  }
  ctx.lineWidth = wallWidth * 1.5;
  ctx.stroke();
  const m = quatMatrix(frame.q);
  // The hint, under the line.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (state.hint !== null && state.path.length > 0) {
    const head = state.path[state.path.length - 1]!;
    if (state.hint.cells.length > 0) {
      ctx.beginPath();
      trace(ctx, maze, frame, [head, ...state.hint.cells]);
      ctx.strokeStyle = colours.hint;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = lineWidth * 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (state.hint.back > 0) {
      ctx.beginPath();
      trace(ctx, maze, frame, state.path.slice(state.path.length - state.hint.back - 1));
      ctx.strokeStyle = colours.bad;
      ctx.lineWidth = lineWidth * 1.5;
      ctx.stroke();
    }
  } else if (state.hint !== null && state.hint.cells.length > 0) {
    // Nothing drawn yet: the hint is the start.
    const first = state.hint.cells[0]!;
    if (frame.visible[first] === 1) {
      ctx.beginPath();
      ctx.arc(frame.cx[first]!, frame.cy[first]!, roomPixels(frame, maze, first) * 0.8, 0, 2 * Math.PI);
      ctx.strokeStyle = colours.hint;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }
  // Stones: marbles on their cells.
  for (const cell of state.stones) {
    if (frame.visible[cell] === 0) continue;
    const radius = Math.max(3, roomPixels(frame, maze, cell) * (0.5 + 0.2 * frame.facing[cell]!));
    const x = frame.cx[cell]!;
    const y = frame.cy[cell]!;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = colours.stone;
    ctx.strokeStyle = colours.stoneEdge;
    ctx.lineWidth = Math.max(1.2, radius * 0.18);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.34, radius * 0.24, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // The start and the goal, lying on the surface so that they foreshorten with it.
  const mark = (cell: number, fill: string, ring: boolean): void => {
    if (frame.visible[cell] === 0) return;
    const room = maze.grid.radii[cell]!;
    const outline = discOn(frame, m, maze, cell, room * 0.62);
    ctx.beginPath();
    outline.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.strokeStyle = colours.wall;
    ctx.lineWidth = Math.max(1, wallWidth * 0.8);
    ctx.fill();
    ctx.stroke();
    if (ring) {
      const inner = discOn(frame, m, maze, cell, room * 0.3);
      ctx.beginPath();
      inner.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.strokeStyle = colours.wall;
      ctx.stroke();
    }
  };
  mark(maze.start, colours.start, false);
  mark(maze.goal, colours.goal, true);
  // The line, and a dot on its end.
  if (state.path.length > 0) {
    ctx.beginPath();
    trace(ctx, maze, frame, state.path);
    ctx.strokeStyle = state.won ? colours.goal : colours.trail;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    const head = state.path[state.path.length - 1]!;
    if (frame.visible[head] === 1) {
      ctx.beginPath();
      ctx.arc(frame.cx[head]!, frame.cy[head]!, lineWidth * 0.78, 0, 2 * Math.PI);
      ctx.fillStyle = state.won ? colours.goal : colours.trail;
      ctx.strokeStyle = shadeOf(colours.paper, 1);
      ctx.lineWidth = Math.max(1, lineWidth * 0.2);
      ctx.fill();
      ctx.stroke();
    }
  }
}
