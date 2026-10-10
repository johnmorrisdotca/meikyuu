import { embedDay, dailySeed } from "./embed-day.ts";
import { MEIKYUU_PLAY_STYLE } from "./playStyle.ts";
import { levelCount } from "./levels.ts";
import { MEIKYUU_BOARD_NAMES, MEIKYUU_TRAIL_NAMES, type MeikyuuBoardName, type MeikyuuTrailName } from "./boards.ts";
import { MEIKYUU_KINDS, type MeikyuuKind } from "./levels.ts";
import { mountMeikyuu, type MeikyuuMount, type MeikyuuMountOptions } from "./mount.ts";
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
 *  - `tap`: a tap runs the line along the corridor to the next fork. `hints="off"`: no Hint button. `banner="off"`: no message over a solved board. `sound`: make sounds.
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

const isOn = (value: string | null, fallback = false): boolean => (value === null ? fallback : !["false", "off", "0", "no"].includes(value.trim().toLowerCase()));
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

/** The real mounted-board options, checked by TypeScript and the embed builder. */
export const MEIKYUU_EMBED_OPTION_KEYS = Object.keys({ kind: true, level: true, recipe: true, tap: true, hints: true, banner: true, controls: true, zoom: true, ratio: true, orientation: true, gutter: true, reserve: true, fit: true, edgePan: true, pan: true, turnButton: true, sound: true, stones: true, language: true, board: true, trail: true, wall: true, line: true, onMove: true, onSolve: true, onKey: true, onUnlock: true, onBump: true, onLose: true, onStones: true } satisfies Record<keyof MeikyuuMountOptions, boolean>);
/** Host callbacks; the same actions emit native events. */
export type MeikyuuElementOptions = Pick<MeikyuuMountOptions, "onMove" | "onSolve" | "onKey" | "onUnlock" | "onBump" | "onLose" | "onStones" | "wall" | "line" | "board" | "trail" | "recipe">;

export class MeikyuuBoard extends ElementBase {
  static observedAttributes = ["kind", "level", "recipe", "board", "trail", "tap", "hints", "banner", "sound", "controls", "zoom", "lang", "ratio", "orientation", "gutter", "reserve", "fit", "pan", "edge-pan", "turn-button", "stones", "stone-limit", "stone-reach", "size", "daily", "theme", "width", "label"];

  #widthBefore: string | null = null;
  #widthOwned = false;
  #labelBefore: { role: string | null; label: string | null } | null = null;
  #write(name: string, value: unknown): void {
    if (value === null || value === undefined) this.removeAttribute(name);
    else this.setAttribute(name, String(value));
  }
  #frame(): void {
    this.setAttribute("data-meikyuu-embed", "");
    const width = Number(this.getAttribute("width"));
    const size = this.getAttribute("size");
    const displaySize = size === null && (this.hasAttribute("daily")) ? "medium" : size;
    const owned = (this.hasAttribute("width") && Number.isFinite(width) && width > 0) || (displaySize !== null && ["small", "medium", "large"].includes(displaySize));
    if (owned && !this.#widthOwned) { this.#widthBefore = this.style.width; this.#widthOwned = true; }
    if (this.hasAttribute("width") && Number.isFinite(width) && width > 0) this.style.width = `${Math.min(width, 2000)}px`;
    else if (displaySize !== null && ["small", "medium", "large"].includes(displaySize)) this.style.width = `${{ small: 320, medium: 480, large: 640 }[displaySize as "small" | "medium" | "large"]}px`;
    else if (this.#widthOwned) { this.style.width = this.#widthBefore ?? ""; this.#widthOwned = false; }
    this.style.maxWidth = "100%";
    const theme = this.getAttribute("theme"); this.style.colorScheme = theme === "light" || theme === "dark" ? theme : "light dark";
    const root = this.getRootNode();
    const target: ParentNode = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root : this.ownerDocument.head;
    if (target.querySelector("style[data-meikyuu-embed-style]") === null) {
      const style = this.ownerDocument.createElement("style"); style.setAttribute("data-meikyuu-embed-style", "");
      const rules = (theme: string) => [...MEIKYUU_PLAY_STYLE.matchAll(new RegExp(`:root\\[data-theme="${theme}"\\] ([^{]+)\\{([^}]+)\\}`, "g"))].map(match => `[data-meikyuu-embed][theme="${theme}"]${match[1].trim() === ".meikyuu-play" ? ".meikyuu-play" : ` ${match[1].trim()}`} {${match[2]}}`).join("\n");
      const light = [...MEIKYUU_PLAY_STYLE.matchAll(/\.(meikyuu|meikyuu-play) \{([^}]+)\}/g)].filter(match => !match[2].includes("#ece8dc") && !match[2].includes("#171a18"));
      style.textContent = `@media(prefers-color-scheme:dark){${rules("dark").replaceAll('[theme="dark"]', ':not([theme="light"]):not([theme="dark"])')}}\n${rules("dark")}\n${light.map(match => `[data-meikyuu-embed][theme="light"]${match[1] === "meikyuu-play" ? ".meikyuu-play" : " .meikyuu"} {${match[2]}}`).join("\n")}\n[data-meikyuu-embed][label]{outline-offset:2px}`;
      target.append(style);
    }
    if (this.hasAttribute("label")) { this.#labelBefore ??= { role: this.getAttribute("role"), label: this.getAttribute("aria-label") }; this.setAttribute("role", "group"); this.setAttribute("aria-label", this.getAttribute("label")!); }
    else if (this.#labelBefore !== null) { for (const [name, value] of [["role", this.#labelBefore.role], ["aria-label", this.#labelBefore.label]]) { if (value === null) this.removeAttribute(name!); else this.setAttribute(name!, value); } this.#labelBefore = null; }
  }

  #options: MeikyuuElementOptions = {};
  /** Host callbacks, read at event time without restarting play. */
  get options(): MeikyuuElementOptions { return this.#options; }
  set options(value: MeikyuuElementOptions) { this.#options = value ?? {}; if (this.isConnected) this.#refresh(); }
  #problem(message: string): void {
    this.#mount?.destroy(); this.#mount = null; this.#key = "";
    const status = this.ownerDocument.createElement("p"); status.setAttribute("role", "status"); status.textContent = message; this.replaceChildren(status);
    this.dispatchEvent(new CustomEvent("meikyuu-error", { bubbles: true, composed: true, detail: { message } }));
  }

  /** The `kind` attribute, reflected. */
  get kind(): string | null { return this.getAttribute("kind"); }
  set kind(value: string | number | boolean | null | undefined) { this.#write("kind", value); }
  /** The `level` attribute, reflected. */
  get level(): string | null { return this.getAttribute("level"); }
  set level(value: string | number | boolean | null | undefined) { this.#write("level", value); }
  /** The `recipe` attribute, reflected. */
  get recipe(): string | null { return this.getAttribute("recipe"); }
  set recipe(value: string | number | boolean | null | undefined) { this.#write("recipe", value); }
  /** The `board` attribute, reflected. */
  get board(): string | null { return this.getAttribute("board"); }
  set board(value: string | number | boolean | null | undefined) { this.#write("board", value); }
  /** The `trail` attribute, reflected. */
  get trail(): string | null { return this.getAttribute("trail"); }
  set trail(value: string | number | boolean | null | undefined) { this.#write("trail", value); }
  /** The `tap` attribute, reflected. */
  get tap(): string | null { return this.getAttribute("tap"); }
  set tap(value: string | number | boolean | null | undefined) { this.#write("tap", value); }
  /** The `hints` attribute, reflected. */
  get hints(): string | null { return this.getAttribute("hints"); }
  set hints(value: string | number | boolean | null | undefined) { this.#write("hints", value); }
  /** The `banner` attribute, reflected. */
  get banner(): string | null { return this.getAttribute("banner"); }
  set banner(value: string | number | boolean | null | undefined) { this.#write("banner", value); }
  /** The `sound` attribute, reflected. */
  get sound(): string | null { return this.getAttribute("sound"); }
  set sound(value: string | number | boolean | null | undefined) { this.#write("sound", value); }
  /** The `controls` attribute, reflected. */
  get controls(): string | null { return this.getAttribute("controls"); }
  set controls(value: string | number | boolean | null | undefined) { this.#write("controls", value); }
  /** The `zoom` attribute, reflected. */
  get zoom(): string | null { return this.getAttribute("zoom"); }
  set zoom(value: string | number | boolean | null | undefined) { this.#write("zoom", value); }
  /** The `ratio` attribute, reflected. */
  get ratio(): string | null { return this.getAttribute("ratio"); }
  set ratio(value: string | number | boolean | null | undefined) { this.#write("ratio", value); }
  /** The `orientation` attribute, reflected. */
  get orientation(): string | null { return this.getAttribute("orientation"); }
  set orientation(value: string | number | boolean | null | undefined) { this.#write("orientation", value); }
  /** The `gutter` attribute, reflected. */
  get gutter(): string | null { return this.getAttribute("gutter"); }
  set gutter(value: string | number | boolean | null | undefined) { this.#write("gutter", value); }
  /** The `reserve` attribute, reflected. */
  get reserve(): string | null { return this.getAttribute("reserve"); }
  set reserve(value: string | number | boolean | null | undefined) { this.#write("reserve", value); }
  /** The `pan` attribute, reflected. */
  get pan(): string | null { return this.getAttribute("pan"); }
  set pan(value: string | number | boolean | null | undefined) { this.#write("pan", value); }
  /** The `edge-pan` attribute, reflected. */
  get "edge-pan"(): string | null { return this.getAttribute("edge-pan"); }
  set "edge-pan"(value: string | number | boolean | null | undefined) { this.#write("edge-pan", value); }
  /** The `edge-pan` attribute, reflected. */
  get edgePan(): string | null { return this.getAttribute("edge-pan"); }
  set edgePan(value: string | number | boolean | null | undefined) { this.#write("edge-pan", value); }
  /** The `turn-button` attribute, reflected. */
  get "turn-button"(): string | null { return this.getAttribute("turn-button"); }
  set "turn-button"(value: string | number | boolean | null | undefined) { this.#write("turn-button", value); }
  /** The `turn-button` attribute, reflected. */
  get turnButton(): string | null { return this.getAttribute("turn-button"); }
  set turnButton(value: string | number | boolean | null | undefined) { this.#write("turn-button", value); }
  /** The `stones` attribute, reflected. */
  get stones(): string | null { return this.getAttribute("stones"); }
  set stones(value: string | number | boolean | null | undefined) { this.#write("stones", value); }
  /** The `stone-limit` attribute, reflected. */
  get "stone-limit"(): string | null { return this.getAttribute("stone-limit"); }
  set "stone-limit"(value: string | number | boolean | null | undefined) { this.#write("stone-limit", value); }
  /** The `stone-limit` attribute, reflected. */
  get stoneLimit(): string | null { return this.getAttribute("stone-limit"); }
  set stoneLimit(value: string | number | boolean | null | undefined) { this.#write("stone-limit", value); }
  /** The `stone-reach` attribute, reflected. */
  get "stone-reach"(): string | null { return this.getAttribute("stone-reach"); }
  set "stone-reach"(value: string | number | boolean | null | undefined) { this.#write("stone-reach", value); }
  /** The `stone-reach` attribute, reflected. */
  get stoneReach(): string | null { return this.getAttribute("stone-reach"); }
  set stoneReach(value: string | number | boolean | null | undefined) { this.#write("stone-reach", value); }
  /** The `size` attribute, reflected. */
  get size(): string | null { return this.getAttribute("size"); }
  set size(value: string | number | boolean | null | undefined) { this.#write("size", value); }
  /** The `daily` attribute, reflected. */
  get daily(): string | null { return this.getAttribute("daily"); }
  set daily(value: string | number | boolean | null | undefined) { this.#write("daily", value); }
  /** The `theme` attribute, reflected. */
  get theme(): string | null { return this.getAttribute("theme"); }
  set theme(value: string | number | boolean | null | undefined) { this.#write("theme", value); }
  /** The `width` attribute, reflected. */
  get width(): string | null { return this.getAttribute("width"); }
  set width(value: string | number | boolean | null | undefined) { this.#write("width", value); }
  /** The `label` attribute, reflected. */
  get label(): string | null { return this.getAttribute("label"); }
  set label(value: string | number | boolean | null | undefined) { this.#write("label", value); }

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
    if (!this.isConnected) return;
    this.#frame();
    const kind = oneOf<MeikyuuKind>(this.getAttribute("kind"), MEIKYUU_KINDS) ?? "maze";
    let level = this.getAttribute("level") === null ? undefined : Number(this.getAttribute("level"));
    const recipe = this.getAttribute("recipe") ?? this.#options.recipe;
    let day: string | null;
    try { day = recipe === undefined ? embedDay(this.getAttribute("daily")) : null; } catch { this.#problem("Use a real UTC date written YYYY-MM-DD."); return; }
    if (day === null) this.removeAttribute("data-day"); else this.setAttribute("data-day", day);
    if (day !== null) level = dailySeed(day, `meikyuu/${kind}`) % levelCount(kind) + 1;
    const controls = isOn(this.getAttribute("controls"), true);
    const zoom = isOn(this.getAttribute("zoom"), true);
    const ratio = ratioOf(this.getAttribute("ratio"));
    const reserve = numberOf(this.getAttribute("reserve"));
    const gutter = numberOf(this.getAttribute("gutter"));
    const turnButton = isOn(this.getAttribute("turn-button"));
    const key = JSON.stringify([kind, level, day, recipe, controls, zoom, ratio, reserve, gutter, turnButton]);
    const orientation = oneOf<MeikyuuOrientation>(this.getAttribute("orientation"), MEIKYUU_ORIENTATIONS) ?? "auto";
    const fit = oneOf<FitMode>(this.getAttribute("fit"), FIT_MODES) ?? "both";
    const pan = isOn(this.getAttribute("pan"));
    const edgePan = isOn(this.getAttribute("edge-pan"), true);
    const settings = {
      board: this.#options.board ?? oneOf<MeikyuuBoardName>(this.getAttribute("board"), MEIKYUU_BOARD_NAMES),
      trail: this.#options.trail ?? oneOf<MeikyuuTrailName>(this.getAttribute("trail"), MEIKYUU_TRAIL_NAMES),
      wall: this.#options.wall, line: this.#options.line,
      tap: isOn(this.getAttribute("tap")),
      hints: isOn(this.getAttribute("hints"), true),
      banner: isOn(this.getAttribute("banner"), true),
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
    this.#mount = mountMeikyuu(this, { kind, level, recipe, ...settings, stones, controls, zoom, ratio, reserve, gutter, fit, orientation, pan, edgePan, turnButton,
      onMove: (detail) => this.#options.onMove?.(detail), onSolve: (detail) => this.#options.onSolve?.(detail), onKey: (detail) => this.#options.onKey?.(detail), onUnlock: (detail) => this.#options.onUnlock?.(detail), onBump: (detail) => this.#options.onBump?.(detail), onLose: (detail) => this.#options.onLose?.(detail), onStones: (detail) => this.#options.onStones?.(detail),
    });
    if (this.#mount === null) { this.#problem("Choose a valid kind, level or recipe."); return; }
    this.#frame(); this.dispatchEvent(new CustomEvent("meikyuu-load", { bubbles: true, composed: true, detail: { kind, level: level ?? null, day } }));
  }
}

// Keep fit() callable while a framework can assign its attribute.
const fitMethod = MeikyuuBoard.prototype.fit;
Object.defineProperty(MeikyuuBoard.prototype, "fit", { configurable: true, get() { return fitMethod; }, set(this: Element, value: unknown) { if (value === null || value === undefined) this.removeAttribute("fit"); else this.setAttribute("fit", String(value)); } });
/** Register a standard or custom tag without replacing a definition. Safe without a browser. */
export function defineBoard(tag = "meikyuu-board"): void {
  if (typeof customElements === "undefined" || customElements.get(tag) !== undefined) return;
  customElements.define(tag, tag === "meikyuu-board" ? MeikyuuBoard : class extends MeikyuuBoard {});
}
