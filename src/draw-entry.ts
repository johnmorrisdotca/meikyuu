/**
 * Meikyuu's drawing: a maze or an arrow board as SVG text, with its boards, its line colours, the style that
 * gives the drawing its look, and the words it says in English and Japanese. A separate entry
 * (`@johnmorrisdotca/meikyuu/draw`), so a server that only builds mazes never loads any of it.
 */
export { boardLookOf, drawMaze, lookAttributes, lookStyle, marksOf } from "./draw.ts";
export type { DrawMazeOptions, MazeLook } from "./draw.ts";
export { arrowColour, arrowMarkup, drawArrows } from "./drawArrows.ts";
export type { DrawArrowsOptions } from "./drawArrows.ts";
export { MEIKYUU_ARROW_COLOURS, MEIKYUU_BOARD_NAMES, MEIKYUU_BOARDS, MEIKYUU_TRAIL_NAMES, MEIKYUU_TRAILS } from "./boards.ts";
export type { MeikyuuBoardLook, MeikyuuBoardName, MeikyuuTrailName } from "./boards.ts";
export { doorPlace, fixed, framed, linePath, standingWalls, wallPath } from "./geometry.ts";
export { MEIKYUU_STYLE } from "./style.ts";
export { MEIKYUU_STRINGS, meikyuuLanguageOf, meikyuuSay } from "./strings.ts";
export type { MeikyuuLanguage } from "./strings.ts";
