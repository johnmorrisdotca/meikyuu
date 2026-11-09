# The shapes and the algorithms

A maze is made on a cell graph, so it can be made on anything. Squares, hexagons, triangles and circles are graphs of their
own; the rest are one of those with a shape cut out.

| `shape` | What it is |
| --- | --- |
| `square` | Square cells, columns by rows. |
| `hex` | Hexagonal cells, pointy side up, every other row shifted: six neighbours. |
| `triangle` | Triangular cells, pointing up and down in turn: three neighbours. |
| `circle` | Rings round a middle cell, a ring having more cells the further out it is; walls between rings are arcs. |
| `heart`, `leaf`, `star`, `ring`, `diamond`, `cross`, `moon` | Square cells inside an outline, the biggest piece of them that is joined. |
| `hexagon` | A hexagon of hexagonal cells. |
| `pyramid` | A big triangle of triangular cells. |

`docs/MAZES.md` has the research: how each is laid out, how the algorithms differ, and how difficulty is measured, with links.

The seven algorithms (`MeikyuuAlgorithm`) each make a perfect maze, one with exactly one way between any two cells, with a texture of its own:

| `algorithm` | Texture |
| --- | --- |
| `backtracker` | Long winding passages and very few dead ends: a long, tiring solution. |
| `hunt` | Hunt-and-kill: much the same, a little less winding. |
| `growing` | Growing tree, newest cell half the time and a random one the rest: in between. |
| `prim` | Randomized Prim: very many short dead ends, a short solution. |
| `kruskal` | Many short dead ends, evenly spread. |
| `wilson` | Loop-erased random walks: every maze equally likely, so no texture of its own. |
| `eller` | Row by row: horizontal runs. Square mazes only. |
