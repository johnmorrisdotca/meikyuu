import { MEIKYUU_BOARD_NAMES, MEIKYUU_TRAIL_NAMES, type MeikyuuBoardName, type MeikyuuTrailName } from "./boards.ts";
import { MEIKYUU_KINDS, type MeikyuuKind } from "./levels.ts";
import { mountMeikyuu, type MeikyuuMount } from "./mount.ts";
import type { MeikyuuLanguage } from "./strings.ts";

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
 *  - `lang`: `en` or `ja`, or the page's.
 *
 * It fires `meikyuu-move`, `meikyuu-solve`, `meikyuu-key`, `meikyuu-unlock`, `meikyuu-bump` and `meikyuu-lose` (see
 * `mountMeikyuu`), and has the methods `undo()`, `restart()`, `hint()` and `fit()`. Nothing in it can be selected,
 * and its box stays one steady square whatever is drawn.
 */
const ElementBase: typeof HTMLElement = typeof HTMLElement === "undefined" ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

const isOn = (value: string | null, fallback = false): boolean => (value === null ? fallback : !["false", "off", "0", "no"].includes(value.toLowerCase()));
const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined => (allowed.includes(value as T) ? (value as T) : undefined);

export class MeikyuuBoard extends ElementBase {
  static observedAttributes = ["kind", "level", "recipe", "board", "trail", "tap", "hints", "sound", "controls", "zoom", "lang"];

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
    const key = JSON.stringify([kind, level, recipe, controls, zoom]);
    const settings = {
      board: oneOf<MeikyuuBoardName>(this.getAttribute("board"), MEIKYUU_BOARD_NAMES),
      trail: oneOf<MeikyuuTrailName>(this.getAttribute("trail"), MEIKYUU_TRAIL_NAMES),
      tap: isOn(this.getAttribute("tap")),
      hints: isOn(this.getAttribute("hints"), true),
      sound: isOn(this.getAttribute("sound")),
      language: oneOf<MeikyuuLanguage>(this.getAttribute("lang"), ["en", "ja"] as const),
    };
    if (key === this.#key && this.#mount !== null) {
      this.#mount.set(settings);
      return;
    }
    if (recipe === undefined && (level === undefined || !Number.isInteger(level))) return;
    this.#mount?.destroy();
    this.#key = key;
    this.#mount = mountMeikyuu(this, { kind, level, recipe, ...settings, controls, zoom });
  }
}
