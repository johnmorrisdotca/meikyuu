---
title: "Play arrows and mixed boards"
section: how-to
order: 4
description: "Respect blockers, locks and the result of each attempted removal."
---

## A native arrow attempt

```ts
import {makeArrows,newArrowGame,hintArrow,tapArrow,arrowsLeft} from "@johnmorrisdotca/meikyuu";
const board = makeArrows({shape:"square",w:5,h:5,longest:3,seed:42});
const game = newArrowGame(board);
const id = hintArrow(game);
if(id!==null){const next = tapArrow(game,id);console.log(next.result,arrowsLeft(next.game));}
```

Arrows leave along their rays. Other present arrows can block them, and locked arrows also need unlocking. `tapArrow` returns both the new game and removed/blocked/locked/ignored status; use that result rather than decrementing a host counter yourself. Wrong attempts can consume hearts; undo/restart follow the native state rules.

## Two layers in a mixed puzzle

A mixed recipe carries its maze and arrow recipes. The maze's button unlocks the associated arrow layer; `withMaze`/`withArrows` update the matching native states. `mixedSolved` checks the combined completion. The mounted player provides both tabs and keeps actions on the correct layer. A displayed hint is assistance, not a proof that the host actually made a legal move. See [PLAYING.md](../PLAYING.md), [hintArrow](api:hintArrow) and [mixedSolved](api:mixedSolved).
