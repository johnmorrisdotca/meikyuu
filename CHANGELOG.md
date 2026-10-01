# Changelog

All notable changes to this project are written here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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
