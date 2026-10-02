import { MEIKYUU_STYLE } from "./style.ts";

/**
 * THE STYLE a playable Meikyuu board wears (`mountMeikyuu`, `<meikyuu-board>`): the drawing's own
 * (`MEIKYUU_STYLE`) and the board's box, its buttons, its lines of words and its tabs. Colours are custom
 * properties on `.meikyuu-play` (`--mkp-ink`, `--mkp-muted`, `--mkp-rule`, `--mkp-surface`, `--mkp-accent`,
 * `--mkp-good`) so a page sets only what it wants different.
 *
 * Nothing moves when something is chosen: the board is one steady box (square unless the page asks for another `ratio`), always with some
 * page beside it, the lines of words keep the room
 * their longest wording takes, and the buttons are one size. Nothing the player touches can be selected.
 */
export const MEIKYUU_PLAY_STYLE = `${MEIKYUU_STYLE}
.meikyuu-play {
  --mkp-ink: #1f2320; --mkp-muted: #6b6f68; --mkp-rule: #ddd6c6; --mkp-surface: #fbf8f1; --mkp-accent: #b5452c; --mkp-good: #2f7a4f;
  --mkp-gutter: 24px; --mkp-reserve: 200px;
  display: block; max-width: 100%; box-sizing: border-box; color: var(--mkp-ink); font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
  /* Only the box asks the browser to keep touches; everything round it scrolls the page, and the page can still be pinched. */
  touch-action: pan-y pinch-zoom;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .meikyuu-play { --mkp-ink: #ece8dc; --mkp-muted: #a09d93; --mkp-rule: #3a3d38; --mkp-surface: #1d201e; --mkp-accent: #ff8a6b; --mkp-good: #6fcf97; }
}
:root[data-theme="dark"] .meikyuu-play { --mkp-ink: #ece8dc; --mkp-muted: #a09d93; --mkp-rule: #3a3d38; --mkp-surface: #1d201e; --mkp-accent: #ff8a6b; --mkp-good: #6fcf97; }
.meikyuu-play *, .meikyuu-play *::before, .meikyuu-play *::after { box-sizing: border-box; user-select: none; -webkit-user-select: none; }
.meikyuu-play .mk-wrap {
  position: relative; margin-inline: auto; aspect-ratio: var(--mkp-aspect, 1);
  width: min(100%, calc(100vw - 2 * var(--mkp-gutter)), calc(max(100vh - var(--mkp-reserve), 60vh) * var(--mkp-aspect, 1)));
}
@supports (height: 100dvh) {
  .meikyuu-play .mk-wrap { width: min(100%, calc(100vw - 2 * var(--mkp-gutter)), calc(max(100dvh - var(--mkp-reserve), 60dvh) * var(--mkp-aspect, 1))); }
}
.meikyuu-play .mk-box { position: absolute; inset: 0; overflow: hidden; touch-action: none; overscroll-behavior: contain; border-radius: 10px; cursor: crosshair; outline-offset: 3px; }
.meikyuu-play .mk-box:focus-visible { outline: 2px solid var(--mkp-ink); }
.meikyuu-play .mk-box > svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.meikyuu-play .mk-banner { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(.9); padding: 10px 20px; border-radius: 999px; background: var(--mkp-surface); color: var(--mkp-good); font-weight: 700; font-size: 1.1rem; box-shadow: 0 2px 14px rgba(0,0,0,.3); opacity: 0; pointer-events: none; transition: opacity .3s, transform .3s; white-space: nowrap; }
.meikyuu-play .mk-banner[data-show="true"] { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.meikyuu-play .mk-banner[data-show="false"] { visibility: hidden; }
.meikyuu-play .mk-tabs, .meikyuu-play .mk-pad, .meikyuu-play .mk-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 10px; }
.meikyuu-play .mk-tabs { margin: 0 0 10px; }
.meikyuu-play [hidden] { display: none !important; }
.meikyuu-play button { font: inherit; color: inherit; user-select: none; -webkit-user-select: none; touch-action: manipulation; }
.meikyuu-play .mk-button, .meikyuu-play .mk-tab { border: 1px solid var(--mkp-rule); background: var(--mkp-surface); color: var(--mkp-ink); border-radius: 999px; min-height: 44px; min-width: 44px; padding: 0 14px; font-size: .85rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; }
.meikyuu-play .mk-button:hover:not(:disabled), .meikyuu-play .mk-tab:hover { border-color: var(--mkp-ink); }
.meikyuu-play .mk-button:disabled { opacity: .32; cursor: default; }
.meikyuu-play .mk-button[aria-pressed="true"] { background: var(--mkp-ink); color: var(--mkp-surface); border-color: var(--mkp-ink); }
.meikyuu-play .mk-tab[aria-selected="true"] { background: var(--mkp-ink); color: var(--mkp-surface); border-color: var(--mkp-ink); }
.meikyuu-play .mk-says { margin: 10px 0 0; font-size: .85rem; line-height: 1.4; color: var(--mkp-muted); min-height: 2.8em; }
.meikyuu-play .mk-progress { margin: 6px 0 0; font-weight: 600; font-size: .9rem; min-height: 1.4em; font-variant-numeric: tabular-nums; }
.meikyuu-play[data-solved="true"] .mk-progress { color: var(--mkp-good); }
.meikyuu-play .mk-hearts { letter-spacing: .1em; color: var(--mkp-accent); }
.meikyuu-play .mk-messages { margin: 4px 0 0; min-height: 2.8em; font-size: .85rem; line-height: 1.4; color: var(--mkp-muted); }
.meikyuu-play .mk-messages[data-warn="true"] { color: var(--mkp-accent); font-weight: 600; }
@media (prefers-reduced-motion: reduce) { .meikyuu-play .mk-banner { transition: none; } }
`;
