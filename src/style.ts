import { MEIKYUU_TRAILS } from "./boards.ts";

/**
 * THE STYLE a Meikyuu drawing wears: the colours of the board and of the line as custom properties, the
 * motion (the ripple a solved maze makes, an arrow bumping), and the one rule that matters for a game played
 * with fingers: nothing in the drawing can be selected, dragged or double-tapped.
 *
 * `drawMaze` and `drawArrows` only write classes and data attributes, and, for a board other than plain
 * paper, the custom properties below; this gives them a look. Every colour is a custom property on
 * `.meikyuu` (`--mk-paper`, `--mk-wall`, `--mk-frame`, `--mk-trail`, `--mk-start`, `--mk-goal`, `--mk-key`,
 * `--mk-hint`, `--mk-bad`), so a page's own style needs to set only the ones it wants different. Paper follows
 * the page's light or dark. With reduced motion asked for, nothing moves.
 */
const TRAIL_RULES = Object.entries(MEIKYUU_TRAILS)
  .map(([name, { light, dark }]) => `.meikyuu[data-board="paper"][data-trail="${name}"] { --mk-trail: ${light}; }\n@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .meikyuu[data-board="paper"][data-trail="${name}"] { --mk-trail: ${dark}; } }\n:root[data-theme="dark"] .meikyuu[data-board="paper"][data-trail="${name}"] { --mk-trail: ${dark}; }`)
  .join("\n");

export const MEIKYUU_STYLE = `
.meikyuu {
  --mk-paper: #fbf8f1; --mk-wall: #1f2320; --mk-frame: #a98954; --mk-trail: #2e8b57; --mk-start: #2f7a4f; --mk-goal: #e0b43b;
  --mk-key: #e0b43b; --mk-hint: #f2a900; --mk-bad: #b5452c; --mk-dot: rgba(0,0,0,.14); --mk-ink: #1f2320; --mk-stone: #4b5d8f; --mk-stone-edge: #161c33;
  display: block; width: 100%; height: auto; overflow: hidden;
  user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: none; -webkit-tap-highlight-color: transparent;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .meikyuu[data-board="paper"] { --mk-paper: #262a27; --mk-wall: #ece8dc; --mk-frame: #6b5632; --mk-trail: #6fcf97; --mk-start: #6fcf97; --mk-dot: rgba(255,255,255,.14); --mk-ink: #ece8dc; --mk-stone: #b3c0ea; --mk-stone-edge: #0e1220; }
}
:root[data-theme="dark"] .meikyuu[data-board="paper"] { --mk-paper: #262a27; --mk-wall: #ece8dc; --mk-frame: #6b5632; --mk-trail: #6fcf97; --mk-start: #6fcf97; --mk-dot: rgba(255,255,255,.14); --mk-ink: #ece8dc; --mk-stone: #b3c0ea; --mk-stone-edge: #0e1220; }
.meikyuu * { user-select: none; -webkit-user-select: none; }
.meikyuu .mk-paper { fill: var(--mk-paper); }
.meikyuu .mk-frame { fill: none; stroke: var(--mk-frame); stroke-width: 0.5; opacity: .9; }
.meikyuu .mk-walls { fill: none; stroke: var(--mk-wall); stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }
.meikyuu .mk-solution { fill: none; stroke: var(--mk-goal); stroke-linecap: round; stroke-linejoin: round; opacity: .55; pointer-events: none; }
.meikyuu .mk-trail { fill: none; stroke: var(--mk-trail); stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }
.meikyuu .mk-head { fill: var(--mk-trail); stroke: var(--mk-paper); pointer-events: none; }
.meikyuu .mk-hint { fill: none; stroke: var(--mk-hint); stroke-linecap: round; stroke-linejoin: round; opacity: .85; pointer-events: none; }
.meikyuu .mk-hint[data-kind="back"] { stroke: var(--mk-bad); }
.meikyuu .mk-start { fill: var(--mk-start); stroke: var(--mk-paper); }
.meikyuu .mk-goal { fill: var(--mk-goal); stroke: var(--mk-wall); }
.meikyuu .mk-door { fill: var(--mk-goal); stroke: var(--mk-wall); stroke-linejoin: round; stroke-width: 0.06; }
.meikyuu .mk-door[data-door="in"] { fill: var(--mk-start); }
.meikyuu .mk-key { fill: var(--mk-key); stroke: var(--mk-wall); stroke-width: 0.06; stroke-linejoin: round; }
.meikyuu .mk-key[data-got="true"] { opacity: .3; }
.meikyuu .mk-stone { fill: var(--mk-stone); stroke: var(--mk-stone-edge); pointer-events: none; }
.meikyuu .mk-gleam { fill: #fff; opacity: .55; pointer-events: none; }
.meikyuu .mk-dot { fill: var(--mk-dot); pointer-events: none; }
.meikyuu .mk-arrow { pointer-events: all; cursor: pointer; transition: transform .42s cubic-bezier(.5,0,.9,.4), opacity .42s; }
.meikyuu .mk-arrow .mk-stem { fill: none; stroke: var(--mk-arrow); stroke-width: 0.26; stroke-linecap: round; stroke-linejoin: round; }
.meikyuu .mk-arrow .mk-point { fill: var(--mk-arrow); stroke: var(--mk-arrow); stroke-width: 0.08; stroke-linejoin: round; }
.meikyuu .mk-arrow[data-locked="true"] { --mk-arrow: #8a8f87 !important; }
.meikyuu .mk-arrow[data-locked="true"] .mk-stem { stroke-dasharray: 0.35 0.2; }
.meikyuu .mk-lock { fill: #f3efe4; stroke: #1f2320; stroke-width: 0.07; }
.meikyuu .mk-arrow[data-gone="true"] { opacity: 0; pointer-events: none; }
.meikyuu .mk-arrow[data-bump="true"] { animation: mk-bump .34s ease-in-out; }
.meikyuu .mk-arrow[data-bump="true"] .mk-stem, .meikyuu .mk-arrow[data-bump="true"] .mk-point { stroke: var(--mk-bad); }
.meikyuu .mk-arrow[data-by="true"] .mk-stem { stroke: var(--mk-bad); }
.meikyuu .mk-arrow[data-hint="true"] .mk-stem { stroke: var(--mk-hint); }
.meikyuu[data-won="true"] .mk-trail { stroke: var(--mk-goal); animation: mk-ripple 1.2s ease-out 1; }
/* A long line is not rippled: the ripple repaints the whole line every frame, which a line of thousands of cells makes slow (a colossal maze). */
.meikyuu[data-won="true"][data-long="true"] .mk-trail { animation: none; }
@keyframes mk-bump { 20% { transform: translate(var(--mk-bx, 0.12px), var(--mk-by, 0)); } 50% { transform: translate(calc(var(--mk-bx, 0.12px) * -1), calc(var(--mk-by, 0) * -1)); } }
@keyframes mk-ripple { 0% { stroke-width: 0.6; } 100% { stroke-width: 0.34; } }
${TRAIL_RULES}
@media (prefers-reduced-motion: reduce) {
  .meikyuu .mk-arrow { transition: none; }
  .meikyuu .mk-arrow[data-bump="true"], .meikyuu[data-won="true"] .mk-trail { animation: none; }
}
`;
