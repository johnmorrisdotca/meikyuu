import { arrowMarkup } from "./drawArrows.ts";
import { boardLookOf, lookAttributes, type MazeLook } from "./draw.ts";
import { fixed } from "./geometry.ts";
import { ARROW_STEPS, rayOf, type ArrowBoard } from "./arrows.ts";
import type { ArrowGame } from "./arrowGame.ts";
import { createSurface, type Surface } from "./surface.ts";
import { viewBoxOf } from "./viewport.ts";

/**
 * AN ARROW BOARD IN A BOX: the picture drawn into an SVG whose `viewBox` is the view, so a big board can
 * be zoomed and moved. A tap on a cell that has an arrow on it taps that arrow (a whole cell is the target,
 * not the thin line); a tap anywhere else does nothing. An arrow that is taken off slides away along the way
 * it points, as far as the edge of the board and beyond, and fades; one that cannot go shakes along its line.
 */
export type ArrowSurfaceHooks = {
  /** An arrow was tapped. */
  tap(id: number): void;
  /** The view changed (zoomed or moved). */
  viewChanged?(): void;
};

export type ArrowSurface = {
  readonly surface: Surface;
  /** Draw the board as the game stands: arrows still on it, locks, the hint. */
  update(game: ArrowGame, hint: number | null): void;
  /** An arrow went: slide it away, with or without the motion. */
  fly(id: number, still: boolean): void;
  /** An arrow could not go: shake it, and light the one in its way. */
  bump(id: number, by: number | undefined): void;
  look(look: MazeLook): void;
  destroy(): void;
};

const NS = "http://www.w3.org/2000/svg";

export function createArrowSurface(box: HTMLElement, hooks: ArrowSurfaceHooks, board: ArrowBoard, initial: MazeLook): ArrowSurface {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("aria-hidden", "true");
  box.replaceChildren(svg);
  const pad = 0.4;
  let lookNow = initial;
  let current = board;
  const applyLook = (): void => {
    const probe = document.createElement("div");
    probe.innerHTML = `<i ${lookAttributes(lookNow)}></i>`;
    const source = probe.firstElementChild!;
    svg.setAttribute("class", source.getAttribute("class") ?? "meikyuu");
    for (const name of ["data-board", "data-trail", "style"]) {
      const value = source.getAttribute(name);
      if (value === null) svg.removeAttribute(name);
      else svg.setAttribute(name, value);
    }
    svg.querySelector(".mk-paper")?.setAttribute("fill", boardLookOf(lookNow.board).paper);
  };
  let owner: Int32Array = new Int32Array(0);
  const ownerOf = (next: ArrowBoard): Int32Array => {
    const out = new Int32Array(next.w * next.h).fill(-1);
    next.arrows.forEach((arrow, id) => arrow.cells.forEach((cell) => (out[cell] = id)));
    return out;
  };
  let present: readonly boolean[] = board.arrows.map(() => true);

  const surface = createSurface(
    box,
    { x: 0, y: 0, w: board.w, h: board.h },
    {
      press: () => false,
      move: () => undefined,
      lift: () => undefined,
      tap: (at) => {
        const x = Math.floor(at[0]);
        const y = Math.floor(at[1]);
        if (x < 0 || y < 0 || x >= current.w || y >= current.h) return;
        const id = owner[y * current.w + x]!;
        if (id >= 0 && present[id]) hooks.tap(id);
      },
      render: (view, _shown, size) => {
        svg.setAttribute("viewBox", viewBoxOf(view, size));
        hooks.viewChanged?.();
      },
    },
    pad,
  );

  let shownBoard: ArrowBoard | null = null;
  const elements = new Map<number, SVGGElement>();

  /** The board as it stands. A new board is drawn afresh; the same board is changed where it differs, so an arrow in flight is left to finish. */
  function draw(game: ArrowGame, hint: number | null): void {
    current = game.board;
    owner = ownerOf(current);
    present = game.present;
    if (shownBoard !== current) {
      shownBoard = current;
      const dots: string[] = [];
      current.inShape.forEach((inside, cell) => {
        if (inside) dots.push(`<circle class="mk-dot" cx="${fixed((cell % current.w) + 0.5)}" cy="${fixed(Math.floor(cell / current.w) + 0.5)}" r="0.07"/>`);
      });
      const arrows = current.arrows.map((arrow, id) => arrowMarkup(current, arrow, id, { locked: current.locked[id]! && !game.unlocked })).join("");
      const width = current.w + 2 * pad;
      const height = current.h + 2 * pad;
      svg.innerHTML = `<rect class="mk-paper" x="${-pad - 400}" y="${-pad - 400}" width="${width + 800}" height="${height + 800}"/>${dots.join("")}<g class="mk-arrows">${arrows}</g>`;
      elements.clear();
      svg.querySelectorAll<SVGGElement>(".mk-arrow").forEach((el) => elements.set(Number(el.dataset.id), el));
      svg.setAttribute("data-shape", current.recipe.shape);
      svg.setAttribute("data-arrows", String(current.arrows.length));
      applyLook();
      surface.fit();
    }
    for (const [id, el] of elements) {
      if (!game.present[id]) {
        if (el.getAttribute("data-flying") !== "true") el.remove();
        continue;
      }
      // Back on the board (an undo, a restart): in the page again, still, and as it was.
      if (el.parentNode === null || el.getAttribute("data-flying") === "true") {
        if (el.parentNode === null) svg.querySelector(".mk-arrows")!.append(el);
        for (const name of ["data-flying", "data-gone", "data-bump", "data-by"]) el.removeAttribute(name);
        el.style.transform = "";
      }
      const locked = current.locked[id]! && !game.unlocked;
      el.setAttribute("data-locked", String(locked));
      if (!locked) el.querySelector(".mk-lock-mark")?.remove();
      if (hint === id) el.setAttribute("data-hint", "true");
      else el.removeAttribute("data-hint");
    }
    surface.invalidate();
  }

  const find = (id: number): SVGGElement | null => elements.get(id) ?? null;

  return {
    surface,
    update: draw,
    fly: (id, still) => {
      const el = find(id);
      if (el === null) return;
      if (still) {
        el.remove();
        return;
      }
      const arrow = current.arrows[id]!;
      const [dx, dy] = ARROW_STEPS[arrow.dir]!;
      // Out past the edge: the cells in front of the head, the arrow's own length, and a little more. In the board's units, one to a cell.
      const far = rayOf(current, arrow).length + arrow.cells.length + 2;
      el.setAttribute("data-flying", "true");
      el.style.transform = `translate(${dx * far}px, ${dy * far}px)`;
      window.requestAnimationFrame(() => el.setAttribute("data-gone", "true"));
      window.setTimeout(() => {
        if (el.getAttribute("data-flying") === "true") el.remove();
      }, 520);
    },
    bump: (id, by) => {
      const el = find(id);
      if (el === null) return;
      const [dx, dy] = ARROW_STEPS[current.arrows[id]!.dir]!;
      el.style.setProperty("--mk-bx", `${dx * 0.12}px`);
      el.style.setProperty("--mk-by", `${dy * 0.12}px`);
      el.removeAttribute("data-bump");
      void el.getBoundingClientRect();
      el.setAttribute("data-bump", "true");
      if (by !== undefined) {
        const other = find(by);
        other?.setAttribute("data-by", "true");
        window.setTimeout(() => other?.removeAttribute("data-by"), 900);
      }
    },
    look: (look) => {
      lookNow = look;
      applyLook();
    },
    destroy: () => {
      surface.destroy();
      box.replaceChildren();
    },
  };
}
