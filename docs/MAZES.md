# Mazes: how they are made, laid out and measured

This is the research behind Meikyuu's mazes, and where each part of it lives in the code. Links were opened
and read on 2026-10-01. **Only prose was read, never anyone's code**: every algorithm here is written from
its description, in this repository, under its own licence (MIT). Nothing is copied from Jamis Buck's book or
blog code, from Think Labyrinth's programs, or from any other implementation.

## 1. A perfect maze is a spanning tree

A *perfect* maze has exactly one path between any two of its cells: no loops, and no cell shut off. Seen
as a graph (the cells are its vertices, and a passage is an edge between two cells that touch) that is a
*spanning tree*: every cell joined, and one fewer passage than there are cells. Every algorithm below makes one.
That is the whole contract (`isPerfect` in `src/maze.ts`, checked for every shape and every algorithm in
`src/maze.test.ts`), and it is why one generator can run over any grid: it needs only the list of which cells
touch which (`Grid.neighbours`), never a position.

Walter Pullen's *Think Labyrinth* is the long-standing catalogue of how mazes differ: its
[algorithms page](https://www.astrolog.org/labyrnth/algrithm.htm) and
[glossary](https://www.astrolog.org/labyrnth/glossary.htm) name the traits (below).
Jamis Buck's [maze algorithm recap](https://weblog.jamisbuck.org/2011/2/7/maze-generation-algorithm-recap)
links his post on each algorithm, and his book
[*Mazes for Programmers*](https://pragprog.com/titles/jbmaze/mazes-for-programmers/) (2015) is the classic
reference for the whole subject, including every grid in section 2 below. The
[Wikipedia article](https://en.wikipedia.org/wiki/Maze_generation_algorithm) is a good short summary.

## 2. The algorithms and the texture each gives

| Algorithm (`MeikyuuAlgorithm`) | How it works | Texture |
| --- | --- | --- |
| `backtracker` | [Recursive backtracker](https://weblog.jamisbuck.org/2010/12/27/maze-generation-recursive-backtracking): walk to an unvisited neighbour until stuck, then back up to the last cell that still has one. | The fewest dead ends of the lot, and long winding passages (Buck). A long solution that wanders through most of the maze. |
| `hunt` | [Hunt-and-kill](https://weblog.jamisbuck.org/2011/1/24/maze-generation-hunt-and-kill-algorithm): the same random walk, but when stuck, scan for an unvisited cell beside a visited one and carry on from it. | Like the backtracker: long, winding passages, a little less winding. |
| `growing` | [Growing tree](https://weblog.jamisbuck.org/2011/1/27/maze-generation-growing-tree-algorithm): keep a list of cells; pick one (the newest, or a random one), carve to an unvisited neighbour, add it. Here: the newest half the time. | Newest only is the backtracker, random only is Prim's; the mix lies between. |
| `prim` | [Randomized Prim](https://weblog.jamisbuck.org/2011/1/10/maze-generation-prim-s-algorithm): keep the edges at the edge of the maze made so far; take one at random; if it reaches a new cell, carve it. | Mazes heavy on cul-de-sacs, as Buck puts it: a very high share of dead ends, all short, and a short direct solution. |
| `kruskal` | [Randomized Kruskal](https://weblog.jamisbuck.org/2011/1/3/maze-generation-kruskal-s-algorithm): take the edges in random order and carve each that joins two pieces not yet joined (a union-find). | A lot of short cul-de-sacs, as Buck puts it, spread evenly over the maze. |
| `wilson` | [Wilson's algorithm](https://weblog.jamisbuck.org/2011/1/20/maze-generation-wilson-s-algorithm): loop-erased random walks from each unvisited cell until one hits the maze. | Every possible perfect maze is equally likely, so it has no texture of its own, no bias. |
| `eller` | [Eller's algorithm](https://weblog.jamisbuck.org/2010/12/29/maze-generation-eller-s-algorithm): one row at a time, remembering which cells of the row are already joined. | Between the long and the short: horizontal runs, a middling dead end share. Needs rows, so it makes `square` mazes only. |

### What they measure like

Pullen's table gives each algorithm's share of dead ends and its "river" on a square maze. This repository
measures its own (30×30 squares, three seeds each, `src/measure.test.ts`) and agrees:

| | dead ends | river |
| --- | --- | --- |
| `backtracker` | about 10% | 0.80 |
| `hunt` | about 10% | 0.80 |
| `growing` (half newest) | about 30% | 0.44 |
| `prim` | about 32% | 0.41 |
| `kruskal` | about 30% | 0.43 |
| `wilson` | about 29% | 0.45 |
| `eller` | about 28% | 0.46 |

(Pullen's: backtracker 10%, Prim's 36%, Kruskal's 30%, Eller's 28%, Wilson's 29%, hunt-and-kill 11%, growing tree 49% "variable".
Here `river` is the share of cells with exactly two passages; Pullen's is a name for the texture, below.)

## 3. Other grids

A grid is only a list of cells and which touch (`src/grid.ts`); a shape is a way of making one (`src/shapes.ts`).

- **Squares**, the usual grid.
- **Hexagons** (what Pullen calls a *sigma* maze): pointy side up, every other row shifted half a cell. Each cell has six neighbours. The rows' offset is the only
  subtle part: the neighbours of an odd row differ from those of an even row (`hexGrid`).
- **Triangles** (*delta*): rows of triangles pointing up and down in turn. A cell has three neighbours: left, right, and the one above (for a triangle pointing down) or below (pointing up).
- **Circles** (*theta*): concentric rings round a middle cell, passages running round a ring and out between rings. A ring has more cells the further out it is, so a cell does not get too wide: a ring doubles its number of cells when the cells would otherwise be wider than tall (`ringCounts`, which uses the fraction 710/113 for 2π so that no two engines can disagree about a rounding). A cell then touches the cell on each side of it in its ring, one cell of the ring inside (its parent) and one or two of the ring outside. Walls between rings are arcs. Buck's book calls these *polar* grids.
- **Shapes cut out of a grid**, which Buck's book calls *masking*: take a square (or hexagon, or triangle) grid, drop the cells outside an outline, and keep the biggest piece that is still joined, so the maze is one piece. The cells that lost a neighbour to the cut get a wall there, so the outline is a wall. Meikyuu's outlines (`src/masks.ts`) are made here, from curves and polygons: a heart (the curve (x² + y² − 1)³ = x²y³), a leaf (a lens along a diagonal with a stem), a star (a five-pointed polygon), a ring, a diamond, a cross, a moon (a disc less a disc pushed to one side), a hexagon of hexagons (cells within a hex distance of the middle) and a pyramid of triangles.

Because the generators read only which cells touch, every one of them runs on every one of these grids, and each shape's mazes are checked to be perfect (`src/maze.test.ts`).

## 4. Where the line starts and ends: the ways to play

A way to play (`MeikyuuMode`) is a declared field of a level; it decides where the start and the goal go
after the passages are carved (`buildMaze`):

- `enter-leave`: the start and the goal are both cells on the edge of the shape, with a door cut in the outer wall at each. To make them far apart: take a random edge cell, the edge cell farthest from it along the passages is the start, and the edge cell farthest from that one is the goal.
- `to-goal`: the start is a cell inside (not on the edge) and the goal is a random cell among those at least four fifths as far from it as the farthest. A dot to find, no doors.
- `centre-out`: the start is the cell nearest the middle of the shape, and the goal an edge cell chosen the same way, with a door.
- `keys`: like `centre-out`, but starting inside, and with some keys (up to five) that must all be picked up on the way to the door. A key is put at the dead end of a branch, far from the way from the start to the door and from the other keys, so each costs a detour. A picked-up key stays picked up when the line is drawn back.

## 5. How hard a maze is

There is no single accepted measure. Pullen's glossary names the traits of a maze's texture (paraphrased here):

- **bias**: straight passages that tend to run along one axis, which makes a maze harder to cross against the grain;
- **run**: how long straightaways go before a turn is forced;
- **river**: the relative density of dead ends and junctions: a maze with a low river has many short dead ends, one with a high river has fewer, longer ones;
- **elitism**: the length of the solution against the size of the maze; an elitist maze generally has a short, direct solution.

Meikyuu measures what a person has to do, counted off the passages (`measureMaze`, `src/measure.ts`), and all of it
whole numbers, so that the same maze measures the same in every engine:

| | |
| --- | --- |
| `solution` | the cells on the one way from the start to the goal. The longer, the more there is to draw, and the more it winds the more it takes to follow. |
| `decisions` | the places on that way where the line could have gone another way: for each cell of the way but the last, the passages it has beyond the one to arrive by and the one to leave by. |
| `branches`, `longestBranch`, `wasted` | the wrong branches that leave the way, the length of the longest to its end, and all their lengths added up. How much a wrong turn costs is how far it goes before it ends. |
| `deadEnds`, `deadEndShare`, `junctions`, `river` | the texture. `river` is the share of cells with exactly two passages. A maze of long winding corridors scores a high river; one of many short dead ends, a low one. |
| `detour` | for the `keys` mode: twice the cells of the tree that joins the start, the goal and every key, beyond the way itself. |
| `effort` | `solution + wasted + 2 × decisions + detour`, an estimate in cells drawn. A person who meets a fork takes the wrong side half the time, walks to the end of it and comes back, which costs twice its depth, so half of that is its depth; each fork also costs a look and a choice. |

`effort` orders the level list. A rating from 1 to 100 (`ratingOf`) puts it on a scale where doubling the effort adds the same each time: an effort of 9 is 1, and 5,400 is 100.

## 6. How the level list is made

A level is a recipe, never a drawing: a shape, its size, an algorithm, a way to play, and a seed. That
rebuilds the same maze everywhere, because every choice a generator makes comes from a seeded stream
(mulberry32, integer arithmetic only, its first numbers pinned by `random.test.ts`) and none from the
geometry.

`scripts/meikyuu-levels.ts` makes the list (`pnpm levels`). For each of the 1,000 places it decides the effort the list should
have there (from 9 climbing to about 5,200, quickly at first), picks a shape, a way to play and an algorithm from what
that effort has unlocked (squares first, then circles, hexagons, triangles, the cut-out shapes one after another; in and out
first, then the goal, then the centre, then keys), and searches sizes and seeds for the maze that measures nearest it.
Large efforts can only be made by the winding algorithms without a maze of more than 9,000 cells (a phone has to draw it),
so the biggest levels are backtracker and hunt-and-kill mazes. A maze that is already in the list is never put in twice. The
levels are then sorted by the effort they measured, so each is at least as hard as the one before, and written with that
effort and their cells to `src/levels/mazes.data.ts`. The tests rebuild every one of them, check it is a perfect
maze, measure it again, and draw its way through it with the game's own rules.

## 7. Arrow puzzles

The arrow puzzles (`src/arrows.ts`) are not mazes, but are made the same way, backwards: arrows are added one at a time to
an empty board, each only if the way out from its head, in the direction it points, is clear of the arrows already there (and of itself).
Taking them away in the opposite order always works, and an arrow taken away never blocks another, so every puzzle can be
cleared, and one cannot be lost by a wrong order, only by wrong taps (each costs a heart). Cells are tried from the middle of the picture outward, so the arrows added later are
nearer the edge, which fills the picture. Difficulty (`measureArrows`) is the arrows to clear, the rounds of unblocking they take, and how many are blocked at the start.
Meikyuu's arrow puzzles are its own design, written without reference to any other implementation.
