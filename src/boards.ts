/**
 * THE BOARDS a maze can be drawn on, and the colours its line can be: `paper` (which follows the page's
 * light or dark), `wood`, and four cloths, the family's own; and five colours for the line. Each board is
 * the paper's colour, the wall's, and the frame's; each line is a colour for light and a colour for dark.
 */
/** A board's colours: the paper, the walls, the frame, whether it is a dark board, and the line that shows on it when none is chosen. */
export type MeikyuuBoardLook = { paper: string; wall: string; frame: string; dark: boolean; trail: string };

export const MEIKYUU_BOARDS = {
  paper: { paper: "#fbf8f1", wall: "#1f2320", frame: "#a98954", dark: false, trail: "#2e8b57" },
  wood: { paper: "#e2ba7a", wall: "#3a2410", frame: "#8a5a2b", dark: false, trail: "#1d6b46" },
  green: { paper: "#2f5d4a", wall: "#f3efe4", frame: "#1f4135", dark: true, trail: "#ffd23f" },
  blue: { paper: "#2865a6", wall: "#f3efe4", frame: "#1a4677", dark: true, trail: "#ffd23f" },
  red: { paper: "#a3342e", wall: "#f3efe4", frame: "#7a231f", dark: true, trail: "#ffe08a" },
  black: { paper: "#2f3236", wall: "#ece8dc", frame: "#1b1d20", dark: true, trail: "#7fe3a6" },
} as const satisfies Record<string, MeikyuuBoardLook>;

export type MeikyuuBoardName = keyof typeof MEIKYUU_BOARDS;
export const MEIKYUU_BOARD_NAMES = Object.keys(MEIKYUU_BOARDS) as MeikyuuBoardName[];

export const MEIKYUU_TRAILS = {
  green: { light: "#2e8b57", dark: "#6fcf97" },
  blue: { light: "#2865a6", dark: "#7fb4ee" },
  red: { light: "#d9381e", dark: "#ff8a6b" },
  violet: { light: "#7b4fb0", dark: "#c3a1f0" },
  orange: { light: "#d97a1e", dark: "#ffb061" },
} as const satisfies Record<string, { light: string; dark: string }>;

export type MeikyuuTrailName = keyof typeof MEIKYUU_TRAILS;
export const MEIKYUU_TRAIL_NAMES = Object.keys(MEIKYUU_TRAILS) as MeikyuuTrailName[];

/** The colours of each arrow on an arrow board, in turn. */
export const MEIKYUU_ARROW_COLOURS: readonly string[] = ["#d9381e", "#2865a6", "#2e8b57", "#d97a1e", "#7b4fb0", "#c2185b", "#00838f", "#8d6e63"];
