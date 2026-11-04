---
title: 通常の HTML と CDN
section: how-to
order: 11
description: jsDelivr や unpkg の script タグ1つで、通常のページに迷路を載せます。
---

ビルドは要りません。`element/define` を読み込むと `<meikyuu-board>` のタグが登録されます。CDN の script タグで読み込めば、タグがページの中で自分で迷路を描きます。迷路に必要なものはパッケージに入っているので、ほかに読み込むものはありません。

## jsDelivr

jsDelivr は、パッケージのファイルをそのまま配ります。

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Meikyuu from jsDelivr</title>
    <script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/meikyuu@3/dist/element-define.js"></script>
  </head>
  <body>
    <meikyuu-board level="40" board="wood"></meikyuu-board>
  </body>
</html>
```

## unpkg

unpkg も同じです。

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Meikyuu from unpkg</title>
    <script type="module" src="https://unpkg.com/@johnmorrisdotca/meikyuu@3/dist/element-define.js"></script>
  </head>
  <body>
    <meikyuu-board level="40" board="wood"></meikyuu-board>
  </body>
</html>
```

## 注意

- `<script type="module">` を使います。通常の script では `import` できません。
- アドレスにはメジャーバージョン（`@3`）を入れます。使い方が変わるリリースは、自分で選んだときだけ入ります。
- ページは属性とイベントで迷路を操作します。属性の名前は [iframe で埋め込む](embed-in-an-iframe.md) に、表示されないときは [トラブルシューティング](troubleshooting.md) があります。
