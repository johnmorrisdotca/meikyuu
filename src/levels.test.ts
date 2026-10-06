import { describe, expect, it } from "vitest";

import { bandOf, findMazeLevels, levelCount, levelOf, levelsOf, mazeLevelOfSize, mazeLevelsOfSize, MEIKYUU_ARROW_LEVELS, MEIKYUU_KINDS, MEIKYUU_LEVELS_PER_SIZE, MEIKYUU_MAZE_LEVELS, MEIKYUU_MIXED_LEVELS, MEIKYUU_SIZES, sizeOf } from "./levels.ts";
import { MEIKYUU_ALGORITHMS } from "./algorithms.ts";
import { difficultyOf, easyFloorAt, isTooEasy } from "./difficulty.ts";
import { MEIKYUU_SHAPES } from "./grid.ts";
import { buildMaze, MEIKYUU_MODES } from "./maze.ts";
import { EFFORT_MOST, ratingOf } from "./measure.ts";

describe("the maze list", () => {
  it("has 256 levels to each of four sizes, numbered from 1, each a different recipe", () => {
    expect(MEIKYUU_LEVELS_PER_SIZE).toBe(256);
    expect(MEIKYUU_MAZE_LEVELS.length).toBe(1024);
    MEIKYUU_MAZE_LEVELS.forEach((level, index) => expect(level.number).toBe(index + 1));
    expect(new Set(MEIKYUU_MAZE_LEVELS.map((level) => level.code)).size).toBe(1024);
  });

  it("keeps the sizes in blocks: small, medium, large, huge, 256 each, every level the size its cells say, and its place in its size", () => {
    MEIKYUU_SIZES.forEach((size, block) => {
      const levels = mazeLevelsOfSize(size);
      expect(levels.length, size).toBe(256);
      levels.forEach((level, index) => {
        expect(level.number, `${size} ${index + 1}`).toBe(block * 256 + index + 1);
        expect(level.size, `${size} ${index + 1}`).toBe(size);
        expect(level.inSize, `${size} ${index + 1}`).toBe(index + 1);
        expect(sizeOf(level.cells), `${size} ${index + 1}`).toBe(size);
      });
    });
    expect(mazeLevelOfSize("medium", 1)).toBe(MEIKYUU_MAZE_LEVELS[256]);
    expect(mazeLevelOfSize("huge", 256)).toBe(MEIKYUU_MAZE_LEVELS[1023]);
    expect(mazeLevelOfSize("huge", 257)).toBeNull();
    expect(mazeLevelOfSize("small", 0)).toBeNull();
  });

  it("is in the order of the score inside a size: never scoring under the level before (one whole number is many unrounded ones, and the list is in the order of those)", () => {
    for (const size of MEIKYUU_SIZES) {
      const levels = mazeLevelsOfSize(size);
      for (let i = 1; i < levels.length; i += 1) {
        expect(levels[i]!.score, `${size} level ${i + 1}`).toBeGreaterThanOrEqual(levels[i - 1]!.score);
      }
      expect(levels[255]!.effort, size).toBeGreaterThan(levels[0]!.effort * 2);
    }
  });

  it("gets harder to play along each size, by the score, in thirds and in pages of sixteen, though one level can be a little easier than its neighbour", () => {
    for (const size of MEIKYUU_SIZES) {
      const levels = mazeLevelsOfSize(size);
      const mean = (from: number, to: number): number => levels.slice(from, to).reduce((a, level) => a + level.score, 0) / (to - from);
      expect(mean(0, 86), size).toBeLessThan(mean(86, 171));
      expect(mean(86, 171), size).toBeLessThan(mean(171, 256));
      // Every page of sixteen is about as hard as the one before it, or harder.
      for (let page = 1; page < 16; page += 1) expect(mean(page * 16, page * 16 + 16), `${size} page ${page + 1}`).toBeGreaterThan(mean(page * 16 - 16, page * 16) - 2.5);
    }
  });

  it("is gentle at level 1 of Small and hard at the end of Huge, and never goes past the effort the scale is for", () => {
    const first = MEIKYUU_MAZE_LEVELS[0]!;
    expect(first.cells).toBeLessThanOrEqual(30);
    expect(first.score).toBeLessThanOrEqual(25);
    expect(first.score).toBeGreaterThanOrEqual(8);
    const last = MEIKYUU_MAZE_LEVELS[1023]!;
    expect(last.cells).toBeGreaterThan(4000);
    expect(last.score).toBeGreaterThan(85);
    expect(Math.max(...MEIKYUU_MAZE_LEVELS.map((level) => level.cells))).toBeLessThanOrEqual(9000);
    expect(Math.max(...MEIKYUU_MAZE_LEVELS.map((level) => level.effort))).toBeLessThanOrEqual(EFFORT_MOST);
  });

  it("starts Small with its gentlest mazes, a few cells each, and brings the other shapes and ways to play in as the score goes on", () => {
    const small = mazeLevelsOfSize("small");
    expect(small.slice(0, 5).every((level) => level.cells <= 30)).toBe(true);
    expect(small.findIndex((level) => level.recipe.mode === "keys")).toBeGreaterThan(20);
    expect(small.findIndex((level) => level.recipe.shape === "star")).toBeGreaterThan(20);
  });

  it("gives every shape, way to play and algorithm a place in every size, and keeps the easy third from being all one thing", () => {
    for (const size of MEIKYUU_SIZES) {
      const levels = mazeLevelsOfSize(size);
      for (const shape of MEIKYUU_SHAPES) expect(levels.filter((level) => level.recipe.shape === shape).length, `${size} ${shape}`).toBeGreaterThanOrEqual(4);
      for (const mode of MEIKYUU_MODES) expect(levels.filter((level) => level.recipe.mode === mode).length, `${size} ${mode}`).toBeGreaterThanOrEqual(20);
      for (const algorithm of MEIKYUU_ALGORITHMS) expect(levels.filter((level) => level.recipe.algorithm === algorithm).length, `${size} ${algorithm}`).toBeGreaterThanOrEqual(3);
      const easy = levels.slice(0, 86);
      expect(new Set(easy.map((level) => level.recipe.shape)).size, `${size} easy shapes`).toBeGreaterThanOrEqual(size === "small" ? 5 : 8);
    }
  });

  it("makes the easy third a climb: more choices and more wrong turns as it goes, and never a maze the straight guess solves", () => {
    for (const size of MEIKYUU_SIZES) {
      const easy = mazeLevelsOfSize(size).slice(0, 86).map((level) => difficultyOf(buildMaze(level.recipe)));
      const mean = (from: number, to: number, pick: (d: (typeof easy)[number]) => number): number => easy.slice(from, to).reduce((a, d) => a + pick(d), 0) / (to - from);
      for (const pick of [(d: (typeof easy)[number]) => d.measure.decisions, (d: (typeof easy)[number]) => d.traps]) {
        expect(mean(57, 86, pick), size).toBeGreaterThan(mean(0, 29, pick));
      }
      easy.forEach((d, i) => expect(isTooEasy(d), `${size} ${i + 1}`).toBe(false));
    }
  }, 60_000);

  it("finds levels by shape, way to play and size", () => {
    for (const size of MEIKYUU_SIZES) expect(findMazeLevels({ size }).length, size).toBe(256);
    expect(sizeOf(10)).toBe("small");
    expect(sizeOf(200)).toBe("medium");
    expect(sizeOf(1000)).toBe("large");
    expect(sizeOf(5000)).toBe("huge");
    expect(sizeOf(149)).toBe("small");
    expect(sizeOf(4000)).toBe("huge");
    expect(findMazeLevels({ shape: "heart", mode: "keys" }).every((level) => level.recipe.shape === "heart" && level.recipe.mode === "keys")).toBe(true);
  });

  it("asks more of a place as the easy third goes on: the least at level 1, and 3 traps, 5 forks and 8 wasted cells at level 86", () => {
    expect(easyFloorAt(1)).toEqual({ traps: 2, decisions: 3, waste: 4 });
    expect(easyFloorAt(86)).toEqual({ traps: 3, decisions: 5, waste: 8 });
    expect(easyFloorAt(200)).toEqual(easyFloorAt(86));
  });

  it("files a place in a size under easy, medium and hard by thirds, as a site does", () => {
    expect(bandOf(1)).toBe("easy");
    expect(bandOf(86)).toBe("easy");
    expect(bandOf(87)).toBe("medium");
    expect(bandOf(171)).toBe("medium");
    expect(bandOf(172)).toBe("hard");
    expect(bandOf(256)).toBe("hard");
    expect([1, 2, 3].map((third) => Array.from({ length: 256 }, (_, i) => bandOf(i + 1)).filter((b) => b === (["easy", "medium", "hard"] as const)[third - 1]).length)).toEqual([86, 85, 85]);
  });

  it("is found by kind and number", () => {
    expect(levelOf("maze", 1)).toBe(MEIKYUU_MAZE_LEVELS[0]);
    expect(levelOf("maze", 0)).toBeNull();
    expect(levelOf("maze", 1025)).toBeNull();
    expect(levelOf("arrows", 5)).toBe(MEIKYUU_ARROW_LEVELS[4]);
    expect(levelOf("mixed", 3)).toBe(MEIKYUU_MIXED_LEVELS[2]);
    expect(levelsOf("mixed")).toBe(MEIKYUU_MIXED_LEVELS);
    for (const kind of MEIKYUU_KINDS) expect(levelCount(kind)).toBe(levelsOf(kind).length);
    expect(MEIKYUU_KINDS).toEqual(["maze", "arrows", "mixed"]);
  });

  it("rates the effort of a level the same way every time", () => {
    for (const level of MEIKYUU_MAZE_LEVELS.filter((_, i) => i % 7 === 0)) expect(level.rating).toBe(ratingOf(level.effort));
  });
});
