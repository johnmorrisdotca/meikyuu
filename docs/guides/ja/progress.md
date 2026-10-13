---
title: "標準の迷路の進捗を保存する"
section: how-to
order: 5
description: "設定と経路・石の状態を組で保存します。"
---

## 経路を往復する

```ts
import {buildMaze,newMazeGame,pressMaze,dragMaze,solutionOf,encodeRun,decodeRun,recipeCode} from "@johnmorrisdotca/meikyuu";
const recipe = {shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42} as const;
const maze = buildMaze(recipe), route = solutionOf(maze);
const game = dragMaze(pressMaze(newMazeGame(maze),maze.start),route[1]);
const restored = decodeRun(maze,encodeRun(game),null);
console.log(recipeCode(recipe),restored?.path);
```

全設定と標準の進捗文字列を組にします。経路は通路のマス列で、鍵と完成は規則から決まります。表示を回してもマスの同一性は変わりません。不適合な経路は `null` になり、マス数が同じだけで別の迷路へ渡さないでください。

## 石と保存

石は任意で、通路のマスを塞ぎます。個数、距離、端点、現在の線、描画中かによって置けるかが決まり、`canLayStone` と `toggleStone` が理由を返します。無制限なら `stonesLeft` は `null` です。復元には同じ石の規則を使います。保存先はホスト側で決めます。iframe は保存せず、全体のデモは従来の任意の端末内保存を保ちます。[コードと表示](geometry.md)、[埋め込み仕様](../../embeds.md)を参照してください。
