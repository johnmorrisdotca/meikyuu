---
title: "Choose geometry, algorithms and modes"
section: how-to
order: 2
description: "Keep the full recipe when sharing a reproducible puzzle."
---

## Encode the full recipe

```ts
import {buildMaze,recipeCode,parseRecipe,MEIKYUU_ALGORITHMS,MEIKYUU_MODES} from "@johnmorrisdotca/meikyuu";
const recipe = {shape:"square",w:5,h:5,algorithm:"prim",mode:"enter-leave",seed:42} as const;
const code = recipeCode(recipe);
console.log(code,parseRecipe(code),MEIKYUU_ALGORITHMS,MEIKYUU_MODES);
console.log(buildMaze(recipe).entrance!==null);
```

Seven algorithms carve passage graphs. Shapes include square, hexagon, triangle, circular rings and cut-out masks. Check supported dimensions and cell limits; a circular grid's rings are not the same as a rectangular width/height. Eller is not a surface algorithm. Native parsers return `null` for malformed recipe text; builders reject invalid recipes rather than quietly changing them.

## The play mode matters

Enter/leave provides boundary doors. Goal, centre-out and key modes choose different endpoints or collected keys; a goal-mode maze may have no boundary entrance at all. Keep shape, dimensions, algorithm, mode, seed and key count together. Appearance and orientation affect drawing, not puzzle identity. See [MORE-MAZES.md](../MORE-MAZES.md) and [buildMaze](api:buildMaze).
