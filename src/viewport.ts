import type { Box } from "./grid.ts";

/**
 * A BOARD LOOKED AT THROUGH A BOX, which may be zoomed in until a cell is as big as a thumb and
 * moved about: the arithmetic of the view, without a page. A view is the point of the board at the
 * box's top left corner and how many pixels a cell takes (`scale`); the board is drawn by setting an
 * SVG's `viewBox` to what `viewBoxOf` says. Everything here is a pure function of numbers.
 */
export type View = { x: number; y: number; scale: number };

/** How a box of `width` by `height` pixels shows a board: the margin round it in cells, and how far in a view may go. */
export type ViewBox = { width: number; height: number; area: Box };

/** The view that shows the whole of the area, centred, with a margin of `pad` cells. */
export function fitView(box: ViewBox, pad = 0.6): View {
  const scale = Math.min(box.width / (box.area.w + 2 * pad), box.height / (box.area.h + 2 * pad));
  return { scale, x: box.area.x + box.area.w / 2 - box.width / (2 * scale), y: box.area.y + box.area.h / 2 - box.height / (2 * scale) };
}

/** The scales a view may have: the whole board fitted, to a cell this many pixels wide (at least a bit past the fit, so a small maze can still zoom). */
export const MOST_CELL_PIXELS = 72;

export function scaleLimits(box: ViewBox, pad = 0.6): { least: number; most: number } {
  const fit = fitView(box, pad).scale;
  return { least: fit * 0.9, most: Math.max(fit * 2, MOST_CELL_PIXELS) };
}

/** A view kept where some of the board can be seen: its middle never leaves the area (with a margin). */
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

/** The view zoomed by `factor` about the pixel (px, py) of the box, which stays over the same spot of the board. */
export function zoomedAbout(view: View, factor: number, px: number, py: number, box: ViewBox, pad = 0.6): View {
  const { least, most } = scaleLimits(box, pad);
  const scale = Math.min(most, Math.max(least, view.scale * factor));
  const gx = view.x + px / view.scale;
  const gy = view.y + py / view.scale;
  return keptView({ scale, x: gx - px / scale, y: gy - py / scale }, box, pad);
}

/** The view moved so that the board slides by (dx, dy) pixels under the box. */
export function pannedBy(view: View, dx: number, dy: number, box: ViewBox, pad = 0.6): View {
  return keptView({ ...view, x: view.x - dx / view.scale, y: view.y - dy / view.scale }, box, pad);
}

/** The point of the board under a pixel of the box. */
export function pointAt(view: View, px: number, py: number): [number, number] {
  return [view.x + px / view.scale, view.y + py / view.scale];
}

/** The text of the `viewBox` attribute that shows the view. */
export function viewBoxOf(view: View, box: ViewBox): string {
  const r = (n: number): number => Math.round(n * 1000) / 1000;
  return `${r(view.x)} ${r(view.y)} ${r(box.width / view.scale)} ${r(box.height / view.scale)}`;
}

/** The part of the board the view shows. */
export function visibleArea(view: View, box: ViewBox): Box {
  return { x: view.x, y: view.y, w: box.width / view.scale, h: box.height / view.scale };
}

/** Whether the view is the whole board fitted. */
export function isFitted(view: View, box: ViewBox, pad = 0.6): boolean {
  return Math.abs(view.scale - fitView(box, pad).scale) < 1e-6;
}

/** How near an edge of the box a line's end must be dragged to move the view, and how far each frame moves it, in pixels. */
export const EDGE = 44;
export const EDGE_STEP = 7;

/** How far to move the view in a frame for a finger at (px, py) of a box: the board moves the other way, toward the finger. */
export function edgeNudge(px: number, py: number, width: number, height: number): { dx: number; dy: number } {
  const dx = px < EDGE ? EDGE_STEP : width - px < EDGE ? -EDGE_STEP : 0;
  const dy = py < EDGE ? EDGE_STEP : height - py < EDGE ? -EDGE_STEP : 0;
  return { dx, dy };
}
