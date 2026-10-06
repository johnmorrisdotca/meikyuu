# Colossal mazes, stones and tall mazes

The mazes of ten thousand cells, the stones a player lays beside the line, and the tall mazes for a phone held upright. Moved here from [the README](../README.md) to keep it under the length npm shows.

## Colossal mazes

The biggest the lists go: about **ten thousand cells**, where the biggest of the other lists has 8,923 and most have far fewer. There are two lists of 128 levels, in an entry of their own so a page that does not play them does not carry them:

```ts
import { MEIKYUU_COLOSSAL_LEVELS, MEIKYUU_COLOSSAL_TALL_LEVELS, colossalLevelOf } from "@johnmorrisdotca/meikyuu/levels/colossal";
import { mountMeikyuu } from "@johnmorrisdotca/meikyuu/play";

const level = colossalLevelOf(40)!;                       // level 40 of the 128 square colossal mazes, about 10,000 cells
mountMeikyuu(host, { recipe: level.code, ratio: level.ratio });
const tall = MEIKYUU_COLOSSAL_TALL_LEVELS[0]!;            // 64 across and 96 down for a square one, 2:3, for a phone held upright
mountMeikyuu(host, { recipe: tall.code, ratio: tall.ratio });
```

- **The square list** is 9,500 to 12,000 cells in every shape (`square` is a hundred across or so) and every way to play; **the tall list** is `square` 64×96, and hexagons and triangles laid out to fill the same 2:3 container (`tallDimensions`), about 6,100 cells. Each list is in order of the effort its levels measure, as every list is, and scored by the same `difficultyOf`. The scale is the one the older lists use, so a colossal maze scores high (most 84 to 98) and a colossal level is harder than every huge one at the top.
- **The list is recipes, not mazes.** 256 recipes are 20 KB. A maze is built from its seed where it is played, about 20 to 30 ms in a browser for ten thousand cells (`buildMaze`), so nothing is generated ahead and nothing is stored: a list that held the mazes would be megabytes.
- **Drawn and played as any other.** Only the walls on screen are in the page (tiles of a few cells), a line is one path, and nothing else is drawn per cell, so a line of thousands of cells stays smooth: see `docs/LEVELS.md` for the frame cost measured on a phone-sized Chromium.
- Made by `node --experimental-strip-types scripts/meikyuu-colossal.ts` (about six minutes), seeded, into `src/levels/colossal.data.ts`.

## Stones

A big maze is hard to hold in the head. A **stone** is a marble the player lays on a passage cell to say that the line will not go there: a dead end found, shut. It is deliberately not a pen. A stone may only be laid

- **beside the line**: on an open passage cell joined by passages to a cell of the line within `reach` steps (1 or 2, default 2: next to the line, or one cell beyond that), not counting a way through another stone, so never across a wall and never out in the middle of the maze;
- **on a cell the line is not on**, and not on the start or the goal;
- **while stones are left**: `limit` stones may lie at once (`stoneLimitFor(cells)` by default: 4 for a small maze, 9 for a huge one, 13 for a colossal one; `limit: null` for no limit); and not once the maze is solved.

The line cannot enter a stone's cell, and a stone is taken up by asking for it again (which gives it back). Stones belong to the game: **Undo** takes a laid stone up and puts a taken one back, **Restart** takes every stone up, `mount.run()` and `mount.restore(code)` (or `encodeRun` / `decodeRun`) keep a run with its stones as one short text, and a stone is never part of the maze, its recipe, its answer or any check (the maze is solved by the same line whatever stones lie).

```ts
const board = mountMeikyuu(host, { level: 40, stones: { limit: 5, reach: 2 } });   // or `stones: true` for the defaults, `limit: null` for no limit
board?.stoneMode(true);        // a tap on a cell lays a stone (or takes the one there up), and nothing draws
board?.stones();               // the cells with a stone
board?.stonesLeft();           // 3, or null with no limit
board?.clearStones();          // one Undo puts them back
const saved = board?.run();    // "0231~1a.2f": the line's steps, a tilde, the stones' cells in base 36
board?.restore(saved!);        // the same line and stones, with one Undo that takes them all back
host.addEventListener("meikyuu-stones", (event) => console.log((event as CustomEvent).detail.stonesLeft));
```

Three ways to lay one, none of which needs the button: **the Stone mode** (the board's own Stone button, or `mount.stoneMode(true)` from a button of your own: while it is on a one-finger drag only moves the view and a tap lays or takes up a stone), **press and hold** (a finger or the mouse held still on a cell for about half a second lays a stone there, or takes up the one there, whatever the mode; a hold on the line itself is a pause, and does nothing), and **Shift and an arrow key** beside the end of the line. A refusal says why in the board's words (`stoneFar`, `stoneOnLine`, `stoneLimit`, ...) and a hold with no line to lay beside says nothing. The marble is drawn as `.mk-stone` with a `.mk-gleam` (`--mk-stone`, `--mk-stone-edge`; `drawMaze` takes `stones`), and the element has `stones`, `stone-limit` (a number or `none`) and `stone-reach`.

## Tall mazes, turning and touch

A phone held upright leaves a box about two thirds as wide as it is tall (a 390 by 844 phone, less the page's header and the board's buttons, leaves about 342 by 560 with a gutter each side), so the tall levels are **2:3**, width to height. A 1:2 tower fits the same phone at 82% of the width, and a 1:1 square at 100% but 50% fewer cells at the same cell size; `docs/LEVELS.md` has the table for five phones. Squares are 6×9 up to 20×30; hexagons and triangles are laid out to fill the same container.

```ts
import { MEIKYUU_TALL_LEVELS, tallLevelOfSize } from "@johnmorrisdotca/meikyuu/levels/tall";
import { mountMeikyuu } from "@johnmorrisdotca/meikyuu/play";

const level = tallLevelOfSize(4, 40)!;                               // level 40 of the 256 12×18 mazes
const board = mountMeikyuu(host, { recipe: level.code, ratio: level.ratio });   // orientation: "auto" is the default
board?.orientation("landscape");                                      // or "portrait", or "auto"
```

<p align="center"><img src="docs/tall-phone.jpg" alt="A tall maze on a 390 by 844 phone with a line drawn most of the way down it, the board a little narrower than the page" width="230"> <img src="docs/tall-gutters.jpg" alt="The same maze after Zoom out has widened the gutters: the board is narrower and more of the page shows on each side" width="230"> <img src="docs/tall-desktop.jpg" alt="The same maze lying down on a 1440 by 900 desktop, a quarter turn counter-clockwise" width="400"></p>

- **Turning is presentation only.** `orientation` is `portrait`, `landscape` or `auto` (the default: lay a tall maze down when the host's width and the window's height fit it bigger that way, so a phone upright keeps it upright, a phone on its side or a desk lies it down, and a square room or a square maze is left alone). The picture is turned a quarter counter-clockwise (the maze's top ends up on the left); the maze, its cells and the line are as they were made, and every point a finger gives is carried back into the maze before the game hears of it. A line stored as its steps (`lineToSteps`, `stepsToLine`) is the same line on a board turned either way, so a level can be started on a phone and finished on a desk. `drawMaze` takes `orientation` too; `mount.orientation()` says what it came to, and `meikyuu-orientation` fires when the window changes it. The host adds a choice with `mount.orientation(setting)`, or the pad's Turn button (`turnButton`).
- **There is always page beside the board** to scroll by. The box is never wider than the window less `gutter` each side (24 px), and never taller than the window less `reserve` (200 px; not under 60% of it). Only the box asks the browser to keep touches (`touch-action: none`); the host has `pan-y pinch-zoom`, so a swipe anywhere else scrolls the page, and a finger drawing never does.
- **Zoom out as far as the page lets you.** Zoom out (the pad's − or two fingers coming together) first shrinks the maze to a little past the fit, and then widens the gutters a step at a time, to 72 px each side; Zoom in (or fingers apart) brings the gutters in first. `mount.gutter(px)` sets it, and Fit puts it back.
- **Fit** is the whole maze (`both`, default), or its `width` or `height` (`fit` option, `mount.fit(mode)`), from the top or left where the maze is bigger than the box.
- **One finger draws, two move the view.** Two fingers pan and pinch a zoomed maze; one finger pressed away from the end of the line moves the view as a hand moves a map; the Move button (`mount.pan(true)`, `pan` option) makes every one-finger drag move the view, for a mouse or a finger that cannot find the line's end.
- **A line drawn to the edge moves the view along**, gently (nothing 44 px from the edge, rising to a few pixels a frame at the edge itself); `edgePan: false` (`mount.edgePan(false)`, `edge-pan="off"`) turns it off.
