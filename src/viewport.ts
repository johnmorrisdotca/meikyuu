import type { Box } from "./grid.ts";

/**
 * A BOARD LOOKED AT THROUGH A BOX, which may be zoomed in until a cell is as big as a thumb and
 * moved about: the arithmetic of the view, without a page. A view is the point of the board at the
 * box's top left corner and how many pixels a cell takes (`scale`); the board is drawn by setting an
 * SVG's `viewBox` to what `viewBoxOf` says. Everything here is a pure function of numbers.
 *
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze } from "@johnmorrisdotca/meikyuu";
 * import { fitView } from "@johnmorrisdotca/meikyuu/play";
 * import type { View } from "@johnmorrisdotca/meikyuu/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const box = {width:390,height:844,area:grid.box};
 * const view = fitView(box);
 * const value: View = view;
 * console.log(value);
 * ```
 */
export type View = { x: number; y: number; scale: number };

/** How a box of `width` by `height` pixels shows a board: the margin round it in cells, and how far in a view may go.
 *
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze } from "@johnmorrisdotca/meikyuu";
 * import type { ViewBox } from "@johnmorrisdotca/meikyuu/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const box = {width:390,height:844,area:grid.box};
 * const value: ViewBox = box;
 * console.log(value);
 * ```
 */
export type ViewBox = { width: number; height: number; area: Box };

/**
 * What a fit makes visible: `both` the whole board (default); `width` the board as wide as the box, which for a board taller than the box
 * is the top of it with the rest to move down to; `height` the board as tall as the box, the left of it for a board wider than the box.
 *
 * @example
 * ```ts
 * import { FIT_MODES } from "@johnmorrisdotca/meikyuu/play";
 * console.log(FIT_MODES);
 * ```
 */
export const FIT_MODES = ["both", "width", "height"] as const;
/** Fit both dimensions, only the width, or only the height of a board.
 *
 * @example
 * ```ts
 * import type { FitMode } from "@johnmorrisdotca/meikyuu/play";
 *
 * const value: FitMode = "both";
 * console.log(value);
 * ```
 */
export type FitMode = (typeof FIT_MODES)[number];

/** The view that shows the board as a mode says, with a margin of `pad` cells: centred where it fits, and at the top or left where it does not.
 *
 * @param box - The viewport dimensions and logical board bounds, or board bounds specified by the signature.
 * @param pad - The native SVG or viewport padding in drawing units/pixels specified by the signature.
 * @param mode - Fit both dimensions, width only or height only.
 * @returns The view that shows the board as a mode says, with a margin of `pad` cells: centred where it fits, and at the top or left where it does not.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze } from "@johnmorrisdotca/meikyuu";
 * import { fitView } from "@johnmorrisdotca/meikyuu/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const box = {width:390,height:844,area:grid.box};
 * console.log(fitView(box));
 * ```
 */
export function fitView(box: ViewBox, pad = 0.6, mode: FitMode = "both"): View {
  const across = box.width / (box.area.w + 2 * pad);
  const down = box.height / (box.area.h + 2 * pad);
  const scale = mode === "width" ? across : mode === "height" ? down : Math.min(across, down);
  const centreX = box.area.x + box.area.w / 2 - box.width / (2 * scale);
  const centreY = box.area.y + box.area.h / 2 - box.height / (2 * scale);
  // Where the board is bigger than the box in a direction, start at its near edge, not its middle.
  const x = box.area.w + 2 * pad > box.width / scale + 1e-9 ? box.area.x - pad : centreX;
  const y = box.area.h + 2 * pad > box.height / scale + 1e-9 ? box.area.y - pad : centreY;
  return { scale, x, y };
}

/** The scales a view may have: the whole board fitted, to a cell this many pixels wide (at least a bit past the fit, so a small maze can still zoom).
 *
 * @example
 * ```ts
 * import { MOST_CELL_PIXELS } from "@johnmorrisdotca/meikyuu/play";
 * console.log(MOST_CELL_PIXELS);
 * ```
 */
export const MOST_CELL_PIXELS = 72;

/** Read the minimum and maximum view scale for this viewport and gutter.
 *
 * @param box - The viewport dimensions and logical board bounds, or board bounds specified by the signature.
 * @param pad - The native SVG or viewport padding in drawing units/pixels specified by the signature.
 * @returns The least and most permitted scale for this viewport and gutter.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze } from "@johnmorrisdotca/meikyuu";
 * import { scaleLimits } from "@johnmorrisdotca/meikyuu/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const box = {width:390,height:844,area:grid.box};
 * console.log(scaleLimits(box));
 * ```
 */
export function scaleLimits(box: ViewBox, pad = 0.6): { least: number; most: number } {
  const fit = fitView(box, pad).scale;
  return { least: fit * 0.9, most: Math.max(fit * 2, MOST_CELL_PIXELS, fitView(box, pad, "width").scale, fitView(box, pad, "height").scale) };
}

/** A view kept where some of the board can be seen: its middle never leaves the area (with a margin).
 *
 * @param view - The current pan and scale.
 * @param box - The viewport dimensions and logical board bounds, or board bounds specified by the signature.
 * @param pad - The native SVG or viewport padding in drawing units/pixels specified by the signature.
 * @returns A view kept where some of the board can be seen: its middle never leaves the area (with a margin).
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze } from "@johnmorrisdotca/meikyuu";
 * import { fitView, keptView } from "@johnmorrisdotca/meikyuu/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const box = {width:390,height:844,area:grid.box};
 * const view = fitView(box);
 * console.log(keptView(view,box));
 * ```
 */
export function keptView(view: View, box: ViewBox, pad = 0.6): View {
  const { least, most } = scaleLimits(box, pad);
  const scale = Math.min(most, Math.max(least, view.scale));
  const spanX = box.width / scale;
  const spanY = box.height / scale;
  const middleX = Math.min(box.area.x + box.area.w + pad, Math.max(box.area.x - pad, view.x + spanX / 2));
  const middleY = Math.min(box.area.y + box.area.h + pad, Math.max(box.area.y - pad, view.y + spanY / 2));
  // A board that fits in the box stays centred: a view of the whole board has nothing to move over.
  const fits = box.area.w + 2 * pad <= spanX + 1e-9 && box.area.h + 2 * pad <= spanY + 1e-9;
  return {
    scale,
    x: (fits ? box.area.x + box.area.w / 2 : middleX) - spanX / 2,
    y: (fits ? box.area.y + box.area.h / 2 : middleY) - spanY / 2,
  };
}

/** The view zoomed by `factor` about the pixel (px, py) of the box, which stays over the same spot of the board.
 *
 * @param view - The current pan and scale.
 * @param factor - The positive zoom multiplier.
 * @param px - The horizontal pointer position in viewport pixels.
 * @param py - The vertical pointer position in viewport pixels.
 * @param box - The viewport dimensions and logical board bounds, or board bounds specified by the signature.
 * @param pad - The native SVG or viewport padding in drawing units/pixels specified by the signature.
 * @returns The view zoomed by `factor` about the pixel (px, py) of the box, which stays over the same spot of the board.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze } from "@johnmorrisdotca/meikyuu";
 * import { fitView, zoomedAbout } from "@johnmorrisdotca/meikyuu/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const box = {width:390,height:844,area:grid.box};
 * const view = fitView(box);
 * console.log(zoomedAbout(view,1.5,100,100,box));
 * ```
 */
export function zoomedAbout(view: View, factor: number, px: number, py: number, box: ViewBox, pad = 0.6): View {
  const { least, most } = scaleLimits(box, pad);
  const scale = Math.min(most, Math.max(least, view.scale * factor));
  const gx = view.x + px / view.scale;
  const gy = view.y + py / view.scale;
  return keptView({ scale, x: gx - px / scale, y: gy - py / scale }, box, pad);
}

/** The view moved so that the board slides by (dx, dy) pixels under the box.
 *
 * @param view - The current pan and scale.
 * @param dx - The horizontal pan distance in pixels.
 * @param dy - The vertical pan distance in pixels.
 * @param box - The viewport dimensions and logical board bounds, or board bounds specified by the signature.
 * @param pad - The native SVG or viewport padding in drawing units/pixels specified by the signature.
 * @returns The view moved so that the board slides by (dx, dy) pixels under the box.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze } from "@johnmorrisdotca/meikyuu";
 * import { fitView, pannedBy } from "@johnmorrisdotca/meikyuu/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const box = {width:390,height:844,area:grid.box};
 * const view = fitView(box);
 * console.log(pannedBy(view,10,20,box));
 * ```
 */
export function pannedBy(view: View, dx: number, dy: number, box: ViewBox, pad = 0.6): View {
  return keptView({ ...view, x: view.x - dx / view.scale, y: view.y - dy / view.scale }, box, pad);
}

/** The point of the board under a pixel of the box.
 *
 * @param view - The current pan and scale.
 * @param px - The horizontal pointer position in viewport pixels.
 * @param py - The vertical pointer position in viewport pixels.
 * @returns The point of the board under a pixel of the box.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze } from "@johnmorrisdotca/meikyuu";
 * import { fitView, pointAt } from "@johnmorrisdotca/meikyuu/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const box = {width:390,height:844,area:grid.box};
 * const view = fitView(box);
 * console.log(pointAt(view,100,100));
 * ```
 */
export function pointAt(view: View, px: number, py: number): [number, number] {
  return [view.x + px / view.scale, view.y + py / view.scale];
}

/** The text of the `viewBox` attribute that shows the view.
 *
 * @param view - The current pan and scale.
 * @param box - The viewport dimensions and logical board bounds, or board bounds specified by the signature.
 * @returns The text of the `viewBox` attribute that shows the view.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze } from "@johnmorrisdotca/meikyuu";
 * import { fitView, viewBoxOf } from "@johnmorrisdotca/meikyuu/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const box = {width:390,height:844,area:grid.box};
 * const view = fitView(box);
 * console.log(viewBoxOf(view,box));
 * ```
 */
export function viewBoxOf(view: View, box: ViewBox): string {
  const r = (n: number): number => Math.round(n * 1000) / 1000;
  return `${r(view.x)} ${r(view.y)} ${r(box.width / view.scale)} ${r(box.height / view.scale)}`;
}

/** The part of the board the view shows.
 *
 * @param view - The current pan and scale.
 * @param box - The viewport dimensions and logical board bounds, or board bounds specified by the signature.
 * @returns The part of the board the view shows.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze } from "@johnmorrisdotca/meikyuu";
 * import { fitView, visibleArea } from "@johnmorrisdotca/meikyuu/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const box = {width:390,height:844,area:grid.box};
 * const view = fitView(box);
 * console.log(visibleArea(view,box));
 * ```
 */
export function visibleArea(view: View, box: ViewBox): Box {
  return { x: view.x, y: view.y, w: box.width / view.scale, h: box.height / view.scale };
}

/** Whether the view is the board fitted, as the mode says.
 *
 * @param view - The current pan and scale.
 * @param box - The viewport dimensions and logical board bounds, or board bounds specified by the signature.
 * @param pad - The native SVG or viewport padding in drawing units/pixels specified by the signature.
 * @param mode - Fit both dimensions, width only or height only.
 * @returns Whether the view is the board fitted, as the mode says.
 * @example
 * ```ts
 * import type { MazeRecipe } from "@johnmorrisdotca/meikyuu";
 * import { buildMaze } from "@johnmorrisdotca/meikyuu";
 * import { fitView, isFitted } from "@johnmorrisdotca/meikyuu/play";
 *
 * const recipe: MazeRecipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42};
 * const maze = buildMaze(recipe);
 * const grid = maze.grid;
 * const box = {width:390,height:844,area:grid.box};
 * const view = fitView(box);
 * console.log(isFitted(view,box));
 * ```
 */
export function isFitted(view: View, box: ViewBox, pad = 0.6, mode: FitMode = "both"): boolean {
  return Math.abs(view.scale - fitView(box, pad, mode).scale) < 1e-6;
}

/** How near an edge of the box a line's end must be dragged to move the view, and the most the view moves in a frame there, in pixels.
 *
 * @example
 * ```ts
 * import { EDGE } from "@johnmorrisdotca/meikyuu/play";
 * console.log(EDGE);
 * ```
 */
export const EDGE = 44;
/** The native viewport edge-pan step in pixels.
 *
 * @example
 * ```ts
 * import { EDGE_STEP } from "@johnmorrisdotca/meikyuu/play";
 * console.log(EDGE_STEP);
 * ```
 */
export const EDGE_STEP = 7;

/**
 * How far to move the view in a frame for a finger at (px, py) of a box: the board moves the other way, toward the finger. It is gentle: nothing
 * at `EDGE` pixels from a side, rising in a line to `EDGE_STEP` pixels a frame at the side itself, so a finger that only brushes the edge
 * of the box moves the view hardly at all, and one held at the very edge moves it steadily.
 *
 * @param px - The horizontal pointer position in viewport pixels.
 * @param py - The vertical pointer position in viewport pixels.
 * @param width - The native width in cells or pixels specified by this signature.
 * @param height - The native height in cells or pixels specified by this signature.
 * @returns How far to move the view in a frame for a finger at (px, py) of a box: the board moves the other way, toward the finger. It is gentle: nothing at `EDGE` pixels from a side, rising in a line to `EDGE_STEP` pixels a frame at the side itself, so a finger that only brushes the edge of the box moves the view hardly at all, and one held at the very edge moves it steadily.
 * @example
 * ```ts
 * import { edgeNudge } from "@johnmorrisdotca/meikyuu/play";
 *
 * console.log(edgeNudge(5,100,390,844));
 * ```
 */
export function edgeNudge(px: number, py: number, width: number, height: number): { dx: number; dy: number } {
  const push = (distance: number): number => (distance >= EDGE ? 0 : EDGE_STEP * (1 - Math.max(0, distance) / EDGE));
  const dx = push(px) - push(width - px);
  const dy = push(py) - push(height - py);
  return { dx, dy };
}
