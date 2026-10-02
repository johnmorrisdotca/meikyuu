# Changelog

All notable changes to this project are written here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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
