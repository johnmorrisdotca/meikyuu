/**
 * SEEDED RANDOMNESS, the one thing every maze is made from.
 *
 * mulberry32: small, fast, integer arithmetic only, and the same stream for the
 * same seed in every browser and every Node. A level is stored as a recipe
 * (shape, size, algorithm, mode, seed) and rebuilt from this stream, so it must
 * never change: `random.test.ts` pins its first numbers, and `levels.*.test.ts`
 * rebuilds every level and checks what it measures.
 *
 * Nothing here is a credential: it is for mazes, not secrets.
 */

/** A number in [0, 1), like `Math.random`, from a stream a seed fixes.
 *
 * @example
 * ```ts
 * import type { Random } from "@johnmorrisdotca/meikyuu";
 * import { seededRandom } from "@johnmorrisdotca/meikyuu";
 *
 * const value: Random = seededRandom(42);
 * console.log(value);
 * ```
 */
export type Random = () => number;

/** A stream of numbers in [0, 1) fixed by a seed.
 *
 * @param seed - The reproducible native numeric seed.
 * @returns A stream of numbers in [0, 1) fixed by a seed.
 * @example
 * ```ts
 * import { seededRandom } from "@johnmorrisdotca/meikyuu";
 *
 * console.log(seededRandom(42)());
 * ```
 */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole number in [0, n) from the stream. `n` must be at least 1.
 *
 * @param random - A random source returning values in [0,1).
 * @param n - The level number, random bound or surface subdivision specified by the signature.
 * @returns A whole number in [0, n) from the stream. `n` must be at least 1.
 * @example
 * ```ts
 * import { below, seededRandom } from "@johnmorrisdotca/meikyuu";
 *
 * console.log(below(seededRandom(42),10));
 * ```
 */
export function below(random: Random, n: number): number {
  return Math.floor(random() * n);
}

/** One of the items, chosen from the stream.
 *
 * @param items - Items to pick from or copy/shuffle.
 * @param random - A random source returning values in [0,1).
 * @returns One of the items, chosen from the stream.
 * @example
 * ```ts
 * import { pick, seededRandom } from "@johnmorrisdotca/meikyuu";
 *
 * console.log(pick(["A","B","C"],seededRandom(42)));
 * ```
 */
export function pick<T>(items: readonly T[], random: Random): T {
  return items[below(random, items.length)]!;
}

/** A copy of the list in a random order (Fisher–Yates); the list given is left alone.
 *
 * @param items - Items to pick from or copy/shuffle.
 * @param random - A random source returning values in [0,1).
 * @returns A copy of the list in a random order (Fisher–Yates); the list given is left alone.
 * @example
 * ```ts
 * import { seededRandom, shuffled } from "@johnmorrisdotca/meikyuu";
 *
 * console.log(shuffled(["A","B","C"],seededRandom(42)));
 * ```
 */
export function shuffled<T>(items: readonly T[], random: Random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = below(random, i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
