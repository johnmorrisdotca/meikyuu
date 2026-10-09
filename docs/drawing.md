# Drawing

```ts no-check
import { drawMaze, drawArrows, MEIKYUU_STYLE } from "@johnmorrisdotca/meikyuu/draw";

const svg = drawMaze(maze, { path: solutionOf(maze).slice(0, 20), hint: { cells: [] }, board: "wood", trail: "blue", standalone: true });
```

`drawMaze` returns SVG text: put it in a page, a file or an image. One unit in the drawing is one cell. The walls are one path and the line another; the start,
the goal or the doors, and the keys are marks. Colours are generic: it knows nothing of any site.

| Option | Values | What it does |
| --- | --- | --- |
| `path` | cells | the line drawn so far, from the start |
| `collected` | cells | the keys picked up, drawn faint |
| `solution` | boolean | draw the one way from the start to the goal |
| `hint` | `{ back?, cells }` | cells to light as a hint |
| `won` | boolean | the line wears the colour of a win, and `data-won="true"` |
| `board` | `paper` (default), `wood`, `green`, `blue`, `red`, `black`, or a `MeikyuuBoardLook` | the paper, the walls and the frame; `paper` takes its colours from the page's light or dark |
| `trail` | `green` (default), `blue`, `red`, `violet`, `orange`, or any CSS colour | the line's colour |
| `wall`, `line` | cells | how thick a wall and the line are; defaults 0.12 and 0.34 |
| `language` | `en` (default), `ja` | what a screen reader hears |
| `label`, `standalone`, `pad` | | a description instead of the default; `standalone` puts the style inside, so the drawing is a picture on its own; the margin round the shape |

Every colour is also a custom property on `.meikyuu` (`--mk-paper`, `--mk-wall`, `--mk-frame`, `--mk-trail`, `--mk-start`, `--mk-goal`, `--mk-key`, `--mk-hint`, `--mk-bad`, `--mk-stone`, `--mk-stone-edge`), so a page sets only what it wants different.
The parts carry classes and data attributes: `mk-walls`, `mk-trail`, `mk-head`, `mk-start`, `mk-goal`, `mk-door` (`data-door="in"` or `"out"`), `mk-key` (`data-got`), `mk-hint`. Nothing in the drawing can be selected,
dragged or double-tapped into a selection, and with reduced motion asked for nothing moves. `drawArrows(board, { present, unlocked, hint })` draws an arrow board the same way, each arrow a group with `data-id`, `data-dir` and `data-locked`.

