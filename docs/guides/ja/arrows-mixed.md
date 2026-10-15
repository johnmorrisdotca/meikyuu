---
title: "矢印と混合の盤を遊ぶ"
section: how-to
order: 4
description: "妨げ・ロック・取り除く結果を確認します。"
---

## 標準の矢印操作

```ts
import {makeArrows,newArrowGame,hintArrow,tapArrow,arrowsLeft} from "@johnmorrisdotca/meikyuu";
const board = makeArrows({shape:"square",w:5,h:5,longest:3,seed:42});
const game = newArrowGame(board);
const id = hintArrow(game);
if(id!==null){const next = tapArrow(game,id);console.log(next.result,arrowsLeft(next.game));}
```

矢印は向きに沿って外へ出ます。残った矢印に妨げられ、ロックも解除が必要です。`tapArrow`は新しい状態とremoved/blocked/locked/ignoredを返すので、ホストの個数を勝手に減らさず結果を使います。失敗でハートを失う場合があり、取消や再開も標準の状態に従います。

## 混合には二つの層

混合設定は迷路と矢印の設定を持ちます。迷路のボタンが矢印を解除し、`withMaze`と`withArrows`は対応する状態を更新します。`mixedSolved`は両方の完成を確認します。設置したプレイヤーは二つのタブを提供します。表示したヒントは助けで、合法な操作を行った証明ではありません。[PLAYING.md](../../PLAYING.md)、[hintArrow](api:hintArrow)、[mixedSolved](api:mixedSolved)を参照してください。
