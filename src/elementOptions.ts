import type { MeikyuuMountOptions } from "./mount.ts";

/** The real mounted-board options, checked by TypeScript and the embed builder.
 * @example
 * ```ts
 * import { MEIKYUU_EMBED_OPTION_KEYS } from "@johnmorrisdotca/meikyuu/element";
 * console.log(typeof MEIKYUU_EMBED_OPTION_KEYS); // object
 * ```
 */
export const MEIKYUU_EMBED_OPTION_KEYS = Object.keys({
  kind: true,
  level: true,
  recipe: true,
  tap: true,
  hints: true,
  banner: true,
  controls: true,
  zoom: true,
  ratio: true,
  orientation: true,
  gutter: true,
  reserve: true,
  fit: true,
  edgePan: true,
  pan: true,
  turnButton: true,
  sound: true,
  stones: true,
  language: true,
  board: true,
  trail: true,
  wall: true,
  line: true,
  onMove: true,
  onSolve: true,
  onKey: true,
  onUnlock: true,
  onBump: true,
  onLose: true,
  onStones: true,
} satisfies Record<keyof MeikyuuMountOptions, boolean>);
/** Host callbacks; the same actions emit native events.
 * @example
 * ```ts
 * import type { MeikyuuElementOptions } from "@johnmorrisdotca/meikyuu/element";
 * const options: MeikyuuElementOptions = {};
 * console.log(Object.keys(options).length); // 0
 * ```
 */
export type MeikyuuElementOptions = Pick<
  MeikyuuMountOptions,
  | "onMove"
  | "onSolve"
  | "onKey"
  | "onUnlock"
  | "onBump"
  | "onLose"
  | "onStones"
  | "wall"
  | "line"
  | "board"
  | "trail"
  | "recipe"
>;
