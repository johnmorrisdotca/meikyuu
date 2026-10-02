import type { Maze } from "./maze.ts";

/**
 * A LINE AS ITS STEPS: one character a step, the place of the cell stepped to among the neighbours of the cell stepped from
 * (`grid.neighbours`, in base 36), the first step leaving the start. A maze is its recipe and the recipe rebuilds the same maze for ever, so
 * a line needs no more than its steps to be drawn again: the longest on any level is a few thousand characters, and a line kept half way is a
 * prefix of one that is finished. Steps belong to the maze as it was made, so the same steps are the same line however the board is turned
 * (`orientation`) and on whatever device.
 */
const STEP = /^[0-9a-z]*$/;

/** A line, cell by cell from the start, as its steps. Null if it is not a run of neighbours. */
export function lineToSteps(maze: Maze, cells: readonly number[]): string | null {
  let out = "";
  for (let at = 1; at < cells.length; at += 1) {
    const place = maze.grid.neighbours[cells[at - 1]!]?.indexOf(cells[at]!) ?? -1;
    if (place < 0 || place >= 36) return null;
    out += place.toString(36);
  }
  return out;
}

/** The cells steps walk from the maze's start, or null if any step goes where a line cannot: into a wall, off the maze, or back onto the line. */
export function stepsToLine(maze: Maze, steps: string): number[] | null {
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
