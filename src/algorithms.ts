import type { Grid } from "./grid.ts";
import { below, shuffled, type Random } from "./random.ts";

/**
 * THE SEVEN WAYS TO MAKE A PERFECT MAZE, each over any grid: a perfect maze is a spanning tree of
 * the cells, so there is exactly one way between any two of them. They differ in the texture of
 * what they make, which is written up in docs/MAZES.md:
 *
 * - `backtracker`: walk till stuck, then back up. Long winding passages, few dead ends.
 * - `hunt`: hunt-and-kill. Much the same, a little less winding.
 * - `growing`: growing tree, taking the newest cell half the time and a random one the rest: in between.
 * - `prim`: randomized Prim, taking a random edge from the frontier. Very many short dead ends.
 * - `kruskal`: joins random edges that join different pieces. Many short dead ends, evenly spread.
 * - `wilson`: loop-erased random walks. Every maze equally likely, so no texture of its own.
 * - `eller`: one row at a time. Squares only: it needs rows.
 *
 * They return each cell's open neighbours. Nothing here reads a cell's position.
 */
export const MEIKYUU_ALGORITHMS = ["backtracker", "hunt", "growing", "prim", "kruskal", "wilson", "eller"] as const;
export type MeikyuuAlgorithm = (typeof MEIKYUU_ALGORITHMS)[number];

/** Each cell's open neighbours. */
export type Links = number[][];

/**
 * What a generator reads of a grid: how many cells there are and which are beside which. A `Grid` is one, and so is the surface of a solid
 * (`@johnmorrisdotca/meikyuu/3d`); `shape`, `w` and `h` are only for Eller's algorithm, which needs rows and so makes square mazes.
 */
export type CellGraph = Pick<Grid, "cells" | "neighbours" | "w" | "h"> & { readonly shape: string };

function emptyLinks(cells: number): Links {
  return Array.from({ length: cells }, () => []);
}

function carve(links: Links, a: number, b: number): void {
  links[a]!.push(b);
  links[b]!.push(a);
}

function backtracker(grid: CellGraph, random: Random): Links {
  const links = emptyLinks(grid.cells);
  const seen = new Uint8Array(grid.cells);
  const first = below(random, grid.cells);
  const stack = [first];
  seen[first] = 1;
  while (stack.length > 0) {
    const cell = stack[stack.length - 1]!;
    const open = grid.neighbours[cell]!.filter((next) => seen[next] === 0);
    if (open.length === 0) {
      stack.pop();
      continue;
    }
    const next = open[below(random, open.length)]!;
    carve(links, cell, next);
    seen[next] = 1;
    stack.push(next);
  }
  return links;
}

function growing(grid: CellGraph, random: Random, newest: number): Links {
  const links = emptyLinks(grid.cells);
  const seen = new Uint8Array(grid.cells);
  const first = below(random, grid.cells);
  const active = [first];
  seen[first] = 1;
  while (active.length > 0) {
    const at = random() < newest ? active.length - 1 : below(random, active.length);
    const cell = active[at]!;
    const open = grid.neighbours[cell]!.filter((next) => seen[next] === 0);
    if (open.length === 0) {
      active[at] = active[active.length - 1]!;
      active.pop();
      continue;
    }
    const next = open[below(random, open.length)]!;
    carve(links, cell, next);
    seen[next] = 1;
    active.push(next);
  }
  return links;
}

function hunt(grid: CellGraph, random: Random): Links {
  const links = emptyLinks(grid.cells);
  const seen = new Uint8Array(grid.cells);
  let cell = below(random, grid.cells);
  seen[cell] = 1;
  let scan = 0;
  for (;;) {
    const open = grid.neighbours[cell]!.filter((next) => seen[next] === 0);
    if (open.length > 0) {
      const next = open[below(random, open.length)]!;
      carve(links, cell, next);
      seen[next] = 1;
      cell = next;
      continue;
    }
    // Hunt: the first cell not yet reached that touches one that was, and join them.
    let found = -1;
    // Everything before the first cell not yet reached is done with, so the hunt starts there.
    while (scan < grid.cells && seen[scan] === 1) scan += 1;
    for (let at = scan; at < grid.cells; at += 1) {
      if (seen[at] === 1) continue;
      const joined = grid.neighbours[at]!.filter((next) => seen[next] === 1);
      if (joined.length > 0) {
        found = at;
        carve(links, at, joined[below(random, joined.length)]!);
        break;
      }
    }
    if (found < 0) return links;
    seen[found] = 1;
    cell = found;
  }
}

function prim(grid: CellGraph, random: Random): Links {
  const links = emptyLinks(grid.cells);
  const seen = new Uint8Array(grid.cells);
  const frontier: [number, number][] = [];
  const take = (cell: number): void => {
    seen[cell] = 1;
    for (const next of grid.neighbours[cell]!) if (seen[next] === 0) frontier.push([cell, next]);
  };
  take(below(random, grid.cells));
  while (frontier.length > 0) {
    const at = below(random, frontier.length);
    const [from, to] = frontier[at]!;
    frontier[at] = frontier[frontier.length - 1]!;
    frontier.pop();
    if (seen[to] === 1) continue;
    carve(links, from, to);
    take(to);
  }
  return links;
}

function kruskal(grid: CellGraph, random: Random): Links {
  const links = emptyLinks(grid.cells);
  const parent = Int32Array.from({ length: grid.cells }, (_, i) => i);
  const find = (cell: number): number => {
    let root = cell;
    while (parent[root] !== root) root = parent[root]!;
    for (let c = cell; parent[c] !== root; ) {
      const up = parent[c]!;
      parent[c] = root;
      c = up;
    }
    return root;
  };
  const edges: [number, number][] = [];
  for (let cell = 0; cell < grid.cells; cell += 1) for (const next of grid.neighbours[cell]!) if (next > cell) edges.push([cell, next]);
  for (const [a, b] of shuffled(edges, random)) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) continue;
    parent[ra] = rb;
    carve(links, a, b);
  }
  return links;
}

function wilson(grid: CellGraph, random: Random): Links {
  const links = emptyLinks(grid.cells);
  const inTree = new Uint8Array(grid.cells);
  const next = new Int32Array(grid.cells).fill(-1);
  inTree[below(random, grid.cells)] = 1;
  for (const first of shuffled(Array.from({ length: grid.cells }, (_, i) => i), random)) {
    if (inTree[first] === 1) continue;
    // Walk at random until the tree is met, remembering only where each cell was last left toward: that erases loops.
    let cell = first;
    while (inTree[cell] === 0) {
      const around = grid.neighbours[cell]!;
      next[cell] = around[below(random, around.length)]!;
      cell = next[cell]!;
    }
    for (cell = first; inTree[cell] === 0; cell = next[cell]!) {
      inTree[cell] = 1;
      carve(links, cell, next[cell]!);
    }
  }
  return links;
}

function eller(grid: CellGraph, random: Random): Links {
  if (grid.shape !== "square") throw new Error("Eller's algorithm works a row at a time, so it makes square mazes only");
  const { w, h } = grid;
  const links = emptyLinks(grid.cells);
  let sets = new Int32Array(w).fill(-1);
  let nextSet = 0;
  for (let row = 0; row < h; row += 1) {
    for (let x = 0; x < w; x += 1) if (sets[x] === -1) sets[x] = nextSet++;
    const last = row === h - 1;
    for (let x = 0; x < w - 1; x += 1) {
      if (sets[x] === sets[x + 1]) continue;
      if (last || random() < 0.5) {
        const gone = sets[x + 1]!;
        const keep = sets[x]!;
        for (let k = 0; k < w; k += 1) if (sets[k] === gone) sets[k] = keep;
        carve(links, row * w + x, row * w + x + 1);
      }
    }
    if (last) break;
    const below_ = new Int32Array(w).fill(-1);
    const members = new Map<number, number[]>();
    for (let x = 0; x < w; x += 1) members.set(sets[x]!, [...(members.get(sets[x]!) ?? []), x]);
    for (const [set, columns] of members) {
      // Every set sends at least one cell down; the rest each do with a chance.
      const must = columns[below(random, columns.length)]!;
      for (const x of columns) {
        if (x === must || random() < 0.35) {
          carve(links, row * w + x, (row + 1) * w + x);
          below_[x] = set;
        }
      }
    }
    sets = below_;
  }
  return links;
}

/** The open neighbours of every cell, for a perfect maze of the grid made by this algorithm from this stream. */
export function carveMaze(grid: CellGraph, algorithm: MeikyuuAlgorithm, random: Random): Links {
  switch (algorithm) {
    case "backtracker":
      return backtracker(grid, random);
    case "hunt":
      return hunt(grid, random);
    case "growing":
      return growing(grid, random, 0.5);
    case "prim":
      return prim(grid, random);
    case "kruskal":
      return kruskal(grid, random);
    case "wilson":
      return wilson(grid, random);
    case "eller":
      return eller(grid, random);
  }
}
