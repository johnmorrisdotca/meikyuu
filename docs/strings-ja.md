# Meikyuu's words, in English and Japanese

Made from `src/strings.ts` by `pnpm docs:make`; a test fails if the two differ, so this list is never out of date.

**The Japanese has not yet been reviewed by a native reader.** If a line reads wrongly or unnaturally, please
open a *Fix a translation* issue with the string's name. `{name}` and the other braces are filled in when shown.

| Name | English | Japanese |
| --- | --- | --- |
| `mazeLabel` | {shape} maze of {n} cells. {play} | {shape}の迷宮（{n}マス）。{play} |
| `arrowsLabel` | Arrow puzzle of {n} arrows on a {shape} board. | {shape}の盤に{n}本の矢が並ぶ矢印パズル。 |
| `shape_square` | Square | 四角 |
| `shape_hex` | Hexagons | 六角 |
| `shape_triangle` | Triangles | 三角 |
| `shape_circle` | Circle | 円 |
| `shape_heart` | Heart | ハート |
| `shape_leaf` | Leaf | 葉 |
| `shape_star` | Star | 星 |
| `shape_ring` | Ring | 輪 |
| `shape_diamond` | Diamond | ひし形 |
| `shape_cross` | Cross | 十字 |
| `shape_moon` | Moon | 月 |
| `shape_hexagon` | Hexagon | 大六角形 |
| `shape_pyramid` | Pyramid | ピラミッド |
| `mode_enter_leave` | Enter and leave | 入口から出口へ |
| `mode_to_goal` | Find the goal | ゴールを探す |
| `mode_centre_out` | Out from the centre | 中心から外へ |
| `mode_keys` | Collect the keys | 鍵を集めて出る |
| `play_enter_leave` | Draw a line from the way in to the way out. | 入口から出口まで、線を引きます。 |
| `play_to_goal` | Draw a line from the green start to the gold goal. | 緑のスタートから金色のゴールまで、線を引きます。 |
| `play_centre_out` | Draw a line from the middle out through the door in the outer wall. | 中心から、外壁の出口まで、線を引きます。 |
| `play_keys` | Pick up every key, then draw out through the door in the outer wall. | 鍵をすべて拾ってから、外壁の出口まで線を引きます。 |
| `kind_maze` | Mazes | 迷路 |
| `kind_arrows` | Arrows | 矢印 |
| `kind_mixed` | Mixed | ミックス |
| `undo` | Undo | もどす |
| `restart` | Restart | やり直す |
| `hint` | Hint | ヒント |
| `fit` | Fit | 全体 |
| `zoomIn` | Zoom in | 拡大 |
| `zoomOut` | Zoom out | 縮小 |
| `zoomLabel` | Zoom the board | 盤を拡大・縮小 |
| `pan` | Move | 移動 |
| `panLabel` | Drag the board to move it, instead of drawing | 線を引かずに、盤をドラッグして動かす |
| `turn` | Turn | 回す |
| `turnLabel` | Turn the board a quarter | 盤を4分の1回す |
| `tabArrows` | Arrows | 矢印 |
| `tabMaze` | Labyrinth | 迷宮 |
| `tabsLabel` | Which board to look at | 見る盤を選ぶ |
| `hintStart` | Press the green start and draw. | 緑のスタートを押して、線を引きます。 |
| `hintAhead` | Follow the glow. | 光っているところをたどります。 |
| `hintBack` | Draw back {n} cells, then follow the glow. | {n}マスもどってから、光っているところをたどります。 |
| `hintBackOne` | Draw back 1 cell, then follow the glow. | 1マスもどってから、光っているところをたどります。 |
| `drawn` | {n} cells drawn. | {n}マス描きました。 |
| `drawnOne` | {n} cell drawn. | {n}マス描きました。 |
| `notStarted` | Press the start and draw. | スタートを押して、線を引きます。 |
| `keysOf` | Keys {k} of {total}. | 鍵 {k}／{total}。 |
| `solved` | Solved in {n} strokes. | {n}回の線で解けました。 |
| `solvedOne` | Solved in 1 stroke. | 1回の線で解けました。 |
| `needKeys` | The goal is reached, but {n} keys are still to find. | ゴールに着きましたが、鍵があと{n}個残っています。 |
| `needKeysOne` | The goal is reached, but 1 key is still to find. | ゴールに着きましたが、鍵があと1個残っています。 |
| `arrowsLeft` | {n} arrows left. | 矢はあと{n}本。 |
| `arrowsLeftOne` | 1 arrow left. | 矢はあと1本。 |
| `hearts` | Hearts: {n} of {total}. | ハート：{n}／{total}。 |
| `arrowsHint` | Tap an arrow to send it off the board the way it points. | 矢をタップすると、向いている方向へ盤の外に飛んでいきます。 |
| `arrowsFlew` | Away it goes. | 飛んでいきました。 |
| `arrowsBlocked` | Blocked: another arrow is in the way, and a heart is lost. | ほかの矢が邪魔をしています。ハートが1つ減りました。 |
| `arrowsLocked` | Locked. Find the unlock button in the labyrinth. | 鍵がかかっています。迷宮の解除ボタンを探しましょう。 |
| `arrowsWaiting` | A locked arrow is holding this one up. Find the unlock button in the labyrinth. | 鍵のかかった矢のせいで動かせません。迷宮の解除ボタンを探しましょう。 |
| `arrowsUnlocked` | Unlocked! The locked arrows are free to go. | 解除しました。鍵のかかった矢が動かせます。 |
| `arrowsCleared` | Cleared! Every arrow is off the board. | クリア。すべての矢が盤から出ました。 |
| `arrowsLost` | Out of hearts. Restart to try again. | ハートがなくなりました。やり直してください。 |
| `arrowsLostAway` | The arrows are out of hearts. Go back to them and press Restart. | 矢のハートがなくなりました。矢に戻って、やり直してください。 |
| `lockedCount` | {n} locked. | 鍵つきの矢が{n}本あります。 |
| `button` | Unlock button | 解除ボタン |
| `mazeForButton` | Draw a line from the green start to the unlock button. | 緑のスタートから解除ボタンまで、線を引きます。 |
| `heart` | heart | ハート |
| `stone` | Stone | 石 |
| `stoneLabel` | Stone mode: tap a cell beside your line to lay a stone there, or a stone to take it up | 石のモード：線のとなりのマスをタップすると石を置き、石をタップすると取り除く |
| `stoneHow` | Stone mode. Tap a cell beside your line, up to {n} cells away along the passages, to lay a stone the line cannot enter. Tap a stone to take it up. | 石のモードです。線のとなりのマス（通路づたいに{n}マスまで）をタップすると、線が入れない石を置けます。石をタップすると取り除きます。 |
| `stonesLeft` | Stones left: {n}. | 石はあと{n}個。 |
| `stonesLeftOne` | Stones left: 1. | 石はあと1個。 |
| `stonesFree` | Stones laid: {n}. | 石を{n}個置きました。 |
| `stonesFreeOne` | Stones laid: 1. | 石を1個置きました。 |
| `stoneLaid` | Stone laid. The line cannot go in there. Tap it to take it up. | 石を置きました。線はそこに入れません。タップで取り除けます。 |
| `stoneTaken` | Stone taken up. | 石を取り除きました。 |
| `stoneFar` | Too far from your line. A stone goes on a passage up to {n} cells along from it. | 線から遠すぎます。石は線から通路づたいに{n}マスまでに置けます。 |
| `stoneOnLine` | That cell is on your line. | そのマスは線の上です。 |
| `stoneEnd` | A stone cannot go on the start or the goal. | スタートとゴールには石を置けません。 |
| `stoneLimit` | No stones left. Tap a stone to take it up and lay it again. | 石がもうありません。石をタップして取り除くと、また置けます。 |
| `stoneNoLine` | Draw a line first. A stone goes beside it. | 先に線を引いてください。石は線のとなりに置きます。 |
| `stoneSolved` | The maze is solved. | 迷宮は解けています。 |
| `stoneDrawing` | Lift your finger first. | いったん指を離してください。 |
| `solidLabel` | {shape} maze of {n} cells. {play} | {shape}の迷宮（{n}マス）。{play} |
| `solid_cube` | Cube | 立方体 |
| `solid_sphere` | Sphere | 球 |
| `solid_tetrahedron` | Tetrahedron | 正四面体 |
| `solid_octahedron` | Octahedron | 正八面体 |
| `solid_icosahedron` | Icosahedron | 正二十面体 |
| `play_solid` | Draw a line from the green start to the gold goal over the surface. Turn the solid to follow your line round it. | 緑のスタートから金色のゴールまで、表面をたどって線を引きます。線を追って立体を回します。 |
| `solidHow` | Draw from the green start. Drag away from your line, or use the arrows, to turn the solid. It also turns by itself when your line nears the edge of the side you can see. | 緑のスタートから線を引きます。線から離れたところをドラッグするか、矢印を使うと立体が回ります。線が見えている面の端に近づくと、立体はひとりでに回ります。 |
| `solidHidden` | The end of your line is out of sight. Turn the solid, or press Face me. | 線の先が見えない面にあります。立体を回すか「こちらへ」を押してください。 |
| `turnLeft` | Turn left | 左へ回す |
| `turnRight` | Turn right | 右へ回す |
| `turnUp` | Turn up | 上へ回す |
| `turnDown` | Turn down | 下へ回す |
| `turnPadLabel` | Turn the solid | 立体を回す |
| `faceMe` | Face me | こちらへ |
| `faceMeLabel` | Turn the solid so that the end of your line faces you | 線の先がこちらを向くように立体を回す |
| `solidTurnMode` | Turn only | 回すだけ |
| `solidTurnModeLabel` | Drag anywhere to turn the solid, instead of drawing | 線を引かずに、どこをドラッグしても立体を回す |
