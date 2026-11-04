import { embedSnippet } from "@johnmorrisdotca/kazoku-ui/embed-panel";
import "@johnmorrisdotca/kazoku-ui/embed-panel/define";
import { MEIKYUU_BOARD_NAMES } from "./dist/boards.js";
import { VERSION } from "./dist/index.js";
import { levelCount, MEIKYUU_KINDS } from "./dist/levels.js";

const SITE = "https://johnmorrisdotca.github.io/meikyuu/";
const WORDS = {
  en: {
    pick: "Kind of puzzle for the code",
    level: "Level",
    board: "Board",
    kinds: { maze: "Maze", arrows: "Arrows", mixed: "Mixed" },
    boards: { paper: "Paper", wood: "Wood", green: "Green", blue: "Blue", red: "Red", black: "Black" },
  },
  ja: {
    pick: "コードのパズルの種類",
    level: "レベル",
    board: "盤",
    kinds: { maze: "迷路", arrows: "矢印", mixed: "まぜ合わせ" },
    boards: { paper: "紙", wood: "木目", green: "緑", blue: "青", red: "赤", black: "黒" },
  },
};
const panel = document.getElementById("embed-panel");
const level = document.getElementById("embed-level");
const boards = document.getElementById("embed-boards");
const major = VERSION.split(".")[0];
const lang = () => (document.documentElement.lang === "ja" ? "ja" : "en");
const words = () => WORDS[lang()];
let kind = "maze";
let board = "paper";

const attrs = (size) => [
  ...(kind === "maze" ? [] : [["kind", kind]]),
  ["level", String(level.valueAsNumber || 1)],
  ...(board === "paper" ? [] : [["board", board]]),
  ["width", String(size)],
];
const query = () =>
  attrs(480)
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
const spec = (size, preview) => ({
  package: "@johnmorrisdotca/meikyuu",
  cdn: `https://cdn.jsdelivr.net/npm/@johnmorrisdotca/meikyuu@${major}`,
  tag: "meikyuu-board",
  element: "element/define",
  entries: [],
  attrs: attrs(size),
  name: "meikyuu",
  iframe: {
    src: `${preview ? "" : SITE}embed/?${query()}`,
    title: "Meikyuu maze puzzle",
    width: size + 16,
    height: size + 150,
  },
});
const refresh = () => {
  panel.openHref = `embed/?${query()}`;
  panel.update();
};
const picker = document.getElementById("embed-picker");
for (const id of MEIKYUU_KINDS) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.id = id;
  button.addEventListener("click", () => {
    kind = id;
    if (level.valueAsNumber > levelCount(kind)) level.value = "1";
    draw();
    refresh();
  });
  picker.append(button);
}
const draw = () => {
  panel.setAttribute("lang", lang());
  picker.setAttribute("aria-label", words().pick);
  for (const button of picker.querySelectorAll("button")) {
    button.textContent = words().kinds[button.dataset.id];
    button.setAttribute("aria-pressed", String(button.dataset.id === kind));
  }
  level.max = String(levelCount(kind));
  document.querySelector('label[for="embed-level"]').textContent = words().level;
  document.getElementById("embed-boards-label").textContent = words().board;
  for (const button of boards.querySelectorAll("button")) {
    button.textContent = words().boards[button.dataset.board];
    button.setAttribute("aria-pressed", String(button.dataset.board === board));
  }
  panel.update();
};

for (const name of MEIKYUU_BOARD_NAMES) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.board = name;
  button.addEventListener("click", () => {
    board = name;
    draw();
    refresh();
  });
  boards.append(button);
}
panel.generate = ({ kind: tab, size, preview }) => embedSnippet(tab, spec(size, preview));
panel.preview = ({ kind: tab, size }) => {
  if (tab === "iframe") return undefined;
  const element = document.createElement("meikyuu-board");
  for (const [name, value] of attrs(size)) element.setAttribute(name, value);
  return element;
};
level.addEventListener("input", () => {
  if (level.valueAsNumber >= 1 && level.valueAsNumber <= levelCount(kind)) refresh();
});
document.addEventListener("kazoku-languagechange", () => {
  draw();
  refresh();
});
draw();
refresh();
