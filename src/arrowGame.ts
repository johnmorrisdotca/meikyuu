import { blockersOf, type ArrowBoard } from "./arrows.ts";

/**
 * AN ARROW PUZZLE BEING PLAYED, as pure functions. `tapArrow` is the one move: a free arrow
 * is taken off the board; a blocked one costs a heart (and says which arrow is in its way); a
 * locked one that has not been unlocked does nothing at all, and costs nothing, because the
 * player cannot know yet. Clear every arrow to win; lose the last heart and the puzzle is lost
 * until it is restarted.
 *
 * The mixed puzzles lock some arrows until a button deep in a maze is reached. `unlockArrows`
 * is what reaching it does.
 */
export type ArrowGame = {
  readonly board: ArrowBoard;
  /** Whether each arrow is still on the board. */
  readonly present: readonly boolean[];
  readonly hearts: number;
  readonly heartsAtStart: number;
  /** Whether the locked arrows have been unlocked. */
  readonly unlocked: boolean;
  readonly status: "playing" | "cleared" | "lost";
  /** The arrows taken, in order, for Undo and for the page's own record. */
  readonly taken: readonly number[];
  /** Taps that cost a heart. */
  readonly mistakes: number;
};

/** What a tap did. */
export type ArrowTap = { readonly game: ArrowGame; readonly result: "removed" | "blocked" | "locked" | "ignored"; /** The arrow in the way, for `blocked`. */ readonly by?: number };

/** The hearts a puzzle starts with. */
export const ARROW_HEARTS = 3;

export function newArrowGame(board: ArrowBoard, hearts: number = ARROW_HEARTS): ArrowGame {
  return { board, present: board.arrows.map(() => true), hearts, heartsAtStart: hearts, unlocked: !board.locked.some(Boolean), status: "playing", taken: [], mistakes: 0 };
}

/** The arrows on the way out of `id` that are still on the board. */
export function blockedBy(game: ArrowGame, id: number): number[] {
  return blockersOf(game.board)[id]!.filter((other) => game.present[other]);
}

/** Whether an arrow can be tapped now and slide off: it is on the board, not locked, and nothing is in front of it. */
export function isFree(game: ArrowGame, id: number): boolean {
  return game.present[id] === true && !(game.board.locked[id] && !game.unlocked) && blockedBy(game, id).length === 0;
}

export function tapArrow(game: ArrowGame, id: number): ArrowTap {
  if (game.status !== "playing" || id < 0 || id >= game.present.length || !game.present[id]) return { game, result: "ignored" };
  if (game.board.locked[id] && !game.unlocked) return { game, result: "locked" };
  const blockers = blockedBy(game, id);
  if (blockers.length > 0) {
    const hearts = game.hearts - 1;
    return { game: { ...game, hearts, mistakes: game.mistakes + 1, status: hearts <= 0 ? "lost" : "playing" }, result: "blocked", by: blockers[0]! };
  }
  const present = game.present.map((here, other) => here && other !== id);
  const cleared = !present.some(Boolean);
  return { game: { ...game, present, taken: [...game.taken, id], status: cleared ? "cleared" : "playing" }, result: "removed" };
}

/** Let the locked arrows be tapped. */
export function unlockArrows(game: ArrowGame): ArrowGame {
  return game.unlocked ? game : { ...game, unlocked: true };
}

/** Put the last arrow taken back, and give back no heart. */
export function undoArrow(game: ArrowGame): ArrowGame {
  const last = game.taken[game.taken.length - 1];
  if (last === undefined || game.status === "lost") return game;
  return { ...game, present: game.present.map((here, id) => here || id === last), taken: game.taken.slice(0, -1), status: "playing" };
}

export function restartArrows(game: ArrowGame): ArrowGame {
  return { ...newArrowGame(game.board, game.heartsAtStart), unlocked: game.unlocked };
}

/**
 * The arrow to tap next: one that is free now and keeps the most arrows waiting behind it, so it also frees
 * the most others. None when every arrow still on the board is blocked or locked (the player must unlock).
 */
export function hintArrow(game: ArrowGame): number | null {
  const blockers = blockersOf(game.board);
  let best: number | null = null;
  let bestWaiting = -1;
  for (let id = 0; id < game.present.length; id += 1) {
    if (!isFree(game, id)) continue;
    const waiting = blockers.filter((others, other) => game.present[other] && others.includes(id)).length;
    if (waiting > bestWaiting) {
      best = id;
      bestWaiting = waiting;
    }
  }
  return best;
}

/** The count of arrows still on the board. */
export function arrowsLeft(game: ArrowGame): number {
  return game.present.filter(Boolean).length;
}

/** Take every arrow off by tapping only free ones, the way a test or a demo plays. The same game when it cannot (a locked arrow in the way of the rest). */
export function clearArrows(game: ArrowGame): ArrowGame {
  let next = game;
  for (;;) {
    const id = hintArrow(next);
    if (id === null) return next;
    next = tapArrow(next, id).game;
  }
}
