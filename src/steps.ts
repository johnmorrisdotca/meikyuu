import type { MazeCore } from "./maze.ts";

/**
 * A LINE AS ITS STEPS: one character a step, the place of the cell stepped to among the neighbours of the cell stepped from
 * (`grid.neighbours`, in base 36), the first step leaving the start. A maze is its recipe and the recipe rebuilds the same maze for ever, so
 * a line needs no more than its steps to be drawn again: the longest on any level is a few thousand characters, and a line kept half way is a
 * prefix of one that is finished. Steps belong to the maze as it was made, so the same steps are the same line however the board is turned
 * (`orientation`) and on whatever device.
 */
const STEP = /^[0-9a-z]*$/;

/** A line, cell by cell from the start, as its steps. Null if it is not a run of neighbours.
 *
 * @param maze - The valid flat/surface maze or required maze-core fields.
 * @param cells - A cell-index path or total count specified by this signature.
 * @returns A line, cell by cell from the start, as its steps. null if it is not a run of neighbours.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, lineToSteps, solutionOf } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const route = solutionOf(maze);
 * console.log(lineToSteps(maze,route));
 * ```
 */
export function lineToSteps(maze: MazeCore, cells: readonly number[]): string | null {
  let out = "";
  for (let at = 1; at < cells.length; at += 1) {
    const place = maze.grid.neighbours[cells[at - 1]!]?.indexOf(cells[at]!) ?? -1;
    if (place < 0 || place >= 36) return null;
    out += place.toString(36);
  }
  return out;
}

/** The cells steps walk from the maze's start, or null if any step goes where a line cannot: into a wall, off the maze, or back onto the line.
 *
 * @param maze - The valid flat/surface maze or required maze-core fields.
 * @param steps - The encoded native directional steps.
 * @returns The cells steps walk from the maze's start, or null if any step goes where a line cannot: into a wall, off the maze, or back onto the line.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze, lineToSteps, solutionOf, stepsToLine } from "@johnmorrisdotca/meikyuu";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const route = solutionOf(maze);
 * console.log(stepsToLine(maze,lineToSteps(maze,route)!));
 * ```
 */
export function stepsToLine(maze: MazeCore, steps: string): number[] | null {
  if (!STEP.test(steps)) return null;
  const cells = [maze.start];
  const seen = new Set(cells);
  for (const character of steps) {
    const here = cells[cells.length - 1]!;
    const next = maze.grid.neighbours[here]?.[parseInt(character, 36)];
    if (next === undefined || seen.has(next) || !maze.links[here]!.includes(next)) return null;
    cells.push(next);
    seen.add(next);
  }
  return cells;
}
