import { VERSION } from "./dist/index.js";
import { MeikyuuBoard, MEIKYUU_EMBED_OPTION_KEYS } from "./dist/element.js";
import { MEIKYUU_KINDS, levelCount } from "./dist/levels.js";
import { MEIKYUU_BOARD_NAMES, MEIKYUU_TRAIL_NAMES } from "./dist/boards.js";
import { embedDay } from "./dist/embed-day.js";
import "./dist/element-define.js";
import { familyEmbedBuilder, FAMILY_EMBED_BUILDER_WORDS } from "./family-embed-builder.js";
const words = {
  en: { ...FAMILY_EMBED_BUILDER_WORDS.en,pageDocs:"Docs",pageApi:"API reference", pitch: "Choose a maze, arrow puzzle or UTC daily level, preview it, and copy its embed code.", name: "Meikyuu means labyrinth in Japanese.", nameLink: "About the name", foot: "The setup is in the link. No game or personal data is stored.", toGallery: "The puzzles", makerBoard: "A board", makerBoardSays: "A maze, arrow puzzle or a puzzle combining both.", copyLink: "Copy a link to this puzzle", badDay: "Use a real UTC date written YYYY-MM-DD, today or off.", badLevel: "Choose a level in this puzzle's list." },
  ja: { ...FAMILY_EMBED_BUILDER_WORDS.ja,pageDocs:"ドキュメント",pageApi:"API（英語）", pitch: "迷路、矢印パズル、またはUTCの日替わりレベルを選び、プレビューを確認して、ページに埋め込むコードをコピーできます。", name: "「迷宮」は英語の labyrinth に当たる日本語です。", nameLink: "名前について", foot: "設定はリンクに入ります。ゲームや個人情報は保存しません。", toGallery: "パズルの一覧", makerBoard: "盤", makerBoardSays: "迷路、矢印パズル、または両方を組み合わせたパズルです。", copyLink: "このパズルへのリンクをコピー", badDay: "実在する日付をYYYY-MM-DD形式で入力するか、today または off を指定してください。UTCの日付を使います。", badLevel: "このパズルの一覧にあるレベルを選んでください。" },
};
const row = (id, kind, en, ja, extra = {}) => ({ id, kind, group: "board", names: { board: id, mount: ({ lang: "language", "edge-pan": "edgePan", "turn-button": "turnButton" }[id] ?? id) }, say: { en: { label: en[0], help: en[1] }, ja: { label: ja[0], help: ja[1] } }, ...extra });
const options = [
  row("kind", "choice", ["Puzzle", "Maze, arrows or mixed."], ["パズル", "迷路、矢印、組合せから選びます。"], { default: "maze", choices: MEIKYUU_KINDS, choiceLabels: { ja: { maze: "迷路", arrows: "矢印", mixed: "組合せ" } } }),
  row("level", "number", ["Level", "A curated level; daily mode chooses the day's level."], ["レベル", "収録されたレベルです。日替わりでは、その日のレベルを選びます。"], { default: 1, range: { min: 1, max: Math.max(...MEIKYUU_KINDS.map(levelCount)), step: 1 } }),
  row("daily", "text", ["Daily", "YYYY-MM-DD, today or off, counted in UTC."], ["日替わり", "YYYY-MM-DD、today、offを指定します。UTCの日付を使います。"]),
  row("size", "choice", ["Display size", "Small, medium or large."], ["表示の大きさ", "小・中・大を選びます。"], { default: "medium", choices: ["small", "medium", "large"] }),
  row("width", "number", ["Width", "Pixels, fitting a narrower parent."], ["幅", "ピクセルで指定します。狭い表示枠にも収まります。"], { range: { min: 200, max: 1000, step: 10 } }),
  row("theme", "choice", ["Theme", "Light, dark or the device's preference."], ["配色", "明るい配色・暗い配色、または端末の設定に合わせます。"], { default: "auto", choices: ["auto", "light", "dark"] }),
  row("lang", "choice", ["Language", "The language of controls and spoken cells."], ["読み上げる言語", "操作ボタンと読み上げるマスの言語です。"], { choices: ["en", "ja"] }),
  row("label", "text", ["Spoken label", "An optional screen-reader label."], ["読み上げる名前", "スクリーンリーダー用の名前です。指定は任意です。"]),
  row("board", "choice", ["Board", "Paper, wood or a cloth."], ["テーブルの色", "紙、木、または布の盤です。"], { default: "paper", choices: MEIKYUU_BOARD_NAMES }),
  row("trail", "choice", ["Line colour", "The colour of the path."], ["線の色", "経路の線の色です。"], { default: "green", choices: MEIKYUU_TRAIL_NAMES, choiceLabels: { ja: { green: "緑", blue: "青", red: "赤", violet: "紫", orange: "橙" } } }),
  row("ratio", "choice", ["Box shape", "A square or the maze's own proportions."], ["表示枠の形", "正方形、または迷路の縦横比です。"], { default: "square", choices: ["square", "maze"], choiceLabels: { ja: { square: "正方形", maze: "迷路の縦横比" } } }),
  row("orientation", "choice", ["Orientation", "Automatic, portrait or landscape."], ["向き", "自動、縦向き、横向きから選びます。"], { default: "auto", choices: ["auto", "portrait", "landscape"], choiceLabels: { ja: { auto: "自動", portrait: "縦向き", landscape: "横向き" } } }),
  row("fit", "choice", ["Fit", "Fit both dimensions, the width or the height."], ["収め方", "縦横、幅、高さのどれかに収めます。"], { default: "both", choices: ["both", "width", "height"], choiceLabels: { ja: { both: "縦横", width: "幅", height: "高さ" } } }),
  row("gutter", "number", ["Gutter", "Room beside the box, in pixels."], ["余白", "表示枠の横に空ける幅をピクセルで指定します。"], { default: 24, range: { min: 0, max: 100, step: 2 } }),
  row("reserve", "number", ["Reserved height", "Other content on the screen, in pixels."], ["確保する高さ", "画面上の他の内容に使う高さをピクセルで指定します。"], { default: 200, range: { min: 0, max: 500, step: 10 } }),
  row("stone-limit", "text", ["Stone limit", "A whole number or none for unlimited stones."], ["石の上限", "整数、または上限なしのnoneを指定します。"]),
  row("stone-reach", "choice", ["Stone reach", "One or two cells from the path."], ["石を置ける距離", "経路から1マス、または2マスです。"], { default: "2", choices: ["1", "2"] }),
  ...["tap", "hints", "banner", "sound", "controls", "zoom", "pan", "edge-pan", "turn-button", "stones"].map((id, at) => row(id, "boolean", [["Tap to run", "A tap follows a corridor to its next fork."], ["Hints", "Offer the Hint button."], ["Solved message", "Show the message over a solved board."], ["Sound", "Include the sounds."], ["Controls", "Show buttons and progress lines."], ["Zoom pad", "Show the zoom controls."], ["Pan", "Drag to move the view rather than draw."], ["Edge pan", "Move the view when drawing reaches an edge."], ["Turn button", "Show a button to turn the maze."], ["Stones", "Allow stones beside the path."]][at], [["タップで進む", "タップで次の分岐まで進みます。"], ["ヒント", "ヒントボタンを表示します。"], ["解答時の表示", "解いた盤の上にメッセージを表示します。"], ["音", "音を含めます。"], ["操作ボタン", "ボタンと進み具合を表示します。"], ["拡大", "拡大・縮小の操作を表示します。"], ["移動", "ドラッグで線を引かず、表示を移動します。"], ["端で移動", "線が表示枠の端に来ると表示を移動します。"], ["回転ボタン", "迷路の向きを変えるボタンを表示します。"], ["石", "経路の横に石を置けます。"]][at], { default: ["hints", "banner", "controls", "zoom", "edge-pan"].includes(id) })),
];
const leftOut = { "board.recipe": "Custom recipes belong to host code; this builder selects published levels.", "mount.recipe": "Custom recipe strings or objects belong to host code.", "mount.wall": "Custom wall thickness belongs to host drawing options.", "mount.line": "Custom line thickness belongs to host drawing options." };
for (const name of ["onMove", "onSolve", "onKey", "onUnlock", "onBump", "onLose", "onStones"]) leftOut[`mount.${name}`] = "Host callbacks belong to options; native events carry the same detail.";
let mounted; const page = globalThis.familyLanguage({ id: "meikyuu", words, onChange: () => { docsLink(); mounted?.draw(); } });
const heights = {}; const key = (settings) => JSON.stringify(settings);
function problem(settings) { try { const day = embedDay(settings.daily); return day !== null || Number.isInteger(Number(settings.level ?? 1)) && Number(settings.level ?? 1) >= 1 && Number(settings.level ?? 1) <= levelCount(settings.kind ?? "maze") ? null : "badLevel"; } catch { return "badDay"; } }
const builder = familyEmbedBuilder({ id: "meikyuu", packageName: "@johnmorrisdotca/meikyuu", major: VERSION.split(".")[0], site: "https://johnmorrisdotca.github.io/meikyuu/", title: "Meikyuu · puzzle", titleJa: "迷宮の埋め込み", options, leftOut, groups: { board: { en: "The puzzle", ja: "パズルの設定" } }, makers: { board: { names: "board", element: "board", tag: "meikyuu-board", embed: "embed/", required: ["kind", "level", "size"], description: "makerBoardSays", formats: ["element", "iframe", "module", "react", "vue", "svelte", "angular", "html", "url"], width: 640, height: (settings) => heights[key(settings)] ?? 1100 } }, code: ({ maker, format, settings }) => {
  if (problem(settings) !== null) return null;
  if ((format === "iframe" || format === "url") && settings.lang === undefined) return builder.codeFor(maker, format, options, { ...settings, lang: page.lang }); return undefined;
} });
builder.validateCoverage({ board: MeikyuuBoard.observedAttributes, mount: MEIKYUU_EMBED_OPTION_KEYS });
mounted = builder.mount({ words, language: () => page, initial: { board: { kind: "maze", level: 1, size: "medium", lang: page.lang } }, renderPreview: ({ stage, attrs, settings, note, say }) => {
  if (problem(settings) !== null) { note.textContent = say(problem(settings)); return { destroy() {} }; }
  const board = globalThis.document.createElement("meikyuu-board"); for (const [name, value] of attrs) board.setAttribute(name, value);
  board.addEventListener("meikyuu-load", () => { heights[key(settings)] = Math.max(900, Math.ceil(board.getBoundingClientRect().height) + 240); mounted?.refreshCode(); }); stage.append(board); return { destroy() { board.remove(); } };
} });

function docsLink(){document.querySelector('[data-say="pageDocs"]')?.setAttribute("href",page.lang==="ja"?"docs/ja/index.html":"docs/index.html");}
docsLink();
