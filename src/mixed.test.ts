import { describe, expect, it } from "vitest";

import { ARROW_HEARTS, arrowsLeft, clearArrows, restartArrows, tapArrow, undoArrow } from "./arrowGame.ts";
import { dragMaze, liftMaze, pressMaze, restartMaze } from "./game.ts";
import { levelOf } from "./levels.ts";
import { solutionOf } from "./maze.ts";
import { buildMixed, measureMixed, mixedRecipeCode, mixedSolved, newMixedGame, parseMixedRecipe, withArrows, withMaze, type MixedGame, type MixedRecipe } from "./mixed.ts";

const recipe: MixedRecipe = { arrows: { shape: "square", w: 9, h: 9, longest: 4, seed: 5, locks: 2 }, maze: { shape: "square", w: 8, h: 8, algorithm: "kruskal", mode: "to-goal", seed: 3 } };

describe("a mixed puzzle", () => {
  it("is its two recipes in one code, read back, and refuses what is not one", () => {
    expect(mixedRecipeCode(recipe)).toBe("square:9x9:4:5:2|square:8x8:kruskal:to-goal:3");
    expect(parseMixedRecipe(mixedRecipeCode(recipe))).toEqual(recipe);
    for (const bad of ["", "square:9x9:4:5:2", "square:9x9:4:5|square:8x8:kruskal:to-goal:3", "square:9x9:4:5:2|square:8x8:kruskal:enter-leave:3", "a|b|c"]) expect(parseMixedRecipe(bad), bad).toBeNull();
  });

  it("locks arrows that matter, and a labyrinth whose button is its goal", () => {
    const board = buildMixed(recipe);
    expect(board.arrows.locked.filter(Boolean).length).toBe(2);
    expect(board.maze.recipe.mode).toBe("to-goal");
    expect(measureMixed(board)).toBeGreaterThan(20);
  });

  it("unlocks the arrows when the labyrinth's button is reached, and not before, and is won when every arrow is cleared", () => {
    const board = buildMixed(recipe);
    let game = newMixedGame(board);
    expect(game.arrows.unlocked).toBe(false);
    const locked = board.arrows.locked.indexOf(true);
    expect(tapArrow(game.arrows, locked).result).toBe("locked");
    // Part of the way along the labyrinth is not enough.
    let maze = pressMaze(game.maze, board.maze.start);
    const way = solutionOf(board.maze);
    for (const cell of way.slice(0, -1)) maze = dragMaze(maze, cell);
    game = withMaze(game, liftMaze(maze));
    expect(game.arrows.unlocked).toBe(false);
    maze = pressMaze(game.maze, way[way.length - 2]!);
    game = withMaze(game, liftMaze(dragMaze(maze, way[way.length - 1]!)));
    expect(game.maze.solved).toBe(true);
    expect(game.arrows.unlocked).toBe(true);
    expect(mixedSolved(game)).toBe(false);
    game = withArrows(game, clearArrows(game.arrows));
    expect(mixedSolved(game)).toBe(true);
  });
});

/** The labyrinth drawn along its one way and let go: the button reached. */
function reachButton(game: MixedGame): MixedGame {
  const way = solutionOf(game.maze.maze);
  let maze = pressMaze(game.maze, way[0]!);
  for (const cell of way.slice(1)) maze = dragMaze(maze, cell);
  return withMaze(game, liftMaze(maze));
}

/** Every arrow that can be tapped now, tapped, until none can be. */
const clearNow = (game: MixedGame): MixedGame => withArrows(game, clearArrows(game.arrows));

describe("a mixed puzzle in every order", () => {
  // The whole list: whichever way round a person plays it, it is won once every arrow is off, and the way to play never decides that.
  for (const number of [1, 2, 11, 26, 27, 37, 60, 100]) {
    const board = buildMixed(levelOf("mixed", number)!.recipe as MixedRecipe);

    it(`level ${number}: the arrows first, then the labyrinth, then the rest of the arrows`, () => {
      let game = clearNow(newMixedGame(board));
      expect(game.arrows.status).toBe("playing");
      expect(arrowsLeft(game.arrows)).toBeGreaterThan(0);
      game = reachButton(game);
      expect(game.arrows.unlocked).toBe(true);
      expect(game.arrows.hearts).toBe(ARROW_HEARTS);
      expect(mixedSolved(game)).toBe(false);
      game = clearNow(game);
      expect(mixedSolved(game)).toBe(true);
      expect(game.arrows.hearts).toBe(ARROW_HEARTS);
    });

    it(`level ${number}: the labyrinth first, then every arrow`, () => {
      const game = clearNow(reachButton(newMixedGame(board)));
      expect(mixedSolved(game)).toBe(true);
      expect(arrowsLeft(game.arrows)).toBe(0);
    });

    it(`level ${number}: the labyrinth restarted after the unlock does not lock the arrows again`, () => {
      let game = reachButton(newMixedGame(board));
      game = withMaze(game, restartMaze(game.maze));
      expect(game.maze.solved).toBe(false);
      expect(game.arrows.unlocked).toBe(true);
      expect(mixedSolved(clearNow(game))).toBe(true);
    });
  }

  it("a restart of the arrows after the unlock keeps them unlocked, and the puzzle can still be won", () => {
    const board = buildMixed(recipe);
    let game = reachButton(newMixedGame(board));
    game = clearNow(game);
    game = withArrows(game, undoArrow(game.arrows));
    expect(game.arrows.status).toBe("playing");
    game = withArrows(game, restartArrows(game.arrows));
    expect(game.arrows.unlocked).toBe(true);
    expect(arrowsLeft(game.arrows)).toBe(board.arrows.arrows.length);
    expect(mixedSolved(clearNow(game))).toBe(true);
  });

  it("an arrow held up only by a locked one costs no heart before the unlock, so the puzzle cannot be lost on the way to the button", () => {
    const board = buildMixed(recipe);
    let game = clearNow(newMixedGame(board));
    const stuck = game.arrows.present.flatMap((here, id) => (here && !board.arrows.locked[id] ? [id] : []));
    expect(stuck.length).toBeGreaterThan(0);
    for (let n = 0; n < 2 * ARROW_HEARTS; n += 1) for (const id of stuck) game = withArrows(game, tapArrow(game.arrows, id).game);
    expect(game.arrows.hearts).toBe(ARROW_HEARTS);
    expect(game.arrows.status).toBe("playing");
    expect(mixedSolved(clearNow(reachButton(game)))).toBe(true);
  });

  it("a puzzle lost on a real mistake stays lost when the button is reached, and a restart keeps the unlock and wins", () => {
    const board = buildMixed(recipe);
    let game = newMixedGame(board);
    const blocked = board.arrows.arrows.findIndex((_, id) => !board.arrows.locked[id] && tapArrow(game.arrows, id).result === "blocked");
    expect(blocked).toBeGreaterThanOrEqual(0);
    for (let n = 0; n < ARROW_HEARTS; n += 1) game = withArrows(game, tapArrow(game.arrows, blocked).game);
    expect(game.arrows.status).toBe("lost");
    game = reachButton(game);
    expect(game.arrows.unlocked).toBe(true);
    expect(game.arrows.status).toBe("lost");
    expect(tapArrow(game.arrows, blocked).result).toBe("ignored");
    game = withArrows(game, restartArrows(game.arrows));
    expect(game.arrows.status).toBe("playing");
    expect(game.arrows.unlocked).toBe(true);
    expect(mixedSolved(clearNow(game))).toBe(true);
  });
});
