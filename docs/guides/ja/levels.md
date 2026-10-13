---
title: "平面・縦長・立体の問題を読む"
section: how-to
order: 3
description: "正しい問題集の 1 始まりの番号と固定した版を使います。"
---

## 全迷路を作らず情報を読む

```ts
import {levelOf,mazeLevelsOfSize} from "@johnmorrisdotca/meikyuu/levels";
import {tallLevelOf,tallLevelsOfSize} from "@johnmorrisdotca/meikyuu/levels/tall";
const level = levelOf("maze",1)!;
const tall = tallLevelOf(1)!;
console.log(level.code,mazeLevelsOfSize("small").length,tall.width,tallLevelsOfSize(tall.size).length);
```

問題番号は 1、配列の位置は 0 からです。平面のサイズは名前、縦長は 1〜6 の添字で、幅は別項目です。巨大な四角と縦長も別の問題集です。該当しなければ一覧は空、番号がなければ `null` です。

## 必要な立体問題集を選ぶ

`/3d/levels` は最初の立体、`/dice` と `/shapes` は追加、`/all` は全体です。同じ検索名でも、その入口のデータだけを調べます。含まれない形は空の一覧です。`/3d/levels/recipes` は得点や effort が不要なホスト向けの軽い読取です。

保存した結果には設定コードを添えます。メジャー 2 と 3 で番号が変わったため、番号だけなら問題集と版も必要です。迷路は形を考慮した得点順、矢印と混合は標準の effort 順です。[LEVELS.md](../../LEVELS.md)と [移行](upgrading.md)を参照してください。
