import type { ArrowGame } from "./arrowGame.ts";
import type { ArrowSurface } from "./arrowSurface.ts";
import type { ArrowBoard } from "./arrows.ts";
import type { Banner } from "./banner.ts";
import type { MazeLook } from "./draw.ts";
import type { MazeGame } from "./game.ts";
import type { Maze } from "./maze.ts";
import type { MazeSurface } from "./mazeSurface.ts";
import type { MeikyuuEventDetail, MeikyuuMount, MeikyuuMountOptions, MeikyuuPuzzle } from "./mount.ts";
import type { MeikyuuOrientation, Turn } from "./orientation.ts";
import type { MeikyuuSoundKind, MeikyuuSounds } from "./sound.ts";
import type { StoneOption } from "./stones.ts";
import type { MeikyuuLanguage } from "./strings.ts";
import type { FitMode } from "./viewport.ts";

/** What the last message on the line said, and which board it is about. */
export type MountMessage = {
  key: string;
  values: Record<string, string | number>;
  warn: boolean;
  on: "maze" | "arrows";
};

/** The hint drawn on a maze: how far back the line must go, and the cells ahead. */
export type MazeHint = { back: number; cells: readonly number[] };

/** The board mountMeikyuu closes over, shared with the play and the handle. */
export interface MountSession {
  host: HTMLElement;
  options: MeikyuuMountOptions;
  document: Document;
  puzzle: MeikyuuPuzzle;
  look: MazeLook;
  tapExtends: boolean;
  stoneOption: StoneOption | undefined;
  stoneModeOn: boolean;
  withHints: boolean;
  withControls: boolean;
  withZoom: boolean;
  sounds: MeikyuuSounds | null;
  orientationSetting: MeikyuuOrientation;
  ratioOption: "square" | "maze" | number;
  gutterLeast: number;
  gutterMost: number;
  gutterNow: number;
  reserve: number;
  panOn: boolean;
  edgePanOn: boolean;
  fitMode: FitMode;
  turnNow: Turn;
  explicitLanguage: MeikyuuLanguage | undefined;
  language: MeikyuuLanguage;
  callbacks: MeikyuuMountOptions;
  still: () => boolean;
  tabs: HTMLDivElement;
  wrap: HTMLDivElement;
  box: HTMLDivElement;
  banner: Banner;
  controls: HTMLDivElement;
  pad: HTMLDivElement;
  says: HTMLParagraphElement;
  progress: HTMLParagraphElement;
  messages: HTMLParagraphElement;
  button: (name: string, onPress: () => void, parent: HTMLElement, className?: string) => HTMLButtonElement;
  undoButton: HTMLButtonElement;
  restartButton: HTMLButtonElement;
  hintButton: HTMLButtonElement;
  outButton: HTMLButtonElement;
  inButton: HTMLButtonElement;
  fitButton: HTMLButtonElement;
  panButton: HTMLButtonElement;
  stoneButton: HTMLButtonElement;
  turnButton: HTMLButtonElement;
  arrowsTab: HTMLButtonElement;
  mazeTab: HTMLButtonElement;
  maze: Maze | null;
  mazeGame: MazeGame | null;
  board: ArrowBoard | null;
  arrowGame: ArrowGame | null;
  viewing: "maze" | "arrows";
  hintedMaze: MazeHint | null;
  hintedArrow: number | null;
  message: MountMessage | null;
  pendingSolve: boolean;
  solveTold: boolean;
  moves: number;
  mazeSurface: MazeSurface | null;
  arrowSurface: ArrowSurface | null;
  say: (key: string, values?: Record<string, string | number>) => string;
  playSound: (kind: MeikyuuSoundKind) => void;
  detail: () => MeikyuuEventDetail;
  tell: (name: string, callback?: (detail: MeikyuuEventDetail) => void) => void;
  surfaceNow: () => MazeSurface | ArrowSurface | null;
  aspectNow: () => number;
  roomNow: () => { width: number; height: number } | null;
  resolveNow: () => Turn;
  visibleGutter: () => number;
  stepUp: (from: number) => number;
  stepDown: (from: number) => number;
  frameCanWiden: () => boolean;
  setMessage: (
    key: string | null,
    values?: Record<string, string | number>,
    warn?: boolean,
    on?: "maze" | "arrows",
  ) => void;
  STONE_WHY: Record<string, string>;
  onKey: (event: KeyboardEvent) => void;
  watching: MutationObserver | null;
  looking: ResizeObserver | null;
  windowOf: Window & typeof globalThis;
  orientationNow: () => { setting: MeikyuuOrientation; orientation: "portrait" | "landscape"; turned: boolean };
  api: MeikyuuMount;
  words: () => void;
  refresh: () => void;
  mountSurface: () => void;
  stonesMoved: (before: MazeGame | null) => void;
  layStoneAt: (cell: number, how: "tap" | "hold") => boolean;
  begin: (next: MeikyuuPuzzle) => void;
  shownOrientation: () => "portrait" | "landscape" | null;
  isTurnable: () => boolean;
  applyBox: () => void;
  setGutter: (px: number) => number;
  reflow: () => void;
  frameZoom: (factor: number) => boolean;
}
