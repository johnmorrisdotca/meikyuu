import { describe, expect, it } from "vitest";

import { legacyLevelOf, legacyLevelOfCode, MEIKYUU_LEGACY_MAZE_LEVELS } from "./levels-legacy.ts";
import { MEIKYUU_MAZE_LEVELS, MEIKYUU_SIZES } from "./levels.ts";
import { buildMaze, parseRecipe, recipeCode } from "./maze.ts";
import { difficultyOf, isTooEasy } from "./difficulty.ts";

describe("where the 1.0.0 maze levels went", () => {
  it("keeps all 1,000, in the order the first release numbered them, each a recipe that builds", () => {
    expect(MEIKYUU_LEGACY_MAZE_LEVELS.length).toBe(1000);
    MEIKYUU_LEGACY_MAZE_LEVELS.forEach((level, index) => {
      expect(level.number).toBe(index + 1);
      expect(recipeCode(parseRecipe(level.code)!)).toBe(level.code);
    });
    expect(new Set(MEIKYUU_LEGACY_MAZE_LEVELS.map((level) => level.code)).size).toBe(1000);
    // The first release's first levels: the 3 by 3 at the head of the list.
    expect(legacyLevelOf(1)!.code).toBe("square:3x3:prim:enter-leave:7920");
    expect(legacyLevelOf(1001)).toBeNull();
    expect(legacyLevelOfCode("square:3x3:prim:enter-leave:7920")!.number).toBe(1);
    expect(legacyLevelOfCode("square:9x9:prim:enter-leave:1")).toBeNull();
  });

  it("answers every one: the same maze where it stayed, and the level at its place now where it did not", () => {
    const now = new Map(MEIKYUU_MAZE_LEVELS.map((level) => [level.code, level]));
    const perSize = new Map<string, number>();
    for (const level of MEIKYUU_LEGACY_MAZE_LEVELS) {
      const place = (perSize.get(level.size) ?? 0) + 1;
      perSize.set(level.size, place);
      expect(level.place, level.code).toBe(place);
      const current = now.get(level.code);
      if (current === undefined) {
        expect(level.now, level.code).toBeNull();
        expect(level.nowInSize, level.code).toBeNull();
      } else {
        expect(level.now, level.code).toBe(current.number);
        expect(level.nowInSize, level.code).toBe(current.inSize);
        expect(current.size, level.code).toBe(level.size);
      }
      // The level at its place now is one of its size, at the same place (the last, for a place past 256).
      const near = MEIKYUU_MAZE_LEVELS[level.nearest - 1]!;
      expect(near.size, level.code).toBe(level.size);
      expect(near.inSize, level.code).toBe(Math.min(place, 256));
    }
  });

  it("changes as few numbers as can be: a level that was good enough keeps its place, a level that was too easy has a new maze there, and only the hardest of Large and Huge are cut off", () => {
    const stable = MEIKYUU_LEGACY_MAZE_LEVELS.filter((level) => level.nowInSize === level.place);
    // Every level that is still in the list is still at its place: nothing was moved.
    expect(MEIKYUU_LEGACY_MAZE_LEVELS.filter((level) => level.now !== null && level.nowInSize !== level.place)).toEqual([]);
    expect(stable.length).toBe(MEIKYUU_LEGACY_MAZE_LEVELS.filter((level) => level.now !== null).length);
    const count = (size: string, test: (level: (typeof MEIKYUU_LEGACY_MAZE_LEVELS)[number]) => boolean): number => MEIKYUU_LEGACY_MAZE_LEVELS.filter((level) => level.size === size && test(level)).length;
    // Large and Huge keep their first 256 places exactly; the rest of 1.0.0's are gone.
    for (const size of ["large", "huge"]) {
      expect(count(size, (level) => level.place <= 256 && level.now === null), size).toBe(0);
      expect(count(size, (level) => level.place > 256 && level.now !== null), size).toBe(0);
    }
    expect(count("large", (level) => level.place > 256)).toBe(29);
    expect(count("huge", (level) => level.place > 256)).toBe(11);
    // The ones replaced are the ones that were too easy for their place, and only those.
    for (const level of MEIKYUU_LEGACY_MAZE_LEVELS) {
      const tooEasy = isTooEasy(difficultyOf(buildMaze(parseRecipe(level.code)!)), level.place <= 256 ? level.place : undefined);
      if (level.place <= 256 && level.now === null) continue;
      if (level.now !== null) expect(tooEasy, `${level.code} stayed but is too easy`).toBe(false);
    }
    expect(MEIKYUU_SIZES.length).toBe(4);
  }, 60_000);
});
