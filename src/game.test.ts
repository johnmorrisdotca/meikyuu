import { describe, expect, it } from "vitest";

import { dragMaze, headOf, hintMaze, liftMaze, newMazeGame, playSolution, pressMaze, restartMaze, tapMaze, undoMaze, type MazeGame } from "./game.ts";
import { buildMaze, solutionOf, walk, type MazeRecipe } from "./maze.ts";

const recipe: MazeRecipe = { shape: "square", w: 8, h: 8, algorithm: "wilson", mode: "to-goal", seed: 12 };
const maze = buildMaze(recipe);
const way = solutionOf(maze);

/** A game with the line drawn along the way as far as `count` cells, as one stroke. */
function along(count: number, game: MazeGame = newMazeGame(maze)): MazeGame {
  let next = pressMaze(game, way[0]!);
  for (const cell of way.slice(1, count)) next = dragMaze(next, cell);
  return liftMaze(next);
}

/** A cell next to the line's end that is behind a wall. */
const walled = (cell: number): number => maze.grid.neighbours[cell]!.find((next) => !maze.links[cell]!.includes(next))!;

describe("drawing a line", () => {
  it("begins only on the start, and does nothing for a press anywhere else", () => {
    const game = newMazeGame(maze);
    expect(pressMaze(game, way[3]!)).toBe(game);
    const begun = liftMaze(pressMaze(game, maze.start));
    expect(begun.path).toEqual([maze.start]);
  });

  it("follows the passages cell by cell and cannot pass through a wall", () => {
    const game = along(4);
    expect(game.path).toEqual(way.slice(0, 4));
    let next = pressMaze(game, way[3]!);
    const blocked = walled(way[3]!);
    expect(blocked).toBeDefined();
    expect(dragMaze(next, blocked)).toBe(next);
    // And a cell two away is no step either: the page calls for each cell between.
    const far = maze.grid.neighbours[way[3]!]!.flatMap((cell) => maze.grid.neighbours[cell]!).find((cell) => !game.path.includes(cell) && !maze.grid.neighbours[way[3]!]!.includes(cell))!;
    expect(dragMaze(next, far)).toBe(next);
    next = liftMaze(next);
    expect(next.path).toEqual(game.path);
  });

  it("drawing back shortens the line, and a cell already on the line cuts it back to there", () => {
    const game = along(6);
    let next = pressMaze(game, way[5]!);
    next = dragMaze(next, way[4]!);
    expect(next.path).toEqual(way.slice(0, 5));
    next = dragMaze(next, way[1]!);
    expect(next.path).toEqual(way.slice(0, 2));
    next = dragMaze(next, way[2]!);
    expect(next.path).toEqual(way.slice(0, 3));
  });

  it("continues from the line's end, and from any cell of it (cutting the line there)", () => {
    const game = along(5);
    const again = liftMaze(dragMaze(pressMaze(game, way[4]!), way[5]!));
    expect(again.path).toEqual(way.slice(0, 6));
    const cut = pressMaze(game, way[2]!);
    expect(cut.path).toEqual(way.slice(0, 3));
  });

  it("is solved on reaching the goal, and then the line is fixed", () => {
    const solved = along(way.length);
    expect(solved.solved).toBe(true);
    expect(headOf(solved)).toBe(maze.goal);
    expect(pressMaze(solved, way[2]!)).toBe(solved);
    expect(undoMaze(solved).solved).toBe(false);
  });

  it("a stroke that changed nothing is not a move to undo", () => {
    const game = along(3);
    const same = liftMaze(pressMaze(game, way[2]!));
    expect(same.undo.length).toBe(game.undo.length);
    expect(same.strokes).toBe(game.strokes);
  });
});

describe("undo, restart and tap", () => {
  it("undo takes back the last stroke only, and restart takes back everything", () => {
    let game = along(4);
    game = liftMaze(dragMaze(pressMaze(game, way[3]!), way[4]!));
    expect(game.path.length).toBe(5);
    game = undoMaze(game);
    expect(game.path).toEqual(way.slice(0, 4));
    game = undoMaze(game);
    expect(game.path).toEqual([]);
    expect(undoMaze(game)).toBe(game);
    expect(restartMaze(along(5)).path).toEqual([]);
    expect(restartMaze(newMazeGame(maze)).path).toEqual([]);
  });

  it("a tap runs the line along a corridor to the tapped cell or the next fork, and never decides a fork", () => {
    let game = tapMaze(newMazeGame(maze), maze.start);
    expect(game.path).toEqual([maze.start]);
    for (let n = 0; n < 200 && !game.solved; n += 1) {
      // Tap the goal: the line goes as far as the next fork on the way and no further.
      const before = game.path.length;
      game = tapMaze(game, maze.goal);
      expect(game.path.length).toBeGreaterThan(before);
      expect(game.path).toEqual(way.slice(0, game.path.length));
      const end = headOf(game)!;
      if (!game.solved) expect(maze.links[end]!.length).toBeGreaterThan(2);
    }
    expect(game.solved).toBe(true);
  });

  it("a tap on the line cuts it back to that cell", () => {
    const game = tapMaze(along(8), way[3]!);
    expect(game.path).toEqual(way.slice(0, 4));
  });
});

describe("keys", () => {
  const withKeys = buildMaze({ shape: "square", w: 12, h: 12, algorithm: "kruskal", mode: "keys", keys: 2, seed: 3 });

  it("must all be picked up before the goal counts, and stay picked up when the line is drawn back", () => {
    const direct = solutionOf(withKeys);
    let game = pressMaze(newMazeGame(withKeys), withKeys.start);
    for (const cell of direct) game = dragMaze(game, cell);
    expect(headOf(game)).toBe(withKeys.goal);
    expect(game.solved).toBe(false);
    game = liftMaze(game);
    expect(game.collected).toEqual([]);
    // Fetch the first key and come back out, and it stays collected.
    const { before } = walk(withKeys.links, withKeys.start);
    const toKey = (key: number): number[] => {
      const out: number[] = [];
      for (let cell = key; cell !== -1; cell = before[cell]!) out.push(cell);
      return out.reverse();
    };
    let again = pressMaze(newMazeGame(withKeys), withKeys.start);
    const [first] = withKeys.keys;
    for (const cell of [...toKey(first!), ...toKey(first!).reverse()]) again = dragMaze(again, cell);
    expect(again.collected).toEqual([first]);
    expect(again.path).toEqual([withKeys.start]);
  });

  it("playSolution collects every key and solves", () => {
    expect(playSolution(newMazeGame(withKeys)).solved).toBe(true);
    expect(playSolution(newMazeGame(maze)).solved).toBe(true);
  });
});

describe("the hint", () => {
  it("starts at the start, then lights the next stretch of the right way", () => {
    expect(hintMaze(newMazeGame(maze)).cells).toEqual([maze.start]);
    const hint = hintMaze(along(3), 5);
    expect(hint.back).toBe(0);
    expect(hint.cells).toEqual(way.slice(3, 8));
  });

  it("says how far to draw back when the line has gone into a wrong branch, and lights the way from there", () => {
    const game = along(Math.floor(way.length / 2));
    const fork = way.slice(0, game.path.length).findIndex((cell, i) => i > 0 && maze.links[cell]!.length > 2 && maze.links[cell]!.some((next) => !way.includes(next)));
    expect(fork).toBeGreaterThan(0);
    const wrong = maze.links[way[fork]!]!.find((next) => !way.includes(next))!;
    let strayed = liftMaze(dragMaze(pressMaze(along(fork + 1), way[fork]!), wrong));
    expect(strayed.path.length).toBe(fork + 2);
    const hint = hintMaze(strayed, 4);
    expect(hint.back).toBe(1);
    expect(hint.cells).toEqual(way.slice(fork + 1, fork + 5));
    strayed = along(way.length);
    expect(hintMaze(strayed)).toEqual({ back: 0, cells: [] });
  });

  it("leads to a key not yet picked up before the goal", () => {
    const withKeys = buildMaze({ shape: "square", w: 12, h: 12, algorithm: "kruskal", mode: "keys", keys: 2, seed: 3 });
    const game = liftMaze(pressMaze(newMazeGame(withKeys), withKeys.start));
    let cell = withKeys.start;
    const seen = new Set<number>([cell]);
    let at = game;
    // Follow the hint until a key is reached: the hint never leads to the goal first.
    for (let n = 0; n < 500 && at.collected.length === 0; n += 1) {
      const hint = hintMaze(at, 1);
      if (hint.cells.length === 0) break;
      at = liftMaze(dragMaze(pressMaze(at, at.path[at.path.length - 1]!), hint.cells[0]!));
      cell = hint.cells[0]!;
      seen.add(cell);
    }
    expect(at.collected.length).toBe(1);
    expect(at.solved).toBe(false);
  });
});
