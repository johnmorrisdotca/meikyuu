import { describe, expect, it } from "vitest";

import { ARROW_SHAPES, MEIKYUU_MOST_ARROW_CELLS, parseArrowRecipe } from "./arrows.ts";
import { MEIKYUU_SHAPES, type MeikyuuShape } from "./grid.ts";
import { MEIKYUU_ARROW_LEVELS, MEIKYUU_MAZE_LEVELS, MEIKYUU_MIXED_LEVELS } from "./levels.ts";
import { layoutCells, MEIKYUU_MOST_CELLS, MEIKYUU_MOST_KEYS, parseRecipe } from "./maze.ts";
import { parseMixedRecipe } from "./mixed.ts";
import { gridOf } from "./shapes.ts";

const ROWLESS: readonly MeikyuuShape[] = ["circle", "heart", "leaf", "star", "ring", "diamond", "cross", "moon", "hexagon", "pyramid"];
const recipeOf = (shape: MeikyuuShape, w: number, mode = "to-goal") => `${shape}:${ROWLESS.includes(shape) ? w : `${w}x${w}`}:backtracker:${mode}:1`;

describe("how big a recipe may be", () => {
  it("is a little over twice what the biggest level lays out, and every level is inside it", () => {
    const most = Math.max(...MEIKYUU_MAZE_LEVELS.map(({ recipe }) => layoutCells(recipe.shape, recipe.w, recipe.h)));
    expect(most).toBe(19321);
    expect(MEIKYUU_MOST_CELLS).toBeGreaterThanOrEqual(2 * most);
    expect(MEIKYUU_MOST_CELLS).toBeLessThan(3 * most);
    for (const level of MEIKYUU_MIXED_LEVELS) expect(parseMixedRecipe(level.code), level.code).not.toBeNull();
  });

  it("refuses a recipe past the limit, for every shape, and accepts the biggest that is inside it", () => {
    for (const shape of MEIKYUU_SHAPES) {
      let w = 2;
      while (layoutCells(shape, w + 1, w + 1) <= MEIKYUU_MOST_CELLS) w += 1;
      expect(parseRecipe(recipeOf(shape, w)), `${shape} ${w}`).not.toBeNull();
      expect(parseRecipe(recipeOf(shape, w + 1)), `${shape} ${w + 1}`).toBeNull();
    }
  });

  it("lays out no more cells than it counted, at the biggest size each shape is allowed", () => {
    for (const shape of MEIKYUU_SHAPES) {
      let w = 2;
      while (layoutCells(shape, w + 1, w + 1) <= MEIKYUU_MOST_CELLS) w += 1;
      const grid = gridOf(shape, w, w);
      expect(grid.cells, shape).toBeLessThanOrEqual(layoutCells(shape, w, w));
    }
  }, 120_000);

  it("counts a circle, a hexagon and a pyramid as the grids are laid out", () => {
    for (const [shape, size] of [["circle", 20], ["hexagon", 12], ["pyramid", 15], ["pyramid", 16], ["heart", 30], ["square", 7]] as const) {
      const built = gridOf(shape, size, size);
      const base = layoutCells(shape, size, size);
      expect(built.cells, `${shape} ${size}`).toBeLessThanOrEqual(base);
      if (shape === "circle") expect(built.cells).toBe(base);
    }
  });

  it("refuses a recipe that names an enormous size, quickly, without building anything", () => {
    const started = Date.now();
    for (const code of ["square:100000x100000:wilson:to-goal:1", "hex:5000x5000:kruskal:centre-out:1", "triangle:99999x99999:prim:to-goal:1", "circle:99999999999:backtracker:to-goal:1", "heart:100000:hunt:to-goal:1", "hexagon:100000:hunt:to-goal:1", "pyramid:100000:hunt:to-goal:1", `square:${"9".repeat(400)}:wilson:to-goal:1`, "square:2x200000:wilson:to-goal:1"]) expect(parseRecipe(code), code).toBeNull();
    expect(Date.now() - started).toBeLessThan(500);
  });

  it("refuses more keys than twice the most any level uses", () => {
    const most = Math.max(...MEIKYUU_MAZE_LEVELS.map(({ recipe }) => recipe.keys ?? 0));
    expect(MEIKYUU_MOST_KEYS).toBe(2 * most);
    expect(parseRecipe(`square:6x6:backtracker:keys-${MEIKYUU_MOST_KEYS}:1`)).not.toBeNull();
    expect(parseRecipe(`square:6x6:backtracker:keys-${MEIKYUU_MOST_KEYS + 1}:1`)).toBeNull();
    expect(parseRecipe("square:6x6:backtracker:keys-1000000:1")).toBeNull();
  });

  it("limits an arrow board the same way, at a little over twice the biggest level's", () => {
    const most = Math.max(...MEIKYUU_ARROW_LEVELS.map(({ recipe }) => recipe.w * recipe.h));
    expect(MEIKYUU_MOST_ARROW_CELLS).toBeGreaterThanOrEqual(2 * most);
    expect(MEIKYUU_MOST_ARROW_CELLS).toBeLessThan(3 * most);
    expect(parseArrowRecipe("square:60x60:9:1")).not.toBeNull();
    expect(parseArrowRecipe("square:64x64:9:1")).toBeNull();
    expect(parseArrowRecipe("heart:100000:9:1")).toBeNull();
    expect(ARROW_SHAPES).toContain("heart");
  });
});
