// Builds the static demo for GitHub Pages into ./site: the page, written here from the family's
// shared header and footer, with the family's stylesheet, Meikyuu's own, the page's script and the
// compiled library beside it.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

import { build } from "esbuild";

import { API_CSS, apiPage } from "./api.mjs";
import {
  FAMILY_EMBED_BUILDER_WORDS,
  FAMILY_SCRIPT,
  familyEmbedBuilder,
  familyFooter,
  familyHead,
  familyHeader,
  familyUnreviewed,
} from "./family-template.mjs";
import { publishThumbnails, thumbnailHead } from "./family-thumbnail.mjs";

const id = "meikyuu";
const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%232f5d4a'/%3E%3Ctext x='50' y='70' font-size='60' text-anchor='middle' fill='%23f3efe4'%3E迷%3C/text%3E%3C/svg%3E";

const uses = [
  `import { buildMaze, measureMaze } from "@johnmorrisdotca/meikyuu";`,
  `buildMaze({ shape: "heart", w: 25, h: 25, algorithm: "wilson", mode: "to-goal", seed: 5 })  // the same maze everywhere`,
  `measureMaze(maze).effort  // how many cells a person draws to solve it`,
  `import { MEIKYUU_MAZE_LEVELS } from "@johnmorrisdotca/meikyuu/levels";  // 1,024 recipes: four sizes of 256, each a little harder level by level`,
  `import { MEIKYUU_TALL_LEVELS } from "@johnmorrisdotca/meikyuu/levels/tall";  // 1,536 portrait mazes for a phone held upright`,
  `import { MEIKYUU_COLOSSAL_LEVELS } from "@johnmorrisdotca/meikyuu/levels/colossal";  // 128 mazes of about ten thousand cells, and 128 tall ones`,
  `mountMeikyuu(element, { recipe: level.code, stones: { limit: 5, reach: 2 } })  // marbles to shut the passages you have given up on`,
  `mountMeikyuu(element, { recipe: level.code, ratio: level.ratio, orientation: "auto" })  // a tall maze, lying down on a wide screen`,
  `import { solidLevelOf } from "@johnmorrisdotca/meikyuu/3d/levels";  // 1,600 mazes over a cube, a globe and the triangle solids (dice and shapes: 3d/levels/dice, 3d/levels/shapes)`,
  `mountSolid(element, { recipe: "cube:7:prim:48213", stones: true })  // a maze over a solid, turned by dragging, drawn from face to face`,
  `difficultyOf(maze).score  // how hard it is to play, 0 to 100`,
  `drawMaze(maze, { path, hint, board: "wood" })  // the maze as SVG text`,
  `mountMeikyuu(element, { kind: "maze", level: 12, tap: true })  // a board to play, by touch and mouse`,
  `<meikyuu-board kind="arrows" level="5" board="wood"></meikyuu-board>`,
  `tapArrow(game, id)  // an arrow slides off, or bumps and costs a heart`,
];
const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** What the family's card shows, for a reader who cannot see it (the README's top picture says the same). */
const ALT = "Meikyuu: a circular, a heart-shaped, a hexagon and a triangle maze, each drawn part of the way through.";

// The page is demo/index.html; each <!-- family:key --> in it is replaced by the text below.
const pageParts = {
  head: familyHead({
    id,
    title: "Meikyuu 迷宮 — Maze generator and maze game",
    description:
      "Play Meikyuu, a maze game of over a thousand levels: mazes on squares, hexagons, triangles, circles and cut-out shapes, from a few cells to thousands, tall ones for a phone held upright, with arrow puzzles too. Draw with a finger or the mouse, zoom in and out. Free and open source, in English and Japanese.",
    ogTitle: "Meikyuu 迷宮 — Maze generator and maze game",
    ogDescription:
      "Draw a line through over a thousand mazes, from tiny to huge, in every shape, and tall ones for a phone. Arrow puzzles and mixed ones too.",
  }),
  thumbnail: thumbnailHead(JSON.parse(readFileSync("package.json", "utf8")), { alt: ALT }),
  icon: ICON,

  header: familyHeader({
    id,
    links: [
      { href: "docs/index.html", say: "pageDocs" },
      { href: "api.html", say: "pageApi" },
    ],
  }),
  unreviewed: familyUnreviewed({ id }),
  uses: uses.map((line) => `<li><code>${escapeHtml(line)}</code></li>`).join("\n          "),
  footer: familyFooter({ id }),
  script: `<script>${FAMILY_SCRIPT}</script>\n    <script type="module" src="kazoku-parts.js"></script>\n    <script type="module" src="embed-panel.js"></script>`,
};
const page = readFileSync("demo/index.html", "utf8").replace(
  /<!-- family:([A-Za-z]+) -->/g,
  (_match, key) => pageParts[key],
);

rmSync("site", { recursive: true, force: true });
mkdirSync("site", { recursive: true });
cpSync("demo", "site", { recursive: true });
cpSync("dist", "site/dist", { recursive: true });
writeFileSync("site/index.html", page);
// The family's card, dark card and icon, at <site>/thumbnail.png, thumbnail-dark.png and icon.png.
publishThumbnails(".", "site");
// The family header's language picker and theme switch, as one small module for every page of the site (the demo, the builder, the API reference and the docs).
await build({
  stdin: {
    contents:
      'import "@johnmorrisdotca/kazoku-ui/language-picker/define";\nimport "@johnmorrisdotca/kazoku-ui/theme-switch/define";\n',
    resolveDir: process.cwd(),
  },
  outfile: "site/kazoku-parts.js",
  bundle: true,
  format: "esm",
  minify: true,
  logLevel: "silent",
});
// The demo's "Put it in your page": kazoku-ui's embed panel, filled with this package's choices and code.
await build({
  entryPoints: ["demo/embed-panel.js"],
  outfile: "site/embed-panel.js",
  external: ["./dist/*"],
  bundle: true,
  format: "esm",
  minify: true,
  logLevel: "silent",
});
// The API reference, made from the source: every export of every entry point.
writeFileSync("site/api.css", API_CSS);
writeFileSync("site/api.html", apiPage({ id, name: "Meikyuu", icon: ICON }));
console.log("site/ is ready: serve it, or let the Pages workflow publish it.");

writeFileSync(
  "site/family-embed-builder.js",
  `export const FAMILY_EMBED_BUILDER_WORDS = ${JSON.stringify(FAMILY_EMBED_BUILDER_WORDS)};\nexport ${familyEmbedBuilder.toString()};\n`,
);
const builderParts = {
  builderHead: familyHead({
    id,
    title: "Meikyuu · build a puzzle embed",
    description: "Choose a maze, arrow puzzle or daily level, preview it and copy the embed code.",
  }),
  builderHeader: familyHeader({
    id,
    links: [
      { href: "./", say: "toGallery" },
      { href: "docs/index.html", say: "pageDocs" },
      { href: "api.html", say: "pageApi" },
    ],
  }),
  unreviewed: familyUnreviewed({ id }),
  footer: familyFooter({ id }),
  script: `<script>${FAMILY_SCRIPT}</script>\n    <script type="module" src="kazoku-parts.js"></script>`,
};
writeFileSync(
  "site/builder.html",
  readFileSync("demo/builder.html", "utf8").replace(/<!-- family:([A-Za-z]+) -->/g, (_match, key) => builderParts[key]),
);

cpSync("demo/embed", "site/embed", { recursive: true });
for (const file of ["builder.js", "builder.css"]) cpSync(`demo/${file}`, `site/${file}`);
