import type { MazeGame } from "./game.ts";
import { lineToSteps, stepsToLine } from "./steps.ts";
import type { MazeCore } from "./maze.ts";

/**
 * STONES: a marble laid on a cell of the maze that the line may not enter. Where the maze is big, a player who has found that a passage
 * leads nowhere wants to shut it, so that the line is not drawn down it again and the eye is not led down it either. A stone is a
 * helper of the player's own and never part of the maze: it is not in the recipe, not in the answer and not in any check, and the
 * maze is solved by exactly the line it was before.
 *
 * It is not a pen. John, who asked for it: "I didn't want people to start painting the map and just placing anywhere... it has to be a
 * carefully placed item that you must lay adjacent to your existing path." So a stone may be laid only
 *
 * - on a cell the line is not on, and that is not the start or the goal (so the way is never shut at either end),
 * - on a cell that is joined by open passages to a cell of the line within `reach` steps (1 or 2: next to the line, or one cell beyond that), not
 *   counting a way through another stone, so a stone is laid at the root of a passage the line has just passed, never across a wall and never
 *   out in the middle of the maze,
 * - while the game has stones left to lay (`limit`, or no limit at all), and not once the maze is solved.
 *
 * A stone is taken up by asking for the cell again, which gives it back. Stones are part of the game's state: Undo puts back what a lay or a
 * take changed, Restart takes them all up, and `encodeRun` and `decodeRun` keep a run with its stones as one short text.
 *
 * These are pure functions like the rest of the game: each takes a game and returns a new one, or the same one when nothing changed.
 */
export type StoneRules = {
  /** How many stones may be down at once, or null for as many as the player likes. */
  readonly limit: number | null;
  /** How far from the line a stone may be laid, in cells along the passages: 1 or 2. */
  readonly reach: 1 | 2;
};

/** What the `stones` option of `mountMeikyuu` takes: `true` for the defaults, or any of the rules (`limit: null` for no limit). */
export type StoneOption = boolean | { readonly limit?: number | null; readonly reach?: number };

/** The farthest a stone may be from the line: two cells. */
export const MEIKYUU_STONE_REACH_MOST = 2;

/** How many stones a maze of `cells` cells gets by default: three, and one more for every hundred cells across (so four for a small maze, nine for a huge one, thirteen for a colossal one). */
export function stoneLimitFor(cells: number): number {
  return 3 + Math.floor(Math.sqrt(Math.max(0, cells)) / 10);
}

/** The rules an option means for a maze of `cells` cells, or null when the option is no stones. */
export function stoneRulesOf(option: StoneOption | undefined, cells: number): StoneRules | null {
  if (option === undefined || option === false) return null;
  const given = option === true ? {} : option;
  const reach = Math.min(MEIKYUU_STONE_REACH_MOST, Math.max(1, Math.round(given.reach ?? MEIKYUU_STONE_REACH_MOST))) as 1 | 2;
  const limit = given.limit === undefined ? stoneLimitFor(cells) : given.limit === null || !Number.isFinite(given.limit) ? null : Math.max(0, Math.floor(given.limit));
  return { limit, reach };
}

/** Why a stone cannot be laid on a cell, or `ok`. */
export type StoneVerdict = "ok" | "off" | "solved" | "drawing" | "no-line" | "no-cell" | "on-line" | "has-stone" | "end" | "limit" | "far";

/** How many stones can still be laid: null for no limit, and nought for a game with none. */
export function stonesLeft(game: MazeGame<MazeCore>): number | null {
  if (game.rules === null) return 0;
  return game.rules.limit === null ? null : Math.max(0, game.rules.limit - game.stones.length);
}

/** Whether a cell has a stone on it. */
export function hasStone(game: MazeGame<MazeCore>, cell: number): boolean {
  return game.stones.includes(cell);
}

/** Whether a cell is within `reach` steps along the passages of a cell of the line, not going through a stone. The walk starts at the cell, so it costs a few cells and not the length of the line. */
function nearLine(game: MazeGame<MazeCore>, cell: number, reach: number): boolean {
  const onLine = new Set(game.path);
  const seen = new Set<number>([cell]);
  let frontier = [cell];
  for (let step = 0; step < reach; step += 1) {
    const next: number[] = [];
    for (const here of frontier) {
      for (const there of game.maze.links[here]!) {
        if (seen.has(there)) continue;
        if (onLine.has(there)) return true;
        seen.add(there);
        if (!game.stones.includes(there)) next.push(there);
      }
    }
    frontier = next;
  }
  return false;
}

/** Whether a stone may be laid on a cell now, and if not, why not. A stone already there is `has-stone`: ask `takeStone` for it. */
export function canLayStone(game: MazeGame<MazeCore>, cell: number): StoneVerdict {
  if (game.rules === null) return "off";
  if (!Number.isInteger(cell) || cell < 0 || cell >= game.maze.grid.cells) return "no-cell";
  if (game.solved) return "solved";
  if (game.drawing) return "drawing";
  if (game.path.length === 0) return "no-line";
  if (game.path.includes(cell)) return "on-line";
  if (hasStone(game, cell)) return "has-stone";
  if (cell === game.maze.start || cell === game.maze.goal) return "end";
  const left = stonesLeft(game);
  if (left !== null && left <= 0) return "limit";
  return nearLine(game, cell, game.rules.reach) ? "ok" : "far";
}

/** The game with a stone laid on the cell; the same game when it may not be (`canLayStone`). Undo takes it up again. */
export function layStone<M extends MazeCore>(game: MazeGame<M>, cell: number): MazeGame<M> {
  if (canLayStone(game, cell) !== "ok") return game;
  return { ...game, stones: [...game.stones, cell], undo: [...game.undo, { path: game.path, collected: game.collected, solved: game.solved, stones: game.stones }] };
}

/** The game with the stone on the cell taken up (and given back); the same game when there is none. Undo lays it again. */
export function takeStone<M extends MazeCore>(game: MazeGame<M>, cell: number): MazeGame<M> {
  if (game.rules === null || game.drawing || !hasStone(game, cell)) return game;
  return { ...game, stones: game.stones.filter((each) => each !== cell), undo: [...game.undo, { path: game.path, collected: game.collected, solved: game.solved, stones: game.stones }] };
}

/** A tap on a cell: a stone there is taken up, and otherwise one is laid. `how` says which, or that it was refused and why. */
export function toggleStone<M extends MazeCore>(game: MazeGame<M>, cell: number): { game: MazeGame<M>; how: "laid" | "taken" | "refused"; why: StoneVerdict } {
  if (hasStone(game, cell) && game.rules !== null && !game.drawing) return { game: takeStone(game, cell), how: "taken", why: "ok" };
  const why = canLayStone(game, cell);
  return why === "ok" ? { game: layStone(game, cell), how: "laid", why } : { game, how: "refused", why };
}

/** Every stone taken up, in one step Undo can put back. The same game when there are none. */
export function clearStones<M extends MazeCore>(game: MazeGame<M>): MazeGame<M> {
  if (game.stones.length === 0 || game.drawing) return game;
  return { ...game, stones: [], undo: [...game.undo, { path: game.path, collected: game.collected, solved: game.solved, stones: game.stones }] };
}

/** The same game under other rules (the limit or the reach changed, or stones turned on or off): the stones down stay down, and none is ever taken off by a lower limit, only no more laid. */
export function withStoneRules<M extends MazeCore>(game: MazeGame<M>, rules: StoneRules | null): MazeGame<M> {
  const same = game.rules === rules || (game.rules !== null && rules !== null && game.rules.limit === rules.limit && game.rules.reach === rules.reach);
  return same ? game : { ...game, rules, stones: rules === null ? [] : game.stones };
}

/**
 * A run kept as one short text: the line as its steps (`lineToSteps`), and, if any stones are down, a `~` and their cells in base 36 joined by dots,
 * such as `0231~1a.2f`. The same text is the same run on every device and however the board is turned. A run has no history, so it comes back
 * with one Undo, which takes the whole of it back to a maze with nothing drawn (what a player who left a half-drawn maze and came back expects: it can be cleared).
 */
export function encodeRun(game: MazeGame<MazeCore>): string {
  const steps = lineToSteps(game.maze, game.path) ?? "";
  return game.stones.length === 0 ? steps : `${steps}~${game.stones.map((cell) => cell.toString(36)).join(".")}`;
}

const CELL = /^[0-9a-z]+$/;

/**
 * The game a run text says, for `maze` under `rules`, or null when it is not a run of that maze: a step into a wall or back onto the line, a stone
 * on a cell the line is on, on the start or the goal, on no cell at all or twice, or any stones when `rules` is null. The limit is not asked of a run (it only stops
 * more being laid, as a lower limit takes no stone off): a run kept under one limit comes back under another. An empty text is a game
 * with nothing drawn.
 */
export function decodeRun<M extends MazeCore>(maze: M, code: string, rules: StoneRules | null): MazeGame<M> | null {
  const [steps = "", stoneText] = code.split("~") as [string | undefined, string | undefined];
  let path: number[] = [];
  // Stones are laid beside a line, so a run with stones has one, if only its start; a text that is nothing is a game with nothing drawn.
  if (steps !== "" || stoneText !== undefined) {
    const line = stepsToLine(maze, steps);
    if (line === null) return null;
    path = line;
  }
  const stones: number[] = [];
  if (stoneText !== undefined) {
    if (rules === null) return null;
    for (const part of stoneText.split(".")) {
      if (!CELL.test(part)) return null;
      const cell = parseInt(part, 36);
      if (cell >= maze.grid.cells || cell === maze.start || cell === maze.goal || path.includes(cell) || stones.includes(cell)) return null;
      stones.push(cell);
    }
  }
  const collected = maze.keys.filter((key) => path.includes(key));
  const solved = path.length > 0 && path[path.length - 1] === maze.goal && maze.keys.every((key) => collected.includes(key));
  return { maze, path, collected, solved, drawing: false, strokes: path.length > 1 || stones.length > 0 ? 1 : 0, undo: path.length > 0 || stones.length > 0 ? [{ path: [], collected: [], solved: false, stones: [] }] : [], stones, rules };
}
