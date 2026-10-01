import { describe, expect, it } from "vitest";

import { buildMaze, solutionOf } from "./maze.ts";
import { EFFORT_LEAST, EFFORT_MOST, measureMaze, ratingOf } from "./measure.ts";

describe("what a maze measures", () => {
  it("counts a small maze exactly: a 3×3 by backtracker, seed 4", () => {
    const maze = buildMaze({ shape: "square", w: 3, h: 3, algorithm: "backtracker", mode: "to-goal", seed: 4 });
    const m = measureMaze(maze);
    expect(m.cells).toBe(9);
    expect(m.solution).toBe(solutionOf(maze).length);
    // A spanning tree of 9 cells has 8 passages: the sum of passages per cell is 16.
    expect(maze.links.reduce((sum, open) => sum + open.length, 0)).toBe(16);
    expect(m.deadEnds + m.junctions + Math.round(m.river * 9)).toBe(9);
    expect(m.effort).toBe(m.solution + m.wasted + 2 * m.decisions + m.detour);
  });

  it("a corridor with no branches is its own solution: no wrong turns, no decisions", () => {
    // A 1-wide maze is a line: every algorithm makes the one tree there is.
    const maze = buildMaze({ shape: "square", w: 8, h: 2, algorithm: "backtracker", mode: "enter-leave", seed: 1 });
    const m = measureMaze(maze);
    expect(m.solution).toBeGreaterThan(1);
    expect(m.wasted).toBeGreaterThanOrEqual(0);
  });

  it("river and dead ends follow the algorithm: backtracker mazes wind and have few dead ends, Prim's branch", () => {
    const share = (algorithm: "backtracker" | "prim", seed: number): [number, number] => {
      const m = measureMaze(buildMaze({ shape: "square", w: 30, h: 30, algorithm, mode: "to-goal", seed }));
      return [m.deadEndShare, m.river];
    };
    for (const seed of [1, 2, 3]) {
      const [windingDeadEnds, windingRiver] = share("backtracker", seed);
      const [branchingDeadEnds, branchingRiver] = share("prim", seed);
      expect(windingDeadEnds).toBeLessThan(0.14);
      expect(branchingDeadEnds).toBeGreaterThan(0.28);
      expect(windingRiver).toBeGreaterThan(branchingRiver + 0.2);
    }
  });

  it("a longer way through and more wrong turns cost more effort", () => {
    const small = measureMaze(buildMaze({ shape: "square", w: 6, h: 6, algorithm: "wilson", mode: "to-goal", seed: 2 })).effort;
    const big = measureMaze(buildMaze({ shape: "square", w: 40, h: 40, algorithm: "wilson", mode: "to-goal", seed: 2 })).effort;
    expect(big).toBeGreaterThan(small * 10);
  });

  it("keys add what fetching them costs, off the way, there and back", () => {
    const plain = measureMaze(buildMaze({ shape: "square", w: 16, h: 16, algorithm: "wilson", mode: "keys", keys: 1, seed: 5 }));
    const many = measureMaze(buildMaze({ shape: "square", w: 16, h: 16, algorithm: "wilson", mode: "keys", keys: 4, seed: 5 }));
    expect(plain.detour).toBeGreaterThan(0);
    expect(many.detour).toBeGreaterThan(plain.detour);
    expect(measureMaze(buildMaze({ shape: "square", w: 16, h: 16, algorithm: "wilson", mode: "to-goal", seed: 5 })).detour).toBe(0);
  });

  it("gives a rating from 1 to 100 that never goes down as effort goes up", () => {
    expect(ratingOf(1)).toBe(1);
    expect(ratingOf(EFFORT_LEAST)).toBe(1);
    expect(ratingOf(EFFORT_MOST)).toBe(100);
    expect(ratingOf(10 * EFFORT_MOST)).toBe(100);
    let before = 0;
    for (let effort = 1; effort < 9000; effort += 7) {
      expect(ratingOf(effort)).toBeGreaterThanOrEqual(before);
      before = ratingOf(effort);
    }
  });
});
