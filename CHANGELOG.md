# Changelog

All notable changes to this project are written here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [3.1.1] - 2026-10-06

### Fixed

- A solid zooms in to six times, not three (`SOLID_ZOOM_MOST`). A cell of a colossal solid is about six pixels across with the whole solid in the box, so it takes a zoom of four to be a finger wide, and 3.1.0, where a board stopped at three, could not be played on a phone as it said. The pinch, the wheel, the `+` button and `view({ zoom })` all reach six; a solid that was already played zoomed in is unchanged.

## [3.1.0] - 2026-10-06

### Added

- **Eighteen solids to put a maze over** (there were five): the dice, by their sides (`SOLID_DICE`, `SOLID_DIE_SIDES`): the triangular prism (d3), the tetrahedron (d4), the cube (d6), the octahedron (d8), the pentagonal trapezohedron (d10), the dodecahedron and the rhombic dodecahedron (the two d12), the octagonal bipyramid (d16), the icosahedron (d20), the deltoidal icositetrahedron (d24) and the rhombic triacontahedron (d30); and the shapes (`SOLID_SHAPES`): the globe, a box, a cross of cubes, a ring, a torus, a star and a heart. They are made the same way as the first five (every face cut into cells, joined across every edge), exactly, so a recipe builds the same maze everywhere. A d2 is a coin and a d100 a d10, so neither is a solid of its own.
- **Five sizes, up to about four and a half thousand cells.** Huge (about 1,300 cells) and colossal (about 4,400; 3,600 to 3,900 for the star, the heart, the cross and the ring) join small, medium and large (`SOLID_SIZE_NAMES`, `SOLID_CUTS`). A colossal solid is played zoomed in (a cell is a finger wide at a zoom of four), where only the cells in the picture are painted: 6 to 30 ms a frame on a phone-sized Chromium slowed four times, rasterising in software (`docs/SOLIDS.md`, "The big sizes").
- **5,760 levels**: 64 for each size of each solid, each list in the order of its score. The last colossal level of a solid scores 89 (the star) to 93, as hard as the hardest of the flat lists' huge mazes. In three files so a page loads only what it shows: `3d/levels` (the first five solids, 1,600 levels, as before with two sizes more), `3d/levels/dice` (the seven further dice, 2,240), `3d/levels/shapes` (the six shapes, 1,920), `3d/levels/all` (every one) and `3d/levels/recipes` (the recipe of each of the 5,760 and nothing else, fifty kilobytes, for a server that has only to say which recipe is which level: `solidRecipesOf`, `solidLevelNumberOf`). New in the main `/3d` entry: `SOLID_DICE`, `SOLID_SHAPES`, `SOLID_FIRST`, `SOLID_MORE_DICE`, `SOLID_MORE_SHAPES`, `SOLID_DIE_SIDES`, `isSolidDie`, `isSolidCut`, `SOLID_CUTS`, `SOLID_SIZE_NAMES`, `solidCellsOf`, `solidCutOf`, `MEIKYUU_SOLID_PER_LIST`.
- **Solids whose parts hide parts** (the cross, the ring, the torus, the star, the heart; `grid.convex` is false): painted from the back in slabs of depth, a point is on the nearest cell under it, a line is not drawn over a cell that is hidden, and the solid turns to the direction a hidden cell can be seen from (`revealDirection`), or, where two passages cancel, to the lowest numbered; Face me does the same. The star and the heart are first seen from the front. `drawSolid` (SVG) is back to front too.
- The names of the thirteen new solids (`solid_prism`, `solid_trapezohedron`, ..., `solid_heart`), in English and Japanese (the Japanese is not yet reviewed by a native reader), and the demo's picker: a row of dice by their sides and a row of shapes, and five sizes.
- `scripts/meikyuu-solid.ts` makes the lists a solid at a time (`--kind`, `--size`, `--force`, then `--write`), seeded; `pnpm levels:rescore` puts them in the order of the score.

### Changed

- **Only the cells in the picture are painted** (a solid zoomed in): `frame.shown`, `frame.near` and `frame.count` count the cells on the near side that are in the picture (and 24 pixels round it). A solid at zoom 1 paints as it did.
- A cut of 1 is allowed for a solid with sixty cells uncut (the dodecahedron: five squares to each pentagon).
- `MEIKYUU_MOST_SOLID_CELLS` is 10,000 (it was 6,000). `SolidSize` has `huge` and `colossal`; `SolidKind` has thirteen more names; `SolidGrid` has `convex` and `upright`; `SolidFrame` has `order`, `seen` and `shown`; `edgeTurn` takes a `hidden` test.
- `3d/levels` has 1,600 levels (five solids at five sizes) where it had 960: the first three sizes of each list are as they were in 3.0.0.

## [3.0.0] - 2026-10-06

**Level numbers name different mazes.** Every level list has the same recipes as 2.3.0, in a new order, so "Huge level 12" is another maze. A solve kept by recipe is unaffected; a solve, a kept run or a link kept by size and number is not (see `docs/LEVELS.md`, "3.0.0").

### Changed

- **A level's difficulty counts how much of the map its answer covers.** The score is the six terms' weighted sum, as before, multiplied by `0.5 + 0.5 * cover`, where `cover = clamp((0.5 * bbox + 0.5 * zones - 0.20) / 0.70, 0, 1)`: `bbox` is the box that holds the answer (and the trips to its keys) over the box that holds the maze, `zones` the share of the map's area, in a grid of zones (2 by 2 under 150 cells, 3 by 3 under 800, 4 by 4 above; for a solid 2 by 2 by 2 under 200 cells, else 3 by 3 by 3, over 0.75), that the answer visits at 2 cells or more. A maze whose answer stays in a corner counts for half what the same maze with an answer across the whole map does; one that covers the map keeps its score. The score is rounded once, after the factor. No level scores more than before; 861 of the 3,776 levels lose a dot (cut at 20, 40, 60 and 80), 10 lose two. The Huge cross whose answer was 134 cells of 4,736 in the middle and one arm, 76 and four dots, is 47 and three. The rule, for every package with levels, is [LEVELS-STANDARD.md](https://github.com/johnmorrisdotca/.github/blob/main/LEVELS-STANDARD.md).
- **Every list is in the order of its score**, not of its effort: the four maze sizes, the six tall sizes, both colossal lists and the fifteen solid lists, each by the unrounded score, then the effort, then the old place. The recipes in each list are the same. Made by `pnpm levels:rescore` (`scripts/meikyuu-rescore.ts`), which scores every level again and writes the lists in order; run it after any script that makes levels.
- `levels/legacy` answers from the new order: `now` and `nowInSize` are where a 1.0.0 maze stands now, and `nearest` is that maze where it is still a level, else the level of its size whose score is nearest (it was the level at the same place).
- The 1.0.0 list in `legacy.data.ts` keeps its own order, with the new score beside each.
- The lists are no longer built up to a floor: a test holds every level to `isTooEasy`'s least, with no place.

### Added

- `coverageOf`, `MazeCoverage`, `zonesAcross` and the constants of the measure (`COVERAGE_FLOOR`, `COVER_FROM`, `COVER_SPAN`, `ZONE_REAL`, `ZONE_VISIT`, `SOLID_ZONES_TOP`) in the main entry, and `src/coverage.ts`.
- `MazeDifficulty.coverage` (the box, the zones, the cover and the factor) and `MazeDifficulty.base` (the six terms' sum before the factor).
- `MazeGeometry.points`, where each cell lies (two numbers for a flat maze, three for a solid), which `difficultyOfGraph` reads for the cover. **Breaking for a caller who made their own `MazeGeometry`.**

### Fixed

- Nothing; the generators are unchanged and every recipe builds the maze it built.

## [2.3.0] - 2026-10-06

### Added

- The `banner` option (default true; the `banner` attribute of `<meikyuu-board>`, `off` for none; `set({ banner })`) for the message over a solved board, "Solved in 3 strokes.", on flat mazes, arrow puzzles and mazes over a solid alike. `false` leaves it out, and the line of words under the board still says the puzzle is solved.
- A string, `closeMessage` ("Close the message", in Japanese "メッセージを閉じる"), the label of the message's close button.

### Changed

- The solved message can be put away. It has a close (×) button with a label, a click or tap on the message closes it too, and so does Escape while the board has focus (the press goes no further, so a page that also leaves a mode on Escape leaves it on the next press). It stays shut while the puzzle stays solved and comes back for the next win after Undo or Restart. It was a pill in the middle of the board that took no input at all and could not be closed, over the maze and the line.
- It sits at the top of the box, so it covers little of the board, and only the message itself takes the pointer: turning a solid, drawing, the zoom pad, Fit and the arrows work with it open as they do after it is closed.

## [2.2.2] - 2026-10-06

Nothing that was exported has changed.

### Changed

- The README takes the family's one layout, fully: a hero picture of the demo on a desk and on a phone in light and dark, a picture of the shapes (hexagons, triangles, a circle, a leaf), of the keys, arrow and mixed puzzles, of a tall maze on a phone and of a cube, a globe and an icosahedron, an Install section, an Examples section of eleven examples whose output is what they print, an Accessibility section and a short list of the calls to learn first. Its pictures are in `docs/images` (WebP, light and dark) and are retaken with `pnpm screenshots:readme` (it replaces `pnpm pictures`, `docs/desktop.jpg`, `docs/phone.jpg` and the three `docs/solid-*.jpg`); they are not in the tarball, and `pnpm test:package` fails if one is. The tall mazes' pictures that `docs/LEVELS.md` shows are retaken by `pnpm pictures:levels`.
- To keep the README under the 64,000 characters npm can show, the long sections moved to pages under `docs/`, each with its heading and a summary left in the README: colossal mazes, stones and tall mazes to `docs/MORE-MAZES.md`; mazes over a solid to `docs/SOLID-MAZES.md`; the board's options and events to `docs/PLAYING.md`; the source tree to `docs/ARCHITECTURE.md`. Nothing was removed, and the tests that hold these to the code read the README and these pages together.
- "Where it comes from" now carries "Used by" and "The family" with it, the Roadmap sits before the Architecture, and the README has an Accessibility section.
- Repository only: the package and everything it exports are unchanged. `CONTRIBUTING.md` is the family's one text with a section of its own for Meikyuu, held to the master in johnmorrisdotca/.github by `src/family.test.js`; `ci.yml` and `pages.yml` are the family's one text (`pnpm check`, the demo, and the package on Linux, macOS and Windows), and any jobs of the package's own after them.
- The demo's own colours on the felt (the gold and mint of its marks, the cream banner and its ink, the shade and the pale edge of its buttons) are named once in `demo/meikyuu.css`.

### Fixed

- Two demo tests that failed now and then no longer do. The arrow in the way is marked by a flash the board takes off after 900 ms, and the tests looked for it afterwards, so on a slow runner the mark had gone; they now read what the board did, not what it still shows. The tall maze's gutter test held the page to a scroll position taken while the swipe's last pixel of momentum was still arriving; it now waits for the page to come to rest. Nothing the package exports has changed.
- The API reference page wraps a long entry path instead of running about 2 px wider than a 360 px screen. Nothing the package exports has changed.

## [2.2.1] - 2026-10-05

Nothing that was exported has changed.

### Added

- A test holds every `@johnmorrisdotca/meikyuu@N` version pin in the README to this package's major version.

### Changed

- The family's list, in the README and in the demo's footer, names all twenty-four packages, Karakuri and Houseki included.
- The npm description is one sentence of 250 characters or fewer, so npm and its search show it whole; it is also the repository's About text. `homepage` is the demo site and `author` is `"John Morris"`, the same in every package.
- The GitHub Actions workflows use the current versions of the actions (checkout 7, setup-node 7, pnpm/action-setup 6; configure-pages 6, upload-pages-artifact 5 and deploy-pages 5 for Pages), which clears GitHub's Node 20 deprecation warning.

## [2.2.0] - 2026-10-05

### Added

- **Mazes over the whole surface of a solid: `@johnmorrisdotca/meikyuu/3d`, `/3d/play` and `/3d/levels`.** A perfect maze on a **cube**, a **sphere**, a **tetrahedron**, an **octahedron** or an **icosahedron**, to be turned in the hand and followed round. A maze needs only a cell graph and the surface of a solid is one, so the very algorithms the flat mazes use (all but Eller's) carve it, the very game plays it (`pressMaze`, `dragMaze`, `hintMaze`, stones, `lineToSteps`) and the very measure scores it (`difficultyOf`'s terms, in three dimensions).
  - **The graph** (`solidGridOf(kind, n)`, `SolidGrid`): a cube is six squares `n` by `n` joined across every edge (6 n^2 cells); the sphere is a geodesic globe, the dual of an icosahedron cut `n` ways, 12 pentagons and the rest hexagons (10 n^2 + 2 cells), chosen over a cube with its corners rounded off because that has the very graph of the cube and would be the same maze in another coat, where the football's cells are nearly equal all over, with no poles; the triangle solids are 4, 8 and 20 faces each cut into `n^2` triangles. Corners are found by whole-number weights, never a rounded coordinate, so the same graph is built in every engine, and the order of a cell's sides is fixed (counter-clockwise from outside) because a kept line is the position of each cell among its predecessor's neighbours.
  - **The maze** (`buildSolidMaze`, `SolidRecipe`, `parseSolidRecipe`, `solidRecipeCode`; a recipe is `cube:7:prim:48213`, at most 6,000 cells): the start is chosen from the seed, the goal among the farthest third from it over the surface and deep along the passages, so it is usually on the far side. `solidDifficultyOf(maze)` scores it on the flat mazes' scale. `checkSolidAnswer(maze, cells)` checks a list of cells (from the start to the goal, each joined to the last, none twice) in time of the line's length; `solidSolutionOf`, `solidAnswerSteps`.
  - **Looking at it** (`createFrame`, `projectFrame`, `pickCell`, `cellsAlongDrag`, `dragTurn`, `stepTurn`, `faceCellTurn`, `openingTurn`, `edgeTurn`; quaternions in `quatMul`, `quatTurn`, ...): the solid is turned and seen from a few times its reach away (a gentle perspective), at the size that just fits the box; a cell is on the near side when its outline, as drawn, runs the right way round. A point is on the cell whose drawn outline holds it, and `solidView.test.ts` checks that against an independent method (a ray from the eye through the point, tested against each cell's polygon in three dimensions) for all five solids at random turns.
  - **Playing it** (`mountSolid(host, options)`): a canvas, painted in about a dozen fills and two strokes however many cells (shaded by how squarely each faces you, the walls that stand, the line, the start and the goal laid on the surface so they foreshorten with it, stones, the hint). You draw by pressing the start or the end of your line and dragging along the passages. You **turn** it by dragging anywhere that is not the end of the line, with two fingers (which pinch to zoom and twist), by the wheel (zoom), by the arrow buttons and keys, and by **Face me** (`faceMe()`), which brings the end of the line round, tilted to show the faces round the edge it is at. **When the end of the line being drawn faces away, or leads over an edge to a cell that is out of sight, the solid turns by itself**, gently, so that a line can be drawn from one face to the next, all the way round, in one stroke (`edgeTurn`, on unless `edgeTurn: false`). Tap, hold for a stone, Undo, Restart, Hint, `run()` / `restore()`, the events `meikyuu-move`, `meikyuu-solve` and `meikyuu-stones`, the data attributes and the handle on `host.meikyuuSolid` are the flat board's; `place(cell)`, `between(a, b)` and `pick(x, y)` say where a cell is on the picture and which is at a point. The answer is the list of cells: the run kept is the same text however the solid is turned.
  - **Performance.** On a phone-sized Chromium (390 px wide, 3x) slowed four times over, all five solids at 576 to 726 cells turn at the screen's 60 frames a second with no frame over 20 ms: the canvas is painted at about half the pixels while the solid moves and put back a moment after it stops, and the cells are filled in ten batches (one for each degree of shade) and the walls stroked as two paths. `e2e/solid.demo.mjs` holds it.
  - **`drawSolid(maze, options)`**: a still picture of a solid as SVG text, shaded with `color-mix` of the paper's custom property, so the page's light or dark and the board change it.
  - **Levels** (`MEIKYUU_SOLID_LEVELS`, `solidLevelsOf`, `solidLevelOf`, `findSolidLevels`, `SOLID_CUTS`): 64 for each of three sizes of each of five solids, 960, of about 70 to 100, 250 to 320 and 580 to 720 cells, each list in the order of the difficulty it scores (30 to 65), made by `scripts/meikyuu-solid.ts`, seeded, rebuilt and solved by drawing in `levels.solid.test.ts`.
  - Words in English and Japanese (`solid_cube`, `solid_sphere`, ..., `faceMe`, `turnLeft`, `solidHow`, ...); the demo has an "Over a solid" section.
- `MazeCore`, the part of a maze the game, the stones, the steps and the measure read (the passages, the two ends, the keys, how many cells and which are beside which), and `difficultyOfGraph(maze, geometry)` / `MazeGeometry`, the difficulty for any maze given how it lies in space. `CellGraph`, what a generator reads of a grid.

### Changed

- `MazeGame`, `newMazeGame`, `pressMaze`, `dragMaze`, `liftMaze`, `undoMaze`, `restartMaze`, `tapMaze`, `playSolution`, the stone functions, `decodeRun`, `lineToSteps`, `stepsToLine`, `measureMaze`, `solutionOf` and `isPerfect` take any `MazeCore` (`MazeGame<M extends MazeCore = Maze>`), where they took a `Maze`. For a flat maze nothing changes: the type parameter defaults to `Maze`, every flat level rebuilds and scores as it did, and no behaviour was touched.

## [2.1.0] - 2026-10-05

### Added

- **Colossal mazes: `@johnmorrisdotca/meikyuu/levels/colossal`.** Two lists of 128 levels, in an entry of their own: **square** ones of about ten thousand cells (9,514 to 11,995; a hundred across or so, in all thirteen shapes and all four ways to play) and **tall** ones for a phone held upright (64 across and 96 down for a square one, 6,059 to 6,144 cells, hexagons and triangles laid out to fill the same 2:3 container). `MEIKYUU_COLOSSAL_LEVELS`, `MEIKYUU_COLOSSAL_TALL_LEVELS`, `colossalLevelOf`, `colossalTallLevelOf`, `findColossalLevels`, `MEIKYUU_COLOSSAL_PER_LIST`, `COLOSSAL_CELLS`, `COLOSSAL_TALL_WIDTH`, `COLOSSAL_TALL_HEIGHT`. Each list is in order of effort (1,744 to 9,762 and 1,224 to 6,008), scored by the same `difficultyOf` (80 to 99 and 71 to 95), deterministic from its seeds, made by `scripts/meikyuu-colossal.ts`. The lists are recipes, so they are 17 KB, and a maze is built from its seed where it is played (about 20 to 60 ms in a browser for ten thousand cells): nothing is generated ahead and nothing needs to be. They are not in `MEIKYUU_MAZE_LEVELS` and renumber nothing. Every level is rebuilt, measured, and solved by drawing its way in `levels.colossal.*.test.ts`.
- **Stones.** `mountMeikyuu(host, { stones: true | { limit, reach } })`, off by default: a marble laid on a passage cell beside the line that the line may not enter, for shutting a passage found to lead nowhere. Laid only within `reach` cells (1 or 2; default 2) along the passages of a cell of the line, not through another stone, never on the line, the start or the goal, while `limit` stones are not down (`stoneLimitFor(cells)` by default, 4 for a small maze to 13 for a colossal one; `null` for no limit), and not once the maze is solved. Taken up by laying on it again. By the Stone button (`mount.stoneMode(on)`: a tap lays or takes up, nothing draws), by press-and-hold on a cell (a finger or the mouse still for half a second; a hold on the line is a pause), or by Shift and an arrow key beside the end of the line. A stone is part of the game: **Undo** puts back what a lay or a take changed, **Restart** takes every stone up, and the run is kept with its stones as one short text (`mount.run()`, `mount.restore(code)`, `encodeRun`, `decodeRun`: the line's steps, a `~`, the stones' cells in base 36). Never part of the maze, its recipe, its answer or any check. New on the handle: `stoneMode`, `stones`, `stonesLeft`, `stone(cell)`, `clearStones`, `run`, `restore`; the `meikyuu-stones` event and `onStones`; `stones` and `stonesLeft` on every event's detail; `stones`, `stone-limit` and `stone-reach` on the tag; `stones` on `drawMaze`; `--mk-stone` and `--mk-stone-edge`; the words in English and Japanese; a `stone` sound. The pure rules are `canLayStone`, `layStone`, `takeStone`, `toggleStone`, `clearStones`, `withStoneRules`, `stoneRulesOf`, `stonesLeft`, `hasStone`; `MazeGame` has `stones` and `rules`, and `newMazeGame(maze, rules?)`.
- The demo has the two colossal lists and a Stones row (on or off, a few or no limit, next to the line or two cells).

### Changed

- **A long line is cheap to draw and to draw back.** The line is kept as text with where each cell's piece ends, so drawing on or back by a few cells costs those cells and not the whole line, and it is written to the page once a frame however many cells a finger crossed. On a phone-sized Chromium slowed four times over, drawing a 5,009-cell line at six cells a frame cost 22.6 ms a frame and now costs 6.1 (frames held at 16.7 ms). Walls were already drawn only while on screen; zooming and moving a colossal maze was already at the frame rate, so the board stays SVG.
- A line of more than 600 cells does not ripple when it wins.
- A stone's group is redrawn only when the stones change.

## [2.0.1] - 2026-10-02

### Fixed

- **A mixed puzzle can be finished after the labyrinth is solved.** The report: the labyrinth solved, back on the arrows tab it read "3 arrows left. Hearts: 0 of 3." with nothing to tap, and no finish. The cause was the hearts, not the tab switch: the arrows that the locked arrow holds up cost a heart each time they were tapped, so a player who tapped them on the way to the button lost the puzzle (hearts spent, `meikyuu-lose`) before ever drawing the labyrinth; and the board then hid it. The word of what had just happened ("Out of hearts" or a bump) was carried to the other tab and replaced by "Unlocked!", so a lost puzzle on the arrows tab read as a plain one that would not move.
  - **An arrow that nothing can free before the unlock costs no heart** (`tapArrow` answers `locked`, with `by` the locked arrow to look at, and nothing changes), whether a locked arrow is in its way directly or behind others. New `heldByLocks(game, id)` says which; an arrow that is blocked by one the player could clear first still costs a heart. A mixed puzzle can no longer be lost before the button is tried. New words `arrowsWaiting`.
  - **A puzzle out of hearts says so from its state**, on the arrows tab (`arrowsLost`) and, in a mixed puzzle, on the labyrinth's (`arrowsLostAway`), whatever else was said last. Restart on the arrows keeps the unlock.
  - **Nothing is said twice.** "Unlocked! The locked arrows are free to go." was in the progress line and again in the message line; it is now the progress line's on the labyrinth and the message line's on the arrows. A message belongs to the tab it was said on and is not carried over.
  - The labyrinth's tab reads "Cleared!" once the arrows are cleared, where it kept saying "Unlocked!".
  - Tests: the state logic for every order (arrows first, labyrinth first, restart and undo after the unlock, lost and restarted) in `src/mixed.test.ts` and `src/arrows.test.ts`; `e2e/mixed.demo.mjs` plays mixed puzzles in a browser in both orders with the tabs switched again and again, by mouse and by touch, and asserts one `meikyuu-solve`, the banner and the confirmation line.

## [2.0.0] - 2026-10-02

**This is a MAJOR release (2.0.0), not a minor one**, because the maze list is renumbered: `MEIKYUU_MAZE_LEVELS` was 1,000 levels in one list and is now 1,024 in four sizes of 256, and the first release promised a level keeps its number. Everything else here is additive. `package.json` still says 1.0.0: the version is taken when it is released.

### Breaking: the maze list

- **256 levels to a size.** Small, medium, large and huge are 256 each, in that order (`MEIKYUU_LEVELS_PER_SIZE`, `mazeLevelsOfSize`, `mazeLevelOfSize`; a level has `size`, `inSize` and `score`), where 1.0.0 had 217, 231, 285 and 267 by `sizeOf`. A size is sixteen pages of sixteen, and its thirds (86, 85, 85) are its easy, medium and hard (`bandOf`). The one list `MEIKYUU_MAZE_LEVELS` is now 1,024 long, so **every level number from 218 up moves**: level 1 to 256 of the list are Small, 257 to 512 Medium, 513 to 768 Large and 769 to 1,024 Huge.
- **A size keeps its places, as far as it can.** 843 of the 1,000 levels of 1.0.0 are at the same place of the same size, with the same maze: Large and Huge keep places 1 to 256 exactly, Medium 222 of its first 231, Small 109 of 217. A place whose maze was **too easy** has a new maze of about the same effort: 108 places of Small (the 3 by 3 mazes among them) and 9 of Medium. **Added at the end:** places 218 to 256 of Small and 232 to 256 of Medium, mazes of rising effort that carry on up from the last. **Gone:** places 257 to 285 of Large and 257 to 267 of Huge (the 29 and 11 hardest of those sizes), which a size of 256 has no room for.
- **`@johnmorrisdotca/meikyuu/levels/legacy`** (`legacyLevelOf`, `legacyLevelOfCode`, `MEIKYUU_LEGACY_MAZE_LEVELS`) answers for every one of the 1,000: its recipe, its place in its size (`place`), where it is now (`now`, `nowInSize`) or null, and the level now at its place (`nearest`). A recipe never changes what it builds, so a solve kept by recipe is still a solve of that maze whatever it is called; a solve of one of the 157 that left the list is a solve of a maze that is no longer a level.
- **Easy is not trivial.** `isTooEasy` / `MEIKYUU_LEAST`: every level is held to at least 4 cells the straight guess draws in vain, 2 forks where it is wrong, 3 forks, 3 wrong branches and 4 dead ends, and the easy third of a size to a floor that rises through it (`easyFloorAt`: 3 traps, 5 forks and 8 wasted cells at level 86). 62 of the 73 easy levels of Small in 1.0.0 failed it, 28 of Small's 217 were solved by the straight guess alone. The easy third of Small now runs from 15 to 48 cells.
- The effort still never goes down along a size, which is the first release's promise kept inside each size; it no longer rises along the whole list, since Medium begins where Small ended.

### Added

- **`difficultyOf(maze)`**: a 0 to 100 score of how hard a maze is to play, from the effort, the forks, the forks where the straight guess goes wrong, the cells it draws in vain, the longest wrong branch and the bends. `docs/LEVELS.md` documents it, shows the score of every level, and has the tables of what the lists hold and how many more could be made.
- **Tall levels** (`@johnmorrisdotca/meikyuu/levels/tall`): 1,536 portrait mazes, 2:3, in six sizes of 256 (6×9, 8×12, 10×15, 12×18, 16×24, 20×30; squares, hexagons and triangles), ordered by effort like the rest, with the score beside it. `tallDimensions`, `TALL_RATIO`, `TALL_WIDTHS`. 1:2 was weighed and not built (`docs/LEVELS.md`).
- **`orientation`** (`portrait`, `landscape`, `auto`) in `mountMeikyuu`, `<meikyuu-board orientation>` and `drawMaze`: a maze is shown a quarter turn counter-clockwise where that fits it bigger (`auto` looks at the host's width and the window's height). Presentation only: the maze, its cells and any line are as made, so a line stored as its steps (`lineToSteps`, `stepsToLine`) replays identically either way up. Tested for every shape, in the browser as well.
- **`ratio`** (the shape of the box: `square`, `maze`, or width over height), **`gutter`**, **`reserve`**, **`fit`** (`both`, `width`, `height`), **`edgePan`**, **`pan`** and **`turnButton`** options, with attributes on the element, and `gutter()`, `pan()`, `edgePan()`, `orientation()` and `fit(mode)` on the handle. A `meikyuu-orientation` event. `--mkp-gutter` and `--mkp-reserve`.

### Changed

- **The board always leaves some of the page beside it** (24 px each side at least) and is never taller than the window less `reserve`; only the box asks the browser to keep touches (`touch-action: none`), the host has `pan-y pinch-zoom`. **A board that filled the width of its host in 1.0.0 is up to 48 px narrower on a phone**; `gutter: 0` takes it back.
- **Zoom out widens the gutters** (to 72 px) once the whole maze is in the box, and a pinch does the same; Zoom in and fingers apart bring them back first. Fit puts them back.
- **A box that changes size keeps its zoom relative to the fit**, and the middle of what it shows, so narrowing the box no longer crops a fitted maze.
- **The edge nudge is gentle**: nothing 44 px from the edge, rising to 7 px a frame at the edge itself, where it was 7 px a frame anywhere in the last 44.

## [1.0.0] - 2026-10-01

The first release.

- **Mazes**, on any cell graph (`@johnmorrisdotca/meikyuu`): squares, hexagons, triangles, circles (rings that gain cells outward)
  and shapes cut out of a grid: a heart, a leaf, a star, a ring, a diamond, a cross, a moon, a hexagon of hexagons and a pyramid of triangles. Seven
  algorithms carve a perfect maze from a seed: `backtracker`, `hunt`, `growing`, `prim`, `kruskal`, `wilson` and `eller` (squares only). Four ways to play, each a declared field
  of a level: `enter-leave`, `to-goal`, `centre-out` and `keys`. A recipe, `square:12x9:wilson:to-goal:48213`, rebuilds the same maze in every
  browser and every Node.
- **Recipes have a ceiling.** `parseRecipe` returns null for a recipe that would lay out more than `MEIKYUU_MOST_CELLS` (40,000) cells or ask for more than `MEIKYUU_MOST_KEYS` (10) keys, and `parseArrowRecipe` for a board past `MEIKYUU_MOST_ARROW_CELLS` (4,000), so a server that takes recipes from other people cannot be asked to build a maze of millions of cells. This is in 1.0.0 itself: it was added before the first publish.
- **A difficulty measure** (`measureMaze`): the way through, the decisions on it, the wrong branches, dead ends, river and the cost of keys, added to an `effort`, and a rating from 1 to 100.
- **The game as pure functions**: `pressMaze`, `dragMaze`, `liftMaze`, `tapMaze`, `undoMaze`, `restartMaze`, `hintMaze`.
- **`@johnmorrisdotca/meikyuu/levels`**: 1,000 maze levels, each at least as hard as the one before, from a three-by-three to mazes of about nine thousand cells,
  every shape and every way to play mixed through the list; 300 arrow levels; 100 mixed levels. Every level is rebuilt, proved perfect, measured again and solved by the game's own rules on every build.
- **`@johnmorrisdotca/meikyuu/draw`**: a maze or an arrow board as SVG text, on six boards (`paper`, `wood` and four cloths) with five line colours, in English and Japanese.
- **`@johnmorrisdotca/meikyuu/play`**: `mountMeikyuu` draws a puzzle into any element and plays it by touch and mouse: a line that follows the corridors, cannot pass a wall and shortens when
  drawn back; pinch, wheel and pad zoom, two-finger and drag pan, Fit, edge nudging while drawing; walls drawn in tiles only while on screen, so a maze of thousands of cells stays smooth on a phone;
  Undo, Restart, Hint, tap-to-extend, the arrow keys, optional sounds made in the browser, a celebration that respects `prefers-reduced-motion`, and the events `meikyuu-move` and `meikyuu-solve`.
- **`<meikyuu-board>`** (`/element`, `/element/define`): the same in a tag, with an attribute for every option.
- **Arrow puzzles**: a picture made of arrow paths; tap an arrow and it slides off the way it points if nothing is in its way, otherwise it bumps and costs a heart. Made backwards, so every puzzle can be cleared.
- **Mixed puzzles**: arrows, some locked, and a labyrinth with the unlock button hidden deep inside it.
- The demo has a chooser by kind, shape, size and way to play, a level number with arrows, a gallery of the shapes, every option, the family's Help switch and cloth patches, and browser tests
  (`pnpm test:demo`) in Chromium and WebKit at a phone's width and a desk's.
- `docs/MAZES.md` is the research behind the algorithms, the grids and the difficulty measure, with links.
