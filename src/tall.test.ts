import { describe, expect, it } from "vitest";

import { findTallLevels, MEIKYUU_TALL_LEVELS, MEIKYUU_TALL_PER_SIZE, MEIKYUU_TALL_SIZES, tallLevelOf, tallLevelOfSize, tallLevelsOfSize } from "./levels-tall.ts";
import { MEIKYUU_MAZE_LEVELS } from "./levels.ts";
import { buildMaze } from "./maze.ts";
import { gridOf } from "./shapes.ts";
import { TALL_RATIO, TALL_SHAPES, TALL_WIDTHS, tallDimensions } from "./tall.ts";

describe("tall mazes", () => {
  it("fill a container two thirds as wide as it is tall, in every shape that has rows, with about the cells of the square maze", () => {
    for (const width of TALL_WIDTHS) {
      for (const shape of TALL_SHAPES) {
        const [w, h] = tallDimensions(shape, width);
        const { box } = gridOf(shape, w, h);
        expect(box.w / box.h, `${shape} ${width}`).toBeGreaterThan(TALL_RATIO - 0.04);
        expect(box.w / box.h, `${shape} ${width}`).toBeLessThan(TALL_RATIO + 0.04);
        expect(w * h, shape).toBeGreaterThan(width * width * 1.5 * 0.8);
        expect(w * h, shape).toBeLessThan(width * width * 1.5 * 1.2);
      }
      expect(tallDimensions("square", width)).toEqual([width, width * 1.5]);
    }
    expect(TALL_RATIO).toBeCloseTo(2 / 3, 10);
    expect(() => tallDimensions("heart", 6)).toThrow();
  });

  it("have six sizes of 256 levels each: 6 by 9, 8 by 12, 10 by 15, 12 by 18, 16 by 24 and 20 by 30", () => {
    expect(MEIKYUU_TALL_PER_SIZE).toBe(256);
    expect(MEIKYUU_TALL_LEVELS.length).toBe(1536);
    expect(MEIKYUU_TALL_SIZES.map((s) => s.label)).toEqual(["6×9", "8×12", "10×15", "12×18", "16×24", "20×30"]);
    MEIKYUU_TALL_LEVELS.forEach((level, index) => expect(level.number).toBe(index + 1));
    expect(new Set(MEIKYUU_TALL_LEVELS.map((level) => level.code)).size).toBe(1536);
    for (const { size, width } of MEIKYUU_TALL_SIZES) {
      const levels = tallLevelsOfSize(size);
      expect(levels.length, `size ${size}`).toBe(256);
      levels.forEach((level, index) => {
        expect(level.size).toBe(size);
        expect(level.width).toBe(width);
        expect(level.inSize).toBe(index + 1);
        expect(level.ratio).toBe(TALL_RATIO);
        // Upright: narrower than tall as drawn.
        const { box } = gridOf(level.recipe.shape, level.recipe.w, level.recipe.h);
        expect(box.w, level.code).toBeLessThan(box.h);
        expect(TALL_SHAPES as readonly string[]).toContain(level.recipe.shape);
        // About as many cells as the square maze of that size, whatever the shape, so the sizes are as big to draw in every shape.
        expect(level.cells, level.code).toBeGreaterThan(width * width * 1.5 * 0.75);
        expect(level.cells, level.code).toBeLessThan(width * width * 1.5 * 1.25);
      });
    }
    expect(tallLevelOf(1)).toBe(MEIKYUU_TALL_LEVELS[0]);
    expect(tallLevelOf(1537)).toBeNull();
    expect(tallLevelOfSize(3, 1)).toBe(MEIKYUU_TALL_LEVELS[512]);
    expect(tallLevelsOfSize(7)).toEqual([]);
  });

  it("climb inside every size by the score, never scoring under the one before, and the score rises by thirds", () => {
    for (const { size } of MEIKYUU_TALL_SIZES) {
      const levels = tallLevelsOfSize(size);
      for (let i = 1; i < levels.length; i += 1) expect(levels[i]!.score, `size ${size} level ${i + 1}`).toBeGreaterThanOrEqual(levels[i - 1]!.score);
      const mean = (from: number, to: number): number => levels.slice(from, to).reduce((a, level) => a + level.score, 0) / (to - from);
      expect(mean(0, 86), `size ${size}`).toBeLessThan(mean(86, 171));
      expect(mean(86, 171), `size ${size}`).toBeLessThan(mean(171, 256));
      expect(mean(171, 256) - mean(0, 86), `size ${size}`).toBeGreaterThanOrEqual(3);
    }
    for (let size = 2; size <= 6; size += 1) {
      expect(tallLevelOfSize(size, 1)!.effort, `size ${size}`).toBeGreaterThan(tallLevelOfSize(size - 1, 1)!.effort);
      expect(tallLevelOfSize(size, 256)!.effort, `size ${size}`).toBeGreaterThan(tallLevelOfSize(size - 1, 256)!.effort);
    }
  });

  it("are squares, hexagons and triangles in every way to play, with no maze of the square lists among them", () => {
    for (const { size } of MEIKYUU_TALL_SIZES) {
      const levels = tallLevelsOfSize(size);
      for (const shape of TALL_SHAPES) expect(levels.filter((level) => level.recipe.shape === shape).length, `${size} ${shape}`).toBeGreaterThanOrEqual(20);
      for (const mode of ["enter-leave", "to-goal", "centre-out", "keys"] as const) expect(levels.filter((level) => level.recipe.mode === mode).length, `${size} ${mode}`).toBeGreaterThanOrEqual(30);
    }
    const square = new Set(MEIKYUU_MAZE_LEVELS.map((level) => level.code));
    expect(MEIKYUU_TALL_LEVELS.some((level) => square.has(level.code))).toBe(false);
    expect(findTallLevels({ size: 2, shape: "hex" }).every((level) => level.size === 2 && level.recipe.shape === "hex")).toBe(true);
    expect(buildMaze(MEIKYUU_TALL_LEVELS[0]!.recipe).grid.cells).toBe(MEIKYUU_TALL_LEVELS[0]!.cells);
  });
});
