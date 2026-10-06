# Architecture: the source tree

The file-by-file tree of Meikyuu's source, from [the README's Architecture section](../README.md#architecture). A test holds this tree to the files under `src/`, so it cannot fall behind the code.

Everything that decides a maze or a game is a plain function over a cell graph, with no DOM. The drawing is SVG text in an entry of its own,
so a server that only builds mazes never loads it, and the page's part (the mount and the element) is another.

```text
src/
├── index.ts          the main entry: the rules and the making, without the drawing, the page or the levels
├── random.ts         the seeded random numbers every maze is made from
├── grid.ts           a cell graph: cells, their neighbours and walls, and how a part of one is cut out
├── shapes.ts         the shapes: squares, hexagons, triangles, circles, and a hexagon and a pyramid cut from them
├── masks.ts          the outlines cut from a square grid: heart, leaf, star, ring, diamond, cross, moon
├── algorithms.ts     the seven ways to carve a perfect maze, over any grid
├── maze.ts           a maze: its recipe and its code, where each way to play puts the start, goal, doors and keys
├── measure.ts        how hard a maze is, counted off its passages, and the 1 to 100 rating
├── difficulty.ts     the 0 to 100 score of how hard a maze is to play, and the least a level must have
├── coverage.ts       how much of the map an answer covers: its box and its zones, and the factor the score is multiplied by
├── tall.ts           tall (2:3) mazes: the sizes, and the dimensions that fill a container in each shape
├── colossal.ts       colossal mazes (about ten thousand cells): how many, how big
├── stones.ts         stones: the rules of laying one beside the line, taking it up, and keeping a run with its stones
├── orientation.ts    which way up a maze is shown: the quarter turn, and carrying a finger's path back into the maze
├── steps.ts          a line as its steps, one character a step, the same on a board turned either way
├── game.ts           a line drawn through a maze as pure functions: press, drag, lift, tap, undo, hint
├── arrows.ts         arrow puzzles: made backwards so that all can be cleared, locked arrows, and their measure
├── arrowGame.ts      an arrow puzzle in play as pure functions: tapping, hearts, locks, hint, undo
├── mixed.ts          a mixed puzzle: arrows with locks, and a labyrinth whose button unlocks them
├── levels.ts         the "/levels" entry: the three lists, found by kind and number, and the maze list by size
├── levels-tall.ts    the "/levels/tall" entry: the 1,536 tall maze levels
├── levels-colossal.ts the "/levels/colossal" entry: the 256 colossal maze levels
├── levels-legacy.ts  the "/levels/legacy" entry: the 1.0.0 maze levels, and where each went
├── levels-solid.ts   the "/3d/levels" entry: the 960 levels of the solids
├── solid-entry.ts    the "/3d" entry: mazes over a solid, without the page
├── solid-play-entry.ts the "/3d/play" entry: a solid played in any element
├── draw-entry.ts     the "/draw" entry: the drawing, its boards and colours, its style and its words
├── draw.ts           a maze as SVG text: walls, line, marks, hint, solution
├── drawArrows.ts     an arrow board as SVG text
├── geometry.ts       the paths a drawing is made of: walls, lines, doors
├── boards.ts         the boards a drawing sits on and the colours of its line
├── style.ts          the drawing's style: its colours as custom properties, and its few motions
├── strings.ts        the words, in English and Japanese, for a screen reader and for the board's buttons
├── play-entry.ts     the "/play" entry: a puzzle played in any element
├── mount.ts          mountMeikyuu: draws a puzzle into an element and plays it, with its buttons, words and events
├── surface.ts        the box a board is looked at through: pinch, wheel, pan, edge nudging, and hands the rest to the board
├── mazeSurface.ts    a maze in the box: tiled walls drawn only while in view, the line, the hint, the marks
├── arrowSurface.ts   an arrow board in the box: tapping an arrow, one sliding off, one bumping
├── viewport.ts       the arithmetic of zooming and moving a big board through its box
├── playStyle.ts      the style of a playable board: its box, buttons, words and tabs
├── banner.ts         the message over a finished board and how it is put away: a click, its close button, Escape
├── sound.ts          the sounds, made in the browser
├── element.ts        the "/element" entry: the <meikyuu-board> class
├── element-define.ts the "/element/define" entry: defines the tag on the page
├── version.ts        the package's version
├── solid/
│   ├── vec.ts          points and quaternions: the arithmetic of turning a solid
│   ├── solidGrid.ts    the surface of a cube, a globe or a solid of triangles as a cell graph
│   ├── solidMaze.ts    a maze over a solid: its recipe, where it starts and ends, how hard it is, the checker
│   ├── solidSizes.ts   the three sizes of each solid
│   ├── solidView.ts    a solid turned and put on a picture: the near side, which cell a point is on, turning to a cell, turning by itself
│   ├── solidPaint.ts   the solid painted on a canvas: shaded cells, walls, line, marks, stones, hint
│   ├── solidColours.ts the colours the canvas reads from the page's custom properties
│   ├── solidDraw.ts    a maze over a solid as SVG text
│   ├── solidStyle.ts   the style of a playable solid, beside the board's
│   └── solidMount.ts   mountSolid: draws a solid into an element and plays it: turning, drawing, stones, words, events
└── levels/
    ├── mazes.data.ts   the 1,024 maze levels, each a recipe with its effort, its cells and its score
    ├── tall.data.ts    the 1,536 tall levels, the same
    ├── colossal.data.ts the 256 colossal levels, the same
    ├── legacy.data.ts  the 1.0.0 maze levels, kept, with the score each is given now
    ├── solid.data.ts   the 960 solid levels, each a recipe with its effort, its cells and its score
    ├── arrows.data.ts  the arrow levels, each a recipe with its effort
    └── mixed.data.ts   the mixed levels, each two recipes with their effort
```

Tests sit beside the code they test (`*.test.ts`, and the maze list in eight files and the tall list in three so that they run side by side). `scripts/` makes the levels, builds the demo and its API reference page,
takes the pictures and checks the package as npm packs it; `demo/` is the playable page, and `e2e/` its browser tests.
