import { describe, expect, it } from "vitest";

import { dragMaze, hintMaze, liftMaze, newMazeGame, playSolution, pressMaze, restartMaze, undoMaze } from "../game.ts";
import { isPerfect, walk } from "../maze.ts";
import { measureMaze } from "../measure.ts";
import { decodeRun, encodeRun, layStone, stoneRulesOf } from "../stones.ts";
import { lineToSteps, stepsToLine } from "../steps.ts";
import { SOLID_KINDS, solidCells, type SolidKind } from "./solidGrid.ts";
import { buildSolidMaze, checkSolidAnswer, parseSolidRecipe, SOLID_ALGORITHMS, solidAnswerSteps, solidDifficultyOf, solidRecipeCode, solidSolutionOf, type SolidRecipe } from "./solidMaze.ts";

const SIZE: Record<SolidKind, number> = { cube: 5, sphere: 4, tetrahedron: 5, octahedron: 4, icosahedron: 3, prism: 4, trapezohedron: 4, dodecahedron: 2, "rhombic-dodecahedron": 4, bipyramid: 3, icositetrahedron: 3, triacontahedron: 3, box: 4, cross: 3, ring: 3, torus: 7, star: 3, heart: 4 };

describe("a maze over a solid", () => {
  for (const kind of SOLID_KINDS) {
    for (const algorithm of SOLID_ALGORITHMS) {
      it(`${kind} by ${algorithm} is a perfect maze: a spanning tree of the cells, one way between any two`, () => {
        for (const seed of [1, 2, 3]) {
          const maze = buildSolidMaze({ kind, n: SIZE[kind], algorithm, seed });
          expect(maze.links).toHaveLength(solidCells(kind, SIZE[kind]));
          expect(isPerfect(maze.grid, maze.links)).toBe(true);
          // The passages run only between cells that are beside each other, in both directions.
          maze.links.forEach((open, cell) => open.forEach((next) => expect(maze.grid.neighbours[cell]).toContain(next)));
        }
      });
    }

    it(`${kind}: the goal is far from the start, usually across the solid, and the way between winds`, () => {
      let across = 0;
      for (let seed = 1; seed <= 30; seed += 1) {
        const maze = buildSolidMaze({ kind, n: SIZE[kind], algorithm: "backtracker", seed });
        expect(maze.goal).not.toBe(maze.start);
        const over = walk(maze.grid.neighbours as number[][], maze.start).dist;
        const most = Math.max(...over);
        // Over the surface the goal is among the farthest third of the cells, so in the top of the range of distances.
        const farther = [...over].filter((d) => d > over[maze.goal]!).length;
        expect(farther).toBeLessThanOrEqual(Math.ceil(maze.grid.cells * 0.3));
        if (over[maze.goal]! >= most * 0.6) across += 1;
        expect(maze.keys).toEqual([]);
      }
      expect(across).toBeGreaterThanOrEqual(20);
    });
  }

  it("the same recipe makes the same maze, and the recipe as text comes back as itself", () => {
    const recipe: SolidRecipe = { kind: "cube", n: 6, algorithm: "prim", seed: 48213 };
    const a = buildSolidMaze(recipe);
    const b = buildSolidMaze(parseSolidRecipe(solidRecipeCode(recipe))!);
    expect(solidRecipeCode(recipe)).toBe("cube:6:prim:48213");
    expect(b.links).toEqual(a.links);
    expect([b.start, b.goal]).toEqual([a.start, a.goal]);
    // Pinned: a change to the graph's numbering or the stream would change every level.
    expect(a.links[0]).toEqual(buildSolidMaze(recipe).links[0]);
    expect([a.start, a.goal, a.links[0]!.length, solidSolutionOf(a).length]).toEqual(PINNED);
  });

  it("refuses text that is not a recipe, a solid with fewer than two cuts, an algorithm that needs rows, and a solid too big to make", () => {
    for (const bad of ["", "cube", "cube:6:prim", "cube:6:prim:1:2", "ball:6:prim:1", "cube:1:prim:1", "cube:6:eller:1", "cube:6:nope:1", "cube:x:prim:1", "cube:6:prim:-1", "cube:6:prim:99999999999", "cube:60:prim:1", "icosahedron:100:prim:1"]) expect(parseSolidRecipe(bad), bad).toBeNull();
    expect(parseSolidRecipe("sphere:8:wilson:7")).toEqual({ kind: "sphere", n: 8, algorithm: "wilson", seed: 7 });
    expect(parseSolidRecipe("cube:31:prim:1")).not.toBeNull();
  });

  it("is solved by drawing its way, however many edges and faces that crosses", () => {
    for (const kind of SOLID_KINDS) {
      const maze = buildSolidMaze({ kind, n: SIZE[kind], algorithm: "growing", seed: 9 });
      const game = playSolution(newMazeGame(maze));
      expect(game.solved, kind).toBe(true);
      expect(game.path).toEqual(solidSolutionOf(maze));
    }
  });

  it("crosses from one face to another: a cube's way from start to goal visits more than one face", () => {
    const maze = buildSolidMaze({ kind: "cube", n: 5, algorithm: "backtracker", seed: 4 });
    const faces = new Set(solidSolutionOf(maze).map((cell) => maze.grid.faceOf[cell]));
    expect(faces.size).toBeGreaterThan(1);
  });

  it("the answer is a list of cells that is checked in time of the line's length, and refuses every wrong one", () => {
    const maze = buildSolidMaze({ kind: "octahedron", n: 4, algorithm: "hunt", seed: 5 });
    const way = solidSolutionOf(maze);
    expect(checkSolidAnswer(maze, way)).toBe(true);
    expect(checkSolidAnswer(maze, way.slice(0, -1))).toBe(false);
    expect(checkSolidAnswer(maze, way.slice(1))).toBe(false);
    expect(checkSolidAnswer(maze, [])).toBe(false);
    expect(checkSolidAnswer(maze, [...way, way[0]!])).toBe(false);
    expect(checkSolidAnswer(maze, [way[0]!, ...way.slice(2)])).toBe(false);
    expect(checkSolidAnswer(maze, [...way.slice(0, 3), way[1]!, ...way.slice(3)])).toBe(false);
    expect(checkSolidAnswer(maze, way.map((cell, at) => (at === 2 ? maze.grid.cells + 3 : cell)))).toBe(false);
    expect(checkSolidAnswer(maze, way.map((cell, at) => (at === 2 ? 1.5 : cell)))).toBe(false);
    // A line through a wall (to a cell beside this one with no passage) is refused.
    const wall = maze.grid.neighbours[way[1]!]!.find((next) => !maze.links[way[1]!]!.includes(next))!;
    expect(checkSolidAnswer(maze, [way[0]!, way[1]!, wall])).toBe(false);
  });

  it("a kept run is the same text however the solid is turned: steps are positions among neighbours, and read back to the same cells", () => {
    for (const kind of SOLID_KINDS) {
      const maze = buildSolidMaze({ kind, n: SIZE[kind], algorithm: "kruskal", seed: 12 });
      const way = solidSolutionOf(maze);
      const steps = lineToSteps(maze, way)!;
      expect(steps).toBe(solidAnswerSteps(maze));
      expect(stepsToLine(maze, steps)).toEqual(way);
      expect(stepsToLine(maze, `${steps}0`)?.length ?? 0).not.toBe(way.length + 1 + 100);
      const game = playSolution(newMazeGame(maze, stoneRulesOf(true, maze.grid.cells)));
      const back = decodeRun(maze, encodeRun(game), game.rules);
      expect(back?.path).toEqual(game.path);
      expect(back?.solved).toBe(true);
    }
  });

  it("is played by the rules every maze is: drawing back shortens the line, Undo and Restart work, and a hint points the way", () => {
    const maze = buildSolidMaze({ kind: "icosahedron", n: 3, algorithm: "wilson", seed: 8 });
    const way = solidSolutionOf(maze);
    let game = pressMaze(newMazeGame(maze), maze.start);
    for (const cell of way.slice(1, 6)) game = dragMaze(game, cell);
    expect(game.path).toEqual(way.slice(0, 6));
    game = dragMaze(game, way[2]!);
    expect(game.path).toEqual(way.slice(0, 3));
    game = liftMaze(game);
    expect(hintMaze(game, 4).cells).toEqual(way.slice(3, 7));
    expect(undoMaze(game).path).toEqual([]);
    expect(restartMaze(game).path).toEqual([]);
  });

  it("stones go beside the line, never on it, the start or the goal, and shut a passage", () => {
    const maze = buildSolidMaze({ kind: "sphere", n: 4, algorithm: "prim", seed: 3 });
    const way = solidSolutionOf(maze);
    let game = pressMaze(newMazeGame(maze, stoneRulesOf({ limit: 3, reach: 2 }, maze.grid.cells)), maze.start);
    for (const cell of way.slice(1, 4)) game = dragMaze(game, cell);
    game = liftMaze(game);
    const side = maze.links[way[2]!]!.find((next) => !way.includes(next));
    if (side !== undefined) {
      const laid = layStone(game, side);
      expect(laid.stones).toEqual([side]);
      expect(dragMaze(pressMaze(laid, way[3]!), side).path).not.toContain(side);
    }
    expect(layStone(game, way[1]!).stones).toEqual([]);
    expect(layStone(game, maze.goal).stones).toEqual([]);
  });

  it("is measured by the very measure flat mazes are: scores on one scale, none of them a corridor", () => {
    for (const kind of SOLID_KINDS) {
      const maze = buildSolidMaze({ kind, n: SIZE[kind], algorithm: "backtracker", seed: 21 });
      const d = solidDifficultyOf(maze);
      expect(d.score).toBeGreaterThan(5);
      expect(d.score).toBeLessThanOrEqual(100);
      expect(d.measure).toEqual(measureMaze(maze));
      expect(d.measure.solution).toBe(solidSolutionOf(maze).length);
    }
  });

  it("a bigger solid is harder: more cells, a longer way, a higher score, on average", () => {
    const mean = (n: number): number => {
      let sum = 0;
      for (let seed = 1; seed <= 12; seed += 1) sum += solidDifficultyOf(buildSolidMaze({ kind: "cube", n, algorithm: SOLID_ALGORITHMS[seed % SOLID_ALGORITHMS.length]!, seed })).exact;
      return sum / 12;
    };
    expect(mean(4)).toBeLessThan(mean(7));
    expect(mean(7)).toBeLessThan(mean(10));
  });
});

const PINNED: number[] = [108, 167, 3, 30];
