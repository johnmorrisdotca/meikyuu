/**
 * Meikyuu, played in a page: `mountMeikyuu` draws a maze, an arrow puzzle or a mixed one into any element and
 * plays it by touch and mouse, with zoom and pan for big mazes, Undo, Restart, Hint, a celebration that respects
 * `prefers-reduced-motion`, optional sounds, and the words in English and Japanese. A separate entry
 * (`@johnmorrisdotca/meikyuu/play`), so a server never loads any of it.
 */
export { ensureMeikyuuPlayStyle, mountMeikyuu, puzzleOf } from "./mount.ts";
export type { MeikyuuEventDetail, MeikyuuMount, MeikyuuMountOptions, MeikyuuPuzzle } from "./mount.ts";
export { MEIKYUU_PLAY_STYLE } from "./playStyle.ts";
export { createMeikyuuSounds, MEIKYUU_SOUND_KINDS } from "./sound.ts";
export type { MeikyuuSoundKind, MeikyuuSounds } from "./sound.ts";
export { EDGE, EDGE_STEP, fitView, isFitted, keptView, MOST_CELL_PIXELS, pannedBy, pointAt, scaleLimits, viewBoxOf, visibleArea, zoomedAbout, edgeNudge } from "./viewport.ts";
export type { View, ViewBox } from "./viewport.ts";
