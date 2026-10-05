# Mazes over a solid

How `@johnmorrisdotca/meikyuu/3d` is made, and what it was weighed against. The usage is in the README ("Mazes over a solid").

## The graph

A maze needs a **cell graph**: which cell is beside which. `carveMaze` reads `cells` and `neighbours` and nothing else, so a closed surface works as it is, with no cell on the edge of anything. `solidGridOf(kind, n)` builds it:

| Solid | Cells | A cell | Ways out |
| --- | --- | --- | --- |
| `cube` | 6 n^2 | square | 4 |
| `sphere` | 10 n^2 + 2 | hexagon (12 pentagons) | 6 (5) |
| `tetrahedron` | 4 n^2 | triangle | 3 |
| `octahedron` | 8 n^2 | triangle | 3 |
| `icosahedron` | 20 n^2 | triangle | 3 |

**Why the sphere is a football and not a rounded cube.** A cube with its points pushed out onto a sphere is the same graph as the cube (the cells are the same, and so are the neighbours), so a maze on it is the same maze in a different coat: nothing about it would be new to solve. The geodesic globe is the dual of an icosahedron cut `n` ways, so its cells are 12 pentagons and the rest hexagons, nearly equal in size everywhere, with no poles and no seams, and a graph of its own. Hexagons also read well as a maze (the flat hexagon mazes are among the favourites), and a pentagon, with one way fewer, is a small landmark.

**Exact, not rounded.** A corner of a cell is found by whole-number weights on the corners of the face it lies on (a lattice point of a triangle is `(i, j, n - i - j)` on its three corners; a point on the edge between two faces has a weight of nought on the third and so is the same key from either face), never by comparing coordinates. Two cells are beside each other when they share an edge, an edge being a pair of corner numbers. Every edge must have exactly two cells (the build throws if not), and `solidGrid.test.ts` checks Euler's V - E + F = 2 for every solid at several cuts. The only arithmetic is `+ - * /` and square roots, which are exact in every engine (`Math.hypot` is not and is not used), so the same solid is the same numbers in a browser and in Node.

**The order of the sides is part of the format.** A kept line is one character a step: the place of the next cell among the neighbours of the last (`lineToSteps`). So the sides of a cell are in a fixed order, counter-clockwise seen from outside, starting from the corner the build gives it, and that order must never change. It cannot depend on how the solid is turned, which is why the answer is the same text at any turn.

## The start and the goal

The start is a cell chosen from the seed. The goal is chosen among the third of the cells farthest from the start *over the surface* (a breadth-first count of cells, a whole number and so the same in every engine), and of those among the ones at least 70 per cent as deep along the passages as the deepest. So the goal is on the far side of the solid in all but a few mazes (the tests count: 20 of 30), and the way to it winds. Ties go to the lower cell.

## Difficulty

`solidDifficultyOf` is `difficultyOf` with the geometry in three dimensions: the straight guess goes to the passage whose cell is nearest the goal by squared distance through space, and a bend is a change of heading of more than 25 degrees between three cells' centres. Everything else (reach, forks, traps, waste, depth) is counted off the passages and is the flat mazes' own. A solid of 600 cells scores about 50 to 65 and one of 90 cells about 30 to 42, on the very scale the flat lists use, so the scores are comparable.

The levels (`scripts/meikyuu-solid.ts`) draw a pool of 6,000 mazes of each size, throw out the ones that are too easy (`isTooEasy`), and take sixty-four along a ramp of the score from the 3rd percentile to the 97th, avoiding the same algorithm twice in a few places.

## Looking at it, and touching it

The solid is turned by a quaternion and projected with a gentle perspective: the eye is six times the solid's reach from its middle (`SOLID_EYE`). The size is chosen from how far the solid's own corners reach on the picture at this turn, so a cube seen face on fills the box, one seen along its diagonal is smaller, and a globe is the same size however it is turned. A cell is **on the near side when its outline runs the right way round** (the shoelace sum of its projected corners is positive), which is the cell facing the eye in perspective as in a flat view, and needs no normal. A globe's cell is a flat polygon through points that are not in one plane, so at the limb it folds over itself: cells less than 0.2 squarely facing are left out of the near side.

**A touch is on the cell whose drawn outline holds it.** There is no second calculation to disagree with the drawing: the cell is found by testing the point against the outlines that were drawn. It is checked in `solidView.test.ts` against an independent method, a ray from the eye through the point tested against the cell's polygon in three dimensions (Moeller-Trumbore on its fan of triangles), at 300 random points of four random turns of every solid: they name the same cell everywhere except within a micro-pixel of the line between two cells.

**Drawing across the edges.** A finger moves from one pixel to the next faster than cells go by, so `cellsAlongDrag` samples the straight move at a quarter of a cell's width and offers the game each cell it enters, the game ignoring any that is not next to the end of the line, as in a flat maze.

**The solid turns by itself** when the end of the line is in trouble: it faces away (less than 0.62 squarely) or a passage leads from it to a cell that is out of sight or nearly edge-on (less than 0.5). A cube's line at the edge of a face, with the next face round the corner, is the case that matters, and it is the one a test of the head's facing alone missed: the head faces you squarely and the cell it leads to is hidden. It turns the solid so that the head and the cells it leads to, taken together, face the viewer, which puts the edge between them at the front and both seen at a slant, at up to 1.6 radians a second, slower the less the need, and stops when neither trouble is left (`edgeTurn`, held by a test that walks it to rest).

**Face me** uses the same idea: the cell and the cells beside it, by their distinct facings, are brought round together. A cell in the middle of a face is faced squarely; one at the edge of a cube's face is turned to show both faces; a corner shows its three.

## Painting, and the frame rate

The picture is a canvas. SVG was weighed (the walls of a flat maze are tiled SVG), and a solid is redrawn whole at every turn: every vertex moves, so there is nothing to keep. A canvas is redrawn in about a dozen calls: the near side's cells in ten batches, one path for each degree of shade (cells in one path leave no seam between them, and where one shade meets the next the edge between is stroked a hair wide in the lighter colour); the standing walls in one stroke and the rim of the near side in another; the line, the hint, the stones and the two marks. A mark lies on the surface (a circle in the cell's own plane, put on the picture) so that it foreshortens with the cell.

Measured on a phone-sized Chromium (390 by 844, 3x, so a canvas of 2x), turning by a drag for 150 frames, all five solids at 576 to 726 cells:

| CPU slowdown | frames over 20 ms | median frame |
| --- | --- | --- |
| none | 0 of 149, all five | 16.7 ms |
| 4x, before the canvas drops to 0.72 of its size while moving | 11 of 149 on the globe, 0 on the rest | 16.7 ms |
| 4x, as released | 0 of 149, all five | 16.7 ms |

Painting itself, in a canvas with the raster forced to finish at once (software rasterising, which a phone's GPU is not): 1.8 to 3.8 ms a frame with no slowdown, and 8 to 17 ms at 4x, the globe the dearest (642 cells, the most short walls). The first version stroked each cell in its own colour to hide the seams between them and took twice as long; the strokes are only where one shade meets the next now.

## What was not done

- **Layer turns, as a Rubik's cube turns.** John asked for a maze over a surface the player turns to see round, and then said he was not asking for the twisting kind. A maze whose layers turn is a separate ticket.
- **A fourth size.** More than about 720 cells is not offered: the solid is seen from outside, one side at a time, and a cell on a phone's screen needs to be a finger wide.
- **Keys and doors.** A maze over a solid has none: a surface has no outer wall, and the start and the goal are the whole of the puzzle.
