// Builds the static demo for GitHub Pages into ./site: the page, written here from the family's
// shared header and footer, with the family's stylesheet, Meikyuu's own, the page's script and the
// compiled library beside it.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

import { API_CSS, apiPage } from "./api.mjs";
import { FAMILY_SCRIPT, familyFooter, familyHead, familyHeader, familyUnreviewed } from "./family-template.mjs";

const id = "meikyuu";
const ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%232f5d4a'/%3E%3Ctext x='50' y='70' font-size='60' text-anchor='middle' fill='%23f3efe4'%3E迷%3C/text%3E%3C/svg%3E";

const uses = [
  `import { buildMaze, measureMaze } from "@johnmorrisdotca/meikyuu";`,
  `buildMaze({ shape: "heart", w: 25, h: 25, algorithm: "wilson", mode: "to-goal", seed: 5 })  // the same maze everywhere`,
  `measureMaze(maze).effort  // how many cells a person draws to solve it`,
  `import { MEIKYUU_MAZE_LEVELS } from "@johnmorrisdotca/meikyuu/levels";  // 1,024 recipes: four sizes of 256, each a little harder level by level`,
  `import { MEIKYUU_TALL_LEVELS } from "@johnmorrisdotca/meikyuu/levels/tall";  // 1,536 portrait mazes for a phone held upright`,
  `import { MEIKYUU_COLOSSAL_LEVELS } from "@johnmorrisdotca/meikyuu/levels/colossal";  // 128 mazes of about ten thousand cells, and 128 tall ones`,
  `mountMeikyuu(element, { recipe: level.code, stones: { limit: 5, reach: 2 } })  // marbles to shut the passages you have given up on`,
  `mountMeikyuu(element, { recipe: level.code, ratio: level.ratio, orientation: "auto" })  // a tall maze, lying down on a wide screen`,
  `import { solidLevelOf } from "@johnmorrisdotca/meikyuu/3d/levels";  // 960 mazes over a cube, a globe and the triangle solids`,
  `mountSolid(element, { recipe: "cube:7:prim:48213", stones: true })  // a maze over a solid, turned by dragging, drawn from face to face`,
  `difficultyOf(maze).score  // how hard it is to play, 0 to 100`,
  `drawMaze(maze, { path, hint, board: "wood" })  // the maze as SVG text`,
  `mountMeikyuu(element, { kind: "maze", level: 12, tap: true })  // a board to play, by touch and mouse`,
  `<meikyuu-board kind="arrows" level="5" board="wood"></meikyuu-board>`,
  `tapArrow(game, id)  // an arrow slides off, or bumps and costs a heart`,
];
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const page = `<!doctype html>
<html lang="en">
  <head>
    ${familyHead({
      id,
      title: "Meikyuu · draw your way through the labyrinth",
      description: "Play Meikyuu, a maze game of over a thousand levels: mazes on squares, hexagons, triangles, circles and cut-out shapes, from a few cells to thousands, tall ones for a phone held upright, with arrow puzzles too. Draw with a finger or the mouse, zoom in and out. Free and open source, in English and Japanese.",
      ogTitle: "Meikyuu maze game",
      ogDescription: "Draw a line through over a thousand mazes, from tiny to huge, in every shape, and tall ones for a phone. Arrow puzzles and mixed ones too.",
    })}
    <link rel="icon" href="${ICON}" />
    <link rel="stylesheet" href="family.css" />
    <link rel="stylesheet" href="meikyuu.css" />
  </head>
  <body>
    <main>
      ${familyHeader({ id, links: [{ href: "api.html", say: "pageApi" }] })}
      <div class="setup fam-row" data-help-en="Choose what to play: mazes, arrow puzzles, or mixed puzzles where a labyrinth unlocks arrows." data-help-ja="遊ぶものを選びます。迷路、矢印パズル、または迷宮で矢のカギを開けるミックスです。">
        <span class="fam-label" data-say="play"></span>
        <div class="fam-seg" role="group" data-say-label="play" id="kinds" data-testid="kinds"></div>
      </div>
      <div id="maze-filters">
        <div class="setup fam-row" data-help-en="Show only the levels in one shape: squares, hexagons, triangles, a circle, or a heart, leaf, star and more." data-help-ja="ひとつの形のレベルだけを表示します（四角、六角、三角、円、ハート、葉、星など）。">
          <span class="fam-label" data-say="shape"></span>
          <div class="fam-seg" role="group" data-say-label="shape" id="shapes" data-testid="shapes"></div>
        </div>
        <div class="setup fam-row" id="size-row" data-help-en="Show only one size: small, medium, large or huge (a tall maze has six sizes of its own). A huge one has thousands of cells and takes a while." data-help-ja="大きさをひとつに絞ります（小、中、大、巨大。縦長の迷路には6つの大きさがあります）。巨大な迷路は数千マスあり、時間がかかります。">
          <span class="fam-label" data-say="size"></span>
          <div class="fam-seg" role="group" data-say-label="size" id="sizes" data-testid="sizes"></div>
        </div>
        <div class="setup fam-row" data-help-en="Show only one way to play: in and out through the wall, find the goal, out from the centre, or collect the keys." data-help-ja="遊び方をひとつに絞ります（入口から出口、ゴールを探す、中心から外へ、鍵を集める）。">
          <span class="fam-label" data-say="way"></span>
          <div class="fam-seg" role="group" data-say-label="way" id="modes" data-testid="modes"></div>
        </div>
      </div>
      <div class="setup fam-row" id="orientation-row" data-help-en="Which way up the maze is shown. Auto stands a tall maze upright on a phone and lays it down on a wide screen. The line you have drawn is the same line either way." data-help-ja="迷路をどちら向きに表示するか。おまかせは、スマホでは縦長の迷路を立て、横長の画面では寝かせます。引いた線はどちら向きでも同じ線です。">
        <span class="fam-label" data-say="orientation"></span>
        <div class="fam-seg" role="group" data-say-label="orientation" id="orientations" data-testid="orientations"></div>
      </div>
      <div class="setup fam-row" data-help-en="Step to the next or the previous level, or type a number to go to it. Inside a size, every level is a little harder than the one before." data-help-ja="矢印で前後のレベルに移るか、番号を入力して移ります。どの大きさでも、前のレベルより少し難しくなっています。">
        <span class="fam-label" data-say="level"></span>
        <button type="button" class="fam-button" id="previous" data-testid="previous" data-say-label="previous">←</button>
        <input class="fam-field level-input" id="level-input" data-testid="level-input" type="number" min="1" step="1" inputmode="numeric" data-say-label="level" />
        <span class="of" id="level-of" data-testid="level-of"></span>
        <button type="button" class="fam-button" id="next" data-testid="next" data-say-label="next">→</button>
      </div>
      <p class="info" id="info" data-testid="info"></p>
      <div class="table fam-felt" id="board" data-testid="board"></div>
      <section class="settings" aria-labelledby="look-title">
        <h2 id="look-title" data-say="look"></h2>
        <div class="setup fam-row" data-help-en="Choose the board the maze is drawn on: paper, wood, or a coloured cloth." data-help-ja="迷路を描く盤（紙、木目、色つきの布）を選びます。"><span class="fam-label" data-say="board"></span><div class="fam-seg" role="group" data-say-label="board" id="board-look" data-testid="board-look"></div></div>
        <div class="setup fam-row" data-help-en="Choose the colour of the line you draw." data-help-ja="描く線の色を選びます。"><span class="fam-label" data-say="trail"></span><div class="fam-seg" role="group" data-say-label="trail" id="trail-look" data-testid="trail-look"></div></div>
        <h2 data-say="playing"></h2>
        <div class="setup fam-row" data-help-en="With this on, tapping a corridor runs the line along it as far as the next fork, so you can play with one finger tapping." data-help-ja="オンにすると、通路をタップするだけで、次の分かれ道まで線が伸びます。タップだけで遊べます。"><span class="fam-label" data-say="tap"></span><div class="fam-seg" role="group" data-say-label="tap" id="tap" data-testid="tap"></div></div>
        <div class="setup fam-row" data-help-en="Show or hide the Hint button, which lights the next stretch of the right way." data-help-ja="正しい道の次の部分を光らせる「ヒント」ボタンを、表示するか隠します。"><span class="fam-label" data-say="hints"></span><div class="fam-seg" role="group" data-say-label="hints" id="hints" data-testid="hints"></div></div>
        <div class="setup fam-row" data-help-en="Turn on small sounds for each step, key, arrow and win. They are made in your browser." data-help-ja="歩み、鍵、矢、クリアのたびに小さな音を鳴らします。音はブラウザの中で作っています。"><span class="fam-label" data-say="sound"></span><div class="fam-seg" role="group" data-say-label="sound" id="sound" data-testid="sound"></div></div>
        <div class="setup fam-row" data-help-en="Stones: with this on, a Stone button lays a marble on a cell beside your line, and the line cannot enter it. Press and hold on a cell does the same without the button." data-help-ja="石：オンにすると「石」ボタンで、線のとなりのマスに石を置けます。線は石の上を通れません。マスを長押ししても置けます。"><span class="fam-label" data-say="stones"></span><div class="fam-seg" role="group" data-say-label="stones" id="stones" data-testid="stones"></div></div>
        <div class="setup fam-row" data-help-en="How many stones can be down at once: a few that grow with the maze, or as many as you like." data-help-ja="同時に置ける石の数（迷路の大きさに応じた少数、または無制限）。"><span class="fam-label" data-say="stonesLimit"></span><div class="fam-seg" role="group" data-say-label="stonesLimit" id="stone-limit" data-testid="stone-limit"></div></div>
        <div class="setup fam-row" data-help-en="How far from your line a stone may be laid: right next to it, or up to two cells along the passages." data-help-ja="線からどこまで離れた場所に石を置けるか（すぐとなり、または通路づたいに2マスまで）。"><span class="fam-label" data-say="stonesReach"></span><div class="fam-seg" role="group" data-say-label="stonesReach" id="stone-reach" data-testid="stone-reach"></div></div>
        <p class="fam-fine" data-say="keep"></p>
      </section>
      <section class="more" aria-labelledby="shapes-title">
        <h2 id="shapes-title" data-say="shapesTitle"></h2>
        <p data-say="shapesText"></p>
        <ul class="shapes" id="gallery" data-testid="gallery"></ul>
      </section>
      <section class="more solids" aria-labelledby="solids-title">
        <h2 id="solids-title" data-say="solidsTitle"></h2>
        <p data-say="solidsText"></p>
        <div class="setup fam-row" data-help-en="Choose the solid: a cube, a globe, or a solid of four, eight or twenty triangles." data-help-ja="立体を選びます（立方体、球、または4・8・20枚の三角形でできた立体）。">
          <span class="fam-label" data-say="solid"></span>
          <div class="fam-seg" role="group" data-say-label="solid" id="solid-kinds" data-testid="solid-kinds"></div>
        </div>
        <div class="setup fam-row" data-help-en="Small, medium or large: the same solid cut into more and more cells." data-help-ja="小・中・大：同じ立体を、だんだん細かく区切ります。">
          <span class="fam-label" data-say="size"></span>
          <div class="fam-seg" role="group" data-say-label="size" id="solid-sizes" data-testid="solid-sizes"></div>
        </div>
        <div class="setup fam-row" data-help-en="Step to the next or the previous level, or type a number. Inside a size, every level is a little harder than the one before." data-help-ja="矢印で前後のレベルに移るか、番号を入力して移ります。どの大きさでも、前のレベルより少し難しくなっています。">
          <span class="fam-label" data-say="level"></span>
          <button type="button" class="fam-button" id="solid-previous" data-testid="solid-previous" data-say-label="previous">←</button>
          <input class="fam-field level-input" id="solid-level-input" data-testid="solid-level-input" type="number" min="1" step="1" inputmode="numeric" data-say-label="level" />
          <span class="of" id="solid-level-of" data-testid="solid-level-of"></span>
          <button type="button" class="fam-button" id="solid-next" data-testid="solid-next" data-say-label="next">→</button>
        </div>
        <p class="info" id="solid-info" data-testid="solid-info"></p>
        <div class="table fam-felt" id="solid-board" data-testid="solid-board"></div>
      </section>
      ${familyUnreviewed({ id })}
      <section class="more" aria-labelledby="more-title">
        <h2 id="more-title" data-say="moreTitle"></h2>
        <p data-say="moreText"></p>
        <ul class="uses">
          ${uses.map((line) => `<li><code>${escape(line)}</code></li>`).join("\n          ")}
        </ul>
      </section>
      <section class="more tag" aria-labelledby="tag-title">
        <h2 id="tag-title" data-say="tagTitle"></h2>
        <p data-say="tagText"></p>
        <meikyuu-board id="tag" data-testid="tag" kind="arrows" level="6"></meikyuu-board>
      </section>
      ${familyFooter({ id })}
    </main>
    <script>${FAMILY_SCRIPT}</script>
    <script type="module" src="dist/element-define.js"></script>
    <script type="module" src="demo.js"></script>
  </body>
</html>
`;

rmSync("site", { recursive: true, force: true });
mkdirSync("site", { recursive: true });
cpSync("demo", "site", { recursive: true });
cpSync("dist", "site/dist", { recursive: true });
writeFileSync("site/index.html", page);
// The API reference, made from the source: every export of every entry point.
writeFileSync("site/api.css", API_CSS);
writeFileSync("site/api.html", apiPage({ id, name: "Meikyuu", icon: ICON }));
console.log("site/ is ready: serve it, or let the Pages workflow publish it.");
