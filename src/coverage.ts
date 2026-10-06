/**
 * HOW MUCH OF THE MAP THE ANSWER COVERS (`coverageOf`): the second half of a maze's difficulty. The first half (`difficultyOf`'s six terms) counts what
 * a person meets on the way: forks, traps, wrong turns, bends, the size of it all. It cannot tell a maze whose answer crosses the whole map from one
 * of the very same size whose answer stays in a corner and a short arm, and the second is the easier to play. John, 2026-10-06: a Huge cross maze
 * whose answer sat in the middle and one arm, 134 cells of 4,736, read four dots of five. The family's rule, written once for every package with levels
 * (LEVELS-STANDARD.md in johnmorrisdotca/.github), is: **a level's difficulty counts how much of the map its answer covers.**
 *
 * Here that is two shares, each from 0 to 1, counted off the cell centres and the answer, so they are the same in every engine:
 *
 * - `bbox`: the box that holds the answer (and the trips to its keys) over the box that holds the maze, along each axis, as a geometric mean over the axes
 *   (two for a flat maze, three for a solid). An answer that stays on one side has a thin box.
 * - `zones`: the maze is cut into a grid of zones, 2 by 2 under 150 cells, 3 by 3 under 800 and 4 by 4 above (2 by 2 by 2 under 200 cells and 3 by 3 by 3
 *   above, for a solid), and a zone counts as visited when the answer has at least `ZONE_VISIT` cells in it. A zone with less than a quarter of an average
 *   zone's cells is left out, so a cross is cut to its arms and a ring to its ring. The share is of the cells' area, not of the zones. A solid's is divided
 *   by `SOLID_ZONES_TOP` (clamped to 1): a shell has no inside, so even a tour of all of it touches only about three quarters of the three-dimensional zones.
 *
 * `cover` is the two averaged, with the bottom fifth taken off and the rest stretched to 0 to 1 (`(0.5 * bbox + 0.5 * zones - 0.2) / 0.7`, held between 0
 * and 1), and `factor` is `0.5 + 0.5 * cover`: the difficulty is multiplied by it. A maze whose answer covers the map keeps its score; one whose answer stays
 * in a corner counts for half. It is a factor and not a seventh term, because a term added would give every small maze a bonus (a small maze is covered by any
 * answer) and a factor leaves them alone. docs/LEVELS.md explains the choices and the numbers.
 */
export type MazeCoverage = {
  /** The answer's box over the maze's, from 0 to 1. */
  bbox: number;
  /** The share of the map's area, in zones the answer visits, from 0 to 1. */
  zones: number;
  /** The two, averaged and stretched, from 0 (a corner) to 1 (the whole map). */
  cover: number;
  /** What the score is multiplied by: 0.5 at no cover, 1 at all of it. */
  factor: number;
};

/** The cells of the answer a zone must hold to be visited. */
export const ZONE_VISIT = 2;
/** A zone with less than this share of an average zone's cells is not a zone (a cross's corners, a ring's hole). */
export const ZONE_REAL = 0.25;
/** Where `cover` begins to rise and how far it rises: `(mean - COVER_FROM) / COVER_SPAN`. */
export const COVER_FROM = 0.2;
export const COVER_SPAN = 0.7;
/** What the score is multiplied by at no cover at all. */
export const COVERAGE_FLOOR = 0.5;
/** How much of a solid's zones even a whole tour touches. */
export const SOLID_ZONES_TOP = 0.75;

/** How many zones along each axis a map of `cells` is cut into: a flat map by 2, 3 or 4, a solid by 2 or 3. */
export function zonesAcross(cells: number, dimensions: number): number {
  if (dimensions >= 3) return cells < 200 ? 2 : 3;
  return cells < 150 ? 2 : cells < 800 ? 3 : 4;
}

/**
 * How much of a map an answer covers. `points` is where each cell lies (two numbers for a flat maze, three for a solid); `route` is the cells the
 * answer draws, the way to the goal and the way to each key. Pure.
 */
export function coverageOf(points: readonly (readonly number[])[], route: readonly number[]): MazeCoverage {
  const cells = points.length;
  const dimensions = points[0]?.length ?? 2;
  const lo: number[] = new Array(dimensions).fill(Infinity);
  const hi: number[] = new Array(dimensions).fill(-Infinity);
  for (const point of points) {
    for (let axis = 0; axis < dimensions; axis += 1) {
      lo[axis] = Math.min(lo[axis]!, point[axis]!);
      hi[axis] = Math.max(hi[axis]!, point[axis]!);
    }
  }
  const extent = lo.map((low, axis) => hi[axis]! - low);

  // The box of the answer over the box of the maze, a geometric mean over the axes; an axis the maze has no extent along counts as whole.
  const rlo: number[] = new Array(dimensions).fill(Infinity);
  const rhi: number[] = new Array(dimensions).fill(-Infinity);
  for (const cell of route) {
    for (let axis = 0; axis < dimensions; axis += 1) {
      rlo[axis] = Math.min(rlo[axis]!, points[cell]![axis]!);
      rhi[axis] = Math.max(rhi[axis]!, points[cell]![axis]!);
    }
  }
  let product = 1;
  for (let axis = 0; axis < dimensions; axis += 1) product *= extent[axis]! > 0 ? Math.max(0, rhi[axis]! - rlo[axis]!) / extent[axis]! : 1;
  const bbox = route.length === 0 ? 0 : Math.pow(product, 1 / dimensions);

  // The zones, each as a number made of its position along every axis.
  const across = zonesAcross(cells, dimensions);
  const zoneOf = (point: readonly number[]): number => {
    let zone = 0;
    for (let axis = 0; axis < dimensions; axis += 1) {
      const place = extent[axis]! > 0 ? (point[axis]! - lo[axis]!) / extent[axis]! : 0;
      zone = zone * across + Math.min(across - 1, Math.floor(place * across));
    }
    return zone;
  };
  const population = new Map<number, number>();
  for (const point of points) {
    const zone = zoneOf(point);
    population.set(zone, (population.get(zone) ?? 0) + 1);
  }
  const mean = cells / Math.max(1, population.size);
  const real = new Set<number>();
  for (const [zone, count] of population) if (count >= ZONE_REAL * mean) real.add(zone);
  const drawn = new Map<number, number>();
  for (const cell of route) {
    const zone = zoneOf(points[cell]!);
    if (real.has(zone)) drawn.set(zone, (drawn.get(zone) ?? 0) + 1);
  }
  let seen = 0;
  let whole = 0;
  for (const zone of real) {
    const count = population.get(zone)!;
    whole += count;
    if ((drawn.get(zone) ?? 0) >= ZONE_VISIT) seen += count;
  }
  const share = whole === 0 ? 0 : seen / whole;
  const zones = Math.min(1, dimensions >= 3 ? share / SOLID_ZONES_TOP : share);

  const cover = Math.min(1, Math.max(0, (0.5 * bbox + 0.5 * zones - COVER_FROM) / COVER_SPAN));
  return { bbox, zones, cover, factor: COVERAGE_FLOOR + (1 - COVERAGE_FLOOR) * cover };
}
