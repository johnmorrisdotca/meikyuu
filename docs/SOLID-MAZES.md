# Mazes over a solid: how to use them

How to use `@johnmorrisdotca/meikyuu/3d`; how it is made is in [SOLIDS.md](SOLIDS.md). Moved here from [the README](../README.md) to keep it under the length npm shows.

## Mazes over a solid

<p align="center">
  <img src="docs/solid-cube.jpg" alt="A maze over a cube, seen at the corner where three faces meet, with a green line drawn from the start across the edge from one face to the next, and the gold goal on the face to the right" width="230">
  <img src="docs/solid-sphere.jpg" alt="A maze over a globe of hexagons and twelve pentagons, with a green line drawn a good way over it and the globe turned to keep the end of the line in the middle" width="230">
  <img src="docs/solid-icosahedron.jpg" alt="A maze over an icosahedron, twenty triangular faces each cut into small triangles, with a green line drawn across several faces" width="230">
</p>

A maze needs only a **cell graph**, and the surface of a solid is one: a cube is six squares joined across every edge, a globe is a football, and an icosahedron is twenty triangles. The same seven algorithms (all but Eller's, which needs rows) carve a perfect maze over it, so there is exactly one way between any two cells however many edges and faces it crosses. The player looks at the solid from outside, sees one side at a time, draws the line along the passages and **turns the solid** to follow it round. The rules are the very rules of the flat game (`pressMaze`, `dragMaze`, `hintMaze`, stones, `lineToSteps`): they read a maze through `MazeCore`, which a maze over a solid is as a flat one is.

```ts
import { buildSolidMaze, checkSolidAnswer, solidDifficultyOf, solidSolutionOf } from "@johnmorrisdotca/meikyuu/3d";
import { mountSolid } from "@johnmorrisdotca/meikyuu/3d/play";
import { solidLevelOf } from "@johnmorrisdotca/meikyuu/3d/levels";

const level = solidLevelOf("cube", "medium", 12)!;        // level 12 of the 64 medium cubes: "cube:7:prim:…", 294 cells
const maze = buildSolidMaze(level.recipe);                  // the same maze in every browser and every Node
solidDifficultyOf(maze).score;                              // 0 to 100, on the scale the flat mazes are scored on
checkSolidAnswer(maze, solidSolutionOf(maze));              // true: a list of cells, from the start to the goal, in time of its length
const board = mountSolid(host, { recipe: level.code, stones: true, tap: true });   // a board to play, by touch and mouse
board?.turn("left"); board?.faceMe(); board?.place(maze.goal);   // turn it, bring the end of the line round, find a cell on the picture
```

- **Five solids.** `cube` (six squares, 6 n^2 cells), `sphere` (a geodesic globe: 12 pentagons and the rest hexagons, 10 n^2 + 2 cells), `tetrahedron` (4 n^2 triangles), `octahedron` (8 n^2) and `icosahedron` (20 n^2). The globe was weighed against a cube with its corners rounded off, which has the very graph of the cube and so would be the same maze in a different coat; the football's cells are nearly equal in size all over, with no poles and no seams. A triangle has three ways out, so the triangle solids branch least and run longest.
- **A recipe** is `cube:7:prim:48213` (the solid, how many ways it is cut, the algorithm, the seed). The start is chosen from the seed and the goal among the farthest third from it over the surface, and deep along the passages, so the goal is usually on the far side.
- **Levels.** `/3d/levels` has 64 for each of three sizes (small, medium, large) of each solid, 960 in all, from 72 to 720 cells (`SOLID_CUTS`), each list in the order of the difficulty it scores. Made by `node --experimental-strip-types scripts/meikyuu-solid.ts` (about twenty seconds), seeded, into `src/levels/solid.data.ts`.
- **Looking at it.** The solid is turned by a quaternion and seen from a point a few times its reach away (a gentle perspective), at the size that just fits the box; only the cells facing the eye are drawn, shaded by how squarely they face it, and a cell is *on the near side* when its outline runs the right way round. A point of the picture is on a cell when it is inside that outline, so what a finger lands on is what the eye saw, and the tests check it against an independent method (a ray from the eye through the point, tested against the cell's polygon in three dimensions).
- **Turning.** Drag anywhere that is not the end of your line (or the start, before there is a line) to turn the solid like a ball in the hand; two fingers also pinch to zoom (`SOLID_ZOOM_LEAST` to `SOLID_ZOOM_MOST`) and twist; the wheel zooms; the arrow keys and buttons turn a step; **Face me** (`faceMe()`, the F key) brings the end of the line round to face you with a side of its cell level; **Turn only** makes every drag turn.
- **Across an edge.** When the end of a line being drawn faces away (`EDGE_SAFE`) or a passage leads from it to a cell that is hidden or nearly edge-on (`EDGE_NEIGHBOUR`), the solid turns by itself, gently (`EDGE_RATE`), so that the head and the cells it leads to together face you, which puts the edge between them at the front. A line can be drawn from one face to the next, all the way round, without letting go. `edgeTurn: false` turns it off.
- **Performance.** The picture is a canvas painted in about a dozen fills and two strokes whatever the number of cells, and at a lower resolution while it moves: on a phone-sized Chromium (390 px wide, 3x) slowed four times over, all five solids at 576 to 720 cells turn at the screen's 60 frames a second with no frame over 20 ms.
- **The answer** is the list of cells, never the view: `lineToSteps` (a character a step, the place of the next cell among the neighbours of the last) writes it, `encodeRun` / `decodeRun` keep it with its stones, and `checkSolidAnswer` checks it. `drawSolid(maze, options)` is a still picture as SVG text.
- The design, with the numbers: [docs/SOLIDS.md](./docs/SOLIDS.md).
- Keys on the board: arrows turn; W, A, S and D step the line (Shift lays a stone); F or Home is Face me; + and − zoom; Backspace or Ctrl/Cmd+Z undoes. Words in English and Japanese (`solid_cube`, `faceMe`, `turnLeft`, ...).
