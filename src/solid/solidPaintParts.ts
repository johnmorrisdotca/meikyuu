import type { SolidFrame } from "./solidView.ts";
import type { SolidMaze } from "./solidMaze.ts";
import { cross, dot, scale as times, sub, unit, type Vec3 } from "./vec.ts";

/**
 * WHAT A SOLID IS PAINTED WITH, shared by the two painters (`solidPaint.ts`, which fills a convex solid a shade at a time, and `solidPaintOrdered.ts`, which paints a solid with
 * parts that hide parts from the back to the front): the colours, the state of the game on it, the shades a cell takes by how squarely it faces, the open and the shut edges, the
 * marks that lie on a cell and the line through cells.
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
export const SHADES = 10;
/** The darkest a cell at the limb is, as a share of the paper's colour. */
export const DARKEST = 0.52;

const OPEN = new WeakMap<SolidMaze, Uint8Array>();

/** For each edge of the solid, 1 when the passage is open (the two cells are joined) and there is no wall. */
export function openEdges(maze: SolidMaze): Uint8Array {
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
export function discOn(frame: SolidFrame, m: readonly number[], maze: SolidMaze, cell: number, radius: number, steps = 16): [number, number][] {
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
export function roomPixels(frame: SolidFrame, maze: SolidMaze, cell: number): number {
  const k = frame.eye / (frame.eye - frame.cz[cell]!);
  return maze.grid.radii[cell]! * frame.scale * k;
}

/** Where the line passes from one cell to the next, on the picture: the middle of the edge between them. */
export function crossing(maze: SolidMaze, frame: SolidFrame, from: number, to: number): [number, number] {
  const side = maze.grid.neighbours[from]!.indexOf(to);
  const edge = maze.grid.edges[maze.grid.sideEdge[from]![side]!]!;
  return [(frame.sx[edge.a]! + frame.sx[edge.b]!) / 2, (frame.sy[edge.a]! + frame.sy[edge.b]!) / 2];
}

/** Trace a line through cells onto the context's current path: through each cell's middle and across the edge to the next, only where the cell is on the near side. */
export function trace(ctx: PaintContext, maze: SolidMaze, frame: SolidFrame, cells: readonly number[]): void {
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


/** How thick a slab of depth is, in cells' rooms: about two cells of the solid. */
const SLAB_ROOMS = 1.5;
/** The most slabs a picture is painted in. */
const MOST_SLABS = 20;

const SLAB_DEPTH = new WeakMap<object, number>();

/**
 * THE SLABS A SOLID WITH PARTS THAT HIDE PARTS IS PAINTED IN, back to front: where each begins in `frame.order` (the cells on the near side from the farthest to the nearest), the last
 * entry being the count. A slab is the cells lying within about two cells of the first of it in depth, and never so thin that there are more than twenty: no cell of a slab hides another
 * by more than a hair, since two surfaces that near one another in depth are all but touching.
 */
export function slabsOf(frame: SolidFrame, grid: { readonly radii: readonly number[] }): number[] {
  const { order, count } = frame;
  const starts: number[] = [];
  if (count === 0) return [0];
  let room = SLAB_DEPTH.get(grid);
  if (room === undefined) {
    room = SLAB_ROOMS * (grid.radii.reduce((total, r) => total + r, 0) / grid.radii.length);
    SLAB_DEPTH.set(grid, room);
  }
  const depth = Math.max(room, (frame.cz[order[count - 1]!]! - frame.cz[order[0]!]!) / MOST_SLABS);
  let at = 0;
  while (at < count) {
    starts.push(at);
    const first = frame.cz[order[at]!]!;
    let to = at + 1;
    while (to < count && frame.cz[order[to]!]! - first <= depth) to += 1;
    at = to;
  }
  starts.push(count);
  return starts;
}
