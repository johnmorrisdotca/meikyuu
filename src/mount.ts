import { type ArrowGame, arrowsLeft } from "./arrowGame.ts";
import type { ArrowSurface } from "./arrowSurface.ts";
import { type ArrowRecipe, parseArrowRecipe } from "./arrows.ts";
import { createBanner } from "./banner.ts";
import type { MazeLook } from "./draw.ts";
import type { MazeGame } from "./game.ts";
import { levelOf, type MeikyuuKind } from "./levels.ts";
import { type MazeRecipe, parseRecipe } from "./maze.ts";
import type { MazeSurface } from "./mazeSurface.ts";
import { type MixedRecipe, parseMixedRecipe } from "./mixed.ts";
import { mountHandle } from "./mountApi.ts";
import { bindPlay } from "./mountPlay.ts";
import type { MountSession } from "./mountSession.ts";
import { type MeikyuuOrientation, resolveTurn, type Turn } from "./orientation.ts";
import { MEIKYUU_PLAY_STYLE } from "./playStyle.ts";
import { createMeikyuuSounds, type MeikyuuSoundKind } from "./sound.ts";
import { type StoneOption, type StoneVerdict, stonesLeft } from "./stones.ts";
import { type MeikyuuLanguage, meikyuuLanguageOf, meikyuuSay } from "./strings.ts";
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

/** The page left beside the box, in pixels: the least, and the most the zoom-out widens it to.
 *
 * @example
 * ```ts
 * import { MEIKYUU_GUTTER } from "@johnmorrisdotca/meikyuu/play";
 * console.log(MEIKYUU_GUTTER);
 * ```
 */
export const MEIKYUU_GUTTER = 24;
/** The maximum native viewport gutter in pixels.
 *
 * @example
 * ```ts
 * import { MEIKYUU_GUTTER_MAX } from "@johnmorrisdotca/meikyuu/play";
 * console.log(MEIKYUU_GUTTER_MAX);
 * ```
 */
export const MEIKYUU_GUTTER_MAX = 72;
/** How much one press of Zoom out widens the gutters, and one press of Zoom in narrows them. */
const MEIKYUU_GUTTER_STEP = 24;
/** What a window is assumed to hold besides the box, in pixels: the page's header, and the board's buttons and lines of words.
 *
 * @example
 * ```ts
 * import { MEIKYUU_RESERVE } from "@johnmorrisdotca/meikyuu/play";
 * console.log(MEIKYUU_RESERVE);
 * ```
 */
export const MEIKYUU_RESERVE = 200;

/** What is being played.
 *
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import type { MeikyuuPuzzle } from "@johnmorrisdotca/meikyuu/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const value: MeikyuuPuzzle = {kind:"maze",recipe};
 * console.log(value);
 * ```
 */
export type MeikyuuPuzzle =
  | { kind: "maze"; recipe: MazeRecipe; level?: number }
  | { kind: "arrows"; recipe: ArrowRecipe; level?: number }
  | { kind: "mixed"; recipe: MixedRecipe; level?: number };

/** What every event tells of the board.
 *
 * @example
 * ```ts
 * import type { MeikyuuEventDetail } from "@johnmorrisdotca/meikyuu/play";
 * import { arrowsLeft, stonesLeft } from "@johnmorrisdotca/meikyuu";
 *
 * const value: MeikyuuEventDetail = {kind:"maze",level:null,moves:0,cells:0,keys:0,keysOf:0,hearts:null,arrowsLeft:null,solved:false,orientation:"landscape",turned:false,stones:0,stonesLeft:null};
 * console.log(value);
 * ```
 */
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

/** Native puzzle/level/recipe, display, controls, sound, stones and event callbacks for a flat player.
 *
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import type { MeikyuuMountOptions } from "@johnmorrisdotca/meikyuu/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const value: MeikyuuMountOptions = {kind:"maze",recipe,language:"en"};
 * console.log(value);
 * ```
 */
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
  /** Show the message over the board when the puzzle is solved ("Solved in 3 strokes."); a tap on it, its close button or Escape puts it away. False for none (the line of words under the board still says so). Default true. */
  banner?: boolean;
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

/** The mounted flat maze, arrow or mixed board, its game/actions, view and cleanup handle.
 *
 * @example
 * ```ts no-run
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import type { MeikyuuMount } from "@johnmorrisdotca/meikyuu/play";
 * import { mountMeikyuu } from "@johnmorrisdotca/meikyuu/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const host = document.createElement("div");
 * document.body.append(host);
 * const player: MeikyuuMount | null = mountMeikyuu(host,{kind:"maze",recipe});
 * console.log(player?.kind());
 * player?.destroy();
 * ```
 */
export type MeikyuuMount = {
  readonly host: HTMLElement;
  kind: () => MeikyuuKind;
  puzzle: () => MeikyuuPuzzle;
  /** The maze game as it stands (a maze, or the labyrinth of a mixed puzzle), or null for arrows. */
  mazeGame: () => MazeGame | null;
  /** The arrow game as it stands, or null for a maze. */
  arrowGame: () => ArrowGame | null;
  /** Play another puzzle: a level or a recipe. Returns false when there is no such puzzle. */
  load: (puzzle: {
    kind?: MeikyuuKind;
    level?: number;
    recipe?: MeikyuuMountOptions["recipe"];
    ratio?: MeikyuuMountOptions["ratio"];
  }) => boolean;
  /** Change how it looks or is played: board, trail, tap, sound, hints, language, the shape of the box (`ratio`), and the stones' rules (`stones`; stones already down stay down). */
  set: (
    changes: MazeLook & {
      tap?: boolean;
      sound?: boolean;
      hints?: boolean;
      banner?: boolean;
      language?: MeikyuuLanguage;
      ratio?: MeikyuuMountOptions["ratio"];
      stones?: StoneOption;
    },
  ) => void;
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
  orientation: (setting?: MeikyuuOrientation) => {
    setting: MeikyuuOrientation;
    orientation: "portrait" | "landscape";
    turned: boolean;
  };
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
  /** Carry on a run kept by `run()`: draws the line and the stones as they were, with one Undo that takes it all back. False, and nothing changed, for a text that is not a run of this maze (or for arrows). */
  restore: (code: string) => boolean;
  /** For a mixed puzzle: look at the arrows or the labyrinth. */
  show: (board: "arrows" | "maze") => void;
  /** Take the board down: its listeners, its timers and everything it put in the host. */
  destroy: () => void;
};

/** Put the style in the page once: in the document's head, or in the shadow root the host is in.
 *
 * @param host - The DOM host receiving the native player or styles.
 * @returns Nothing; native scoped styles are installed for the host.
 * @example
 * ```ts no-run
 * import { ensureMeikyuuPlayStyle } from "@johnmorrisdotca/meikyuu/play";
 *
 * const host = document.createElement("div");
 * ensureMeikyuuPlayStyle(host);
 * console.log(host.tagName);
 * ```
 */
export function ensureMeikyuuPlayStyle(host: Element): void {
  const root = host.getRootNode();
  const target: ParentNode =
    typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root : host.ownerDocument.head;
  if (target.querySelector("style[data-meikyuu-play]") !== null) return;
  const style = host.ownerDocument.createElement("style");
  style.setAttribute("data-meikyuu-play", "");
  style.textContent = MEIKYUU_PLAY_STYLE;
  target.append(style);
}

/** The puzzle a set of options names: a level of the package's lists, or a recipe given, or null.
 *
 * @param options - Native display/mount choices, or the point tuple specified by this signature.
 * @returns The puzzle a set of options names: a level of the package's lists, or a recipe given, or null.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { puzzleOf } from "@johnmorrisdotca/meikyuu/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * console.log(puzzleOf({kind:"maze",recipe})?.kind);
 * ```
 */
export function puzzleOf(options: {
  kind?: MeikyuuKind;
  level?: number;
  recipe?: MeikyuuMountOptions["recipe"];
}): MeikyuuPuzzle | null {
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

function create<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** Draw a puzzle into `host` and play it. Returns the handle that drives it, or null for a level or recipe that is none.
 * @param host - The HTMLElement that owns the native interface.
 * @param options - Native settings and callbacks for this mounted interface.
 * @returns The native mounted handle, or null for unsupported settings.
 * @example
 * ```ts
 * import { mountMeikyuu } from "@johnmorrisdotca/meikyuu/play";
 * const show = (host: HTMLElement, options: Parameters<typeof mountMeikyuu>[1]) => mountMeikyuu(host, options);
 * console.log(typeof show); // function
 * ```
 */
export function mountMeikyuu(host: HTMLElement, options: MeikyuuMountOptions = {}): MeikyuuMount | null {
  const s = {} as MountSession;
  s.host = host;
  s.options = options;
  const first = puzzleOf(s.options);
  if (first === null) return null;
  s.document = s.host.ownerDocument;
  ensureMeikyuuPlayStyle(s.host);

  s.puzzle = first;
  s.look = { board: s.options.board, trail: s.options.trail, wall: s.options.wall, line: s.options.line };
  s.tapExtends = s.options.tap === true;
  s.stoneOption = s.options.stones;
  s.stoneModeOn = false;
  s.withHints = s.options.hints !== false;
  s.withControls = s.options.controls !== false;
  s.withZoom = s.options.zoom !== false;
  s.sounds = s.options.sound === true ? createMeikyuuSounds() : null;
  s.orientationSetting = s.options.orientation ?? "auto";
  s.ratioOption = s.options.ratio ?? "square";
  s.gutterLeast = Math.max(0, s.options.gutter ?? MEIKYUU_GUTTER);
  s.gutterMost = Math.max(s.gutterLeast, MEIKYUU_GUTTER_MAX);
  s.gutterNow = s.gutterLeast;
  s.reserve = s.options.reserve ?? MEIKYUU_RESERVE;
  s.panOn = s.options.pan === true;
  s.edgePanOn = s.options.edgePan !== false;
  s.fitMode = s.options.fit ?? "both";
  s.turnNow = 0;
  s.explicitLanguage = s.options.language;
  s.language =
    s.explicitLanguage ??
    meikyuuLanguageOf(s.host.closest("[lang]")?.getAttribute("lang") ?? s.document.documentElement.lang);
  s.callbacks = s.options;
  s.still = (): boolean =>
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The parts.
  s.host.classList.add("meikyuu-play");
  s.host.replaceChildren();
  s.tabs = create(s.document, "div", "mk-tabs");
  s.tabs.setAttribute("role", "tablist");
  s.wrap = create(s.document, "div", "mk-wrap");
  s.box = create(s.document, "div", "mk-box");
  s.box.tabIndex = 0;
  s.box.setAttribute("role", "group");
  s.banner = createBanner(s.document, s.host, s.options.banner !== false);
  s.wrap.append(s.box, s.banner.element);
  s.controls = create(s.document, "div", "mk-controls");
  s.pad = create(s.document, "div", "mk-pad");
  s.pad.setAttribute("role", "group");
  s.says = create(s.document, "p", "mk-says");
  s.progress = create(s.document, "p", "mk-progress");
  s.progress.setAttribute("aria-live", "polite");
  s.messages = create(s.document, "p", "mk-messages");
  s.messages.setAttribute("aria-live", "polite");
  s.host.append(s.tabs, s.wrap);
  if (s.withControls) s.host.append(s.controls, s.pad, s.says, s.progress, s.messages);

  s.button = (name: string, onPress: () => void, parent: HTMLElement, className = "mk-button"): HTMLButtonElement => {
    const one = create(s.document, "button", className);
    one.type = "button";
    one.dataset.action = name;
    one.addEventListener("click", onPress);
    parent.append(one);
    return one;
  };
  s.undoButton = s.button("undo", () => s.api.undo(), s.controls);
  s.restartButton = s.button("restart", () => s.api.restart(), s.controls);
  s.hintButton = s.button("hint", () => s.api.hint(), s.controls);
  s.outButton = s.button("out", () => s.api.zoomOut(), s.pad);
  s.inButton = s.button("in", () => s.api.zoomIn(), s.pad);
  s.fitButton = s.button("fit", () => s.api.fit(), s.pad);
  s.panButton = s.button("pan", () => s.api.pan(!s.panOn), s.pad);
  s.stoneButton = s.button("stone", () => s.api.stoneMode(!s.stoneModeOn), s.controls);
  s.turnButton = s.button(
    "turn",
    () =>
      s.api.orientation(
        s.turnNow === 1
          ? s.orientationSetting === "landscape"
            ? "portrait"
            : "landscape"
          : s.orientationSetting === "portrait"
            ? "landscape"
            : "portrait",
      ),
    s.pad,
  );
  s.outButton.textContent = "−";
  s.inButton.textContent = "+";
  s.arrowsTab = s.button("tab-arrows", () => s.api.show("arrows"), s.tabs, "mk-tab");
  s.mazeTab = s.button("tab-maze", () => s.api.show("maze"), s.tabs, "mk-tab");
  for (const tab of [s.arrowsTab, s.mazeTab]) tab.setAttribute("role", "tab");

  // The state.
  s.maze = null;
  s.mazeGame = null;
  s.board = null;
  s.arrowGame = null;
  s.viewing = "maze";
  s.hintedMaze = null;
  s.hintedArrow = null;
  /** The word of what has just happened, and which board it is about: it is not carried to the other tab of a mixed puzzle. */
  s.message = null;
  s.pendingSolve = false;
  s.solveTold = false;
  s.moves = 0;
  s.mazeSurface = null;
  s.arrowSurface = null;

  s.say = (key: string, values: Record<string, string | number> = {}): string => meikyuuSay(s.language, key, values);
  s.playSound = (kind: MeikyuuSoundKind): void => s.sounds?.play(kind);
  s.detail = (): MeikyuuEventDetail => ({
    kind: s.puzzle.kind,
    level: s.puzzle.level ?? null,
    moves: s.moves,
    cells: s.mazeGame?.path.length ?? 0,
    keys: s.mazeGame?.collected.length ?? 0,
    keysOf: s.maze?.keys.length ?? 0,
    hearts: s.arrowGame?.hearts ?? null,
    arrowsLeft: s.arrowGame === null ? null : arrowsLeft(s.arrowGame),
    solved: s.puzzle.kind === "maze" ? s.mazeGame?.solved === true : s.arrowGame?.status === "cleared",
    orientation: shownOrientation(),
    turned: s.turnNow === 1,
    stones: s.mazeGame?.stones.length ?? 0,
    stonesLeft: s.mazeGame === null ? 0 : stonesLeft(s.mazeGame),
  });
  s.tell = (name: string, callback?: (detail: MeikyuuEventDetail) => void): void => {
    const info = s.detail();
    callback?.(info);
    s.host.dispatchEvent(
      new CustomEvent(name, { detail: JSON.parse(JSON.stringify(info)), bubbles: true, composed: true }),
    );
  };
  s.surfaceNow = (): MazeSurface | ArrowSurface | null => (s.viewing === "maze" ? s.mazeSurface : s.arrowSurface);

  // The box: its shape, the page beside it, and which way up the maze is shown.
  /** The shape of the box as the maze was made: width over height. */
  s.aspectNow = (): number => {
    if (s.viewing !== "maze" || s.maze === null || s.ratioOption === "square") return 1;
    if (s.ratioOption === "maze") return Math.min(2, Math.max(0.5, s.maze.grid.box.w / s.maze.grid.box.h));
    return s.ratioOption > 0 ? s.ratioOption : 1;
  };
  /** The room a board may have: the host's width less the gutters, and the window's height less what else is on the page. */
  s.roomNow = (): { width: number; height: number } | null => {
    if (s.host.clientWidth <= 0) return null;
    const window_ = s.host.ownerDocument.defaultView ?? window;
    const height = window_.visualViewport?.height ?? window_.innerHeight;
    return {
      width: Math.max(1, s.host.clientWidth - 2 * s.gutterLeast),
      height: Math.max(height - s.reserve, height * 0.6),
    };
  };
  s.resolveNow = (): Turn =>
    s.viewing !== "maze" || s.maze === null
      ? 0
      : resolveTurn(s.orientationSetting, s.maze.grid.box, s.aspectNow(), s.roomNow());
  /** `portrait` when the maze is taller than wide as it is shown, `landscape` when it is wider. */
  function shownOrientation(): "portrait" | "landscape" | null {
    if (s.viewing !== "maze" || s.maze === null) return null;
    const { w, h } = s.maze.grid.box;
    return (s.turnNow === 1 ? h > w : w > h) ? "landscape" : "portrait";
  }
  /** Whether the maze has a shape worth turning: not square within a tenth. */
  function isTurnable(): boolean {
    if (s.maze === null) return false;
    const ratio = s.maze.grid.box.w / s.maze.grid.box.h;
    return ratio > 1.1 || ratio < 1 / 1.1;
  }
  /** Put the box's shape and gutters where the page's style reads them. */
  function applyBox(): void {
    const aspect = s.aspectNow();
    s.wrap.style.setProperty("--mkp-aspect", String(s.turnNow === 1 ? 1 / aspect : aspect));
    if (s.gutterNow !== s.gutterLeast || s.options.gutter !== undefined)
      s.host.style.setProperty("--mkp-gutter", `${s.gutterNow}px`);
    else s.host.style.removeProperty("--mkp-gutter");
    if (s.options.reserve !== undefined) s.host.style.setProperty("--mkp-reserve", `${s.reserve}px`);
    s.host.dataset.turned = String(s.turnNow === 1);
    const shown = shownOrientation();
    if (shown === null) delete s.host.dataset.orientation;
    else s.host.dataset.orientation = shown;
    s.host.dataset.gutter = String(Math.round(s.gutterNow));
  }
  /** How much of the page shows beside the box now, in pixels: the nearer of its two sides to the window's edge. */
  s.visibleGutter = (): number => {
    const rect = s.box.getBoundingClientRect();
    return Math.max(0, Math.min(rect.left, (s.host.ownerDocument.defaultView ?? window).innerWidth - rect.right));
  };
  /** The gutters come in steps of `MEIKYUU_GUTTER_STEP` from the least: the first step past what shows now, or the last one below it. */
  s.stepUp = (from: number): number =>
    Math.min(
      s.gutterMost,
      s.gutterLeast + Math.floor((from - s.gutterLeast) / MEIKYUU_GUTTER_STEP + 1) * MEIKYUU_GUTTER_STEP,
    );
  s.stepDown = (from: number): number =>
    Math.max(
      s.gutterLeast,
      s.gutterLeast + (Math.ceil((from - s.gutterLeast) / MEIKYUU_GUTTER_STEP) - 1) * MEIKYUU_GUTTER_STEP,
    );
  /** Whether a wider gutter would show: the page does not already show the widest beside the box. */
  s.frameCanWiden = (): boolean => s.gutterNow < s.gutterMost && s.visibleGutter() < s.gutterMost - 1;
  function setGutter(px: number): number {
    const next = Math.min(s.gutterMost, Math.max(s.gutterLeast, px));
    if (Math.abs(next - s.gutterNow) < 0.01) return s.gutterNow;
    s.gutterNow = next;
    applyBox();
    s.words();
    return s.gutterNow;
  }
  /** A pinch the box has no room for: fingers together with the whole maze in the box widens the gutters, and fingers apart narrows them again. */
  function frameZoom(factor: number): boolean {
    const width = s.box.clientWidth || 1;
    if (factor < 1) {
      if (!s.frameCanWiden()) return false;
      setGutter(Math.max(s.gutterNow, s.visibleGutter()) + (width * (1 - factor)) / 2);
      return true;
    }
    if (s.gutterNow <= s.gutterLeast) return false;
    setGutter(s.gutterNow - (width * (factor - 1)) / 2);
    return true;
  }
  /** The window or the host changed size: a maze may now fit better the other way up. */
  function reflow(): void {
    if (s.viewing !== "maze" || s.maze === null || s.mazeSurface === null) return;
    const next = s.resolveNow();
    if (next === s.turnNow) return;
    s.turnNow = next;
    applyBox();
    s.mazeSurface.turn(next);
    s.words();
    s.tell("meikyuu-orientation");
  }
  s.setMessage = (
    key: string | null,
    values: Record<string, string | number> = {},
    warn = false,
    on: "maze" | "arrows" = s.viewing,
  ): void => {
    s.message = key === null ? null : { key, values, warn, on };
  };

  s.shownOrientation = shownOrientation;
  s.isTurnable = isTurnable;
  s.applyBox = applyBox;
  s.setGutter = setGutter;
  s.reflow = reflow;
  s.frameZoom = frameZoom;
  bindPlay(s);
  s.host.addEventListener("keydown", s.onKey);

  s.watching =
    typeof MutationObserver === "undefined"
      ? null
      : new MutationObserver(() => {
          if (s.explicitLanguage !== undefined) return;
          const next = meikyuuLanguageOf(
            s.host.closest("[lang]")?.getAttribute("lang") ?? s.document.documentElement.lang,
          );
          if (next === s.language) return;
          s.language = next;
          s.words();
        });
  s.watching?.observe(s.document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  s.looking = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(reflow);
  s.looking?.observe(s.host);
  s.windowOf = s.host.ownerDocument.defaultView ?? window;
  s.windowOf.addEventListener("resize", reflow);
  s.windowOf.visualViewport?.addEventListener("resize", reflow);

  s.orientationNow = (): {
    setting: MeikyuuOrientation;
    orientation: "portrait" | "landscape";
    turned: boolean;
  } => ({ setting: s.orientationSetting, orientation: shownOrientation() ?? "portrait", turned: s.turnNow === 1 });

  const api = mountHandle(s);
  s.api = api;

  s.begin(first);
  return s.api;
}
