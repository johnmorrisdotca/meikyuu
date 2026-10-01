// The demo page's own script: a Meikyuu board to play, any of the three lists and any level, played by the package's own
// `mountMeikyuu` (the drawing, the line, the zoom, the arrows), with a chooser by shape, size and way to play, the options the
// package has, a gallery of the shapes, kept on this device between visits, and spoken in the language the header's chooser picks.
import { buildMaze, MEIKYUU_MODES, MEIKYUU_SHAPES } from "./dist/index.js";
import { drawMaze, meikyuuSay, MEIKYUU_BOARD_NAMES, MEIKYUU_BOARDS, MEIKYUU_TRAIL_NAMES, MEIKYUU_TRAILS } from "./dist/draw-entry.js";
import { mountMeikyuu } from "./dist/play-entry.js";
import { levelCount, levelOf, levelsOf, MEIKYUU_KINDS, MEIKYUU_SIZES, sizeOf } from "./dist/levels.js";

// The page's own words, in the two languages it speaks. Set as text, never as HTML. The names of the shapes and the ways to play are the package's own.
const WORDS = {
  en: {
    pageApi: "API reference",
    pitch: "Draw a line through the labyrinth with a finger or the mouse. A thousand mazes, from a few cells to thousands, in every shape, and arrow puzzles too. Zoom in and out with a pinch or the wheel.",
    name: "Meikyuu (迷宮) is Japanese for labyrinth: 迷, to be lost, and 宮, a palace.",
    nameLink: "About the name",
    play: "Play",
    kinds: { maze: "Mazes", arrows: "Arrows", mixed: "Mixed" },
    shape: "Shape",
    size: "Size",
    way: "Way to play",
    all: "All",
    sizes: { small: "Small", medium: "Medium", large: "Large", huge: "Huge" },
    level: "Level",
    previous: "Previous level",
    next: "Next level",
    matching: (n) => `${n} levels match.`,
    look: "Look",
    board: "Board",
    boards: { paper: "Paper", wood: "Wood", green: "Green", blue: "Blue", red: "Red", black: "Black" },
    trail: "Line",
    trails: { green: "Green", blue: "Blue", red: "Red", violet: "Violet", orange: "Orange" },
    playing: "Playing",
    tap: "Tap to extend",
    hints: "Hints",
    sound: "Sound",
    on: "On",
    off: "Off",
    keep: "Your progress and these choices stay on this device.",
    solvedHere: "Solved",
    mazeInfo: (shape, size, mode, cells, rating) => `${shape} · ${size} · ${mode} · ${cells} cells · difficulty ${rating} of 100`,
    arrowsInfo: (shape, arrows, rating) => `${shape} board · ${arrows} arrows · difficulty ${rating} of 100`,
    mixedInfo: (shape, arrows, locked, rating) => `${shape} board · ${arrows} arrows, ${locked} locked · a labyrinth hides the unlock button · difficulty ${rating} of 100`,
    shapesTitle: "The shapes",
    shapesText: "Each shape is a maze of its own. Press one to play its levels.",
    moreTitle: "Using it",
    moreText: "The board above is the package itself: the rules, the drawing and every level. Each line below is all it takes.",
    tagTitle: "As a tag",
    tagText: "The same board in one element, with no framework: an arrow puzzle, level 6.",
    foot: "Every level is a short recipe that rebuilds the same maze in every browser, and the list is checked on every build to get harder, level by level. Your progress stays on this device.",
  },
  ja: {
    pageApi: "API（英語）",
    pitch: "指やマウスで、迷宮の中に線を引いて進みます。数マスから数千マスまで千の迷路が、あらゆる形で並びます。矢印パズルもあります。ピンチやホイールで拡大・縮小できます。",
    name: "「迷宮」は、迷（道に迷う）と宮（宮殿）で、ラビリンスのことです。",
    nameLink: "名前について（英語）",
    play: "遊ぶ",
    kinds: { maze: "迷路", arrows: "矢印", mixed: "ミックス" },
    shape: "形",
    size: "大きさ",
    way: "遊び方",
    all: "すべて",
    sizes: { small: "小", medium: "中", large: "大", huge: "巨大" },
    level: "レベル",
    previous: "前のレベル",
    next: "次のレベル",
    matching: (n) => `${n}レベルが条件に合います。`,
    look: "見た目",
    board: "盤",
    boards: { paper: "紙", wood: "木目", green: "緑", blue: "青", red: "赤", black: "黒" },
    trail: "線",
    trails: { green: "緑", blue: "青", red: "赤", violet: "紫", orange: "橙" },
    playing: "遊び方の設定",
    tap: "タップで伸ばす",
    hints: "ヒント",
    sound: "音",
    on: "あり",
    off: "なし",
    keep: "進み具合とこの設定は、この端末に残ります。",
    solvedHere: "解けた",
    mazeInfo: (shape, size, mode, cells, rating) => `${shape}・${size}・${mode}・${cells}マス・難しさ${rating}／100`,
    arrowsInfo: (shape, arrows, rating) => `${shape}の盤・矢${arrows}本・難しさ${rating}／100`,
    mixedInfo: (shape, arrows, locked, rating) => `${shape}の盤・矢${arrows}本（うち${locked}本に鍵）・迷宮に解除ボタンが隠れています・難しさ${rating}／100`,
    shapesTitle: "いろいろな形",
    shapesText: "どの形も、それぞれ別の迷路です。押すと、その形のレベルを遊べます。",
    moreTitle: "使い方",
    moreText: "上の盤面は、このパッケージそのもの（ルール、描き方、すべてのレベル）で動いています。下の各行がそれぞれ必要なコードのすべてです。",
    tagTitle: "タグとして",
    tagText: "同じ盤面を、フレームワークなしの一つの要素で。矢印パズルのレベル6です。",
    foot: "どのレベルも、どのブラウザでも同じ迷路を作り直せる短いレシピです。レベルが進むごとに難しくなることを、ビルドのたびに確かめています。進み具合はこの端末に残ります。",
  },
};

const KEY = "meikyuu.page";
const params = new URLSearchParams(location.search);
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
};
const write = (value) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* Not remembered on this device; the board still plays. */
  }
};
const pick = (asked, allowed, kept, fallback) => (allowed.includes(asked) ? asked : allowed.includes(kept) ? kept : fallback);
const flag = (asked, kept, fallback) => (asked === "on" ? true : asked === "off" ? false : typeof kept === "boolean" ? kept : fallback);

const kept = read();
let kind = pick(params.get("kind"), MEIKYUU_KINDS, kept.kind, "maze");
const levels = { maze: 1, arrows: 1, mixed: 1, ...(kept.levels ?? {}) };
const solved = { maze: [], arrows: [], mixed: [], ...(kept.solved ?? {}) };
const filter = {
  shape: pick(params.get("shape"), MEIKYUU_SHAPES, kept.filter?.shape, "all"),
  size: pick(params.get("size"), MEIKYUU_SIZES, kept.filter?.size, "all"),
  mode: pick(params.get("mode"), MEIKYUU_MODES, kept.filter?.mode, "all"),
};
const look = {
  board: pick(params.get("board"), MEIKYUU_BOARD_NAMES, kept.look?.board, "paper"),
  trail: pick(params.get("trail"), MEIKYUU_TRAIL_NAMES, kept.look?.trail, "green"),
};
const play = {
  tap: flag(params.get("tap"), kept.play?.tap, false),
  hints: flag(params.get("hints"), kept.play?.hints, true),
  sound: flag(params.get("sound"), kept.play?.sound, false),
};
let mount = null;

const language = familyLanguage({ id: "meikyuu", words: WORDS, onChange: () => render() });
const say = (key, ...args) => {
  const word = WORDS[language.lang][key];
  return typeof word === "function" ? word(...args) : word;
};
const pkg = (key, values) => meikyuuSay(language.lang, key, values);
const keep = () => write({ kind, levels, solved, filter, look, play });

const host = document.getElementById("board");

function seg(parent, items, chosen, choose, labelOf, extra) {
  parent.replaceChildren(
    ...items.map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.value = String(item);
      button.setAttribute("aria-pressed", String(item === chosen));
      extra?.(button, item);
      button.append(labelOf(item));
      button.addEventListener("click", () => choose(item));
      return button;
    }),
  );
}

/** The levels of the kind that pass the filters (only mazes have any). */
function matching() {
  const all = levelsOf(kind);
  if (kind !== "maze") return all;
  return all.filter((each) => (filter.shape === "all" || each.recipe.shape === filter.shape) && (filter.mode === "all" || each.recipe.mode === filter.mode) && (filter.size === "all" || sizeOf(each.cells) === filter.size));
}

function patch(name) {
  const board = MEIKYUU_BOARDS[name];
  const span = document.createElement("span");
  span.className = "patch";
  span.style.background = board.paper;
  span.style.borderColor = board.frame;
  return span;
}
function swatch(name) {
  const span = document.createElement("span");
  span.className = "swatch";
  span.style.background = MEIKYUU_TRAILS[name].light;
  return span;
}

function info() {
  const current = levelOf(kind, levels[kind]);
  const done = solved[kind].includes(levels[kind]) ? ` · ✓ ${say("solvedHere")}` : "";
  if (kind === "maze") {
    const { recipe } = current;
    const size = ["square", "hex", "triangle"].includes(recipe.shape) ? `${recipe.w}×${recipe.h}` : `${recipe.w}`;
    return say("mazeInfo", pkg(`shape_${recipe.shape}`), size, pkg(`mode_${recipe.mode.replace(/-/g, "_")}`), current.cells, current.rating) + done;
  }
  const game = mount?.arrowGame();
  const arrows = game?.board.arrows.length ?? 0;
  if (kind === "arrows") return say("arrowsInfo", pkg(`shape_${current.recipe.shape}`), arrows, current.rating) + done;
  return say("mixedInfo", pkg(`shape_${current.recipe.arrows.shape}`), arrows, game?.board.locked.filter(Boolean).length ?? 0, current.rating) + done;
}

function render() {
  language.say();
  const list = matching();
  seg(document.getElementById("kinds"), MEIKYUU_KINDS, kind, (each) => choose(each, null), (each) => say("kinds")[each]);
  document.getElementById("maze-filters").hidden = kind !== "maze";
  seg(document.getElementById("shapes"), ["all", ...MEIKYUU_SHAPES], filter.shape, (each) => refilter({ shape: each }), (each) => (each === "all" ? say("all") : pkg(`shape_${each}`)));
  seg(document.getElementById("sizes"), ["all", ...MEIKYUU_SIZES], filter.size, (each) => refilter({ size: each }), (each) => (each === "all" ? say("all") : say("sizes")[each]));
  seg(document.getElementById("modes"), ["all", ...MEIKYUU_MODES], filter.mode, (each) => refilter({ mode: each }), (each) => (each === "all" ? say("all") : pkg(`mode_${each.replace(/-/g, "_")}`)));
  const count = levelCount(kind);
  const number = levels[kind];
  const input = document.getElementById("level-input");
  if (document.activeElement !== input) input.value = String(number);
  input.max = String(count);
  document.getElementById("level-of").textContent = ` / ${count}`;
  const at = list.findIndex((each) => each.number >= number);
  document.getElementById("previous").disabled = list.length === 0 || list[0].number >= number;
  document.getElementById("next").disabled = list.length === 0 || list[list.length - 1].number <= number;
  void at;
  document.getElementById("info").textContent = `${info()}${kind === "maze" && list.length !== count ? ` ${say("matching", list.length)}` : ""}`;
  seg(document.getElementById("board-look"), MEIKYUU_BOARD_NAMES, look.board, (each) => change({ board: each }), (each) => say("boards")[each], (button, each) => button.append(patch(each)));
  seg(document.getElementById("trail-look"), MEIKYUU_TRAIL_NAMES, look.trail, (each) => change({ trail: each }), (each) => say("trails")[each], (button, each) => button.append(swatch(each)));
  const onOff = (id, key) => seg(document.getElementById(id), [true, false], play[key], (value) => changePlay({ [key]: value }), (value) => say(value ? "on" : "off"));
  onOff("tap", "tap");
  onOff("hints", "hints");
  onOff("sound", "sound");
  gallery();
}

function change(next) {
  Object.assign(look, next);
  keep();
  mount?.set(look);
  render();
}
function changePlay(next) {
  Object.assign(play, next);
  keep();
  mount?.set(play);
  render();
}
function refilter(next) {
  Object.assign(filter, next);
  // The level shown stays if it still matches; otherwise the first that does, after it.
  const list = matching();
  const current = levels[kind];
  if (list.length > 0 && !list.some((each) => each.number === current)) {
    const after = list.find((each) => each.number > current) ?? list[list.length - 1];
    choose(kind, after.number);
    return;
  }
  keep();
  render();
}

/** The shapes, each one a maze of its own as the package draws it, to play the levels of. */
const SAMPLES = { square: [10, 8], hex: [9, 8], triangle: [12, 6], circle: [6, 6], heart: [17, 17], leaf: [17, 17], star: [23, 23], ring: [15, 15], diamond: [15, 15], cross: [13, 13], moon: [17, 17], hexagon: [4, 4], pyramid: [7, 7] };
const drawn = new Map();
function gallery() {
  const list = document.getElementById("gallery");
  list.replaceChildren(
    ...MEIKYUU_SHAPES.map((shape) => {
      const [w, h] = SAMPLES[shape];
      if (!drawn.has(shape)) drawn.set(shape, buildMaze({ shape, w, h, algorithm: "wilson", mode: "enter-leave", seed: 4 }));
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.shape = shape;
      button.setAttribute("aria-pressed", String(kind === "maze" && filter.shape === shape));
      button.innerHTML = drawMaze(drawn.get(shape), { language: language.lang, label: "", wall: 0.16 });
      button.firstElementChild.setAttribute("aria-hidden", "true");
      button.firstElementChild.removeAttribute("role");
      const name = document.createElement("span");
      name.textContent = pkg(`shape_${shape}`);
      button.append(name);
      button.addEventListener("click", () => {
        kind = "maze";
        filter.shape = shape;
        filter.size = "all";
        filter.mode = "all";
        const first = levelsOf("maze").find((each) => each.recipe.shape === shape);
        choose("maze", first.number);
        document.getElementById("board").scrollIntoView({ block: "nearest" });
      });
      item.append(button);
      return item;
    }),
  );
}

function put() {
  const entry = { kind, level: levels[kind] };
  if (mount === null) {
    mount = mountMeikyuu(host, {
      ...entry,
      ...look,
      ...play,
      onSolve: () => {
        if (!solved[kind].includes(levels[kind])) solved[kind] = [...solved[kind], levels[kind]];
        keep();
        render();
      },
    });
  } else mount.load(entry);
  host.dataset.level = String(levels[kind]);
  host.dataset.kind = kind;
}

function choose(nextKind, nextLevel) {
  kind = nextKind;
  const count = levelCount(kind);
  const asked = nextLevel ?? (params.has("level") && !params.has("used") ? Number(params.get("level")) : levels[kind]);
  params.set("used", "1");
  levels[kind] = Math.min(Math.max(1, Number.isInteger(asked) ? asked : 1), count);
  keep();
  put();
  render();
}

document.getElementById("previous").addEventListener("click", () => {
  const list = matching().filter((each) => each.number < levels[kind]);
  if (list.length > 0) choose(kind, list[list.length - 1].number);
});
document.getElementById("next").addEventListener("click", () => {
  const list = matching().filter((each) => each.number > levels[kind]);
  if (list.length > 0) choose(kind, list[0].number);
});
document.getElementById("level-input").addEventListener("change", (event) => {
  const asked = Number(event.target.value);
  if (!Number.isInteger(asked)) return;
  // A level typed in that the filters hide takes them off.
  if (!matching().some((each) => each.number === asked)) Object.assign(filter, { shape: "all", size: "all", mode: "all" });
  choose(kind, asked);
});

choose(kind, null);
host.dataset.ready = "true";
