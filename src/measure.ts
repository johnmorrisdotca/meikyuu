import { solutionOf, walk, type MazeCore } from "./maze.ts";

/**
 * HOW HARD A MAZE IS, measured from the maze alone (docs/MAZES.md says why each number is here).
 * Everything is a whole number counted off the passages, so the same maze measures the same in
 * every engine, and a level list ordered by `effort` stays ordered.
 *
 * `effort` is an estimate, in cells drawn, of what a person does to solve it: the length of the
 * way through, plus the length of the wrong turns taken (a person who meets a fork takes the
 * wrong side half the time and walks to the end of it before turning back, so half of two times
 * the depth of each wrong branch), plus two for every fork on the way (looking, and deciding), plus
 * what collecting the keys adds. A big maze with a long way through costs more than a small one with
 * many dead ends, as it takes longer to draw; two mazes of one size cost what their branching makes them.
 */
export type MazeMeasure = {
  cells: number;
  /** Cells with one passage. */
  deadEnds: number;
  deadEndShare: number;
  /** Cells with three or more passages. */
  junctions: number;
  /** The share of cells with exactly two passages: a high `river` is a maze of long winding corridors. */
  river: number;
  /** Cells on the way from the start to the goal, both included. */
  solution: number;
  /** Places on the way where the line could have gone another way. */
  decisions: number;
  /** Wrong branches that leave the way. */
  branches: number;
  /** The length of the longest of them, to its end. */
  longestBranch: number;
  /** The lengths of all the wrong branches, added up. */
  wasted: number;
  /** What collecting the keys costs: there and back to each, off the way. */
  detour: number;
  effort: number;
};

/** Measure a maze. */
export function measureMaze(maze: MazeCore): MazeMeasure {
  const { links } = maze;
  const cells = links.length;
  const solution = solutionOf(maze);
  const onWay = new Uint8Array(cells);
  for (const cell of solution) onWay[cell] = 1;
  const { before, order } = walk(links, maze.start);
  // How far each cell's branch runs below it, with the tree rooted at the start.
  const height = new Int32Array(cells);
  for (let at = order.length - 1; at > 0; at -= 1) {
    const cell = order[at]!;
    const up = before[cell]!;
    if (height[cell]! + 1 > height[up]!) height[up] = height[cell]! + 1;
  }
  let decisions = 0;
  let branches = 0;
  let longestBranch = 0;
  let wasted = 0;
  for (let at = 0; at < solution.length; at += 1) {
    const cell = solution[at]!;
    for (const next of links[cell]!) {
      if (onWay[next] === 1) continue;
      const depth = height[next]! + 1;
      branches += 1;
      wasted += depth;
      if (depth > longestBranch) longestBranch = depth;
    }
    // The line leaves every cell of the way but the last: a fork is where it has more than one way to leave.
    if (at < solution.length - 1) decisions += links[cell]!.length - (at === 0 ? 1 : 2);
  }
  // The keys: the tree that joins the start, the goal and every key, less the way itself, walked there and back.
  let detour = 0;
  if (maze.keys.length > 0) {
    const used = new Uint8Array(cells);
    let count = 0;
    for (const end of [maze.goal, ...maze.keys]) {
      for (let cell = end; cell !== -1 && used[cell] === 0; cell = before[cell]!) {
        used[cell] = 1;
        count += 1;
      }
    }
    detour = 2 * (count - solution.length);
  }
  let deadEnds = 0;
  let junctions = 0;
  let straight = 0;
  for (const open of links) {
    if (open.length === 1) deadEnds += 1;
    else if (open.length === 2) straight += 1;
    else if (open.length > 2) junctions += 1;
  }
  const effort = solution.length + wasted + 2 * decisions + detour;
  return { cells, deadEnds, deadEndShare: deadEnds / cells, junctions, river: straight / cells, solution: solution.length, decisions, branches, longestBranch, wasted, detour, effort };
}

/** The easiest effort a level is given a rating for, and the hardest: 1 and 100 are these. */
export const EFFORT_LEAST = 9;
export const EFFORT_MOST = 5400;

/** An effort as a rating from 1 to 100, on a scale where doubling the effort adds the same each time. */
export function ratingOf(effort: number): number {
  const share = Math.log(Math.max(effort, EFFORT_LEAST) / EFFORT_LEAST) / Math.log(EFFORT_MOST / EFFORT_LEAST);
  return Math.min(100, Math.max(1, Math.round(1 + 99 * share)));
}
