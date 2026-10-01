import { solutionOf, walk, type Maze } from "./maze.ts";

/**
 * A MAZE BEING DRAWN, as pure functions: each takes a game and returns a new one (or the same one,
 * when nothing changed), so a page, a server and a test play by the same rules.
 *
 * A line starts at the start cell and runs through open passages, one cell to the next. A cell the
 * line is on again cuts the line back to it, so drawing back shortens it and a line never crosses
 * itself. A key is picked up by passing over it and stays picked up when the line is drawn back.
 * The maze is solved when the line's end is on the goal and every key is picked up; after that the
 * line is fixed until Undo or Restart.
 *
 * A finger is a stroke: `pressMaze` begins one (on the start, on the line's end, or on any cell of
 * the line, which cuts it back there), `dragMaze` follows it into each cell, `liftMaze` ends it and
 * is what Undo undoes. A tap, where the page offers it, is `tapMaze`.
 */
export type MazeGame = {
  readonly maze: Maze;
  /** The line, from the start; empty until it is begun. */
  readonly path: readonly number[];
  /** The keys picked up, in the order they were. */
  readonly collected: readonly number[];
  readonly solved: boolean;
  /** Whether a stroke is being drawn. */
  readonly drawing: boolean;
  /** How many strokes have been made, to count moves. */
  readonly strokes: number;
  /** What each finished stroke started from, newest last, for Undo. */
  readonly undo: readonly { readonly path: readonly number[]; readonly collected: readonly number[]; readonly solved: boolean }[];
};

/** A game of the maze, with nothing drawn. */
export function newMazeGame(maze: Maze): MazeGame {
  return { maze, path: [], collected: [], solved: false, drawing: false, strokes: 0, undo: [] };
}

/** The end of the line, or null while there is none. */
export function headOf(game: MazeGame): number | null {
  return game.path.length === 0 ? null : game.path[game.path.length - 1]!;
}

const finished = (game: MazeGame, path: readonly number[], collected: readonly number[]): boolean => path.length > 0 && path[path.length - 1] === game.maze.goal && game.maze.keys.every((key) => collected.includes(key));

/** The line with the cell added or cut back to; the same game when the cell is not a step the line can take. */
function step(game: MazeGame, cell: number): MazeGame {
  if (game.solved) return game;
  const { path } = game;
  const head = headOf(game);
  if (head === null) return cell === game.maze.start ? withLine(game, [cell]) : game;
  if (cell === head) return game;
  const at = path.lastIndexOf(cell);
  if (at >= 0) return withLine(game, path.slice(0, at + 1));
  if (!game.maze.links[head]!.includes(cell)) return game;
  return withLine(game, [...path, cell]);
}

function withLine(game: MazeGame, path: readonly number[]): MazeGame {
  const last = path[path.length - 1]!;
  const collected = game.maze.keys.includes(last) && !game.collected.includes(last) ? [...game.collected, last] : game.collected;
  return { ...game, path, collected, solved: finished(game, path, collected) };
}

/** A finger down on a cell: it begins a stroke if the cell is the start, the line's end, or on the line. */
export function pressMaze(game: MazeGame, cell: number): MazeGame {
  if (game.solved || game.drawing) return game;
  const onLine = game.path.includes(cell);
  if (!(game.path.length === 0 ? cell === game.maze.start : onLine)) return game;
  const begun: MazeGame = { ...game, drawing: true, undo: [...game.undo, { path: game.path, collected: game.collected, solved: game.solved }] };
  return step(begun, cell);
}

/** The finger moved into a cell. A cell that is not next to the line's end is ignored: a page that moves faster than cells go calls this for each cell between. */
export function dragMaze(game: MazeGame, cell: number): MazeGame {
  return game.drawing ? step(game, cell) : game;
}

/** The finger lifted. A stroke that changed nothing is forgotten, so Undo never has a step that did nothing. */
export function liftMaze(game: MazeGame): MazeGame {
  if (!game.drawing) return game;
  const last = game.undo[game.undo.length - 1]!;
  const same = last.path.length === game.path.length && last.path.every((cell, i) => cell === game.path[i]) && last.collected.length === game.collected.length;
  return same ? { ...game, drawing: false, undo: game.undo.slice(0, -1) } : { ...game, drawing: false, strokes: game.strokes + 1 };
}

/** Put the whole line back as it was before the last stroke. */
export function undoMaze(game: MazeGame): MazeGame {
  const last = game.undo[game.undo.length - 1];
  if (last === undefined) return game;
  return { ...game, path: last.path, collected: last.collected, solved: last.solved, drawing: false, undo: game.undo.slice(0, -1) };
}

/** Everything off the maze again. */
export function restartMaze(game: MazeGame): MazeGame {
  return game.path.length === 0 && game.strokes === 0 ? game : newMazeGame(game.maze);
}

/**
 * A tap on a cell: the line runs along the passage toward it as far as the next place it could have gone
 * another way, or to the cell itself if that comes first. A tap on a cell of the line cuts the line back to
 * it. It begins the line when the tap is on the start. It never decides a fork for the player.
 */
export function tapMaze(game: MazeGame, cell: number): MazeGame {
  if (game.solved || game.drawing) return game;
  const head = headOf(game);
  if (head === null) return cell === game.maze.start ? liftMaze(pressMaze(game, cell)) : game;
  let next = pressMaze(game, game.path.includes(cell) ? cell : head);
  if (!next.drawing) return game;
  if (!game.path.includes(cell)) {
    // The way from the line's end to the cell: back along the walk from the cell.
    const { before } = walk(game.maze.links, head);
    const route: number[] = [];
    for (let at = cell; at !== head && at !== -1; at = before[at]!) route.push(at);
    route.reverse();
    for (const [index, onward] of route.entries()) {
      next = step(next, onward);
      // Stop at a fork, where the line has more than one way to go on, unless that is the cell tapped.
      if (index < route.length - 1 && game.maze.links[onward]!.length > 2) break;
    }
  }
  return liftMaze(next);
}

/** How far the line has got, for a progress line: cells drawn, keys, and whether it is solved. */
export function mazeProgress(game: MazeGame): { cells: number; keys: number; keysOf: number; solved: boolean } {
  return { cells: game.path.length, keys: game.collected.length, keysOf: game.maze.keys.length, solved: game.solved };
}

/**
 * Where to look next: how many cells of the line to draw back (the part that has strayed from the way to
 * what is still needed), and the next stretch of the right way from there, up to `ahead` cells, not
 * counting the one the line is on. The right way goes to the nearest key not yet picked up, and to the goal
 * when there are none. Empty `ahead` when the maze is solved.
 */
export function hintMaze(game: MazeGame, ahead = 8): { back: number; cells: number[] } {
  const { maze } = game;
  if (game.solved) return { back: 0, cells: [] };
  if (game.path.length === 0) return { back: 0, cells: [maze.start] };
  // What the line needs: the tree that joins the start to every key not yet picked up and to the goal.
  const needed = new Uint8Array(maze.links.length);
  const { before } = walk(maze.links, maze.start);
  for (const end of [maze.goal, ...maze.keys.filter((key) => !game.collected.includes(key))]) for (let cell = end; cell !== -1 && needed[cell] === 0; cell = before[cell]!) needed[cell] = 1;
  let keep = game.path.length;
  while (keep > 0 && needed[game.path[keep - 1]!] === 0) keep -= 1;
  const from = game.path[Math.max(keep, 1) - 1]!;
  // From there to the nearest thing still to reach, along passages that are needed.
  const aim = [maze.goal, ...maze.keys.filter((key) => !game.collected.includes(key))];
  const { dist, before: back } = walk(maze.links, from);
  const target = aim.reduce((best, cell) => (dist[cell]! < dist[best]! ? cell : best), aim[0]!);
  const way: number[] = [];
  for (let cell = target; cell !== from && cell !== -1; cell = back[cell]!) way.push(cell);
  way.reverse();
  return { back: game.path.length - Math.max(keep, 1), cells: way.slice(0, ahead) };
}

/** Draw the maze's whole solution through the game, a cell at a time, as a finger would: the way a test or a demo plays. Keys are collected on the way. */
export function playSolution(game: MazeGame): MazeGame {
  let next = pressMaze(game, game.maze.start);
  const { maze } = game;
  // Visit each key and come back, then go to the goal.
  const { before } = walk(maze.links, maze.start);
  const route = (to: number): number[] => {
    const cells: number[] = [];
    for (let cell = to; cell !== -1; cell = before[cell]!) cells.push(cell);
    return cells.reverse();
  };
  for (const key of maze.keys) for (const cell of [...route(key), ...route(key).reverse()]) next = dragMaze(next, cell);
  for (const cell of solutionOf(maze)) next = dragMaze(next, cell);
  return liftMaze(next);
}
