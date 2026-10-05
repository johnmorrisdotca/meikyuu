import { MEIKYUU_BOARDS, MEIKYUU_TRAILS, type MeikyuuBoardLook, type MeikyuuBoardName, type MeikyuuTrailName } from "./boards.ts";
import { doorPlace, fixed, framed, linePath, standingWalls, wallPath } from "./geometry.ts";
import type { Maze } from "./maze.ts";
import { turnedBox, turnFor, turnTransform, type MeikyuuOrientation } from "./orientation.ts";
import { solutionOf } from "./maze.ts";
import { meikyuuSay, type MeikyuuLanguage } from "./strings.ts";
import { MEIKYUU_STYLE } from "./style.ts";

/**
 * A MAZE AS SVG TEXT: the walls, the start, the goal or the doors, the keys, and, if asked, the line
 * drawn so far, the solution and the hint. Pure text with no page needed, so a server can make a picture.
 * One unit in the drawing is one cell; the walls are one path, the line another.
 *
 * It writes classes and data attributes (`mk-walls`, `mk-trail`, `mk-start`, `mk-goal`, `mk-key`, `mk-door`)
 * and the style that gives them a look is `MEIKYUU_STYLE` (or `standalone: true`, which puts it in the drawing
 * so it is a picture on its own).
 */

/** What a maze looks like: every option that does not depend on where the line is. */
export type MazeLook = {
  /** A board by name, or its colours. */
  board?: MeikyuuBoardName | MeikyuuBoardLook;
  /** The line's colour: one of the named ones, or any CSS colour. */
  trail?: MeikyuuTrailName | (string & {});
  /** The thickness of a wall, in cells. Default 0.12. */
  wall?: number;
  /** The thickness of the line, in cells. Default 0.34. */
  line?: number;
};

export type DrawMazeOptions = MazeLook & {
  /** The line drawn so far, as cells from the start. */
  path?: readonly number[];
  /** The keys picked up. */
  collected?: readonly number[];
  /** The cells with a stone on them (see stones.ts). */
  stones?: readonly number[];
  /** Draw the one way from the start to the goal. */
  solution?: boolean;
  /** Cells to light as a hint, and how many cells of the line to draw back first. */
  hint?: { back?: number; cells: readonly number[] };
  /** Whether the maze is solved, which gives the line its colour of a win. */
  won?: boolean;
  language?: MeikyuuLanguage;
  /** The drawing's own words for a screen reader. */
  label?: string;
  /** Put the style in the drawing, so it is a picture on its own. */
  standalone?: boolean;
  /** The margin round the shape, in cells. Default 0.6. */
  pad?: number;
  /**
   * Which way up the picture is: `portrait` stands a wide maze up and `landscape` lays a tall one down (a quarter turn counter-clockwise,
   * which changes nothing in the maze, its cells or any line on it); `auto`, the default, leaves it as it was made. A square maze is never turned.
   */
  orientation?: MeikyuuOrientation;
};

const escape = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The look a board name or board object means. */
export function boardLookOf(board: MazeLook["board"]): MeikyuuBoardLook {
  return typeof board === "object" ? board : MEIKYUU_BOARDS[board ?? "paper"];
}

/** The inline custom properties a look needs: none for plain paper with the default line, which the style gives. */
export function lookStyle(look: MazeLook): string {
  const board = look.board ?? "paper";
  const colours: string[] = [];
  if (board !== "paper") {
    const b = boardLookOf(board);
    colours.push(`--mk-paper:${b.paper}`, `--mk-wall:${b.wall}`, `--mk-frame:${b.frame}`, `--mk-dot:${b.dark ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.14)"}`, `--mk-ink:${b.dark ? "#f3efe4" : "#1f2320"}`);
    colours.push(`--mk-stone:${b.dark ? "#e8ecf7" : "#4b5d8f"}`, `--mk-stone-edge:${b.dark ? "#10131c" : "#161c33"}`);
    colours.push(`--mk-trail:${look.trail === undefined ? b.trail : look.trail in MEIKYUU_TRAILS ? MEIKYUU_TRAILS[look.trail as MeikyuuTrailName][b.dark ? "dark" : "light"] : look.trail}`);
  } else if (look.trail !== undefined && !(look.trail in MEIKYUU_TRAILS)) colours.push(`--mk-trail:${look.trail}`);
  return colours.join(";");
}

/** The attributes (as text) that make an element a Meikyuu drawing: its class, its look, and its custom properties. */
export function lookAttributes(look: MazeLook): string {
  const board = typeof look.board === "object" ? "custom" : (look.board ?? "paper");
  const trail = look.trail !== undefined && look.trail in MEIKYUU_TRAILS && board === "paper" ? ` data-trail="${look.trail}"` : "";
  const style = lookStyle(look);
  return `class="meikyuu" data-board="${board}"${trail}${style === "" ? "" : ` style="${style}"`}`;
}

/** The marks on a maze: the start, the goal or exit, the doors and the keys, as SVG. */
export function marksOf(maze: Maze, collected: readonly number[] = []): string {
  const { grid } = maze;
  const out: string[] = [];
  const [sx, sy] = grid.centres[maze.start]!;
  out.push(`<circle class="mk-start" data-mark="start" cx="${fixed(sx)}" cy="${fixed(sy)}" r="0.3" stroke-width="0.08"/>`);
  const [gx, gy] = grid.centres[maze.goal]!;
  if (maze.recipe.mode === "to-goal") {
    // A dot with a ring round it: the thing to find.
    out.push(`<g data-mark="goal"><circle class="mk-goal" cx="${fixed(gx)}" cy="${fixed(gy)}" r="0.3" stroke-width="0.08"/><circle class="mk-goal" cx="${fixed(gx)}" cy="${fixed(gy)}" r="0.14" fill="none" stroke-width="0.07"/></g>`);
  } else out.push(`<circle class="mk-goal" data-mark="goal" cx="${fixed(gx)}" cy="${fixed(gy)}" r="0.22" stroke-width="0.07"/>`);
  for (const [name, door] of [["in", maze.entrance], ["out", maze.exit]] as const) {
    if (door === null) continue;
    const { x, y, dx, dy } = doorPlace(grid, door);
    // A triangle in the gap: pointing in for the way in, out for the way out.
    const sign = name === "in" ? -1 : 1;
    const tip = [x + dx * 0.5 * sign, y + dy * 0.5 * sign];
    const baseCentre = [x - dx * 0.2 * sign, y - dy * 0.2 * sign];
    const px = -dy * 0.3;
    const py = dx * 0.3;
    out.push(`<polygon class="mk-door" data-door="${name}" points="${fixed(tip[0]!)},${fixed(tip[1]!)} ${fixed(baseCentre[0]! + px)},${fixed(baseCentre[1]! + py)} ${fixed(baseCentre[0]! - px)},${fixed(baseCentre[1]! - py)}"/>`);
  }
  for (const key of maze.keys) {
    const [kx, ky] = grid.centres[key]!;
    // A key: a ring and a short shaft with two teeth.
    out.push(`<g class="mk-key" data-mark="key" data-got="${collected.includes(key)}" transform="translate(${fixed(kx)} ${fixed(ky)})"><circle cx="-0.14" cy="0" r="0.15"/><rect x="-0.02" y="-0.05" width="0.34" height="0.1"/><rect x="0.17" y="0.04" width="0.06" height="0.14"/><rect x="0.26" y="0.04" width="0.06" height="0.1"/></g>`);
  }
  return out.join("");
}

/** The stones laid on a maze, as SVG: each a marble (`mk-stone`) with a small gleam (`mk-gleam`) on the cell, one unit across being a cell. */
export function stonesOf(maze: Maze, stones: readonly number[]): string {
  return stones.map((cell) => {
    const [x, y] = maze.grid.centres[cell]!;
    return `<g class="mk-marble" data-mark="stone" data-cell="${cell}"><circle class="mk-stone" cx="${fixed(x)}" cy="${fixed(y)}" r="0.32" stroke-width="0.07"/><circle class="mk-gleam" cx="${fixed(x - 0.1)}" cy="${fixed(y - 0.11)}" r="0.09"/></g>`;
  }).join("");
}

/** The maze as SVG text. */
export function drawMaze(maze: Maze, options: DrawMazeOptions = {}): string {
  const { grid } = maze;
  const language = options.language ?? "en";
  const frame = framed(grid, options.pad ?? 0.6);
  const turn = turnFor(options.orientation ?? "auto", grid.box);
  const view = turnedBox(turn, frame);
  const board = boardLookOf(options.board);
  const wallWidth = options.wall ?? 0.12;
  const lineWidth = options.line ?? 0.34;
  const play = meikyuuSay(language, `play_${maze.recipe.mode.replace(/-/g, "_")}`);
  const label = options.label ?? meikyuuSay(language, "mazeLabel", { shape: meikyuuSay(language, `shape_${maze.recipe.shape}`), n: grid.cells, play });
  const parts: string[] = [];
  parts.push(`<rect class="mk-paper" x="${fixed(frame.x)}" y="${fixed(frame.y)}" width="${fixed(frame.w)}" height="${fixed(frame.h)}" fill="${board.paper}"/>`);
  if (options.solution === true) parts.push(`<path class="mk-solution" d="${linePath(grid, solutionOf(maze))}" stroke-width="${fixed(lineWidth * 0.8)}"/>`);
  if (options.hint !== undefined && options.hint.cells.length > 0) parts.push(`<path class="mk-hint" data-kind="ahead" d="${linePath(grid, options.hint.cells)}" stroke-width="${fixed(lineWidth * 1.5)}"/>`);
  if (options.path !== undefined && options.path.length > 0) {
    parts.push(`<path class="mk-trail" d="${linePath(grid, options.path)}" stroke-width="${fixed(lineWidth)}"/>`);
    const [hx, hy] = grid.centres[options.path[options.path.length - 1]!]!;
    parts.push(`<circle class="mk-head" cx="${fixed(hx)}" cy="${fixed(hy)}" r="${fixed(lineWidth * 0.8)}" stroke-width="0.06"/>`);
  }
  if (options.stones !== undefined && options.stones.length > 0) parts.push(`<g class="mk-stones">${stonesOf(maze, options.stones)}</g>`);
  parts.push(marksOf(maze, options.collected));
  parts.push(`<path class="mk-walls" d="${standingWalls(maze).map(wallPath).join("")}" stroke-width="${fixed(wallWidth)}"/>`);
  const style = options.standalone === true ? `<style>${MEIKYUU_STYLE}</style>` : "";
  // Turned, everything of the maze is in one group that is turned, so the picture is the maze as made and only its place on the page changes.
  const inner = turn === 1 ? `<g class="mk-turn" transform="${turnTransform(turn)}">${parts.join("")}</g>` : parts.join("");
  return `<svg ${lookAttributes(options)} xmlns="http://www.w3.org/2000/svg" viewBox="${fixed(view.x)} ${fixed(view.y)} ${fixed(view.w)} ${fixed(view.h)}" role="img" aria-label="${escape(label)}" data-shape="${maze.recipe.shape}" data-mode="${maze.recipe.mode}" data-cells="${grid.cells}"${turn === 1 ? ` data-turned="true"` : ""}${options.won === true ? ` data-won="true"` : ""}>${style}${inner}</svg>`;
}

