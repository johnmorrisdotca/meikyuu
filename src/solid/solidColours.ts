import { lookAttributes, type MazeLook } from "../draw.ts";
import type { Rgb, SolidColours } from "./solidPaint.ts";

/**
 * THE COLOURS A SOLID IS PAINTED IN, read from the page: the drawing's custom properties (`--mk-paper`, `--mk-wall`, `--mk-trail`, ...), as the
 * flat mazes have them, so a board, a line colour and the page's light or dark change a solid exactly as they change a maze. A canvas cannot use a
 * custom property, so each is resolved to a colour by the browser (through an element's own `color`) and kept until the look or the page's theme changes.
 */

const PROPERTIES = { paper: "--mk-paper", wall: "--mk-wall", trail: "--mk-trail", start: "--mk-start", goal: "--mk-goal", hint: "--mk-hint", bad: "--mk-bad", stone: "--mk-stone", stoneEdge: "--mk-stone-edge" } as const;

/** What the canvas wears so that the stylesheet's custom properties apply to it: the look's attributes, as a maze's own svg has them. */
export function applyLook(canvas: HTMLElement, look: MazeLook): void {
  const probe = canvas.ownerDocument.createElement("div");
  probe.innerHTML = `<i ${lookAttributes(look)}></i>`;
  const source = probe.firstElementChild!;
  canvas.setAttribute("class", `${source.getAttribute("class") ?? "meikyuu"} mk-solid`);
  for (const name of ["data-board", "data-trail", "style"]) {
    const value = source.getAttribute(name);
    if (value === null) canvas.removeAttribute(name);
    else canvas.setAttribute(name, value);
  }
}

/** A colour the browser understands as its three parts and alpha. */
function resolve(probe: HTMLElement, value: string, fallback: string): { rgb: Rgb; css: string } {
  probe.style.color = "";
  probe.style.color = value.trim() === "" ? fallback : value.trim();
  const computed = probe.ownerDocument.defaultView!.getComputedStyle(probe).color;
  const found = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(computed);
  const rgb: Rgb = found === null ? [128, 128, 128] : [Number(found[1]), Number(found[2]), Number(found[3])];
  return { rgb, css: `rgb(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])})` };
}

/** The colours the canvas's custom properties come to now. */
export function readColours(canvas: HTMLElement): SolidColours {
  const document = canvas.ownerDocument;
  const style = document.defaultView!.getComputedStyle(canvas);
  const probe = document.createElement("span");
  probe.style.display = "none";
  canvas.parentElement?.append(probe);
  const get = (name: keyof typeof PROPERTIES, fallback: string): { rgb: Rgb; css: string } => resolve(probe, style.getPropertyValue(PROPERTIES[name]), fallback);
  const paper = get("paper", "#fbf8f1");
  const wall = get("wall", "#1f2320");
  probe.remove();
  const mix = (k: number): string => `rgb(${[0, 1, 2].map((i) => Math.round(paper.rgb[i]! + (wall.rgb[i]! - paper.rgb[i]!) * k)).join(",")})`;
  const probe2 = document.createElement("span");
  probe2.style.display = "none";
  canvas.parentElement?.append(probe2);
  const colours: SolidColours = {
    paper: paper.rgb,
    ground: mix(0.1),
    wall: wall.css,
    trail: resolve(probe2, style.getPropertyValue(PROPERTIES.trail), "#2e8b57").css,
    start: resolve(probe2, style.getPropertyValue(PROPERTIES.start), "#2f7a4f").css,
    goal: resolve(probe2, style.getPropertyValue(PROPERTIES.goal), "#e0b43b").css,
    hint: resolve(probe2, style.getPropertyValue(PROPERTIES.hint), "#f2a900").css,
    bad: resolve(probe2, style.getPropertyValue(PROPERTIES.bad), "#b5452c").css,
    stone: resolve(probe2, style.getPropertyValue(PROPERTIES.stone), "#4b5d8f").css,
    stoneEdge: resolve(probe2, style.getPropertyValue(PROPERTIES.stoneEdge), "#161c33").css,
  };
  probe2.remove();
  return colours;
}
