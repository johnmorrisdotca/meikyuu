import { describe, expect, it } from "vitest";

import { solidLevelsOf } from "../levels-solid-all.ts";
import { SOLID_KINDS } from "./solidGrid.ts";
import { buildSolidMaze, solidSolutionOf } from "./solidMaze.ts";
import { cellSeen, createFrame, edgeTurn, faceCellTurn, openingTurn, projectFrame } from "./solidView.ts";

/**
 * A FINGER THAT FOLLOWS THE WAY, as a person's does: held on the end of the line, the solid turns by itself (`edgeTurn`) until the next cell is in clear view; and where it cannot tell which of two
 * passages is meant (the rim cells of a star above the head and below it), the player presses Face me (`faceCellTurn`) and the cell comes round. Every sampled level of every solid is followed to its goal
 * this way without once failing to bring the next cell into view: nothing is a dead end that a turn cannot get out of, on a solid that hides parts or on one that does not.
 */
const LEAST_FACING = 0.2;

describe("following the way over a solid, by the solid's own turning and Face me", () => {
  for (const kind of SOLID_KINDS) {
    it(`${kind}: every sampled level of the small, medium and large sizes is followed to its goal`, () => {
      let byHand = 0;
      let steps = 0;
      for (const size of ["small", "medium", "large"] as const) {
        const list = solidLevelsOf(kind, size);
        for (let at = 3; at < list.length; at += 20) {
          const maze = buildSolidMaze(list[at]!.recipe);
          const way = solidSolutionOf(maze);
          let q = openingTurn(maze.grid, maze.start);
          const frame = createFrame(maze.grid);
          const hidden = maze.grid.convex ? undefined : (cell: number) => !cellSeen(frame, maze.grid, cell);
          const clear = (cell: number): boolean => frame.visible[cell] === 1 && frame.facing[cell]! > LEAST_FACING && cellSeen(frame, maze.grid, cell);
          for (let k = 1; k < way.length; k += 1) {
            steps += 1;
            let ok = false;
            for (let tries = 0; tries < 400 && !ok; tries += 1) {
              projectFrame(frame, maze.grid, q, 1, 330, 330);
              if (clear(way[k]!)) ok = true;
              else {
                const next = edgeTurn(maze.grid, maze.links, q, way[k - 1]!, 0.025, hidden);
                if (next === null) break;
                q = next;
              }
            }
            if (!ok) {
              q = faceCellTurn(maze.grid, q, way[k]!, true);
              projectFrame(frame, maze.grid, q, 1, 330, 330);
              byHand += 1;
              expect(clear(way[k]!), `${kind} ${size} level ${at + 1}, step ${k}: the cell never came into view, even with Face me`).toBe(true);
            }
          }
        }
      }
      // Most steps need no hand at all: a few in a hundred on the shapes that hide parts, a handful on the rest.
      expect(byHand / steps, kind).toBeLessThan(0.08);
    }, 120_000);
  }
});
