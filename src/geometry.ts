import type { Grid, Point, Wall } from "./grid.ts";
import type { Door, Maze } from "./maze.ts";

/** A number as short text: two decimals at most, so a drawing is small. */
export const fixed = (n: number): string => String(Math.round(n * 100) / 100);

/** The path data for a wall: a line, or an arc round the middle of a circle maze. */
export function wallPath(wall: Wall): string {
  const [ax, ay] = wall.a;
  const [bx, by] = wall.b;
  return wall.r === undefined ? `M${fixed(ax)} ${fixed(ay)}L${fixed(bx)} ${fixed(by)}` : `M${fixed(ax)} ${fixed(ay)}A${fixed(wall.r)} ${fixed(wall.r)} 0 0 1 ${fixed(bx)} ${fixed(by)}`;
}

/** Every wall of the maze that is standing: between cells that are not joined, and round the outside, except the doors. Each is listed once. */
export function standingWalls(maze: Maze): Wall[] {
  const { grid, links } = maze;
  const doors = [maze.entrance, maze.exit].filter((door): door is Door => door !== null);
  const out: Wall[] = [];
  for (let cell = 0; cell < grid.cells; cell += 1) {
    grid.sides[cell]!.forEach((side, index) => {
      if (side.to < 0) {
        if (!doors.some((door) => door.cell === cell && door.side === index)) out.push(side.wall);
      } else if (side.to > cell && !links[cell]!.includes(side.to)) out.push(side.wall);
    });
  }
  return out;
}

/** A line through the middles of the cells, in order. */
export function linePath(grid: Grid, cells: readonly number[]): string {
  return cells.map((cell, index) => `${index === 0 ? "M" : "L"}${fixed(grid.centres[cell]![0])} ${fixed(grid.centres[cell]![1])}`).join("");
}

/** Where a door is: the middle of its gap in the wall, and the way out through it as a unit vector. */
export function doorPlace(grid: Grid, door: Door): { x: number; y: number; dx: number; dy: number } {
  const { wall } = grid.sides[door.cell]![door.side]!;
  const [cx, cy] = grid.centres[door.cell]!;
  let mx = (wall.a[0] + wall.b[0]) / 2;
  let my = (wall.a[1] + wall.b[1]) / 2;
  if (wall.r !== undefined) {
    // The middle of an arc is on the circle, along the line from the middle of the maze through the chord's middle.
    const length = Math.hypot(mx, my);
    if (length > 1e-9) [mx, my] = [(mx / length) * wall.r, (my / length) * wall.r];
  }
  const length = Math.hypot(mx - cx, my - cy) || 1;
  return { x: mx, y: my, dx: (mx - cx) / length, dy: (my - cy) / length };
}

/** The rectangle to look at to see the whole of a shape with a margin of `pad` cells. */
export function framed(grid: Grid, pad: number): { x: number; y: number; w: number; h: number } {
  const { box } = grid;
  return { x: box.x - pad, y: box.y - pad, w: box.w + 2 * pad, h: box.h + 2 * pad };
}

export type { Point };
