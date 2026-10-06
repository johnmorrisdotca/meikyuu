import { describe, expect, it } from "vitest";

import { checkSolidLevels } from "./solidLevelSuite.fixture.ts";
import { findSolidLevels, MEIKYUU_SOLID_LEVELS, MEIKYUU_SOLID_PER_LIST, SOLID_FIRST, solidLevelOf, solidLevelsOf } from "./levels-solid.ts";
import { MEIKYUU_SOLID_LEVELS as EVERY, findSolidLevels as findEvery, SOLID_DICE, SOLID_DIE_SIDES, SOLID_KINDS, SOLID_MORE_DICE, SOLID_MORE_SHAPES, SOLID_SHAPES, solidLevelsOf as everyLevelsOf } from "./levels-solid-all.ts";
import { MEIKYUU_SOLID_LEVELS as DICE, findSolidLevels as findDice } from "./levels-solid-dice.ts";
import { MEIKYUU_SOLID_LEVELS as SHAPES, findSolidLevels as findShapes } from "./levels-solid-shapes.ts";
import { SOLID_CUTS, SOLID_SIZE_NAMES, solidCellsOf } from "./solid/solidSizes.ts";

describe("the solid levels", () => {
  it("are sixty-four to a size, five sizes to a solid, eighteen solids, in three files: the first five, the further dice and the shapes", () => {
    expect(MEIKYUU_SOLID_PER_LIST).toBe(64);
    expect(SOLID_SIZE_NAMES).toEqual(["small", "medium", "large", "huge", "colossal"]);
    expect(SOLID_KINDS).toHaveLength(18);
    expect(findSolidLevels()).toHaveLength(5 * 5 * 64);
    expect(findDice()).toHaveLength(7 * 5 * 64);
    expect(findShapes()).toHaveLength(6 * 5 * 64);
    expect(findEvery()).toHaveLength(18 * 5 * 64);
    expect(Object.keys(MEIKYUU_SOLID_LEVELS)).toEqual([...SOLID_FIRST]);
    expect(Object.keys(DICE)).toEqual([...SOLID_MORE_DICE]);
    expect(Object.keys(SHAPES)).toEqual([...SOLID_MORE_SHAPES]);
    expect(new Set(Object.keys(EVERY))).toEqual(new Set(SOLID_KINDS));
    for (const kind of SOLID_KINDS) for (const size of SOLID_SIZE_NAMES) expect(everyLevelsOf(kind, size), `${kind} ${size}`).toHaveLength(64);
    expect(solidLevelOf("cube", "small", 1)?.number).toBe(1);
    expect(solidLevelOf("cube", "small", 65)).toBeNull();
    expect(solidLevelOf("cube", "small", 0)).toBeNull();
    expect(findSolidLevels({ kind: "sphere", size: "large" })).toHaveLength(64);
    // A file holds no list for a solid that is in another.
    expect(solidLevelsOf("heart", "small")).toEqual([]);
    expect(solidLevelOf("heart", "small", 1)).toBeNull();
  });

  it("puts every solid among the dice or the shapes, and gives each die its sides", () => {
    expect([...SOLID_DICE, ...SOLID_SHAPES].sort()).toEqual([...SOLID_KINDS].sort());
    expect(SOLID_DICE.map((kind) => SOLID_DIE_SIDES[kind])).toEqual([3, 4, 6, 8, 10, 12, 12, 16, 20, 24, 30]);
    expect(SOLID_SHAPES).toEqual(["sphere", "box", "cross", "ring", "torus", "star", "heart"]);
  });

  it("have about the cells a size says, whichever solid it is: under a hundred or so, three hundred, six or seven hundred, a thousand or so and four thousand or so", () => {
    const bands: Record<string, [number, number]> = { small: [55, 135], medium: [230, 390], large: [540, 810], huge: [1100, 1520], colossal: [3500, 4900] };
    for (const size of SOLID_SIZE_NAMES) {
      const cells = SOLID_KINDS.map((kind) => solidCellsOf(kind, size));
      expect(Math.max(...cells) / Math.min(...cells), size).toBeLessThan(size === "small" ? 2.3 : 1.8);
      for (const kind of SOLID_KINDS) {
        expect(solidCellsOf(kind, size), `${kind} ${size}`).toBeGreaterThanOrEqual(bands[size]![0]);
        expect(solidCellsOf(kind, size), `${kind} ${size}`).toBeLessThanOrEqual(bands[size]![1]);
      }
    }
    for (const kind of SOLID_KINDS) for (let i = 1; i < SOLID_SIZE_NAMES.length; i += 1) expect(SOLID_CUTS[kind][i]!, kind).toBeGreaterThan(SOLID_CUTS[kind][i - 1]!);
  });

  it("climb: the last level of a size scores higher than the first, a size is harder than the one before it, and the colossal ones reach 89 or more where the whole solid can be crossed", () => {
    for (const kind of SOLID_KINDS) {
      const median = (size: (typeof SOLID_SIZE_NAMES)[number]): number => everyLevelsOf(kind, size)[32]!.score;
      for (const size of SOLID_SIZE_NAMES) {
        const list = everyLevelsOf(kind, size);
        expect(list[63]!.score, `${kind} ${size}`).toBeGreaterThan(list[0]!.score);
      }
      for (let i = 1; i < SOLID_SIZE_NAMES.length; i += 1) expect(median(SOLID_SIZE_NAMES[i]!), `${kind} ${SOLID_SIZE_NAMES[i]}`).toBeGreaterThan(median(SOLID_SIZE_NAMES[i - 1]!));
      expect(everyLevelsOf(kind, "colossal")[63]!.score, kind).toBeGreaterThanOrEqual(89);
    }
  });
});

describe("the levels of the first five solids", () => {
  checkSolidLevels(SOLID_FIRST);
});
