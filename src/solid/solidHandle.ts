import { headOf, hintMaze, restartMaze, undoMaze } from "../game.ts";
import { createMeikyuuSounds } from "../sound.ts";
import { clearStones, decodeRun, encodeRun, stoneRulesOf, stonesLeft, toggleStone, withStoneRules } from "../stones.ts";
import { applyLook, readColours } from "./solidColours.ts";
import { recipeOf, type SolidMount, TURN_STEP } from "./solidMount.ts";
import type { SolidSession } from "./solidSession.ts";
import { faceCellTurn, pickCell, SOLID_ZOOM_LEAST, SOLID_ZOOM_MOST, stepTurn } from "./solidView.ts";
import { quatNormalize } from "./vec.ts";

/** The handle a page keeps for a solid: load, turn, undo and the stones. */
export function solidHandle(s: SolidSession): SolidMount {
  const api: SolidMount = {
    host: s.host,
    recipe: () => s.recipe,
    maze: () => s.maze,
    mazeGame: () => s.game,
    load: (next) => {
      const made = recipeOf(next);
      if (made === null) return false;
      s.begin(made);
      return true;
    },
    set: (changes) => {
      const {
        tap,
        sound,
        hints,
        banner: showBanner,
        language: nextLanguage,
        stones: nextStones,
        edgeTurn: nextEdge,
        ...nextLook
      } = changes;
      if ("stones" in changes) {
        s.stoneOption = nextStones;
        const before = s.game;
        s.game = withStoneRules(s.game, stoneRulesOf(s.stoneOption, s.maze.grid.cells));
        if (s.game.rules === null) s.stoneModeOn = false;
        s.stonesMoved(before);
      }
      s.look = { ...s.look, ...nextLook };
      if (tap !== undefined) s.tapExtends = tap;
      if (hints !== undefined) s.withHints = hints;
      if (showBanner !== undefined) s.banner.enable(showBanner);
      if (nextEdge !== undefined) s.edgeOn = nextEdge;
      if (sound !== undefined) {
        if (sound && s.sounds === null) s.sounds = createMeikyuuSounds();
        else if (!sound) {
          s.sounds?.destroy();
          s.sounds = null;
        }
      }
      if (nextLanguage !== undefined) {
        s.explicitLanguage = nextLanguage;
        s.language = nextLanguage;
      }
      applyLook(s.canvas, s.look);
      s.colours = readColours(s.canvas);
      s.refresh();
    },
    undo: () => {
      s.hinted = null;
      s.setMessage(null);
      const next = undoMaze(s.game);
      if (next === s.game) return;
      const before = s.game;
      s.game = next;
      s.playSound("back");
      s.refresh();
      s.stonesMoved(before);
    },
    restart: () => {
      s.hinted = null;
      s.setMessage(null);
      const next = restartMaze(s.game);
      if (next === s.game) return;
      const before = s.game;
      s.game = next;
      s.solveTold = false;
      s.moves = 0;
      s.refresh();
      s.stonesMoved(before);
    },
    hint: () => {
      s.hinted = hintMaze(s.game, Math.max(6, Math.round(Math.sqrt(s.maze.grid.cells) / 2)));
      s.setMessage(s.game.path.length === 0 ? "hintStart" : s.hinted.back > 0 ? "hintBack" : "hintAhead", {
        n: s.hinted.back,
      });
      s.refresh();
    },
    turn: (by) => {
      const [right, down] =
        typeof by === "string"
          ? ({ left: [-TURN_STEP, 0], right: [TURN_STEP, 0], up: [0, -TURN_STEP], down: [0, TURN_STEP] } as const)[by]
          : [by.right ?? 0, by.down ?? 0];
      s.glideTo(stepTurn(s.glide?.to ?? s.turned, right, down), s.glide?.zoomTo ?? s.zoom);
    },
    faceMe: (cell) => {
      const target = cell ?? headOf(s.game) ?? s.maze.start;
      s.glideTo(faceCellTurn(s.maze.grid, s.turned, target, true), s.zoom);
    },
    zoomIn: () => {
      s.glideTo(s.glide?.to ?? s.turned, Math.min(SOLID_ZOOM_MOST, (s.glide?.zoomTo ?? s.zoom) * 1.4));
      s.words();
    },
    zoomOut: () => {
      s.glideTo(s.glide?.to ?? s.turned, Math.max(SOLID_ZOOM_LEAST, (s.glide?.zoomTo ?? s.zoom) / 1.4));
      s.words();
    },
    fit: () => {
      s.glideTo(s.glide?.to ?? s.turned, 1);
      s.words();
    },
    turnMode: (on) => {
      if (on !== undefined) {
        s.turnOnly = on;
        s.words();
      }
      return s.turnOnly;
    },
    edgeTurn: (on) => {
      if (on !== undefined) s.edgeOn = on;
      return s.edgeOn;
    },
    view: (to) => {
      if (to !== undefined) {
        s.glide = null;
        if (to.q !== undefined) s.turned = quatNormalize(to.q);
        if (to.zoom !== undefined) s.zoom = Math.min(SOLID_ZOOM_MOST, Math.max(SOLID_ZOOM_LEAST, to.zoom));
        s.invalidate();
        s.words();
      }
      return { q: s.turned, zoom: s.zoom };
    },
    place: s.cellPlace,
    between: (a, b) => {
      const side = s.maze.grid.neighbours[a]?.indexOf(b) ?? -1;
      if (side < 0) return null;
      const edge = s.maze.grid.edges[s.maze.grid.sideEdge[a]![side]!]!;
      const now = s.frameNow();
      return { x: (now.sx[edge.a]! + now.sx[edge.b]!) / 2, y: (now.sy[edge.a]! + now.sy[edge.b]!) / 2 };
    },
    pick: (x, y) => pickCell(s.frameNow(), s.maze.grid, x, y),
    stoneMode: (on) => {
      const possible = s.game.rules !== null;
      if (on !== undefined && (on && possible) !== s.stoneModeOn) {
        s.stoneModeOn = on && possible;
        s.words();
      }
      return s.stoneModeOn && possible;
    },
    stones: () => s.game.stones,
    stonesLeft: () => stonesLeft(s.game),
    stone: (cell) => {
      const result = toggleStone(s.game, cell);
      if (result.how === "refused") return result.why;
      s.layStoneAt(cell, "tap");
      return "ok";
    },
    clearStones: () => {
      const before = s.game;
      const next = clearStones(before);
      if (next === before) return;
      s.game = next;
      s.setMessage(null);
      s.refresh();
      s.stonesMoved(before);
    },
    run: () => encodeRun(s.game),
    restore: (code) => {
      const restored = decodeRun(s.maze, code, s.game.rules);
      if (restored === null) return false;
      const before = s.game;
      s.game = restored;
      s.hinted = null;
      s.setMessage(null);
      s.moves = restored.strokes;
      s.solveTold = restored.solved;
      s.pendingSolve = false;
      s.refresh();
      s.stonesMoved(before);
      return true;
    },
    destroy: () => {
      s.windowOf.cancelAnimationFrame(s.scheduled);
      if (s.gesture?.mode === "turn") s.windowOf.clearTimeout(s.gesture.hold);
      s.box.removeEventListener("pointerdown", s.onDown);
      s.box.removeEventListener("pointermove", s.onMove);
      s.box.removeEventListener("pointerup", s.onUp);
      s.box.removeEventListener("pointercancel", s.onCancel);
      s.box.removeEventListener("wheel", s.onWheel);
      s.host.removeEventListener("keydown", s.onKey);
      s.banner.destroy();
      s.windowOf.removeEventListener("resize", s.measure);
      s.looking?.disconnect();
      s.watching?.disconnect();
      s.theme?.disconnect();
      s.scheme?.removeEventListener?.("change", s.onScheme);
      s.sounds?.destroy();
      s.host.style.removeProperty("--mkp-gutter");
      s.host.style.removeProperty("--mkp-reserve");
      s.host.replaceChildren();
      s.host.classList.remove("meikyuu-play", "meikyuu-solid");
      for (const name of [
        "kind",
        "solid",
        "solved",
        "moves",
        "cells",
        "reached",
        "turnMode",
        "stones",
        "stoneMode",
        "stonesLeft",
      ])
        delete s.host.dataset[name];
      delete (s.host as unknown as { meikyuuSolid?: SolidMount }).meikyuuSolid;
    },
  };
  s.api = api;
  return api;
}
