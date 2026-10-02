import { describe, expect, it } from "vitest";

import { difficultyOf, DIFFICULTY_WEIGHTS, isTooEasy, MEIKYUU_LEAST } from "./difficulty.ts";
import { MEIKYUU_SHAPES } from "./grid.ts";
import { buildMaze, type Maze } from "./maze.ts";
import { ratingOf } from "./measure.ts";
import { MEIKYUU_MAZE_LEVELS } from "./levels.ts";
import { squareGrid } from "./shapes.ts";

/** A maze made by hand from the passages of a square grid, to count what is known. */
function handMade(w: number, h: number, passages: readonly (readonly [number, number])[], start: number, goal: number): Maze {
  const grid = squareGrid(w, h);
  const links: number[][] = Array.from({ length: grid.cells }, () => []);
  for (const [a, b] of passages) {
    links[a]!.push(b);
    links[b]!.push(a);
  }
  return { recipe: { shape: "square", w, h, algorithm: "wilson", mode: "to-goal", seed: 0 }, grid, links, start, goal, entrance: null, exit: null, keys: [] };
}

describe("the difficulty score", () => {
  it("weighs its terms to a whole of one", () => {
    const total = Object.values(DIFFICULTY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("gives a straight corridor nothing to be wrong about: no forks, no traps, a straight guess, and a score near nought", () => {
    const corridor = handMade(6, 1, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]], 0, 5);
    const d = difficultyOf(corridor);
    expect(d.measure.decisions).toBe(0);
    expect(d.traps).toBe(0);
    expect(d.waste).toBe(0);
    expect(d.turns).toBe(0);
    expect(d.straight).toBe(true);
    expect(d.score).toBeLessThan(10);
    expect(isTooEasy(d)).toBe(true);
  });

  it("counts a fork where the passage nearest the goal is a dead end as a trap, and what the straight guess draws in it", () => {
    // Row 0 is the way, left to right (0 to 4); a branch at cell 2 goes down two cells (7, 12). The goal is at the end of row 0, so the
    // branch is farther from it than the way on, and the guess takes the way.
    const honest = handMade(5, 3, [[0, 1], [1, 2], [2, 3], [3, 4], [2, 7], [7, 12]], 0, 4);
    expect(difficultyOf(honest).traps).toBe(0);
    expect(difficultyOf(honest).straight).toBe(true);
    // Put the goal at the foot of column 3 (cell 13): from cell 2 the guess goes down toward it, into a dead end at 12, while the way goes on to 3, 8 and 13.
    const lying = handMade(5, 3, [[0, 1], [1, 2], [2, 3], [3, 8], [8, 13], [2, 7], [7, 12]], 0, 13);
    const d = difficultyOf(lying);
    expect(d.traps).toBe(1);
    expect(d.waste).toBe(2);
    expect(d.straight).toBe(false);
  });

  it("counts a bend on the way, not a straight run of it", () => {
    // Right, right, down, down: one turn.
    const bent = handMade(3, 3, [[0, 1], [1, 2], [2, 5], [5, 8]], 0, 8);
    expect(difficultyOf(bent).turns).toBe(1);
  });

  it("is a whole number from 0 to 100, with an exact value beside it, for every shape", () => {
    for (const shape of MEIKYUU_SHAPES) {
      const size = ["square", "hex", "triangle"].includes(shape) ? { w: 8, h: 6 } : { w: shape === "circle" ? 4 : shape === "hexagon" ? 3 : shape === "pyramid" ? 6 : 14, h: shape === "circle" ? 4 : shape === "hexagon" ? 3 : shape === "pyramid" ? 6 : 14 };
      const d = difficultyOf(buildMaze({ shape, ...size, algorithm: "wilson", mode: "to-goal", seed: 11 }));
      expect(Number.isInteger(d.score), shape).toBe(true);
      expect(d.score, shape).toBeGreaterThanOrEqual(0);
      expect(d.score, shape).toBeLessThanOrEqual(100);
      expect(Math.round(d.exact), shape).toBe(d.score);
      for (const term of Object.values(d.terms)) expect(term >= 0 && term <= 1).toBe(true);
    }
  });

  it("is the same for the same maze every time, and goes up with size and with the twists a maze has", () => {
    const small = buildMaze({ shape: "square", w: 6, h: 6, algorithm: "backtracker", mode: "enter-leave", seed: 4 });
    const big = buildMaze({ shape: "square", w: 30, h: 30, algorithm: "backtracker", mode: "enter-leave", seed: 4 });
    expect(difficultyOf(small)).toEqual(difficultyOf(small));
    expect(difficultyOf(big).score).toBeGreaterThan(difficultyOf(small).score + 15);
    // A maze of one size: Prim's many short dead ends cost the straight guess more than the backtracker's few long winding ones.
    const prim = buildMaze({ shape: "square", w: 20, h: 20, algorithm: "prim", mode: "to-goal", seed: 9 });
    const winding = buildMaze({ shape: "square", w: 20, h: 20, algorithm: "backtracker", mode: "to-goal", seed: 9 });
    expect(difficultyOf(prim).measure.deadEnds).toBeGreaterThan(difficultyOf(winding).measure.deadEnds);
  });

  it("agrees with the rating of the effort about which mazes are bigger, to within what the twists add", () => {
    // Over a spread of the levels, the score and the rating go the same way: a rank correlation of the two is strongly positive.
    const levels = MEIKYUU_MAZE_LEVELS.filter((_, i) => i % 16 === 0);
    const scores = levels.map((l) => l.score);
    const ratings = levels.map((l) => ratingOf(l.effort));
    const rank = (values: number[]): number[] => values.map((v) => values.filter((w) => w < v).length);
    const a = rank(scores);
    const b = rank(ratings);
    const mean = (x: number[]): number => x.reduce((p, q) => p + q, 0) / x.length;
    const ma = mean(a);
    const mb = mean(b);
    const r = a.reduce((sum, v, i) => sum + (v - ma) * (b[i]! - mb), 0) / Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0) * b.reduce((s, v) => s + (v - mb) ** 2, 0));
    expect(r).toBeGreaterThan(0.9);
  });

  it("states the least a level must have", () => {
    expect(MEIKYUU_LEAST).toEqual({ waste: 4, traps: 2, decisions: 3, branches: 3, deadEnds: 4 });
  });
});
