/**
 * A maze over a solid, played in a page: `mountSolid` draws a cube, a globe or a solid of triangles with a maze over its surface into any element and
 * plays it by touch and mouse. A separate entry (`@johnmorrisdotca/meikyuu/3d/play`), so a server never loads any of it.
 */
export { ensureSolidStyle, mountSolid } from "./solid/solidMount.ts";
export type { SolidCellPlace, SolidEventDetail, SolidMount, SolidMountOptions } from "./solid/solidMount.ts";
export { SOLID_PLAY_STYLE } from "./solid/solidStyle.ts";
