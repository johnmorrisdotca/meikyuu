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

/**
 * What a fit makes visible: `both` the whole board (default); `width` the board as wide as the box, which for a board taller than the box
 * is the top of it with the rest to move down to; `height` the board as tall as the box, the left of it for a board wider than the box.
 */
export const FIT_MODES = ["both", "width", "height"] as const;
export type FitMode = (typeof FIT_MODES)[number];

/** The view that shows the board as a mode says, with a margin of `pad` cells: centred where it fits, and at the top or left where it does not. */
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

/** The scales a view may have: the whole board fitted, to a cell this many pixels wide (at least a bit past the fit, so a small maze can still zoom). */
export const MOST_CELL_PIXELS = 72;

export function scaleLimits(box: ViewBox, pad = 0.6): { least: number; most: number } {
  const fit = fitView(box, pad).scale;
  return { least: fit * 0.9, most: Math.max(fit * 2, MOST_CELL_PIXELS, fitView(box, pad, "width").scale, fitView(box, pad, "height").scale) };
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

/** Whether the view is the board fitted, as the mode says. */
export function isFitted(view: View, box: ViewBox, pad = 0.6, mode: FitMode = "both"): boolean {
  return Math.abs(view.scale - fitView(box, pad, mode).scale) < 1e-6;
}

/** How near an edge of the box a line's end must be dragged to move the view, and the most the view moves in a frame there, in pixels. */
export const EDGE = 44;
export const EDGE_STEP = 7;

/**
 * How far to move the view in a frame for a finger at (px, py) of a box: the board moves the other way, toward the finger. It is gentle: nothing
 * at `EDGE` pixels from a side, rising in a line to `EDGE_STEP` pixels a frame at the side itself, so a finger that only brushes the edge
 * of the box moves the view hardly at all, and one held at the very edge moves it steadily.
 */
export function edgeNudge(px: number, py: number, width: number, height: number): { dx: number; dy: number } {
  const push = (distance: number): number => (distance >= EDGE ? 0 : EDGE_STEP * (1 - Math.max(0, distance) / EDGE));
  const dx = push(px) - push(width - px);
  const dy = push(py) - push(height - py);
  return { dx, dy };
}
