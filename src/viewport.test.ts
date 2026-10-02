import { describe, expect, it } from "vitest";

import { edgeNudge, EDGE, EDGE_STEP, fitView, isFitted, keptView, MOST_CELL_PIXELS, pannedBy, pointAt, scaleLimits, viewBoxOf, visibleArea, zoomedAbout, type ViewBox } from "./viewport.ts";

const box: ViewBox = { width: 400, height: 400, area: { x: 0, y: 0, w: 80, h: 80 } };

describe("the view of a board through a box", () => {
  it("fits the whole board, centred, with its margin", () => {
    const view = fitView(box);
    expect(view.scale).toBeCloseTo(400 / 81.2, 6);
    const shown = visibleArea(view, box);
    expect(shown.x + shown.w / 2).toBeCloseTo(40, 6);
    expect(shown.y + shown.h / 2).toBeCloseTo(40, 6);
    expect(shown.w).toBeGreaterThanOrEqual(80);
    expect(isFitted(view, box)).toBe(true);
    // A wide board in a square box is centred in the other direction.
    const wide: ViewBox = { width: 400, height: 400, area: { x: 0, y: 0, w: 40, h: 10 } };
    const [x, y] = [fitView(wide).x, fitView(wide).y];
    expect(x).toBeCloseTo(-0.6, 6);
    expect(y).toBeLessThan(0);
  });

  it("zooms about a pixel, which stays over the same spot of the board", () => {
    const fit = fitView(box);
    const view = zoomedAbout(fit, 4, 100, 150, box);
    expect(view.scale).toBeCloseTo(fit.scale * 4, 6);
    const [before] = [pointAt(fit, 100, 150)];
    const after = pointAt(view, 100, 150);
    expect(after[0]).toBeCloseTo(before[0], 4);
    expect(after[1]).toBeCloseTo(before[1], 4);
  });

  it("never zooms further out than a little past the fit, nor in past a cell this many pixels wide", () => {
    const fit = fitView(box);
    const { least, most } = scaleLimits(box);
    expect(zoomedAbout(fit, 0.01, 200, 200, box).scale).toBeCloseTo(least, 6);
    expect(zoomedAbout(fit, 1000, 200, 200, box).scale).toBeCloseTo(most, 6);
    expect(most).toBeGreaterThanOrEqual(MOST_CELL_PIXELS);
    // A small maze can still zoom in.
    const small: ViewBox = { width: 400, height: 400, area: { x: 0, y: 0, w: 4, h: 4 } };
    expect(scaleLimits(small).most).toBeGreaterThan(fitView(small).scale);
  });

  it("moves the board under the box, and keeps some of it in view", () => {
    const zoomed = zoomedAbout(fitView(box), 6, 200, 200, box);
    const moved = pannedBy(zoomed, -100, 0, box);
    expect(moved.x).toBeGreaterThan(zoomed.x);
    const gone = pannedBy(zoomed, -1e7, 1e7, box);
    const shown = visibleArea(gone, box);
    // The middle of the view stays within a margin of the board.
    expect(shown.x + shown.w / 2).toBeLessThanOrEqual(80.6 + 1e-6);
    expect(shown.y + shown.h / 2).toBeGreaterThanOrEqual(-0.6 - 1e-6);
  });

  it("does not move a view of the whole board", () => {
    const fit = fitView(box);
    expect(pannedBy(fit, 120, -90, box)).toEqual(keptView(fit, box));
    expect(isFitted(pannedBy(fit, 120, -90, box), box)).toBe(true);
  });

  it("writes the viewBox the view means", () => {
    const view = { x: 10, y: 20, scale: 5 };
    expect(viewBoxOf(view, box)).toBe("10 20 80 80");
  });

  it("nudges the view toward an edge a line is drawn near, gently, more the nearer the edge, and not otherwise", () => {
    expect(edgeNudge(200, 200, 400, 400)).toEqual({ dx: 0, dy: 0 });
    expect(edgeNudge(EDGE, 200, 400, 400)).toEqual({ dx: 0, dy: 0 });
    // Brushing the edge of the near zone moves it hardly at all; at the side itself it moves EDGE_STEP a frame.
    expect(edgeNudge(EDGE - 1, 200, 400, 400).dx).toBeGreaterThan(0);
    expect(edgeNudge(EDGE - 1, 200, 400, 400).dx).toBeLessThan(EDGE_STEP / 20);
    expect(edgeNudge(0, 200, 400, 400)).toEqual({ dx: EDGE_STEP, dy: 0 });
    expect(edgeNudge(400, 400, 400, 400)).toEqual({ dx: -EDGE_STEP, dy: -EDGE_STEP });
    expect(edgeNudge(EDGE / 2, 200, 400, 400).dx).toBeCloseTo(EDGE_STEP / 2, 6);
    expect(edgeNudge(200, 0, 400, 400)).toEqual({ dx: 0, dy: EDGE_STEP });
    // A box narrower than two edges pushes both ways and they cancel.
    expect(edgeNudge(30, 200, 60, 400).dx).toBe(0);
  });

  it("fits by width or by height as well as the whole, from the top or the left where the board is bigger than the box", () => {
    // A tall board in a wide box: by width it is bigger than the box, so the view starts at its top.
    const tall: ViewBox = { width: 400, height: 300, area: { x: 0, y: 0, w: 20, h: 40 } };
    const both = fitView(tall);
    const wide = fitView(tall, 0.6, "width");
    expect(both.scale).toBeCloseTo(300 / 41.2, 6);
    expect(wide.scale).toBeCloseTo(400 / 21.2, 6);
    expect(wide.scale).toBeGreaterThan(both.scale);
    expect(wide.y).toBeCloseTo(-0.6, 6);
    expect(isFitted(wide, tall, 0.6, "width")).toBe(true);
    expect(isFitted(wide, tall)).toBe(false);
    // By height it is the whole board, as the board's height is what limited it.
    expect(fitView(tall, 0.6, "height")).toEqual(both);
    // A wide board in a tall box: by height it starts at its left.
    const flat: ViewBox = { width: 300, height: 400, area: { x: 0, y: 0, w: 40, h: 20 } };
    expect(fitView(flat, 0.6, "height").x).toBeCloseTo(-0.6, 6);
    // The zoom limits reach as far as the biggest fit.
    expect(scaleLimits(tall).most).toBeGreaterThanOrEqual(wide.scale);
  });
});
