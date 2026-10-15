---
title: "標準盤の描画と埋め込み"
section: how-to
order: 6
description: "画像のSVGと操作する設置を使い分けます。"
---

## 操作なしのSVG

```ts
import {buildMaze} from "@johnmorrisdotca/meikyuu";
import {drawMaze} from "@johnmorrisdotca/meikyuu/draw";
const maze = buildMaze({shape:"square",w:5,h:5,algorithm:"backtracker",mode:"to-goal",seed:42});
console.log(drawMaze(maze,{label:"迷路の例",board:"paper"}).startsWith("<svg"));
```

描画はSVG、設置は入力、移動、拡大、ヒント、合成音を提供します。ホストを取り除くときはハンドルを破棄します。

```ts no-run
import {mountMeikyuu} from "@johnmorrisdotca/meikyuu/play";
const host = document.createElement("div");document.body.append(host);
const board = mountMeikyuu(host,{kind:"maze",level:1,hints:true});
console.log(board?.kind());board?.destroy();
```

## 要素とiframe

`/element/define`を読み、`<meikyuu-board kind="maze" level="12" size="medium"></meikyuu-board>`を置きます。[ビルダー](https://johnmorrisdotca.github.io/meikyuu/builder.html)で迷路・矢印・混合を確認し、各種コードをコピーできます。表示幅、テーマ、ラベルは設定を変えません。独自設定は日替わりより優先し、todayは設置時に決まり、切替タイマーはありません。

イベントはShadow DOMを越え、iframeからも送られるのでoriginと送信元を確認します。[全仕様](../../embeds.md)はcallableなfitと表示操作、プロパティ、ホストの描画設定、保存しないフレームを説明します。デモとビルダーのDocsは選んだ言語に従います。
