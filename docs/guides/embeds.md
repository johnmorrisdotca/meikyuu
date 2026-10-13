---
title: "Draw and embed a native board"
section: how-to
order: 6
description: "Use SVG for an image or a native mount for controls and cleanup."
---

## SVG without a player

```ts
import {buildMaze} from "@johnmorrisdotca/meikyuu";
import {drawMaze} from "@johnmorrisdotca/meikyuu/draw";
const maze = buildMaze({shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42});
console.log(drawMaze(maze,{label:"Sample maze",board:"paper"}).startsWith("<svg"));
```

Drawing returns SVG text; mounting supplies input, pan/zoom, hints and synthesized sound. Destroy the mounted handle when removing its host.

```ts no-run
import {mountMeikyuu} from "@johnmorrisdotca/meikyuu/play";
const host = document.createElement("div");document.body.append(host);
const board = mountMeikyuu(host,{kind:"maze",level:1,hints:true});
console.log(board?.kind());board?.destroy();
```

## The native element and frame

Import `/element/define` for `<meikyuu-board kind="maze" level="12" size="medium"></meikyuu-board>`. The [builder](https://johnmorrisdotca.github.io/meikyuu/builder.html) previews maze/arrows/mixed settings and copies element, iframe, module and framework code. Display size, theme, width and spoken label do not change the recipe. Recipe takes precedence over daily selection; today resolves at mount time without a rollover timer.

Events bubble across shadow roots and frames forward JSON-safe detail. Check origin and sending window. [The complete contract](../embeds.md) preserves callable fit/view controls, reflected properties, host-only drawing choices and privacy. Both native pages have language-aware Docs links.
