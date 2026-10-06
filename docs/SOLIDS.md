# Mazes over a solid

How `@johnmorrisdotca/meikyuu/3d` is made, and what it was weighed against. The usage is in [SOLID-MAZES.md](SOLID-MAZES.md) and summarised in the README ("Mazes over a solid").

## The graph

A maze needs a **cell graph**: which cell is beside which. `carveMaze` reads `cells` and `neighbours` and nothing else, so a closed surface works as it is, with no cell on the edge of anything. `solidGridOf(kind, n)` builds it:

| Solid | Cells | A cell | Ways out |
| --- | --- | --- | --- |
| `cube` | 6 n^2 | square | 4 |
| `sphere` | 10 n^2 + 2 | hexagon (12 pentagons) | 6 (5) |
| `tetrahedron` | 4 n^2 | triangle | 3 |
| `octahedron` | 8 n^2 | triangle | 3 |
| `icosahedron` | 20 n^2 | triangle | 3 |
| `prism` (d3) | 8 n^2 | square (two rectangles of 1 by 2 cells a face, two triangles) and triangle | 4 and 3 |
| `trapezohedron` (d10) | 10 n^2 | square (kite) | 4 |
| `dodecahedron` (d12) | 60 n^2 | square: each pentagon is five squares from its middle to the middles of its sides | 4 |
| `rhombic-dodecahedron` (d12) | 12 n^2 | square (rhombus) | 4 |
| `bipyramid` (d16) | 16 n^2 | triangle | 3 |
| `icositetrahedron` (d24) | 24 n^2 | square (kite) | 4 |
| `triacontahedron` (d30) | 30 n^2 | square (rhombus) | 4 |
| `box` | 22 n^2 | square: a brick of 3 by 2 by 1 | 4 |
| `cross` | 30 n^2 | square: a cube with a cube on each face | 4 |
| `ring` | 32 n^2 | square: eight cubes round a hole | 4 |
| `torus` | 3 n^2 | square: 3 n cells round the ring and n round the tube | 4 |
| `star` | 10 n^2 + 10 n h | square: a five-pointed star, tips up, h = round(0.6 n) cells thick | 4 |
| `heart` | 20 n^2 | triangle: a globe of triangles pushed out to a puffed heart | 3 |

**Why the sphere is a football and not a rounded cube.** A cube with its points pushed out onto a sphere is the same graph as the cube (the cells are the same, and so are the neighbours), so a maze on it is the same maze in a different coat: nothing about it would be new to solve. The geodesic globe is the dual of an icosahedron cut `n` ways, so its cells are 12 pentagons and the rest hexagons, nearly equal in size everywhere, with no poles and no seams, and a graph of its own. Hexagons also read well as a maze (the flat hexagon mazes are among the favourites), and a pentagon, with one way fewer, is a small landmark.

**Exact, not rounded.** A corner of a cell is found by whole-number weights on the corners of the face it lies on (a lattice point of a triangle is `(i, j, n - i - j)` on its three corners; a point on the edge between two faces has a weight of nought on the third and so is the same key from either face), never by comparing coordinates. Two cells are beside each other when they share an edge, an edge being a pair of corner numbers. Every edge must have exactly two cells (the build throws if not), and `solidGrid.test.ts` checks Euler's V - E + F = 2 for every solid at several cuts. The only arithmetic is `+ - * /` and square roots, which are exact in every engine (`Math.hypot` is not and is not used), so the same solid is the same numbers in a browser and in Node.

**The order of the sides is part of the format.** A kept line is one character a step: the place of the next cell among the neighbours of the last (`lineToSteps`). So the sides of a cell are in a fixed order, counter-clockwise seen from outside, starting from the corner the build gives it, and that order must never change. It cannot depend on how the solid is turned, which is why the answer is the same text at any turn.

## The thirteen that came after

The cube, the globe and the three solids of triangles were the first five. Thirteen more are made the same way (every polygon face is cut into smaller polygons, cells of one face are joined to the cells of the next across every edge, no cell is on the edge of anything) in `solidShapes.ts`, by a small mesh that finds a corner by a key (which edge of the solid it is on, and how far along) and so never compares two coordinates:

- **The dice**, by their sides (`SOLID_DICE`, `SOLID_DIE_SIDES`): a triangular prism (d3, the long die that rolls on its three sides), the tetrahedron (d4), the cube (d6), the octahedron (d8), the pentagonal trapezohedron (d10: ten kites, the die with the numbers 00 to 90), the dodecahedron (d12), the rhombic dodecahedron (the other d12), the octagonal bipyramid (d16), the icosahedron (d20), the deltoidal icositetrahedron (d24) and the rhombic triacontahedron (d30). Each is a solid whose faces are all alike, or nearly, so that it rolls on any of them. A d2 is a coin and a d100 a d10, so neither is a solid of its own, and a d14 is a heptagonal trapezohedron, which a later release can add the same way.
- **The shapes** (`SOLID_SHAPES`): the globe, a box (3 by 2 by 1), a cross of seven cubes (a plus sign in three dimensions), a ring (eight cubes round a hole, a square torus), a torus (a round doughnut), a five-pointed star and a heart. The torus is `3 n` cells round the ring and `n` round the tube, `n` cells of 0.38 of a ring, narrower inside the hole than out; the star is the outline of five tips and five notches pushed out to a thickness of `0.6 n` cells; the heart is the surface that `(x^2 + 9/4 y^2 + z^2 - 1)^3 = x^2 z^3 + 9/80 y^2 z^3` draws, found along each direction of a globe of triangles by a bisection (products, sums and comparisons only, so the same in every engine).
- **A cross, a ring, a torus, a star and a heart are not convex**: a part of the solid can hide another (the far side of the ring through its hole, the arm of the cross in front of the body). A grid says `convex` and `upright`, and the rest of the package reads them: the view (below), the painter and the pick.

**The cuts.** A size is the cut that comes nearest its cells, under a hundred, about three hundred, six or seven hundred, about thirteen hundred and about four thousand (`SOLID_CUTS`; a die that comes in coarse steps, such as the dodecahedron's `60 n^2`, is a little off each). The dodecahedron's smallest cut is 1, which is 60 cells: `isSolidCut` allows it where a solid already has sixty uncut.

## Hidden parts

On a convex solid the cells that face the viewer are the cells that are seen, and nothing can be in front of anything. Where a part can hide a part (`grid.convex` is false):

- **The picture is painted back to front** (`solidPaintOrdered.ts`): the cells on the near side are sorted by the depth of their middles and painted in slabs about two cells thick, so that a nearer part covers what is behind it, with its walls and the line that runs through it. Inside a slab a shade at a time, which is a few dozen fills for a slab and not one for every cell. The still picture (`drawSolid`) does the same in SVG, a slab's cells and then the walls no nearer slab has covered.
- **A point is on the nearest cell under it** (`pickCell` compares the depth of the cells at that point), and a cell is *seen* only if the point at its middle picks it (`cellSeen`). A line is not drawn over a cell that is hidden.
- **The solid turns to the cell.** A line running into a cell no turn of the same view shows (a cell in the hole of the ring) turns the solid to the direction the cell is seen from (`revealDirection`, found once for a cell by shooting rays from it: the way nearest its own facing that nothing is in front of, up to about 66 degrees off).
- **A shape with a way up** (the heart, the star) is first seen from the front, tipped a little to show its top; a start on its back or its rim turns it by a little more each time, round to the back.

## The start and the goal

The start is a cell chosen from the seed. The goal is chosen among the third of the cells farthest from the start *over the surface* (a breadth-first count of cells, a whole number and so the same in every engine), and of those among the ones at least 70 per cent as deep along the passages as the deepest. So the goal is on the far side of the solid in all but a few mazes (the tests count: 20 of 30), and the way to it winds. Ties go to the lower cell.

## Difficulty

`solidDifficultyOf` is `difficultyOf` with the geometry in three dimensions: the straight guess goes to the passage whose cell is nearest the goal by squared distance through space, and a bend is a change of heading of more than 25 degrees between three cells' centres. Everything else (reach, forks, traps, waste, depth) is counted off the passages and is the flat mazes' own. A solid of 600 cells scores about 50 to 65 and one of 90 cells about 30 to 42, on the very scale the flat lists use, so the scores are comparable.

The levels (`scripts/meikyuu-solid.ts`) draw a pool of 1,500 mazes of each of the algorithms for each size and beside it 1,500 of the three long winding ones (the backtracker, Wilson's and Kruskal's: the hardest mazes of a size are of those), throw out the ones that are too easy (`isTooEasy`), and take sixty-four along a ramp of the score from the 3rd percentile of the pool to the very hardest in it, avoiding the same algorithm twice in a few places. Five sizes of each of eighteen solids, 5,760 levels.

**The top of the scale is reached by the biggest size.** The score is the one the flat lists are scored on, which a maze of twelve hundred cells cannot reach the top of: the hardest of the huge solids (about 1,300 cells) scores 74 to 77, and 90 and over takes about four thousand. So the colossal size is about 4,400 cells (3,600 to 3,900 for the star, the heart, the cross and the ring, whose pictures take more to paint), and its last level scores 89 (the star) to 93: cube 91, globe 92, d12 92, d24 93, torus 91, heart 90, ring 90, cross 90. The coverage of the answer counts (`docs/LEVELS.md`): the zone grid of a solid is 2 by 2 by 2 under 200 cells and 3 by 3 by 3 above, over three quarters.

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

### The big sizes

Cells a size can be painted for, measured on a phone-sized Chromium (390 by 844, a canvas of 2x) with the CPU slowed four times and the raster forced to finish (software rasterising, which a phone's GPU is not). Each cell is `cells, then milliseconds a frame with the whole solid in the picture / zoomed in four times`. The picture paints only the cells in the picture (`frame.shown`), so a zoomed board costs what it shows and not what the solid has:

| Solid | small | medium | large | huge | colossal |
| --- | --- | --- | --- | --- | --- |
| cube | 96c 3/1 | 294c 5/1 | 600c 8/2 | 1350c 14/3 | 4374c 50/6 |
| globe | 92c 4/1 | 252c 8/1 | 642c 15/2 | 1212c 23/3 | 4412c 60/9 |
| icosahedron | 80c 2/1 | 320c 5/1 | 720c 8/2 | 1280c 12/3 | 4500c 34/6 |
| dodecahedron | 60c 2/1 | 240c 5/1 | 540c 8/2 | 1500c 18/3 | 4860c 55/7 |
| box | 88c 2/1 | 352c 5/2 | 550c 8/2 | 1408c 16/5 | 4312c 60/10 |
| torus | 75c 5/3 | 300c 13/2 | 675c 22/1 | 1323c 34/9 | 4332c 83/4 |
| heart | 80c 4/2 | 320c 10/4 | 720c 17/7 | 1280c 26/10 | 3920c 60/21 |
| cross | 120c 6/3 | 270c 10/4 | 750c 19/6 | 1470c 32/9 | 3630c 60/17 |
| ring | 128c 6/3 | 288c 8/7 | 800c 18/13 | 1152c 24/10 | 3872c 61/21 |
| star | 60c 4/3 | 240c 8/4 | 600c 16/9 | 1260c 28/11 | 3600c 56/30 |

A cell is a finger wide (about 24 pixels) at a zoom of four on a colossal solid, which is the zoom the board is played at, and there it paints in 3 to 30 ms at four times slower than a laptop and in software; the whole solid, which a player sees only to find a way, takes 34 to 83. That is what decided Colossal: it plays smoothly zoomed in on a 390-pixel phone, and the whole solid in the picture, which is for finding a way and not for drawing, is the slow frame.

## What was not done

- **Layer turns, as a Rubik's cube turns.** John asked for a maze over a surface the player turns to see round, and then said he was not asking for the twisting kind. A maze whose layers turn is a separate ticket.
- **A sixth size.** About four and a half thousand cells is the most that is offered: a cell is a finger wide only at a zoom of four, and the whole solid is not seen at once.
- **A d14, a d2, a d100.** A d14 is a heptagonal trapezohedron, made the way the d10 is; a d2 is a coin, a flat cylinder, and a d100 is a d10. None is a solid here that a person would meet as one more die on the table; they can be added as the others were.
- **Keys and doors.** A maze over a solid has none: a surface has no outer wall, and the start and the goal are the whole of the puzzle.
