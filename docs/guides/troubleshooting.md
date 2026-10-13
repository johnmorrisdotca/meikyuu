---
title: "Troubleshooting and FAQ"
section: troubleshooting
order: 9
description: "Interpret missing levels, invalid recipes and refused native actions."
---

## Null and empty collections

Recipe parsers return `null` for invalid native text. A numbered-level lookup returns `null` when that collection has no such number; a collection/filter returns an empty list when nothing matches. Choose the correct `/3d/levels`, `/dice` or `/shapes` entry. Tall size is 1–6, not its width. `mountMeikyuu`/`mountSolid` return `null` for invalid setup; inspect it before using the handle.

## Paths, arrows and stones

A goal-mode maze can have no boundary door: check entrance/exit before passing them to drawing helpers. `headOf` is `null` before a line; `decodeRun`, `lineToSteps` and `stepsToLine` reject incompatible paths. `hintArrow` is `null` if no unlocked arrow can be removed. `peelRounds` can be `null` for a cycle. Native stone verdicts explain disabled, drawing, endpoint, distance and limit refusals; unlimited stones produce `stonesLeft:null`.

A surface edge-turn returning `null` means no rotation is needed. Sounds can stay silent until a user gesture or when audio is unavailable. Destroy removed mounts and register the native tag through `/element/define`. Keep recipes, kind, collection and version alongside saved text. See [progress](progress.md), [levels](levels.md) and [the preserved embed contract](../embeds.md).
