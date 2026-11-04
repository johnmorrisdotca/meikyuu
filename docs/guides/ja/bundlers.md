---
title: Vite と webpack
section: how-to
order: 13
description: Vite や webpack のプロジェクトに、パッケージを入れて迷路の要素を読み込みます。
---

まずインストールします。

```sh
npm install @johnmorrisdotca/meikyuu
# or: pnpm add @johnmorrisdotca/meikyuu
# or: yarn add @johnmorrisdotca/meikyuu
```

すべて ES モジュールで、入口ごとに分かれているので、バンドラーは読み込んだ分だけを残します。`@johnmorrisdotca/meikyuu/element/define` を読み込むと `<meikyuu-board>` のタグが1度だけ登録されます。

## Vite

ページです。

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

スクリプトです。Vite は設定なしでこの入口をビルドできます。

```ts no-check
import "@johnmorrisdotca/meikyuu/element/define";

const board = document.querySelector("meikyuu-board")!;
board.addEventListener("meikyuu-solve", (event) => console.log((event as CustomEvent).detail.moves));
```

## webpack

入口です。タグを DOM で作るので、HTML は要りません。

```js no-check
import "@johnmorrisdotca/meikyuu/element/define";

const board = document.createElement("meikyuu-board");
board.setAttribute("level", "40");
board.setAttribute("board", "wood");
document.body.append(board);
```

設定です（webpack 5 は、パッケージの `exports` をそのまま読みます）。

```js no-check
import { fileURLToPath } from "node:url";

export default {
  mode: "production",
  entry: "./src/index.js",
  output: { path: fileURLToPath(new URL("./dist", import.meta.url)), filename: "main.js" },
};
```
