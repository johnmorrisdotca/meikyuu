import { describe, expect, it } from "vitest";

import { below, pick, seededRandom, shuffled } from "./random.ts";

describe("the seeded stream", () => {
  it("is the same for the same seed, in every engine: its first numbers are pinned", () => {
    const next = seededRandom(1);
    expect([next(), next(), next()].map((n) => Math.round(n * 1e6))).toEqual([627074, 2736, 527447]);
    expect(Math.round(seededRandom(48213)() * 1e6)).toBe(Math.round(seededRandom(48213)() * 1e6));
  });

  it("stays inside its range", () => {
    const next = seededRandom(7);
    for (let i = 0; i < 1000; i += 1) {
      expect(next()).toBeGreaterThanOrEqual(0);
      expect(next()).toBeLessThan(1);
      expect(below(next, 5)).toBeLessThan(5);
    }
  });

  it("shuffles into a permutation and leaves its input alone", () => {
    const items = [1, 2, 3, 4, 5, 6];
    const out = shuffled(items, seededRandom(3));
    expect([...out].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
    expect(items).toContain(pick(items, seededRandom(3)));
  });
});
