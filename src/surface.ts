import { EDGE, EDGE_STEP, fitView, isFitted, keptView, pannedBy, pointAt, scaleLimits, viewBoxOf, visibleArea, zoomedAbout, type View, type ViewBox } from "./viewport.ts";
import type { Box } from "./grid.ts";

/**
 * A SURFACE: the box a board is looked at through, in a page. It owns the SVG's `viewBox` (the view), turns
 * the fingers and the wheel into zooming and moving, and hands what is left, a finger drawing or a tap, to the
 * board that is in it through `SurfaceHooks`. Two fingers pinch and move the view; one finger or the mouse
 * pressed where `press` says no moves the view, and where it says yes draws; the wheel zooms about the cursor.
 *
 * Needs a page. The arithmetic is `viewport.ts`'s, and is usable alone.
 */
export type Point = readonly [number, number];

export type SurfaceHooks = {
  /** A pointer went down at a point of the board (and a pixel of the box): true to draw with it, false to move the view with it. */
  press(at: Point, pixel: Point, event: PointerEvent): boolean;
  /** A pointer drawing has moved from one point of the board to another. */
  move(from: Point, to: Point): void;
  /** A pointer drawing was let go (or lost). */
  lift(): void;
  /** A pointer that moved the view was let go without having moved: a tap at a point of the board. */
  tap(at: Point, event: PointerEvent): void;
  /** The view changed: draw what it shows. */
  render(view: View, shown: Box, size: ViewBox): void;
};

export type Surface = {
  /** The whole of the board, fitted. */
  fit(): void;
  /** Zoom by a factor about the middle of the box. */
  zoom(factor: number): void;
  /** Whether the view is the whole board fitted, and whether it can zoom further either way. */
  state(): { fitted: boolean; atMost: boolean; atLeast: boolean };
  view(): View;
  /** Ask for a draw at the next frame. */
  invalidate(): void;
  /** Point the box at another board (a new area), fitted. */
  setArea(area: Box): void;
  /** The pixel of the box under a point of the board. */
  pixelOf(at: Point): Point;
  destroy(): void;
};

/** How far a pointer may move and still be a tap, in pixels, and how long it may take, in milliseconds. */
const TAP_SLOP = 8;
const TAP_TIME = 500;

export function createSurface(box: HTMLElement, area: Box, hooks: SurfaceHooks, pad = 0.6): Surface {
  let size: ViewBox = { width: Math.max(1, box.clientWidth), height: Math.max(1, box.clientHeight), area };
  let view: View = fitView(size, pad);
  let frame = 0;
  let mode: "none" | "draw" | "pan" | "pinch" = "none";
  const pointers = new Map<number, [number, number]>();
  let last: Point | null = null;
  let pinchFrom: { distance: number } | null = null;
  let panned = false;
  let started = 0;
  let moved = 0;

  const measure = (): void => {
    const rect = box.getBoundingClientRect();
    const next: ViewBox = { width: Math.max(1, rect.width), height: Math.max(1, rect.height), area: size.area };
    if (next.width === size.width && next.height === size.height) return;
    const wasFitted = isFitted(view, size, pad);
    size = next;
    view = wasFitted ? fitView(size, pad) : keptView(view, size, pad);
    invalidate();
  };
  const local = (event: { clientX: number; clientY: number }): [number, number] => {
    const rect = box.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  };
  function invalidate(): void {
    if (frame !== 0) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      hooks.render(view, visibleArea(view, size), size);
    });
  }
  const setView = (next: View): void => {
    if (next.x === view.x && next.y === view.y && next.scale === view.scale) return;
    view = next;
    invalidate();
  };

  const onDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0 && event.button !== 1) return;
    const pixel = local(event);
    pointers.set(event.pointerId, pixel);
    try {
      box.setPointerCapture?.(event.pointerId);
    } catch {
      // A pointer the browser is not tracking (one a script made) cannot be captured; the board still follows it.
    }
    event.preventDefault();
    if (pointers.size === 2) {
      if (mode === "draw") hooks.lift();
      mode = "pinch";
      const [a, b] = [...pointers.values()] as [[number, number], [number, number]];
      pinchFrom = { distance: Math.hypot(a[0] - b[0], a[1] - b[1]) };
      return;
    }
    if (pointers.size > 2) return;
    const at = pointAt(view, pixel[0], pixel[1]);
    started = event.timeStamp;
    moved = 0;
    panned = false;
    if (event.button === 0 && hooks.press(at, pixel, event)) {
      mode = "draw";
      last = at;
    } else mode = "pan";
  };

  const onMove = (event: PointerEvent): void => {
    const before = pointers.get(event.pointerId);
    if (before === undefined) return;
    const pixel = local(event);
    pointers.set(event.pointerId, pixel);
    if (mode === "pinch" && pointers.size === 2 && pinchFrom !== null) {
      const [a, b] = [...pointers.values()] as [[number, number], [number, number]];
      const distance = Math.hypot(a[0] - b[0], a[1] - b[1]);
      // The middle of the two fingers is the point that stays put: its movement pans, the change in distance zooms.
      const middle: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const before2 = [...pointers.entries()].find(([id]) => id !== event.pointerId)![1];
      const wasMiddle: [number, number] = [(before[0] + before2[0]) / 2, (before[1] + before2[1]) / 2];
      let next = pannedBy(view, middle[0] - wasMiddle[0], middle[1] - wasMiddle[1], size, pad);
      const previous = Math.hypot(before[0] - before2[0], before[1] - before2[1]);
      if (previous > 0 && distance > 0) next = zoomedAbout(next, distance / previous, middle[0], middle[1], size, pad);
      pinchFrom = { distance };
      setView(next);
      return;
    }
    if (mode === "draw") {
      const events = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
      for (const each of events.length > 0 ? events : [event]) {
        const p = local(each);
        const to = pointAt(view, p[0], p[1]);
        if (last !== null) hooks.move(last, to);
        last = to;
      }
      return;
    }
    if (mode === "pan") {
      moved += Math.hypot(pixel[0] - before[0], pixel[1] - before[1]);
      if (moved > TAP_SLOP) panned = true;
      if (panned) setView(pannedBy(view, pixel[0] - before[0], pixel[1] - before[1], size, pad));
    }
  };

  const onUp = (event: PointerEvent): void => {
    if (!pointers.has(event.pointerId)) return;
    const pixel = local(event);
    pointers.delete(event.pointerId);
    if (mode === "draw") hooks.lift();
    else if (mode === "pan" && !panned && event.type === "pointerup" && event.timeStamp - started < TAP_TIME) hooks.tap(pointAt(view, pixel[0], pixel[1]), event);
    if (pointers.size === 0) {
      mode = "none";
      last = null;
      pinchFrom = null;
    } else if (mode === "pinch" && pointers.size === 1) {
      // One finger left of a pinch carries on moving the view.
      mode = "pan";
      panned = true;
      pinchFrom = null;
    }
  };

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const [px, py] = local(event);
    const lines = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
    setView(zoomedAbout(view, Math.exp(-event.deltaY * lines * (event.ctrlKey ? 0.01 : 0.0016)), px, py, size, pad));
  };

  /** While a line is drawn near an edge of the box, the view moves toward it a little each frame, and the line carries on under the finger. */
  let nudgeFrame = 0;
  const nudge = (): void => {
    nudgeFrame = 0;
    if (mode !== "draw") return;
    const pixel = [...pointers.values()][0];
    if (pixel === undefined) return;
    const dx = pixel[0] < EDGE ? EDGE_STEP : size.width - pixel[0] < EDGE ? -EDGE_STEP : 0;
    const dy = pixel[1] < EDGE ? EDGE_STEP : size.height - pixel[1] < EDGE ? -EDGE_STEP : 0;
    if (dx !== 0 || dy !== 0) {
      const next = pannedBy(view, dx, dy, size, pad);
      if (next.x !== view.x || next.y !== view.y) {
        setView(next);
        const to = pointAt(view, pixel[0], pixel[1]);
        if (last !== null) hooks.move(last, to);
        last = to;
      }
    }
    nudgeFrame = window.requestAnimationFrame(nudge);
  };
  const watch = (event: PointerEvent): void => {
    onMove(event);
    if (mode === "draw" && nudgeFrame === 0) nudgeFrame = window.requestAnimationFrame(nudge);
  };

  box.addEventListener("pointerdown", onDown);
  box.addEventListener("pointermove", watch);
  box.addEventListener("pointerup", onUp);
  box.addEventListener("pointercancel", onUp);
  box.addEventListener("wheel", onWheel, { passive: false });
  const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
  resize?.observe(box);
  measure();
  invalidate();

  return {
    fit: () => setView(fitView(size, pad)),
    zoom: (factor) => setView(zoomedAbout(view, factor, size.width / 2, size.height / 2, size, pad)),
    state: () => {
      const { least, most } = scaleLimits(size, pad);
      return { fitted: isFitted(view, size, pad), atMost: view.scale >= most - 1e-6, atLeast: view.scale <= least + 1e-6 };
    },
    view: () => view,
    invalidate,
    setArea: (next) => {
      size = { ...size, area: next };
      view = fitView(size, pad);
      invalidate();
    },
    pixelOf: (at) => [(at[0] - view.x) * view.scale, (at[1] - view.y) * view.scale],
    destroy: () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(nudgeFrame);
      box.removeEventListener("pointerdown", onDown);
      box.removeEventListener("pointermove", watch);
      box.removeEventListener("pointerup", onUp);
      box.removeEventListener("pointercancel", onUp);
      box.removeEventListener("wheel", onWheel);
      resize?.disconnect();
    },
  };
}

export { viewBoxOf };
