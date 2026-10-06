import { coverageOf, type MazeCoverage } from "./coverage.ts";
import { solutionOf, walk, type Maze, type MazeCore } from "./maze.ts";
import { measureMaze, type MazeMeasure } from "./measure.ts";

/**
 * HOW HARD A MAZE IS TO PLAY, ON ONE SCALE FROM 0 TO 100 (`difficultyOf`). It is a second measure beside
 * `measureMaze`'s `effort`: effort says how much there is to draw, which is mostly a question of size; this adds
 * what makes a maze of one size easy or tricky, so that two mazes of the same size can be told apart, and a list
 * can be ramped smoothly inside a size. docs/LEVELS.md explains the choices.
 *
 * Six things are counted off the passages, none of which needs a person:
 *
 * - `reach`: the effort (cells drawn, wrong turns and forks included), on the log scale `ratingOf` uses.
 * - `forks`: the places on the way where the line could have gone another way (`decisions`).
 * - `traps`: forks where the straight guess is wrong. The straight guess is what a person does with no plan:
 *   at every fork, take the passage that points most nearly at the goal. A fork is a trap when that passage is not
 *   the right one. A maze with no traps is solved by pointing at the goal and walking, which is not a puzzle.
 * - `waste`: the cells the straight guess draws that are not on the way, walking in and out of dead ends in
 *   order of preference. The cost of being wrong, where `traps` is how often.
 * - `depth`: the length of the longest wrong branch, the one that goes on looking right for longest.
 * - `turns`: bends on the way (a change of heading of more than 25 degrees), the thing that makes a corridor
 *   hard to follow with a thumb.
 *
 * Each is turned into a share from 0 to 1 on a log scale against a ceiling (the biggest the lists reach, so a
 * term only reaches 1 at the very top), and the score is their weighted sum: 40% reach, 15% each forks, traps and
 * waste, 7.5% each depth and turns. Whole numbers counted off the passages and plain arithmetic, so the same
 * maze scores the same in every engine and a list ordered by score stays ordered.
 *
 * Then the score is multiplied by how much of the map the answer covers (`coverageOf`, src/coverage.ts): from half at an answer that stays in a corner
 * to the whole at one that crosses the map. The six terms count what is met on the way, and none of them can tell a long answer in a corner from one
 * across the whole map, which is the easier to play.
 *
 * A way to play with keys is measured by the same terms: the detour to the keys is in the effort, and the trips to the keys are in the cover.
 */
export type MazeDifficulty = {
  /** From 0 (a corridor) to 100 (the hardest maze in the lists), whole: the six terms' sum times the coverage factor, rounded once. */
  score: number;
  /** The same before it is rounded, so a list can be put in order finer than whole numbers. */
  exact: number;
  /** The six terms' weighted sum before the coverage factor, from 0 to 100: what the score was before 3.0.0. */
  base: number;
  /** How much of the map the answer covers (see `coverageOf`) and what the score was multiplied by. */
  coverage: MazeCoverage;
  /** Each term as a share from 0 to 1, before it is weighted. */
  terms: { reach: number; forks: number; traps: number; waste: number; depth: number; turns: number };
  /** Whether the straight guess walks straight to the goal without ever entering a wrong branch. */
  straight: boolean;
  /** Forks on the way where the straight guess takes the wrong passage. */
  traps: number;
  /** Cells outside the way that the straight guess draws before it gets to the goal. */
  waste: number;
  /** Bends on the way. */
  turns: number;
  /** What `measureMaze` says, so one call has everything. */
  measure: MazeMeasure;
};

/** What each term is weighed by in the score; they add to 1. */
export const DIFFICULTY_WEIGHTS = { reach: 0.4, forks: 0.15, traps: 0.15, waste: 0.15, depth: 0.075, turns: 0.075 } as const;

/** The count at which a term reaches its full weight, on its log scale. */
export const DIFFICULTY_CEILINGS = { forks: 400, traps: 160, waste: 4500, depth: 1100, turns: 1300 } as const;

/** A heading change bigger than this, in radians (25 degrees), is a bend. */
const BEND = (25 * Math.PI) / 180;

const share = (count: number, ceiling: number): number => Math.min(1, Math.log(1 + count) / Math.log(1 + ceiling));

/**
 * How a maze lies in space, which is all the measure needs to know of it besides the passages: how far a cell is from the goal (any measure that
 * rises with distance will do, the squared distance is cheapest) and how far the line bends going from one cell through another to a third, in
 * radians from 0 (straight on) to pi (back the way it came). A flat maze reads these off its cell centres; a maze over a solid reads them in
 * three dimensions.
 */
export type MazeGeometry = {
  /** Where each cell lies: two numbers for a flat maze, three for a solid. The cover reads it. */
  readonly points: readonly (readonly number[])[];
  distanceToGoal(cell: number): number;
  bend(before: number, cell: number, after: number): number;
};

/** The geometry of a flat maze: its cell centres on the page. */
function flatGeometry(maze: Maze): MazeGeometry {
  const { centres } = maze.grid;
  const [gx, gy] = centres[maze.goal]!;
  return {
    points: centres,
    distanceToGoal: (cell) => (centres[cell]![0] - gx) ** 2 + (centres[cell]![1] - gy) ** 2,
    bend: (before, cell, after) => {
      const [px, py] = centres[before]!;
      const [cx, cy] = centres[cell]!;
      const [nx, ny] = centres[after]!;
      const turn = Math.abs(Math.atan2(ny - cy, nx - cx) - Math.atan2(cy - py, cx - px));
      return turn > Math.PI ? 2 * Math.PI - turn : turn;
    },
  };
}

/** Walk the straight guess from the start: always the open passage nearest the goal, backing out of dead ends, and count the wrong cells entered. */
function straightGuess(maze: MazeCore, onWay: Uint8Array, distance: (cell: number) => number): number {
  const seen = new Uint8Array(maze.links.length);
  let wasted = 0;
  const stack: number[] = [maze.start];
  seen[maze.start] = 1;
  while (stack.length > 0) {
    const cell = stack[stack.length - 1]!;
    if (cell === maze.goal) break;
    const options = maze.links[cell]!.filter((next) => seen[next] === 0).sort((a, b) => distance(a) - distance(b) || a - b);
    const next = options[0];
    if (next === undefined) {
      stack.pop();
      continue;
    }
    seen[next] = 1;
    if (onWay[next] === 0) wasted += 1;
    stack.push(next);
  }
  return wasted;
}

/** How hard a maze is, from 0 to 100, and what that is made of. */
export function difficultyOf(maze: Maze): MazeDifficulty {
  return difficultyOfGraph(maze, flatGeometry(maze));
}

/** The same for any maze, flat or over a solid, given how it lies in space (`MazeGeometry`). `difficultyOf` is this with a flat maze's own. */
export function difficultyOfGraph(maze: MazeCore, geometry: MazeGeometry): MazeDifficulty {
  const measure = measureMaze(maze);
  const way = solutionOf(maze);
  const onWay = new Uint8Array(maze.links.length);
  for (const cell of way) onWay[cell] = 1;
  const { links } = maze;
  const distance = geometry.distanceToGoal;
  // The forks where the cell nearest the goal is not the next cell of the way.
  let traps = 0;
  let turns = 0;
  for (let at = 0; at < way.length - 1; at += 1) {
    const cell = way[at]!;
    const open = links[cell]!.filter((next) => next !== way[at - 1]);
    if (open.length > 1) {
      const best = [...open].sort((a, b) => distance(a) - distance(b) || a - b)[0]!;
      if (best !== way[at + 1]) traps += 1;
    }
    if (at > 0 && geometry.bend(way[at - 1]!, cell, way[at + 1]!) > BEND) turns += 1;
  }
  const waste = straightGuess(maze, onWay, distance);
  const reach = Math.min(1, Math.max(0, Math.log(measure.effort / 9) / Math.log(5400 / 9)));
  const terms = {
    reach,
    forks: share(measure.decisions, DIFFICULTY_CEILINGS.forks),
    traps: share(traps, DIFFICULTY_CEILINGS.traps),
    waste: share(waste, DIFFICULTY_CEILINGS.waste),
    depth: share(measure.longestBranch, DIFFICULTY_CEILINGS.depth),
    turns: share(turns, DIFFICULTY_CEILINGS.turns),
  };
  const raw = terms.reach * DIFFICULTY_WEIGHTS.reach + terms.forks * DIFFICULTY_WEIGHTS.forks + terms.traps * DIFFICULTY_WEIGHTS.traps + terms.waste * DIFFICULTY_WEIGHTS.waste + terms.depth * DIFFICULTY_WEIGHTS.depth + terms.turns * DIFFICULTY_WEIGHTS.turns;
  const base = Math.min(100, Math.max(0, 100 * raw));
  // The cells the answer draws: the way to the goal, and the way to each key.
  const route = new Set<number>(way);
  if (maze.keys.length > 0) {
    const { before } = walk(maze.links, maze.start);
    for (const key of maze.keys) for (let cell = key; cell !== -1 && !route.has(cell); cell = before[cell]!) route.add(cell);
  }
  const coverage = coverageOf(geometry.points, [...route]);
  const exact = base * coverage.factor;
  return { score: Math.round(exact), exact, base, coverage, terms, straight: waste === 0, traps, waste, turns, measure };
}

/**
 * The least a maze must have to be a level at all, wherever it is in a list (`isTooEasy`): the straight guess draws at least four cells it did
 * not need, is wrong at two forks or more, and the way has three places to choose, three wrong branches and four dead ends. Below any of these a
 * maze is pointed at the goal and walked.
 */
export const MEIKYUU_LEAST = { waste: 4, traps: 2, decisions: 3, branches: 3, deadEnds: 4 } as const;

/** How far up a size the easy third reaches: its first 86 places. */
export const MEIKYUU_EASY_PLACES = 86;

/**
 * What the easy third asks for beyond the least, rising through it so that it climbs: at place `place` (from 1) of a size, a maze has at
 * least this many traps, forks and wasted cells, and from the end of the easy third the least. Level 1 asks only for the least; level 86
 * asks for 3 traps, 5 forks and 8 wasted cells. A place of a size with no easy third, such as the huge ones, passes it without trying.
 */
export function easyFloorAt(place: number): { traps: number; decisions: number; waste: number } {
  const k = Math.min(Math.max(place, 1), MEIKYUU_EASY_PLACES);
  return { traps: MEIKYUU_LEAST.traps + Math.floor(k / 45), decisions: MEIKYUU_LEAST.decisions + Math.floor(k / 30), waste: MEIKYUU_LEAST.waste + Math.floor(k / 20) };
}

/** Whether a maze is too easy to be a level: it falls short of any of `MEIKYUU_LEAST`, or, with a `place` in the easy third of a size, of `easyFloorAt(place)`. */
export function isTooEasy(difficulty: MazeDifficulty, place?: number): boolean {
  const { measure } = difficulty;
  if (difficulty.waste < MEIKYUU_LEAST.waste || difficulty.traps < MEIKYUU_LEAST.traps || measure.decisions < MEIKYUU_LEAST.decisions || measure.branches < MEIKYUU_LEAST.branches || measure.deadEnds < MEIKYUU_LEAST.deadEnds) return true;
  if (place === undefined || place > MEIKYUU_EASY_PLACES) return false;
  const floor = easyFloorAt(place);
  return difficulty.traps < floor.traps || measure.decisions < floor.decisions || difficulty.waste < floor.waste;
}
