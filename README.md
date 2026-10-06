<h1 align="center">Meikyuu <sub>迷宮</sub></h1>

<p align="center"><strong>A maze game for JavaScript and TypeScript.</strong><br>
Draw a line through over a thousand mazes, and as many tall ones for a phone held upright, with a finger or the mouse: squares, hexagons, triangles, circles and shapes cut out of them (a heart, a leaf, a star), from a few cells to thousands, and mazes over the whole surface of dice and shapes (a cube, a d12, a globe, a torus, a star, a heart) that you turn to follow your line round, each level a short recipe that rebuilds the same maze in every browser. Seven algorithms, a difficulty measure, a score for how hard each is to play, lists that never get easier, zoom and pan, and arrow puzzles too. The maze drawn as SVG and played in any page with one call or one tag. No dependencies.</p>

<p align="center">
  <a href="https://github.com/johnmorrisdotca/meikyuu/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/johnmorrisdotca/meikyuu/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://www.npmjs.com/package/@johnmorrisdotca/meikyuu"><img alt="npm" src="https://img.shields.io/npm/v/@johnmorrisdotca/meikyuu?color=2f5d4a"></a>
  <a href="./LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/licence-MIT-2f5d4a"></a>
  <img alt="No dependencies" src="https://img.shields.io/badge/dependencies-0-2f5d4a">
  <img alt="TypeScript" src="https://img.shields.io/badge/types-TypeScript-3178c6">
</p>

<p align="center"><a href="https://johnmorrisdotca.github.io/meikyuu/"><strong>Play a level →</strong></a> · <a href="https://johnmorrisdotca.github.io/meikyuu/api.html">API reference</a> · <a href="docs/LEVELS.md">The levels</a></p>

<table align="center">
<tr>
<td align="center" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/hero-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/hero-desk-light.webp" alt="A heart-shaped maze of 602 cells on a desk, under the demo's header with its language chooser and cloth swatches and its choosers by shape, size and way to play: the maze on green felt with a green line drawn from its entrance a good part of the way, and the Undo, Restart and Hint buttons under it." width="720">
</picture>
<br><em>Level 397, a heart-shaped maze, part of the way drawn, on a desk.</em>
</td>
<td align="center" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/hero-phone-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/hero-phone-light.webp" alt="A huge square maze on a phone, in Japanese: zoomed in to a few dozen cells across, with a green line drawn out from the middle of it, and under the board the Undo, Restart and Hint buttons and the zoom pad." width="220">
</picture>
<br><em>A huge maze on a phone, zoomed in, in Japanese, in the device's light or dark.</em>
</td>
</tr>
</table>

Meikyuu is a maze you draw through. Press the start and drag: the line follows the corridors, snaps to cells,
cannot pass a wall, and drawing back shortens it. The levels run from a three-by-three that takes a moment to
mazes of thousands of cells that take a good while, zoomed with a pinch or the wheel and moved with two fingers.
It is a package for making, drawing and playing mazes of any shape, and the game built from it, which is in
[the demo](https://johnmorrisdotca.github.io/meikyuu/) with nothing to install.

## In 30 seconds

```sh
npm install @johnmorrisdotca/meikyuu
```

```ts
import { buildMaze, measureMaze, newMazeGame, playSolution, solutionOf } from "@johnmorrisdotca/meikyuu";
import { MEIKYUU_MAZE_LEVELS } from "@johnmorrisdotca/meikyuu/levels";

const level = MEIKYUU_MAZE_LEVELS[11];        // level 12: a recipe, "square:4x4:…", never a drawing
const maze = buildMaze(level.recipe);          // the same maze in every browser and every Node
measureMaze(maze).effort;                      // about how many cells a person draws to solve it
solutionOf(maze);                              // the one way from the start to the goal, cell by cell
playSolution(newMazeGame(maze)).solved;        // true: the game's own rules, a cell at a time
```

And in a page, a level to play, by touch and mouse, with nothing else to set up:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/meikyuu@3/dist/element-define.js"></script>
<meikyuu-board level="40" board="wood" tap></meikyuu-board>
```

## Who it is for

- **Game and puzzle sites** that want a maze game with the rules already right: levels everybody plays alike,
  in order of difficulty, a line a finger can draw, zoom for the big ones, and its words in English and Japanese.
- **Anyone making mazes**, who wants one generator that runs over any cell graph, seven algorithms to choose a texture from,
  shapes cut out of a grid, and a measure of how hard what came out is.
- **Pages that just want a picture**: a maze, with its line and its solution, drawn as SVG text with no page needed.

## Features

- **A thousand mazes, then arrow puzzles and mixed ones.** 1,024 maze levels, 300 arrow levels and 100 mixed levels: four sizes of 256 mazes, each size in the order of its score, 0 to 100, for how hard it is to play, which counts how much of the map the answer covers.
- **Tall mazes for a phone held upright.** 1,536 portrait levels, in six sizes of 256 (6×9 to 20×30 cells), that lie down by themselves on a wide screen (`orientation`) without changing the maze or its line.
- **Colossal mazes.** Two more lists, in an entry of their own (`/levels/colossal`): 128 square mazes of about ten thousand cells (a hundred across or so, every shape) and 128 tall ones 64 across and 96 down, each a recipe that builds in about twenty milliseconds, drawn and played with the same zoom, gutters and panning as any other.
- **Mazes over a solid.** A perfect maze over the whole surface of a die (a d3 to a d30: the cube, the dodecahedron, the ten-sided trapezohedron, the icosahedron and more) or a shape (a globe, a box, a cross of cubes, a ring, a torus, a star, a heart): 18 solids, 5,760 levels in five sizes to a solid, up to four thousand cells (`/3d`, `/3d/play`, `/3d/levels`), drawn in 3D on a canvas, turned by dragging, by arrows and by two fingers, with the line crossing from face to face over the edges and the solid turning by itself to keep the end of the line in view. The answer is a list of cells, the same however the solid is turned.
- **Stones.** A marble (`stones` option) laid beside the line on a passage the player has given up on, which the line cannot enter: a helper for the big mazes, never a pen. Laid within `reach` cells of the line (2 by default), as many as `limit` allows, by the Stone button, by pressing and holding, or by Shift and an arrow key. Part of Undo, Restart and a saved run, never of the maze or its answer.
- **Made for a thumb.** Always some page beside the board to scroll by, touches kept only by the board, a pinch to zoom, two fingers to move a zoomed maze, and the view following a line drawn to the edge.
- **Every shape.** Squares, hexagons, triangles and circles, and shapes cut out of them (a heart, a leaf, a star, a ring, a diamond, a cross, a moon), from a few cells to thousands.
- **Four ways to play**: in and out through the wall, find the goal, out from the centre, and collect the keys on the way.
- **Seven algorithms** with a texture each, one generator over any cell graph, and a measure of how hard what came out is.
- **A level is a recipe**, a short string that rebuilds the same maze in every browser and every Node, for ever. Never a drawing.
- **Drawn as SVG text**, in an entry of its own: six boards and five line colours, with the maze, the line, a hint and the solution.
- **Played by drawing a line** with a finger or the mouse: it follows the corridors, cannot pass a wall, and drawing back shortens it. Zoom and pan for the big ones, a hint, undo, and keys on the keyboard, as one function call (`mountMeikyuu`) or one tag (`<meikyuu-board>`).
- **Optional sounds**, made in the browser by the Web Audio API: no recordings, so nothing to fetch and nothing to credit.
- **Reduced motion respected**, and nothing the player touches can be selected.
- **English and Japanese** in the board's words, the shapes' names and the demo.
- **No dependencies**, no network requests, and nothing stored outside the page it is in.

### What's in it

Each picture is a board the package draws, taken from [the demo](https://johnmorrisdotca.github.io/meikyuu/) with `pnpm screenshots:readme`, in light and dark. The levels are named by what they are and their lines are drawn along their own way, so the same pictures come again. Squares, circles, the other cut-out shapes, the colossal mazes and the stones are in [the pages for them](docs/MORE-MAZES.md).

<table>
<tr>
<td align="center" valign="top" width="33%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/hexagons-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/hexagons-desk-light.webp" alt="A maze of hexagonal cells, six neighbours each, drawn in black walls on pale paper with a green line part way through it." width="300">
</picture>
<br><em><strong>Hexagons</strong>: six ways out of every cell.</em>
</td>
<td align="center" valign="top" width="33%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/triangles-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/triangles-desk-light.webp" alt="A maze of triangular cells pointing up and down in turn, three neighbours each, with a green line part way through." width="300">
</picture>
<br><em><strong>Triangles</strong>: three ways out of every cell.</em>
</td>
<td align="center" valign="top" width="33%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/circle-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/circle-desk-light.webp" alt="A circular maze of rings round a middle cell, each ring with more cells than the one inside it, and a green line drawn part way." width="300">
</picture>
<br><em><strong>Circles</strong>: rings round a middle cell.</em>
</td>
</tr>
<tr>
<td align="center" valign="top" width="33%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/leaf-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/leaf-desk-light.webp" alt="A maze cut out in the outline of a leaf, square cells inside it, with a green line drawn part way." width="300">
</picture>
<br><em><strong>Shapes cut out</strong>: a heart, a leaf, a star, a ring, a diamond, a cross, a moon.</em>
</td>
<td align="center" valign="top" width="33%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/keys-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/keys-desk-light.webp" alt="A maze in which the player must pick up a key on the way to the door: a rectangular maze with a small gold key in a side branch and the green line part way." width="300">
</picture>
<br><em><strong>Keys</strong>: every key costs a detour.</em>
</td>
<td align="center" valign="top" width="33%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/arrows-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/arrows-desk-light.webp" alt="An arrow puzzle: a picture made of arrow paths on a pale board, each arrow ready to be tapped and to slide off the way its head points." width="300">
</picture>
<br><em><strong>Arrow puzzles</strong>: tap an arrow; clear them all.</em>
</td>
</tr>
<tr>
<td align="center" valign="top" width="33%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/mixed-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/mixed-desk-light.webp" alt="A mixed puzzle: an arrow puzzle with some arrows locked, and a small labyrinth beside it with the unlock button hidden deep inside." width="300">
</picture>
<br><em><strong>Mixed</strong>: an arrow puzzle, and a labyrinth that frees its locked arrows.</em>
</td>
<td align="center" valign="top" width="33%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/tall-phone-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/tall-phone-light.webp" alt="A tall maze on a phone, taller than wide, with a line drawn part way down it, the board a little narrower than the page so that the page can be scrolled beside it." width="220">
</picture>
<br><em><strong>Tall mazes</strong>, for a phone held upright.</em>
</td>
<td align="center" valign="top" width="33%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/dodecahedron-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/dodecahedron-desk-light.webp" alt="A maze over a dodecahedron, the twelve-sided die: walls drawn on each pentagonal face cut into five squares, and the start marked by a green disc." width="300">
</picture>
<br><em><strong>A d12</strong>: a maze over the surface of a die, turned by dragging.</em>
</td>
</tr>
<tr>
<td align="center" valign="top" width="33%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/torus-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/torus-desk-light.webp" alt="A maze over a torus, a doughnut: walls drawn round the ring and through its hole, and the start marked by a green disc." width="300">
</picture>
<br><em><strong>A torus</strong>: a doughnut, whose far side shows through.</em>
</td>
<td align="center" valign="top" width="33%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/heart-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/meikyuu/main/docs/images/heart-desk-light.webp" alt="A maze over a heart, a rounded solid with a cleft at the top, with walls drawn over its surface and the start marked by a green disc." width="300">
</picture>
<br><em><strong>A heart</strong>, a star, a cross, a ring and a box too.</em>
</td>
</tr>
</table>

## Use it in your project

### Install

```sh
npm install @johnmorrisdotca/meikyuu
```

```sh
pnpm add @johnmorrisdotca/meikyuu
```

```sh
yarn add @johnmorrisdotca/meikyuu
```

A page with no bundler loads the board as a tag from a CDN, naming the major version so that a release that changes what you use is one you choose:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/meikyuu@3/dist/element-define.js"></script>
```

Entry points, so a page loads only what it uses:

| Entry | What is in it |
| --- | --- |
| `@johnmorrisdotca/meikyuu` | The rules and the making, no page needed: grids, algorithms, mazes, the measure, the game, arrows, mixed puzzles, recipe codes |
| `@johnmorrisdotca/meikyuu/draw` | A maze or an arrow board as SVG text, the boards and line colours, the style, the words in English and Japanese |
| `@johnmorrisdotca/meikyuu/play` | `mountMeikyuu`, the style of a playable board, the sounds, the arithmetic of zoom and pan |
| `@johnmorrisdotca/meikyuu/element` | The `<meikyuu-board>` class |
| `@johnmorrisdotca/meikyuu/element/define` | Defines the tag on the page, for its effect |
| `@johnmorrisdotca/meikyuu/levels` | The three numbered lists of levels, and finding a level |
| `@johnmorrisdotca/meikyuu/levels/tall` | The 1,536 tall (portrait) maze levels, in six sizes |
| `@johnmorrisdotca/meikyuu/levels/colossal` | The 256 colossal maze levels (about ten thousand cells): 128 square and 128 tall |
| `@johnmorrisdotca/meikyuu/levels/legacy` | The 1,000 maze levels of 1.0.0, and where each went |
| `@johnmorrisdotca/meikyuu/3d` | Mazes over the surface of a solid, no page needed: the graph of a cube, a globe or a solid of triangles, the maze on it, how hard it is, where a turned solid lands on a picture and which cell a point is on, the checker, a still as SVG |
| `@johnmorrisdotca/meikyuu/3d/play` | `mountSolid`: a solid to turn and draw on in any element, with its buttons, words and events |
| `@johnmorrisdotca/meikyuu/3d/levels` | The levels of the first five solids (cube, globe, tetrahedron, octahedron, icosahedron): 64 for each of five sizes |
| `@johnmorrisdotca/meikyuu/3d/levels/dice` | The levels of the seven further dice: the prism (d3), d10, two d12, d16, d24 and d30 |
| `@johnmorrisdotca/meikyuu/3d/levels/shapes` | The levels of the six shapes: a box, a cross, a ring, a torus, a star and a heart |
| `@johnmorrisdotca/meikyuu/3d/levels/all` | Every solid's levels, 5,760 of them, in one file (a page showing one solid loads that solid's) |
| `@johnmorrisdotca/meikyuu/3d/levels/recipes` | The recipe of each of the 5,760 solid levels and nothing else, 50 KB, for a server to say which is which |

```ts
import { buildMaze, carveMaze, gridOf, MEIKYUU_SHAPES } from "@johnmorrisdotca/meikyuu";

const maze = buildMaze({ shape: "hexagon", w: 6, h: 6, algorithm: "kruskal", mode: "centre-out", seed: 3 });
maze.grid.cells;                 // 127
maze.links[maze.start];          // the cells the start is joined to
maze.exit;                       // { cell, side }: the door in the outer wall
```

`gridOf(shape, w, h)` is a cell graph (`Grid`): each cell's `neighbours`, its `sides` (the wall across each) and `at(x, y)` for the cell at a point. A shape of your own is a function that makes one;
`carveMaze(grid, algorithm, random)` then makes a perfect maze on it. `isPerfect` checks one.

### The game as functions

A line drawn through a maze is a game, and every move is a pure function that returns a new game (or the same one when nothing changed), so a server, a page and a test play by the same rules:

```ts no-check
import { newMazeGame, pressMaze, dragMaze, liftMaze, undoMaze, tapMaze, hintMaze } from "@johnmorrisdotca/meikyuu";

let game = newMazeGame(maze);
game = pressMaze(game, maze.start);   // a finger down on the start begins a stroke
game = dragMaze(game, nextCell);      // into each cell it enters: a wall, or a cell not next to the line, is ignored
game = liftMaze(game);                // the stroke is over, and Undo takes it back
hintMaze(game).cells;                 // the next stretch of the right way, and how many cells to draw back first
```

A cell the line is on again cuts the line back to it, so a line never crosses itself. Arrow puzzles are `newArrowGame`, `tapArrow` (`removed`, `blocked`, `locked`), `heldByLocks`, `hintArrow`, `undoArrow`, and mixed ones are `buildMixed` with `withMaze`
unlocking the arrows when the labyrinth's button is reached.

### On a server, in a page and in a framework

A server that wants to trust a level takes a recipe and rebuilds the maze, with no page at all:

```ts no-check
import { buildMaze, parseRecipe, solutionOf } from "@johnmorrisdotca/meikyuu";

const recipe = parseRecipe(codeFromTheBrowser);        // null when it is not a recipe
if (recipe === null) throw new Error("not a maze this site makes");   // also null for a maze past MEIKYUU_MOST_CELLS
const solution = solutionOf(buildMaze(recipe));        // the one way through, cell by cell
```

(A recipe names its own size, so `parseRecipe` refuses one that would lay out more than `MEIKYUU_MOST_CELLS` cells, or ask for more than `MEIKYUU_MOST_KEYS` keys, before anything is built. A server that wants a lower ceiling checks `layoutCells(recipe.shape, recipe.w, recipe.h)` itself.)

One tag, no bundler:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/meikyuu@3/dist/element-define.js"></script>
<meikyuu-board level="40" board="wood"></meikyuu-board>
<script>
  document.querySelector("meikyuu-board").addEventListener("meikyuu-solve", (event) => console.log(event.detail.moves));
</script>
```

With a bundler, `import "@johnmorrisdotca/meikyuu/element/define"` once, in code that runs in the browser, and `<meikyuu-board>` is a tag like any other. The tag draws itself in the page's own DOM, so the page's CSS reaches it. Its attributes are read again when they change, and it speaks through DOM events (`meikyuu-move`, `meikyuu-solve`, `meikyuu-key`, `meikyuu-unlock`, `meikyuu-bump`, `meikyuu-lose`) that carry a `detail`.

```jsx
// React 19
import { useEffect, useRef } from "react";
import "@johnmorrisdotca/meikyuu/element/define";

export function Maze({ level, onSolved }) {
  const board = useRef(null);
  useEffect(() => {
    const listen = (event) => onSolved(event.detail.moves);
    board.current?.addEventListener("meikyuu-solve", listen);
    return () => board.current?.removeEventListener("meikyuu-solve", listen);
  }, [onSolved]);
  return <meikyuu-board ref={board} level={String(level)} board="wood" />;
}
```

```vue
<!-- Vue 3: tell the compiler the tag is not a Vue component -->
<script setup>
import "@johnmorrisdotca/meikyuu/element/define";
defineProps({ level: Number });
</script>
<template>
  <meikyuu-board :level="level" board="wood" @meikyuu-solve="(event) => console.log(event.detail.moves)" />
</template>
<!-- in vite.config: vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith("meikyuu-") } } }) -->
```

```svelte
<!-- Svelte 5 -->
<script>
  import "@johnmorrisdotca/meikyuu/element/define";
  let { level } = $props();
  let board;
  $effect(() => {
    const listen = (event) => console.log(event.detail.moves);
    board.addEventListener("meikyuu-solve", listen);
    return () => board.removeEventListener("meikyuu-solve", listen);
  });
</script>
<meikyuu-board bind:this={board} level={level} board="wood"></meikyuu-board>
```

```ts no-check
// Angular: a standalone component with CUSTOM_ELEMENTS_SCHEMA
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "@johnmorrisdotca/meikyuu/element/define";

@Component({
  selector: "app-maze",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<meikyuu-board level="40" board="wood" (meikyuu-solve)="solved($event)"></meikyuu-board>`,
})
export class Maze {
  solved(event: Event) { console.log((event as CustomEvent).detail.moves); }
}
```

In Next.js or any server-rendering framework, import the define entry from a client component, so the tag is defined in the browser. Or skip the tag and call `mountMeikyuu(element, options)` from `@johnmorrisdotca/meikyuu/play` in an effect: the handle it returns has `destroy()`.

These recipes are written to the tag's documented attributes and events; they are not built from the packed tarball by this repository's tests, which play the tag in a bare page in Chromium and WebKit.

The cookbook, with the output of each example, is under [Examples](#examples).

## Examples

Every TypeScript and JavaScript block that can run is type-checked against the built package and run by `pnpm test:readme`, so the output after `// →` is what the code prints. The mazes are made and checked without a page, so most of these run under Node.

### A page with nothing else

Save this as a file and open it: one script and one tag, and level 40, to draw through by touch or mouse:

```html
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A maze</title>
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/meikyuu@3/dist/element-define.js"></script>
<meikyuu-board level="40" board="wood" tap></meikyuu-board>
```

### A level is a recipe

A level is a short string that rebuilds the same maze in every browser and every Node, for ever: never a drawing. `measureMaze` counts the passages and `solutionOf` finds the one way through:

```ts
import { buildMaze, measureMaze, solutionOf } from "@johnmorrisdotca/meikyuu";
import { MEIKYUU_MAZE_LEVELS } from "@johnmorrisdotca/meikyuu/levels";

const level = MEIKYUU_MAZE_LEVELS[11];                       // level 12
console.log(level.number, level.cells, level.recipe.shape);  // → 12 20 square
const maze = buildMaze(level.recipe);
console.log(maze.grid.cells, solutionOf(maze).length);       // → 20 12
console.log(measureMaze(maze).effort);                       // → 24
```

### Make a maze of your own

The same generator runs over any cell graph. A hexagon of hexagons, made by Kruskal's algorithm, played from the middle out through a door in the outer wall:

```ts
import { buildMaze, isPerfect } from "@johnmorrisdotca/meikyuu";

const maze = buildMaze({ shape: "hexagon", w: 6, h: 6, algorithm: "kruskal", mode: "centre-out", seed: 3 });
console.log(maze.grid.cells, isPerfect(maze.grid, maze.links));   // → 127 true
console.log(maze.exit);                                          // → { cell: 93, side: 3 }
```

### Find a level

Levels are found by what they are. The heart levels where keys are collected on the way, and the level that is 40th of the medium size:

```ts
import { findMazeLevels, levelOf, mazeLevelOfSize } from "@johnmorrisdotca/meikyuu/levels";

console.log(findMazeLevels({ shape: "heart", mode: "keys" }).length);   // → 25
console.log(levelOf("maze", 40)?.code);                                   // → triangle:6x4:wilson:centre-out:103486663
console.log(mazeLevelOfSize("medium", 40)?.number);                       // → 296
```

### Play it as functions

A line drawn through a maze is a game, and every move is a pure function that returns a new game, so a server, a page and a test play by the same rules. Draw the way from the start to the goal, cell by cell, and the game says it is solved:

```ts
import { buildMaze, dragMaze, liftMaze, newMazeGame, pressMaze, solutionOf } from "@johnmorrisdotca/meikyuu";
import { MEIKYUU_MAZE_LEVELS } from "@johnmorrisdotca/meikyuu/levels";

const maze = buildMaze(MEIKYUU_MAZE_LEVELS[11].recipe);
const way = solutionOf(maze);
let game = pressMaze(newMazeGame(maze), way[0]);          // a finger down on the start begins a stroke
for (const cell of way.slice(1)) game = dragMaze(game, cell);
game = liftMaze(game);                                    // the stroke is over
console.log(game.solved, game.path.length);               // → true 12
```

### Ask for a hint

`hintMaze` says the next stretch of the right way, and, if the line has gone into a wrong branch, how far to draw back first:

```ts
import { buildMaze, dragMaze, hintMaze, newMazeGame, pressMaze, solutionOf } from "@johnmorrisdotca/meikyuu";
import { MEIKYUU_MAZE_LEVELS } from "@johnmorrisdotca/meikyuu/levels";

const maze = buildMaze(MEIKYUU_MAZE_LEVELS[11].recipe);
const way = solutionOf(maze);
const game = dragMaze(pressMaze(newMazeGame(maze), way[0]), way[1]);
console.log(hintMaze(game).cells.length > 0);              // → true
```

### Draw a maze as an image

`drawMaze` returns SVG text, with one unit to a cell: put it in a page, a file or an image. The line, a hint and the solution are options:

```ts
import { buildMaze, solutionOf } from "@johnmorrisdotca/meikyuu";
import { drawMaze } from "@johnmorrisdotca/meikyuu/draw";
import { MEIKYUU_MAZE_LEVELS } from "@johnmorrisdotca/meikyuu/levels";

const maze = buildMaze(MEIKYUU_MAZE_LEVELS[11].recipe);
const svg = drawMaze(maze, { path: solutionOf(maze).slice(0, 5), board: "wood", standalone: true });
console.log(svg.startsWith("<svg"), svg.includes("mk-trail"));   // → true true
```

### An arrow puzzle

Tap an arrow and it slides off the board the way its head points, if nothing is in its way; if another arrow is, it bumps and costs a heart. There are 300 of them, each built backwards so that every one can be cleared:

```ts
import { MEIKYUU_ARROW_LEVELS } from "@johnmorrisdotca/meikyuu/levels";

console.log(MEIKYUU_ARROW_LEVELS.length);                  // → 300
console.log(MEIKYUU_ARROW_LEVELS[0].recipe.shape);         // → square
```

### Mount a board, and listen

`mountMeikyuu` is the tag as a function call; it keeps the line, Undo, Restart, Hint and the zoom for you, and says what happens as events:

```ts no-run
import { mountMeikyuu } from "@johnmorrisdotca/meikyuu/play";

const element = document.getElementById("here")!;
const board = mountMeikyuu(element, { kind: "maze", level: 40, tap: true, sound: false });
element.addEventListener("meikyuu-solve", (event) => console.log((event as CustomEvent).detail));
board?.load({ kind: "arrows", level: 5 });        // another puzzle in the same box
board?.hint();
```

### A maze over a cube

A perfect maze over the whole surface of a cube, a globe or a solid of triangles, turned by dragging (see [Mazes over a solid](#mazes-over-a-solid)):

```ts no-run
import { mountSolid } from "@johnmorrisdotca/meikyuu/3d/play";

mountSolid(document.getElementById("here")!, { recipe: "cube:6:prim:48213", tap: true });
```

### A look of your own

Every colour is a CSS variable on `.meikyuu`, and a board, a line colour and a wall width are options (the table is under [Theming](#theming)):

```css
.meikyuu { --mk-paper: #fbf8f1; --mk-trail: #2f7a4f; }
```

## The ways to play

Each is a declared field of a level, never inferred from the shape. A way to play decides where the line starts and ends.

| `mode` | The way it is played |
| --- | --- |
| `enter-leave` | In at one door in the outer wall, out at another, the two as far apart as the maze allows. |
| `to-goal` | From a cell inside the maze to a dot hidden deep in it. |
| `centre-out` | From the middle of the shape out through a door in the outer wall. |
| `keys` | From inside, picking up every key on the way to a door in the outer wall. A key is at the end of a branch, off the way, so each costs a detour. It is picked up by passing over it, and stays picked up when the line is drawn back. |

Beside the mazes there are two more kinds, each with its own list of levels (`MeikyuuKind`: `maze`, `arrows`, `mixed`):

- **Arrow puzzles.** A picture (a heart, a leaf, a star) made of arrow paths. Tap an arrow and it slides off the board the
  way its head points, if nothing is in its way; if another arrow is, it bumps and a heart is lost. Clear every arrow. Every puzzle can be
  cleared: each is built backwards, adding arrows that each have a clear way out at the moment they are added.
- **Mixed puzzles.** An arrow puzzle in which some arrows are locked, and a labyrinth beside it with an unlock button hidden deep inside.
  Draw a line through the labyrinth to the button and the locked arrows are freed. In the order of play these come after the plain ones.

## The shapes

A maze is made on a cell graph, so it can be made on anything. Squares, hexagons, triangles and circles are graphs of their
own; the rest are one of those with a shape cut out.

| `shape` | What it is |
| --- | --- |
| `square` | Square cells, columns by rows. |
| `hex` | Hexagonal cells, pointy side up, every other row shifted: six neighbours. |
| `triangle` | Triangular cells, pointing up and down in turn: three neighbours. |
| `circle` | Rings round a middle cell, a ring having more cells the further out it is; walls between rings are arcs. |
| `heart`, `leaf`, `star`, `ring`, `diamond`, `cross`, `moon` | Square cells inside an outline, the biggest piece of them that is joined. |
| `hexagon` | A hexagon of hexagonal cells. |
| `pyramid` | A big triangle of triangular cells. |

`docs/MAZES.md` has the research: how each is laid out, how the algorithms differ, and how difficulty is measured, with links.

The seven algorithms (`MeikyuuAlgorithm`) each make a perfect maze, one with exactly one way between any two cells, with a texture of its own:

| `algorithm` | Texture |
| --- | --- |
| `backtracker` | Long winding passages and very few dead ends: a long, tiring solution. |
| `hunt` | Hunt-and-kill: much the same, a little less winding. |
| `growing` | Growing tree, newest cell half the time and a random one the rest: in between. |
| `prim` | Randomized Prim: very many short dead ends, a short solution. |
| `kruskal` | Many short dead ends, evenly spread. |
| `wilson` | Loop-erased random walks: every maze equally likely, so no texture of its own. |
| `eller` | Row by row: horizontal runs. Square mazes only. |

## Levels and how difficulty is measured

There are 1,024 maze levels, 300 arrow levels and 100 mixed levels, and 1,536 tall maze levels in a list of their own (below). The maze list is four sizes of 256, small, medium, large and huge, in that order; inside a size every level scores at least as much as the one before (the score below, which is what a site shows as dots). The arrow and mixed lists are one list each, ordered by their effort.
A level is a recipe, such as `square:12x9:wilson:to-goal:48213` (shape, size, algorithm, way to play, seed) or `heart:25:prim:keys-3:7`, never a drawing. A recipe rebuilds
the same maze every time, on every browser, because every choice a generator makes comes from a seeded integer stream (mulberry32) and none from the geometry.
The lists are made on a desk by `scripts/meikyuu-levels.ts` and `scripts/meikyuu-tall.ts`, put in the order of their score by `scripts/meikyuu-rescore.ts`, and kept as data in `src/levels/`. `docs/LEVELS.md` has the tables: the levels of every size and third, how hard they are, how many more could be made, and what became of the 1.0.0 list.

- **Small and quick first, huge and slow last.** Level 1 is a 15-cell maze; level 1,024 has 8,911 cells. 256 levels are small (under 150 cells), 256 medium (under 800), 256 large (under 4,000) and 256 huge. A size is sixteen pages of sixteen levels, and a third of it (86, 85 and 85 levels) is its easy, medium and hard.
- **Mixed.** The shapes and the ways to play arrive as the small list goes on (squares first, then circles, hexagons, triangles, and the cut-out shapes one after another; in and out first, then the goal, the centre and keys), and every size has all of them.
  Maze levels by shape: square 156, hex 90, circle 85, triangle 77, heart 74, leaf 74, hexagon 74, pyramid 73, diamond 72, star 67, cross 66, ring 65, moon 51; by way to play: `to-goal` 268, `centre-out` 262, `keys` 253, `enter-leave` 241.
- **Difficulty is measured twice.** `measureMaze` counts the passages alone, in whole numbers (the cells on the way through, its forks, the wrong branches, the dead ends, the `river`, the detour for keys) and adds them to an `effort`, an estimate in cells drawn: the way, plus the wrong turns (a person at a fork goes the wrong way half the time and walks to the end of it and back), plus two for every fork, plus the keys. `ratingOf` puts it on a scale of 1 to 100 where doubling the effort adds the same each time.
- **And scored** (`difficultyOf`, 0 to 100): effort is mostly size; the score adds what makes two mazes of one size easy or tricky (the forks, the forks where *the straight guess* is wrong, the cells it draws in vain, the longest wrong branch, the bends), then multiplies it by **how much of the map the answer covers** (`coverageOf`): an answer across the whole map keeps its score, one that stays in a corner counts for half. A maze the straight guess walks through is not a level (`isTooEasy`). `docs/LEVELS.md` has the choices and every level's score; [LEVELS-STANDARD.md](https://github.com/johnmorrisdotca/.github/blob/main/LEVELS-STANDARD.md) is the family's rule.
- **Tested on every build**: every level rebuilds from its recipe, is a perfect maze of the cells the list says, measures the effort and the score the list says, is not too easy, and is solved by drawing its way with the game's own rules; and the scores never go down along a size.

```ts no-check
import { levelOf, findMazeLevels, MEIKYUU_ARROW_LEVELS } from "@johnmorrisdotca/meikyuu/levels";

levelOf("maze", 40);                                   // { number, code, recipe, effort, rating, cells }
findMazeLevels({ shape: "heart", mode: "keys" });      // the heart levels you collect keys in
mazeLevelOfSize("medium", 40);                         // level 40 of the 256 medium mazes
MEIKYUU_ARROW_LEVELS[0].recipe;                        // { shape: "square", w: 3, h: 4, longest: 2, seed: …, … }
```

## Colossal mazes

Two more lists, in an entry of their own (`/levels/colossal`): 128 square mazes of about ten thousand cells and 128 tall ones, 64 across and 96 down, each a recipe that builds the same maze everywhere.

The options, the numbers and every example are in [docs/MORE-MAZES.md](docs/MORE-MAZES.md#colossal-mazes).

## Stones

A marble (the `stones` option) laid beside the line on a passage the player has given up on, which the line cannot enter: a helper for the big mazes, never a pen, laid only within `reach` cells of the line.

The options, the numbers and every example are in [docs/MORE-MAZES.md](docs/MORE-MAZES.md#stones).

## Mazes over a solid

A perfect maze over the whole surface of 18 solids (`/3d`, `/3d/play`, `/3d/levels`): the dice (d3, d4, d6, d8, d10, two d12, d16, d20, d24, d30) and the shapes (a globe, a box, a cross of cubes, a ring, a torus, a star and a heart), 5,760 levels, drawn on a canvas, turned by dragging away from the line, with the solid turning by itself to keep the end of the line in view.

The options, the numbers and every example are in [docs/SOLID-MAZES.md](docs/SOLID-MAZES.md#mazes-over-a-solid).

## Tall mazes, turning and touch

1,536 portrait levels, two columns to three rows, that lie down by themselves on a wide screen without changing the maze or a line already drawn: a phone held upright leaves a box about two thirds as wide as it is tall, so the tall levels are 2:3, with some page always left beside the board to scroll by.

The options, the numbers and every example are in [docs/MORE-MAZES.md](docs/MORE-MAZES.md#tall-mazes-turning-and-touch).

## Drawing

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

## Playing it in a page

```ts no-run
import { mountMeikyuu } from "@johnmorrisdotca/meikyuu/play";

const board = mountMeikyuu(document.getElementById("here")!, { kind: "maze", level: 40, tap: true, sound: false });
board?.host.addEventListener("meikyuu-solve", (event) => console.log((event as CustomEvent).detail));
board?.load({ kind: "arrows", level: 5 });   // another puzzle in the same box
```

A board is drawn with a finger or the mouse (a wall stops the line and drawing back shortens it), zoomed with a pinch or the wheel, helped with Hint, taken back with Undo, its solved message put away with a tap, its close button or Escape, and it says what happens with the events `meikyuu-move`, `meikyuu-solve`, `meikyuu-key`, `meikyuu-unlock`, `meikyuu-bump`, `meikyuu-lose` and `meikyuu-stones`. The tag is `<meikyuu-board>`, with the options as attributes (`kind` and `level`, or `recipe`; `board`, `trail`, `tap`, `hints`, `sound`, `controls`, `zoom`, `lang`, `ratio`, `orientation`, `gutter`). The behaviour of each, every option, the handle's methods and the element's attributes are in [docs/PLAYING.md](docs/PLAYING.md#playing-it-in-a-page).

## API

Every export of every entry point, with its signature and its doc comment, is in the
[API reference](https://johnmorrisdotca.github.io/meikyuu/api.html), made from the source when the site is built so it cannot fall behind the code.

### The calls to learn first

| Call | What it does |
| --- | --- |
| `buildMaze(recipe)` | The same maze in every browser and every Node, from a recipe |
| `solutionOf(maze)`, `measureMaze(maze)`, `isPerfect(maze)` | The one way through, how hard the maze is, whether it is perfect |
| `newMazeGame(maze)`, `pressMaze`, `dragMaze`, `liftMaze`, `undoMaze`, `hintMaze` | A line drawn through a maze, as pure functions |
| `levelOf(kind, number)`, `findMazeLevels(query)` | The numbered lists of levels, and finding one |
| `drawMaze(maze, options?)`, `drawArrows(board, options?)` | A maze or an arrow board as SVG text |
| `mountMeikyuu(element, options?)` and `<meikyuu-board>` | A board played in an element, or in one tag |

## Making levels

`pnpm levels` runs `scripts/meikyuu-levels.ts`, which writes `src/levels/mazes.data.ts` (about a minute and a half); `node scripts/meikyuu-tall.ts` writes `tall.data.ts` (about a minute); `node --experimental-strip-types scripts/meikyuu-colossal.ts` writes `colossal.data.ts` (about six minutes); `node scripts/meikyuu-arrows.ts` writes `arrows.data.ts` and `mixed.data.ts` (about a minute).
All are seeded, so the same run writes the same files. `pnpm levels:rescore` (`scripts/meikyuu-rescore.ts`) runs last: it scores every level again and puts each list in the order of its score. A size kept the places of the 1.0.0 list until 3.0.0 (`scripts/meikyuu-levels.ts`); the tall sizes are ramps of 256 steps (`scripts/levels-list.ts`). `node scripts/levels-facts.ts [--capacity]`, `levels-trees.ts`, `phone-fit.mjs` and `levels-charts.mjs` print and draw the tables and pictures of `docs/LEVELS.md`.
A level once published keeps its number: a published list is only ever added to at the end, never rewritten, **except by a release that says so**: 2.0.0 gave 117 places a new maze and cut 40 off the end, and 3.0.0 put every list in the order of its new score (CHANGELOG.md); `@johnmorrisdotca/meikyuu/levels/legacy` says where each 1.0.0 level is now.

## Theming

Nothing here is branded. The drawing and the playable board are coloured by custom properties, and a page sets only the ones it wants different. The default board, `paper`, follows the device's light or dark setting; `data-theme="light"` or `"dark"` on `<html>` forces one. A named board other than paper (`wood`, `green`, `blue`, `red`, `black`) writes its own paper, wall, frame and dots on the drawing, so to set those yourself keep the board `paper`; the line's colour (`trail`) is chosen by name (`green`, `blue`, `red`, `violet`, `orange`) or as any CSS colour, on any board.

**The drawing** (`drawMaze`, `drawArrows`), custom properties on `.meikyuu`. The dark values apply to the `paper` board:

| Property | What it colours | Light | Dark |
| --- | --- | --- | --- |
| `--mk-paper` | the paper | `#fbf8f1` | `#262a27` |
| `--mk-wall` | the walls (and the outline of the goal and the keys) | `#1f2320` | `#ece8dc` |
| `--mk-frame` | the frame round the shape | `#a98954` | `#6b5632` |
| `--mk-trail` | the line the player draws | `#2e8b57` | `#6fcf97` |
| `--mk-start` | the start, and an entrance door | `#2f7a4f` | `#6fcf97` |
| `--mk-goal` | the goal, an exit door, the solution when it is shown, and a solved line | `#e0b43b` | the same |
| `--mk-key` | a key | `#e0b43b` | the same |
| `--mk-hint` | the stretch a hint lights | `#f2a900` | the same |
| `--mk-bad` | a hint to draw back, and the arrows in a bump | `#b5452c` | the same |
| `--mk-stone` | a stone (a marble laid beside the line) | `#4b5d8f` | `#b3c0ea` |
| `--mk-stone-edge` | the rim of a stone | `#161c33` | `#0e1220` |
| `--mk-dot` | the faint dots of an arrow board | `rgba(0,0,0,.14)` | `rgba(255,255,255,.14)` |
| `--mk-ink` | set for a page that draws its own text over the board; no part of the drawing reads it yet | `#1f2320` | `#ece8dc` |

**The playable board** (`mountMeikyuu` and `<meikyuu-board>`) wears the drawing's properties, and eight of its own on `.meikyuu-play`:

| Property | What it colours | Light | Dark |
| --- | --- | --- | --- |
| `--mkp-ink` | text, the focus ring, and a selected tab | `#1f2320` | `#ece8dc` |
| `--mkp-muted` | the words under the board | `#6b6f68` | `#a09d93` |
| `--mkp-rule` | borders | `#ddd6c6` | `#3a3d38` |
| `--mkp-surface` | the buttons | `#fbf8f1` | `#1d201e` |
| `--mkp-accent` | the hearts, and a warning in the words under the board | `#b5452c` | `#ff8a6b` |
| `--mkp-good` | the progress line once solved | `#2f7a4f` | `#6fcf97` |
| `--mkp-gutter` | the page left beside the box, each side (`gutter` sets it) | `24px` | the same |
| `--mkp-reserve` | what the window holds besides the box (`reserve` sets it) | `200px` | the same |

```css
.meikyuu { --mk-goal: #d94f70; --mk-hint: #3b82f6; }
.meikyuu-play { --mkp-accent: #8a1c1c; }
```

The demo's own page is the worked example: its green felt and its cloth patches are the family's stylesheet, [`demo/family.css`](./demo/family.css), which is the same file byte for byte in every sibling's demo, and a test holds it to its hash. With reduced motion asked for, nothing in the board moves.

## Limits

All of these are held by tests, and the ones with a name are exported.

| Limit | Value | Where |
| --- | --- | --- |
| Levels | 1,024 maze levels, 300 arrow levels, 100 mixed | `MEIKYUU_MAZE_LEVELS`, `MEIKYUU_ARROW_LEVELS`, `MEIKYUU_MIXED_LEVELS` |
| Tall levels | 1,536, six sizes of 256 (6 to 20 cells across, 2:3) | `MEIKYUU_TALL_LEVELS`, `MEIKYUU_TALL_SIZES` |
| Colossal levels | 256, two lists of 128: square (9,500 to 12,000 cells) and tall (64 across, 96 down, 2:3) | `MEIKYUU_COLOSSAL_LEVELS`, `MEIKYUU_COLOSSAL_TALL_LEVELS` |
| Solid levels | 5,760, 64 for each of five sizes of 18 solids (60 to 4,860 cells); a recipe at most 10,000 cells | `MEIKYUU_SOLID_LEVELS`, `MEIKYUU_MOST_SOLID_CELLS` |
| Stones | beside the line within 1 or 2 cells (default 2); a few by default (3 and one more for every hundred cells across), or no limit | `stoneLimitFor`, `MEIKYUU_STONE_REACH_MOST` |
| The biggest maze in the lists | 8,923 cells (level 943); the smallest is 15 (level 1) | `levelOf("maze", n).cells` |
| A maze's size words | small under 150 cells, medium under 800, large under 4,000, huge beyond | `sizeOf`, `MEIKYUU_SIZES` |
| A recipe's size | at least 2 a side, and at most 40,000 cells laid out (counting, for a shape cut out of a square, the whole square): a little over twice the biggest level's 19,321; `parseRecipe` refuses more | `MEIKYUU_MOST_CELLS`, `layoutCells` |
| Keys in a recipe | 10, twice the most any level uses | `MEIKYUU_MOST_KEYS` |
| An arrow board's size | at most 4,000 cells: a little over twice the biggest level's 1,849 | `MEIKYUU_MOST_ARROW_CELLS`, `parseArrowRecipe` |
| Shapes, ways to play, algorithms | 13 shapes, 4 ways to play, 7 algorithms (Eller's: square mazes only) | `MEIKYUU_SHAPES`, `MEIKYUU_MODES`, `MEIKYUU_ALGORITHMS` |
| Arrow boards | 8 pictures | `ARROW_SHAPES` |
| Hearts in an arrow puzzle | 3 | `ARROW_HEARTS` |
| Effort, the measure of difficulty | from 9 to 5,400, rated 1 to 100 | `EFFORT_LEAST`, `EFFORT_MOST`, `ratingOf` |
| Score, how hard a maze is to play | 0 to 100; a level is at least `MEIKYUU_LEAST` | `difficultyOf`, `isTooEasy` |
| The page beside the board | at least 24 px each side, widened to 72 px by Zoom out | `MEIKYUU_GUTTER`, `MEIKYUU_GUTTER_MAX` |
| How far a board zooms in | until a cell is 72 pixels wide, and out to the whole maze fitted | `MOST_CELL_PIXELS`, `scaleLimits` |

A maze of thousands of cells is cut into tiles on the page so that only the walls on screen are drawn: a big maze stays smooth on a phone.

## Accessibility

A maze is drawn with a finger or a mouse, so what a person who cannot see it hears, and what a person who cannot drag can do, are worth saying plainly.

- **A keyboard plays it.** Focus the board and the arrow keys step the line one cell, Enter or Space begins a line at the start, Backspace, Delete or Ctrl+Z take a stroke back, and with Shift the arrow keys lay a stone beside the line. Tab reaches the board, the buttons and the zoom pad in the order they are drawn.
- **The words are spoken.** The board is a labelled group, the line of progress and the line of messages are polite live regions (a key picked up, a bump, a win), and every button has a name from the board's own words, in English or Japanese by the page's `lang`. The drawing itself is hidden from a screen reader (`aria-hidden`), because a maze has no useful reading cell by cell.
- **Touch targets are large.** Every button and tab is at least 44 pixels each way, and some page is always left beside the board for a finger to scroll by: only the board itself asks the browser to keep touches.
- **Not by colour alone.** The start, the goal, the doors and the keys are different shapes; the line is a thick path and not a colour only; the five line colours and six boards include a black board for contrast.
- **Motion.** Under a request for reduced motion nothing moves: the arrows do not slide or shake and the trail does not ripple.
- **Colour and contrast.** Every colour is a CSS variable (see [Theming](#theming)); the `paper` board follows the page's light or dark. The defaults have not been measured against a contrast standard.
- **Known to fall short.** Drawing a line is a pointing task, and the keyboard steps one cell at a time, which for a maze of ten thousand cells is a long way; a screen reader hears that a maze is there, and how far the line has got, and not its shape. The Japanese words have not been read by a native reader ([Languages](#languages)).

## Browser support

Any browser with ES2020 modules, custom elements, Pointer Events, `ResizeObserver` and CSS `aspect-ratio`: Chrome and Edge 88, Safari 15, Firefox 89, all from 2021 on. The sounds need the Web Audio API and are off unless asked for. The element draws in the page's own DOM, with no shadow DOM. The demo is played in a real Chromium at a phone's width (with touch) and a desk's, and in WebKit, Safari's engine, at a phone's width, including pinch, wheel and drag; Firefox is not in that run. The package itself (the rules, the making and the levels) needs no DOM: it runs in Node 22 or later (CI tests 22 and 24). Deno and Bun are not tested.

## Languages

English and Japanese, chosen by the `language` option, the host's `lang` or the page's, and followed when the page's `lang` changes. The demo has a chooser of its own and takes the browser's language on a first visit. The board's words and the names of the shapes, solids and ways to play (`MEIKYUU_STRINGS`) are in both. **Japanese: included; not yet reviewed by a native reader. Corrections welcome.** Every string is listed beside its English in [docs/strings-ja.md](./docs/strings-ja.md), with an [issue template](https://github.com/johnmorrisdotca/meikyuu/issues/new?template=fix-a-translation.md) for fixing one. Any other language is a table of your own.

## Roadmap

1.0.0 is complete for all three kinds, as far as it goes. What is **done**: the mazes (every shape and way to play, the seven algorithms, the measure, the 1,024 levels in four sizes and the 1,536 tall ones, drawing,
playing, zoom, pan, the element); the **arrow puzzles** (eight pictures, 300 levels, drawing, playing with hearts, hint, undo and an animation); and the **mixed puzzles** (100 levels, locked arrows, a labyrinth with its button, two tabs).
What is **not**, and could come next:

- The arrow and mixed lists are smaller than the maze list (300 and 100 levels, against 1,024), and the arrows' top levels are about as hard as each other, since a board over about 45 cells across is more than a phone can hold.
- A mixed puzzle has one unlock button that frees every locked arrow; a puzzle with several buttons for several groups of locks is not made.
- The Japanese in the demo and in the package's words is written by the author of the package and has not been read by a native reader: corrections are welcome (the issue template says how).
- No sound recordings. The sounds are tones made in the browser; a recorded set could be added if one that is public domain is found.
- Mazes with loops (braids) and weaves are not made, and neither is a maze whose layers turn like a Rubik's cube: the solids' mazes are over a surface that stays as it is.

## Architecture

Everything that decides a maze or a game is a plain function over a cell graph, with no DOM. The drawing is SVG text in an entry of its own,
so a server that only builds mazes never loads it, and the page's part (the mount and the element) is another.

The file-by-file tree, with a line on each source file, is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): the grids and the algorithms, the maze and the measure, the game and the arrows, the levels (`levels/`, `levels-*`), the drawing (`draw`), the page (`mount`, `element`, `style`), and the solids (`solid/`). Tests sit beside the code they test (`*.test.ts`, and the maze list in eight files and the tall list in three so that they run side by side). `scripts/` makes the levels, builds the demo and its API reference page,
takes the pictures and checks the package as npm packs it; `demo/` is the playable page, and `e2e/` its browser tests.

## The name

*Meikyuu* (迷宮, 「めいきゅう」) is Japanese for a labyrinth. It is written with 迷, which
[Wiktionary](https://en.wiktionary.org/wiki/%E8%BF%B7) glosses as to get lost, to be bewildered, and 宮, a
[palace or a shrine](https://en.wiktionary.org/wiki/%E5%AE%AE): a bewildering palace. Wiktionary's entry for
[迷宮](https://en.wiktionary.org/wiki/%E8%BF%B7%E5%AE%AE) gives "maze, labyrinth", and notes the figurative
sense, as in 迷宮入り, a case that goes unsolved. It is also the word Japanese games use for the place the player
goes down into: the Japanese Wikipedia's article on [ダンジョン](https://ja.wikipedia.org/wiki/%E3%83%80%E3%83%B3%E3%82%B8%E3%83%A7%E3%83%B3) (the dungeon of a game) says that in
Japanese it is often called 地下迷宮, an underground labyrinth, or simply 迷宮. The everyday word for a maze to draw a line through, on paper, is 迷路 (*meiro*); 迷宮 is the one for a labyrinth you can be lost in. (The sources were read on 2026-10-01.)

## Where it comes from, and where it is used

Meikyuu is a package of the family that [itsutsu.com](https://itsutsu.com)'s games are built from. The maze algorithms are the standard ones in the literature, written here from their descriptions: Jamis Buck's
[recap of maze algorithms](https://weblog.jamisbuck.org/2011/2/7/maze-generation-algorithm-recap) and his book [*Mazes for Programmers*](https://pragprog.com/titles/jbmaze/mazes-for-programmers/), and Walter Pullen's
[Think Labyrinth](https://www.astrolog.org/labyrnth/algrithm.htm) for the vocabulary of textures. Only prose was read, never anyone's code, and `docs/MAZES.md` links all of it. The arrow puzzles are a genre of
tapping puzzle; this package's rules and its way of making them backwards are its own.

### Used by

Nobody is listed yet. Using Meikyuu in something? Open an *Add my project* issue and we will add you.

### The family

<!-- family:start (made by scripts/family-readme.mjs from scripts/family-template.mjs; change those, not this) -->
Meikyuu is one of twenty-four packages, each made for the same site, each at
[github.com/johnmorrisdotca](https://github.com/johnmorrisdotca). The code of every one is MIT.

- [Korokoro](https://github.com/johnmorrisdotca/korokoro) (コロコロ): dice, with notation, exact odds, real sounds and the dice of many games. [Demo](https://johnmorrisdotca.github.io/korokoro/).
- [Kyuubu](https://github.com/johnmorrisdotca/kyuubu) (キューブ): a turning cube for the browser, 2×2 to 7×7, with record solves to replay. [Demo](https://johnmorrisdotca.github.io/kyuubu/).
- [Hitotsu](https://github.com/johnmorrisdotca/hitotsu) (一つ): a colour-card shedding game for two to eight, with the house rules people play. [Demo](https://johnmorrisdotca.github.io/hitotsu/).
- [Toranpu](https://github.com/johnmorrisdotca/toranpu) (トランプ): a deck of playing cards, card games with computer players, and solitaires. [Demo](https://johnmorrisdotca.github.io/toranpu/).
- [Tane](https://github.com/johnmorrisdotca/tane) (種): seeded random numbers and daily seeds, the same in every browser and on every server. [Demo](https://johnmorrisdotca.github.io/tane/).
- [Narabe](https://github.com/johnmorrisdotca/narabe) (並べ): one rules engine for abstract board games, from gomoku and Reversi to Go and checkers. [Demo](https://johnmorrisdotca.github.io/narabe/).
- [Tenka](https://github.com/johnmorrisdotca/tenka) (天下): world conquest for two to six, on a map of the real world. [Demo](https://johnmorrisdotca.github.io/tenka/).
- [Kumimoji](https://github.com/johnmorrisdotca/kumimoji) (組み文字): a crossword tile race, in English and Japanese kana. [Demo](https://johnmorrisdotca.github.io/kumimoji/).
- [Tsunagi](https://github.com/johnmorrisdotca/tsunagi) (繋ぎ): a line-joining logic puzzle whose every level has exactly one answer. [Demo](https://johnmorrisdotca.github.io/tsunagi/).
- [Jarajara](https://github.com/johnmorrisdotca/jarajara) (ジャラジャラ): mahjong tiles drawn as SVG, stacked layouts, and the matching solitaire Awase. [Demo](https://johnmorrisdotca.github.io/jarajara/).
- [Suido](https://github.com/johnmorrisdotca/suido) (水道): a pipe puzzle: turn the pieces until the water reaches every drain. [Demo](https://johnmorrisdotca.github.io/suido/).
- [Domino](https://github.com/johnmorrisdotca/domino) (ドミノ): dominoes and Mexican Train. [Demo](https://johnmorrisdotca.github.io/domino/).
- [Kotoba](https://github.com/johnmorrisdotca/kotoba) (言葉): word lists and word-game rules in English, French, German and Japanese. [Demo](https://johnmorrisdotca.github.io/kotoba/).
- [Sugoroku](https://github.com/johnmorrisdotca/sugoroku) (双六): backgammon and its variants, with the doubling cube and match play. [Demo](https://johnmorrisdotca.github.io/sugoroku/).
- [Kazu](https://github.com/johnmorrisdotca/kazu) (数): grid number puzzles: Sudoku and its variants, Futoshiki and Skyscrapers. [Demo](https://johnmorrisdotca.github.io/kazu/).
- [Meikyuu](https://github.com/johnmorrisdotca/meikyuu) (迷宮): mazes on squares, hexagons, triangles and circles, made from a seed and drawn through with a finger or the mouse. [Demo](https://johnmorrisdotca.github.io/meikyuu/).
- [Hikidashi](https://github.com/johnmorrisdotca/hikidashi) (引き出し): a drawer of small Japanese text tools: era dates, kanji numerals, readings and sentence difficulty. [Demo](https://johnmorrisdotca.github.io/hikidashi/).
- [Chizu](https://github.com/johnmorrisdotca/chizu) (地図): maps of the world and of countries' regions, in English and Japanese, with a quiz and callouts. [Demo](https://johnmorrisdotca.github.io/chizu/).
- [Bushu](https://github.com/johnmorrisdotca/bushu) (部首): find a kanji by the parts it is made of. [Demo](https://johnmorrisdotca.github.io/bushu/).
- [Tobiishi](https://github.com/johnmorrisdotca/tobiishi) (飛び石): peg solitaire with nine boards and seeded solvable challenges. [Demo](https://johnmorrisdotca.github.io/tobiishi/).
- [Jirai](https://github.com/johnmorrisdotca/jirai) (地雷): minesweeper on shaped grids with verified no-guess boards. [Demo](https://johnmorrisdotca.github.io/jirai/).
- [Gunjin](https://github.com/johnmorrisdotca/gunjin) (軍人): five hidden-rank strategy games with pass-the-device play. [Demo](https://johnmorrisdotca.github.io/gunjin/).
- [Karakuri](https://github.com/johnmorrisdotca/karakuri) (からくり): eight hyper-casual puzzle games, some of them physics: draw a shield, pull pins, cut ropes, slide blocks, pour tubes. [Demo](https://johnmorrisdotca.github.io/karakuri/).
- [Houseki](https://github.com/johnmorrisdotca/houseki) (宝石): gem and stone matching puzzles: falling triplets, stone collapse, colour chains and gem swap. [Demo](https://johnmorrisdotca.github.io/houseki/).

**This package is Meikyuu.** The demos of all twenty-four share one header and footer, so each links the rest.
<!-- family:end -->

## Development

```sh
pnpm install --frozen-lockfile
pnpm check          # lint, types and every test, every level rebuilt and solved again
pnpm test:package   # pack, install and import it as somebody who installed it would
pnpm test:demo      # build the demo and play it in a real browser, at a phone's width and a desk's
pnpm site           # build the demo into site/, as the Pages workflow publishes it
pnpm levels         # remake the maze list (about a minute and a half)
```

Two more commands belong to the pictures: `pnpm test:readme` type-checks and runs every TypeScript and JavaScript example in this README, and `pnpm screenshots:readme` retakes the README's pictures into `docs/images` (it builds the demo first); `pnpm pictures:levels` retakes the tall mazes' pictures that `docs/LEVELS.md` shows. The pictures are taken on the maintainer's Mac and are retaken only when the look changes; the README's are in `docs/images` and are not in the package that npm installs.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). The commands are under [Development](#development).

Please follow the [code of conduct](./CODE_OF_CONDUCT.md). A recipe that makes the builder run for long or use a great deal of memory, or markup that gets out of the drawing, is for the [security policy](./SECURITY.md), not a public issue.

## Changes

See [CHANGELOG.md](./CHANGELOG.md).

The latest release is 3.1.0: 18 solids (a d3 to a d30, a box, a cross, a ring, a torus, a star, a heart), five sizes to the colossal, 5,760 levels.

## Licence

MIT, © John Morris. The levels are part of the package and under the same licence.
