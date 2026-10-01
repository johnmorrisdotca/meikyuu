import { describe, expect, it } from "vitest";

import { MEIKYUU_SHAPES } from "./grid.ts";
import { MEIKYUU_MODES } from "./maze.ts";
import { MEIKYUU_STRINGS, meikyuuLanguageOf, meikyuuSay } from "./strings.ts";

describe("the words", () => {
  it("have every line in both languages, with the same values to fill in", () => {
    const en = Object.keys(MEIKYUU_STRINGS.en).sort();
    expect(Object.keys(MEIKYUU_STRINGS.ja).sort()).toEqual(en);
    for (const key of en) {
      const values = (line: string): string[] => [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
      expect(values(MEIKYUU_STRINGS.ja[key]!), key).toEqual(values(MEIKYUU_STRINGS.en[key]!));
    }
  });

  it("name every shape and every way to play", () => {
    for (const language of ["en", "ja"] as const) {
      for (const shape of MEIKYUU_SHAPES) expect(MEIKYUU_STRINGS[language][`shape_${shape}`], shape).toBeTruthy();
      for (const mode of MEIKYUU_MODES) {
        expect(MEIKYUU_STRINGS[language][`mode_${mode.replace(/-/g, "_")}`], mode).toBeTruthy();
        expect(MEIKYUU_STRINGS[language][`play_${mode.replace(/-/g, "_")}`], mode).toBeTruthy();
      }
    }
  });

  it("fill values in, and say the one form when the number is one", () => {
    expect(meikyuuSay("en", "drawn", { n: 12 })).toBe("12 cells drawn.");
    expect(meikyuuSay("en", "drawn", { n: 1 })).toBe("1 cell drawn.");
    expect(meikyuuSay("en", "hintBack", { n: 3 })).toBe("Draw back 3 cells, then follow the glow.");
    expect(meikyuuSay("en", "hintBack", { n: 1 })).toBe("Draw back 1 cell, then follow the glow.");
    expect(meikyuuSay("ja", "keysOf", { k: 1, total: 3 })).toBe("鍵 1／3。");
    expect(meikyuuSay("en", "nothing there")).toBe("nothing there");
  });

  it("read a language from a lang attribute", () => {
    expect(meikyuuLanguageOf("ja")).toBe("ja");
    expect(meikyuuLanguageOf("ja-JP")).toBe("ja");
    expect(meikyuuLanguageOf("en-GB")).toBe("en");
    expect(meikyuuLanguageOf("")).toBe("en");
    expect(meikyuuLanguageOf(null)).toBe("en");
  });
});
