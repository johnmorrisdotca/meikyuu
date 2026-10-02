import { describe, expect, it } from "vitest";

import { arrowsLeft, blockedBy, clearArrows, heldByLocks, hintArrow, isFree, newArrowGame, restartArrows, tapArrow, undoArrow, unlockArrows, ARROW_HEARTS } from "./arrowGame.ts";
import { arrowRecipeCode, ARROW_SHAPES, ARROW_STEPS, blockersOf, makeArrows, measureArrows, parseArrowRecipe, peelRounds, rayOf, type ArrowRecipe } from "./arrows.ts";

const recipes: ArrowRecipe[] = [
  { shape: "square", w: 6, h: 6, longest: 3, seed: 1 },
  { shape: "square", w: 12, h: 9, longest: 6, seed: 2 },
  { shape: "heart", w: 16, h: 16, longest: 6, seed: 3 },
  { shape: "leaf", w: 20, h: 20, longest: 5, seed: 4 },
  { shape: "star", w: 25, h: 25, longest: 8, seed: 5 },
  { shape: "ring", w: 15, h: 15, longest: 4, seed: 6 },
  { shape: "diamond", w: 15, h: 15, longest: 5, seed: 7 },
  { shape: "cross", w: 15, h: 15, longest: 3, seed: 8 },
  { shape: "moon", w: 18, h: 18, longest: 7, seed: 9 },
];

describe("making arrows", () => {
  it("is the same board for the same recipe", () => {
    const one = makeArrows(recipes[2]!);
    expect(makeArrows({ ...recipes[2]! }).arrows).toEqual(one.arrows);
    expect(makeArrows({ ...recipes[2]!, seed: 4 }).arrows).not.toEqual(one.arrows);
  });

  for (const recipe of recipes) {
    it(`${recipe.shape} ${recipe.w}×${recipe.h}: arrows stay in the picture, never share a cell, are one connected snake, and point along their last step`, () => {
      const board = makeArrows(recipe);
      const seen = new Set<number>();
      expect(board.arrows.length).toBeGreaterThan(5);
      for (const arrow of board.arrows) {
        for (const [i, cell] of arrow.cells.entries()) {
          expect(board.inShape[cell]).toBe(true);
          expect(seen.has(cell)).toBe(false);
          seen.add(cell);
          if (i > 0) {
            const before = arrow.cells[i - 1]!;
            expect(Math.abs((cell % board.w) - (before % board.w)) + Math.abs(Math.floor(cell / board.w) - Math.floor(before / board.w))).toBe(1);
          }
        }
        if (arrow.cells.length > 1) {
          const [a, b] = [arrow.cells[arrow.cells.length - 2]!, arrow.cells[arrow.cells.length - 1]!];
          expect([(b % board.w) - (a % board.w), Math.floor(b / board.w) - Math.floor(a / board.w)]).toEqual([...ARROW_STEPS[arrow.dir]!]);
        }
      }
      // The picture is mostly filled.
      expect(seen.size / board.inShape.filter(Boolean).length).toBeGreaterThan(0.8);
    });

    it(`${recipe.shape} ${recipe.w}×${recipe.h}: every puzzle can be cleared: peeled in rounds, and cleared by tapping free arrows`, () => {
      const board = makeArrows(recipe);
      const rounds = peelRounds(board);
      expect(rounds).not.toBeNull();
      expect(rounds!.flat().length).toBe(board.arrows.length);
      expect(rounds![0]!.length).toBeGreaterThan(0);
      const done = clearArrows(newArrowGame(board));
      expect(done.status).toBe("cleared");
      expect(done.mistakes).toBe(0);
      expect(done.hearts).toBe(ARROW_HEARTS);
    });
  }

  it("clears in the reverse of the order they were added, the way it is built", () => {
    for (const recipe of recipes) {
      const board = makeArrows(recipe);
      let game = newArrowGame(board);
      for (let id = board.arrows.length - 1; id >= 0; id -= 1) {
        const tap = tapArrow(game, id);
        expect(tap.result, `${recipe.shape} arrow ${id}`).toBe("removed");
        game = tap.game;
      }
      expect(game.status).toBe("cleared");
    }
  });

  it("reads and writes its recipe code", () => {
    for (const recipe of [...recipes, { ...recipes[0]!, locks: 2 }]) expect(parseArrowRecipe(arrowRecipeCode(recipe))).toEqual(recipe);
    expect(arrowRecipeCode({ shape: "square", w: 9, h: 9, longest: 5, seed: 123, locks: 2 })).toBe("square:9x9:5:123:2");
    expect(arrowRecipeCode({ shape: "heart", w: 15, h: 15, longest: 6, seed: 77 })).toBe("heart:15:6:77");
    for (const bad of ["", "square:9:5:1", "heart:9x9:5:1", "star2:9:5:1", "heart:9:0:1", "heart:9:5"]) expect(parseArrowRecipe(bad), bad).toBeNull();
    expect(ARROW_SHAPES).toContain("heart");
  });

  it("measures: more arrows and deeper chains of blocking cost more", () => {
    const small = measureArrows(makeArrows({ shape: "square", w: 5, h: 5, longest: 3, seed: 1 }));
    const big = measureArrows(makeArrows({ shape: "heart", w: 24, h: 24, longest: 8, seed: 1 }));
    expect(big.effort).toBeGreaterThan(small.effort * 2);
    expect(big.rounds).toBeGreaterThanOrEqual(small.rounds);
    expect(big.free + big.blocked).toBe(big.arrows);
  });
});

describe("tapping arrows", () => {
  const board = makeArrows({ shape: "square", w: 8, h: 8, longest: 4, seed: 11 });
  const blocked = board.arrows.findIndex((_, id) => blockersOf(board)[id]!.length > 0);
  const free = board.arrows.findIndex((_, id) => blockersOf(board)[id]!.length === 0);

  it("a free arrow slides off the board, and nothing else changes", () => {
    const tap = tapArrow(newArrowGame(board), free);
    expect(tap.result).toBe("removed");
    expect(tap.game.present[free]).toBe(false);
    expect(arrowsLeft(tap.game)).toBe(board.arrows.length - 1);
    expect(tap.game.hearts).toBe(ARROW_HEARTS);
    expect(isFree(tap.game, free)).toBe(false);
  });

  it("a blocked arrow bumps, costs a heart, names what is in the way, and stays", () => {
    expect(blocked).toBeGreaterThanOrEqual(0);
    const game = newArrowGame(board);
    const tap = tapArrow(game, blocked);
    expect(tap.result).toBe("blocked");
    expect(tap.game.hearts).toBe(ARROW_HEARTS - 1);
    expect(tap.game.present[blocked]).toBe(true);
    expect(blockedBy(game, blocked)).toContain(tap.by);
    expect(tap.game.mistakes).toBe(1);
  });

  it("the third wrong tap loses, after which nothing can be tapped", () => {
    let game = newArrowGame(board);
    for (let n = 0; n < ARROW_HEARTS; n += 1) game = tapArrow(game, blocked).game;
    expect(game.status).toBe("lost");
    expect(tapArrow(game, free).result).toBe("ignored");
    expect(restartArrows(game).status).toBe("playing");
    expect(restartArrows(game).hearts).toBe(ARROW_HEARTS);
  });

  it("an arrow that is gone, or that is not an arrow, is ignored", () => {
    const gone = tapArrow(newArrowGame(board), free).game;
    expect(tapArrow(gone, free).result).toBe("ignored");
    expect(tapArrow(gone, -1).result).toBe("ignored");
    expect(tapArrow(gone, 9999).result).toBe("ignored");
  });

  it("an arrow stops being blocked when what is in its way has gone", () => {
    const game = newArrowGame(board);
    const [first] = blockedBy(game, blocked);
    expect(isFree(game, blocked)).toBe(false);
    let next = game;
    for (const other of blockedBy(game, blocked)) next = clearUntilFree(next, other);
    expect(first).toBeDefined();
    expect(isFree(next, blocked)).toBe(true);
  });

  it("the hint is a free arrow, and undo puts the last arrow back without giving back a heart", () => {
    const game = newArrowGame(board);
    const id = hintArrow(game)!;
    expect(isFree(game, id)).toBe(true);
    const taken = tapArrow(game, id).game;
    expect(undoArrow(taken).present).toEqual(game.present);
    const hurt = tapArrow(taken, blocked).game;
    expect(undoArrow(hurt).hearts).toBe(hurt.hearts);
  });

  it("rays run from the head to the board's edge", () => {
    const arrow = { cells: [10, 11], dir: 1 as const };
    expect(rayOf({ w: 5, h: 5 }, arrow)).toEqual([12, 13, 14]);
    expect(rayOf({ w: 5, h: 5 }, { cells: [4], dir: 1 })).toEqual([]);
    expect(rayOf({ w: 5, h: 5 }, { cells: [12], dir: 0 })).toEqual([7, 2]);
  });
});

/** Take free arrows until `id` is free or none can be taken, never tapping `id` itself. */
function clearUntilFree(game: ReturnType<typeof newArrowGame>, id: number): ReturnType<typeof newArrowGame> {
  let next = game;
  while (next.present[id]) {
    const tap = tapArrow(next, hintArrow(next)!);
    next = tap.game;
  }
  return next;
}

describe("locks", () => {
  const board = makeArrows({ shape: "square", w: 10, h: 10, longest: 4, seed: 5, locks: 3 });

  it("lock arrows that are free to begin with and in the way of others, exactly as many as asked", () => {
    expect(board.locked.filter(Boolean).length).toBe(3);
    const blockers = blockersOf(board);
    board.locked.forEach((locked, id) => {
      if (!locked) return;
      expect(blockers[id]!.length).toBe(0);
      expect(blockers.some((others) => others.includes(id))).toBe(true);
    });
  });

  it("a locked arrow does nothing when tapped, and costs nothing, until it is unlocked", () => {
    const game = newArrowGame(board);
    const id = board.locked.indexOf(true);
    expect(game.unlocked).toBe(false);
    const tap = tapArrow(game, id);
    expect(tap.result).toBe("locked");
    expect(tap.game).toBe(game);
    expect(isFree(game, id)).toBe(false);
    expect(tapArrow(unlockArrows(game), id).result).toBe("removed");
  });

  it("an arrow that nothing can free before the unlock waits for it: it does nothing, looks at a locked arrow, and costs no heart", () => {
    const stuck = clearArrows(newArrowGame(board));
    // What is left once every free arrow has gone: the locked ones, and everything behind them, directly or through others.
    const waiting = stuck.present.flatMap((here, id) => (here && !board.locked[id] ? [id] : []));
    expect(waiting.length).toBeGreaterThan(0);
    const start = newArrowGame(board);
    for (const id of waiting) expect(heldByLocks(start, id), `arrow ${id}`).toBe(true);
    let game = stuck;
    for (let n = 0; n < ARROW_HEARTS + 2; n += 1) {
      for (const id of waiting) {
        const tap = tapArrow(game, id);
        expect(tap.result).toBe("locked");
        expect(tap.by).toBeDefined();
        expect(tap.game).toBe(game);
        game = tap.game;
      }
    }
    expect(game.hearts).toBe(ARROW_HEARTS);
    expect(game.status).toBe("playing");
    // Once unlocked it is an arrow like any other.
    const unlocked = unlockArrows(game);
    expect(waiting.some((id) => heldByLocks(unlocked, id))).toBe(false);
    expect(clearArrows(unlocked).status).toBe("cleared");
  });

  it("a blocked arrow that the player could clear first is still a mistake that costs a heart, locks or not", () => {
    const start = newArrowGame(board);
    const stuck = clearArrows(start);
    const mistake = start.present.findIndex((_, id) => !board.locked[id] && !stuck.present[id] && blockedBy(start, id).length > 0);
    expect(mistake).toBeGreaterThanOrEqual(0);
    expect(heldByLocks(start, mistake)).toBe(false);
    const tap = tapArrow(start, mistake);
    expect(tap.result).toBe("blocked");
    expect(tap.game.hearts).toBe(ARROW_HEARTS - 1);
  });

  it("cannot be cleared without the unlock, and can with it", () => {
    const stuck = clearArrows(newArrowGame(board));
    expect(stuck.status).toBe("playing");
    expect(arrowsLeft(stuck)).toBeGreaterThan(0);
    expect(hintArrow(stuck)).toBeNull();
    expect(clearArrows(unlockArrows(stuck)).status).toBe("cleared");
  });

  it("a board with no lock starts unlocked", () => {
    expect(newArrowGame(makeArrows(recipes[0]!)).unlocked).toBe(true);
  });
});
