/**
 * COLOSSAL MAZES: the biggest the lists go, about ten thousand cells, where the biggest huge ones have 8,923 and most are far smaller. There
 * are two lists, both in `@johnmorrisdotca/meikyuu/levels/colossal` (src/levels-colossal.ts): the square ones, a hundred cells across or so in
 * every shape the other lists have, and the tall ones for a phone held upright, 64 cells across and 96 down (a container two to three, as
 * `tall.ts` has it). They are recipes like every other level, so a list of them is a few kilobytes and the maze itself is made from its
 * seed in the browser in a few hundredths of a second, never stored.
 */

/** How many levels each colossal list has: eight pages of sixteen. */
export const MEIKYUU_COLOSSAL_PER_LIST = 128;

/** The cells a square colossal level has, least and most: a hundred by a hundred is 10,000. */
export const COLOSSAL_CELLS = [9500, 12000] as const;

/** How many cells across a tall colossal level is, and its rows (a square maze of it is 64 by 96, 6,144 cells). */
export const COLOSSAL_TALL_WIDTH = 64;
export const COLOSSAL_TALL_HEIGHT = 96;
