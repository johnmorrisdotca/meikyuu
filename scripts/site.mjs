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
  `import { MEIKYUU_MAZE_LEVELS } from "@johnmorrisdotca/meikyuu/levels";  // 1,000 recipes, easiest first`,
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
      description: "Play Meikyuu, a maze game of a thousand levels: mazes on squares, hexagons, triangles, circles and cut-out shapes, from a few cells to thousands, with arrow puzzles too. Draw with a finger or the mouse, zoom in and out. Free and open source, in English and Japanese.",
      ogTitle: "Meikyuu maze game",
      ogDescription: "Draw a line through a thousand mazes, from tiny to huge, in every shape. Arrow puzzles and mixed ones too.",
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
        <div class="setup fam-row" data-help-en="Show only small, medium, large or huge mazes. A huge one has thousands of cells and takes a while." data-help-ja="小さい、ふつう、大きい、巨大の迷路だけを表示します。巨大な迷路は数千マスあり、時間がかかります。">
          <span class="fam-label" data-say="size"></span>
          <div class="fam-seg" role="group" data-say-label="size" id="sizes" data-testid="sizes"></div>
        </div>
        <div class="setup fam-row" data-help-en="Show only one way to play: in and out through the wall, find the goal, out from the centre, or collect the keys." data-help-ja="遊び方をひとつに絞ります（入口から出口、ゴールを探す、中心から外へ、鍵を集める）。">
          <span class="fam-label" data-say="way"></span>
          <div class="fam-seg" role="group" data-say-label="way" id="modes" data-testid="modes"></div>
        </div>
      </div>
      <div class="setup fam-row" data-help-en="Step to the next or the previous level, or type a number to go to it. Every level is harder than the one before." data-help-ja="矢印で前後のレベルに移るか、番号を入力して移ります。どのレベルも、前のレベルより難しくなっています。">
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
        <p class="fam-fine" data-say="keep"></p>
      </section>
      <section class="more" aria-labelledby="shapes-title">
        <h2 id="shapes-title" data-say="shapesTitle"></h2>
        <p data-say="shapesText"></p>
        <ul class="shapes" id="gallery" data-testid="gallery"></ul>
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
