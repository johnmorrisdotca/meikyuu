import { hintArrow, restartArrows, undoArrow } from "./arrowGame.ts";
import { hintMaze, restartMaze, undoMaze } from "./game.ts";
import { type MeikyuuMount, puzzleOf } from "./mount.ts";
import type { MountSession } from "./mountSession.ts";
import { createMeikyuuSounds } from "./sound.ts";
import { clearStones, decodeRun, encodeRun, stoneRulesOf, stonesLeft, toggleStone, withStoneRules } from "./stones.ts";

/** The handle a page keeps: load, undo, the view and the stones. */
export function mountHandle(s: MountSession): MeikyuuMount {
  const api: MeikyuuMount = {
    host: s.host,
    kind: () => s.puzzle.kind,
    puzzle: () => s.puzzle,
    mazeGame: () => s.mazeGame,
    arrowGame: () => s.arrowGame,
    load: (next) => {
      const made = puzzleOf(next);
      if (made === null) return false;
      if (next.ratio !== undefined) s.ratioOption = next.ratio;
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
        ratio,
        stones: nextStones,
        ...nextLook
      } = changes;
      if ("stones" in changes) {
        s.stoneOption = nextStones;
        if (s.mazeGame !== null && s.maze !== null) {
          const before = s.mazeGame;
          s.mazeGame = withStoneRules(s.mazeGame, stoneRulesOf(s.stoneOption, s.maze.grid.cells));
          if (s.mazeGame.rules === null) s.stoneModeOn = false;
          s.stonesMoved(before);
        }
      }
      s.look = { ...s.look, ...nextLook };
      if (ratio !== undefined && ratio !== s.ratioOption) {
        s.ratioOption = ratio;
        s.turnNow = s.resolveNow();
        s.applyBox();
        s.mazeSurface?.turn(s.turnNow);
      }
      if (tap !== undefined) s.tapExtends = tap;
      if (hints !== undefined) s.withHints = hints;
      if (showBanner !== undefined) s.banner.enable(showBanner);
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
      s.mazeSurface?.look(s.look);
      s.arrowSurface?.look(s.look);
      s.words();
    },
    undo: () => {
      s.hintedMaze = null;
      s.hintedArrow = null;
      s.setMessage(null);
      if (s.viewing === "maze" && s.mazeGame !== null) {
        const next = undoMaze(s.mazeGame);
        if (next === s.mazeGame) return;
        const before = s.mazeGame;
        s.mazeGame = next;
        s.playSound("back");
        s.refresh();
        s.stonesMoved(before);
        return;
      }
      if (s.arrowGame !== null) {
        const next = undoArrow(s.arrowGame);
        if (next === s.arrowGame) return;
        s.arrowGame = next;
        s.playSound("back");
      }
      s.refresh();
    },
    restart: () => {
      s.hintedMaze = null;
      s.hintedArrow = null;
      s.setMessage(null);
      if (s.viewing === "maze" && s.mazeGame !== null) {
        const next = restartMaze(s.mazeGame);
        if (next === s.mazeGame) return;
        const before = s.mazeGame;
        s.mazeGame = next;
        if (s.puzzle.kind === "maze") {
          s.solveTold = false;
          s.moves = 0;
        }
        s.refresh();
        s.stonesMoved(before);
        return;
      }
      if (s.arrowGame !== null) {
        s.arrowGame = restartArrows(s.arrowGame);
        s.solveTold = false;
        s.moves = 0;
        // Arrows taken are back on the board: draw it afresh.
        s.mountSurface();
        return;
      }
      s.refresh();
    },
    hint: () => {
      if (s.viewing === "maze" && s.mazeGame !== null) {
        s.hintedMaze = hintMaze(s.mazeGame, Math.max(6, Math.round(Math.sqrt(s.maze?.grid.cells ?? 100) / 2)));
        s.setMessage(s.mazeGame.path.length === 0 ? "hintStart" : s.hintedMaze.back > 0 ? "hintBack" : "hintAhead", {
          n: s.hintedMaze.back,
        });
      } else if (s.arrowGame !== null) {
        s.hintedArrow = hintArrow(s.arrowGame);
        s.setMessage(s.hintedArrow === null ? "arrowsLocked" : "arrowsHint", {}, s.hintedArrow === null);
      }
      s.refresh();
    },
    fit: (mode) => {
      if (mode !== undefined && s.mazeSurface !== null) {
        s.fitMode = mode;
        s.mazeSurface.surface.setFit(mode);
      } else s.surfaceNow()?.surface.fit();
      s.setGutter(s.gutterLeast);
      s.words();
    },
    zoomIn: () => {
      if (s.gutterNow > s.gutterLeast) s.setGutter(s.stepDown(s.gutterNow));
      else s.surfaceNow()?.surface.zoom(1.5);
    },
    zoomOut: () => {
      const state = s.surfaceNow()?.surface.state();
      if (state?.atLeast === true && s.frameCanWiden()) s.setGutter(s.stepUp(Math.max(s.gutterNow, s.visibleGutter())));
      else s.surfaceNow()?.surface.zoom(1 / 1.5);
    },
    gutter: (px) => (px === undefined ? s.gutterNow : s.setGutter(px)),
    pan: (on) => {
      if (on !== undefined) {
        s.panOn = on;
        s.mazeSurface?.surface.setPanMode(on);
        s.words();
      }
      return s.panOn;
    },
    edgePan: (on) => {
      if (on !== undefined) {
        s.edgePanOn = on;
        s.mazeSurface?.surface.setEdgePan(on);
      }
      return s.edgePanOn;
    },
    orientation: (setting) => {
      if (setting !== undefined && setting !== s.orientationSetting) {
        s.orientationSetting = setting;
        s.reflow();
        s.words();
      }
      return s.orientationNow();
    },
    stoneMode: (on) => {
      const possible = s.viewing === "maze" && s.mazeGame?.rules != null;
      if (on !== undefined && (on && possible) !== s.stoneModeOn) {
        s.stoneModeOn = on && possible;
        s.words();
      } else if (on === false && s.stoneModeOn) {
        s.stoneModeOn = false;
        s.words();
      }
      return s.stoneModeOn && possible;
    },
    stones: () => s.mazeGame?.stones ?? [],
    stonesLeft: () => (s.mazeGame === null ? 0 : stonesLeft(s.mazeGame)),
    stone: (cell) => {
      if (s.viewing !== "maze" || s.mazeGame === null) return "off";
      const result = toggleStone(s.mazeGame, cell);
      if (result.how === "refused") return result.why;
      s.layStoneAt(cell, "tap");
      return "ok";
    },
    clearStones: () => {
      if (s.mazeGame === null) return;
      const before = s.mazeGame;
      const next = clearStones(before);
      if (next === before) return;
      s.mazeGame = next;
      s.setMessage(null);
      s.refresh();
      s.stonesMoved(before);
    },
    run: () => (s.mazeGame === null ? "" : encodeRun(s.mazeGame)),
    restore: (code) => {
      if (s.viewing !== "maze" || s.maze === null || s.mazeGame === null) return false;
      const restored = decodeRun(s.maze, code, s.mazeGame.rules);
      if (restored === null) return false;
      const before = s.mazeGame;
      s.mazeGame = restored;
      s.hintedMaze = null;
      s.setMessage(null);
      s.moves = restored.strokes;
      s.solveTold = restored.solved && s.puzzle.kind === "maze";
      s.pendingSolve = false;
      s.refresh();
      s.stonesMoved(before);
      return true;
    },
    show: (which) => {
      if (s.puzzle.kind !== "mixed" || which === s.viewing) return;
      s.viewing = which;
      s.mountSurface();
    },
    destroy: () => {
      s.mazeSurface?.destroy();
      s.arrowSurface?.destroy();
      s.sounds?.destroy();
      s.watching?.disconnect();
      s.looking?.disconnect();
      s.windowOf.removeEventListener("resize", s.reflow);
      s.windowOf.visualViewport?.removeEventListener("resize", s.reflow);
      s.host.removeEventListener("keydown", s.onKey);
      s.banner.destroy();
      s.host.style.removeProperty("--mkp-gutter");
      s.host.style.removeProperty("--mkp-reserve");
      s.host.replaceChildren();
      s.host.classList.remove("meikyuu-play");
      for (const name of [
        "kind",
        "level",
        "view",
        "solved",
        "moves",
        "cells",
        "keys",
        "reached",
        "hearts",
        "left",
        "unlocked",
        "status",
        "orientation",
        "turned",
        "gutter",
        "pan",
        "stones",
        "stoneMode",
        "stonesLeft",
      ])
        delete s.host.dataset[name];
    },
  };
  s.api = api;
  return api;
}
