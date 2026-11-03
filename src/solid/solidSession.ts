import type { Banner } from "../banner.ts";
import type { MazeLook } from "../draw.ts";
import type { MazeGame } from "../game.ts";
import type { MeikyuuSoundKind, MeikyuuSounds } from "../sound.ts";
import type { StoneOption } from "../stones.ts";
import type { MeikyuuLanguage } from "../strings.ts";
import type { SolidMaze, SolidRecipe } from "./solidMaze.ts";
import type { SolidCellPlace, SolidEventDetail, SolidMount, SolidMountOptions } from "./solidMount.ts";
import type { SolidColours } from "./solidPaintParts.ts";
import type { SolidFrame } from "./solidView.ts";
import type { Quat } from "./vec.ts";

/** A pointer gesture in progress on the solid: drawing the line, turning the solid, or a pinch. */
export type SolidGesture =
  | { mode: "draw"; id: number; last: [number, number] }
  | {
      mode: "turn";
      id: number;
      last: [number, number];
      from: [number, number];
      at: number;
      moved: boolean;
      hold: number;
      held: boolean;
    }
  | { mode: "pinch"; mid: [number, number]; gap: number; angle: number };

/** A turn of the solid under way: from one orientation and zoom to another. */
export type SolidGlide = { from: Quat; to: Quat; zoomFrom: number; zoomTo: number; start: number; length: number };

/** The hint drawn on the solid: how far back the line must go, and the cells ahead. */
export type SolidHint = { back: number; cells: readonly number[] };

/** The word of what has just happened, as the line under the board says it. */
export type SolidMessage = { key: string; values: Record<string, string | number>; warn: boolean };

/** The solid board mountSolid closes over. */
export interface SolidSession {
  host: HTMLElement;
  options: SolidMountOptions;
  document: Document;
  windowOf: Window & typeof globalThis;
  look: MazeLook;
  tapExtends: boolean;
  stoneOption: StoneOption | undefined;
  stoneModeOn: boolean;
  withHints: boolean;
  edgeOn: boolean;
  turnOnly: boolean;
  picture: boolean;
  drawable: boolean;
  withControls: boolean;
  withZoom: boolean;
  sounds: MeikyuuSounds | null;
  explicitLanguage: MeikyuuLanguage | undefined;
  language: MeikyuuLanguage;
  gutter: number;
  callbacks: SolidMountOptions;
  still: () => boolean;
  wrap: HTMLDivElement;
  box: HTMLDivElement;
  canvas: HTMLCanvasElement;
  banner: Banner;
  controls: HTMLDivElement;
  pad: HTMLDivElement;
  says: HTMLParagraphElement;
  progress: HTMLParagraphElement;
  messages: HTMLParagraphElement;
  button: (name: string, onPress: () => void, parent: HTMLElement, text?: string) => HTMLButtonElement;
  undoButton: HTMLButtonElement;
  restartButton: HTMLButtonElement;
  hintButton: HTMLButtonElement;
  stoneButton: HTMLButtonElement;
  leftButton: HTMLButtonElement;
  upButton: HTMLButtonElement;
  downButton: HTMLButtonElement;
  rightButton: HTMLButtonElement;
  faceButton: HTMLButtonElement;
  turnOnlyButton: HTMLButtonElement;
  outButton: HTMLButtonElement;
  inButton: HTMLButtonElement;
  fitButton: HTMLButtonElement;
  recipe: SolidRecipe;
  maze: SolidMaze;
  game: MazeGame<SolidMaze>;
  frame: SolidFrame;
  turned: Quat;
  zoom: number;
  frameStale: boolean;
  hinted: SolidHint | null;
  message: SolidMessage | null;
  moves: number;
  solveTold: boolean;
  pendingSolve: boolean;
  width: number;
  height: number;
  colours: SolidColours;
  context: CanvasRenderingContext2D | null;
  say: (key: string, values?: Record<string, string | number>) => string;
  playSound: (kind: MeikyuuSoundKind) => void;
  setMessage: (key: string | null, values?: Record<string, string | number>, warn?: boolean) => void;
  detail: () => SolidEventDetail;
  tell: (name: string, callback?: (detail: SolidEventDetail) => void) => void;
  scheduled: number;
  glide: SolidGlide | null;
  lastTick: number;
  pointerOn: { x: number; y: number } | null;
  drawing: boolean;
  frameNow: () => SolidFrame;
  invalidate: () => void;
  schedule: () => void;
  sharp: boolean;
  sharpTimer: number;
  looking: ResizeObserver | null;
  STONE_WHY: Record<string, string>;
  local: (event: { clientX: number; clientY: number }) => [number, number];
  pointers: Map<number, [number, number]>;
  gesture: SolidGesture | null;
  endGesture: (lifted: boolean) => void;
  onDown: (event: PointerEvent) => void;
  onMove: (event: PointerEvent) => void;
  onUp: (event: PointerEvent) => void;
  onCancel: (event: PointerEvent) => void;
  onWheel: (event: WheelEvent) => void;
  onKey: (event: KeyboardEvent) => void;
  watching: MutationObserver | null;
  theme: MutationObserver | null;
  scheme: MediaQueryList | null;
  onScheme: () => void;
  cellPlace: (cell: number) => SolidCellPlace;
  api: SolidMount;
  words: () => void;
  refresh: () => void;
  stonesMoved: (before: MazeGame<SolidMaze>) => void;
  layStoneAt: (cell: number, how: "tap" | "hold") => boolean;
  begin: (next: SolidRecipe) => void;
  followPointer: (x: number, y: number) => void;
  followDrag: (from: readonly [number, number], to: readonly [number, number]) => void;
  pressTarget: (x: number, y: number) => number | null;
  stepByKey: (dx: number, dy: number) => void;
  neighbourToward: (dx: number, dy: number) => number;
  paint: () => void;
  glideTo: (q: Quat, to: number) => void;
  measure: () => void;
  inMotion: () => void;
}
