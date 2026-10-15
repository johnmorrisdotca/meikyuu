---
title: "Architecture and difficulty"
section: explanation
order: 8
description: "Understand the graph, game, view and measured score layers."
---

## Existing source organization

Everything that decides a maze or a game is a plain function over a cell graph, with no DOM. The drawing is SVG text in an entry of its own,
so a server that only builds mazes never loads it, and the page's part (the mount and the element) is another.

The file-by-file tree, with a line on each source file, is in [docs/ARCHITECTURE.md](../ARCHITECTURE.md): the grids and the algorithms, the maze and the measure, the game and the arrows, the levels (`levels/`, `levels-*`), the drawing (`draw`), the page (`mount`, `element`, `style`), and the solids (`solid/`). Tests sit beside the code they test (`*.test.ts`, and the maze list in eight files and the tall list in three so that they run side by side). `scripts/` makes the levels, builds the demo and its API reference page,
takes the pictures and checks the package as npm packs it; `demo/` is the playable page, and `e2e/` its browser tests.

## What difficulty measures

Effort counts native drawing/clearing work, not seconds on a device. Maze difficulty blends path/branch/turn features with geometric coverage. A route confined to one corner can score less than one visiting the whole map. Flat and surface geometry contribute different coordinate dimensions, so custom MazeGeometry must supply points and appropriate distance/bend functions.

Numbered collections hold recipes and metadata, not every built maze. Search is a static local index, and example checking is a build tool. Native rules and game functions stay free of DOM; browser mounts/styles/sound are optional entries. [LEVELS.md](../LEVELS.md) preserves score formulas and versioned ordering notes.
