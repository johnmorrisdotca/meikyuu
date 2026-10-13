---
title: "Read flat, tall and surface levels"
section: how-to
order: 3
description: "Use one-based numbers inside the right collection and pin versions."
---

## Read metadata without building every maze

```ts
import {levelOf,mazeLevelsOfSize} from "@johnmorrisdotca/meikyuu/levels";
import {tallLevelOf,tallLevelsOfSize} from "@johnmorrisdotca/meikyuu/levels/tall";
const level = levelOf("maze",1)!;
const tall = tallLevelOf(1)!;
console.log(level.code,mazeLevelsOfSize("small").length,tall.width,tallLevelsOfSize(tall.size).length);
```

Level numbers start at 1; array positions start at 0. Flat maze sizes have names, while tall sizes are indices 1–6 and have a separate width field. Colossal square/tall lists are independent collections. Empty filters or unsupported sizes can produce empty arrays; missing numbered levels return `null`.

## Import the surface collection you need

`/3d/levels` has the first solids; `/dice` and `/shapes` have additional collections; `/all` combines them. The same finder names operate only on that entry's data. A shape absent from an entry has an empty list. `/3d/levels/recipes` is the lighter recipe-only reader for a host that does not need score/effort metadata.

Keep the recipe code with saved solves. Major releases 2 and 3 changed numbering; a number alone needs the exact list/version. Maze collections now use geometry-aware score order, while arrows/mixed retain native effort order. See [LEVELS.md](../LEVELS.md) and [migration](upgrading.md).
