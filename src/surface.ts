import { edgeNudge, fitView, isFitted, keptView, pannedBy, pointAt, scaleLimits, viewBoxOf, visibleArea, zoomedAbout, type FitMode, type View, type ViewBox } from "./viewport.ts";
import type { Box } from "./grid.ts";

/**
 * A SURFACE: the box a board is looked at through, in a page. It owns the SVG's `viewBox` (the view), turns
 * the fingers and the wheel into zooming and moving, and hands what is left, a finger drawing or a tap, to the
 * board that is in it through `SurfaceHooks`. Two fingers pinch and move the view; one finger or the mouse
 * pressed where `press` says no moves the view, and where it says yes draws; the wheel zooms about the cursor.
 *
 * Touch is arranged so that a page can still be scrolled: only the box itself asks the browser to leave touches to it (`touch-action: none`),
 * one finger draws, two fingers (or one that did not begin on the line) move and pinch the view, and a line drawn to the edge of a zoomed
 * box moves the view along (`edgePan`, which can be turned off). `panMode` makes every one-finger drag move the view, for a mouse or a
 * finger that cannot find the line's end. A pinch that has nothing left to zoom out of asks the box's frame (`frame`) to shrink, which is
 * how a page lets the player zoom out until its own margins show. Needs a page. The arithmetic is `viewport.ts`'s, and is usable alone.
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
  /** Fit by width, by height or both; the view is fitted again. */
  setFit(mode: FitMode): void;
  fitMode(): FitMode;
  /** Whether a line drawn to the edge moves the view along. */
  setEdgePan(on: boolean): void;
  /** Whether every one-finger drag moves the view, even one that begins on the line's end. */
  setPanMode(on: boolean): void;
  panMode(): boolean;
  /** The pixel of the box under a point of the board. */
  pixelOf(at: Point): Point;
  destroy(): void;
};

/** How a surface is arranged beyond the hooks. */
export type SurfaceOptions = {
  /** What Fit shows, and what the first view is: the whole board (default), its width, or its height. */
  fit?: FitMode;
  /** A line drawn to the edge of the box moves the view along. Default true. */
  edgePan?: boolean;
  /** Start with every one-finger drag moving the view. Default false. */
  panMode?: boolean;
  /**
   * The frame round the box. A pinch the board has no more room for (smaller than the fit, or bigger while the frame is shrunk) is offered to
   * it first when growing and last when shrinking; it answers whether it took the pinch.
   */
  frame?: { zoom(factor: number): boolean };
};

/** How far a pointer may move and still be a tap, in pixels, and how long it may take, in milliseconds. */
const TAP_SLOP = 8;
const TAP_TIME = 500;

export function createSurface(box: HTMLElement, area: Box, hooks: SurfaceHooks, pad = 0.6, options: SurfaceOptions = {}): Surface {
  let size: ViewBox = { width: Math.max(1, box.clientWidth), height: Math.max(1, box.clientHeight), area };
  let fitMode: FitMode = options.fit ?? "both";
  let edgePan = options.edgePan !== false;
  let panAlways = options.panMode === true;
  let view: View = fitView(size, pad, fitMode);
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
    const wasFitted = isFitted(view, size, pad, fitMode);
    // A box that changes size keeps how far in the view is relative to the whole board fitted, and the middle of what it shows: a box that
    // is narrowed (a page widening its margins) keeps the same part of the board in view and does not crop the rest.
    const wasFit = fitView(size, pad).scale;
    const middleX = view.x + size.width / (2 * view.scale);
    const middleY = view.y + size.height / (2 * view.scale);
    const relative = view.scale / wasFit;
    size = next;
    if (wasFitted) view = fitView(size, pad, fitMode);
    else {
      const scale = relative * fitView(size, pad).scale;
      view = keptView({ scale, x: middleX - size.width / (2 * scale), y: middleY - size.height / (2 * scale) }, size, pad);
    }
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
    if (!panAlways && event.button === 0 && hooks.press(at, pixel, event)) {
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
      if (previous > 0 && distance > 0) {
        const factor = distance / previous;
        const { least } = scaleLimits(size, pad);
        // Fingers coming together with nothing left to zoom out of, or apart while the frame is shrunk: the frame takes the pinch.
        const framed = options.frame !== undefined && ((factor < 1 && next.scale <= least + 1e-6) || factor > 1) ? options.frame.zoom(factor) : false;
        if (!framed) next = zoomedAbout(next, factor, middle[0], middle[1], size, pad);
      }
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

  /** While a line is drawn near an edge of the box, the view moves toward it a little each frame (more the nearer the edge), and the line carries on under the finger. */
  let nudgeFrame = 0;
  const nudge = (): void => {
    nudgeFrame = 0;
    if (mode !== "draw" || !edgePan) return;
    const pixel = [...pointers.values()][0];
    if (pixel === undefined) return;
    const { dx, dy } = edgeNudge(pixel[0], pixel[1], size.width, size.height);
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
    if (mode === "draw" && edgePan && nudgeFrame === 0) nudgeFrame = window.requestAnimationFrame(nudge);
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
    fit: () => setView(fitView(size, pad, fitMode)),
    zoom: (factor) => setView(zoomedAbout(view, factor, size.width / 2, size.height / 2, size, pad)),
    state: () => {
      const { least, most } = scaleLimits(size, pad);
      return { fitted: isFitted(view, size, pad, fitMode), atMost: view.scale >= most - 1e-6, atLeast: view.scale <= least + 1e-6 };
    },
    view: () => view,
    invalidate,
    setArea: (next) => {
      size = { ...size, area: next };
      view = fitView(size, pad, fitMode);
      invalidate();
    },
    setFit: (next) => {
      fitMode = next;
      setView(fitView(size, pad, fitMode));
    },
    fitMode: () => fitMode,
    setEdgePan: (on) => {
      edgePan = on;
    },
    setPanMode: (on) => {
      panAlways = on;
    },
    panMode: () => panAlways,
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
