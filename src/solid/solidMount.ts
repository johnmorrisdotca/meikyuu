import { createBanner } from "../banner.ts";
import type { MazeLook } from "../draw.ts";
import { headOf, type MazeGame, newMazeGame } from "../game.ts";
import { ensureMeikyuuPlayStyle, MEIKYUU_GUTTER, MEIKYUU_RESERVE } from "../mount.ts";
import { createMeikyuuSounds, type MeikyuuSoundKind } from "../sound.ts";
import { type StoneOption, type StoneVerdict, stoneRulesOf, stonesLeft } from "../stones.ts";
import { type MeikyuuLanguage, meikyuuLanguageOf, meikyuuSay } from "../strings.ts";
import { readColours } from "./solidColours.ts";
import { solidHandle } from "./solidHandle.ts";
import { buildSolidMaze, parseSolidRecipe, type SolidMaze, type SolidRecipe } from "./solidMaze.ts";
import { type PaintContext, paintSolid } from "./solidPaint.ts";
import { bindSolidPlay } from "./solidPlay.ts";
import type { SolidSession } from "./solidSession.ts";
import { SOLID_PLAY_STYLE } from "./solidStyle.ts";
import { cellSeen, createFrame, edgeTurn, openingTurn, projectFrame, type SolidFrame } from "./solidView.ts";
import { type Quat, quatSlerp } from "./vec.ts";

/**
 * A PLAYABLE MAZE OVER A SOLID IN ANY PAGE: `mountSolid(host, { recipe })` draws a cube, a globe or a solid of triangles with a maze over the whole of
 * its surface, and plays it by touch and mouse.
 *
 * The solid is looked at from outside, and only the side facing you is drawn. You draw by pressing the start (or the end of your line) and dragging
 * along the passages: the line follows the cells, cannot cross a wall, and drawing back shortens it, exactly as in a flat maze, because it is
 * the very game (`game.ts`) played on a different graph. You turn the solid by dragging anywhere that is not the end of your line (on the solid or off it),
 * with two fingers (which also pinch to zoom and twist), by the arrow buttons or keys, and by Face me, which brings the end of your line round to face
 * you. And when your line nears the edge of the side you can see, the solid turns by itself, gently, to keep the end of the line in view
 * (`edgeTurn`, on unless turned off), so a line can be drawn across an edge from one face to the next without letting go.
 *
 * What it keeps and tells is a flat board's: `mazeGame()`, `run()` and `restore()` (the line as steps, and the stones after a `~`), the events
 * `meikyuu-move`, `meikyuu-solve` and `meikyuu-stones`, the data attributes on the host, stones laid beside the line, undo, restart and hints. None of it
 * knows how the solid is turned: the answer is a list of cells.
 *
 * It paints on a canvas (the solid is redrawn whole at each turn, in a few dozen strokes), so it needs a page, and nothing it draws can be selected.
 * The handle is also on the host, as `host.meikyuuSolid`.
 *
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import type { SolidRecipe } from "@johnmorrisdotca/meikyuu/3d";
 * import type { SolidMountOptions } from "@johnmorrisdotca/meikyuu/3d/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const solidRecipe: SolidRecipe = {kind:"cube",n:2,algorithm:"backtracker",seed:42};
 * const value: SolidMountOptions = {recipe:solidRecipe,language:"en"};
 * console.log(value);
 * ```
 */

export type SolidMountOptions = MazeLook & {
  /** The maze, as its code (`cube:6:prim:48213`) or as an object. */
  recipe: string | SolidRecipe;
  /** A tap runs the line along the corridor to the next fork. Default false. */
  tap?: boolean;
  /** Offer the Hint button. Default true. */
  hints?: boolean;
  /** Show the message over the solid when the maze is solved ("Solved in 3 strokes."); a tap on it, its close button or Escape puts it away. False for none (the line of words under the solid still says so). Default true. */
  banner?: boolean;
  /** The buttons and the lines of words under the solid. Default true. */
  controls?: boolean;
  /** The zoom buttons. Default true. */
  zoom?: boolean;
  /** The solid turns by itself as the end of a line being drawn nears the edge of the side in view. Default true. */
  edgeTurn?: boolean;
  /** Start with every one-finger drag turning the solid, drawing nothing (the Turn only button toggles it). Default false. */
  turnMode?: boolean;
  /** Make a sound for each thing that happens. Default false. */
  sound?: boolean;
  /** Stones, as for a flat maze (`StoneOption`). Default off. */
  stones?: StoneOption;
  /** False for a solid that can be turned but not drawn on (a finished maze looked at). Default true. */
  draw?: boolean;
  /** True for a picture of a solid: it takes no input at all, not a touch, a key or the wheel, so the page scrolls over it, and it is not focusable. Default false. */
  still?: boolean;
  /** The page left beside the box on each side, in pixels, at least. Default 24. */
  gutter?: number;
  /** What the window holds besides the box, in pixels. Default 200. */
  reserve?: number;
  language?: MeikyuuLanguage;
  onMove?: (detail: SolidEventDetail) => void;
  onSolve?: (detail: SolidEventDetail) => void;
  onStones?: (detail: SolidEventDetail) => void;
};

/** What every event tells of the board.
 *
 * @example
 * ```ts
 * import type { SolidRecipe } from "@johnmorrisdotca/meikyuu/3d";
 * import { buildSolidMaze } from "@johnmorrisdotca/meikyuu/3d";
 * import type { SolidEventDetail } from "@johnmorrisdotca/meikyuu/3d/play";
 * import { stonesLeft } from "@johnmorrisdotca/meikyuu";
 *
 * const solidRecipe: SolidRecipe = {kind:"cube",n:2,algorithm:"backtracker",seed:42};
 * const solid = buildSolidMaze(solidRecipe);
 * const value: SolidEventDetail = {kind:"solid",solid:"cube",moves:0,cells:0,solved:false,stones:0,stonesLeft:null};
 * console.log(value);
 * ```
 */
export type SolidEventDetail = {
  kind: "solid";
  solid: SolidRecipe["kind"];
  moves: number;
  cells: number;
  solved: boolean;
  stones: number;
  stonesLeft: number | null;
};

/** Where a cell is on the picture, in pixels from the top left of the box.
 *
 * @example
 * ```ts
 * import type { SolidCellPlace } from "@johnmorrisdotca/meikyuu/3d/play";
 *
 * const value: SolidCellPlace = {x:320,y:240,visible:true,facing:1,room:100};
 * console.log(value);
 * ```
 */
export type SolidCellPlace = { x: number; y: number; visible: boolean; facing: number; room: number };

/** The mounted surface maze, game, rotation/zoom controls, native progress and cleanup handle.
 *
 * @example
 * ```ts no-run
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze } from "@johnmorrisdotca/meikyuu";
 * import type { SolidRecipe } from "@johnmorrisdotca/meikyuu/3d";
 * import type { SolidMount } from "@johnmorrisdotca/meikyuu/3d/play";
 * import { mountSolid } from "@johnmorrisdotca/meikyuu/3d/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const solidRecipe: SolidRecipe = {kind:"cube",n:2,algorithm:"backtracker",seed:42};
 * const host = document.createElement("div");
 * document.body.append(host);
 * const player: SolidMount | null = mountSolid(host,{recipe:solidRecipe});
 * console.log(player?.maze().grid.cells);
 * player?.destroy();
 * ```
 */
export type SolidMount = {
  readonly host: HTMLElement;
  recipe: () => SolidRecipe;
  maze: () => SolidMaze;
  mazeGame: () => MazeGame<SolidMaze>;
  /** Play another maze. Returns false for a recipe that is none. */
  load: (recipe: string | SolidRecipe) => boolean;
  set: (
    changes: MazeLook & {
      tap?: boolean;
      sound?: boolean;
      hints?: boolean;
      banner?: boolean;
      language?: MeikyuuLanguage;
      stones?: StoneOption;
      edgeTurn?: boolean;
    },
  ) => void;
  undo: () => void;
  restart: () => void;
  hint: () => void;
  /** Turn the solid a step: left, right, up or down, or by radians (`right`, `down`). Smooth unless the page asks for less motion. */
  turn: (by: "left" | "right" | "up" | "down" | { right?: number; down?: number }) => void;
  /** Bring a cell round to face you; the end of the line by default, or the start before there is a line. */
  faceMe: (cell?: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Back to the zoom that fits the box. */
  fit: () => void;
  /** Whether every one-finger drag turns the solid; with an argument, turn that on or off. */
  turnMode: (on?: boolean) => boolean;
  /** Whether the solid turns by itself near the edge of the side in view; with an argument, turn that on or off. */
  edgeTurn: (on?: boolean) => boolean;
  /** How the solid is turned now (a quaternion `[x, y, z, w]`) and zoomed. With an argument, turn it so at once. */
  view: (to?: { q?: Quat; zoom?: number }) => { q: Quat; zoom: number };
  /** Where a cell is now, on the picture. */
  place: (cell: number) => SolidCellPlace;
  /** Where the edge between two cells that are beside each other is now, in the middle, on the picture (the line crosses from one to the other there), or null for two that are not. */
  between: (a: number, b: number) => { x: number; y: number } | null;
  /** The cell at a point of the box (pixels from its top left), or -1. */
  pick: (x: number, y: number) => number;
  stoneMode: (on?: boolean) => boolean;
  stones: () => readonly number[];
  stonesLeft: () => number | null;
  stone: (cell: number) => StoneVerdict;
  clearStones: () => void;
  run: () => string;
  restore: (code: string) => boolean;
  destroy: () => void;
};

/** A finger's reach: a press this close to the start or the end of the line, in pixels, draws. */
export const REACH = 30;
/** How far a pointer may move and still be a tap, in pixels, and how long it may take, in milliseconds. */
export const TAP_SLOP = 8;
export const TAP_TIME = 500;
export const HOLD_TIME = 520;
/** Wheel steps closer together than this, in milliseconds, belong to one turn of the wheel, so a zoom that reaches its end part-way through does not hand the rest to the page. */
export const WHEEL_GESTURE_MS = 300;
/** One press of an arrow turns this far, in radians. */
export const TURN_STEP = 0.42;
/** How long a turn or a zoom by button takes, in milliseconds. */
const GLIDE = 260;
/** While the solid moves, the canvas has this share of the pixels it has at rest on each side, and the full number comes back this long (milliseconds) after it stops. */
const MOVING_SHARPNESS = 0.72;
const SHARP_AFTER = 180;

function create<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}

/** Put the style of the solid in the page once, beside the board's.
 *
 * @param host - The DOM host receiving the native player or styles.
 * @returns Nothing; native surface-view styles are installed for the host.
 * @example
 * ```ts no-run
 * import { ensureSolidStyle } from "@johnmorrisdotca/meikyuu/3d/play";
 *
 * const host = document.createElement("div");
 * ensureSolidStyle(host);
 * console.log(host.tagName);
 * ```
 */
export function ensureSolidStyle(host: Element): void {
  ensureMeikyuuPlayStyle(host);
  const root = host.getRootNode();
  const target: ParentNode =
    typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root : host.ownerDocument.head;
  if (target.querySelector("style[data-meikyuu-solid]") !== null) return;
  const style = host.ownerDocument.createElement("style");
  style.setAttribute("data-meikyuu-solid", "");
  style.textContent = SOLID_PLAY_STYLE;
  target.append(style);
}

export function recipeOf(recipe: string | SolidRecipe): SolidRecipe | null {
  return typeof recipe === "string" ? parseSolidRecipe(recipe) : recipe;
}

/** Draw a maze over a solid into `host` and play it. Returns the handle that drives it, or null for a recipe that is none.
 *
 * @param host - The DOM host receiving the native player or styles.
 * @param options - Native display/mount choices, or the point tuple specified by this signature.
 * @returns The native surface player, or null for invalid recipe or a view that cannot be mounted.
 * @example
 * ```ts no-run
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze } from "@johnmorrisdotca/meikyuu";
 * import type { SolidRecipe } from "@johnmorrisdotca/meikyuu/3d";
 * import { mountSolid } from "@johnmorrisdotca/meikyuu/3d/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const solidRecipe: SolidRecipe = {kind:"cube",n:2,algorithm:"backtracker",seed:42};
 * const host = document.createElement("div");
 * document.body.append(host);
 * const player = mountSolid(host,{recipe:solidRecipe});
 * console.log(player?.maze().grid.cells);
 * player?.destroy();
 * ```
 */
export function mountSolid(host: HTMLElement, options: SolidMountOptions): SolidMount | null {
  const s = {} as SolidSession;
  s.host = host;
  s.options = options;
  const first = recipeOf(s.options.recipe);
  if (first === null) return null;
  s.document = s.host.ownerDocument;
  s.windowOf = s.document.defaultView ?? window;
  ensureSolidStyle(s.host);

  s.look = { board: s.options.board, trail: s.options.trail, wall: s.options.wall, line: s.options.line };
  s.tapExtends = s.options.tap === true;
  s.stoneOption = s.options.stones;
  s.stoneModeOn = false;
  s.withHints = s.options.hints !== false;
  s.edgeOn = s.options.edgeTurn !== false;
  s.turnOnly = s.options.turnMode === true;
  s.picture = s.options.still === true;
  s.drawable = s.options.draw !== false && !s.picture;
  s.withControls = s.options.controls !== false;
  s.withZoom = s.options.zoom !== false;
  s.sounds = s.options.sound === true ? createMeikyuuSounds() : null;
  s.explicitLanguage = s.options.language;
  s.language =
    s.explicitLanguage ??
    meikyuuLanguageOf(s.host.closest("[lang]")?.getAttribute("lang") ?? s.document.documentElement.lang);
  s.gutter = Math.max(0, s.options.gutter ?? MEIKYUU_GUTTER);
  s.callbacks = s.options;
  s.still = (): boolean =>
    typeof s.windowOf.matchMedia === "function" && s.windowOf.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The parts.
  s.host.classList.add("meikyuu-play");
  s.host.classList.add("meikyuu-solid");
  s.host.replaceChildren();
  s.wrap = create(s.document, "div", "mk-wrap");
  s.box = create(s.document, "div", "mk-box");
  s.box.tabIndex = s.picture ? -1 : 0;
  s.box.setAttribute("role", s.picture ? "img" : "group");
  if (s.picture) s.box.dataset.still = "true";
  s.canvas = create(s.document, "canvas", "meikyuu mk-solid");
  s.canvas.setAttribute("aria-hidden", "true");
  s.box.append(s.canvas);
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
  s.host.append(s.wrap);
  if (s.withControls) s.host.append(s.controls, s.pad, s.says, s.progress, s.messages);
  s.host.style.setProperty("--mkp-gutter", `${s.gutter}px`);
  if (s.options.reserve !== undefined) s.host.style.setProperty("--mkp-reserve", `${s.options.reserve}px`);
  else s.host.style.setProperty("--mkp-reserve", `${MEIKYUU_RESERVE}px`);

  s.button = (name: string, onPress: () => void, parent: HTMLElement, text?: string): HTMLButtonElement => {
    const one = create(s.document, "button", "mk-button");
    one.type = "button";
    one.dataset.action = name;
    one.addEventListener("click", onPress);
    if (text !== undefined) one.textContent = text;
    parent.append(one);
    return one;
  };
  s.undoButton = s.button("undo", () => s.api.undo(), s.controls);
  s.restartButton = s.button("restart", () => s.api.restart(), s.controls);
  s.hintButton = s.button("hint", () => s.api.hint(), s.controls);
  s.stoneButton = s.button("stone", () => s.api.stoneMode(!s.stoneModeOn), s.controls);
  s.leftButton = s.button("turn-left", () => s.api.turn("left"), s.pad, "◀");
  s.upButton = s.button("turn-up", () => s.api.turn("up"), s.pad, "▲");
  s.downButton = s.button("turn-down", () => s.api.turn("down"), s.pad, "▼");
  s.rightButton = s.button("turn-right", () => s.api.turn("right"), s.pad, "▶");
  s.faceButton = s.button("face-me", () => s.api.faceMe(), s.pad);
  s.turnOnlyButton = s.button("turn-only", () => s.api.turnMode(!s.turnOnly), s.pad);
  s.outButton = s.button("out", () => s.api.zoomOut(), s.pad, "−");
  s.inButton = s.button("in", () => s.api.zoomIn(), s.pad, "+");
  s.fitButton = s.button("fit", () => s.api.fit(), s.pad);

  // The state.
  s.recipe = first;
  s.maze = buildSolidMaze(first);
  s.game = newMazeGame(s.maze, stoneRulesOf(s.stoneOption, s.maze.grid.cells));
  s.frame = createFrame(s.maze.grid);
  s.turned = openingTurn(s.maze.grid, s.maze.start);
  s.zoom = 1;
  s.frameStale = true;
  s.hinted = null;
  s.message = null;
  s.moves = 0;
  s.solveTold = false;
  s.pendingSolve = false;
  s.width = 1;
  s.height = 1;
  s.colours = readColours(s.canvas);
  s.context = s.canvas.getContext("2d");

  s.say = (key: string, values: Record<string, string | number> = {}): string => meikyuuSay(s.language, key, values);
  s.playSound = (kind: MeikyuuSoundKind): void => s.sounds?.play(kind);
  s.setMessage = (key: string | null, values: Record<string, string | number> = {}, warn = false): void => {
    s.message = key === null ? null : { key, values, warn };
  };
  s.detail = (): SolidEventDetail => ({
    kind: "solid",
    solid: s.recipe.kind,
    moves: s.moves,
    cells: s.game.path.length,
    solved: s.game.solved,
    stones: s.game.stones.length,
    stonesLeft: stonesLeft(s.game),
  });
  s.tell = (name: string, callback?: (detail: SolidEventDetail) => void): void => {
    const info = s.detail();
    callback?.(info);
    s.host.dispatchEvent(new CustomEvent(name, { detail: info, bubbles: true }));
  };

  // The picture: frames are made when asked for, and painted at the next animation frame.
  s.scheduled = 0;
  s.glide = null;
  s.lastTick = 0;
  s.pointerOn = null;
  s.drawing = false;

  s.frameNow = (): SolidFrame => {
    if (s.frameStale) {
      projectFrame(s.frame, s.maze.grid, s.turned, s.zoom, s.width, s.height);
      s.frameStale = false;
    }
    return s.frame;
  };
  s.invalidate = (): void => {
    s.frameStale = true;
    s.schedule();
  };
  s.schedule = (): void => {
    if (s.scheduled === 0) s.scheduled = s.windowOf.requestAnimationFrame(tick);
  };
  function paint(): void {
    if (s.context === null) return;
    const now = s.frameNow();
    paintSolid(s.context as unknown as PaintContext, s.maze, now, s.colours, {
      path: s.game.path,
      stones: s.game.stones,
      hint: s.hinted,
      won: s.game.solved,
      wall: s.look.wall ?? 0.12,
      line: s.look.line ?? 0.34,
    });
  }
  function tick(time: number): void {
    s.scheduled = 0;
    const seconds = s.lastTick === 0 ? 1 / 60 : Math.min(0.05, (time - s.lastTick) / 1000);
    s.lastTick = time;
    let moving = false;
    if (s.glide !== null) {
      const t = Math.min(1, (time - s.glide.start) / s.glide.length);
      const eased = t * t * (3 - 2 * t);
      s.turned = quatSlerp(s.glide.from, s.glide.to, eased);
      s.zoom = s.glide.zoomFrom + (s.glide.zoomTo - s.glide.zoomFrom) * eased;
      s.frameStale = true;
      if (t >= 1) s.glide = null;
      else {
        moving = true;
        inMotion();
      }
    }
    // A line being drawn to the edge of the side in view turns the solid toward it, and the finger, still, is then over cells further on.
    if (s.drawing && s.edgeOn && !s.game.solved) {
      const head = headOf(s.game);
      if (head !== null) {
        // On a solid with parts that hide parts a cell the line is running into may be hidden: the solid is then turned to a side it can be seen from.
        const next = edgeTurn(
          s.maze.grid,
          s.maze.links,
          s.turned,
          head,
          seconds,
          s.maze.grid.convex ? undefined : (cell) => !cellSeen(s.frameNow(), s.maze.grid, cell),
        );
        if (next !== null) {
          s.turned = next;
          s.frameStale = true;
          moving = true;
          inMotion();
          if (s.pointerOn !== null) s.followPointer(s.pointerOn.x, s.pointerOn.y);
        }
      }
    }
    paint();
    if (moving) s.schedule();
    else s.lastTick = 0;
  }
  function glideTo(q: Quat, to: number): void {
    if (s.still()) {
      s.glide = null;
      s.turned = q;
      s.zoom = to;
      s.invalidate();
      return;
    }
    s.glide = {
      from: s.turned,
      to: q,
      zoomFrom: s.zoom,
      zoomTo: to,
      start: s.windowOf.performance.now(),
      length: GLIDE,
    };
    inMotion();
    s.lastTick = 0;
    s.schedule();
  }

  // The box: its size, and the canvas to match. While the solid is moving the canvas is painted at a lower resolution (about half the pixels) and put back a moment after it
  // stops: the picture is the same and a phone is not asked to fill the full number of pixels sixty times a second.
  s.sharp = true;
  s.sharpTimer = 0;
  function measure(): void {
    const rect = s.box.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(2, s.windowOf.devicePixelRatio || 1) * (s.sharp ? 1 : MOVING_SHARPNESS);
    if (w === s.width && h === s.height && s.canvas.width === Math.round(w * dpr)) return;
    s.width = w;
    s.height = h;
    s.canvas.width = Math.round(w * dpr);
    s.canvas.height = Math.round(h * dpr);
    s.context?.setTransform(s.canvas.width / w, 0, 0, s.canvas.height / h, 0, 0);
    s.invalidate();
  }
  /** The solid is moving: paint at the lower resolution now, and at the full one again once it has been still for a moment. */
  function inMotion(): void {
    s.windowOf.clearTimeout(s.sharpTimer);
    if (s.sharp && Math.min(2, s.windowOf.devicePixelRatio || 1) > 1) {
      s.sharp = false;
      measure();
    }
    s.sharpTimer = s.windowOf.setTimeout(() => {
      if (s.sharp) return;
      s.sharp = true;
      measure();
    }, SHARP_AFTER);
  }
  s.looking = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
  s.looking?.observe(s.box);
  s.windowOf.addEventListener("resize", measure);

  // What the line says, in words, and the buttons' states.
  s.paint = paint;
  s.glideTo = glideTo;
  s.measure = measure;
  s.inMotion = inMotion;
  bindSolidPlay(s);
  if (!s.picture) s.host.addEventListener("keydown", s.onKey);

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
  // The page going light or dark changes the colours the canvas reads.
  s.theme =
    typeof MutationObserver === "undefined"
      ? null
      : new MutationObserver(() => {
          s.colours = readColours(s.canvas);
          s.invalidate();
        });
  s.theme?.observe(s.document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
  s.scheme = typeof s.windowOf.matchMedia === "function" ? s.windowOf.matchMedia("(prefers-color-scheme: dark)") : null;
  s.onScheme = (): void => {
    s.colours = readColours(s.canvas);
    s.invalidate();
  };
  s.scheme?.addEventListener?.("change", s.onScheme);

  s.cellPlace = (cell: number): SolidCellPlace => {
    const now = s.frameNow();
    return {
      x: now.cx[cell]!,
      y: now.cy[cell]!,
      visible: cellSeen(now, s.maze.grid, cell),
      facing: now.facing[cell]!,
      room: s.maze.grid.radii[cell]! * now.scale * (now.eye / (now.eye - now.cz[cell]!)),
    };
  };

  const api = solidHandle(s);

  (s.host as unknown as { meikyuuSolid?: SolidMount }).meikyuuSolid = api;
  s.begin(first);
  return s.api;
}
