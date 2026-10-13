---
title: "Getting started"
section: tutorial
order: 1
description: "Build a small seeded maze and read its solution."
---

## A complete native recipe

Install `@johnmorrisdotca/meikyuu` with npm. Flat maze rules are in the root; drawing, mounting, levels and surface mazes have separate entries.

```ts
import {buildMaze,solutionOf,isPerfect,measureMaze} from "@johnmorrisdotca/meikyuu";
const maze = buildMaze({shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42});
console.log(maze.grid.cells,isPerfect(maze.grid,maze.links),solutionOf(maze));
console.log(measureMaze(maze).effort);
```

A recipe includes geometry, dimensions, algorithm, play mode and seed. The same native recipe reproduces the same maze. A perfect maze is a connected passage tree; measuring effort does not start a clock or play a game.

Use [recipes and algorithms](recipes.md), [native game state](progress.md), [numbered levels](levels.md) or [drawing and embeds](embeds.md) next. Large mazes and surfaces should be generated in a worker when a custom host must keep input responsive.
