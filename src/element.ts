import { MEIKYUU_BOARD_NAMES, MEIKYUU_TRAIL_NAMES, type MeikyuuBoardName, type MeikyuuTrailName } from "./boards.ts";
import { MEIKYUU_KINDS, type MeikyuuKind } from "./levels.ts";
import { mountMeikyuu, type MeikyuuMount } from "./mount.ts";
import { MEIKYUU_ORIENTATIONS, type MeikyuuOrientation } from "./orientation.ts";
import type { StoneOption } from "./stones.ts";
import type { MeikyuuLanguage } from "./strings.ts";
import { FIT_MODES, type FitMode } from "./viewport.ts";

/**
 * THE `<meikyuu-board>` ELEMENT: a playable Meikyuu board in a tag, with no framework.
 * `@johnmorrisdotca/meikyuu/element/define` defines it; this entry holds the class alone, to extend or to
 * define under another name. Safe to import on a server, where there is no page: the class then extends nothing.
 *
 * ```html
 * <meikyuu-board level="12"></meikyuu-board>
 * <meikyuu-board kind="arrows" level="5" board="wood"></meikyuu-board>
 * <meikyuu-board recipe="heart:25:wilson:to-goal:5" tap></meikyuu-board>
 * ```
 *
 * Attributes (each is read again when it changes):
 *  - `kind`: `maze` (default), `arrows` or `mixed`; `level`: the number in that list, from 1. Or `recipe`: a recipe of
 *    your own as its code, such as `square:12x9:wilson:to-goal:48213` or `heart:15:6:77`.
 *  - `board`: `paper` (default), `wood`, `green`, `blue`, `red` or `black`. `trail`: the line's colour, `green`
 *    (default), `blue`, `red`, `violet` or `orange`.
 *  - `tap`: a tap runs the line along the corridor to the next fork. `hints="off"`: no Hint button. `sound`: make sounds.
 *  - `controls="off"`: only the board. `zoom="off"`: no zoom pad.
 *  - `ratio`: the shape of the box, `square` (default), `maze`, or width over height as a number or a fraction (`2/3` for a tall level).
 *    `orientation`: `auto` (default), `portrait` or `landscape`. `gutter`: the page left beside the box, in pixels (24). `reserve`: what else
 *    is on the screen, in pixels (200). `fit`: `both` (default), `width` or `height`. `pan`: every one-finger drag moves the view.
 *    `edge-pan="off"`: a line drawn to the edge does not move the view. `turn-button`: show a Turn button.
 *  - `stones`: stones for mazes, a marble to lay beside the line that the line may not enter (see `mountMeikyuu`). `stone-limit`: how many at once
 *    (a number, or `none` for no limit; a few by default). `stone-reach`: how far from the line one may be laid, 1 or 2 cells (2).
 *  - `lang`: `en` or `ja`, or the page's.
 *
 * It fires `meikyuu-move`, `meikyuu-solve`, `meikyuu-key`, `meikyuu-unlock`, `meikyuu-bump`, `meikyuu-lose` and `meikyuu-stones` (see
 * `mountMeikyuu`), and has the methods `undo()`, `restart()`, `hint()` and `fit()`. Nothing in it can be selected,
 * and its box stays one steady square whatever is drawn.
 */
const ElementBase: typeof HTMLElement = typeof HTMLElement === "undefined" ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

const isOn = (value: string | null, fallback = false): boolean => (value === null ? fallback : !["false", "off", "0", "no"].includes(value.toLowerCase()));
/** A box shape written as `square`, `maze`, a number, or a fraction such as `2/3`. */
function ratioOf(value: string | null): "square" | "maze" | number | undefined {
  if (value === null || value === "square") return undefined;
  if (value === "maze") return "maze";
  const [top, bottom] = value.split("/");
  const number = bottom === undefined ? Number(top) : Number(top) / Number(bottom);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}
const numberOf = (value: string | null): number | undefined => (value === null || value.trim() === "" || !Number.isFinite(Number(value)) ? undefined : Number(value));
const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined => (allowed.includes(value as T) ? (value as T) : undefined);

export class MeikyuuBoard extends ElementBase {
  static observedAttributes = ["kind", "level", "recipe", "board", "trail", "tap", "hints", "sound", "controls", "zoom", "lang", "ratio", "orientation", "gutter", "reserve", "fit", "pan", "edge-pan", "turn-button", "stones", "stone-limit", "stone-reach"];

  #mount: MeikyuuMount | null = null;
  #key = "";
  #queued = false;

  connectedCallback(): void {
    this.#refresh();
  }

  disconnectedCallback(): void {
    this.#mount?.destroy();
    this.#mount = null;
    this.#key = "";
  }

  attributeChangedCallback(): void {
    if (!this.isConnected || this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      this.#refresh();
    });
  }

  /** The mounted board's handle (`mountMeikyuu`), or null until a puzzle has loaded. */
  get mount(): MeikyuuMount | null {
    return this.#mount;
  }

  undo(): void {
    this.#mount?.undo();
  }

  restart(): void {
    this.#mount?.restart();
  }

  hint(): void {
    this.#mount?.hint();
  }

  fit(): void {
    this.#mount?.fit();
  }

  #refresh(): void {
    const kind = oneOf<MeikyuuKind>(this.getAttribute("kind"), MEIKYUU_KINDS) ?? "maze";
    const level = this.getAttribute("level") === null ? undefined : Number(this.getAttribute("level"));
    const recipe = this.getAttribute("recipe") ?? undefined;
    const controls = isOn(this.getAttribute("controls"), true);
    const zoom = isOn(this.getAttribute("zoom"), true);
    const ratio = ratioOf(this.getAttribute("ratio"));
    const reserve = numberOf(this.getAttribute("reserve"));
    const gutter = numberOf(this.getAttribute("gutter"));
    const turnButton = isOn(this.getAttribute("turn-button"));
    const key = JSON.stringify([kind, level, recipe, controls, zoom, ratio, reserve, gutter, turnButton]);
    const orientation = oneOf<MeikyuuOrientation>(this.getAttribute("orientation"), MEIKYUU_ORIENTATIONS) ?? "auto";
    const fit = oneOf<FitMode>(this.getAttribute("fit"), FIT_MODES) ?? "both";
    const pan = isOn(this.getAttribute("pan"));
    const edgePan = isOn(this.getAttribute("edge-pan"), true);
    const settings = {
      board: oneOf<MeikyuuBoardName>(this.getAttribute("board"), MEIKYUU_BOARD_NAMES),
      trail: oneOf<MeikyuuTrailName>(this.getAttribute("trail"), MEIKYUU_TRAIL_NAMES),
      tap: isOn(this.getAttribute("tap")),
      hints: isOn(this.getAttribute("hints"), true),
      sound: isOn(this.getAttribute("sound")),
      language: oneOf<MeikyuuLanguage>(this.getAttribute("lang"), ["en", "ja"] as const),
    };
    const stones: StoneOption | undefined = isOn(this.getAttribute("stones"))
      ? { ...(this.getAttribute("stone-limit") === null ? {} : { limit: this.getAttribute("stone-limit")!.trim().toLowerCase() === "none" ? null : numberOf(this.getAttribute("stone-limit")) }), ...(numberOf(this.getAttribute("stone-reach")) === undefined ? {} : { reach: numberOf(this.getAttribute("stone-reach")) }) }
      : undefined;
    const live = (mount: MeikyuuMount): void => {
      mount.set({ ...settings, stones });
      mount.orientation(orientation);
      mount.pan(pan);
      mount.edgePan(edgePan);
    };
    if (key === this.#key && this.#mount !== null) {
      live(this.#mount);
      return;
    }
    if (recipe === undefined && (level === undefined || !Number.isInteger(level))) return;
    this.#mount?.destroy();
    this.#key = key;
    this.#mount = mountMeikyuu(this, { kind, level, recipe, ...settings, stones, controls, zoom, ratio, reserve, gutter, fit, orientation, pan, edgePan, turnButton });
  }
}
