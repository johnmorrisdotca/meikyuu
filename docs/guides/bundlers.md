---
title: Vite and webpack
section: how-to
order: 13
description: Install the package and import the maze element in a Vite or webpack project.
---

Install it.

```sh
npm install @johnmorrisdotca/meikyuu
# or: pnpm add @johnmorrisdotca/meikyuu
# or: yarn add @johnmorrisdotca/meikyuu
```

Everything is an ES module with its own entry point, so a bundler keeps only what you import. `@johnmorrisdotca/meikyuu/element/define` registers the `<meikyuu-board>` tag once.

## Vite

The page.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Meikyuu with Vite</title>
  </head>
  <body>
    <meikyuu-board level="40" board="wood"></meikyuu-board>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

The script. Vite builds this entry with no configuration.

```ts no-check
import "@johnmorrisdotca/meikyuu/element/define";

const board = document.querySelector("meikyuu-board")!;
board.addEventListener("meikyuu-solve", (event) => console.log((event as CustomEvent).detail.moves));
```

## webpack

The entry. It makes the tag with the DOM, so no HTML is needed.

```js no-check
import "@johnmorrisdotca/meikyuu/element/define";

const board = document.createElement("meikyuu-board");
board.setAttribute("level", "40");
board.setAttribute("board", "wood");
document.body.append(board);
```

The configuration (webpack 5 reads the package's `exports` with no help).

```js no-check
import { fileURLToPath } from "node:url";

export default {
  mode: "production",
  entry: "./src/index.js",
  output: { path: fileURLToPath(new URL("./dist", import.meta.url)), filename: "main.js" },
};
```
