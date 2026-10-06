import { describe, expect, it } from "vitest";

import { MEIKYUU_SOLID_LEVELS } from "./levels-solid-all.ts";
import { MEIKYUU_SOLID_RECIPE_TEXT } from "./levels/solid-recipes.data.ts";
import { solidLevelNumberOf, solidRecipesOf } from "./levels-solid-recipes.ts";
import { SOLID_SIZE_NAMES } from "./solid/solidSizes.ts";

describe("the recipes of the solid levels, and nothing else", () => {
  it("are the codes of every level of every solid at every size, in order", () => {
    for (const [kind, sizes] of Object.entries(MEIKYUU_SOLID_LEVELS)) {
      for (const size of SOLID_SIZE_NAMES) {
        expect(solidRecipesOf(kind, size), `${kind} ${size}`).toEqual(sizes![size].map((level) => level.code));
      }
    }
    expect(Object.keys(MEIKYUU_SOLID_RECIPE_TEXT).sort()).toEqual(Object.keys(MEIKYUU_SOLID_LEVELS).sort());
  });

  it("say which level a recipe is, and no level for one that is not", () => {
    const level = MEIKYUU_SOLID_LEVELS.heart!.colossal[40]!;
    expect(solidLevelNumberOf("heart", "colossal", level.code)).toBe(41);
    expect(solidLevelNumberOf("heart", "colossal", MEIKYUU_SOLID_LEVELS.heart!.small[0]!.code)).toBeNull();
    expect(solidLevelNumberOf("heart", "colossal", "heart:14:prim:1")).toBeNull();
    expect(solidRecipesOf("no-such-solid", "small")).toEqual([]);
    expect(solidRecipesOf("heart", "no-such-size")).toEqual([]);
  });

  it("are small: all of them in about fifty kilobytes of text", () => {
    expect(JSON.stringify(MEIKYUU_SOLID_RECIPE_TEXT).length).toBeLessThan(60_000);
  });
});
