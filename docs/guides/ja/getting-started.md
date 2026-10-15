---
title: "はじめに"
section: tutorial
order: 1
description: "小さなシード付き迷路を作り、経路を読みます。"
---

## 完全な標準設定

npmで`@johnmorrisdotca/meikyuu`をインストールします。主入口は平面の規則で、描画、設置、問題集、立体は別入口です。

```ts
import {buildMaze,solutionOf,isPerfect,measureMaze} from "@johnmorrisdotca/meikyuu";
const maze = buildMaze({shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42});
console.log(maze.grid.cells,isPerfect(maze.grid,maze.links),solutionOf(maze));
console.log(measureMaze(maze).effort);
```

設定には形、寸法、生成法、モード、種が入ります。同じ標準設定は同じ迷路を再現します。完全迷路はつながった木で、effortの測定は時計やゲームを開始しません。

[設定と生成法](recipes.md)、[進捗](progress.md)、[番号付き問題](levels.md)、[描画と埋め込み](embeds.md)を参照してください。大きな迷路や立体を作る独自ホストではWorkerで入力への応答を保てます。
