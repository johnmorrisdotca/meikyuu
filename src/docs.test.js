// The documents and the demo, held to the source. Plain JavaScript, so that reading files needs no Node types.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

import { describe, expect, it } from "vitest";

import { MEIKYUU_ALGORITHMS } from "./algorithms.ts";
import { ARROW_HEARTS } from "./arrowGame.ts";
import { ARROW_SHAPES, MEIKYUU_MOST_ARROW_CELLS } from "./arrows.ts";
import { MEIKYUU_BOARD_NAMES, MEIKYUU_TRAIL_NAMES } from "./boards.ts";
import { MeikyuuBoard } from "./element.ts";
import { MEIKYUU_SHAPES } from "./grid.ts";
import { MEIKYUU_ARROW_LEVELS, MEIKYUU_MAZE_LEVELS, MEIKYUU_MIXED_LEVELS, MEIKYUU_SIZES, sizeOf } from "./levels.ts";
import { MEIKYUU_MODES, MEIKYUU_MOST_CELLS, MEIKYUU_MOST_KEYS, layoutCells, parseRecipe } from "./maze.ts";
import { EFFORT_LEAST, EFFORT_MOST } from "./measure.ts";
import { MEIKYUU_PLAY_STYLE } from "./playStyle.ts";
import { MEIKYUU_STRINGS } from "./strings.ts";
import { MEIKYUU_STYLE } from "./style.ts";
import { MOST_CELL_PIXELS } from "./viewport.ts";
import { VERSION } from "./version.ts";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const readme = readFileSync("README.md", "utf8");

/** A README section's text, from its heading to the next heading of the same level. */
const section = (heading) => {
  const from = readme.indexOf(`\n## ${heading}\n`);
  if (from < 0) throw new Error(`no “## ${heading}” in the README`);
  const next = readme.indexOf("\n## ", from + 5);
  return readme.slice(from, next < 0 ? undefined : next);
};

/** The cells of every table row in a piece of text, header and rule rows left out. */
const rows = (text) =>
  text
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|[\s|:-]+\|$/.test(line))
    .map((line) => line.split(/(?<!\\)\|/).slice(1, -1).map((cell) => cell.replace(/\\\|/g, "|").trim()));

/** The custom properties a block of CSS declares: { name: value }. */
const declarations = (css) => Object.fromEntries([...css.matchAll(/(--[a-z0-9-]+):\s*([^;}]+)[;}]/g)].map((match) => [match[1], match[2].trim()]));

describe("the documents", () => {
  it("say the version package.json says, in the code and at the top of the changelog", () => {
    expect(VERSION).toBe(pkg.version);
    expect(readFileSync("CHANGELOG.md", "utf8")).toMatch(new RegExp(`^## \\[${pkg.version.replace(/\./g, "\\.")}\\] `, "m"));
  });

  it("name in the README every entry package.json exports, and no other", () => {
    const exported = Object.keys(pkg.exports).filter((key) => key !== ".").map((key) => `${pkg.name}/${key.slice(2)}`);
    for (const entry of exported) expect(readme, entry).toContain(`\`${entry}\``);
  });

  it("name in the README every shape, every way to play, every algorithm, every board, every line colour and every attribute of the element", () => {
    for (const name of [...MEIKYUU_SHAPES, ...MEIKYUU_MODES, ...MEIKYUU_ALGORITHMS, ...MEIKYUU_BOARD_NAMES, ...MEIKYUU_TRAIL_NAMES]) expect(readme, name).toContain(`\`${name}\``);
    for (const attribute of MeikyuuBoard.observedAttributes) expect(readme, attribute).toMatch(new RegExp(`\`${attribute}[\`=]|\`${attribute}\``));
  });

  it("say in the README how many levels there are, as the list has them", () => {
    expect(readme).toContain(`${MEIKYUU_MAZE_LEVELS.length.toLocaleString("en-US")} maze levels`);
  });

  it("keep the family's stylesheet byte for byte, as its first line's hash says", () => {
    const [first, ...rest] = readFileSync("demo/family.css", "utf8").split("\n");
    const hash = /sha256 of every line after this one: ([0-9a-f]{64})/.exec(first)?.[1];
    expect(createHash("sha256").update(rest.join("\n")).digest("hex")).toBe(hash);
  });
});

describe("the README's promises", () => {
  it("has the sections a package of this family has, each with something in it", () => {
    for (const heading of ["In 30 seconds", "Who it is for", "Features", "Use it in your project", "API", "Theming", "Limits", "Browser support", "Languages", "Roadmap", "Architecture", "The name", "Where it comes from", "Development", "Contributing", "Changes", "Licence"]) {
      expect(section(heading).length, heading).toBeGreaterThan(heading.length + 40);
    }
  });

  it("installs the package it is, and every version it names is the one in package.json", () => {
    expect(readme).toContain(`npm install ${pkg.name}`);
    const major = pkg.version.split(".")[0];
    const named = [...readme.matchAll(/@johnmorrisdotca\/meikyuu@([\w.-]+)/g)].map((match) => match[1]);
    expect(named.length).toBeGreaterThan(0);
    for (const version of named) expect(version).toBe(major);
    expect(readme).not.toMatch(/\bmeikyuu@\d+\.\d+/);
  });

  it("links only to files that exist", () => {
    const targets = [...readme.matchAll(/\]\((?!https?:|#|mailto:)([^)\s#]+)/g)].map((match) => match[1]);
    expect(targets.length).toBeGreaterThan(5);
    for (const target of targets) expect(existsSync(target), target).toBe(true);
  });

  it("lists every package of the family, with its kana, as the demo's footer does", () => {
    const template = readFileSync("scripts/family-template.mjs", "utf8");
    const family = [...template.matchAll(/\{ id: "([\w-]+)", name: "(\w+)", kana: "([^"]+)" \}/g)].map((match) => ({ id: match[1], name: match[2], kana: match[3] }));
    expect(family.length).toBeGreaterThanOrEqual(16);
    const block = readme.slice(readme.indexOf("### The family"), readme.indexOf("\n## ", readme.indexOf("### The family")));
    for (const { id, name, kana } of family) expect(block, id).toContain(`- [${name}](https://github.com/johnmorrisdotca/${id}) (${kana}`);
    const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
    expect(block).toContain(`one of ${words[family.length]} packages`);
    expect([...block.matchAll(/^- \[/gm)]).toHaveLength(family.length);
  });

  it("gives every colour of the drawing, and of the playable board, with its light and dark values", () => {
    const light = declarations(MEIKYUU_STYLE.slice(0, MEIKYUU_STYLE.indexOf("@media")));
    const dark = declarations(MEIKYUU_STYLE.slice(MEIKYUU_STYLE.indexOf(':root[data-theme="dark"]')).split("}")[0]);
    const play = MEIKYUU_PLAY_STYLE.slice(MEIKYUU_STYLE.length);
    const playLight = declarations(play.slice(0, play.indexOf("@media")));
    const playDark = declarations(play.slice(play.indexOf(':root[data-theme="dark"]')).split("}")[0]);
    const table = Object.fromEntries(rows(section("Theming")).filter((row) => row[0].startsWith("`--")).map((row) => [row[0].replace(/`/g, ""), row]));
    expect(Object.keys(table).sort()).toEqual([...Object.keys(light), ...Object.keys(playLight)].sort());
    for (const [name, value] of Object.entries({ ...light, ...playLight })) {
      const row = table[name];
      expect(row[2], name).toBe(`\`${value}\``);
      const other = { ...dark, ...playDark }[name];
      expect(row[3], name).toBe(other === undefined || other === value ? "the same" : `\`${other}\``);
    }
  });

  it("states the numbers of levels, and how they divide, as the lists have them", () => {
    const count = (name) => MEIKYUU_MAZE_LEVELS.filter((level) => name(level)).length;
    expect(readme).toContain(`${MEIKYUU_MAZE_LEVELS.length.toLocaleString("en-US")} maze levels, ${MEIKYUU_ARROW_LEVELS.length} arrow levels and ${MEIKYUU_MIXED_LEVELS.length} mixed levels`);
    expect(readme).toContain(`${MEIKYUU_MAZE_LEVELS.length.toLocaleString("en-US")} maze levels, ${MEIKYUU_ARROW_LEVELS.length} arrow levels, ${MEIKYUU_MIXED_LEVELS.length} mixed`);
    expect(readme).toContain(`level ${MEIKYUU_MAZE_LEVELS.length.toLocaleString("en-US")} has ${MEIKYUU_MAZE_LEVELS.at(-1).cells.toLocaleString("en-US")} cells`);
    const sizes = MEIKYUU_SIZES.map((size) => count((level) => sizeOf(level.cells) === size));
    expect(readme).toContain(`${sizes[0]} levels are small (under 150 cells), ${sizes[1]} medium (under 800), ${sizes[2]} large (under 4,000) and ${sizes[3]} huge`);
    const byShape = MEIKYUU_SHAPES.map((shape) => [shape, count((level) => level.recipe.shape === shape)]).sort((a, b) => b[1] - a[1] || MEIKYUU_SHAPES.indexOf(a[0]) - MEIKYUU_SHAPES.indexOf(b[0]));
    for (const [shape, n] of byShape) expect(readme, shape).toContain(`${shape} ${n}`);
    for (const mode of MEIKYUU_MODES) expect(readme, mode).toContain(`\`${mode}\` ${count((level) => level.recipe.mode === mode)}`);
  });

  it("says how many algorithms there are, here and in the package's description", () => {
    const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen"];
    expect(readme).toContain(`${words[MEIKYUU_ALGORITHMS.length][0].toUpperCase()}${words[MEIKYUU_ALGORITHMS.length].slice(1)} algorithms`);
    expect(pkg.description).toContain(`made by ${words[MEIKYUU_ALGORITHMS.length]} algorithms`);
  });

  it("states the limits as the code has them", () => {
    const limits = section("Limits");
    const biggest = MEIKYUU_MAZE_LEVELS.reduce((a, level) => (level.cells > a.cells ? level : a));
    const smallest = MEIKYUU_MAZE_LEVELS.reduce((a, level) => (level.cells < a.cells ? level : a));
    expect(limits).toContain(`| ${MEIKYUU_MAZE_LEVELS.length.toLocaleString("en-US")} maze levels, ${MEIKYUU_ARROW_LEVELS.length} arrow levels, ${MEIKYUU_MIXED_LEVELS.length} mixed |`);
    expect(limits).toContain(`${biggest.cells.toLocaleString("en-US")} cells (level ${biggest.number}); the smallest is ${smallest.cells} (level ${smallest.number}) |`);
    expect([sizeOf(149), sizeOf(150), sizeOf(799), sizeOf(800), sizeOf(3999), sizeOf(4000)]).toEqual(["small", "medium", "medium", "large", "large", "huge"]);
    expect(limits).toContain("small under 150 cells, medium under 800, large under 4,000, huge beyond");
    expect(parseRecipe("square:1x1:backtracker:to-goal:1")).toBeNull();
    expect(parseRecipe("square:2x2:backtracker:to-goal:1")).not.toBeNull();
    expect(parseRecipe("square:100000x100000:backtracker:to-goal:1")).toBeNull();
    const biggestLaidOut = Math.max(...MEIKYUU_MAZE_LEVELS.map(({ recipe }) => layoutCells(recipe.shape, recipe.w, recipe.h)));
    expect(limits).toContain(`at most ${MEIKYUU_MOST_CELLS.toLocaleString("en-US")} cells laid out`);
    expect(limits).toContain(`the biggest level's ${biggestLaidOut.toLocaleString("en-US")}`);
    expect(limits).toContain(`| Keys in a recipe | ${MEIKYUU_MOST_KEYS},`);
    const biggestBoard = Math.max(...MEIKYUU_ARROW_LEVELS.map(({ recipe }) => recipe.w * recipe.h));
    expect(limits).toContain(`at most ${MEIKYUU_MOST_ARROW_CELLS.toLocaleString("en-US")} cells: a little over twice the biggest level's ${biggestBoard.toLocaleString("en-US")}`);
    expect(limits).toContain(`| ${MEIKYUU_SHAPES.length} shapes, ${MEIKYUU_MODES.length} ways to play, ${MEIKYUU_ALGORITHMS.length} algorithms (Eller's: square mazes only) |`);
    expect(limits).toContain(`| ${ARROW_SHAPES.length} pictures |`);
    expect(limits).toContain(`| Hearts in an arrow puzzle | ${ARROW_HEARTS} |`);
    expect(limits).toContain(`from ${EFFORT_LEAST} to ${EFFORT_MOST.toLocaleString("en-US")}, rated 1 to 100`);
    expect(limits).toContain(`until a cell is ${MOST_CELL_PIXELS} pixels wide`);
  });

  it("keeps docs/strings-ja.md as the board's words, English beside Japanese (pnpm docs:make rewrites it)", () => {
    const cell = (text) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");
    const lines = ["# Meikyuu's words, in English and Japanese", "", "Made from `src/strings.ts` by `pnpm docs:make`; a test fails if the two differ, so this list is never out of date.", "", "**The Japanese has not yet been reviewed by a native reader.** If a line reads wrongly or unnaturally, please", "open a *Fix a translation* issue with the string's name. `{name}` and the other braces are filled in when shown.", "", "| Name | English | Japanese |", "| --- | --- | --- |"];
    for (const key of Object.keys(MEIKYUU_STRINGS.en)) lines.push(`| \`${key}\` | ${cell(MEIKYUU_STRINGS.en[key])} | ${cell(MEIKYUU_STRINGS.ja[key] ?? "")} |`);
    const made = `${lines.join("\n")}\n`;
    if (process.env.UPDATE_DOCS === "1") writeFileSync("docs/strings-ja.md", made);
    expect(readFileSync("docs/strings-ja.md", "utf8")).toBe(made);
  });

  it("has the files a visitor looks for: the package's own issue templates, its security policy, and the rest of what its README links", () => {
    for (const file of [".github/ISSUE_TEMPLATE/report-a-bug.md", ".github/ISSUE_TEMPLATE/suggest-a-feature.md", ".github/ISSUE_TEMPLATE/fix-a-translation.md", ".github/ISSUE_TEMPLATE/add-my-project.md", ".github/ISSUE_TEMPLATE/config.yml", "SECURITY.md"]) expect(existsSync(file), file).toBe(true);
    expect(readme).toContain("issues/new?template=fix-a-translation.md");
  });

  it("keeps SECURITY.md and CODE_OF_CONDUCT.md equal to the family's master text, a copy of which is kept in scripts/community", () => {
    for (const file of ["SECURITY.md", "CODE_OF_CONDUCT.md"]) expect(readFileSync(file, "utf8"), file).toBe(readFileSync(`scripts/community/${file}`, "utf8"));
  });
});
