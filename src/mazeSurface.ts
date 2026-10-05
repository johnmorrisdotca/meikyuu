import { boardLookOf, lookAttributes, marksOf, stonesOf, type MazeLook } from "./draw.ts";
import { fixed, framed, linePath, standingWalls, wallPath } from "./geometry.ts";
import { dragMaze, headOf, liftMaze, pressMaze, tapMaze, type MazeGame } from "./game.ts";
import type { Box, Wall } from "./grid.ts";
import type { Maze } from "./maze.ts";
import { cellsAlong, toDisplay, toLogical, turnedBox, turnTransform, unturnedBox, type Turn } from "./orientation.ts";
import { createSurface, type Surface, type SurfaceOptions } from "./surface.ts";
import { viewBoxOf, type View } from "./viewport.ts";

/**
 * A MAZE IN A BOX: the maze drawn into an SVG whose `viewBox` is the view, so zooming and moving
 * cost the page nothing, and a big maze stays smooth: the walls are cut into tiles of a few cells, each
 * one `<path>` made the first time it comes into view and taken out of the page when it leaves, so only
 * what is on screen is drawn. The line, the hint and the marks are drawn on top.
 *
 * A pointer pressed on the start (or the end of the line), or within a thumb's width of it, draws; a pointer
 * pressed anywhere else moves the view, and, if taps are on, a tap there extends the line.
 *
 * The maze may be shown turned a quarter (`turn`, see orientation.ts): everything drawn is in a group that is turned, the view and the
 * pointer are in the turned picture, and every point a pointer gives is carried back into the maze before the game hears of it, so the
 * game, its line and its cells are the same however the board is turned.
 */
export type MazeSurfaceHooks = {
  game(): MazeGame;
  /** The game changed by a pointer, and how. */
  change(next: MazeGame, how: "press" | "drag" | "lift" | "tap"): void;
  /** Whether a tap extends the line. */
  taps(): boolean;
  /** Whether the Stone mode is on: a tap lays a stone (or takes one up) and nothing draws, so the board is moved by dragging anywhere. Left out, never. */
  stoneMode?(): boolean;
  /**
   * A stone is asked for on a cell, by a tap in the Stone mode (`tap`) or by a press-and-hold (`hold`). Answer true when that did something (a stone
   * laid, taken up, or a refusal said), which for a hold ends the touch. Left out, there are no stones and a hold does nothing.
   */
  stone?(cell: number, how: "tap" | "hold"): boolean;
  /** The view changed (zoomed or moved). */
  viewChanged?(): void;
};

export type MazeSurface = {
  readonly surface: Surface;
  /** Draw another maze, fitted. */
  show(maze: Maze, look: MazeLook): void;
  /** Show the maze turned (1) or as made (0), fitted. The game is untouched. */
  turn(next: Turn): void;
  /** Which way it is shown now. */
  turned(): Turn;
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
/** A line of more cells than this is a long one: it is not rippled on winning, where the ripple repaints the whole line every frame. */
const LONG_LINE = 600;

function svgElement<K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, className?: string): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  if (className !== undefined) el.setAttribute("class", className);
  parent.append(el);
  return el;
}

export function createMazeSurface(box: HTMLElement, hooks: MazeSurfaceHooks, maze: Maze, initial: MazeLook, turnNow: Turn = 0, surfaceOptions: SurfaceOptions = {}): MazeSurface {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("aria-hidden", "true");
  box.replaceChildren(svg);
  // Everything of the maze is drawn in its own coordinates in one group, and the group is what is turned.
  const content = svgElement(svg, "g", "mk-turn");
  const paper = svgElement(content, "rect", "mk-paper");
  const hintBack = svgElement(content, "path", "mk-hint");
  hintBack.setAttribute("data-kind", "back");
  const hintAhead = svgElement(content, "path", "mk-hint");
  hintAhead.setAttribute("data-kind", "ahead");
  const trail = svgElement(content, "path", "mk-trail");
  const stones = svgElement(content, "g", "mk-stones");
  const head = svgElement(content, "circle", "mk-head");
  const marks = svgElement(content, "g", "mk-marks");
  const walls = svgElement(content, "g", "mk-walls");
  let turn: Turn = turnNow;
  const applyTurn = (): void => {
    const transform = turnTransform(turn);
    if (transform === "") content.removeAttribute("transform");
    else content.setAttribute("transform", transform);
    svg.setAttribute("data-turned", String(turn === 1));
  };
  applyTurn();

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
  function showTiles(shown: Box): void {
    const x0 = shown.x - TILE;
    const y0 = shown.y - TILE;
    const x1 = shown.x + shown.w + TILE;
    const y1 = shown.y + shown.h + TILE;
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

  const surface = createSurface(box, turnedBox(turn, maze.grid.box), {
    press: (_at, pixel) => {
      const now = hooks.game();
      if (now.solved || hooks.stoneMode?.() === true) return false;
      // Pressing the start, or the end of the line, begins a stroke there.
      const target = headOf(now) ?? current.start;
      const [cx, cy] = surface.pixelOf(toDisplay(turn, current.grid.centres[target]!));
      if (Math.hypot(pixel[0] - cx, pixel[1] - cy) > Math.max(REACH, surface.view().scale * 0.6)) return false;
      hooks.change(pressMaze(now, target), "press");
      return true;
    },
    move: (from, to) => {
      // The pointer's way from one point to the next (in the picture), carried into the maze, each cell it enters offered to the game.
      const before = hooks.game();
      let next = before;
      for (const cell of cellsAlong(current.grid, turn, from, to)) next = dragMaze(next, cell);
      if (next !== before) hooks.change(next, "drag");
    },
    lift: () => hooks.change(liftMaze(hooks.game()), "lift"),
    tap: (at) => {
      const [x, y] = toLogical(turn, at);
      const cell = current.grid.at(x, y);
      if (hooks.stoneMode?.() === true) {
        if (cell >= 0) hooks.stone?.(cell, "tap");
        return;
      }
      if (!hooks.taps()) return;
      if (cell >= 0) hooks.change(tapMaze(hooks.game(), cell), "tap");
    },
    // Press-and-hold lays a stone where the finger is, if the game has stones and the finger is not on the line (a hold on the line is a pause before drawing).
    ...(hooks.stone === undefined ? {} : { hold: (at: readonly [number, number]) => {
      const [x, y] = toLogical(turn, at);
      const cell = current.grid.at(x, y);
      return cell >= 0 && !hooks.game().path.includes(cell) && hooks.stone!(cell, "hold");
    } }),
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
      showTiles(unturnedBox(turn, { x: view.x, y: view.y, w: size.width / view.scale, h: size.height / view.scale }));
      hooks.viewChanged?.();
    },
  }, undefined, surfaceOptions);

  applyLook();
  build(maze);

  // The line is kept as text with where each cell's piece of it ends, so that a line drawn on by a cell or drawn back by a few costs those cells and not the
  // whole line: a maze is a tree, so two lines from the start that meet at one place of the line are the same up to it, and the part kept is found by
  // looking for where the new line leaves the old. The attribute is written once a frame (`flushTrail`) however many cells a fast finger crossed.
  let trailPath: readonly number[] = [];
  let trailText = "";
  let trailEnds: number[] = [];
  let trailFrame = 0;
  let trailShown = "";
  const flushTrail = (): void => {
    trailFrame = 0;
    if (trailText !== trailShown) {
      trailShown = trailText;
      trail.setAttribute("d", trailText);
    }
  };
  function lineText(next: readonly number[]): string {
    const { centres } = current.grid;
    const old = trailPath;
    // How many cells the new line shares with the old: the same at the last place both reach, or the highest place at which they are the same.
    let common = Math.min(old.length, next.length);
    if (common > 0 && old[common - 1] !== next[common - 1]) {
      let low = 0;
      let high = common - 1;
      while (low < high) {
        const middle = (low + high + 1) >> 1;
        if (old[middle - 1] === next[middle - 1]) low = middle;
        else high = middle - 1;
      }
      common = low;
    }
    let text = common === 0 ? "" : trailText.slice(0, trailEnds[common - 1]);
    const ends = trailEnds.slice(0, common);
    for (let at = common; at < next.length; at += 1) {
      const [x, y] = centres[next[at]!]!;
      text += `${at === 0 ? "M" : "L"}${fixed(x)} ${fixed(y)}`;
      ends.push(text.length);
    }
    trailPath = next;
    trailEnds = ends;
    trailText = text;
    return text;
  }
  const resetTrail = (): void => {
    trailPath = [];
    trailText = "";
    trailEnds = [];
  };
  let stonesDrawn: readonly number[] | null = null;

  function draw(next: MazeGame, shownHint: { back: number; cells: readonly number[] } | null, won: boolean): void {
    const hint = shownHint;
    lineText(next.path);
    if (trailFrame === 0) trailFrame = window.requestAnimationFrame(flushTrail);
    const end = headOf(next);
    if (stonesDrawn !== next.stones) {
      stonesDrawn = next.stones;
      stones.innerHTML = stonesOf(current, next.stones);
    }
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
    // A line this long is not rippled when it wins (see style.ts).
    if (next.path.length > LONG_LINE) svg.setAttribute("data-long", "true");
    else svg.removeAttribute("data-long");
    surface.invalidate();
  }

  return {
    surface,
    show: (next, look) => {
      lookNow = look;
      applyLook();
      build(next);
      resetTrail();
      stonesDrawn = null;
      surface.setArea(turnedBox(turn, next.grid.box));
      draw(hooks.game(), null, false);
    },
    turn: (next) => {
      if (next === turn) return;
      turn = next;
      applyTurn();
      surface.setArea(turnedBox(turn, current.grid.box));
      tiles.forEach((tile) => tile.path?.remove());
      draw(hooks.game(), null, false);
    },
    turned: () => turn,
    update: draw,
    look: (look) => {
      lookNow = look;
      applyLook();
      if (lastView !== null) surface.invalidate();
    },
    destroy: () => {
      window.cancelAnimationFrame(trailFrame);
      surface.destroy();
      box.replaceChildren();
    },
  };
}
