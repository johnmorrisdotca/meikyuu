---
title: "困ったとき・よくある質問"
section: troubleshooting
order: 9
description: "ない問題、不正な設定、拒否された操作を確認します。"
---

## nullと空の一覧

設定の読取は不正な文字列に`null`です。番号がないと問題検索は`null`、該当しない一覧や絞込は空です。立体は正しい`/3d/levels`、`/dice`、`/shapes`を選びます。縦長のサイズは幅でなく1〜6です。不正な設置には`mountMeikyuu`と`mountSolid`が`null`を返します。

## 経路・矢印・石

ゴール型には境界の出入口がない場合があるので確認します。線の前の`headOf`は`null`、不適合な経路は読取で拒否されます。解除できる矢印がなければ`hintArrow`は`null`、循環した依存は`peelRounds`が`null`です。石の理由は無効、描画中、端点、距離、個数などを区別し、無制限なら`stonesLeft:null`です。

立体のedge-turnの`null`は回転不要を表します。音は操作の前や音声がない環境で無音になる場合があります。撤去した盤は破棄し、タグは`/element/define`で登録します。保存には設定、種類、問題集、版を添えます。[進捗](progress.md)、[問題集](levels.md)、[全仕様](../../embeds.md)を参照してください。
