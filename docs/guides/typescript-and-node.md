---
title: TypeScript and Node
section: how-to
order: 15
description: Use the package's types, and run the rules on a server with no DOM.
---

The package ships its own types, for each entry point. The rules are plain functions over strings and numbers, so the same call gives the same answer in Node, Deno, Bun, a worker and a browser. This file type-checks, then runs under Node 22.18 or later, which strips the types.

```ts
import { buildMaze, solutionOf, type Maze } from "@johnmorrisdotca/meikyuu";

const maze: Maze = buildMaze({ shape: "hexagon", w: 6, h: 6, algorithm: "kruskal", mode: "centre-out", seed: 3 });
console.log(maze.grid.cells, solutionOf(maze).length > 0);

// @ts-expect-error the cells are a count, not a name
const wrong: string = maze.grid.cells;
console.log(typeof wrong);
```

`@ts-expect-error` is there to show that the compiler refuses the wrong type.

## On a server

A server needs no DOM. It checks what the player sent against the same rules.

```mjs
// A server that wants to trust a level takes a recipe and rebuilds the maze, with no page at all.
import { buildMaze, parseRecipe, solutionOf } from "@johnmorrisdotca/meikyuu";

const recipe = parseRecipe("heart:25:wilson:to-goal:5"); // null when it is not a recipe
if (recipe === null) throw new Error("not a maze this site makes");
const solution = solutionOf(buildMaze(recipe)); // the one way through, cell by cell
console.log(solution.length > 0, parseRecipe("nonsense")); // true null
```

See [getting started](getting-started.md) for mounting the maze in a page.
