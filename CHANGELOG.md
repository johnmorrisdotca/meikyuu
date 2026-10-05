# Changelog

All notable changes to this project are written here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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
