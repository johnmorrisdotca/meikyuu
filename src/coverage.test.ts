import { describe, expect, it } from "vitest";

import { COVERAGE_FLOOR, coverageOf, zonesAcross } from "./coverage.ts";
import { difficultyOf } from "./difficulty.ts";
import { buildMaze, parseRecipe, type Maze } from "./maze.ts";
import { squareGrid } from "./shapes.ts";

/** A maze made by hand from the passages of a square grid. */
function handMade(w: number, h: number, passages: readonly (readonly [number, number])[], start: number, goal: number): Maze {
  const grid = squareGrid(w, h);
  const links: number[][] = Array.from({ length: grid.cells }, () => []);
  for (const [a, b] of passages) {
    links[a]!.push(b);
    links[b]!.push(a);
  }
  return { recipe: { shape: "square", w, h, algorithm: "wilson", mode: "to-goal", seed: 0 }, grid, links, start, goal, entrance: null, exit: null, keys: [] };
}

const points = (w: number, h: number): [number, number][] => Array.from({ length: w * h }, (_, i) => [i % w, Math.floor(i / w)]);

describe("how much of the map an answer covers", () => {
  it("cuts a map into 2 by 2 zones under 150 cells, 3 by 3 under 800 and 4 by 4 above, and a solid into 2 by 2 by 2 under 200 and 3 by 3 by 3 above", () => {
    expect([zonesAcross(149, 2), zonesAcross(150, 2), zonesAcross(799, 2), zonesAcross(800, 2)]).toEqual([2, 3, 3, 4]);
    expect([zonesAcross(199, 3), zonesAcross(200, 3)]).toEqual([2, 3]);
  });

  it("is whole for an answer that crosses the whole map, and nothing but the floor's half for one that stays in a corner", () => {
    const map = points(30, 30);
    const whole = coverageOf(map, map.map((_, i) => i));
    expect(whole.bbox).toBe(1);
    expect(whole.zones).toBe(1);
    expect(whole.cover).toBe(1);
    expect(whole.factor).toBe(1);
    const corner = coverageOf(map, [0, 1, 2, 30, 31, 32]);
    expect(corner.zones).toBeCloseTo(64 / 900, 10);
    expect(corner.bbox).toBeLessThan(0.2);
    expect(corner.cover).toBe(0);
    expect(corner.factor).toBe(COVERAGE_FLOOR);
  });

  it("counts a zone visited only for two cells or more, and leaves out a zone that is mostly nothing", () => {
    // 4 by 4 zones over 30 by 30 cells: one cell in a zone is a touch, two are a visit.
    const map = points(30, 30);
    expect(coverageOf(map, [0, 15 * 30 + 15]).zones).toBe(0);
    expect(coverageOf(map, [0, 1]).zones).toBeCloseTo(64 / 900, 10);
    // A plus sign of 20 by 20 with its four corners empty: those corners are no zones, so a walk through the arms is the whole of it.
    const plus = points(20, 20).filter(([x, y]) => (x! >= 8 && x! < 12) || (y! >= 8 && y! < 12));
    const arms = plus.map((_, i) => i);
    expect(coverageOf(plus, arms).zones).toBe(1);
  });

  it("takes a solid's zones over three quarters, so a whole tour of a shell reads whole", () => {
    const shell: number[][] = [];
    for (let x = 0; x < 8; x += 1) for (let y = 0; y < 8; y += 1) for (let z = 0; z < 8; z += 1) if (x === 0 || x === 7 || y === 0 || y === 7 || z === 0 || z === 7) shell.push([x, y, z]);
    const whole = coverageOf(shell, shell.map((_, i) => i));
    expect(whole.zones).toBe(1);
    expect(whole.bbox).toBe(1);
    const tenth = coverageOf(shell, shell.slice(0, 30).map((_, i) => i));
    expect(tenth.zones).toBeLessThan(0.5);
  });

  it("is in step with the score: a maze whose answer stays in a corner loses what one that crosses the map keeps, and no score is raised", () => {
    // A 12 by 12 maze of long snakes: the answer runs from the top left to the bottom right through the whole of it.
    const snake: [number, number][] = [];
    for (let row = 0; row < 12; row += 1) {
      for (let col = 0; col < 11; col += 1) snake.push([row * 12 + (row % 2 === 0 ? col : 11 - col), row * 12 + (row % 2 === 0 ? col + 1 : 10 - col)]);
      if (row < 11) snake.push([row * 12 + (row % 2 === 0 ? 11 : 0), (row + 1) * 12 + (row % 2 === 0 ? 11 : 0)]);
    }
    const whole = difficultyOf(handMade(12, 12, snake, 0, 12 * 11 + 0));
    expect(whole.coverage.factor).toBeGreaterThan(0.95);
    expect(whole.exact).toBeCloseTo(whole.base * whole.coverage.factor, 10);
    // The same grid, the answer is only the top left corner (three cells) and the rest of the maze is passages that lead nowhere asked.
    const tight = difficultyOf(handMade(12, 12, snake, 0, 2));
    expect(tight.coverage.factor).toBeLessThan(0.6);
    expect(tight.exact).toBeLessThanOrEqual(tight.base);
  });

  it("counts the trips to the keys in the answer", () => {
    const recipe = parseRecipe("square:12x12:wilson:keys-3:5")!;
    const maze = buildMaze(recipe);
    expect(maze.keys.length).toBe(3);
    const withKeys = difficultyOf(maze);
    const withoutKeys = difficultyOf({ ...maze, keys: [] });
    expect(withKeys.coverage.bbox).toBeGreaterThanOrEqual(withoutKeys.coverage.bbox);
    expect(withKeys.coverage.zones).toBeGreaterThanOrEqual(withoutKeys.coverage.zones);
  });

  it("is the same every time, and always from 0 to 1, for every shape of maze", () => {
    for (const code of ["circle:8:prim:centre-out:3", "cross:30:wilson:to-goal:9", "hexagon:6:growing:enter-leave:1", "pyramid:12:hunt:to-goal:4", "heart:20:kruskal:keys-2:7", "ring:14:backtracker:centre-out:2"]) {
      const maze = buildMaze(parseRecipe(code)!);
      const a = difficultyOf(maze).coverage;
      expect(difficultyOf(maze).coverage, code).toEqual(a);
      for (const value of [a.bbox, a.zones, a.cover]) expect(value >= 0 && value <= 1, code).toBe(true);
      expect(a.factor, code).toBeGreaterThanOrEqual(COVERAGE_FLOOR);
      expect(a.factor, code).toBeLessThanOrEqual(1);
    }
  });

  it("scores the huge cross whose answer is the middle and one arm at 47 and no longer 76: three dots and not four", () => {
    const d = difficultyOf(buildMaze(parseRecipe("cross:90:growing:centre-out:18570")!));
    expect(Math.round(d.base)).toBe(76);
    expect(d.score).toBe(47);
    expect(d.coverage.cover).toBeCloseTo(0.25, 1);
    expect(d.coverage.factor).toBeCloseTo(0.63, 1);
    expect(Math.ceil(d.score / 20)).toBe(3);
  });
});
