# Playing it in a page: the board, its options and its events

Everything `mountMeikyuu` and `<meikyuu-board>` take and say. Moved here from [the README](../README.md) to keep it under the length npm shows.

## Playing it in a page

```ts
import { mountMeikyuu } from "@johnmorrisdotca/meikyuu/play";

const board = mountMeikyuu(document.getElementById("here")!, { kind: "maze", level: 40, tap: true, sound: false });
board?.host.addEventListener("meikyuu-solve", (event) => console.log((event as CustomEvent).detail));
board?.load({ kind: "arrows", level: 5 });   // another puzzle in the same box
```

- **Drawing a path.** Press the start (or the end of the line) and drag. The line follows the corridors and snaps to cells; a wall stops it and drawing back shortens it. A fast drag that skips cells is followed through each cell it crosses. With `tap`, a tap on the maze runs the line along the corridor toward the tapped cell as far as the next fork, and never decides a fork for you.
- **Zoom and pan.** Pinch or the wheel zooms about the fingers or the cursor, two fingers move the view, and so does a drag that starts anywhere but on the start or the end of the line. The Fit button brings the whole maze back, and the zoom pad has + and −. A line drawn near an edge of the box moves the view along with it. A big maze stays smooth on a phone: its walls are cut into tiles that are in the page only while they are on screen.
- **Buttons.** Undo takes back the last stroke, Restart clears the line, and Hint lights the next stretch of the right way (and, if the line has gone into a wrong branch, how far to draw back). The arrow keys step the line, Backspace and Ctrl+Z undo.
- **Solved.** The line takes the colour of a win, a banner comes in and `meikyuu-solve` is fired once. With `prefers-reduced-motion` nothing moves.
- **Arrows.** Tap an arrow. A free one slides away along its line, a blocked one shakes and shows what is in its way and costs a heart, a locked one tells you where its button is and costs nothing, and so does one that nothing can free until the unlock (a locked arrow is in its way, or in the way of what is). Three hearts. A mixed puzzle has two tabs, the arrows and the labyrinth; what has just happened is said on the tab it happened on, and a puzzle out of hearts says so on both until the arrows are restarted (a restart keeps the unlock).
- **Events**, on the host and as callbacks: `meikyuu-move` (after each stroke or each arrow tapped), `meikyuu-solve` (once), `meikyuu-key`, `meikyuu-unlock`, `meikyuu-bump`, `meikyuu-lose`, and `meikyuu-stones` (a stone laid, taken up, cleared, undone or restored). Each carries `{ kind, level, moves, cells, keys, keysOf, hearts, arrowsLeft, solved, stones, stonesLeft }`.
- **Words** in English and Japanese, following the page's `lang`.
- **A steady box.** The board is one shape (a square, or the `ratio` asked for) whatever is in it, and nothing on the play surface can be selected. The lines of words under it keep the room their longest wording takes, so nothing moves as they change.
- **Sounds**, off unless `sound` is on: short tones made in the browser by the Web Audio API for a step, drawing back, a key, a bump, an arrow flying, an unlock, a win and a loss. There are no recordings, so there is nothing to fetch and nothing to credit.

| Option | Values | What it does |
| --- | --- | --- |
| `kind`, `level` | `maze`, `arrows` or `mixed`; a number from 1 | a level of the package's own lists |
| `recipe` | a code or an object | a puzzle of your own instead of a level |
| `board`, `trail`, `wall`, `line` | as in drawing | how it looks |
| `tap` | boolean, default false | a tap runs the line to the next fork |
| `hints` | boolean, default true | offer the Hint button |
| `controls` | boolean, default true | the buttons and the lines of words under the board |
| `zoom` | boolean, default true | the zoom pad (the wheel and the pinch always work) |
| `ratio` | `square` (default), `maze`, or width over height such as `2 / 3` | the shape of the box, as the maze was made; `level.ratio` for the tall levels |
| `orientation` | `auto` (default), `portrait`, `landscape` | which way up the maze is shown |
| `gutter`, `reserve` | pixels, default 24 and 200 | the page left beside the box; what else the window holds |
| `fit` | `both` (default), `width`, `height` | what Fit shows |
| `edgePan` | boolean, default true | a line drawn to the edge moves the view along |
| `pan` | boolean, default false | every one-finger drag moves the view |
| `turnButton` | boolean, default false | a Turn button in the pad, for a maze that is not square |
| `stones` | `true`, or `{ limit?, reach? }`; default off | stones to lay beside the line (see Stones); adds the Stone button |
| `sound` | boolean, default false | make a sound for each thing that happens |
| `language` | `en`, `ja` | the language; left out, the host's own `lang`, or the page's |
| `onMove`, `onSolve`, `onKey`, `onUnlock`, `onBump`, `onLose`, `onStones` | callbacks | what the events tell, as callbacks |

The handle: `load`, `set`, `undo`, `restart`, `hint`, `fit(mode?)`, `zoomIn`, `zoomOut`, `gutter(px?)`, `pan(on?)`, `edgePan(on?)`, `orientation(setting?)`, `show("arrows" | "maze")`, `mazeGame()`, `arrowGame()`, `stoneMode(on?)`, `stones()`, `stonesLeft()`, `stone(cell)`, `clearStones()`, `run()`, `restore(code)`, `destroy()`.

### The element

```html
<meikyuu-board level="40"></meikyuu-board>
<meikyuu-board kind="arrows" level="5" board="wood"></meikyuu-board>
<meikyuu-board recipe="heart:25:wilson:to-goal:5" tap></meikyuu-board>
```

Attributes, each read again when it changes: `kind` and `level`, or `recipe`; `board`, `trail`; `tap`; `hints` (`off` for no Hint button); `sound`; `controls` (`off` for only the board); `zoom` (`off` for no pad); `lang`; `ratio`, `orientation`, `gutter`, `reserve`, `fit`, `pan`, `edge-pan` (`off`), `turn-button`, `stones`, `stone-limit`, `stone-reach`.
Methods: `undo()`, `restart()`, `hint()`, `fit()`; `.mount` is the handle. `@johnmorrisdotca/meikyuu/element/define` defines the tag; `/element` holds the class alone.
