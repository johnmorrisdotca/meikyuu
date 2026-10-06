import { createBanner } from "../banner.ts";
import type { MazeLook } from "../draw.ts";
import { dragMaze, headOf, hintMaze, liftMaze, newMazeGame, pressMaze, restartMaze, tapMaze, undoMaze, type MazeGame } from "../game.ts";
import { MEIKYUU_GUTTER, MEIKYUU_RESERVE, ensureMeikyuuPlayStyle } from "../mount.ts";
import { createMeikyuuSounds, type MeikyuuSoundKind, type MeikyuuSounds } from "../sound.ts";
import { clearStones, decodeRun, encodeRun, stonesLeft, stoneRulesOf, toggleStone, withStoneRules, type StoneOption, type StoneVerdict } from "../stones.ts";
import { meikyuuLanguageOf, meikyuuSay, type MeikyuuLanguage } from "../strings.ts";
import { applyLook, readColours } from "./solidColours.ts";
import { SOLID_PLAY_STYLE } from "./solidStyle.ts";
import { paintSolid, type PaintContext } from "./solidPaint.ts";
import { buildSolidMaze, parseSolidRecipe, type SolidMaze, type SolidRecipe } from "./solidMaze.ts";
import { cellSeen, cellsAlongDrag, createFrame, dragTurn, edgeTurn, faceCellTurn, openingTurn, pickCell, projectFrame, SOLID_ZOOM_LEAST, SOLID_ZOOM_MOST, stepTurn, type SolidFrame } from "./solidView.ts";
import { quatAxisAngle, quatMul, quatNormalize, quatSlerp, type Quat } from "./vec.ts";

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

/** What every event tells of the board. */
export type SolidEventDetail = {
  kind: "solid";
  solid: SolidRecipe["kind"];
  moves: number;
  cells: number;
  solved: boolean;
  stones: number;
  stonesLeft: number | null;
};

/** Where a cell is on the picture, in pixels from the top left of the box. */
export type SolidCellPlace = { x: number; y: number; visible: boolean; facing: number; room: number };

export type SolidMount = {
  readonly host: HTMLElement;
  recipe: () => SolidRecipe;
  maze: () => SolidMaze;
  mazeGame: () => MazeGame<SolidMaze>;
  /** Play another maze. Returns false for a recipe that is none. */
  load: (recipe: string | SolidRecipe) => boolean;
  set: (changes: MazeLook & { tap?: boolean; sound?: boolean; hints?: boolean; banner?: boolean; language?: MeikyuuLanguage; stones?: StoneOption; edgeTurn?: boolean }) => void;
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
const REACH = 30;
/** How far a pointer may move and still be a tap, in pixels, and how long it may take, in milliseconds. */
const TAP_SLOP = 8;
const TAP_TIME = 500;
const HOLD_TIME = 520;
/** One press of an arrow turns this far, in radians. */
const TURN_STEP = 0.42;
/** How long a turn or a zoom by button takes, in milliseconds. */
const GLIDE = 260;
/** While the solid moves, the canvas has this share of the pixels it has at rest on each side, and the full number comes back this long (milliseconds) after it stops. */
const MOVING_SHARPNESS = 0.72;
const SHARP_AFTER = 180;

function create<K extends keyof HTMLElementTagNameMap>(document: Document, tag: K, className: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}

/** Put the style of the solid in the page once, beside the board's. */
export function ensureSolidStyle(host: Element): void {
  ensureMeikyuuPlayStyle(host);
  const root = host.getRootNode();
  const target: ParentNode = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root : host.ownerDocument.head;
  if (target.querySelector("style[data-meikyuu-solid]") !== null) return;
  const style = host.ownerDocument.createElement("style");
  style.setAttribute("data-meikyuu-solid", "");
  style.textContent = SOLID_PLAY_STYLE;
  target.append(style);
}

function recipeOf(recipe: string | SolidRecipe): SolidRecipe | null {
  return typeof recipe === "string" ? parseSolidRecipe(recipe) : recipe;
}

/** Draw a maze over a solid into `host` and play it. Returns the handle that drives it, or null for a recipe that is none. */
export function mountSolid(host: HTMLElement, options: SolidMountOptions): SolidMount | null {
  const first = recipeOf(options.recipe);
  if (first === null) return null;
  const document = host.ownerDocument;
  const windowOf = document.defaultView ?? window;
  ensureSolidStyle(host);

  let look: MazeLook = { board: options.board, trail: options.trail, wall: options.wall, line: options.line };
  let tapExtends = options.tap === true;
  let stoneOption: StoneOption | undefined = options.stones;
  let stoneModeOn = false;
  let withHints = options.hints !== false;
  let edgeOn = options.edgeTurn !== false;
  let turnOnly = options.turnMode === true;
  const picture = options.still === true;
  const drawable = options.draw !== false && !picture;
  const withControls = options.controls !== false;
  const withZoom = options.zoom !== false;
  let sounds: MeikyuuSounds | null = options.sound === true ? createMeikyuuSounds() : null;
  let explicitLanguage = options.language;
  let language: MeikyuuLanguage = explicitLanguage ?? meikyuuLanguageOf(host.closest("[lang]")?.getAttribute("lang") ?? document.documentElement.lang);
  const gutter = Math.max(0, options.gutter ?? MEIKYUU_GUTTER);
  const callbacks = options;
  const still = (): boolean => typeof windowOf.matchMedia === "function" && windowOf.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The parts.
  host.classList.add("meikyuu-play");
  host.classList.add("meikyuu-solid");
  host.replaceChildren();
  const wrap = create(document, "div", "mk-wrap");
  const box = create(document, "div", "mk-box");
  box.tabIndex = picture ? -1 : 0;
  box.setAttribute("role", picture ? "img" : "group");
  if (picture) box.dataset.still = "true";
  const canvas = create(document, "canvas", "meikyuu mk-solid");
  canvas.setAttribute("aria-hidden", "true");
  box.append(canvas);
  const banner = createBanner(document, host, options.banner !== false);
  wrap.append(box, banner.element);
  const controls = create(document, "div", "mk-controls");
  const pad = create(document, "div", "mk-pad");
  pad.setAttribute("role", "group");
  const says = create(document, "p", "mk-says");
  const progress = create(document, "p", "mk-progress");
  progress.setAttribute("aria-live", "polite");
  const messages = create(document, "p", "mk-messages");
  messages.setAttribute("aria-live", "polite");
  host.append(wrap);
  if (withControls) host.append(controls, pad, says, progress, messages);
  host.style.setProperty("--mkp-gutter", `${gutter}px`);
  if (options.reserve !== undefined) host.style.setProperty("--mkp-reserve", `${options.reserve}px`);
  else host.style.setProperty("--mkp-reserve", `${MEIKYUU_RESERVE}px`);

  const button = (name: string, onPress: () => void, parent: HTMLElement, text?: string): HTMLButtonElement => {
    const one = create(document, "button", "mk-button");
    one.type = "button";
    one.dataset.action = name;
    one.addEventListener("click", onPress);
    if (text !== undefined) one.textContent = text;
    parent.append(one);
    return one;
  };
  const undoButton = button("undo", () => api.undo(), controls);
  const restartButton = button("restart", () => api.restart(), controls);
  const hintButton = button("hint", () => api.hint(), controls);
  const stoneButton = button("stone", () => api.stoneMode(!stoneModeOn), controls);
  const leftButton = button("turn-left", () => api.turn("left"), pad, "◀");
  const upButton = button("turn-up", () => api.turn("up"), pad, "▲");
  const downButton = button("turn-down", () => api.turn("down"), pad, "▼");
  const rightButton = button("turn-right", () => api.turn("right"), pad, "▶");
  const faceButton = button("face-me", () => api.faceMe(), pad);
  const turnOnlyButton = button("turn-only", () => api.turnMode(!turnOnly), pad);
  const outButton = button("out", () => api.zoomOut(), pad, "−");
  const inButton = button("in", () => api.zoomIn(), pad, "+");
  const fitButton = button("fit", () => api.fit(), pad);

  // The state.
  let recipe: SolidRecipe = first;
  let maze: SolidMaze = buildSolidMaze(first);
  let game: MazeGame<SolidMaze> = newMazeGame(maze, stoneRulesOf(stoneOption, maze.grid.cells));
  let frame: SolidFrame = createFrame(maze.grid);
  let turned: Quat = openingTurn(maze.grid, maze.start);
  let zoom = 1;
  let frameStale = true;
  let hinted: { back: number; cells: readonly number[] } | null = null;
  let message: { key: string; values: Record<string, string | number>; warn: boolean } | null = null;
  let moves = 0;
  let solveTold = false;
  let pendingSolve = false;
  let width = 1;
  let height = 1;
  let colours = readColours(canvas);
  const context = canvas.getContext("2d");

  const say = (key: string, values: Record<string, string | number> = {}): string => meikyuuSay(language, key, values);
  const playSound = (kind: MeikyuuSoundKind): void => sounds?.play(kind);
  const setMessage = (key: string | null, values: Record<string, string | number> = {}, warn = false): void => {
    message = key === null ? null : { key, values, warn };
  };
  const detail = (): SolidEventDetail => ({ kind: "solid", solid: recipe.kind, moves, cells: game.path.length, solved: game.solved, stones: game.stones.length, stonesLeft: stonesLeft(game) });
  const tell = (name: string, callback?: (detail: SolidEventDetail) => void): void => {
    const info = detail();
    callback?.(info);
    host.dispatchEvent(new CustomEvent(name, { detail: info, bubbles: true }));
  };

  // The picture: frames are made when asked for, and painted at the next animation frame.
  let scheduled = 0;
  let glide: { from: Quat; to: Quat; zoomFrom: number; zoomTo: number; start: number; length: number } | null = null;
  let lastTick = 0;
  let pointerOn: { x: number; y: number } | null = null;
  let drawing = false;

  const frameNow = (): SolidFrame => {
    if (frameStale) {
      projectFrame(frame, maze.grid, turned, zoom, width, height);
      frameStale = false;
    }
    return frame;
  };
  const invalidate = (): void => {
    frameStale = true;
    schedule();
  };
  const schedule = (): void => {
    if (scheduled === 0) scheduled = windowOf.requestAnimationFrame(tick);
  };
  function paint(): void {
    if (context === null) return;
    const now = frameNow();
    paintSolid(context as unknown as PaintContext, maze, now, colours, { path: game.path, stones: game.stones, hint: hinted, won: game.solved, wall: look.wall ?? 0.12, line: look.line ?? 0.34 });
  }
  function tick(time: number): void {
    scheduled = 0;
    const seconds = lastTick === 0 ? 1 / 60 : Math.min(0.05, (time - lastTick) / 1000);
    lastTick = time;
    let moving = false;
    if (glide !== null) {
      const t = Math.min(1, (time - glide.start) / glide.length);
      const eased = t * t * (3 - 2 * t);
      turned = quatSlerp(glide.from, glide.to, eased);
      zoom = glide.zoomFrom + (glide.zoomTo - glide.zoomFrom) * eased;
      frameStale = true;
      if (t >= 1) glide = null;
      else {
        moving = true;
        inMotion();
      }
    }
    // A line being drawn to the edge of the side in view turns the solid toward it, and the finger, still, is then over cells further on.
    if (drawing && edgeOn && !game.solved) {
      const head = headOf(game);
      if (head !== null) {
        // On a solid with parts that hide parts a cell the line is running into may be hidden: the solid is then turned to a side it can be seen from.
        const next = edgeTurn(maze.grid, maze.links, turned, head, seconds, maze.grid.convex ? undefined : (cell) => !cellSeen(frameNow(), maze.grid, cell));
        if (next !== null) {
          turned = next;
          frameStale = true;
          moving = true;
          inMotion();
          if (pointerOn !== null) followPointer(pointerOn.x, pointerOn.y);
        }
      }
    }
    paint();
    if (moving) schedule();
    else lastTick = 0;
  }
  function glideTo(q: Quat, to: number): void {
    if (still()) {
      glide = null;
      turned = q;
      zoom = to;
      invalidate();
      return;
    }
    glide = { from: turned, to: q, zoomFrom: zoom, zoomTo: to, start: windowOf.performance.now(), length: GLIDE };
    inMotion();
    lastTick = 0;
    schedule();
  }

  // The box: its size, and the canvas to match. While the solid is moving the canvas is painted at a lower resolution (about half the pixels) and put back a moment after it
  // stops: the picture is the same and a phone is not asked to fill the full number of pixels sixty times a second.
  let sharp = true;
  let sharpTimer = 0;
  function measure(): void {
    const rect = box.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(2, windowOf.devicePixelRatio || 1) * (sharp ? 1 : MOVING_SHARPNESS);
    if (w === width && h === height && canvas.width === Math.round(w * dpr)) return;
    width = w;
    height = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    context?.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
    invalidate();
  }
  /** The solid is moving: paint at the lower resolution now, and at the full one again once it has been still for a moment. */
  function inMotion(): void {
    windowOf.clearTimeout(sharpTimer);
    if (sharp && (Math.min(2, windowOf.devicePixelRatio || 1) > 1)) {
      sharp = false;
      measure();
    }
    sharpTimer = windowOf.setTimeout(() => {
      if (sharp) return;
      sharp = true;
      measure();
    }, SHARP_AFTER);
  }
  const looking = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
  looking?.observe(box);
  windowOf.addEventListener("resize", measure);

  // What the line says, in words, and the buttons' states.
  function words(): void {
    const solved = game.solved;
    host.dataset.kind = "solid";
    host.dataset.solid = recipe.kind;
    host.dataset.solved = String(solved);
    host.dataset.moves = String(moves);
    host.dataset.cells = String(game.path.length);
    host.dataset.reached = String(game.solved);
    host.dataset.turnMode = String(turnOnly);
    host.dataset.stones = String(game.stones.length);
    host.dataset.stoneMode = String(stoneModeOn && game.rules !== null);
    if (game.rules !== null) host.dataset.stonesLeft = String(stonesLeft(game) ?? "none");
    else delete host.dataset.stonesLeft;
    const label = say("solidLabel", { shape: say(`solid_${recipe.kind}`), n: maze.grid.cells, play: say("play_solid") });
    box.setAttribute("aria-label", label);
    banner.sync(say("solved", { n: moves }), say("closeMessage"), solved);
    undoButton.textContent = say("undo");
    restartButton.textContent = say("restart");
    hintButton.textContent = say("hint");
    hintButton.hidden = !withHints;
    stoneButton.hidden = game.rules === null;
    stoneButton.textContent = say("stone");
    stoneButton.setAttribute("aria-label", say("stoneLabel"));
    stoneButton.setAttribute("aria-pressed", String(stoneModeOn && game.rules !== null));
    stoneButton.disabled = solved;
    for (const [one, key] of [[leftButton, "turnLeft"], [rightButton, "turnRight"], [upButton, "turnUp"], [downButton, "turnDown"]] as const) one.setAttribute("aria-label", say(key));
    pad.setAttribute("aria-label", say("turnPadLabel"));
    faceButton.textContent = say("faceMe");
    faceButton.setAttribute("aria-label", say("faceMeLabel"));
    turnOnlyButton.textContent = say("solidTurnMode");
    turnOnlyButton.setAttribute("aria-label", say("solidTurnModeLabel"));
    turnOnlyButton.setAttribute("aria-pressed", String(turnOnly));
    turnOnlyButton.hidden = !drawable;
    fitButton.textContent = say("fit");
    outButton.setAttribute("aria-label", say("zoomOut"));
    inButton.setAttribute("aria-label", say("zoomIn"));
    for (const one of [outButton, inButton, fitButton]) one.hidden = !withZoom;
    outButton.disabled = zoom <= SOLID_ZOOM_LEAST + 1e-6;
    inButton.disabled = zoom >= SOLID_ZOOM_MOST - 1e-6;
    fitButton.disabled = Math.abs(zoom - 1) < 1e-6;
    undoButton.disabled = game.undo.length === 0;
    restartButton.disabled = game.path.length === 0 && game.strokes === 0 && game.stones.length === 0;
    hintButton.disabled = solved;
    if (!withControls) return;
    const joiner = language === "ja" ? "" : " ";
    says.textContent = stoneModeOn && game.rules !== null ? say("stoneHow", { n: game.rules.reach }) : say("solidHow");
    const parts: string[] = [];
    if (solved) parts.push(say("solved", { n: moves }));
    else {
      parts.push(game.path.length === 0 ? say("notStarted") : say("drawn", { n: game.path.length }));
      if (game.rules !== null) {
        const left = stonesLeft(game);
        parts.push(left === null ? say("stonesFree", { n: game.stones.length }) : say("stonesLeft", { n: left }));
      }
    }
    progress.textContent = parts.join(joiner);
    messages.textContent = message === null ? "" : say(message.key, message.values);
    messages.dataset.warn = String(message?.warn === true);
  }
  function refresh(): void {
    words();
    invalidate();
  }

  const STONE_WHY: Partial<Record<StoneVerdict, string>> = { far: "stoneFar", "on-line": "stoneOnLine", end: "stoneEnd", limit: "stoneLimit", "no-line": "stoneNoLine", solved: "stoneSolved", drawing: "stoneDrawing", "no-cell": "stoneFar" };

  function stonesMoved(before: MazeGame<SolidMaze>): void {
    if (before.stones.length === game.stones.length && before.stones.every((cell, at) => cell === game.stones[at])) return;
    tell("meikyuu-stones", callbacks.onStones);
  }

  /** A stone asked for on a cell by a tap in the Stone mode or a press-and-hold: laid, taken up or refused with a word. True when that did something the player should see. */
  function layStoneAt(cell: number, how: "tap" | "hold"): boolean {
    if (game.rules === null) return false;
    const before = how === "hold" && game.drawing ? liftMaze(game) : game;
    const result = toggleStone(before, cell);
    hinted = null;
    if (result.how === "refused") {
      if (how === "hold" && (result.why === "no-line" || result.why === "solved" || result.why === "drawing")) return false;
      game = before;
      setMessage(STONE_WHY[result.why] ?? "stoneFar", { n: before.rules?.reach ?? 2 }, true);
      playSound("bump");
      refresh();
      return true;
    }
    const prior = game;
    game = result.game;
    setMessage(result.how === "laid" ? "stoneLaid" : "stoneTaken");
    playSound(result.how === "laid" ? "stone" : "back");
    refresh();
    stonesMoved(prior);
    return true;
  }

  function onChange(next: MazeGame<SolidMaze>, how: "press" | "drag" | "lift" | "tap"): void {
    const before = game;
    game = next;
    if (how === "press" || how === "tap") {
      hinted = null;
      setMessage(null);
    }
    if (how === "drag" || how === "tap") {
      if (next.path.length > before.path.length) playSound("step");
      else if (next.path.length < before.path.length) playSound("back");
    }
    if (next.solved && !before.solved) pendingSolve = true;
    if (how === "lift" || how === "tap") {
      if (next.strokes !== before.strokes) {
        moves += 1;
        tell("meikyuu-move", callbacks.onMove);
      }
      if (pendingSolve) {
        pendingSolve = false;
        if (!solveTold) {
          solveTold = true;
          playSound("solve");
          tell("meikyuu-solve", callbacks.onSolve);
        }
      }
    }
    refresh();
  }

  function begin(next: SolidRecipe): void {
    recipe = next;
    maze = buildSolidMaze(next);
    game = newMazeGame(maze, stoneRulesOf(stoneOption, maze.grid.cells));
    frame = createFrame(maze.grid);
    turned = openingTurn(maze.grid, maze.start);
    zoom = 1;
    glide = null;
    hinted = null;
    message = null;
    moves = 0;
    solveTold = false;
    pendingSolve = false;
    applyLook(canvas, look);
    colours = readColours(canvas);
    measure();
    refresh();
  }

  // Pointers.
  const local = (event: { clientX: number; clientY: number }): [number, number] => {
    const rect = box.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  };
  const pointers = new Map<number, [number, number]>();
  type Gesture =
    | { mode: "draw"; id: number; last: [number, number] }
    | { mode: "turn"; id: number; last: [number, number]; from: [number, number]; at: number; moved: boolean; hold: number; held: boolean }
    | { mode: "pinch"; mid: [number, number]; gap: number; angle: number };
  let gesture: Gesture | null = null;

  /** Whether a press at a point is on the cell that draws: the end of the line, or the start before there is one. */
  function pressTarget(x: number, y: number): number | null {
    if (!drawable || game.solved || turnOnly || stoneModeOn) return null;
    const target = headOf(game) ?? maze.start;
    const now = frameNow();
    if (now.visible[target] === 0) {
      setMessage("solidHidden", {}, true);
      words();
      return null;
    }
    if (pickCell(now, maze.grid, x, y) === target) return target;
    const room = maze.grid.radii[target]! * now.scale * (now.eye / (now.eye - now.cz[target]!));
    return Math.hypot(x - now.cx[target]!, y - now.cy[target]!) <= Math.max(REACH, room * 1.3) ? target : null;
  }

  /** Offer the game the cells a finger passed from one point to another. */
  function followDrag(from: readonly [number, number], to: readonly [number, number]): void {
    const now = frameNow();
    let next = game;
    for (const cell of cellsAlongDrag(now, maze.grid, from, to)) next = dragMaze(next, cell);
    if (next !== game) onChange(next, "drag");
  }
  /** Offer the game the cell under a finger that has not moved while the solid turned under it. */
  function followPointer(x: number, y: number): void {
    const cell = pickCell(frameNow(), maze.grid, x, y);
    if (cell < 0) return;
    const next = dragMaze(game, cell);
    if (next !== game) onChange(next, "drag");
  }

  const endGesture = (lifted: boolean): void => {
    const was = gesture;
    gesture = null;
    drawing = false;
    pointerOn = null;
    if (was?.mode === "draw") onChange(liftMaze(game), "lift");
    else if (was?.mode === "turn") {
      windowOf.clearTimeout(was.hold);
      if (lifted && !was.moved && !was.held && windowOf.performance.now() - was.at < TAP_TIME) {
        const cell = pickCell(frameNow(), maze.grid, was.last[0], was.last[1]);
        if (cell >= 0) {
          if (stoneModeOn && game.rules !== null) layStoneAt(cell, "tap");
          else if (tapExtends && drawable && !game.solved) onChange(tapMaze(game, cell), "tap");
        }
      }
    }
  };

  const onDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // A pointer the browser does not know (a script's) cannot be captured, and need not be.
    try {
      box.setPointerCapture?.(event.pointerId);
    } catch {
      /* Not captured; the board still plays. */
    }
    const at = local(event);
    pointers.set(event.pointerId, at);
    glide = null;
    if (pointers.size === 2) {
      endGesture(false);
      const [a, b] = [...pointers.values()] as [[number, number], [number, number]];
      gesture = { mode: "pinch", mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], gap: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, angle: Math.atan2(b[1] - a[1], b[0] - a[0]) };
      return;
    }
    if (pointers.size > 2) return;
    const target = pressTarget(at[0], at[1]);
    if (target !== null) {
      gesture = { mode: "draw", id: event.pointerId, last: at };
      drawing = true;
      pointerOn = { x: at[0], y: at[1] };
      onChange(pressMaze(game, target), "press");
      schedule();
      return;
    }
    const turnGesture: Gesture & { mode: "turn" } = { mode: "turn", id: event.pointerId, last: at, from: at, at: windowOf.performance.now(), moved: false, hold: 0, held: false };
    // Press and hold lays a stone where the finger is, if the game has stones and the finger is not on the line.
    if (game.rules !== null) {
      turnGesture.hold = windowOf.setTimeout(() => {
        if (gesture !== turnGesture || turnGesture.moved) return;
        const cell = pickCell(frameNow(), maze.grid, turnGesture.last[0], turnGesture.last[1]);
        if (cell >= 0 && !game.path.includes(cell) && layStoneAt(cell, "hold")) turnGesture.held = true;
      }, HOLD_TIME);
    }
    gesture = turnGesture;
  };

  const onMove = (event: PointerEvent): void => {
    if (!pointers.has(event.pointerId)) return;
    const at = local(event);
    pointers.set(event.pointerId, at);
    const now = gesture;
    if (now === null) return;
    if (now.mode === "draw") {
      pointerOn = { x: at[0], y: at[1] };
      followDrag(now.last, at);
      now.last = at;
    } else if (now.mode === "turn") {
      if (!now.moved && Math.hypot(at[0] - now.from[0], at[1] - now.from[1]) > TAP_SLOP) now.moved = true;
      if (!now.moved || now.held) return;
      turned = dragTurn(frameNow(), turned, now.last, at);
      now.last = at;
      inMotion();
      invalidate();
    } else if (now.mode === "pinch" && pointers.size >= 2) {
      const [a, b] = [...pointers.values()] as [[number, number], [number, number]];
      const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const gap = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
      const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      let q = dragTurn(frameNow(), turned, now.mid, mid);
      q = quatNormalize(quatMul(quatAxisAngle([0, 0, 1], angle - now.angle), q));
      turned = q;
      zoom = Math.min(SOLID_ZOOM_MOST, Math.max(SOLID_ZOOM_LEAST, zoom * (gap / now.gap)));
      now.mid = mid;
      now.gap = gap;
      now.angle = angle;
      inMotion();
      invalidate();
      words();
    }
  };

  const onUp = (event: PointerEvent): void => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    try {
      box.releasePointerCapture?.(event.pointerId);
    } catch {
      /* Not captured. */
    }
    if (gesture?.mode === "pinch") {
      if (pointers.size < 2) {
        gesture = null;
        // The finger left down does not go on to turn or draw: it is let go of, and the next press begins anew.
        pointers.clear();
      }
      return;
    }
    endGesture(event.type === "pointerup");
  };

  const onCancel = (event: PointerEvent): void => onUp(event);

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    glide = null;
    zoom = Math.min(SOLID_ZOOM_MOST, Math.max(SOLID_ZOOM_LEAST, zoom * Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015))));
    inMotion();
    invalidate();
    words();
  };

  if (!picture) {
    box.addEventListener("pointerdown", onDown);
    box.addEventListener("pointermove", onMove);
    box.addEventListener("pointerup", onUp);
    box.addEventListener("pointercancel", onCancel);
    box.addEventListener("wheel", onWheel, { passive: false });
  }

  /** The way a key points (dx, dy, y down) as one step of the line: the linked neighbour of the line's end that lies nearest that way on the picture. */
  function neighbourToward(dx: number, dy: number): number {
    const head = headOf(game);
    if (head === null) return -1;
    const now = frameNow();
    let best = -1;
    let bestCosine = 0.5;
    const candidates = [...maze.links[head]!, ...(game.path.length > 1 ? [game.path[game.path.length - 2]!] : [])];
    for (const next of candidates) {
      const vx = now.cx[next]! - now.cx[head]!;
      const vy = now.cy[next]! - now.cy[head]!;
      const cosine = (vx * dx + vy * dy) / ((Math.hypot(vx, vy) || 1) * Math.hypot(dx, dy));
      if (cosine > bestCosine) {
        bestCosine = cosine;
        best = next;
      }
    }
    return best;
  }
  function stepByKey(dx: number, dy: number): void {
    if (!drawable || game.solved) return;
    const head = headOf(game);
    if (head === null) {
      if (frameNow().visible[maze.start] === 0) {
        setMessage("solidHidden", {}, true);
        words();
        return;
      }
      onChange(liftMaze(pressMaze(game, maze.start)), "tap");
      return;
    }
    if (frameNow().visible[head] === 0) {
      setMessage("solidHidden", {}, true);
      words();
      return;
    }
    const next = neighbourToward(dx, dy);
    if (next >= 0) onChange(liftMaze(dragMaze(pressMaze(game, head), next)), "tap");
  }
  const onKey = (event: KeyboardEvent): void => {
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
      event.preventDefault();
      api.undo();
      return;
    }
    if (event.target !== box) return;
    const turns: Record<string, "left" | "right" | "up" | "down"> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
    const steps: Record<string, [number, number]> = { w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
    const key = event.key;
    if (turns[key] !== undefined) {
      event.preventDefault();
      api.turn(turns[key]!);
    } else if (steps[key.toLowerCase()] !== undefined && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      const [dx, dy] = steps[key.toLowerCase()]!;
      if (event.shiftKey && game.rules !== null) {
        const next = neighbourToward(dx, dy);
        if (next >= 0) layStoneAt(next, "tap");
      } else stepByKey(dx, dy);
    } else if (key === "Enter" || key === " ") {
      event.preventDefault();
      if (game.path.length === 0) stepByKey(0, 0);
    } else if (key === "f" || key === "F" || key === "Home") {
      event.preventDefault();
      api.faceMe();
    } else if (key === "+" || key === "=") api.zoomIn();
    else if (key === "-" || key === "_") api.zoomOut();
    else if (key === "Backspace" || key === "Delete") {
      event.preventDefault();
      api.undo();
    }
  };
  if (!picture) host.addEventListener("keydown", onKey);

  const watching = typeof MutationObserver === "undefined" ? null : new MutationObserver(() => {
    if (explicitLanguage !== undefined) return;
    const next = meikyuuLanguageOf(host.closest("[lang]")?.getAttribute("lang") ?? document.documentElement.lang);
    if (next === language) return;
    language = next;
    words();
  });
  watching?.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  // The page going light or dark changes the colours the canvas reads.
  const theme = typeof MutationObserver === "undefined" ? null : new MutationObserver(() => {
    colours = readColours(canvas);
    invalidate();
  });
  theme?.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
  const scheme = typeof windowOf.matchMedia === "function" ? windowOf.matchMedia("(prefers-color-scheme: dark)") : null;
  const onScheme = (): void => {
    colours = readColours(canvas);
    invalidate();
  };
  scheme?.addEventListener?.("change", onScheme);

  const cellPlace = (cell: number): SolidCellPlace => {
    const now = frameNow();
    return { x: now.cx[cell]!, y: now.cy[cell]!, visible: cellSeen(now, maze.grid, cell), facing: now.facing[cell]!, room: maze.grid.radii[cell]! * now.scale * (now.eye / (now.eye - now.cz[cell]!)) };
  };

  const api: SolidMount = {
    host,
    recipe: () => recipe,
    maze: () => maze,
    mazeGame: () => game,
    load: (next) => {
      const made = recipeOf(next);
      if (made === null) return false;
      begin(made);
      return true;
    },
    set: (changes) => {
      const { tap, sound, hints, banner: showBanner, language: nextLanguage, stones: nextStones, edgeTurn: nextEdge, ...nextLook } = changes;
      if ("stones" in changes) {
        stoneOption = nextStones;
        const before = game;
        game = withStoneRules(game, stoneRulesOf(stoneOption, maze.grid.cells));
        if (game.rules === null) stoneModeOn = false;
        stonesMoved(before);
      }
      look = { ...look, ...nextLook };
      if (tap !== undefined) tapExtends = tap;
      if (hints !== undefined) withHints = hints;
      if (showBanner !== undefined) banner.enable(showBanner);
      if (nextEdge !== undefined) edgeOn = nextEdge;
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
      applyLook(canvas, look);
      colours = readColours(canvas);
      refresh();
    },
    undo: () => {
      hinted = null;
      setMessage(null);
      const next = undoMaze(game);
      if (next === game) return;
      const before = game;
      game = next;
      playSound("back");
      refresh();
      stonesMoved(before);
    },
    restart: () => {
      hinted = null;
      setMessage(null);
      const next = restartMaze(game);
      if (next === game) return;
      const before = game;
      game = next;
      solveTold = false;
      moves = 0;
      refresh();
      stonesMoved(before);
    },
    hint: () => {
      hinted = hintMaze(game, Math.max(6, Math.round(Math.sqrt(maze.grid.cells) / 2)));
      setMessage(game.path.length === 0 ? "hintStart" : hinted.back > 0 ? "hintBack" : "hintAhead", { n: hinted.back });
      refresh();
    },
    turn: (by) => {
      const [right, down] = typeof by === "string" ? ({ left: [-TURN_STEP, 0], right: [TURN_STEP, 0], up: [0, -TURN_STEP], down: [0, TURN_STEP] } as const)[by] : [by.right ?? 0, by.down ?? 0];
      glideTo(stepTurn(glide?.to ?? turned, right, down), glide?.zoomTo ?? zoom);
    },
    faceMe: (cell) => {
      const target = cell ?? headOf(game) ?? maze.start;
      glideTo(faceCellTurn(maze.grid, turned, target, true), zoom);
    },
    zoomIn: () => {
      glideTo(glide?.to ?? turned, Math.min(SOLID_ZOOM_MOST, (glide?.zoomTo ?? zoom) * 1.4));
      words();
    },
    zoomOut: () => {
      glideTo(glide?.to ?? turned, Math.max(SOLID_ZOOM_LEAST, (glide?.zoomTo ?? zoom) / 1.4));
      words();
    },
    fit: () => {
      glideTo(glide?.to ?? turned, 1);
      words();
    },
    turnMode: (on) => {
      if (on !== undefined) {
        turnOnly = on;
        words();
      }
      return turnOnly;
    },
    edgeTurn: (on) => {
      if (on !== undefined) edgeOn = on;
      return edgeOn;
    },
    view: (to) => {
      if (to !== undefined) {
        glide = null;
        if (to.q !== undefined) turned = quatNormalize(to.q);
        if (to.zoom !== undefined) zoom = Math.min(SOLID_ZOOM_MOST, Math.max(SOLID_ZOOM_LEAST, to.zoom));
        invalidate();
        words();
      }
      return { q: turned, zoom };
    },
    place: cellPlace,
    between: (a, b) => {
      const side = maze.grid.neighbours[a]?.indexOf(b) ?? -1;
      if (side < 0) return null;
      const edge = maze.grid.edges[maze.grid.sideEdge[a]![side]!]!;
      const now = frameNow();
      return { x: (now.sx[edge.a]! + now.sx[edge.b]!) / 2, y: (now.sy[edge.a]! + now.sy[edge.b]!) / 2 };
    },
    pick: (x, y) => pickCell(frameNow(), maze.grid, x, y),
    stoneMode: (on) => {
      const possible = game.rules !== null;
      if (on !== undefined && (on && possible) !== stoneModeOn) {
        stoneModeOn = on && possible;
        words();
      }
      return stoneModeOn && possible;
    },
    stones: () => game.stones,
    stonesLeft: () => stonesLeft(game),
    stone: (cell) => {
      const result = toggleStone(game, cell);
      if (result.how === "refused") return result.why;
      layStoneAt(cell, "tap");
      return "ok";
    },
    clearStones: () => {
      const before = game;
      const next = clearStones(before);
      if (next === before) return;
      game = next;
      setMessage(null);
      refresh();
      stonesMoved(before);
    },
    run: () => encodeRun(game),
    restore: (code) => {
      const restored = decodeRun(maze, code, game.rules);
      if (restored === null) return false;
      const before = game;
      game = restored;
      hinted = null;
      setMessage(null);
      moves = restored.strokes;
      solveTold = restored.solved;
      pendingSolve = false;
      refresh();
      stonesMoved(before);
      return true;
    },
    destroy: () => {
      windowOf.cancelAnimationFrame(scheduled);
      if (gesture?.mode === "turn") windowOf.clearTimeout(gesture.hold);
      box.removeEventListener("pointerdown", onDown);
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerup", onUp);
      box.removeEventListener("pointercancel", onCancel);
      box.removeEventListener("wheel", onWheel);
      host.removeEventListener("keydown", onKey);
      banner.destroy();
      windowOf.removeEventListener("resize", measure);
      looking?.disconnect();
      watching?.disconnect();
      theme?.disconnect();
      scheme?.removeEventListener?.("change", onScheme);
      sounds?.destroy();
      host.style.removeProperty("--mkp-gutter");
      host.style.removeProperty("--mkp-reserve");
      host.replaceChildren();
      host.classList.remove("meikyuu-play", "meikyuu-solid");
      for (const name of ["kind", "solid", "solved", "moves", "cells", "reached", "turnMode", "stones", "stoneMode", "stonesLeft"]) delete host.dataset[name];
      delete (host as unknown as { meikyuuSolid?: SolidMount }).meikyuuSolid;
    },
  };

  (host as unknown as { meikyuuSolid?: SolidMount }).meikyuuSolid = api;
  begin(first);
  return api;
}
