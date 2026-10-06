import { lookAttributes, type MazeLook } from "../draw.ts";
import { fixed } from "../geometry.ts";
import { meikyuuSay, type MeikyuuLanguage } from "../strings.ts";
import { MEIKYUU_STYLE } from "../style.ts";
import type { SolidMaze } from "./solidMaze.ts";
import { solidSolutionOf } from "./solidMaze.ts";
import { slabsOf } from "./solidPaintParts.ts";
import { cellSeen, createFrame, openingTurn, projectFrame } from "./solidView.ts";
import type { Quat } from "./vec.ts";

/**
 * A MAZE OVER A SOLID AS SVG TEXT, a still picture of it from one side: the near side's cells shaded by how squarely they face the viewer, the walls
 * that stand, and, if asked, the line, the stones and the way through. Pure text with no page needed, so a server can make a picture, and the colours
 * are the drawing's custom properties (`--mk-paper`, `--mk-wall`, ...), so a board, a line colour and the page's light or dark change it as they change
 * a flat maze. The shade of a cell is a mix of the paper's colour and black (`color-mix`), so it follows the paper.
 */
export type DrawSolidOptions = MazeLook & {
  /** How the solid is turned, as a quaternion `[x, y, z, w]`. Default: the start facing you, tipped a little. */
  turn?: Quat;
  /** The picture's width and height in pixels. Default 320. */
  size?: number;
  /** The line drawn so far, as cells from the start. */
  path?: readonly number[];
  /** The cells with a stone on them. */
  stones?: readonly number[];
  /** Draw the one way from the start to the goal. */
  solution?: boolean;
  language?: MeikyuuLanguage;
  /** The drawing's own words for a screen reader. */
  label?: string;
  /** Put the style in the drawing, so it is a picture on its own. */
  standalone?: boolean;
};

const SHADES = 14;

export function drawSolid(maze: SolidMaze, options: DrawSolidOptions = {}): string {
  const { grid } = maze;
  const size = options.size ?? 320;
  const frame = projectFrame(createFrame(grid), grid, options.turn ?? openingTurn(grid, maze.start), 1, size, size);
  const language = options.language ?? "en";
  const label = options.label ?? meikyuuSay(language, "solidLabel", { shape: meikyuuSay(language, `solid_${maze.recipe.kind}`), n: grid.cells, play: meikyuuSay(language, "play_solid") });
  const wallWidth = Math.max(0.8, Math.min(3, frame.cellPixels * (options.wall ?? 0.12) * 0.8));
  const lineWidth = Math.max(2, Math.min(14, frame.cellPixels * (options.line ?? 0.34) * 0.85));
  const parts: string[] = [];
  parts.push(`<rect width="${size}" height="${size}" style="fill:color-mix(in srgb, var(--mk-paper) 90%, var(--mk-wall))"/>`);
  const shadeOf = (cell: number): number => Math.min(SHADES - 1, Math.floor(Math.max(0, Math.min(1, frame.facing[cell]!)) ** 0.7 * SHADES));
  const outline = (cell: number): string => `${grid.corners[cell]!.map((v, i) => `${i === 0 ? "M" : "L"}${fixed(frame.sx[v]!)} ${fixed(frame.sy[v]!)}`).join("")}Z`;
  const cellsPath = (paths: readonly string[], shade: number): string => {
    const share = Math.round((0.52 + 0.48 * ((shade + 0.5) / SHADES)) * 100);
    const fill = `color-mix(in srgb, var(--mk-paper) ${share}%, #000)`;
    return `<path class="mk-cells" data-shade="${shade}" d="${paths.join("")}" style="fill:${fill};stroke:${fill};stroke-width:1"/>`;
  };
  if (grid.convex) {
    const buckets: string[][] = Array.from({ length: SHADES }, () => []);
    for (let at = 0; at < frame.count; at += 1) buckets[shadeOf(frame.near[at]!)]!.push(outline(frame.near[at]!));
    buckets.forEach((paths, shade) => {
      if (paths.length > 0) parts.push(cellsPath(paths, shade));
    });
    const inner: string[] = [];
    const rim: string[] = [];
    grid.edges.forEach((edge) => {
      const a = frame.visible[edge.left]!;
      const b = frame.visible[edge.right]!;
      const line = `M${fixed(frame.sx[edge.a]!)} ${fixed(frame.sy[edge.a]!)}L${fixed(frame.sx[edge.b]!)} ${fixed(frame.sy[edge.b]!)}`;
      if (a !== b) rim.push(line);
      else if (a === 1 && !maze.links[edge.left]!.includes(edge.right)) inner.push(line);
    });
    parts.push(`<path class="mk-walls" d="${inner.join("")}" stroke-width="${fixed(wallWidth)}"/>`);
    parts.push(`<path class="mk-walls" data-rim="true" d="${rim.join("")}" stroke-width="${fixed(wallWidth * 1.5)}"/>`);
  } else {
    // A solid with parts that hide parts is drawn a slab of depth at a time, from the back: the cells of the slab, then the walls of its cells that no nearer slab has drawn, so that what
    // is nearer covers what is behind it, walls and all.
    const slabs = slabsOf(frame, grid);
    const slabOf = new Int32Array(grid.cells).fill(-1);
    for (let k = 0; k + 1 < slabs.length; k += 1) for (let i = slabs[k]!; i < slabs[k + 1]!; i += 1) slabOf[frame.order[i]!] = k;
    for (let k = 0; k + 1 < slabs.length; k += 1) {
      const buckets: string[][] = Array.from({ length: SHADES }, () => []);
      const inner: string[] = [];
      const rim: string[] = [];
      for (let i = slabs[k]!; i < slabs[k + 1]!; i += 1) {
        const cell = frame.order[i]!;
        buckets[shadeOf(cell)]!.push(outline(cell));
        grid.sideEdge[cell]!.forEach((id, side) => {
          const edge = grid.edges[id]!;
          const across = grid.neighbours[cell]![side]!;
          // An edge is drawn with the later of its two cells' slabs (the nearer), once.
          if (slabOf[across]! > k || (slabOf[across]! === k && across < cell)) return;
          const line = `M${fixed(frame.sx[edge.a]!)} ${fixed(frame.sy[edge.a]!)}L${fixed(frame.sx[edge.b]!)} ${fixed(frame.sy[edge.b]!)}`;
          if (frame.visible[across]! === 0) rim.push(line);
          else if (!maze.links[cell]!.includes(across)) inner.push(line);
        });
      }
      buckets.forEach((paths, shade) => {
        if (paths.length > 0) parts.push(cellsPath(paths, shade));
      });
      if (inner.length > 0) parts.push(`<path class="mk-walls" d="${inner.join("")}" stroke-width="${fixed(wallWidth)}"/>`);
      if (rim.length > 0) parts.push(`<path class="mk-walls" data-rim="true" d="${rim.join("")}" stroke-width="${fixed(wallWidth * 1.5)}"/>`);
    }
  }
  const through = (cells: readonly number[]): string => {
    let out = "";
    let drawnTo = -2;
    cells.forEach((cell, at) => {
      if (!cellSeen(frame, grid, cell)) return;
      const cross = (from: number, to: number): string => {
        const edge = grid.edges[grid.sideEdge[from]![grid.neighbours[from]!.indexOf(to)]!]!;
        return `${fixed((frame.sx[edge.a]! + frame.sx[edge.b]!) / 2)} ${fixed((frame.sy[edge.a]! + frame.sy[edge.b]!) / 2)}`;
      };
      if (drawnTo !== at - 1) out += `M${at === 0 ? `${fixed(frame.cx[cell]!)} ${fixed(frame.cy[cell]!)}` : cross(cells[at - 1]!, cell)}`;
      out += `L${fixed(frame.cx[cell]!)} ${fixed(frame.cy[cell]!)}`;
      if (at < cells.length - 1) out += `L${cross(cell, cells[at + 1]!)}`;
      drawnTo = at;
    });
    return out;
  };
  if (options.solution === true) parts.push(`<path class="mk-solution" d="${through(solidSolutionOf(maze))}" stroke-width="${fixed(lineWidth * 0.8)}"/>`);
  if (options.path !== undefined && options.path.length > 0) parts.push(`<path class="mk-trail" d="${through(options.path)}" stroke-width="${fixed(lineWidth)}"/>`);
  for (const cell of options.stones ?? []) {
    if (!cellSeen(frame, grid, cell)) continue;
    const r = grid.radii[cell]! * frame.scale * 0.55;
    parts.push(`<circle class="mk-stone" data-mark="stone" data-cell="${cell}" cx="${fixed(frame.cx[cell]!)}" cy="${fixed(frame.cy[cell]!)}" r="${fixed(r)}" stroke-width="${fixed(Math.max(1, r * 0.18))}"/>`);
  }
  const mark = (cell: number, name: "start" | "goal"): void => {
    if (!cellSeen(frame, grid, cell)) return;
    const r = grid.radii[cell]! * frame.scale * 0.55;
    parts.push(`<circle class="mk-${name}" data-mark="${name}" cx="${fixed(frame.cx[cell]!)}" cy="${fixed(frame.cy[cell]!)}" r="${fixed(r)}" stroke-width="${fixed(Math.max(1, wallWidth * 0.8))}"/>`);
  };
  mark(maze.start, "start");
  mark(maze.goal, "goal");
  const style = options.standalone === true ? `<style>${MEIKYUU_STYLE}.meikyuu .mk-walls[data-rim]{stroke-linecap:round}</style>` : "";
  return `<svg ${lookAttributes(options)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" data-solid="${maze.recipe.kind}" data-cells="${grid.cells}">${style}${parts.join("")}</svg>`;
}
