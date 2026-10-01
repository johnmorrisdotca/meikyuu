import { MEIKYUU_ARROW_COLOURS } from "./boards.ts";
import { lookAttributes, type MazeLook } from "./draw.ts";
import { fixed } from "./geometry.ts";
import { ARROW_STEPS, type Arrow, type ArrowBoard } from "./arrows.ts";
import { meikyuuSay, type MeikyuuLanguage } from "./strings.ts";
import { MEIKYUU_STYLE } from "./style.ts";

/**
 * AN ARROW BOARD AS SVG TEXT: a faint dot on every cell of the picture, and each arrow on it as a
 * line through its cells with a head at the end it points from. One unit is one cell. Each arrow is a
 * group with `data-id`, `data-dir` and `data-locked`, so a page can find the one under a finger; the
 * style (`MEIKYUU_STYLE`) gives it its colour and its motion. A locked arrow is grey, dashed, and has a
 * padlock at its tail.
 */
export type DrawArrowsOptions = MazeLook & {
  /** Which arrows are still on the board; all of them when left out. */
  present?: readonly boolean[];
  /** Whether the locked arrows have been unlocked. */
  unlocked?: boolean;
  /** An arrow to light as the hint. */
  hint?: number | null;
  language?: MeikyuuLanguage;
  label?: string;
  standalone?: boolean;
};

const escape = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The colour of arrow number `id`. */
export const arrowColour = (id: number): string => MEIKYUU_ARROW_COLOURS[id % MEIKYUU_ARROW_COLOURS.length]!;

/** The arrow's picture: its stem, its head, and a padlock if it is locked. */
export function arrowMarkup(board: Pick<ArrowBoard, "w">, arrow: Arrow, id: number, extra: { locked: boolean; gone?: boolean; hint?: boolean }): string {
  const centre = (cell: number): [number, number] => [(cell % board.w) + 0.5, Math.floor(cell / board.w) + 0.5];
  const head = arrow.cells[arrow.cells.length - 1]!;
  const [hx, hy] = centre(head);
  const [dx, dy] = ARROW_STEPS[arrow.dir]!;
  // A lone cell has a short stem of its own, behind the head.
  const points = arrow.cells.map(centre);
  if (points.length === 1) points.unshift([hx - dx * 0.32, hy - dy * 0.32]);
  const stem = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${fixed(x)} ${fixed(y)}`).join("");
  // The head: a triangle whose tip is past the head cell's middle, along the way it points.
  const tip: [number, number] = [hx + dx * 0.44, hy + dy * 0.44];
  const base: [number, number] = [hx - dx * 0.02, hy - dy * 0.02];
  const side: [number, number] = [-dy * 0.3, dx * 0.3];
  const point = `${fixed(tip[0])},${fixed(tip[1])} ${fixed(base[0] + side[0])},${fixed(base[1] + side[1])} ${fixed(base[0] - side[0])},${fixed(base[1] - side[1])}`;
  const [tx, ty] = points[0]!;
  const lock = extra.locked
    ? `<g class="mk-lock-mark" transform="translate(${fixed(tx)} ${fixed(ty)})"><rect class="mk-lock" x="-0.17" y="-0.06" width="0.34" height="0.26" rx="0.05"/><path class="mk-lock" d="M-0.09 -0.06V-0.14A0.09 0.09 0 0 1 0.09 -0.14V-0.06" fill="none"/></g>`
    : "";
  return `<g class="mk-arrow" data-id="${id}" data-dir="${arrow.dir}" data-locked="${extra.locked}"${extra.gone === true ? ` data-gone="true"` : ""}${extra.hint === true ? ` data-hint="true"` : ""} style="--mk-arrow:${arrowColour(id)}"><path class="mk-stem" d="${stem}"/><polygon class="mk-point" points="${point}"/>${lock}</g>`;
}

export function drawArrows(board: ArrowBoard, options: DrawArrowsOptions = {}): string {
  const language = options.language ?? "en";
  const { w, h } = board;
  const dots: string[] = [];
  board.inShape.forEach((inside, cell) => {
    if (inside) dots.push(`<circle class="mk-dot" cx="${fixed((cell % w) + 0.5)}" cy="${fixed(Math.floor(cell / w) + 0.5)}" r="0.07"/>`);
  });
  const arrows = board.arrows
    .map((arrow, id) => (options.present !== undefined && !options.present[id] ? "" : arrowMarkup(board, arrow, id, { locked: board.locked[id]! && options.unlocked !== true, hint: options.hint === id })))
    .join("");
  const label = options.label ?? meikyuuSay(language, "arrowsLabel", { n: options.present === undefined ? board.arrows.length : options.present.filter(Boolean).length, shape: meikyuuSay(language, `shape_${board.recipe.shape}`) });
  const style = options.standalone === true ? `<style>${MEIKYUU_STYLE}</style>` : "";
  const pad = 0.4;
  return `<svg ${lookAttributes(options)} xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}" role="img" aria-label="${escape(label)}" data-shape="${board.recipe.shape}" data-arrows="${board.arrows.length}">${style}<rect class="mk-paper" x="${-pad}" y="${-pad}" width="${w + 2 * pad}" height="${h + 2 * pad}"/>${dots.join("")}${arrows}</svg>`;
}
