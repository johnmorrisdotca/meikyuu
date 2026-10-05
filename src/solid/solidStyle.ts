/**
 * THE STYLE a playable solid wears beside the board's own (`MEIKYUU_PLAY_STYLE`): the canvas fills the box, the box is grabbed rather than drawn
 * on, and the turn pad sits in a row. It makes no custom properties of its own: the colours are the drawing's (`--mk-paper`, `--mk-wall`, ...).
 */
export const SOLID_PLAY_STYLE = `
.meikyuu-solid .mk-box { cursor: grab; }
.meikyuu-solid .mk-box[data-still="true"] { cursor: default; touch-action: auto; pointer-events: none; }
.meikyuu-solid .mk-box > canvas.mk-solid { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; background: transparent; }
.meikyuu-solid .mk-pad .mk-button[data-action="turn-left"], .meikyuu-solid .mk-pad .mk-button[data-action="turn-right"], .meikyuu-solid .mk-pad .mk-button[data-action="turn-up"], .meikyuu-solid .mk-pad .mk-button[data-action="turn-down"] { padding: 0; font-size: 1rem; }
`;
