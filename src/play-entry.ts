/**
 * Meikyuu, played in a page: `mountMeikyuu` draws a maze, an arrow puzzle or a mixed one into any element and
 * plays it by touch and mouse, with zoom and pan for big mazes, page left beside the board to scroll by, a tall maze that lies down on a wide screen, Undo, Restart, Hint, a celebration that respects
 * `prefers-reduced-motion`, optional sounds, and the words in English and Japanese. A separate entry
 * (`@johnmorrisdotca/meikyuu/play`), so a server never loads any of it.
 */

export type { MeikyuuEventDetail, MeikyuuMount, MeikyuuMountOptions, MeikyuuPuzzle } from "./mount.ts";
export {
  ensureMeikyuuPlayStyle,
  MEIKYUU_GUTTER,
  MEIKYUU_GUTTER_MAX,
  MEIKYUU_RESERVE,
  mountMeikyuu,
  puzzleOf,
} from "./mount.ts";
export type { MeikyuuOrientation } from "./orientation.ts";
export { MEIKYUU_ORIENTATIONS } from "./orientation.ts";
export { MEIKYUU_PLAY_STYLE } from "./playStyle.ts";
export type { MeikyuuSoundKind, MeikyuuSounds } from "./sound.ts";
export { createMeikyuuSounds, MEIKYUU_SOUND_KINDS } from "./sound.ts";
export type { FitMode, View, ViewBox } from "./viewport.ts";
export {
  EDGE,
  EDGE_STEP,
  edgeNudge,
  FIT_MODES,
  fitView,
  isFitted,
  keptView,
  MOST_CELL_PIXELS,
  pannedBy,
  pointAt,
  scaleLimits,
  viewBoxOf,
  visibleArea,
  zoomedAbout,
} from "./viewport.ts";
