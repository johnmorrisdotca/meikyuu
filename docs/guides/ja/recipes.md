---
title: "形・生成法・モードを選ぶ"
section: how-to
order: 2
description: "再現する問題を共有するときは全設定を保持します。"
---

## 全設定をコードにする

```ts
import {buildMaze,recipeCode,parseRecipe,MEIKYUU_ALGORITHMS,MEIKYUU_MODES} from "@johnmorrisdotca/meikyuu";
const recipe = {shape:"square",w:5,h:5,algorithm:"prim",mode:"enter-leave",seed:42} as const;
const code = recipeCode(recipe);
console.log(code,parseRecipe(code),MEIKYUU_ALGORITHMS,MEIKYUU_MODES);
console.log(buildMaze(recipe).entrance!==null);
```

七つの生成法が通路のグラフを作ります。四角、六角、三角、円の輪、切り抜いた形があります。対応する寸法とマス数を確認し、円の輪数と長方形の幅・高さを取り違えません。Ellerは立体の生成法ではありません。不正な設定文字列は`null`、不正な構築設定は拒否されます。

## モードも問題の一部

enter-leaveには境界の出入口があります。ゴール、中央から外、鍵のモードは端点や鍵が違い、ゴール型には境界の入口がない場合があります。形、寸法、生成法、モード、種、鍵の数を組にします。見た目と向きは問題の同一性を変えません。[MORE-MAZES.md](../../MORE-MAZES.md)と[buildMaze](api:buildMaze)を参照してください。
