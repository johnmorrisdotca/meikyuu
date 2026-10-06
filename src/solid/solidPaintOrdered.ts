import type { SolidMaze } from "./solidMaze.ts";
import { crossing, discOn, openEdges, roomPixels, SHADES, shadeAt, shadeOf, slabsOf, type PaintContext, type SolidColours, type SolidPaintState } from "./solidPaintParts.ts";
import type { SolidFrame } from "./solidView.ts";
import { quatMatrix } from "./vec.ts";

/**
 * PAINTING A SOLID WHOSE PARTS CAN HIDE PARTS (a star, a cross, a ring, a heart), on a canvas. The cells that face the viewer are painted from the farthest to the nearest (the order
 * `projectFrame` leaves in `frame.order`), so that a nearer part covers what is behind it, as a painter covers a wall. The cells are taken a slab of depth at a time (about two
 * cells thick): in a slab the cells of one shade are filled in one go, with their walls and the line that runs through them, so what is nearer, painted after, covers the line and
 * the walls of what is behind as well. Within a slab one cell may be painted over another by the order of the shade and not of the depth, which no eye sees, since two surfaces
 * that near one another in depth are all but touching. A convex solid hides nothing and is painted in a handful of fills by `paintSolid`; this takes a few dozen for a slab.
 */

type Scratch = { marks: Uint8Array; routeAt: Int32Array[]; buckets: Uint8Array; lists: number[][] };

const SCRATCH = new WeakMap<SolidFrame, Scratch>();
const START = 1;
const GOAL = 2;
const STONE = 4;
const HEAD = 8;
const HINT_FIRST = 16;


type Route = { cells: readonly number[]; colour: string; width: number; alpha: number };

export function paintSolidOrdered(ctx: PaintContext, maze: SolidMaze, frame: SolidFrame, colours: SolidColours, state: SolidPaintState): void {
  const { grid } = maze;
  const { width, height } = frame;
  ctx.fillStyle = colours.ground;
  ctx.fillRect(0, 0, width, height);
  const wallWidth = Math.max(1, Math.min(2.4, frame.cellPixels * state.wall * 0.45));
  const lineWidth = Math.max(2.4, Math.min(18, frame.cellPixels * state.line * 0.85));
  const routes: Route[] = [];
  const head = state.path.length > 0 ? state.path[state.path.length - 1]! : -1;
  if (state.hint !== null && head >= 0) {
    if (state.hint.cells.length > 0) routes.push({ cells: [head, ...state.hint.cells], colour: colours.hint, width: lineWidth * 1.5, alpha: 0.85 });
    if (state.hint.back > 0) routes.push({ cells: state.path.slice(state.path.length - state.hint.back - 1), colour: colours.bad, width: lineWidth * 1.5, alpha: 1 });
  }
  if (state.path.length > 0) routes.push({ cells: state.path, colour: state.won ? colours.goal : colours.trail, width: lineWidth, alpha: 1 });
  let scratch = SCRATCH.get(frame);
  if (scratch === undefined) {
    scratch = { marks: new Uint8Array(grid.cells), routeAt: [0, 1, 2].map(() => new Int32Array(grid.cells)), buckets: new Uint8Array(grid.cells), lists: Array.from({ length: SHADES }, () => [] as number[]) };
    SCRATCH.set(frame, scratch);
  }
  const { marks, routeAt } = scratch;
  marks.fill(0);
  for (const at of routeAt) at.fill(-1);
  routes.forEach((route, r) => route.cells.forEach((cell, i) => (routeAt[r]![cell] = i)));
  marks[maze.start] |= START;
  marks[maze.goal] |= GOAL;
  for (const cell of state.stones) marks[cell] |= STONE;
  if (head >= 0) marks[head] |= HEAD;
  else if (state.hint !== null && state.hint.cells.length > 0) marks[state.hint.cells[0]!] |= HINT_FIRST;
  const open = openEdges(maze);
  const m = quatMatrix(frame.q);
  const bucketOf = (cell: number): number => Math.min(SHADES - 1, Math.floor(shadeAt(frame.facing[cell]!) * SHADES));
  const { order, count } = { order: frame.order, count: frame.count };
  let at = 0;
  const { buckets, lists } = scratch;
  for (let i = 0; i < count; i += 1) buckets[order[i]!] = bucketOf(order[i]!);
  const slabs = slabsOf(frame, grid);
  for (let slabAt = 0; slabAt + 1 < slabs.length; slabAt += 1) {
    // A slab: the cells lying within a cell or two of one another in depth, which no cell of the slab hides another of, to the eye, by more than a hair.
    at = slabs[slabAt]!;
    const to = slabs[slabAt + 1]!;
    // The cells, a shade at a time, each shade in one path, so that a slab is a few fills and not one for every cell.
    for (const list of lists) list.length = 0;
    for (let i = at; i < to; i += 1) lists[buckets[order[i]!]!]!.push(order[i]!);
    for (let bucket = 0; bucket < SHADES; bucket += 1) {
      const cells = lists[bucket]!;
      if (cells.length === 0) continue;
      const colour = shadeOf(colours.paper, (bucket + 0.5) / SHADES);
      ctx.beginPath();
      for (const cell of cells) {
        const loop = grid.corners[cell]!;
        ctx.moveTo(frame.sx[loop[0]!]!, frame.sy[loop[0]!]!);
        for (let k = 1; k < loop.length; k += 1) ctx.lineTo(frame.sx[loop[k]!]!, frame.sy[loop[k]!]!);
        ctx.closePath();
      }
      ctx.fillStyle = colour;
      ctx.fill();
      // A hair of the same colour round them, so that no seam of the ground shows where one shade meets the next.
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1;
      ctx.lineCap = "butt";
      ctx.stroke();
    }
    // The walls that stand between cells that are both on the near side, and, heavier, the rim: an edge with a cell that faces away from the viewer on the other side.
    ctx.beginPath();
    let walls = false;
    let rim = false;
    for (let i = at; i < to; i += 1) {
      const cell = order[i]!;
      const sides = grid.sideEdge[cell]!;
      const across = grid.neighbours[cell]!;
      for (let k = 0; k < sides.length; k += 1) {
        if (frame.visible[across[k]!] === 0 || open[sides[k]!] === 1) continue;
        const edge = grid.edges[sides[k]!]!;
        ctx.moveTo(frame.sx[edge.a]!, frame.sy[edge.a]!);
        ctx.lineTo(frame.sx[edge.b]!, frame.sy[edge.b]!);
        walls = true;
      }
    }
    if (walls) {
      ctx.strokeStyle = colours.wall;
      ctx.lineWidth = wallWidth;
      ctx.stroke();
    }
    ctx.beginPath();
    for (let i = at; i < to; i += 1) {
      const cell = order[i]!;
      const sides = grid.sideEdge[cell]!;
      const across = grid.neighbours[cell]!;
      for (let k = 0; k < sides.length; k += 1) {
        if (frame.visible[across[k]!] === 1) continue;
        const edge = grid.edges[sides[k]!]!;
        ctx.moveTo(frame.sx[edge.a]!, frame.sy[edge.a]!);
        ctx.lineTo(frame.sx[edge.b]!, frame.sy[edge.b]!);
        rim = true;
      }
    }
    if (rim) {
      ctx.strokeStyle = colours.wall;
      ctx.lineWidth = wallWidth * 1.5;
      ctx.stroke();
    }
    // What lies on these cells, in the order a flat board has them: the hint, the stones, the start and the goal, the line, and the dot on its end.
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const pathRoute = state.path.length > 0 ? routes.length - 1 : -1;
    const drawRoute = (r: number): void => {
      const route = routes[r]!;
      const index = routeAt[r]!;
      let any = false;
      ctx.beginPath();
      for (let i = at; i < to; i += 1) {
        const cell = order[i]!;
        const place = index[cell]!;
        if (place < 0) continue;
        any = true;
        if (place > 0) {
          const [x, y] = crossing(maze, frame, route.cells[place - 1]!, cell);
          ctx.moveTo(x, y);
          ctx.lineTo(frame.cx[cell]!, frame.cy[cell]!);
        } else ctx.moveTo(frame.cx[cell]!, frame.cy[cell]!);
        if (place < route.cells.length - 1) {
          const [x, y] = crossing(maze, frame, cell, route.cells[place + 1]!);
          ctx.lineTo(x, y);
        }
      }
      if (!any) return;
      ctx.strokeStyle = route.colour;
      ctx.lineWidth = route.width;
      ctx.globalAlpha = route.alpha;
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    for (let r = 0; r < routes.length; r += 1) if (r !== pathRoute) drawRoute(r);
    for (let i = at; i < to; i += 1) {
      const cell = order[i]!;
      const mark = marks[cell]!;
      if ((mark & STONE) !== 0) {
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
      if ((mark & HINT_FIRST) !== 0) {
        ctx.beginPath();
        ctx.arc(frame.cx[cell]!, frame.cy[cell]!, roomPixels(frame, maze, cell) * 0.8, 0, 2 * Math.PI);
        ctx.strokeStyle = colours.hint;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
      for (const [bit, fill, ring] of [[START, colours.start, false], [GOAL, colours.goal, true]] as const) {
        if ((mark & bit) === 0) continue;
        const room = grid.radii[cell]!;
        const outline = discOn(frame, m, maze, cell, room * 0.62);
        ctx.beginPath();
        outline.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.strokeStyle = colours.wall;
        ctx.lineWidth = Math.max(1, wallWidth * 0.8);
        ctx.fill();
        ctx.stroke();
        if (ring) {
          const inner = discOn(frame, m, maze, cell, room * 0.3);
          ctx.beginPath();
          inner.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
    if (pathRoute >= 0) drawRoute(pathRoute);
    for (let i = at; i < to; i += 1) {
      const cell = order[i]!;
      if ((marks[cell]! & HEAD) === 0) continue;
      ctx.beginPath();
      ctx.arc(frame.cx[cell]!, frame.cy[cell]!, lineWidth * 0.78, 0, 2 * Math.PI);
      ctx.fillStyle = state.won ? colours.goal : colours.trail;
      ctx.strokeStyle = shadeOf(colours.paper, 1);
      ctx.lineWidth = Math.max(1, lineWidth * 0.2);
      ctx.fill();
      ctx.stroke();
    }
  }
}
