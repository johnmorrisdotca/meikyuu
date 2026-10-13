---
title: "Cell graphs, views and surface mazes"
section: explanation
order: 7
description: "Keep graph identity separate from projection and pointer geometry."
---

## Flat and surface graphs

```ts
import {buildSolidMaze,solidSolutionOf,checkSolidAnswer} from "@johnmorrisdotca/meikyuu/3d";
const maze = buildSolidMaze({kind:"cube",n:2,algorithm:"backtracker",seed:42});
console.log(maze.grid.cells,checkSolidAnswer(maze,solidSolutionOf(maze)));
```

The same carving logic reads adjacency lists, whether cells live on a flat mask or a solid. Surface coordinates have three components and cells can cross face boundaries. A rotation quaternion or projection changes where cells appear, not their links. Logical paths and recipe codes survive view changes.

## Pointer and scale units

Flat view functions use viewport pixels and logical board bounds. Surface frame functions project vertices/centres, track facing/visibility and pick the cell under a pointer. Do not use a screen point as a graph cell or a 2D point as a 3D vector. Quaternion interpolation uses a normalized rotation and a share from 0 to 1; turn angles use radians. Tall collection size is an index, not width; a surface subdivision n differs from a named level size.

Use `/3d/play` for the native rotation/zoom player and cleanup. The [surface usage](../SOLID-MAZES.md), [geometry design](../SOLIDS.md) and [drawing guide](../drawing.md) preserve the detailed native conventions.
