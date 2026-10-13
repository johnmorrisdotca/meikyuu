---
title: "Keep a native maze run"
section: how-to
order: 5
description: "Store the exact recipe alongside native path and stone state."
---

## Round-trip a line

```ts
import {buildMaze,newMazeGame,pressMaze,dragMaze,solutionOf,encodeRun,decodeRun,recipeCode} from "@johnmorrisdotca/meikyuu";
const recipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42} as const;
const maze = buildMaze(recipe), route = solutionOf(maze);
const game = dragMaze(pressMaze(newMazeGame(maze),maze.start),route[1]);
const restored = decodeRun(maze,encodeRun(game),null);
console.log(recipeCode(recipe),restored?.path);
```

Keep the full recipe with native run text. A line is a cell sequence through passages, with keys and completion derived by rules. Changing display orientation does not change cell identity. Native step/run decoders reject incompatible routes with `null`; do not assume a route belongs to another maze merely because cell counts agree.

## Stones and host ownership

Stones are optional and block passage cells. Limits, reach, endpoints, current line and drawing state determine whether a stone may be placed; `canLayStone`/`toggleStone` explain refusal. `stonesLeft` is `null` for unlimited allowance. Restore with the matching stone rules, not a new arbitrary budget. The SDK returns text; the host decides how to save it. Frames store nothing, while the full demo retains its existing opt-in local behavior. See [encodings and views](geometry.md) and [the embed contract](../embeds.md).
