import { boardLookOf, lookAttributes, marksOf, type MazeLook } from "./draw.ts";
import { fixed, framed, linePath, standingWalls, wallPath } from "./geometry.ts";
import { dragMaze, headOf, liftMaze, pressMaze, tapMaze, type MazeGame } from "./game.ts";
import type { Wall } from "./grid.ts";
import type { Maze } from "./maze.ts";
import { createSurface, type Surface } from "./surface.ts";
import { viewBoxOf, type View } from "./viewport.ts";

/**
 * A MAZE IN A BOX: the maze drawn into an SVG whose `viewBox` is the view, so zooming and moving
 * cost the page nothing, and a big maze stays smooth: the walls are cut into tiles of a few cells, each
 * one `<path>` made the first time it comes into view and taken out of the page when it leaves, so only
 * what is on screen is drawn. The line, the hint and the marks are drawn on top.
 *
 * A pointer pressed on the start (or the end of the line), or within a thumb's width of it, draws; a pointer
 * pressed anywhere else moves the view, and, if taps are on, a tap there extends the line.
 */
export type MazeSurfaceHooks = {
  game(): MazeGame;
  /** The game changed by a pointer, and how. */
  change(next: MazeGame, how: "press" | "drag" | "lift" | "tap"): void;
  /** Whether a tap extends the line. */
  taps(): boolean;
  /** The view changed (zoomed or moved). */
  viewChanged?(): void;
};

export type MazeSurface = {
  readonly surface: Surface;
  /** Draw another maze, fitted. */
  show(maze: Maze, look: MazeLook): void;
  /** The game or the hint changed: draw the line, the marks and the hint again. */
  update(game: MazeGame, hint: { back: number; cells: readonly number[] } | null, won: boolean): void;
  look(look: MazeLook): void;
  destroy(): void;
};

const NS = "http://www.w3.org/2000/svg";
/** Walls are gathered into tiles this many cells across. */
const TILE = 10;
/** A finger's reach: a press this close to the start or the end of the line, in pixels, draws. */
const REACH = 30;

function svgElement<K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, className?: string): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  if (className !== undefined) el.setAttribute("class", className);
  parent.append(el);
  return el;
}

export function createMazeSurface(box: HTMLElement, hooks: MazeSurfaceHooks, maze: Maze, initial: MazeLook): MazeSurface {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("aria-hidden", "true");
  box.replaceChildren(svg);
  const paper = svgElement(svg, "rect", "mk-paper");
  const hintBack = svgElement(svg, "path", "mk-hint");
  hintBack.setAttribute("data-kind", "back");
  const hintAhead = svgElement(svg, "path", "mk-hint");
  hintAhead.setAttribute("data-kind", "ahead");
  const trail = svgElement(svg, "path", "mk-trail");
  const head = svgElement(svg, "circle", "mk-head");
  const marks = svgElement(svg, "g", "mk-marks");
  const walls = svgElement(svg, "g", "mk-walls");

  let current = maze;
  let lookNow = initial;
  let tiles = new Map<string, { walls: Wall[]; path: SVGPathElement | null }>();
  let lastView: View | null = null;

  const applyLook = (): void => {
    // The drawing's own attributes, as a string, applied to the svg: class, board, trail and custom properties.
    const probe = document.createElement("div");
    probe.innerHTML = `<i ${lookAttributes(lookNow)}></i>`;
    const source = probe.firstElementChild!;
    svg.setAttribute("class", source.getAttribute("class") ?? "meikyuu");
    for (const name of ["data-board", "data-trail", "style"]) {
      const value = source.getAttribute(name);
      if (value === null) svg.removeAttribute(name);
      else svg.setAttribute(name, value);
    }
    paper.setAttribute("fill", boardLookOf(lookNow.board).paper);
  };

  const tileKey = (x: number, y: number): string => `${Math.floor(x / TILE)},${Math.floor(y / TILE)}`;
  function build(next: Maze): void {
    current = next;
    tiles = new Map();
    walls.replaceChildren();
    for (const wall of standingWalls(next)) {
      const key = tileKey((wall.a[0] + wall.b[0]) / 2, (wall.a[1] + wall.b[1]) / 2);
      const tile = tiles.get(key) ?? { walls: [], path: null };
      tile.walls.push(wall);
      tiles.set(key, tile);
    }
    const area = framed(next.grid, 0.6);
    paper.setAttribute("x", fixed(area.x - 400));
    paper.setAttribute("y", fixed(area.y - 400));
    paper.setAttribute("width", fixed(area.w + 800));
    paper.setAttribute("height", fixed(area.h + 800));
    marks.innerHTML = marksOf(next, []);
    svg.setAttribute("data-shape", next.recipe.shape);
    svg.setAttribute("data-mode", next.recipe.mode);
    svg.setAttribute("data-cells", String(next.grid.cells));
  }

  /** Put on the page the tiles that are in view (and one more tile round them), and take off the rest. */
  function showTiles(view: View, width: number, height: number): void {
    const x0 = view.x - TILE;
    const y0 = view.y - TILE;
    const x1 = view.x + width / view.scale + TILE;
    const y1 = view.y + height / view.scale + TILE;
    const keep = new Set<string>();
    for (let ty = Math.floor(y0 / TILE); ty <= Math.floor(y1 / TILE); ty += 1) {
      for (let tx = Math.floor(x0 / TILE); tx <= Math.floor(x1 / TILE); tx += 1) {
        const key = `${tx},${ty}`;
        const tile = tiles.get(key);
        if (tile === undefined) continue;
        keep.add(key);
        if (tile.path === null) {
          tile.path = document.createElementNS(NS, "path");
          tile.path.setAttribute("d", tile.walls.map(wallPath).join(""));
          tile.path.dataset.tile = key;
        }
        if (tile.path.parentNode === null) walls.append(tile.path);
      }
    }
    for (const [key, tile] of tiles) if (!keep.has(key) && tile.path?.parentNode) tile.path.remove();
  }

  const surface = createSurface(box, maze.grid.box, {
    press: (_at, pixel) => {
      const now = hooks.game();
      if (now.solved) return false;
      // Pressing the start, or the end of the line, begins a stroke there.
      const target = headOf(now) ?? current.start;
      const [cx, cy] = surface.pixelOf(current.grid.centres[target]!);
      if (Math.hypot(pixel[0] - cx, pixel[1] - cy) > Math.max(REACH, surface.view().scale * 0.6)) return false;
      hooks.change(pressMaze(now, target), "press");
      return true;
    },
    move: (from, to) => {
      // The pointer's way from one point to the next, in steps of a third of a cell, each cell it enters offered to the game.
      const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
      const steps = Math.max(1, Math.ceil(length / 0.3));
      const before = hooks.game();
      let next = before;
      let previous = -2;
      for (let i = 1; i <= steps; i += 1) {
        const cell = current.grid.at(from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps);
        if (cell < 0 || cell === previous) continue;
        previous = cell;
        next = dragMaze(next, cell);
      }
      if (next !== before) hooks.change(next, "drag");
    },
    lift: () => hooks.change(liftMaze(hooks.game()), "lift"),
    tap: (at) => {
      if (!hooks.taps()) return;
      const cell = current.grid.at(at[0], at[1]);
      if (cell >= 0) hooks.change(tapMaze(hooks.game(), cell), "tap");
    },
    render: (view, _shown, size) => {
      lastView = view;
      svg.setAttribute("viewBox", viewBoxOf(view, size));
      // Walls, the line and the marks keep a thickness a finger and an eye can see at any zoom.
      const unit = 1 / view.scale;
      const line = lookNow.line ?? 0.34;
      walls.setAttribute("stroke-width", fixed(Math.max(lookNow.wall ?? 0.12, 1.6 * unit)));
      trail.setAttribute("stroke-width", fixed(Math.max(line, 3 * unit)));
      hintAhead.setAttribute("stroke-width", fixed(Math.max(line * 1.5, 5 * unit)));
      hintBack.setAttribute("stroke-width", fixed(Math.max(line * 1.5, 5 * unit)));
      head.setAttribute("r", fixed(Math.max(line * 0.8, 3.4 * unit)));
      head.setAttribute("stroke-width", fixed(Math.max(0.06, unit)));
      showTiles(view, size.width, size.height);
      hooks.viewChanged?.();
    },
  });

  applyLook();
  build(maze);

  function draw(next: MazeGame, shownHint: { back: number; cells: readonly number[] } | null, won: boolean): void {
    const hint = shownHint;
    trail.setAttribute("d", next.path.length > 0 ? linePath(current.grid, next.path) : "");
    const end = headOf(next);
    head.setAttribute("visibility", end === null ? "hidden" : "visible");
    if (end !== null) {
      head.setAttribute("cx", fixed(current.grid.centres[end]![0]));
      head.setAttribute("cy", fixed(current.grid.centres[end]![1]));
    }
    marks.innerHTML = marksOf(current, next.collected);
    hintAhead.setAttribute("d", hint !== null && hint.cells.length > 0 ? linePath(current.grid, end === null ? hint.cells : [end, ...hint.cells]) : "");
    hintBack.setAttribute("d", hint !== null && hint.back > 0 ? linePath(current.grid, next.path.slice(next.path.length - hint.back - 1)) : "");
    if (won) svg.setAttribute("data-won", "true");
    else svg.removeAttribute("data-won");
    surface.invalidate();
  }

  return {
    surface,
    show: (next, look) => {
      lookNow = look;
      applyLook();
      build(next);
      surface.setArea({ x: next.grid.box.x, y: next.grid.box.y, w: next.grid.box.w, h: next.grid.box.h });
      draw(hooks.game(), null, false);
    },
    update: draw,
    look: (look) => {
      lookNow = look;
      applyLook();
      if (lastView !== null) surface.invalidate();
    },
    destroy: () => {
      surface.destroy();
      box.replaceChildren();
    },
  };
}
