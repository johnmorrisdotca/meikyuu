/**
 * HOW A LIST OF 256 NEW LEVELS IS CHOSEN (`scripts/meikyuu-tall.ts`): the list is a ramp, one step of the effort for each place, from the
 * gentlest maze that is good enough to the hardest in a pool, and each place takes the maze nearest its step, avoiding the shapes, ways
 * to play and dimensions that the places just before it had. Every choice is a number, so the same run writes the same list.
 */
import type { Candidate } from "./levels-lib.ts";

export type ListOptions = {
  /** How many levels the list has. */
  count: number;
  /** Mazes to take the places from. */
  pool: readonly Candidate[];
  /** Whether a maze may be a level of this list at all. */
  allowed: (c: Candidate) => boolean;
  /** The effort of the first place and of the last, when not the 1st and the 99.5th percentile of what is allowed. */
  from?: number;
  to?: number;
  /** Whether a maze may take the place `place` (from 1) of the list; the place is a few ahead of the pick, since the list is put in order afterwards (ten, to be safe). */
  okAt?: (c: Candidate, place: number) => boolean;
};

export type Listed = { levels: Candidate[]; steps: { biggest: number; mean: number } };

/** What each neighbour among the eight before that is the same shape, way to play or algorithm costs a candidate, in steps of the ramp. */
const CROWD = { shape: 1.5, mode: 1, algorithm: 0.5 };
/** What each earlier level of exactly the same shape and dimensions costs, in steps. */
const REPEAT = 0.05;

/** The list: one level for each step of the ramp. */
export function chooseList(options: ListOptions): Listed {
  const { count, allowed } = options;
  const seen = new Set<string>();
  const all: Candidate[] = [];
  for (const c of options.pool) {
    if (!allowed(c) || seen.has(c.same)) continue;
    seen.add(c.same);
    all.push(c);
  }
  const order = (a: Candidate, b: Candidate): number => a.effort - b.effort || a.cells - b.cells || (a.code < b.code ? -1 : 1);
  all.sort(order);
  const quantile = (p: number): number => all[Math.min(all.length - 1, Math.floor(all.length * p))]!.effort;
  const from = options.from ?? quantile(0.01);
  const to = options.to ?? quantile(0.995);
  const step = (to - from) / (count - 1);
  const taken = new Uint8Array(all.length);
  const picked: Candidate[] = [];
  const used = new Map<string, number>();
  for (let place = 0; place < count; place += 1) {
    const target = from + ((to - from) * place) / (count - 1);
    let low = 0;
    let high = all.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (all[middle]!.effort < target) low = middle + 1;
      else high = middle;
    }
    let best = -1;
    let bestCost = Infinity;
    const recent = picked.slice(-8);
    for (let reach = 0; reach < 3 || best < 0; reach += 1) {
      const window = 60 * 4 ** reach;
      for (let i = Math.max(0, low - window); i < Math.min(all.length, low + window); i += 1) {
        if (taken[i] === 1) continue;
        const c = all[i]!;
        if (options.okAt !== undefined && !options.okAt(c, place + 10)) continue;
        let cost = (Math.abs(c.effort - target) / step) + REPEAT * (used.get(`${c.recipe.shape}:${c.recipe.w}x${c.recipe.h}`) ?? 0);
        for (const r of recent) {
          if (r.recipe.shape === c.recipe.shape) cost += CROWD.shape;
          if (r.recipe.mode === c.recipe.mode) cost += CROWD.mode;
          if (r.recipe.algorithm === c.recipe.algorithm) cost += CROWD.algorithm;
        }
        if (cost < bestCost) {
          bestCost = cost;
          best = i;
        }
      }
      if (window > all.length) break;
    }
    if (best < 0) throw new Error(`the pool ran out at place ${place + 1} of ${count}`);
    taken[best] = 1;
    picked.push(all[best]!);
    const r = all[best]!.recipe;
    used.set(`${r.shape}:${r.w}x${r.h}`, (used.get(`${r.shape}:${r.w}x${r.h}`) ?? 0) + 1);
  }
  picked.sort(order);
  const steps = picked.slice(1).map((c, i) => c.effort - picked[i]!.effort);
  return { levels: picked, steps: { biggest: Math.max(...steps), mean: steps.reduce((a, b) => a + b, 0) / steps.length } };
}
