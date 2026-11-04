---
title: TypeScript と Node
section: how-to
order: 15
description: パッケージの型を使い、DOM のないサーバーでルールを動かします。
---

パッケージには、入口ごとの型が付いています。ルールは文字列と数を扱うふつうの関数なので、Node・Deno・Bun・ワーカー・ブラウザーのどれでも同じ呼び出しが同じ答えを返します。このファイルは型を検査してから、型を取り除く Node 22.18 以降で動かしています。

```ts
import { buildMaze, solutionOf, type Maze } from "@johnmorrisdotca/meikyuu";

const maze: Maze = buildMaze({ shape: "hexagon", w: 6, h: 6, algorithm: "kruskal", mode: "centre-out", seed: 3 });
console.log(maze.grid.cells, solutionOf(maze).length > 0);

// @ts-expect-error the cells are a count, not a name
const wrong: string = maze.grid.cells;
console.log(typeof wrong);
```

`@ts-expect-error` は、間違った型をコンパイラーが断ることを示すためにあります。

## サーバーで

サーバーに DOM は要りません。プレイヤーが送ってきたものを、同じルールで確かめます。

```mjs
// A server that wants to trust a level takes a recipe and rebuilds the maze, with no page at all.
import { buildMaze, parseRecipe, solutionOf } from "@johnmorrisdotca/meikyuu";

const recipe = parseRecipe("heart:25:wilson:to-goal:5"); // null when it is not a recipe
if (recipe === null) throw new Error("not a maze this site makes");
const solution = solutionOf(buildMaze(recipe)); // the one way through, cell by cell
console.log(solution.length > 0, parseRecipe("nonsense")); // true null
```

ページに迷路を載せる方法は [はじめに](getting-started.md) にあります。
