---
title: "マスのグラフ・表示・立体迷路"
section: explanation
order: 7
description: "グラフの同一性と投影・ポインターを分けます。"
---

## 平面と立体のグラフ

```ts
import {buildSolidMaze,solidSolutionOf,checkSolidAnswer} from "@johnmorrisdotca/meikyuu/3d";
const maze = buildSolidMaze({kind:"cube",n:2,algorithm:"backtracker",seed:42});
console.log(maze.grid.cells,checkSolidAnswer(maze,solidSolutionOf(maze)));
```

生成は隣接リストを読み、平面の切り抜きでも立体でも同じ考えです。立体の座標は三成分で、マスは面を越えてつながります。回転や投影は表示を変え、通路は変えません。論理的な経路と設定コードは表示を変えても保たれます。

## ポインターと単位

平面では画面のピクセルと論理的な盤の範囲を使います。立体の frame は頂点や中心を投影し、向きと可視性を持ちます。画面の点をマス番号、二次元の点を三次元のベクトルとして渡しません。クォータニオンは正規化した回転と 0〜1 の割合、角度はラジアンです。縦長のサイズは幅でなく添字、立体の分割 n は名前付きサイズと別です。

操作には `/3d/play` を使い、撤去時に破棄します。[立体の使用法](../../SOLID-MAZES.md)、[形の設計](../../SOLIDS.md)、[描画](../../drawing.md)に詳細があります。
