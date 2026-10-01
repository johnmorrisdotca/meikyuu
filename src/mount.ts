import { arrowsLeft, hintArrow, newArrowGame, restartArrows, tapArrow, undoArrow, unlockArrows, type ArrowGame } from "./arrowGame.ts";
import { createArrowSurface, type ArrowSurface } from "./arrowSurface.ts";
import { makeArrows, parseArrowRecipe, type ArrowBoard, type ArrowRecipe } from "./arrows.ts";
import type { MazeLook } from "./draw.ts";
import { dragMaze, headOf, hintMaze, liftMaze, newMazeGame, pressMaze, restartMaze, undoMaze, type MazeGame } from "./game.ts";
import { levelOf, type MeikyuuKind } from "./levels.ts";
import { createMazeSurface, type MazeSurface } from "./mazeSurface.ts";
import { buildMaze, parseRecipe, type Maze, type MazeRecipe } from "./maze.ts";
import { buildMixed, parseMixedRecipe, type MixedRecipe } from "./mixed.ts";
import { MEIKYUU_PLAY_STYLE } from "./playStyle.ts";
import { createMeikyuuSounds, type MeikyuuSoundKind, type MeikyuuSounds } from "./sound.ts";
import { meikyuuLanguageOf, meikyuuSay, type MeikyuuLanguage } from "./strings.ts";

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
 * Under the board are Undo, Restart, Hint, the zoom pad, a line on how to play, a line of progress and the
 * word of what has just happened. Every one is optional (`controls`), and everything a button does is also a
 * method of the returned handle. What happens is told in events on the host (and to the callbacks given):
 * `meikyuu-move` after each stroke or tap, `meikyuu-solve` once when the puzzle is won, and `meikyuu-key`,
 * `meikyuu-unlock`, `meikyuu-bump` and `meikyuu-lose` for the smaller things.
 *
 * Needs a page. The rules are `game.ts`'s and `arrowGame.ts`'s and the drawing is `drawMaze`'s and
 * `drawArrows`'s, and each is usable alone. Nothing it draws can be selected, and its box stays one steady
 * square whatever is in it.
 */

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
  /** Make a sound for each thing that happens. Default false. */
  sound?: boolean;
  /** The language the words are in. Left out, the host's own `lang`, or the page's, and it follows the page's. */
  language?: MeikyuuLanguage;
  onMove?: (detail: MeikyuuEventDetail) => void;
  onSolve?: (detail: MeikyuuEventDetail) => void;
  onKey?: (detail: MeikyuuEventDetail) => void;
  onUnlock?: (detail: MeikyuuEventDetail) => void;
  onBump?: (detail: MeikyuuEventDetail) => void;
  onLose?: (detail: MeikyuuEventDetail) => void;
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
  load: (puzzle: { kind?: MeikyuuKind; level?: number; recipe?: MeikyuuMountOptions["recipe"] }) => boolean;
  /** Change how it looks or is played: board, trail, tap, sound, hints, language. */
  set: (changes: MazeLook & { tap?: boolean; sound?: boolean; hints?: boolean; language?: MeikyuuLanguage }) => void;
  undo: () => void;
  restart: () => void;
  hint: () => void;
  /** Zoom and move back to the whole board. */
  fit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
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
  let withHints = options.hints !== false;
  const withControls = options.controls !== false;
  const withZoom = options.zoom !== false;
  let sounds: MeikyuuSounds | null = options.sound === true ? createMeikyuuSounds() : null;
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
  let message: { key: string; values: Record<string, string | number>; warn: boolean } | null = null;
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
  });
  const tell = (name: string, callback?: (detail: MeikyuuEventDetail) => void): void => {
    const info = detail();
    callback?.(info);
    host.dispatchEvent(new CustomEvent(name, { detail: info, bubbles: true }));
  };
  const surfaceNow = (): MazeSurface | ArrowSurface | null => (viewing === "maze" ? mazeSurface : arrowSurface);
  const setMessage = (key: string | null, values: Record<string, string | number> = {}, warn = false): void => {
    message = key === null ? null : { key, values, warn };
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
    fitButton.disabled = state?.fitted === true;
    outButton.disabled = state?.atLeast === true;
    inButton.disabled = state?.atMost === true;
    const lost = !onMaze && arrowGame?.status === "lost";
    const finished = !onMaze && arrowGame?.status === "cleared";
    undoButton.disabled = onMaze ? mazeGame === null || mazeGame.undo.length === 0 : arrowGame === null || arrowGame.taken.length === 0 || lost;
    restartButton.disabled = onMaze ? mazeGame === null || (mazeGame.path.length === 0 && mazeGame.strokes === 0) : arrowGame === null || (arrowGame.taken.length === 0 && arrowGame.mistakes === 0);
    hintButton.disabled = onMaze ? mazeGame?.solved === true : lost || finished;
    const label = onMaze && maze !== null ? say("mazeLabel", { shape: say(`shape_${maze.recipe.shape}`), n: maze.grid.cells, play: mixed ? say("mazeForButton") : say(`play_${maze.recipe.mode.replace(/-/g, "_")}`) }) : board === null ? "" : say("arrowsLabel", { n: board.arrows.length, shape: say(`shape_${board.recipe.shape}`) });
    box.setAttribute("aria-label", label);
    if (!withControls) return;
    const joiner = language === "ja" ? "" : " ";
    // The line on how to play, the line of progress, and the word of what has just happened.
    says.textContent = onMaze && maze !== null ? (mixed ? say("mazeForButton") : say(`play_${maze.recipe.mode.replace(/-/g, "_")}`)) : `${say("arrowsHint")}${mixed && board !== null && board.locked.some(Boolean) && arrowGame?.unlocked !== true ? `${joiner}${say("lockedCount", { n: board.locked.filter(Boolean).length })}` : ""}`;
    if (onMaze && mazeGame !== null && maze !== null) {
      const parts: string[] = [];
      if (mazeGame.solved) parts.push(mixed ? say("arrowsUnlocked") : say("solved", { n: moves }));
      else {
        parts.push(mazeGame.path.length === 0 ? say("notStarted") : say("drawn", { n: mazeGame.path.length }));
        if (maze.keys.length > 0) parts.push(say("keysOf", { k: mazeGame.collected.length, total: maze.keys.length }));
      }
      progress.textContent = parts.join(joiner);
    } else if (arrowGame !== null) {
      const hearts = "♥".repeat(arrowGame.hearts) + "♡".repeat(arrowGame.heartsAtStart - arrowGame.hearts);
      progress.textContent = arrowGame.status === "cleared" ? say("arrowsCleared") : `${say("arrowsLeft", { n: arrowsLeft(arrowGame) })}${joiner}${say("hearts", { n: arrowGame.hearts, total: arrowGame.heartsAtStart })} ${hearts}`;
    }
    messages.textContent = message === null ? "" : say(message.key, message.values);
    messages.dataset.warn = String(message?.warn === true);
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
      fitButton.disabled = state?.fitted === true;
      outButton.disabled = state?.atLeast === true;
      inButton.disabled = state?.atMost === true;
    };
    if (viewing === "maze" && maze !== null) {
      mazeSurface = createMazeSurface(box, { game: () => mazeGame!, change: onMazeChange, taps: () => tapExtends, viewChanged }, maze, look);
    } else if (board !== null) {
      arrowSurface = createArrowSurface(box, { tap: onArrowTap, viewChanged }, board, look);
      if (arrowGame !== null) arrowSurface.update(arrowGame, null);
    }
    refresh();
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
        setMessage("arrowsUnlocked");
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
      setMessage("arrowsLocked", {}, true);
      arrowSurface?.bump(id, undefined);
      playSound("bump");
    } else {
      setMessage(arrowGame.status === "lost" ? "arrowsLost" : "arrowsBlocked", {}, true);
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
      mazeGame = newMazeGame(maze);
      viewing = "maze";
    } else if (next.kind === "arrows") {
      board = makeArrows(next.recipe);
      arrowGame = newArrowGame(board);
      viewing = "arrows";
    } else {
      const mixed = buildMixed(next.recipe);
      maze = mixed.maze;
      mazeGame = newMazeGame(maze);
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
      stepByKey(step[0], step[1]);
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

  const api: MeikyuuMount = {
    host,
    kind: () => puzzle.kind,
    puzzle: () => puzzle,
    mazeGame: () => mazeGame,
    arrowGame: () => arrowGame,
    load: (next) => {
      const made = puzzleOf(next);
      if (made === null) return false;
      begin(made);
      return true;
    },
    set: (changes) => {
      const { tap, sound, hints, language: nextLanguage, ...nextLook } = changes;
      look = { ...look, ...nextLook };
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
        mazeGame = next;
        playSound("back");
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
        mazeGame = next;
        if (puzzle.kind === "maze") {
          solveTold = false;
          moves = 0;
        }
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
    fit: () => surfaceNow()?.surface.fit(),
    zoomIn: () => surfaceNow()?.surface.zoom(1.5),
    zoomOut: () => surfaceNow()?.surface.zoom(1 / 1.5),
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
      host.removeEventListener("keydown", onKey);
      host.replaceChildren();
      host.classList.remove("meikyuu-play");
      for (const name of ["kind", "level", "view", "solved", "moves", "cells", "keys", "reached", "hearts", "left", "unlocked", "status"]) delete host.dataset[name];
    },
  };

  begin(first);
  return api;
}
