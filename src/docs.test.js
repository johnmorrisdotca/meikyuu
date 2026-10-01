// The documents and the demo, held to the source. Plain JavaScript, so that reading files needs no Node types.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { MEIKYUU_ALGORITHMS } from "./algorithms.ts";
import { MEIKYUU_BOARD_NAMES, MEIKYUU_TRAIL_NAMES } from "./boards.ts";
import { MeikyuuBoard } from "./element.ts";
import { MEIKYUU_SHAPES } from "./grid.ts";
import { MEIKYUU_MAZE_LEVELS } from "./levels.ts";
import { MEIKYUU_MODES } from "./maze.ts";
import { VERSION } from "./version.ts";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const readme = readFileSync("README.md", "utf8");

describe("the documents", () => {
  it("say the version package.json says, in the code and at the top of the changelog", () => {
    expect(VERSION).toBe(pkg.version);
    expect(readFileSync("CHANGELOG.md", "utf8")).toMatch(new RegExp(`^## ${pkg.version.replace(/\./g, "\\.")} `, "m"));
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
