import { arrowsLeft, hintArrow, newArrowGame, restartArrows, tapArrow, undoArrow, unlockArrows, type ArrowGame } from "./arrowGame.ts";
import { createArrowSurface, type ArrowSurface } from "./arrowSurface.ts";
import { makeArrows, parseArrowRecipe, type ArrowBoard, type ArrowRecipe } from "./arrows.ts";
import type { MazeLook } from "./draw.ts";
import { dragMaze, headOf, hintMaze, liftMaze, newMazeGame, pressMaze, restartMaze, undoMaze, type MazeGame } from "./game.ts";
import { clearStones, decodeRun, encodeRun, stonesLeft, stoneRulesOf, toggleStone, withStoneRules, type StoneOption, type StoneVerdict } from "./stones.ts";
import { levelOf, type MeikyuuKind } from "./levels.ts";
import { resolveTurn, type MeikyuuOrientation, type Turn } from "./orientation.ts";
import { createMazeSurface, type MazeSurface } from "./mazeSurface.ts";
import { buildMaze, parseRecipe, type Maze, type MazeRecipe } from "./maze.ts";
import { buildMixed, parseMixedRecipe, type MixedRecipe } from "./mixed.ts";
import { MEIKYUU_PLAY_STYLE } from "./playStyle.ts";
import { createMeikyuuSounds, type MeikyuuSoundKind, type MeikyuuSounds } from "./sound.ts";
import { meikyuuLanguageOf, meikyuuSay, type MeikyuuLanguage } from "./strings.ts";
import type { FitMode } from "./viewport.ts";

/**
 * A PLAYABLE MEIKYUU BOARD IN ANY PAGE: `mountMeikyuu(host, options)` draws a maze, an arrow puzzle or a
 * mixed one into an element and plays it by touch and mouse.
 *
 * A maze is played by drawing a line: press the start and drag; the line follows the corridors, snaps to
 * cells, cannot pass a wall, and drawing back shortens it. A big maze is looked at through the box, zoomed with
 * a pinch, the wheel or the buttons and moved with two fingers or a drag that starts anywhere but on the line,
 * and a Fit button brings the whole maze back; near the box's edge a line being drawn moves the view for you.
 * With `tap`, a tap runs the line along the corridor to where it forks. An arrow puzzle is played by tapping
 * arrows. A mixed one has both, in two tabs: the arrows, some locked, and the labyrinth that holds their button.
 *
 * STONES (`stones`, off unless asked for): a marble laid on a passage cell that the line may not enter, to shut a passage found to lead nowhere. A stone
 * goes only beside the line (within `reach` cells, 2 by default, of a cell of the line along the passages), as many as `limit` allows (a few by
 * default, or none for no limit), by the Stone button's mode (a tap on a cell lays a stone or takes it up, and nothing draws) or by pressing and
 * holding a finger on the cell, or by Shift and an arrow key beside the end of the line. A stone is part of the game: Undo takes it up, Restart takes
 * every one up, `run()` and `restore()` keep it with the line, and none is ever part of the maze or its answer (see stones.ts).
 *
 * Under the board are Undo, Restart, Hint, the zoom pad, a line on how to play, a line of progress and the
 * word of what has just happened. Every one is optional (`controls`), and everything a button does is also a
 * method of the returned handle. What happens is told in events on the host (and to the callbacks given):
 * `meikyuu-move` after each stroke or tap, `meikyuu-solve` once when the puzzle is won, and `meikyuu-key`,
 * `meikyuu-unlock`, `meikyuu-bump` and `meikyuu-lose` for the smaller things.
 *
 * THE BOX AND THE PAGE. The box is as wide as the host allows, less a gutter each side (`gutter`, 24 px) so that there is always some of the
 * page beside it for a finger to scroll by: only the box itself asks the browser to keep touches (`touch-action: none`), everything round it
 * scrolls the page. It is as tall as its `ratio` says (square by default; 2:3 for a tall maze) and never taller than the window less `reserve`.
 * A pinch with nothing left to zoom out of, or the zoom pad's minus, widens the gutters a step at a time (to 72 px) so the page shows beside
 * a maze that fills the window, and the pad's plus brings them back first. A maze that is taller than wide lies down on a screen that is
 * wider than tall, and the other way (`orientation`): the maze, its line and its cells stay as they were made, so a line is the same line
 * either way up. Needs a page. The rules are `game.ts`'s and `arrowGame.ts`'s and the drawing is `drawMaze`'s and
 * `drawArrows`'s, and each is usable alone. Nothing it draws can be selected, and its box stays one steady shape whatever is in it.
 */

/** The page left beside the box, in pixels: the least, and the most the zoom-out widens it to. */
export const MEIKYUU_GUTTER = 24;
export const MEIKYUU_GUTTER_MAX = 72;
/** How much one press of Zoom out widens the gutters, and one press of Zoom in narrows them. */
const MEIKYUU_GUTTER_STEP = 24;
/** What a window is assumed to hold besides the box, in pixels: the page's header, and the board's buttons and lines of words. */
export const MEIKYUU_RESERVE = 200;

/** What is being played. */
export type MeikyuuPuzzle =
  | { kind: "maze"; recipe: MazeRecipe; level?: number }
  | { kind: "arrows"; recipe: ArrowRecipe; level?: number }
  | { kind: "mixed"; recipe: MixedRecipe; level?: number };

/** What every event tells of the board. */
export type MeikyuuEventDetail = {
  kind: MeikyuuKind;
  /** The level's number in its list, when it is one of the package's. */
  level: number | null;
  /** Strokes drawn (mazes) or arrows tapped (arrow puzzles). */
  moves: number;
  /** Cells in the line now. */
  cells: number;
  keys: number;
  keysOf: number;
  /** Hearts left, for arrow puzzles. */
  hearts: number | null;
  arrowsLeft: number | null;
  solved: boolean;
  /** How a maze is shown now (`portrait` when it is taller than wide as shown), or null for arrows. */
  orientation: "portrait" | "landscape" | null;
  /** Whether the maze is shown turned from how it was made. */
  turned: boolean;
  /** Stones laid now (0 for a board with none). */
  stones: number;
  /** Stones that can still be laid: null for no limit, 0 for a board with no stones. */
  stonesLeft: number | null;
};

export type MeikyuuMountOptions = MazeLook & {
  /** Which list the level is from. Default `maze`. */
  kind?: MeikyuuKind;
  /** A level of the package's own lists, from 1. */
  level?: number;
  /** A recipe of your own, as its code or as an object, instead of a level. */
  recipe?: string | MazeRecipe | ArrowRecipe | MixedRecipe;
  /** A tap runs the line along the corridor to the next fork. Default false. */
  tap?: boolean;
  /** Offer the Hint button. Default true. */
  hints?: boolean;
  /** The buttons and the lines of words under the board. Default true. */
  controls?: boolean;
  /** The zoom pad. Default true. (The wheel and the pinch always work.) */
  zoom?: boolean;
  /**
   * The shape of the box, width over height as the maze was made: `square` (default, one steady square whatever is drawn), `maze` (the
   * maze's own, between 1:2 and 2:1), or a number such as 2 / 3 for the tall levels (`level.ratio`). A maze that is turned has the box turned
   * with it.
   */
  ratio?: "square" | "maze" | number;
  /**
   * Which way up the maze is shown: `portrait` (stand a wide maze up), `landscape` (lay a tall one down), or `auto`, the default: lay a
   * tall maze down when the room (the host's width and the window's height) fits it bigger that way. A square box and a square maze are never turned.
   */
  orientation?: MeikyuuOrientation;
  /** The page left beside the box on each side, in pixels, at least. Default 24 (`MEIKYUU_GUTTER`). */
  gutter?: number;
  /** What the window holds besides the box, in pixels. Default 200 (`MEIKYUU_RESERVE`). The box is never taller than the window less this (and never under 60% of it). */
  reserve?: number;
  /** What Fit shows: the whole maze (`both`, default), its `width` or its `height`. */
  fit?: FitMode;
  /** A line drawn to the edge of a zoomed box moves the view along. Default true. */
  edgePan?: boolean;
  /** Start with every one-finger drag moving the view, not drawing (the Move button toggles it). Default false. */
  pan?: boolean;
  /** Show a Turn button in the pad, for a maze that is not square. Default false. */
  turnButton?: boolean;
  /** Make a sound for each thing that happens. Default false. */
  sound?: boolean;
  /**
   * Stones for mazes: `true` for the defaults, or `{ limit, reach }` (how many may lie at once, `null` for no limit and left out for `stoneLimitFor` the maze's
   * cells; and how far from the line one may be laid, 1 or 2 cells, 2 by default). Default off. Adds the Stone button to the board's own buttons.
   */
  stones?: StoneOption;
  /** The language the words are in. Left out, the host's own `lang`, or the page's, and it follows the page's. */
  language?: MeikyuuLanguage;
  onMove?: (detail: MeikyuuEventDetail) => void;
  onSolve?: (detail: MeikyuuEventDetail) => void;
  onKey?: (detail: MeikyuuEventDetail) => void;
  onUnlock?: (detail: MeikyuuEventDetail) => void;
  onBump?: (detail: MeikyuuEventDetail) => void;
  onLose?: (detail: MeikyuuEventDetail) => void;
  /** A stone was laid or taken up, or the stones were cleared, restarted or undone. */
  onStones?: (detail: MeikyuuEventDetail) => void;
};

export type MeikyuuMount = {
  readonly host: HTMLElement;
  kind: () => MeikyuuKind;
  puzzle: () => MeikyuuPuzzle;
  /** The maze game as it stands (a maze, or the labyrinth of a mixed puzzle), or null for arrows. */
  mazeGame: () => MazeGame | null;
  /** The arrow game as it stands, or null for a maze. */
  arrowGame: () => ArrowGame | null;
  /** Play another puzzle: a level or a recipe. Returns false when there is no such puzzle. */
  load: (puzzle: { kind?: MeikyuuKind; level?: number; recipe?: MeikyuuMountOptions["recipe"]; ratio?: MeikyuuMountOptions["ratio"] }) => boolean;
  /** Change how it looks or is played: board, trail, tap, sound, hints, language, the shape of the box (`ratio`), and the stones' rules (`stones`; stones already down stay down). */
  set: (changes: MazeLook & { tap?: boolean; sound?: boolean; hints?: boolean; language?: MeikyuuLanguage; ratio?: MeikyuuMountOptions["ratio"]; stones?: StoneOption }) => void;
  undo: () => void;
  restart: () => void;
  hint: () => void;
  /** Zoom and move back to the whole board (as `fit` says, if given), and the gutters back to their least. */
  fit: (mode?: FitMode) => void;
  /** Zoom in a step; if the gutters were widened, bring them in a step first. */
  zoomIn: () => void;
  /** Zoom out a step; if the whole maze is already in the box, widen the gutters a step instead (to `MEIKYUU_GUTTER_MAX`). */
  zoomOut: () => void;
  /** The gutter now, in pixels, and set it (between the least and `MEIKYUU_GUTTER_MAX`). */
  gutter: (px?: number) => number;
  /** Whether every one-finger drag moves the view; with an argument, turn that on or off. */
  pan: (on?: boolean) => boolean;
  /** Whether a line drawn to the edge moves the view along; with an argument, turn that on or off. */
  edgePan: (on?: boolean) => boolean;
  /** How the maze is shown: the setting, and what it came to (`portrait` or `landscape` as shown, and whether the maze is turned from how it was made). With an argument, change the setting. */
  orientation: (setting?: MeikyuuOrientation) => { setting: MeikyuuOrientation; orientation: "portrait" | "landscape"; turned: boolean };
  /** Whether the Stone mode is on (a tap lays a stone or takes one up, and nothing draws); with an argument, turn it on or off. Always off for a board with no stones. */
  stoneMode: (on?: boolean) => boolean;
  /** The cells with a stone on them, in the order they were laid. */
  stones: () => readonly number[];
  /** How many stones can still be laid: null for no limit, 0 for a board with no stones. */
  stonesLeft: () => number | null;
  /** Lay a stone on a cell, or take the one there up: the verdict `ok` when it was done, and otherwise why not (`canLayStone`). */
  stone: (cell: number) => StoneVerdict;
  /** Take every stone up. One Undo puts them back. */
  clearStones: () => void;
  /** The run so far as one short text, the line's steps and its stones (`encodeRun`): what to keep to carry on later. */
  run: () => string;
  /** Carry on a run kept by `run()`: draws the line and the stones as they were, with nothing to Undo. False, and nothing changed, for a text that is not a run of this maze (or for arrows). */
  restore: (code: string) => boolean;
  /** For a mixed puzzle: look at the arrows or the labyrinth. */
  show: (board: "arrows" | "maze") => void;
  /** Take the board down: its listeners, its timers and everything it put in the host. */
  destroy: () => void;
};

/** Put the style in the page once: in the document's head, or in the shadow root the host is in. */
export function ensureMeikyuuPlayStyle(host: Element): void {
  const root = host.getRootNode();
  const target: ParentNode = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root : host.ownerDocument.head;
  if (target.querySelector("style[data-meikyuu-play]") !== null) return;
  const style = host.ownerDocument.createElement("style");
  style.setAttribute("data-meikyuu-play", "");
  style.textContent = MEIKYUU_PLAY_STYLE;
  target.append(style);
}

/** The puzzle a set of options names: a level of the package's lists, or a recipe given, or null. */
export function puzzleOf(options: { kind?: MeikyuuKind; level?: number; recipe?: MeikyuuMountOptions["recipe"] }): MeikyuuPuzzle | null {
  const { recipe } = options;
  if (recipe !== undefined) {
    if (typeof recipe === "string") {
      const mixed = recipe.includes("|") ? parseMixedRecipe(recipe) : null;
      if (mixed !== null) return { kind: "mixed", recipe: mixed };
      const maze = parseRecipe(recipe);
      if (maze !== null) return { kind: "maze", recipe: maze };
      const arrows = parseArrowRecipe(recipe);
      return arrows === null ? null : { kind: "arrows", recipe: arrows };
    }
    if ("arrows" in recipe) return { kind: "mixed", recipe };
    if ("algorithm" in recipe) return { kind: "maze", recipe };
    return { kind: "arrows", recipe };
  }
  const kind = options.kind ?? "maze";
  const level = levelOf(kind, options.level ?? 1);
  if (level === null) return null;
  return { kind: level.kind, recipe: level.recipe, level: level.number } as MeikyuuPuzzle;
}

function create<K extends keyof HTMLElementTagNameMap>(document: Document, tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** How near the way a key press points a neighbour has to be, as a cosine, to be the one stepped to. */
const KEY_REACH = 0.5;

/** Draw a puzzle into `host` and play it. Returns the handle that drives it, or null for a level or recipe that is none. */
export function mountMeikyuu(host: HTMLElement, options: MeikyuuMountOptions = {}): MeikyuuMount | null {
  const first = puzzleOf(options);
  if (first === null) return null;
  const document = host.ownerDocument;
  ensureMeikyuuPlayStyle(host);

  let puzzle: MeikyuuPuzzle = first;
  let look: MazeLook = { board: options.board, trail: options.trail, wall: options.wall, line: options.line };
  let tapExtends = options.tap === true;
  let stoneOption: StoneOption | undefined = options.stones;
  let stoneModeOn = false;
  let withHints = options.hints !== false;
  const withControls = options.controls !== false;
  const withZoom = options.zoom !== false;
  let sounds: MeikyuuSounds | null = options.sound === true ? createMeikyuuSounds() : null;
  let orientationSetting: MeikyuuOrientation = options.orientation ?? "auto";
  let ratioOption: NonNullable<MeikyuuMountOptions["ratio"]> = options.ratio ?? "square";
  const gutterLeast = Math.max(0, options.gutter ?? MEIKYUU_GUTTER);
  const gutterMost = Math.max(gutterLeast, MEIKYUU_GUTTER_MAX);
  let gutterNow = gutterLeast;
  const reserve = options.reserve ?? MEIKYUU_RESERVE;
  let panOn = options.pan === true;
  let edgePanOn = options.edgePan !== false;
  let fitMode: FitMode = options.fit ?? "both";
  let turnNow: Turn = 0;
  let explicitLanguage = options.language;
  let language: MeikyuuLanguage = explicitLanguage ?? meikyuuLanguageOf(host.closest("[lang]")?.getAttribute("lang") ?? document.documentElement.lang);
  const callbacks = options;
  const still = (): boolean => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The parts.
  host.classList.add("meikyuu-play");
  host.replaceChildren();
  const tabs = create(document, "div", "mk-tabs");
  tabs.setAttribute("role", "tablist");
  const wrap = create(document, "div", "mk-wrap");
  const box = create(document, "div", "mk-box");
  box.tabIndex = 0;
  box.setAttribute("role", "group");
  const banner = create(document, "div", "mk-banner");
  banner.setAttribute("aria-hidden", "true");
  banner.dataset.show = "false";
  wrap.append(box, banner);
  const controls = create(document, "div", "mk-controls");
  const pad = create(document, "div", "mk-pad");
  pad.setAttribute("role", "group");
  const says = create(document, "p", "mk-says");
  const progress = create(document, "p", "mk-progress");
  progress.setAttribute("aria-live", "polite");
  const messages = create(document, "p", "mk-messages");
  messages.setAttribute("aria-live", "polite");
  host.append(tabs, wrap);
  if (withControls) host.append(controls, pad, says, progress, messages);

  const button = (name: string, onPress: () => void, parent: HTMLElement, className = "mk-button"): HTMLButtonElement => {
    const one = create(document, "button", className);
    one.type = "button";
    one.dataset.action = name;
    one.addEventListener("click", onPress);
    parent.append(one);
    return one;
  };
  const undoButton = button("undo", () => api.undo(), controls);
  const restartButton = button("restart", () => api.restart(), controls);
  const hintButton = button("hint", () => api.hint(), controls);
  const outButton = button("out", () => api.zoomOut(), pad);
  const inButton = button("in", () => api.zoomIn(), pad);
  const fitButton = button("fit", () => api.fit(), pad);
  const panButton = button("pan", () => api.pan(!panOn), pad);
  const stoneButton = button("stone", () => api.stoneMode(!stoneModeOn), controls);
  const turnButton = button("turn", () => api.orientation(turnNow === 1 ? (orientationSetting === "landscape" ? "portrait" : "landscape") : orientationSetting === "portrait" ? "landscape" : "portrait"), pad);
  outButton.textContent = "−";
  inButton.textContent = "+";
  const arrowsTab = button("tab-arrows", () => api.show("arrows"), tabs, "mk-tab");
  const mazeTab = button("tab-maze", () => api.show("maze"), tabs, "mk-tab");
  for (const tab of [arrowsTab, mazeTab]) tab.setAttribute("role", "tab");

  // The state.
  let maze: Maze | null = null;
  let mazeGame: MazeGame | null = null;
  let board: ArrowBoard | null = null;
  let arrowGame: ArrowGame | null = null;
  let viewing: "maze" | "arrows" = "maze";
  let hintedMaze: { back: number; cells: readonly number[] } | null = null;
  let hintedArrow: number | null = null;
  /** The word of what has just happened, and which board it is about: it is not carried to the other tab of a mixed puzzle. */
  let message: { key: string; values: Record<string, string | number>; warn: boolean; on: "maze" | "arrows" } | null = null;
  let pendingSolve = false;
  let solveTold = false;
  let moves = 0;
  let mazeSurface: MazeSurface | null = null;
  let arrowSurface: ArrowSurface | null = null;

  const say = (key: string, values: Record<string, string | number> = {}): string => meikyuuSay(language, key, values);
  const playSound = (kind: MeikyuuSoundKind): void => sounds?.play(kind);
  const detail = (): MeikyuuEventDetail => ({
    kind: puzzle.kind,
    level: puzzle.level ?? null,
    moves,
    cells: mazeGame?.path.length ?? 0,
    keys: mazeGame?.collected.length ?? 0,
    keysOf: maze?.keys.length ?? 0,
    hearts: arrowGame?.hearts ?? null,
    arrowsLeft: arrowGame === null ? null : arrowsLeft(arrowGame),
    solved: puzzle.kind === "maze" ? mazeGame?.solved === true : arrowGame?.status === "cleared",
    orientation: shownOrientation(),
    turned: turnNow === 1,
    stones: mazeGame?.stones.length ?? 0,
    stonesLeft: mazeGame === null ? 0 : stonesLeft(mazeGame),
  });
  const tell = (name: string, callback?: (detail: MeikyuuEventDetail) => void): void => {
    const info = detail();
    callback?.(info);
    host.dispatchEvent(new CustomEvent(name, { detail: info, bubbles: true }));
  };
  const surfaceNow = (): MazeSurface | ArrowSurface | null => (viewing === "maze" ? mazeSurface : arrowSurface);

  // The box: its shape, the page beside it, and which way up the maze is shown.
  /** The shape of the box as the maze was made: width over height. */
  const aspectNow = (): number => {
    if (viewing !== "maze" || maze === null || ratioOption === "square") return 1;
    if (ratioOption === "maze") return Math.min(2, Math.max(0.5, maze.grid.box.w / maze.grid.box.h));
    return ratioOption > 0 ? ratioOption : 1;
  };
  /** The room a board may have: the host's width less the gutters, and the window's height less what else is on the page. */
  const roomNow = (): { width: number; height: number } | null => {
    if (host.clientWidth <= 0) return null;
    const window_ = host.ownerDocument.defaultView ?? window;
    const height = window_.visualViewport?.height ?? window_.innerHeight;
    return { width: Math.max(1, host.clientWidth - 2 * gutterLeast), height: Math.max(height - reserve, height * 0.6) };
  };
  const resolveNow = (): Turn => (viewing !== "maze" || maze === null ? 0 : resolveTurn(orientationSetting, maze.grid.box, aspectNow(), roomNow()));
  /** `portrait` when the maze is taller than wide as it is shown, `landscape` when it is wider. */
  function shownOrientation(): "portrait" | "landscape" | null {
    if (viewing !== "maze" || maze === null) return null;
    const { w, h } = maze.grid.box;
    return (turnNow === 1 ? h > w : w > h) ? "landscape" : "portrait";
  }
  /** Whether the maze has a shape worth turning: not square within a tenth. */
  function isTurnable(): boolean {
    if (maze === null) return false;
    const ratio = maze.grid.box.w / maze.grid.box.h;
    return ratio > 1.1 || ratio < 1 / 1.1;
  }
  /** Put the box's shape and gutters where the page's style reads them. */
  function applyBox(): void {
    const aspect = aspectNow();
    wrap.style.setProperty("--mkp-aspect", String(turnNow === 1 ? 1 / aspect : aspect));
    if (gutterNow !== gutterLeast || options.gutter !== undefined) host.style.setProperty("--mkp-gutter", `${gutterNow}px`);
    else host.style.removeProperty("--mkp-gutter");
    if (options.reserve !== undefined) host.style.setProperty("--mkp-reserve", `${reserve}px`);
    host.dataset.turned = String(turnNow === 1);
    const shown = shownOrientation();
    if (shown === null) delete host.dataset.orientation;
    else host.dataset.orientation = shown;
    host.dataset.gutter = String(Math.round(gutterNow));
  }
  /** How much of the page shows beside the box now, in pixels: the nearer of its two sides to the window's edge. */
  const visibleGutter = (): number => {
    const rect = box.getBoundingClientRect();
    return Math.max(0, Math.min(rect.left, (host.ownerDocument.defaultView ?? window).innerWidth - rect.right));
  };
  /** The gutters come in steps of `MEIKYUU_GUTTER_STEP` from the least: the first step past what shows now, or the last one below it. */
  const stepUp = (from: number): number => Math.min(gutterMost, gutterLeast + Math.floor((from - gutterLeast) / MEIKYUU_GUTTER_STEP + 1) * MEIKYUU_GUTTER_STEP);
  const stepDown = (from: number): number => Math.max(gutterLeast, gutterLeast + (Math.ceil((from - gutterLeast) / MEIKYUU_GUTTER_STEP) - 1) * MEIKYUU_GUTTER_STEP);
  /** Whether a wider gutter would show: the page does not already show the widest beside the box. */
  const frameCanWiden = (): boolean => gutterNow < gutterMost && visibleGutter() < gutterMost - 1;
  function setGutter(px: number): number {
    const next = Math.min(gutterMost, Math.max(gutterLeast, px));
    if (Math.abs(next - gutterNow) < 0.01) return gutterNow;
    gutterNow = next;
    applyBox();
    words();
    return gutterNow;
  }
  /** A pinch the box has no room for: fingers together with the whole maze in the box widens the gutters, and fingers apart narrows them again. */
  function frameZoom(factor: number): boolean {
    const width = box.clientWidth || 1;
    if (factor < 1) {
      if (!frameCanWiden()) return false;
      setGutter(Math.max(gutterNow, visibleGutter()) + (width * (1 - factor)) / 2);
      return true;
    }
    if (gutterNow <= gutterLeast) return false;
    setGutter(gutterNow - (width * (factor - 1)) / 2);
    return true;
  }
  /** The window or the host changed size: a maze may now fit better the other way up. */
  function reflow(): void {
    if (viewing !== "maze" || maze === null || mazeSurface === null) return;
    const next = resolveNow();
    if (next === turnNow) return;
    turnNow = next;
    applyBox();
    mazeSurface.turn(next);
    words();
    tell("meikyuu-orientation");
  }
  const setMessage = (key: string | null, values: Record<string, string | number> = {}, warn = false, on: "maze" | "arrows" = viewing): void => {
    message = key === null ? null : { key, values, warn, on };
  };

  // What the line says, in words, and the buttons' states.
  function words(): void {
    const mixed = puzzle.kind === "mixed";
    const onMaze = viewing === "maze";
    const solved = puzzle.kind === "maze" ? mazeGame?.solved === true : arrowGame?.status === "cleared";
    host.dataset.kind = puzzle.kind;
    host.dataset.level = String(puzzle.level ?? "");
    host.dataset.view = viewing;
    host.dataset.solved = String(solved);
    host.dataset.moves = String(moves);
    if (mazeGame !== null) {
      host.dataset.cells = String(mazeGame.path.length);
      host.dataset.keys = String(mazeGame.collected.length);
      host.dataset.reached = String(mazeGame.solved);
    }
    if (arrowGame !== null) {
      host.dataset.hearts = String(arrowGame.hearts);
      host.dataset.left = String(arrowsLeft(arrowGame));
      host.dataset.unlocked = String(arrowGame.unlocked);
      host.dataset.status = arrowGame.status;
    }
    tabs.hidden = !mixed;
    arrowsTab.textContent = say("tabArrows");
    mazeTab.textContent = say("tabMaze");
    arrowsTab.setAttribute("aria-selected", String(!onMaze));
    mazeTab.setAttribute("aria-selected", String(onMaze));
    tabs.setAttribute("aria-label", say("tabsLabel"));
    banner.textContent = onMaze && !mixed ? say("solved", { n: moves }) : say("arrowsCleared");
    banner.dataset.show = String(solved);
    if (mixed && mazeGame?.solved === true && onMaze) banner.dataset.show = "false";
    const surface = surfaceNow();
    const state = surface?.surface.state();
    undoButton.textContent = say("undo");
    restartButton.textContent = say("restart");
    hintButton.textContent = say("hint");
    hintButton.hidden = !withHints;
    fitButton.textContent = say("fit");
    outButton.setAttribute("aria-label", say("zoomOut"));
    inButton.setAttribute("aria-label", say("zoomIn"));
    pad.setAttribute("aria-label", say("zoomLabel"));
    pad.hidden = !withZoom;
    fitButton.disabled = state?.fitted === true && gutterNow === gutterLeast;
    outButton.disabled = state?.atLeast === true && !frameCanWiden();
    inButton.disabled = state?.atMost === true && gutterNow <= gutterLeast;
    panButton.textContent = say("pan");
    panButton.setAttribute("aria-label", say("panLabel"));
    panButton.setAttribute("aria-pressed", String(panOn));
    turnButton.textContent = say("turn");
    turnButton.setAttribute("aria-label", say("turnLabel"));
    turnButton.hidden = options.turnButton !== true || maze === null || viewing !== "maze" || !isTurnable();
    host.dataset.pan = String(panOn);
    const stonesOn = viewing === "maze" && mazeGame?.rules != null;
    stoneButton.hidden = !stonesOn;
    stoneButton.textContent = say("stone");
    stoneButton.setAttribute("aria-label", say("stoneLabel"));
    stoneButton.setAttribute("aria-pressed", String(stoneModeOn && stonesOn));
    stoneButton.disabled = mazeGame?.solved === true;
    host.dataset.stones = String(mazeGame?.stones.length ?? 0);
    host.dataset.stoneMode = String(stoneModeOn && stonesOn);
    if (stonesOn) host.dataset.stonesLeft = String(stonesLeft(mazeGame!) ?? "none");
    else delete host.dataset.stonesLeft;
    const lost = !onMaze && arrowGame?.status === "lost";
    const finished = !onMaze && arrowGame?.status === "cleared";
    undoButton.disabled = onMaze ? mazeGame === null || mazeGame.undo.length === 0 : arrowGame === null || arrowGame.taken.length === 0 || lost;
    restartButton.disabled = onMaze ? mazeGame === null || (mazeGame.path.length === 0 && mazeGame.strokes === 0 && mazeGame.stones.length === 0) : arrowGame === null || (arrowGame.taken.length === 0 && arrowGame.mistakes === 0);
    hintButton.disabled = onMaze ? mazeGame?.solved === true : lost || finished;
    const label = onMaze && maze !== null ? say("mazeLabel", { shape: say(`shape_${maze.recipe.shape}`), n: maze.grid.cells, play: mixed ? say("mazeForButton") : say(`play_${maze.recipe.mode.replace(/-/g, "_")}`) }) : board === null ? "" : say("arrowsLabel", { n: board.arrows.length, shape: say(`shape_${board.recipe.shape}`) });
    box.setAttribute("aria-label", label);
    if (!withControls) return;
    const joiner = language === "ja" ? "" : " ";
    // The line on how to play, the line of progress, and the word of what has just happened.
    says.textContent = onMaze && maze !== null && stoneModeOn && mazeGame?.rules != null ? say("stoneHow", { n: mazeGame.rules.reach }) : onMaze && maze !== null ? (mixed ? say("mazeForButton") : say(`play_${maze.recipe.mode.replace(/-/g, "_")}`)) : `${say("arrowsHint")}${mixed && board !== null && board.locked.some(Boolean) && arrowGame?.unlocked !== true ? `${joiner}${say("lockedCount", { n: board.locked.filter(Boolean).length })}` : ""}`;
    if (onMaze && mazeGame !== null && maze !== null) {
      const parts: string[] = [];
      if (mazeGame.solved) parts.push(mixed ? say(arrowGame?.status === "cleared" ? "arrowsCleared" : "arrowsUnlocked") : say("solved", { n: moves }));
      else {
        parts.push(mazeGame.path.length === 0 ? say("notStarted") : say("drawn", { n: mazeGame.path.length }));
        if (maze.keys.length > 0) parts.push(say("keysOf", { k: mazeGame.collected.length, total: maze.keys.length }));
        if (mazeGame.rules !== null) {
          const left = stonesLeft(mazeGame);
          parts.push(left === null ? say("stonesFree", { n: mazeGame.stones.length }) : say("stonesLeft", { n: left }));
        }
      }
      progress.textContent = parts.join(joiner);
    } else if (arrowGame !== null) {
      const hearts = "♥".repeat(arrowGame.hearts) + "♡".repeat(arrowGame.heartsAtStart - arrowGame.hearts);
      progress.textContent = arrowGame.status === "cleared" ? say("arrowsCleared") : `${say("arrowsLeft", { n: arrowsLeft(arrowGame) })}${joiner}${say("hearts", { n: arrowGame.hearts, total: arrowGame.heartsAtStart })} ${hearts}`;
    }
    // The word of what has just happened is about one board and is said on that board only (the unlock is told on the labyrinth by the line above it,
    // and on the arrows by this one). A puzzle out of hearts says so from its state, on the arrows and, in a mixed puzzle, on the labyrinth too.
    const shown = message !== null && message.on === viewing ? message : null;
    const lostNote = arrowGame?.status === "lost" ? (onMaze ? (mixed ? "arrowsLostAway" : null) : "arrowsLost") : null;
    const line = lostNote !== null && (!onMaze || shown === null) ? { key: lostNote, values: {}, warn: true } : shown;
    messages.textContent = line === null ? "" : say(line.key, line.values);
    messages.dataset.warn = String(line?.warn === true);
  }

  function refresh(): void {
    if (viewing === "maze" && mazeSurface !== null && mazeGame !== null) {
      mazeSurface.update(mazeGame, hintedMaze, mazeGame.solved && puzzle.kind === "maze");
    } else if (viewing === "arrows" && arrowSurface !== null && arrowGame !== null) arrowSurface.update(arrowGame, hintedArrow);
    words();
  }

  function mountSurface(): void {
    mazeSurface?.destroy();
    arrowSurface?.destroy();
    mazeSurface = null;
    arrowSurface = null;
    const viewChanged = (): void => {
      const state = surfaceNow()?.surface.state();
      fitButton.disabled = state?.fitted === true && gutterNow === gutterLeast;
      outButton.disabled = state?.atLeast === true && !frameCanWiden();
      inButton.disabled = state?.atMost === true && gutterNow <= gutterLeast;
    };
    if (viewing === "maze" && maze !== null) {
      turnNow = resolveNow();
      applyBox();
      mazeSurface = createMazeSurface(box, { game: () => mazeGame!, change: onMazeChange, taps: () => tapExtends, stoneMode: () => stoneModeOn && mazeGame?.rules != null, stone: layStoneAt, viewChanged }, maze, look, turnNow, { fit: fitMode, edgePan: edgePanOn, panMode: panOn, frame: { zoom: frameZoom } });
    } else if (board !== null) {
      turnNow = 0;
      applyBox();
      arrowSurface = createArrowSurface(box, { tap: onArrowTap, viewChanged }, board, look);
      if (arrowGame !== null) arrowSurface.update(arrowGame, null);
    }
    refresh();
  }

  /** The word a refused stone is told with. */
  const STONE_WHY: Partial<Record<StoneVerdict, string>> = { far: "stoneFar", "on-line": "stoneOnLine", end: "stoneEnd", limit: "stoneLimit", "no-line": "stoneNoLine", solved: "stoneSolved", drawing: "stoneDrawing", "no-cell": "stoneFar" };

  /** Tell the page the stones changed, if their number or places did. */
  function stonesMoved(before: MazeGame | null): void {
    if (before === null || mazeGame === null) return;
    if (before.stones.length === mazeGame.stones.length && before.stones.every((cell, at) => cell === mazeGame!.stones[at])) return;
    tell("meikyuu-stones", callbacks.onStones);
  }

  /** A stone asked for on a cell, by a tap in the Stone mode or a press-and-hold: laid, taken up or refused with a word. True when that did something the player should see. */
  function layStoneAt(cell: number, how: "tap" | "hold"): boolean {
    if (viewing !== "maze" || mazeGame === null || mazeGame.rules === null) return false;
    // A hold that began as a stroke (the finger was within reach of the line's end) first ends that stroke, which was never more than a press.
    const before = how === "hold" && mazeGame.drawing ? liftMaze(mazeGame) : mazeGame;
    const result = toggleStone(before, cell);
    hintedMaze = null;
    if (result.how === "refused") {
      // A hold is also what a finger does while looking about a big maze: with no line to lay a stone beside, or nothing left to do, it says nothing and moves on.
      if (how === "hold" && (result.why === "no-line" || result.why === "solved" || result.why === "drawing")) return false;
      if (before !== mazeGame) mazeGame = before;
      setMessage(STONE_WHY[result.why] ?? "stoneFar", { n: before.rules?.reach ?? 2 }, true);
      playSound("bump");
      refresh();
      return true;
    }
    mazeGame = result.game;
    setMessage(result.how === "laid" ? "stoneLaid" : "stoneTaken");
    playSound(result.how === "laid" ? "stone" : "back");
    refresh();
    stonesMoved(before);
    return true;
  }

  function onMazeChange(next: MazeGame, how: "press" | "drag" | "lift" | "tap"): void {
    const before = mazeGame!;
    mazeGame = next;
    if (how === "press" || how === "tap") {
      hintedMaze = null;
      setMessage(null);
    }
    if (how === "drag" || how === "tap") {
      if (next.path.length > before.path.length) playSound("step");
      else if (next.path.length < before.path.length) playSound("back");
      if (next.collected.length > before.collected.length) {
        playSound("key");
        tell("meikyuu-key", callbacks.onKey);
      }
    }
    if (next.solved && !before.solved) pendingSolve = true;
    if (how === "lift" || how === "tap") {
      if (next.strokes !== before.strokes) {
        moves += 1;
        tell("meikyuu-move", callbacks.onMove);
      }
      if (pendingSolve) {
        pendingSolve = false;
        finishMaze();
      }
    }
    refresh();
  }

  /** The line has reached the goal with every key: a maze is won; a labyrinth in a mixed puzzle gives its button up. */
  function finishMaze(): void {
    if (puzzle.kind === "mixed") {
      if (arrowGame !== null && !arrowGame.unlocked) {
        arrowGame = unlockArrows(arrowGame);
        setMessage("arrowsUnlocked", {}, false, "arrows");
        playSound("unlock");
        tell("meikyuu-unlock", callbacks.onUnlock);
      }
      return;
    }
    if (!solveTold) {
      solveTold = true;
      playSound("solve");
      tell("meikyuu-solve", callbacks.onSolve);
    }
  }

  function onArrowTap(id: number): void {
    if (arrowGame === null) return;
    const tapped = tapArrow(arrowGame, id);
    if (tapped.result === "ignored") return;
    arrowGame = tapped.game;
    hintedArrow = null;
    if (tapped.result === "removed") {
      setMessage(null);
      moves += 1;
      arrowSurface?.fly(id, still());
      playSound("fly");
    } else if (tapped.result === "locked") {
      setMessage(tapped.by === undefined ? "arrowsLocked" : "arrowsWaiting", {}, true);
      arrowSurface?.bump(id, tapped.by);
      playSound("bump");
    } else {
      setMessage("arrowsBlocked", {}, true);
      arrowSurface?.bump(id, tapped.by);
      playSound("bump");
      tell("meikyuu-bump", callbacks.onBump);
    }
    refresh();
    if (tapped.result === "removed") tell("meikyuu-move", callbacks.onMove);
    if (arrowGame.status === "cleared" && !solveTold) {
      solveTold = true;
      playSound("solve");
      tell("meikyuu-solve", callbacks.onSolve);
    }
    if (arrowGame.status === "lost") {
      playSound("lose");
      tell("meikyuu-lose", callbacks.onLose);
    }
  }

  function begin(next: MeikyuuPuzzle): void {
    puzzle = next;
    maze = null;
    mazeGame = null;
    board = null;
    arrowGame = null;
    hintedMaze = null;
    hintedArrow = null;
    message = null;
    pendingSolve = false;
    solveTold = false;
    moves = 0;
    banner.dataset.show = "false";
    if (next.kind === "maze") {
      maze = buildMaze(next.recipe);
      mazeGame = newMazeGame(maze, stoneRulesOf(stoneOption, maze.grid.cells));
      viewing = "maze";
    } else if (next.kind === "arrows") {
      board = makeArrows(next.recipe);
      arrowGame = newArrowGame(board);
      viewing = "arrows";
    } else {
      const mixed = buildMixed(next.recipe);
      maze = mixed.maze;
      mazeGame = newMazeGame(maze, stoneRulesOf(stoneOption, maze.grid.cells));
      board = mixed.arrows;
      arrowGame = newArrowGame(board);
      viewing = "arrows";
    }
    mountSurface();
  }

  /** The way a key points (dx, dy in cells, y down) as one step of the line: to the linked neighbour of the line's end that lies nearest that way. */
  function stepByKey(dx: number, dy: number): void {
    if (viewing !== "maze" || maze === null || mazeGame === null || mazeGame.solved) return;
    const head = headOf(mazeGame) ?? maze.start;
    if (headOf(mazeGame) === null) {
      onMazeChange(liftMaze(pressMaze(mazeGame, maze.start)), "tap");
      return;
    }
    const [hx, hy] = maze.grid.centres[head]!;
    let best = -1;
    let bestCosine = KEY_REACH;
    for (const next of maze.links[head]!) {
      const [nx, ny] = maze.grid.centres[next]!;
      const length = Math.hypot(nx - hx, ny - hy) || 1;
      const cosine = ((nx - hx) * dx + (ny - hy) * dy) / (length * Math.hypot(dx, dy));
      if (cosine > bestCosine) {
        bestCosine = cosine;
        best = next;
      }
    }
    // The cell before the end of the line is a way too: stepping toward it draws back.
    const before = mazeGame.path.length > 1 ? mazeGame.path[mazeGame.path.length - 2]! : -1;
    if (before >= 0) {
      const [bx, by] = maze.grid.centres[before]!;
      const length = Math.hypot(bx - hx, by - hy) || 1;
      const cosine = ((bx - hx) * dx + (by - hy) * dy) / (length * Math.hypot(dx, dy));
      if (cosine > bestCosine) best = before;
    }
    if (best < 0) return;
    onMazeChange(liftMaze(dragMaze(pressMaze(mazeGame, head), best)), "tap");
  }

  /** Shift and an arrow: a stone on (or taken up from) the open neighbour of the line's end that lies nearest that way. */
  function stoneByKey(dx: number, dy: number): void {
    if (viewing !== "maze" || maze === null || mazeGame === null) return;
    const head = headOf(mazeGame);
    if (head === null) return;
    const [hx, hy] = maze.grid.centres[head]!;
    let best = -1;
    let bestCosine = KEY_REACH;
    for (const next of maze.links[head]!) {
      const [nx, ny] = maze.grid.centres[next]!;
      const length = Math.hypot(nx - hx, ny - hy) || 1;
      const cosine = ((nx - hx) * dx + (ny - hy) * dy) / (length * Math.hypot(dx, dy));
      if (cosine > bestCosine) {
        bestCosine = cosine;
        best = next;
      }
    }
    if (best >= 0) layStoneAt(best, "tap");
  }

  const onKey = (event: KeyboardEvent): void => {
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
      event.preventDefault();
      api.undo();
      return;
    }
    if (event.target !== box) return;
    const arrows: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const step = arrows[event.key];
    if (step !== undefined) {
      event.preventDefault();
      if (event.shiftKey && mazeGame?.rules != null) stoneByKey(step[0], step[1]);
      else stepByKey(step[0], step[1]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (viewing === "maze" && mazeGame !== null && mazeGame.path.length === 0) stepByKey(0, 0);
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      api.undo();
    }
  };
  host.addEventListener("keydown", onKey);

  const watching = typeof MutationObserver === "undefined" ? null : new MutationObserver(() => {
    if (explicitLanguage !== undefined) return;
    const next = meikyuuLanguageOf(host.closest("[lang]")?.getAttribute("lang") ?? document.documentElement.lang);
    if (next === language) return;
    language = next;
    words();
  });
  watching?.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  const looking = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(reflow);
  looking?.observe(host);
  const windowOf = host.ownerDocument.defaultView ?? window;
  windowOf.addEventListener("resize", reflow);
  windowOf.visualViewport?.addEventListener("resize", reflow);

  const orientationNow = (): { setting: MeikyuuOrientation; orientation: "portrait" | "landscape"; turned: boolean } => ({ setting: orientationSetting, orientation: shownOrientation() ?? "portrait", turned: turnNow === 1 });

  const api: MeikyuuMount = {
    host,
    kind: () => puzzle.kind,
    puzzle: () => puzzle,
    mazeGame: () => mazeGame,
    arrowGame: () => arrowGame,
    load: (next) => {
      const made = puzzleOf(next);
      if (made === null) return false;
      if (next.ratio !== undefined) ratioOption = next.ratio;
      begin(made);
      return true;
    },
    set: (changes) => {
      const { tap, sound, hints, language: nextLanguage, ratio, stones: nextStones, ...nextLook } = changes;
      if ("stones" in changes) {
        stoneOption = nextStones;
        if (mazeGame !== null && maze !== null) {
          const before = mazeGame;
          mazeGame = withStoneRules(mazeGame, stoneRulesOf(stoneOption, maze.grid.cells));
          if (mazeGame.rules === null) stoneModeOn = false;
          stonesMoved(before);
        }
      }
      look = { ...look, ...nextLook };
      if (ratio !== undefined && ratio !== ratioOption) {
        ratioOption = ratio;
        turnNow = resolveNow();
        applyBox();
        mazeSurface?.turn(turnNow);
      }
      if (tap !== undefined) tapExtends = tap;
      if (hints !== undefined) withHints = hints;
      if (sound !== undefined) {
        if (sound && sounds === null) sounds = createMeikyuuSounds();
        else if (!sound) {
          sounds?.destroy();
          sounds = null;
        }
      }
      if (nextLanguage !== undefined) {
        explicitLanguage = nextLanguage;
        language = nextLanguage;
      }
      mazeSurface?.look(look);
      arrowSurface?.look(look);
      words();
    },
    undo: () => {
      hintedMaze = null;
      hintedArrow = null;
      setMessage(null);
      if (viewing === "maze" && mazeGame !== null) {
        const next = undoMaze(mazeGame);
        if (next === mazeGame) return;
        const before = mazeGame;
        mazeGame = next;
        playSound("back");
        refresh();
        stonesMoved(before);
        return;
      } else if (arrowGame !== null) {
        const next = undoArrow(arrowGame);
        if (next === arrowGame) return;
        arrowGame = next;
        playSound("back");
      }
      refresh();
    },
    restart: () => {
      hintedMaze = null;
      hintedArrow = null;
      setMessage(null);
      if (viewing === "maze" && mazeGame !== null) {
        const next = restartMaze(mazeGame);
        if (next === mazeGame) return;
        const before = mazeGame;
        mazeGame = next;
        if (puzzle.kind === "maze") {
          solveTold = false;
          moves = 0;
        }
        refresh();
        stonesMoved(before);
        return;
      } else if (arrowGame !== null) {
        arrowGame = restartArrows(arrowGame);
        solveTold = false;
        moves = 0;
        // Arrows taken are back on the board: draw it afresh.
        mountSurface();
        return;
      }
      refresh();
    },
    hint: () => {
      if (viewing === "maze" && mazeGame !== null) {
        hintedMaze = hintMaze(mazeGame, Math.max(6, Math.round(Math.sqrt(maze?.grid.cells ?? 100) / 2)));
        setMessage(mazeGame.path.length === 0 ? "hintStart" : hintedMaze.back > 0 ? "hintBack" : "hintAhead", { n: hintedMaze.back });
      } else if (arrowGame !== null) {
        hintedArrow = hintArrow(arrowGame);
        setMessage(hintedArrow === null ? "arrowsLocked" : "arrowsHint", {}, hintedArrow === null);
      }
      refresh();
    },
    fit: (mode) => {
      if (mode !== undefined && mazeSurface !== null) {
        fitMode = mode;
        mazeSurface.surface.setFit(mode);
      } else surfaceNow()?.surface.fit();
      setGutter(gutterLeast);
      words();
    },
    zoomIn: () => {
      if (gutterNow > gutterLeast) setGutter(stepDown(gutterNow));
      else surfaceNow()?.surface.zoom(1.5);
    },
    zoomOut: () => {
      const state = surfaceNow()?.surface.state();
      if (state?.atLeast === true && frameCanWiden()) setGutter(stepUp(Math.max(gutterNow, visibleGutter())));
      else surfaceNow()?.surface.zoom(1 / 1.5);
    },
    gutter: (px) => (px === undefined ? gutterNow : setGutter(px)),
    pan: (on) => {
      if (on !== undefined) {
        panOn = on;
        mazeSurface?.surface.setPanMode(on);
        words();
      }
      return panOn;
    },
    edgePan: (on) => {
      if (on !== undefined) {
        edgePanOn = on;
        mazeSurface?.surface.setEdgePan(on);
      }
      return edgePanOn;
    },
    orientation: (setting) => {
      if (setting !== undefined && setting !== orientationSetting) {
        orientationSetting = setting;
        reflow();
        words();
      }
      return orientationNow();
    },
    stoneMode: (on) => {
      const possible = viewing === "maze" && mazeGame?.rules != null;
      if (on !== undefined && (on && possible) !== stoneModeOn) {
        stoneModeOn = on && possible;
        words();
      } else if (on === false && stoneModeOn) {
        stoneModeOn = false;
        words();
      }
      return stoneModeOn && possible;
    },
    stones: () => mazeGame?.stones ?? [],
    stonesLeft: () => (mazeGame === null ? 0 : stonesLeft(mazeGame)),
    stone: (cell) => {
      if (viewing !== "maze" || mazeGame === null) return "off";
      const result = toggleStone(mazeGame, cell);
      if (result.how === "refused") return result.why;
      layStoneAt(cell, "tap");
      return "ok";
    },
    clearStones: () => {
      if (mazeGame === null) return;
      const before = mazeGame;
      const next = clearStones(before);
      if (next === before) return;
      mazeGame = next;
      setMessage(null);
      refresh();
      stonesMoved(before);
    },
    run: () => (mazeGame === null ? "" : encodeRun(mazeGame)),
    restore: (code) => {
      if (viewing !== "maze" || maze === null || mazeGame === null) return false;
      const restored = decodeRun(maze, code, mazeGame.rules);
      if (restored === null) return false;
      const before = mazeGame;
      mazeGame = restored;
      hintedMaze = null;
      setMessage(null);
      moves = restored.strokes;
      solveTold = restored.solved && puzzle.kind === "maze";
      pendingSolve = false;
      refresh();
      stonesMoved(before);
      return true;
    },
    show: (which) => {
      if (puzzle.kind !== "mixed" || which === viewing) return;
      viewing = which;
      mountSurface();
    },
    destroy: () => {
      mazeSurface?.destroy();
      arrowSurface?.destroy();
      sounds?.destroy();
      watching?.disconnect();
      looking?.disconnect();
      windowOf.removeEventListener("resize", reflow);
      windowOf.visualViewport?.removeEventListener("resize", reflow);
      host.removeEventListener("keydown", onKey);
      host.style.removeProperty("--mkp-gutter");
      host.style.removeProperty("--mkp-reserve");
      host.replaceChildren();
      host.classList.remove("meikyuu-play");
      for (const name of ["kind", "level", "view", "solved", "moves", "cells", "keys", "reached", "hearts", "left", "unlocked", "status", "orientation", "turned", "gutter", "pan", "stones", "stoneMode", "stonesLeft"]) delete host.dataset[name];
    },
  };

  begin(first);
  return api;
}
