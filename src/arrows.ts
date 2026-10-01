import { maskOf } from "./masks.ts";
import { below, seededRandom, shuffled, type Random } from "./random.ts";

/**
 * AN ARROW PUZZLE: a board of arrows, each a snake of cells with its head at one end, laid out to make a
 * picture (a heart, a leaf, a star). Tap an arrow and it slides off the board the way its head points,
 * if nothing is in the way; if another arrow is, it bumps and costs a heart. Clear every arrow to win.
 *
 * Every puzzle can be cleared, because it is built backwards: arrows are added one at a time, and each
 * one is added only if the way out from its head is clear of the arrows already there (and of itself).
 * Taking them away in the opposite order of adding them always works, and an arrow taken away never
 * blocks another, so any order that taps only free arrows clears the board.
 */

/** Which way an arrow's head points: up, right, down, left. */
export type ArrowDirection = 0 | 1 | 2 | 3;
export const ARROW_STEPS: readonly (readonly [number, number])[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/** One arrow: its cells from tail to head (indexes into the board, row by row), and the way its head points. */
export type Arrow = { readonly cells: readonly number[]; readonly dir: ArrowDirection };

/** The pictures an arrow board can be: the whole square, or one of the shapes cut from it. */
export const ARROW_SHAPES = ["square", "heart", "leaf", "star", "ring", "diamond", "cross", "moon"] as const;
export type ArrowShape = (typeof ARROW_SHAPES)[number];

/** Everything that makes an arrow puzzle. */
export type ArrowRecipe = {
  readonly shape: ArrowShape;
  /** Columns and rows of the board: the same for every shape but `square`. */
  readonly w: number;
  readonly h: number;
  /** The most cells an arrow may have. */
  readonly longest: number;
  readonly seed: number;
  /** How many arrows are locked until they are unlocked (the mixed puzzles). */
  readonly locks?: number;
};

export type ArrowBoard = {
  readonly recipe: ArrowRecipe;
  readonly w: number;
  readonly h: number;
  /** Which cells are part of the picture, whether an arrow is on them or not. */
  readonly inShape: readonly boolean[];
  readonly arrows: readonly Arrow[];
  /** Which arrows are locked: the ones the mixed puzzles hide behind a button. */
  readonly locked: readonly boolean[];
};

/** A recipe as a short word, such as `heart:15:6:77` or `square:9x9:5:123:2` (the last number: how many are locked), and back. */
export function arrowRecipeCode(recipe: ArrowRecipe): string {
  const size = recipe.shape === "square" ? `${recipe.w}x${recipe.h}` : `${recipe.w}`;
  return `${recipe.shape}:${size}:${recipe.longest}:${recipe.seed}${recipe.locks === undefined || recipe.locks === 0 ? "" : `:${recipe.locks}`}`;
}

export function parseArrowRecipe(code: string): ArrowRecipe | null {
  const parts = code.split(":");
  if (parts.length < 4 || parts.length > 5) return null;
  const [shape, size, longest, seed, locks] = parts as [string, string, string, string, string | undefined];
  if (!(ARROW_SHAPES as readonly string[]).includes(shape)) return null;
  const sizes = /^(\d+)(?:x(\d+))?$/.exec(size);
  if (sizes === null || !/^\d+$/.test(longest) || !/^\d+$/.test(seed) || (locks !== undefined && !/^\d+$/.test(locks))) return null;
  const w = Number(sizes[1]);
  const h = sizes[2] === undefined ? w : Number(sizes[2]);
  if ((shape === "square") !== (sizes[2] !== undefined) || w < 2 || h < 2 || Number(longest) < 1) return null;
  return { shape: shape as ArrowShape, w, h, longest: Number(longest), seed: Number(seed), ...(locks === undefined ? {} : { locks: Number(locks) }) };
}

/** The cells of a picture: every cell of a square, or the cells whose middles are inside the outline. */
function pictureOf(shape: ArrowShape, w: number, h: number): boolean[] {
  const inside = shape === "square" ? () => true : maskOf(shape);
  return Array.from({ length: w * h }, (_, cell) => inside((((cell % w) + 0.5) / w) * 2 - 1, ((Math.floor(cell / w) + 0.5) / h) * 2 - 1));
}

/** The cells in front of an arrow's head, out to the edge of the board, nearest first. */
export function rayOf(board: Pick<ArrowBoard, "w" | "h">, arrow: Arrow): number[] {
  const head = arrow.cells[arrow.cells.length - 1]!;
  const [dx, dy] = ARROW_STEPS[arrow.dir]!;
  const out: number[] = [];
  let x = (head % board.w) + dx;
  let y = Math.floor(head / board.w) + dy;
  while (x >= 0 && y >= 0 && x < board.w && y < board.h) {
    out.push(y * board.w + x);
    x += dx;
    y += dy;
  }
  return out;
}

function direction(w: number, from: number, to: number): ArrowDirection {
  const dx = (to % w) - (from % w);
  const dy = Math.floor(to / w) - Math.floor(from / w);
  return dx === 1 ? 1 : dx === -1 ? 3 : dy === 1 ? 2 : 0;
}

/** Grow a snake of up to `length` cells from `first`, over free cells of the picture, turning at random. */
function grow(w: number, h: number, free: (cell: number) => boolean, first: number, length: number, random: Random): number[] {
  const cells = [first];
  while (cells.length < length) {
    const end = cells[cells.length - 1]!;
    const x = end % w;
    const y = Math.floor(end / w);
    const options: number[] = [];
    for (const [dx, dy] of ARROW_STEPS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const next = ny * w + nx;
      if (free(next) && !cells.includes(next)) options.push(next);
    }
    if (options.length === 0) break;
    cells.push(options[below(random, options.length)]!);
  }
  return cells;
}

/** The arrows of a recipe, in the order they were added: the last one added is free from the start. */
export function makeArrows(recipe: ArrowRecipe): ArrowBoard {
  const { w, h } = recipe;
  const random = seededRandom(recipe.seed);
  const inShape = pictureOf(recipe.shape, w, h);
  const owner = new Int32Array(w * h).fill(-1);
  const arrows: Arrow[] = [];
  const free = (cell: number): boolean => inShape[cell]! && owner[cell] === -1;
  const clearFor = (cells: readonly number[], dir: ArrowDirection): boolean => {
    const ray = rayOf({ w, h }, { cells, dir });
    return ray.every((cell) => owner[cell] === -1 && !cells.includes(cell));
  };
  const place = (cells: number[], dir: ArrowDirection): void => {
    for (const cell of cells) owner[cell] = arrows.length;
    arrows.push({ cells, dir });
  };
  // Several passes over the picture in a random order: long arrows first, shorter and shorter after, so the gaps fill.
  // The order cells are tried in is mostly random, but leans from a spot of the board outward, so what is added later lies
  // further out and the arrows come off in rounds, from the outside in: the longer the lean, the deeper the puzzle.
  const focus = [below(random, w), below(random, h)] as const;
  const lean = 0.9;
  const order = Array.from({ length: w * h }, (_, cell) => cell)
    .filter((cell) => inShape[cell])
    .map((cell) => ({ cell, key: lean * (Math.hypot((cell % w) - focus[0], Math.floor(cell / w) - focus[1]) / Math.max(w, h)) + (1 - lean) * random() }))
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.cell);
  for (let pass = 0; pass < 4; pass += 1) {
    const most = Math.max(1, pass === 0 ? recipe.longest : Math.ceil(recipe.longest / (pass + 1)));
    for (const first of order) {
      if (!free(first)) continue;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const length = 1 + below(random, most);
        const snake = grow(w, h, free, first, length, random);
        // Either end may be the head; the head points along the last step. A lone cell may point any way.
        const heads: { cells: number[]; dir: ArrowDirection }[] = [];
        if (snake.length === 1) for (const dir of [0, 1, 2, 3] as const) heads.push({ cells: snake, dir });
        else {
          const reversed = [...snake].reverse();
          heads.push({ cells: snake, dir: direction(w, snake[snake.length - 2]!, snake[snake.length - 1]!) });
          heads.push({ cells: reversed, dir: direction(w, reversed[reversed.length - 2]!, reversed[reversed.length - 1]!) });
        }
        const clear = heads.filter((head) => clearFor(head.cells, head.dir));
        if (clear.length === 0) continue;
        const chosen = clear[below(random, clear.length)]!;
        place(chosen.cells, chosen.dir);
        break;
      }
    }
  }
  const board: ArrowBoard = { recipe, w, h, inShape, arrows, locked: arrows.map(() => false) };
  return { ...board, locked: lockedFor(board, recipe.locks ?? 0, random) };
}

/** Which arrows block others: for each arrow, the arrows whose cells lie on its way out. */
export function blockersOf(board: Pick<ArrowBoard, "w" | "h" | "arrows">): number[][] {
  const known = BLOCKERS.get(board);
  if (known !== undefined) return known;
  const owner = new Int32Array(board.w * board.h).fill(-1);
  board.arrows.forEach((arrow, id) => arrow.cells.forEach((cell) => (owner[cell] = id)));
  const blockers = board.arrows.map((arrow) => [...new Set(rayOf(board, arrow).map((cell) => owner[cell]!).filter((id) => id >= 0))]);
  BLOCKERS.set(board, blockers);
  return blockers;
}

/** Each board's blockers, worked out once: a board never changes. */
const BLOCKERS = new WeakMap<object, number[][]>();

/** The arrows locked: free to begin with and in the way of others, the ones that block most first, so the lock matters. */
function lockedFor(board: ArrowBoard, count: number, random: Random): boolean[] {
  const locked = board.arrows.map(() => false);
  if (count === 0) return locked;
  const blockers = blockersOf(board);
  const dependents = board.arrows.map(() => 0);
  blockers.forEach((ids) => ids.forEach((id) => (dependents[id] = dependents[id]! + 1)));
  const wanted = board.arrows.map((_, id) => id).filter((id) => dependents[id]! > 0 && blockers[id]!.length === 0);
  const candidates = shuffled(wanted, random).sort((a, b) => dependents[b]! - dependents[a]!);
  // Take them from the top few, not strictly the top, so the choice varies between puzzles.
  const pool = candidates.slice(0, Math.max(count, Math.ceil(candidates.length / 2)));
  for (const id of shuffled(pool, random).slice(0, count)) locked[id] = true;
  if (locked.filter(Boolean).length < count) throw new Error("this board has too few free arrows in the way of others to lock that many");
  return locked;
}

/** The order the arrows come off in if every free one is taken each round, as rounds: the length of this is how many times the board has to be looked at again. */
export function peelRounds(board: Pick<ArrowBoard, "w" | "h" | "arrows">): number[][] | null {
  const blockers = blockersOf(board);
  const present = new Set(board.arrows.map((_, id) => id));
  const rounds: number[][] = [];
  while (present.size > 0) {
    const round = [...present].filter((id) => blockers[id]!.every((other) => !present.has(other)));
    if (round.length === 0) return null;
    for (const id of round) present.delete(id);
    rounds.push(round);
  }
  return rounds;
}

/** How hard an arrow puzzle is: the arrows to clear, the rounds of unblocking they take, and how many are blocked at the start. */
export type ArrowMeasure = { arrows: number; cells: number; rounds: number; free: number; blocked: number; longest: number; effort: number };

export function measureArrows(board: ArrowBoard): ArrowMeasure {
  const rounds = peelRounds(board);
  if (rounds === null) throw new Error("the arrows cannot all be cleared");
  const free = rounds[0]!.length;
  const arrows = board.arrows.length;
  const locks = board.locked.filter(Boolean).length;
  // A person's work: every arrow tapped, a look for the free one each round, and a guess wasted on each blocked arrow that looks free.
  const effort = arrows + 4 * rounds.length + Math.round((arrows - free) / 2) + 6 * locks;
  return { arrows, cells: board.arrows.reduce((sum, arrow) => sum + arrow.cells.length, 0), rounds: rounds.length, free, blocked: arrows - free, longest: board.arrows.reduce((most, arrow) => Math.max(most, arrow.cells.length), 0), effort };
}
