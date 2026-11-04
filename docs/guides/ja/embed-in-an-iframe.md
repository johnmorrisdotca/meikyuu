---
title: iframe で埋め込む
section: how-to
order: 12
description: スクリプトを動かせないページでも、埋め込み用ページの iframe 1つで迷路を表示できます。
---

埋め込み用ページの iframe には、自分のコードは要りません。ページのスタイルとも切り離されます。アドレスで表示するものを選びます。キーはタグの属性と同じ名前です（`kind`、`level`、`board`、`width`、`theme`、`lang`）。

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Meikyuu in an iframe</title>
  </head>
  <body>
    <iframe
      src="https://johnmorrisdotca.github.io/meikyuu/embed/?level=40&board=wood"
      title="A maze: Meikyuu, level 40"
      width="496"
      height="640"
      loading="lazy"
      style="border: 0; max-width: 100%"
    ></iframe>
  </body>
</html>
```

## 注意

- iframe には `title` と大きさを付けます。迷路は狭い枠にも収まり、中のページにスクロールバーは出ません。
- iframe は迷路のイベントをメッセージとして親のページに送ります。読む前に `event.origin` と `event.source` を確かめてください。
- 埋め込み用ページは、タグが描く迷路と同じものです。タグの属性（[通常の HTML と CDN](html-and-cdn.md)）とアドレスのキーは同じ名前です。
